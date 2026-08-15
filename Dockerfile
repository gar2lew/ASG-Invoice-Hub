FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

VOLUME /app/data

EXPOSE 3000

CMD ["node", "server.js"]
