FROM postgres
COPY pgpass ~/.pgpass
RUN  "chmod 0600 ~/.pgpass"