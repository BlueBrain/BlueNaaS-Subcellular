#!/bin/bash

# This script is used to build the app in environments
# with outdated Docker not supporting multi-stage builds

# Exit immediatly if any command has a non-zero exit code
set -eu

IMAGE="${1}"

mkdir -p dist
rm -rf dist

# env
echo "Build script started (non multi-stage)"
echo "-> Image: ${IMAGE}"

set +u

echo "Building assets..."
docker build \
    --build-arg VUE_APP_SENTRY_DSN=$VUE_APP_SENTRY_DSN \
    --build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
	--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
    -t subcellular-build \
    -f build.Dockerfile \
    .

docker create --name subcellular-build subcellular-build
docker cp subcellular-build:/subcellular-app/dist dist
docker rm -f subcellular-build

echo "Building main image..."
docker build \
    --build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
	--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
    -t $IMAGE \
    .
