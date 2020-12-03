.PHONY: help run_dev build docker_build_version docker_build_latest docker_push_version docker_push_latest

VERSION?=$(shell cat ../VERSION)

NODE_MODULES:=node_modules

APP_NAME_PREFIX?=sc
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch

SENTRY_DSN?=https://957bc91f672d4e8a83f09af8ad015a6e@sentry.io/1374434

define HELPTEXT
Makefile usage
 Targets:
    run_dev                 Run development web server.
    build                   Build web app into dist folder.
    docker_build_latest     Build frontend local docker image with the latest tag.
    push_dev                Tag docker image as dev and push to OpenShift registy.
    push_latest             Tag docker image as latest and push to OpenShift registy
                                This will result in the updated frontend running in OpenShift.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

$(NODE_MODULES):
	yarn

run_dev: | $(NODE_MODULES)
	yarn serve

lint: | $(NODE_MODULES)
	yarn lint

build: | $(NODE_MODULES)
	VUE_APP_SENTRY_DSN=$(SENTRY_DSN) \
	yarn


docker_build_latest:
	VUE_APP_SENTRY_DSN=$(SENTRY_DSN) \
	./build.sh sc:latest


push_prod: docker_build_latest
	docker tag \
		$(APP_NAME_PREFIX):latest \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):latest

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):latest

	@echo 'frontend latest version pushed to OpenShift registry.'
	@echo 'frontend release done'


push_dev:
	docker tag \
		$(APP_NAME_PREFIX):latest \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):dev

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):dev

	@echo 'frontend latest version pushed to OpenShift registry.'
	@echo 'frontend release done'
