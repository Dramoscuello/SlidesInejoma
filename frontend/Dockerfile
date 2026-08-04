FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000/ws
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=build /app/dist ./dist
RUN npm install -g serve

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
