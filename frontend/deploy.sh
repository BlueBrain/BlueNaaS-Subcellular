#!/bin/bash
set -e

make docker_build_latest
docker tag sc docker-registry.ebrains.eu/bsp-epfl/subcellular
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular