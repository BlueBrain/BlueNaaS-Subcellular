FROM python:3.7-slim-stretch

LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG db_host

ENV DB_HOST=mongo
ENV BNGPATH=/app/BioNetGen

WORKDIR /app

COPY entrypoint.sh .
COPY ./build/python-deps /usr/local/lib/python3.7/site-packages
COPY ./build/sbmlTranslator sbmlTranslator

RUN apt-get update && \
    apt-get install -y perl rsync wget wait-for-it libopenblas-base mpich && \
    rm -rf /var/lib/apt/lists/*

RUN wget -O bionetgen.tgz https://github.com/RuleWorld/bionetgen/releases/download/BioNetGen-2.5.0/BioNetGen-2.5.0-Linux.tgz && \
    mkdir BioNetGen && \
    tar xfv bionetgen.tgz -C BioNetGen --strip-components=1 && \
    rm bionetgen.tgz && \
    rm -r BioNetGen/Models2 && \
    rm -r BioNetGen/Validate

EXPOSE 8000
ADD ./subcellular_experiment /app

ENTRYPOINT [ "./entrypoint.sh" ]
