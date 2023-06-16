#!/bin/bash
set -e

env="${1:-latest}"

./build.sh sc "$env"
docker tag sc docker-registry.ebrains.eu/bsp-epfl/subcellular:"$env"
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular:"$env"
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular:"$env"
