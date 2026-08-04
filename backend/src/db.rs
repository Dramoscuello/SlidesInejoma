use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn init_db(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;

    // 1. Create users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'admin'
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // 2. Create grades table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS grades (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            year INT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // 3. Create subjects table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS subjects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) UNIQUE NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // 4. Create presentations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS presentations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
            subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            code VARCHAR(10) NOT NULL,
            slide_count INT NOT NULL DEFAULT 1,
            is_live BOOLEAN NOT NULL DEFAULT FALSE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // 5. Migration: Add subject_id column if presentations table was created prior to subjects feature
    sqlx::query(
        r#"
        ALTER TABLE presentations 
        ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
