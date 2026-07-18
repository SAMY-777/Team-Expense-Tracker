# =============================================================================
# server/Dockerfile
# Builds a small production image for the Express API.
# =============================================================================

# Use a slim, current LTS Node image to keep the final image small.
FROM node:20-alpine

# All subsequent instructions run from /app inside the container.
WORKDIR /app

# Copy only the manifest files first so Docker can cache the npm install
# layer and skip re-installing when only source code changes.
COPY package*.json ./

# Install production dependencies only (no devDependencies like nodemon).
RUN npm install --omit=dev

# Copy the rest of the backend source and the db/ folder (schema/seed).
COPY . .

# The Express server listens on this port by default (see .env.example).
EXPOSE 5000

# Start the API server.
CMD ["node", "src/server.js"]
