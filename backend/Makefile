.PHONY: docker_build_version docker_build_latest docker_push_version docker_push_latest help copy_circuit_data generate_morphology_list install_bluepy

VERSION?=$(shell cat ../VERSION)

TOOLS_VENV_DIR:=tools_venv

APP_NAME_PREFIX?=sc
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch
DB_HOST?=mongo

BIONETGEN_SRC_URL?=https://github.com/RuleWorld/bionetgen/releases/download/BioNetGen-2.4.0/BioNetGen-2.4.0-Linux.tgz

CIRCUIT_PATH?=/gpfs/bbp.cscs.ch/project/proj66/circuits/O1/20180305/CircuitConfig
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

help:
	@echo "$$HELPTEXT"

$(TOOLS_VENV_DIR):
	virtualenv --no-site-packages -p python3.7 $@

install_bluepy: | $(TOOLS_VENV_DIR)
	source $(TOOLS_VENV_DIR)/bin/activate && \
	pip install -i 'https://bbpteam.epfl.ch/repository/devpi/bbprelman/dev/+simple/' bluepy

python_build: | $(TOOLS_VENV_DIR)
	$(TOOLS_VENV_DIR)/bin/python setup.py sdist

run_dev:
	docker-compose up --scale sim_worker=1

docker_build_version: python_build
	docker build -t sc-svc-$(CIRCUIT_NAME):$(VERSION) \
		--build-arg=circuit_path=$(CIRCUIT_PATH) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=bionetgen_src_url=$(BIONETGEN_SRC_URL) \
		--build-arg=db_host=$(DB_HOST) \
		.

docker_build_latest: python_build
	docker build -t sc-svc-$(CIRCUIT_NAME):latest \
		--build-arg=circuit_path=$(CIRCUIT_PATH) \
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

copy_circuit_data: generate_morphology_list
	./copy-circuit-data.sh \
		$(CIRCUIT_PATH) \
		$(shell oc get pods -o custom-columns=:.metadata.name | grep sc-svc-$(CIRCUIT_NAME))

generate_morphology_list: install_bluepy
	mkdir -p tmp && \
	cd tmp && \
	CIRCUIT_PATH=$(CIRCUIT_PATH) \
		../$(TOOLS_VENV_DIR)/bin/python \
		../tools/generate-morphology-list.py
