# BlueNaaS-Subcellular

<img alt="eFEL Banner" src="https://github.com/BlueBrain/BlueNaaS-Subcellular/blob/main/BPP-BlueNaaS-Subcellular-Github.jpg" width="800"/>

BlueNaaS-Subcllular was developed as a software environment for
simulation of brain molecular networks.
It was designed to reach several objectives related to major restrictions of currently available
software tools, such as the lack of integration with existing biological data relevant for modeling
and low compatibility of different types of models.

## System design

See [System design document](SYSTEM-DESIGN.md)

## Dev env run

There are targets in makefile to start development environment for all parts of the app.
Backend dev setup needs docker image to be present in the system when starting, which can
be build with `make docker_build_latest` from `./backend` directory.

Backend dev environment requires docker engine to be installed and consists of:

- mongoDB instance
- backend server
- sim worker replica with minimum one instance

Check the `./backend/docker-compose.yml` for more information.

To start:

```bash
make run_dev_backend
```

Dev frontend env is powered by Webpack and can be started with:

```bash
make run_dev_frontend
```

To start both dev envs in a single session use:

```bash
make run_dev
```

## Usage

See [Guidebook](https://subcellular-bsp-epfl.apps.hbp.eu/static/docs.html)

## Deployment

Makefile has a `create_oo_deployment` target that will deploy current version of the app to an
OpenShift instance. This target will create OpenShift deployment configs, services and external
routes needed by the app to function.
See `makefile` for configuration and options; requires OpenShift CLI.

## Citation

When you use this software, we kindly ask you to cite the following DOI (under "Cite as"):
[![DOI](https://zenodo.org/badge/537068186.svg)](https://zenodo.org/badge/latestdoi/537068186)




## Funding & Acknowledgment

The development of this software was supported by funding to the Blue Brain Project, a research center of the École polytechnique fédérale de Lausanne (EPFL), from the Swiss government's ETH Board of the Swiss Federal Institutes of Technology.

This  project/research  received  funding  from  the  European  Union’s  Horizon  2020  Framework  Programme  for  Research  and  Innovation  under  the  Framework  Partnership  Agreement  No.  650003  (HBP FPA).

Copyright (c) 2022 Blue Brain Project/EPFL
