use std::env;

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub admin_email: String,
    pub admin_password: String,
    pub admin_name: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/slides_inejoma_db".into()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "super_secret_jwt_key_slides_inejoma_2026".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse()
                .unwrap_or(3000),
            admin_email: env::var("ADMIN_EMAIL")
                .unwrap_or_else(|_| "admin@inejoma.edu.co".into()),
            admin_password: env::var("ADMIN_PASSWORD")
                .unwrap_or_else(|_| "AdminPass2026!".into()),
            admin_name: env::var("ADMIN_NAME")
                .unwrap_or_else(|_| "Prof. Administrador".into()),
        }
    }
}
