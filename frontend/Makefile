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
    run_dev               Run development web server.
    build                 Build web app into dist folder.
    docker_build_version  Build frontend local docker image with the version tag.
    docker_build_latest   Build frontend local docker image with the latest tag.
    docker_push_version   Tag docker image with version and push to OpenShift registy.
    docker_push_latest    Tag docker image with latest and push to OpenShift registy
                            This will result in the updated frontend running in OpenShift.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

$(NODE_MODULES):
	npm install

run_dev: | $(NODE_MODULES)
	npm run serve

build: | $(NODE_MODULES)
	VUE_APP_SENTRY_DSN=$(SENTRY_DSN) \
	npm run build

docker_build_version: build
	docker build -t sc:$(VERSION) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_build_latest: build
	docker build -t sc:latest \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_build_dev: build
	docker build -t sc:dev \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_push_version: docker_build_version
	docker tag \
		$(APP_NAME_PREFIX):$(VERSION) \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):$(VERSION)

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):$(VERSION)

	@echo 'frontend version($(VERSION)) pushed to OpenShift registy'

docker_push_latest: docker_build_latest
	docker tag \
		$(APP_NAME_PREFIX):latest \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):latest

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):latest

	@echo 'frontend latest version pushed to OpenShift registry.'
	@echo 'frontend release done'


docker_push_dev:
	docker tag \
		$(APP_NAME_PREFIX):dev \
		$(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):dev

	docker push $(DOCKER_REGISTRY_HOST)/$(OO_PROJECT)/$(APP_NAME_PREFIX):dev

	@echo 'frontend latest version pushed to OpenShift registry.'
	@echo 'frontend release done'
