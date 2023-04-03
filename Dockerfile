FROM node:18.15.0-alpine3.16

WORKDIR /usr/app

COPY dist dist

ENTRYPOINT ["node", "dist/index.js"]
