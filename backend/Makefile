.PHONY: docker_build_version docker_build_latest docker_push_version docker_push_latest help

VERSION?=$(shell cat ../VERSION)

VENV_DIR:=venv

CIRCUIT_PATH ?= /gpfs/bbp.cscs.ch/project/proj66/circuits/O1/20180305/CircuitConfig
CIRCUIT_NAME ?= mouse-o1

define HELPTEXT
Makefile usage
  Targets:
    python_build                  Build and package python.
    run_dev                       Run development instance of the backend, requires:
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

$(VENV_DIR):
	virtualenv --no-site-packages -p python3.6 $@

python_build: | $(VENV_DIR)
	$(VENV_DIR)/bin/python setup.py sdist

run_dev:
	docker run \
		--rm \
		-it \
		-v /gpfs:/gpfs:ro \
		-e DEBUG=True \
		-v $$(pwd)/subcellular_experiment:/usr/local/lib/python3.6/site-packages/subcellular_experiment \
		-p 8888:8000 \
		sc-svc-$(CIRCUIT_NAME)

docker_build_version: python_build | $(NEURON_SRC_DIR)
	docker build -t sc-svc-$(CIRCUIT_NAME):$(VERSION) \
		--build-arg=circuit_path=$(CIRCUIT_PATH) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_build_latest: python_build | $(NEURON_SRC_DIR)
	docker build -t sc-svc-$(CIRCUIT_NAME):latest \
		--build-arg=circuit_path=$(CIRCUIT_PATH) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_push_version: docker_build_version
	docker tag sc-svc:$(VERSION) docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/sc-svc-$(CIRCUIT_NAME):$(VERSION)
	docker push docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/sc-svc-$(CIRCUIT_NAME):$(VERSION)
	@echo 'backend version($(VERSION)) pushed to OpenShift registy'

docker_push_latest: docker_build_latest
	docker tag sc-svc-$(CIRCUIT_NAME):latest docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/sc-svc-$(CIRCUIT_NAME):latest
	docker push docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/sc-svc-$(CIRCUIT_NAME):latest
	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'
