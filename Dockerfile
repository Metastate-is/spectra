# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY artifacts ./artifacts
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3004

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --chown=node:node --chmod=755 entrypoint.sh ./entrypoint.sh

USER node
EXPOSE 3004 50060

ENTRYPOINT ["./entrypoint.sh"]
