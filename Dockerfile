FROM node:20
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Generate Prisma Client as root, then fix permissions
RUN npx prisma generate
RUN chmod -R 777 /app/node_modules/.prisma 2>/dev/null || true

RUN npm run build

# Copy startup script
COPY docker-start.sh /app/docker-start.sh
RUN chmod +x /app/docker-start.sh

# Copy static files
RUN cp -r .next/static .next/standalone/.next/static
RUN mkdir -p .next/standalone/public

EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
CMD ["/app/docker-start.sh"]