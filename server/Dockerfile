FROM node:24-alpine
ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/public
WORKDIR /app
COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --ignore-scripts --no-audit --no-fund; \
    else \
      npm install --omit=dev --ignore-scripts --no-audit --no-fund; \
    fi
COPY server/src ./src
COPY public ./public
COPY supabase/online_schema.sql ./supabase/online_schema.sql
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
