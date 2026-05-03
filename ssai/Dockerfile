FROM node:20-alpine

# install streamlink + python (needed for live extraction)
RUN apk add --no-cache python3 py3-pip streamlink

WORKDIR /app

# copy ONLY dependency files first (for caching)
COPY package.json package-lock.json* ./

# install dependencies (fallback if lockfile missing)
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# copy rest of app
COPY . .

# optional: drop root for security
RUN addgroup -S app && adduser -S app -G app
USER app

CMD ["node", "server.js"]
