# Multi-stage production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy base package manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies to enable build compiles
RUN npm ci

# Generate Prisma Client classes
RUN npx prisma generate

# Copy workspace code
COPY . .

# Compile and bundle both typescript server and static client assets
RUN npm run build \
    && npm prune --production

# Final stage runtime runner
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Boots up Express with SQLite dev.db initialized on initial launch
CMD ["npm", "run", "start"]
