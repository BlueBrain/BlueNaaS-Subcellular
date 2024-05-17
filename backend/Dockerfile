FROM ubuntu:20.04
LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG db_host
ARG DEBIAN_FRONTEND=noninteractive

ENV DB_HOST=mongo
ENV BNGPATH=/BioNetGen
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ENV SHELL=/bin/bash
ENV TZ=Europe/Geneva


# Update stretch repositories
RUN sed -i -e 's/deb.debian.org/archive.debian.org/g' \
    -e 's|security.debian.org|archive.debian.org/|g' \
    -e '/stretch-updates/d' /etc/apt/sources.list

# Install build deps
RUN apt-get --yes -qq update \
    && apt-get --yes -qq upgrade \
    && apt-get --yes -qq install perl curl rsync wget wait-for-it libopenblas-base mpich git libxslt1-dev zlib1g-dev graphviz graphviz-dev && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get --yes -qq update \
    && apt-get --yes -qq upgrade \
    && apt-get --yes -qq install \
    cmake              \
    cython3            \
    g++                \
    gcc                \
    gfortran           \
    git                \
    gmsh               \
    libboost-dev       \
    libgmsh-dev        \
    libmpich-dev       \
    libopenblas-dev    \
    petsc-dev          \
    pkg-config         \
    python3-matplotlib \
    python3-mpi4py     \
    python3-pip        \
    && apt-get --yes -qq clean \
    && rm -rf /var/lib/apt/lists/* \
    && pip install \
    jupyter \
    jupyterlab \
    nbconvert \
    python-libsbml \
    && ldconfig
# Install python deps
RUN pip install --upgrade numpy==1.23.1 cython scipy wsaccel tox==3.20.1 pygraphviz

# Install BionetGen
RUN wget -O bionetgen.tgz https://github.com/RuleWorld/bionetgen/releases/download/BioNetGen-2.5.0/BioNetGen-2.5.0-Linux.tgz && \
    mkdir BioNetGen && \
    tar xfv bionetgen.tgz -C BioNetGen --strip-components=1 && \
    rm bionetgen.tgz && \
    rm -r BioNetGen/Models2 && \
    rm -r BioNetGen/Validate

# Install STEPS
RUN git clone https://github.com/CNS-OIST/STEPS.git && \
    cd STEPS && \
    git checkout 4.1.1 && \
    git submodule update --init --recursive && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make && \
    make install

WORKDIR /app
COPY requirements.txt .
RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
RUN python3 get-pip.py pip==19.3.1
RUN pip3 install -r requirements.txt
COPY . .

# Lint code
RUN tox

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
