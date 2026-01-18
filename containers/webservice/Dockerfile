FROM node:20-alpine AS builder

WORKDIR /app

COPY src/package*.json ./
RUN npm ci

COPY src/ ./
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache nginx supervisor

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN mkdir -p /var/log/nginx /var/run

COPY init.sh .
RUN chmod +x init.sh

EXPOSE 3000

ENTRYPOINT ["./init.sh"]
