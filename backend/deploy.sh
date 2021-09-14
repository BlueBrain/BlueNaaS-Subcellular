#!/bin/sh 

set -e
make docker_build_latest
docker tag sc-svc docker-registry.ebrains.eu/bsp-epfl/subcellular-backend
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular-backend
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular-backend

