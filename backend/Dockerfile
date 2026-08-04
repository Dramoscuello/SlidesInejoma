# ---- Build Stage (Usando la versión más reciente y estable de Rust) ----
FROM rust:latest AS builder

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# ---- Runtime Stage ----
FROM debian:bookworm-slim AS runner

# Instalar poppler-utils (pdftoppm) para convertir páginas PDF a imágenes PNG
RUN apt-get update && apt-get install -y \
    poppler-utils ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/slides-inejoma-backend /app/backend
COPY --from=builder /app/target/release/seed /app/seed
RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["/app/backend"]
