FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY client/ ./client/
COPY knexfile.js ./
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
