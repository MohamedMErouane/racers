FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json only
COPY package.json ./

# Install ALL dependencies (needed for build)
RUN npm install

# Copy application code
COPY . .

# Add build arguments for environment variables
ARG PRIVY_APP_ID
ARG WS_URL
ARG API_URL
ARG APP_URL
ENV PRIVY_APP_ID=$PRIVY_APP_ID
ENV WS_URL=$WS_URL
ENV API_URL=$API_URL
ENV APP_URL=$APP_URL

# Run build to inject environment variables
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S racers -u 1001

# Change ownership of the app directory
RUN chown -R racers:nodejs /app
USER racers

# Expose port
EXPOSE 3001

# Health check with longer start period for cold starts
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application directly (skip prestart to avoid rebuilding)
CMD ["node", "server.js"]
