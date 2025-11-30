FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Ensure pnpm is available since the project is managed with pnpm.
RUN corepack enable
COPY frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/package.json ./
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile
COPY frontend .
RUN pnpm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
RUN corepack enable
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY frontend/package.json .
EXPOSE 3000
CMD ["pnpm", "start"]
