FROM node:20-alpine

# install streamlink + python (needed for live extraction)
RUN apk add --no-cache python3 py3-pip streamlink

WORKDIR /app

# better caching (faster rebuilds)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["node", "server.js"]
