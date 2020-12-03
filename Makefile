.PHONY: help test build release run_dev run_dev_backend run_dev_frontend docker_push_latest create_oo_deployment

VERSION:=$(shell cat VERSION)
export VERSION

APP_NAME_PREFIX?=sc
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch

define HELPTEXT
Makefile usage
 Targets:
    run_dev               Run backend and frontend in dev mode
    run_dev_backend       Run development instance of the backend.
    run_dev_frontend      Run development instance of the frontend.
    test                  Test and compile packages, rebuild docker images locally(latest tag).
    create_oo_deployment  Create OpenShift deployment. Docker images should be present
                            in the registry when executing  this task.
    build                 Same as test. If VERSION has not been previously git tagged:
                            git tag it and push this version to docker registry.
    release               Same as build. Push the latest tag to the docker registy.
                            This will result in updated app in prod.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

run_dev:
	$(MAKE) -C frontend run_dev & $(MAKE) -C backend run_dev & fg

run_dev_backend:
	$(MAKE) -C backend run_dev

run_dev_frontend:
	$(MAKE) -C frontend run_dev

build:
	docker version
	node --version
	$(MAKE) -C backend docker_build_latest
	$(MAKE) -C frontend docker_build_latest

push_dev:
	${MAKE} -C backend push_dev
	${MAKE} -C frontend push_dev

push_prod:
	${MAKE} -C backend push_prod
	${MAKE} -C frontend push_prod

create_oo_deployment:
	oc project $(OO_PROJECT)

	@echo "Creating and exposing frontend deployment"
	oc new-app \
		--name=$(APP_NAME_PREFIX) \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)

	oc expose service $(APP_NAME_PREFIX) \
		--hostname=$(APP_NAME_PREFIX).$(APP_DNS_BASE) \
		--port=8000

	@echo "Creating and exposing backend deployment"
	oc new-app \
		--name=$(APP_NAME_PREFIX)-svc \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc

	oc expose service $(APP_NAME_PREFIX)-svc \
		--hostname=$(APP_NAME_PREFIX).$(APP_DNS_BASE) \
		--path=/ws

	@echo "Creating simulation worker deployment"
	oc new-app \
		--name=$(APP_NAME_PREFIX)-svc-worker \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc \
		-e MASTER_HOST=$(APP_NAME_PREFIX)-svc


create_oo_dev_deployment:
	oc project $(OO_PROJECT)

	@echo "Creating and exposing frontend deployment"
	oc new-app \
		--name=$(APP_NAME_PREFIX)-dev \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):dev

	oc expose service $(APP_NAME_PREFIX)-dev \
		--hostname=$(APP_NAME_PREFIX).$(APP_DNS_BASE) \
		--port=8000

	@echo "Creating and exposing backend deployment"
	oc new-app \
		--name=$(APP_NAME_PREFIX)-svc-dev \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc:dev

	oc expose service $(APP_NAME_PREFIX)-svc-dev \
		--hostname=$(APP_NAME_PREFIX).$(APP_DNS_BASE) \
		--path=/ws

	@echo "Creating simulation worker deployment"
	oc new-app \
		--name=$(APP_NAME_PREFIX)-svc-worker-dev \
		--docker-image=$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc:dev \
		-e MASTER_HOST=$(APP_NAME_PREFIX)-svc-dev
