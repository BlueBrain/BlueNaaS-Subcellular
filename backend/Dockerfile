FROM python:3.7-slim-stretch
LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"

ARG db_host

ENV DB_HOST=mongo
ENV BNGPATH=/BioNetGen

# Update stretch repositories
RUN sed -i -e 's/deb.debian.org/archive.debian.org/g' \
    -e 's|security.debian.org|archive.debian.org/|g' \
    -e '/stretch-updates/d' /etc/apt/sources.list

# Install build deps
RUN apt-get update && \
    apt-get install -y g++ gcc perl curl rsync wget wait-for-it cmake libopenblas-base mpich libopenblas-dev libmpich-dev git libxslt1-dev zlib1g-dev graphviz graphviz-dev && \
    rm -rf /var/lib/apt/lists/*

# Install python deps
RUN pip install numpy cython scipy wsaccel tox==3.20.1 pygraphviz

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
    git checkout 3.4.1 && \
    git submodule update --init --recursive && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make && \
    make install

WORKDIR /app
COPY requirements.txt .
RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
RUN python get-pip.py pip==19.3.1
RUN pip install -r requirements.txt
COPY . .

# Lint code
RUN tox

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
