# WARNING: keep this file in sync with ./Dockerfile
FROM python:3.7-slim-stretch

RUN apt-get update && \
    apt-get install -y g++ gcc cmake libopenblas-dev libmpich-dev git libxslt1-dev zlib1g-dev

RUN pip install numpy cython scipy wsaccel tox==3.20.1

WORKDIR /build

RUN git clone https://github.com/CNS-OIST/STEPS.git && \
    cd STEPS && \
    git checkout 3.4.1 && \
    git submodule update --init --recursive && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make && \
    make install

# TODO: Switch to main repo when https://github.com/RuleWorld/atomizer/issues/6 is fixed
RUN git clone https://github.com/pgetta/atomizer.git && \
    cd atomizer && \
    make && \
    make install

ADD . /code
WORKDIR /code
RUN tox
