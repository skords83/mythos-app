FROM node:20

RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

RUN npx prisma generate

RUN chown -R node:node /app

USER node

EXPOSE 4000

CMD ["npm", "run", "dev"]
