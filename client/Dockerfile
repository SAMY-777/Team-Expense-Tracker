# =============================================================================
# client/Dockerfile
# Multi-stage build: compile the React app with Vite, then serve the static
# build output with a lightweight nginx image.
# =============================================================================

# ---- Stage 1: build ---------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Cache-friendly dependency install.
COPY package*.json ./
RUN npm install

# Copy source and build the static production bundle into /app/dist.
COPY . .
# VITE_API_BASE_URL is baked into the static bundle at build time - override
# it with --build-arg / a build-time .env if the API lives elsewhere.
RUN npm run build

# ---- Stage 2: serve -----------------------------------------------------
FROM nginx:alpine

# Replace the default nginx site with our built static files.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
