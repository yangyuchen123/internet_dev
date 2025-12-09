FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev


FROM node:22-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
