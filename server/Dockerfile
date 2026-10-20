FROM node:24-alpine
ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/public
ENV V1_PUBLIC_DIR=/app/archive/v1/public
WORKDIR /app
COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --ignore-scripts --no-audit --no-fund; \
    else \
      npm install --omit=dev --ignore-scripts --no-audit --no-fund; \
    fi
COPY server/src ./src
COPY public ./public
COPY archive/v1/public ./archive/v1/public
COPY supabase/online_schema.sql ./supabase/online_schema.sql
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
