use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Json,
};
use rand::Rng;
use serde::Serialize;
use sqlx::PgPool;
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

use crate::models::Presentation;

#[derive(Debug, Serialize)]
pub struct ValidateCodeResponse {
    pub valid: bool,
    pub is_live: bool,
    pub title: Option<String>,
    pub presentation_id: Option<Uuid>,
    pub slide_count: Option<i32>,
}

fn generate_4char_code() -> String {
    const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    (0..4)
        .map(|_| {
            let idx = rng.gen_range(0..CHARS.len());
            CHARS[idx] as char
        })
        .collect()
}

/// Use pdftoppm (poppler-utils) to render each PDF page to a PNG image.
/// Returns the number of slides generated.
async fn render_pdf_to_slides(pdf_path: &std::path::Path, output_dir: &std::path::Path) -> Result<i32, String> {
    let output_prefix = output_dir.join("slide");

    // pdftoppm -png -r 200 input.pdf output_prefix
    // This creates output_prefix-1.png, output_prefix-2.png, etc.
    let result = tokio::process::Command::new("pdftoppm")
        .arg("-png")
        .arg("-r")
        .arg("200")
        .arg(pdf_path.as_os_str())
        .arg(output_prefix.as_os_str())
        .output()
        .await
        .map_err(|e| format!("Error al ejecutar pdftoppm: {}. Instálalo con: brew install poppler (macOS) o apt install poppler-utils (Debian)", e))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!("pdftoppm falló: {}", stderr));
    }

    // pdftoppm creates files like slide-1.png, slide-2.png, slide-01.png, etc.
    // Rename them to slide_1.png, slide_2.png for consistent naming
    let mut entries = fs::read_dir(output_dir)
        .await
        .map_err(|e| format!("Error al leer directorio: {}", e))?;

    let mut slide_files: Vec<String> = Vec::new();
    while let Ok(Some(entry)) = entries.next_entry().await {
        let fname = entry.file_name().to_string_lossy().to_string();
        if fname.starts_with("slide-") && fname.ends_with(".png") {
            slide_files.push(fname);
        }
    }

    slide_files.sort_by_key(|name| {
        name.trim_start_matches("slide-")
            .trim_end_matches(".png")
            .parse::<i32>()
            .unwrap_or(0)
    });

    let slide_count = slide_files.len() as i32;

    for (idx, old_name) in slide_files.iter().enumerate() {
        let old_path = output_dir.join(old_name);
        let new_path = output_dir.join(format!("slide_{}.png", idx + 1));
        let _ = fs::rename(&old_path, &new_path).await;
    }

    Ok(slide_count)
}

pub async fn get_presentations(
    State(pool): State<PgPool>,
    Path(grade_id): Path<Uuid>,
) -> Result<Json<Vec<Presentation>>, (StatusCode, String)> {
    let presentations = sqlx::query_as::<_, Presentation>(
        r#"
        SELECT p.id, p.grade_id, p.subject_id, p.title, p.code, p.slide_count, p.is_live, s.name as subject_name
        FROM presentations p
        LEFT JOIN subjects s ON p.subject_id = s.id
        WHERE p.grade_id = $1
        ORDER BY p.title ASC
        "#,
    )
    .bind(grade_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Error al obtener presentaciones: {:?}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(presentations))
}

pub async fn create_presentation(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<Json<Presentation>, (StatusCode, String)> {
    let mut grade_id: Option<Uuid> = None;
    let mut subject_id: Option<Uuid> = None;
    let mut title: Option<String> = None;
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or_default().to_string();
        if name == "grade_id" {
            if let Ok(text) = field.text().await {
                grade_id = Uuid::parse_str(&text).ok();
            }
        } else if name == "subject_id" {
            if let Ok(text) = field.text().await {
                if !text.is_empty() && text != "null" {
                    subject_id = Uuid::parse_str(&text).ok();
                }
            }
        } else if name == "title" {
            if let Ok(text) = field.text().await {
                title = Some(text);
            }
        } else if name == "file" {
            file_name = field.file_name().map(|s| s.to_string());
            if let Ok(bytes) = field.bytes().await {
                file_bytes = Some(bytes.to_vec());
            }
        }
    }

    let grade_id = grade_id.ok_or((StatusCode::BAD_REQUEST, "grade_id es requerido".to_string()))?;
    let title = title.unwrap_or_else(|| "Nueva Presentación".to_string());
    let code = generate_4char_code();
    let presentation_id = Uuid::new_v4();

    // Create presentation folder
    let upload_dir = PathBuf::from("uploads").join(presentation_id.to_string());
    fs::create_dir_all(&upload_dir)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error al crear directorio: {}", e)))?;

    let mut slide_count: i32 = 1;

    // Save the uploaded PDF and render each page to a PNG image
    if let (Some(bytes), Some(fname)) = (file_bytes, file_name) {
        let file_path = upload_dir.join(&fname);
        fs::write(&file_path, &bytes)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error al guardar archivo: {}", e)))?;

        tracing::info!("📁 Archivo PDF guardado en {:?} ({} bytes)", file_path, bytes.len());

        // Render PDF pages to PNG images using pdftoppm
        match render_pdf_to_slides(&file_path, &upload_dir).await {
            Ok(count) => {
                slide_count = count;
                tracing::info!("✅ {} diapositivas renderizadas exitosamente desde PDF", count);
            }
            Err(e) => {
                tracing::error!("⚠️ Error al renderizar PDF: {}", e);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Error al procesar PDF: {}", e)));
            }
        }
    }

    // Insert into database with the real slide count
    let presentation = sqlx::query_as::<_, Presentation>(
        r#"
        WITH inserted AS (
            INSERT INTO presentations (id, grade_id, subject_id, title, code, slide_count, is_live)
            VALUES ($1, $2, $3, $4, $5, $6, false)
            RETURNING *
        )
        SELECT i.id, i.grade_id, i.subject_id, i.title, i.code, i.slide_count, i.is_live, s.name as subject_name
        FROM inserted i
        LEFT JOIN subjects s ON i.subject_id = s.id
        "#,
    )
    .bind(presentation_id)
    .bind(grade_id)
    .bind(subject_id)
    .bind(&title)
    .bind(&code)
    .bind(slide_count)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Error al insertar presentación: {:?}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(presentation))
}

pub async fn validate_code(
    State(pool): State<PgPool>,
    Path(code): Path<String>,
) -> Result<Json<ValidateCodeResponse>, (StatusCode, String)> {
    let code_upper = code.to_uppercase();

    let presentation = sqlx::query_as::<_, Presentation>(
        r#"
        SELECT p.id, p.grade_id, p.subject_id, p.title, p.code, p.slide_count, p.is_live, s.name as subject_name
        FROM presentations p
        LEFT JOIN subjects s ON p.subject_id = s.id
        WHERE p.code = $1
        "#,
    )
    .bind(&code_upper)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match presentation {
        Some(pres) => Ok(Json(ValidateCodeResponse {
            valid: true,
            is_live: pres.is_live,
            title: Some(pres.title.clone()),
            presentation_id: Some(pres.id),
            slide_count: Some(pres.slide_count),
        })),
        None => Ok(Json(ValidateCodeResponse {
            valid: false,
            is_live: false,
            title: None,
            presentation_id: None,
            slide_count: None,
        })),
    }
}

pub async fn delete_presentation(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let upload_dir = PathBuf::from("uploads").join(id.to_string());
    let _ = fs::remove_dir_all(upload_dir).await;

    sqlx::query("DELETE FROM presentations WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
