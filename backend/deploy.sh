#!/bin/bash
set -e

docker build -t subcellular-backend .
docker tag subcellular-backend docker-registry.ebrains.eu/bsp-epfl/subcellular-backend
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular-backend
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular-backend 
