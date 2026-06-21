FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm install --frozen-lockfile

WORKDIR /app/artifacts/api-server
RUN pnpm run build

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
