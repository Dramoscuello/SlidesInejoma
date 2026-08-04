use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;

#[path = "../auth.rs"]
mod auth;

#[path = "../models.rs"]
mod models;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/slides_inejoma_db".into());

    let admin_email = env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@inejoma.edu.co".into());
    let admin_password = env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "AdminPass2026!".into());
    let admin_name = env::var("ADMIN_NAME").unwrap_or_else(|_| "Prof. Administrador".into());

    println!("🌱 Conectando a PostgreSQL: {}...", database_url);
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

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

    sqlx::query(
        r#"
        ALTER TABLE presentations 
        ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
        "#,
    )
    .execute(&pool)
    .await?;

    let hashed_password = auth::hash_password(&admin_password)?;

    sqlx::query(
        r#"
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, 'admin')
        ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
        "#,
    )
    .bind(&admin_email)
    .bind(&hashed_password)
    .bind(&admin_name)
    .execute(&pool)
    .await?;

    println!("✅ Usuario Administrador Creado con Éxito:");
    println!("   👤 Email: {}", admin_email);
    println!("   🔑 Contraseña: {}", admin_password);

    Ok(())
}
