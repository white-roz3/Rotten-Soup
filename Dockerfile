FROM node:20.20.2-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN npm install --omit=dev --no-audit --no-fund express@4.16.4 \
	&& npm cache clean --force
COPY server.js ./server.js
COPY server ./server
COPY public/maps ./public/maps
COPY legacy ./legacy
COPY railway_dist ./dist

EXPOSE 5000

CMD ["node", "server.js"]
