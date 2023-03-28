FROM node:18.15.0-alpine3.16

WORKDIR /usr/app

COPY src src
COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

ENTRYPOINT ["node", "dist/index.js"]
