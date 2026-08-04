use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod config;
mod db;
mod handlers;
mod models;
mod ws;

use config::Config;
use ws::handler::{ws_handler, WsState};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env();
    tracing::info!("🚀 Iniciando backend SlidesInejoma en puerto {}...", config.port);

    // Initialize database pool
    let pool = db::init_db(&config.database_url).await?;
    tracing::info!("✅ Conexión exitosa a PostgreSQL");

    let ws_state = WsState::new();

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Create uploads directory for PPT slides static serving
    tokio::fs::create_dir_all("uploads").await?;

    let app = Router::new()
        // Auth API
        .route("/api/auth/login", post(handlers::auth::login))
        .with_state((pool.clone(), config.clone()))
        // Grades API
        .route("/api/grades", get(handlers::grades::get_grades).post(handlers::grades::create_grade))
        .route("/api/grades/:id", delete(handlers::grades::delete_grade))
        .with_state(pool.clone())
        // Subjects API
        .route("/api/subjects", get(handlers::subjects::get_subjects).post(handlers::subjects::create_subject))
        .route("/api/subjects/:id", delete(handlers::subjects::delete_subject))
        .with_state(pool.clone())
        // Presentations API
        .route("/api/presentations/grade/:grade_id", get(handlers::presentations::get_presentations))
        .route("/api/presentations", post(handlers::presentations::create_presentation))
        .route("/api/presentations/validate/:code", get(handlers::presentations::validate_code))
        .route("/api/presentations/:id", delete(handlers::presentations::delete_presentation))
        .with_state(pool.clone())
        // WebSocket Realtime Hub
        .route("/ws", get(ws_handler))
        .with_state(ws_state)
        // Serve uploaded slide images static folder
        .nest_service("/uploads", ServeDir::new("uploads"))
        // Allow body payloads up to 100 MB for PowerPoint presentation uploads
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("🌐 Servidor escuchando en http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
