#!/bin/bash
set -e

docker build -t subcellular .
docker tag subcellular docker-registry.ebrains.eu/bsp-epfl/subcellular
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular