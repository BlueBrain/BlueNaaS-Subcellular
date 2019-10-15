.PHONY: docker_build_version docker_build_latest docker_push_version docker_push_latest help

VERSION?=$(shell cat ../VERSION)

TOOLS_VENV_DIR:=tools_venv

APP_NAME_PREFIX?=sc
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch
DB_HOST?=mongo

BIONETGEN_SRC_URL?=https://github.com/RuleWorld/bionetgen/releases/download/BioNetGen-2.5.0/BioNetGen-2.5.0-Linux.tgz

CIRCUIT_NAME?=o1

define HELPTEXT
Makefile usage
  Targets:
    python_build                  Build and package python.
    run_dev                       Run development setup which includes backend, sim_worker and mongo_db, requires:
                                   docker engine and /gpfs mounted volume.
    docker_build_version          Build backend local docker image with the version tag.
    docker_build_latest           Build backend local docker image with the latest tag.
    docker_push_version           Tag docker image with version and push to OpenShift registry.
    docker_push_latest            Tag docker image with the latest and push to OpenShift registry.
                                    This will result in the updated backend running in OpenShift.
endef
export HELPTEXT

$(TOOLS_VENV_DIR):
	virtualenv --no-site-packages -p python3 $@

help:
	@echo "$$HELPTEXT"

python_build: | $(TOOLS_VENV_DIR)
	$(TOOLS_VENV_DIR)/bin/python setup.py sdist

run_dev:
	docker-compose up --scale sim_worker=1

docker_build_version: python_build
	docker build -t sc-svc-$(CIRCUIT_NAME):$(VERSION) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=bionetgen_src_url=$(BIONETGEN_SRC_URL) \
		--build-arg=db_host=$(DB_HOST) \
		.

docker_build_latest: python_build
	docker build -t sc-svc-$(CIRCUIT_NAME):latest \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=bionetgen_src_url=$(BIONETGEN_SRC_URL) \
		--build-arg=db_host=$(DB_HOST) \
		.

docker_push_version: docker_build_version
	docker tag \
		$(APP_NAME_PREFIX)-svc:$(VERSION) \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME):$(VERSION)

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME):$(VERSION)

	@echo 'backend version($(VERSION)) pushed to OpenShift registy'

docker_push_latest:
	docker tag \
		$(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME):latest \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME):latest

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc-$(CIRCUIT_NAME):latest

	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'
