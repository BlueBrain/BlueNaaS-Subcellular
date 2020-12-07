FROM node
WORKDIR /subcellular-app
COPY package.json .
COPY yarn.lock .
RUN yarn
COPY . .
RUN yarn lint && yarn build
