# --- Build Stage ---
FROM oven/bun:latest AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and build
COPY . .

# Enforce code quality
RUN bun run lint
RUN bun run check-format

RUN bun run build

# --- Production Stage ---
FROM nginx:stable-alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
