FROM node:20
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npx prisma generate
RUN npm run build

# Startup script für DB Migrationen
COPY docker-start.sh /app/docker-start.sh
RUN chmod +x /app/docker-start.sh

# Static files für standalone kopieren
RUN cp -r .next/static .next/standalone/.next/static
RUN mkdir -p .next/standalone/public

USER node
EXPOSE 4000
ENV PORT=4000
CMD ["/app/docker-start.sh"]