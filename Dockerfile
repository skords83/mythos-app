FROM node:20
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npx prisma generate
RUN npm run build

# Static files für standalone kopieren
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

RUN chown -R node:node /app
USER node
EXPOSE 4000
ENV PORT=4000
CMD ["node", ".next/standalone/server.js"]