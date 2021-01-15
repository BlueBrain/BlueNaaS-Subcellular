# WARNING: keep this file in sync with ./Dockerfile
FROM python:3.7-slim-stretch

# Install build deps
RUN apt-get update && \
    apt-get install -y g++ gcc cmake libopenblas-dev libmpich-dev git libxslt1-dev zlib1g-dev

# Install python deps
RUN pip install numpy cython scipy wsaccel tox==3.20.1

WORKDIR /build

# Install BionetGen
RUN apt-get update && \
    apt-get install -y perl rsync wget libopenblas-base mpich && \
    rm -rf /var/lib/apt/lists/* && \
    wget -O bionetgen.tgz https://github.com/RuleWorld/bionetgen/releases/download/BioNetGen-2.5.0/BioNetGen-2.5.0-Linux.tgz && \
    mkdir BioNetGen && \
    tar xfv bionetgen.tgz -C BioNetGen --strip-components=1 && \
    rm bionetgen.tgz && \
    rm -r BioNetGen/Models2 && \
    rm -r BioNetGen/Validate

# Install STEPS
RUN git clone https://github.com/CNS-OIST/STEPS.git && \
    cd STEPS && \
    git checkout 3.4.1 && \
    git submodule update --init --recursive && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make && \
    make install

WORKDIR /code
COPY setup.py .
COPY ./subcellular_experiment ./subcellular_experiment

# Lint code
COPY tox.ini .
COPY mypy.ini .
COPY .pylintrc .
COPY pyproject.toml .
RUN tox
