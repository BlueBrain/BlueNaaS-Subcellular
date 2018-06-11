
FROM python:3.6-alpine

LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG circuit_path

ENV DEBIAN_FRONTEND=noninteractive
ENV CIRCUIT_PATH=$circuit_path

WORKDIR /opt/subcellular-experiment

COPY dist/* ./dist/
COPY entrypoint.sh .

RUN pip install \
    --no-cache-dir \
    -i https://bbpteam.epfl.ch/repository/devpi/simple \
    $(ls -t $PWD/dist/*.* | head -n 1)

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
