FROM node:11.10.1

RUN mkdir -p /app/server
WORKDIR /app/server

ADD package.json .
RUN yarn install

ADD . .

CMD ["yarn", "start"]
