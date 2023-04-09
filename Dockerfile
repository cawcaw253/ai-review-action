FROM node:18.15.0-alpine3.16

ADD . /app
WORKDIR /app

ENTRYPOINT ["node", "./dist/index.js"]
