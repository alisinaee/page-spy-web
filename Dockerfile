FROM node:20-bookworm-slim AS client
WORKDIR /src

COPY package.json yarn.lock .npmrc ./
COPY scripts/public-files.sh ./scripts/public-files.sh
RUN yarn install --frozen-lockfile --ignore-optional

COPY . .
RUN yarn build:client

FROM golang:1.23 AS backend
WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/main.go ./
COPY --from=client /src/dist ./dist
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=backend /app/main /app/main
CMD ["/app/main"]
