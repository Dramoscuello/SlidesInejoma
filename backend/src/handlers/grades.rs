use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Datelike;
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::{CreateGradeRequest, Grade};

pub async fn get_grades(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Grade>>, (StatusCode, String)> {
    let current_year = chrono::Utc::now().year();

    let grades = sqlx::query_as::<_, Grade>("SELECT * FROM grades WHERE year = $1 ORDER BY name ASC")
        .bind(current_year)
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(grades))
}

pub async fn create_grade(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateGradeRequest>,
) -> Result<Json<Grade>, (StatusCode, String)> {
    let current_year = chrono::Utc::now().year();

    let grade = sqlx::query_as::<_, Grade>(
        "INSERT INTO grades (name, year) VALUES ($1, $2) RETURNING *",
    )
    .bind(&payload.name)
    .bind(current_year)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(grade))
}

pub async fn delete_grade(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM grades WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
