FROM node:20.20.2-bookworm-slim AS frontend-build

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY babel.config.js vue.config.js postcss.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM node:20.20.2-bookworm-slim AS production-deps

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
	&& npm cache clean --force

FROM node:20.20.2-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY server.js ./server.js
COPY server ./server
COPY public/maps ./public/maps
COPY legacy ./legacy
COPY --from=frontend-build /app/dist ./dist

EXPOSE 5000

CMD ["node", "server.js"]
