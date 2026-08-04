use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::{CreateSubjectRequest, Subject};

pub async fn get_subjects(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Subject>>, (StatusCode, String)> {
    let subjects = sqlx::query_as::<_, Subject>("SELECT * FROM subjects ORDER BY name ASC")
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(subjects))
}

pub async fn create_subject(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateSubjectRequest>,
) -> Result<Json<Subject>, (StatusCode, String)> {
    let subject = sqlx::query_as::<_, Subject>(
        "INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *",
    )
    .bind(&payload.name)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(subject))
}

pub async fn delete_subject(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM subjects WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
