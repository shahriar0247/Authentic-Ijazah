FROM node:22-alpine

RUN corepack enable

WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/package.json
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile --filter @ijazah/api... --allow-build esbuild

COPY packages/db packages/db
COPY apps/api apps/api

WORKDIR /repo/apps/api
ENV PORT=8077
EXPOSE 8077

CMD ["node", "--import", "tsx", "src/index.ts"]
