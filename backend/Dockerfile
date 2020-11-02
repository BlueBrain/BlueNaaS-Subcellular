
FROM python:3.7-slim-stretch
WORKDIR /build

RUN apt-get update && \
  apt-get install -y g++ gcc cmake libopenblas-dev libmpich-dev git libxslt1-dev zlib1g-dev

RUN pip install numpy cython scipy wsaccel

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



FROM python:3.7-slim-stretch

LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG bionetgen_src_url
ARG db_host

ENV DB_HOST=$db_host
ENV BNGPATH=/opt/subcellular-experiment/BioNetGen

WORKDIR /opt/subcellular-experiment

COPY dist/* ./dist/
COPY entrypoint.sh .
COPY --from=0 /usr/local/lib/python3.7/site-packages /usr/local/lib/python3.7/site-packages
COPY --from=0 /build/atomizer/bin/sbmlTranslator sbmlTranslator

RUN apt-get update && \
  apt-get install -y perl rsync wget wait-for-it libopenblas-base mpich && \
  rm -rf /var/lib/apt/lists/*

RUN wget -O bionetgen.tgz $bionetgen_src_url && \
  mkdir BioNetGen && \
  tar xfv bionetgen.tgz -C BioNetGen --strip-components=1 && \
  rm bionetgen.tgz && \
  rm -r BioNetGen/Models2 && \
  rm -r BioNetGen/Validate

RUN pip install \
  --no-cache-dir \
  -i https://bbpteam.epfl.ch/repository/devpi/simple \
  $(ls -t $PWD/dist/*.* | head -n 1)

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
