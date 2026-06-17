# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
# Copy the workspace manifests so npm can resolve the workspace graph during install.
COPY package.json package-lock.json ./
COPY packages/rates-calculator/package.json ./packages/rates-calculator/package.json
RUN npm ci

# Copy the rest of the source and build the production bundle (library first, then app).
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

# SPA-aware Nginx configuration (history fallback + sensible caching).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the static build output.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic container healthcheck. Use 127.0.0.1 (not "localhost") so wget always hits
# IPv4 — nginx only listens on IPv4 below, and "localhost" may resolve to IPv6 (::1).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
