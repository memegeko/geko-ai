FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build:selfhost

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/.next-selfhost/standalone ./
COPY --from=build --chown=node:node /app/.next-selfhost/static ./.next-selfhost/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/selfhost ./scripts/selfhost
COPY --from=build --chown=node:node /app/lib/selfhost ./lib/selfhost
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD ["node","-e","fetch('http://127.0.0.1:3000/api/auth/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node","scripts/selfhost/entrypoint.mjs"]
