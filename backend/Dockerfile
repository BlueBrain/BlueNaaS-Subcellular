
FROM python:3.7-slim-stretch
WORKDIR /build

RUN apt-get update && \
  apt-get install -y g++ gcc cmake libopenblas-dev libmpich-dev git

RUN pip install numpy cython scipy

RUN git clone https://github.com/CNS-OIST/STEPS.git && \
  cd STEPS && \
  git submodule update --init --recursive && \
  mkdir build && \
  cd build && \
  cmake .. && \
  make && \
  make install



FROM python:3.7-slim-stretch

LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG circuit_path
ARG bionetgen_src_url
ARG db_host

ENV CIRCUIT_PATH=$circuit_path
ENV DB_HOST=$db_host
ENV BNGPATH=/opt/subcellular-experiment/BioNetGen

WORKDIR /opt/subcellular-experiment

COPY dist/* ./dist/
COPY entrypoint.sh .
COPY --from=0 /usr/local/lib/python3.7/site-packages /usr/local/lib/python3.7/site-packages

RUN apt-get update && \
    apt-get install -y perl rsync wget wait-for-it libopenblas-base mpich && \
    rm -rf /var/lib/apt/lists/*

RUN wget -O bionetgen.tgz $bionetgen_src_url && \
  mkdir BioNetGen && \
  tar xfv bionetgen.tgz -C BioNetGen --strip-components=1 && \
  rm bionetgen.tgz


RUN pip install \
    --no-cache-dir \
    -i https://bbpteam.epfl.ch/repository/devpi/simple \
    $(ls -t $PWD/dist/*.* | head -n 1)

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
