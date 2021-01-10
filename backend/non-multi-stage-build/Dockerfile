FROM python:3.7-slim-stretch

LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG db_host

ENV DB_HOST=mongo
ENV BNGPATH=/BioNetGen

RUN apt-get update && \
  apt-get install -y perl rsync wait-for-it libopenblas-base mpich && \
  rm -rf /var/lib/apt/lists/*

COPY ./build/python-deps /usr/local/lib/python3.7/site-packages
COPY ./build/BioNetGen /BioNetGen

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
