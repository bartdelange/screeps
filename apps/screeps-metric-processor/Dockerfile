FROM node:20-alpine AS build

WORKDIR /app

COPY package.json .yarnrc.yml ./
COPY .yarn/releases .yarn/releases

ENV YARN_NODE_LINKER=node-modules
RUN node .yarn/releases/yarn-4.12.0.cjs install

COPY tsconfig.json ./
COPY src ./src
COPY config ./config

RUN node .yarn/releases/yarn-4.12.0.cjs build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY config ./config
COPY package.json ./

CMD ["node", "dist/index.js"]
