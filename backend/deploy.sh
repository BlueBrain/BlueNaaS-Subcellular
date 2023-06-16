#!/bin/bash
set -e

env="${1:-latest}"

docker build -t subcellular-backend:"$env" .
docker tag subcellular-backend:"$env" docker-registry.ebrains.eu/bsp-epfl/subcellular-backend:"$env"
docker push docker-registry.ebrains.eu/bsp-epfl/subcellular-backend:"$env"
oc import-image docker-registry.ebrains.eu/bsp-epfl/subcellular-backend:"$env"
