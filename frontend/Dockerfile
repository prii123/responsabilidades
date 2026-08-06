# Build: compila el SPA con Vite. Las variables VITE_* deben pasarse como
# build-arg (Vite las incrusta en el bundle en tiempo de build, no de
# ejecución) — ver docker-compose.yml / build.args.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_PRESIGN_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PRESIGN_URL=$VITE_PRESIGN_URL
RUN npm run build

# Serve: nginx sirviendo los estáticos, con fallback a index.html para las
# rutas de react-router (ver nginx.conf).
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
