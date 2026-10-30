# Keep the application on the supported Node 22 line used by PR checks.
# 22.23.4 includes the October 2026 security fixes (including CVE-2026-111497).
FROM node:22.23.4-trixie-slim AS base
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --include=dev
COPY frontend/ ./
RUN npx --no-install prisma generate
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
# Keep compilation independent of external font/CDN services.
RUN --network=none DATABASE_URL=postgresql://unused:unused@127.0.0.1:55432/unused npm run build \
    && mkdir -p public

# Only traced application dependencies and the existing migration tool are shipped.
# OS compilers, image/database development libraries, tests and untraced sources stay out.
FROM base AS runtime
ARG VCS_REF=unknown
LABEL org.opencontainers.image.source="https://github.com/skords83/mythos-app" \
      org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --chmod=755 docker-start.sh ./docker-start.sh
# Startup uses the pinned local Prisma CLI directly; npm/npx are unnecessary here.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
EXPOSE 4000
CMD ["/app/docker-start.sh"]
