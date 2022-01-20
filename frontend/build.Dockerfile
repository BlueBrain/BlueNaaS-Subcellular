FROM node

ENV NODE_OPTIONS=--openssl-legacy-provider
ARG VUE_APP_SENTRY_DSN

WORKDIR /subcellular-app
COPY package.json .
COPY yarn.lock .
RUN yarn
COPY . .
RUN yarn lint && yarn build
