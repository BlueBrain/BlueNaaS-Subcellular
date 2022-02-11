.PHONY: docker_build_version docker_build_latest docker_push_version docker_push_latest help

VERSION?=$(shell cat ../VERSION)

APP_NAME_PREFIX?=sc
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch
DB_HOST?=mongo

BIONETGEN_SRC_URL?=https://github.com/RuleWorld/bionetgen/releases/download/BioNetGen-2.5.0/BioNetGen-2.5.0-Linux.tgz

define HELPTEXT
Makefile usage
  Targets:
    run_dev                 Run development setup which includes backend, sim_worker and mongo_db, requires:
                                docker engine.
    docker_build_latest     Build backend local docker image with the latest tag.
    push_dev                Tag docker image as dev and push to OpenShift registry.
    push_prod               Tag docker image as latest and push to OpenShift registry.
                                This will result in the updated backend running in OpenShift.
endef
export HELPTEXT


help:
	@echo "$$HELPTEXT"

run_dev:
	docker-compose up --scale sim_worker=1

docker_build_latest:
	docker build \
    --build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
	--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
    -t sc-svc:latest \
    .

push_prod:
	docker tag \
		$(APP_NAME_PREFIX)-svc:latest \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc:latest

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc:latest

	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'


push_dev:
	docker tag \
		$(APP_NAME_PREFIX)-svc:latest \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc:dev

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX)-svc:dev

	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'
