FROM node:21-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock ./
RUN set -eux & apk add --no-cache yarn
RUN yarn install --frozen-lockfile

FROM node:21-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn prisma generate
RUN yarn build

FROM node:21-alpine AS runner

WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN set -eux & apk add --no-cache yarn
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs prisma ./prisma/
COPY --chown=nextjs:nodejs docker-bootstrap.sh ./
RUN chmod +x docker-bootstrap.sh

USER nextjs
EXPOSE 3000
ENV PORT 3000

ENTRYPOINT ["/app/docker-bootstrap.sh"]
