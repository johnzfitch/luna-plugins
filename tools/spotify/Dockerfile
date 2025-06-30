FROM node:latest

RUN mkdir -p /usr/src/syncify
WORKDIR /usr/src/syncify

COPY package.json /usr/src/syncify
RUN apt-get update
RUN apt-get install -y build-essential
RUN npm install --build-from-source

RUN npm install -g typescript

COPY . /usr/src/syncify

RUN tsc

CMD ["node", "build/index.js"]