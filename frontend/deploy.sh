#!/bin/bash
set -e

VUE_APP_SENTRY_DSN=https://957bc91f672d4e8a83f09af8ad015a6e@sentry.io/1374434
yarn lint && yarn build
docker build -t sc .
docker tag sc docker-registry.ebrains.eu/bsp-epfl/subcellular
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular