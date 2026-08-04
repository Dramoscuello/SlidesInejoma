#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Grade {
    pub id: Uuid,
    pub name: String,
    pub year: i32,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Subject {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGradeRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubjectRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Presentation {
    pub id: Uuid,
    pub grade_id: Uuid,
    pub subject_id: Option<Uuid>,
    pub title: String,
    pub code: String, // Unique 4-character reusable code
    pub slide_count: i32,
    pub is_live: bool,
    pub subject_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_name: String,
    pub email: String,
}

// WebSocket Event Messages
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    #[serde(rename = "JOIN_SESSION")]
    JoinSession { code: String, role: String },

    #[serde(rename = "SPECTATOR_COUNT")]
    SpectatorCount { count: usize },

    #[serde(rename = "CHANGE_SLIDE")]
    ChangeSlide { slide_index: u32 },

    #[serde(rename = "POINTER_MOVE")]
    PointerMove { x: f64, y: f64 },

    #[serde(rename = "DRAW_STROKE")]
    DrawStroke { points: serde_json::Value, color: String, width: u32 },

    #[serde(rename = "CLEAR_CANVAS")]
    ClearCanvas,

    #[serde(rename = "END_SESSION")]
    EndSession,
}
