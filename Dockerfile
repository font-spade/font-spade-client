FROM node:18-bullseye AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:ssr

FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build /src/dist/font-spade ./dist/font-spade
WORKDIR /app/dist/font-spade/server
USER node
EXPOSE 4000
CMD ["node", "main.js"]
