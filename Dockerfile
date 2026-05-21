FROM node:20.20.2-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN npm init -y >/dev/null 2>&1 \
	&& npm install express@4.16.3 --omit=dev --no-audit --no-fund

COPY server.js ./server.js
COPY server ./server
COPY public/maps ./public/maps
COPY legacy ./legacy
COPY railway_dist ./dist

EXPOSE 5000

CMD ["node", "server.js"]
