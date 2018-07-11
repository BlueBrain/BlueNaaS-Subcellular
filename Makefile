.PHONY: help test build release run_dev_backend run_dev_frontend docker_push_latest create_oo_deployment

VERSION:=$(shell cat VERSION)
export VERSION

APP_NAME_PREFIX?=sc
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch

CIRCUIT_PATH?=/gpfs/bbp.cscs.ch/project/proj66/circuits/O1/20180305/CircuitConfig
CIRCUIT_NAME?=o1

define HELPTEXT
Makefile usage
 Targets:
    run_dev_backend       Run development instance of the backend.
    run_dev_frontend      Run development instance of the frontend.
    test                  Test and compile packages, rebuild docker images locally(latest tag).
    create_oo_deployment  Create OpenShift deployment.
    build                 Same as test. If VERSION has not been previously git tagged:
                            git tag it and push this version to docker registry.
    release               Same as build. Push the latest tag to the docker registy.
                            This will result in updated app in prod.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

run_dev_backend:
	$(MAKE) -C backend run_dev

run_dev_frontend:
	$(MAKE) -C frontend run_dev

build:
	@echo "building $(VERSION)"
ifdef $(JENKINS_HOME)
	git config user.email bbprelman@epfl.ch
endif
	! git rev-parse $(VERSION) >/dev/null 2>&1; \
		if [ $$? -eq 0 ]; \
		then \
			echo "tagging $(VERSION)" && \
			echo "VERSION = '$(VERSION)'" > backend/blue_pair/version.py && \
			sed -i 's/"version": "\([0-9.]\+\)"/"version": "$(VERSION)"/' frontend/package.json && \
			CIRCUIT_PATH=$(CIRCUIT_PATH) \
				CIRCUIT_NAME=$(CIRCUIT_NAME) \
				$(MAKE) -C backend docker_push_version && \
			CIRCUIT_NAME=$(CIRCUIT_NAME) \
				$(MAKE) -C frontend docker_push_version && \
			git add backend/blue_pair/version.py frontend/package.json && \
			git commit -m "release $(VERSION)" && \
			git tag -a $(VERSION) -m $(VERSION) && \
			git push origin HEAD:$$GERRIT_BRANCH && \
			git push --tags; \
		fi

release: build docker_push_latest

deploy: docker_push_latest

docker_push_latest:
	@echo "pushing docker images for version $(VERSION)"
	CIRCUIT_PATH=$(CIRCUIT_PATH) \
		CIRCUIT_NAME=$(CIRCUIT_NAME) \
		$(MAKE) -C backend docker_push_latest
	CIRCUIT_NAME=$(CIRCUIT_NAME) \
		$(MAKE) -C frontend docker_push_latest

create_oo_deployment:
	oc project $(OO_PROJECT)

	oc new-app \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-$(CIRCUIT_NAME)

	oc expose service $(APP_NAME_PREFIX)-$(CIRCUIT_NAME) \
		--hostname=$(APP_NAME_PREFIX)-$(CIRCUIT_NAME).$(APP_DNS_BASE) \
		--port=8000

	oc new-app \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME)

	oc expose service $(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME) \
		--hostname=$(APP_NAME_PREFIX)-$(CIRCUIT_NAME).$(APP_DNS_BASE) \
		--path=/ws
