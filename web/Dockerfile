FROM node:slim

# RUN apk update && apk add git

WORKDIR /opt/app

COPY package.json .
COPY .npmrc .

RUN npm install

ENV PATH="$PATH:./node_modules/.bin"

VOLUME /opt/app/node_modules
VOLUME /opt/app/build

CMD ["npm", "run", "serve:docker"]
