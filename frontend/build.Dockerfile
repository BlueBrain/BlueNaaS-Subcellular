FROM node
WORKDIR /subcellular-app
COPY . /subcellular-app
RUN yarn && yarn lint && yarn build
