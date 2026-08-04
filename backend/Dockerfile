# ---- Build Stage ----
FROM rust:1.77-bookworm AS builder

RUN apt-get update && apt-get install -y \
    musl-tools gcc pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release --bins

# ---- Runtime Stage ----
FROM debian:bookworm-slim AS runner

# Instalar poppler-utils (pdftoppm) para convertir PDF a imágenes PNG
RUN apt-get update && apt-get install -y \
    poppler-utils ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/slides-inejoma-backend /app/backend
COPY --from=builder /app/target/release/seed /app/seed
RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["/app/backend"]
