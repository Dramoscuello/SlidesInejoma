use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use crate::{
    auth::{create_jwt, verify_password},
    config::Config,
    models::{AuthResponse, LoginRequest, User},
};

pub async fn login(
    State((pool, config)): State<(PgPool, Config)>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::UNAUTHORIZED, "Credenciales inválidas".to_string()))?;

    if !verify_password(&payload.password, &user.password_hash) {
        return Err((StatusCode::UNAUTHORIZED, "Credenciales inválidas".to_string()));
    }

    let token = create_jwt(user.id, &user.email, &config.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        user_name: user.name,
        email: user.email,
    }))
}
