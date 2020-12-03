#!/bin/bash

# This script is used to build the app in environments
# with outdated Docker not supporting multi-stage builds

# Exit immediatly if any command has a non-zero exit code
set -eu

IMAGE="${1}"

mkdir -p ./build/arcv2_platform/static/assets
rm -rf ./build/arcv2_platform/static/assets/*

# env
echo "Build script started (non multi-stage)"
echo "-> Image: ${IMAGE}"

set +u

echo "Building assets..."
docker build \
    --build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
	--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
    -t subcellular-app-assets \
    -f ./non-multi-stage-build/assets.Dockerfile \
    .

docker create --name subcellular-app-container subcellular-app-assets
docker cp subcellular-app-container:/usr/local/lib/python3.7/site-packages ./build/python-deps
docker cp subcellular-app-container:/build/atomizer/bin/sbmlTranslator ./build/sbmlTranslator
docker rm -f subcellular-app-container

echo "Building main image..."
docker build \
    --build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
	--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
    --no-cache \
    -t $IMAGE \
    -f ./non-multi-stage-build/Dockerfile \
    .
