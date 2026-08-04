# 📊 SlidesInejoma

**SlidesInejoma** es una plataforma interactiva de presentaciones en tiempo real diseñada para el ámbito educativo. Permite a los docentes transmitir presentaciones de PowerPoint con herramientas interactivas (trazo sobre diapositiva, puntero láser, contador de espectadores) y sincronizar en vivo la vista con los estudiantes mediante un código único de 4 caracteres.

---

## 🚀 Características Principales

### 👨‍🏫 Panel de Administración / Docente
- **Autenticación & Seed:** Inicio de sesión en `/login`. Incluye comando/script de *seed* para generar el usuario administrador inicial.
- **Gestión por Año Lectivo:** Creación y administración de grados académicos vinculados estrictamente al **año actual**.
- **Gestión de Presentaciones:** Subida de archivos `.ppt` y `.pptx`, edición y eliminación.
  > **Optimización:** Las presentaciones se procesan al subirse extrayendo cada slide como imágenes optimizadas (WebP/PNG), garantizando máxima velocidad y mínimo consumo de ancho de banda.
- **Modo Presentación en Vivo:**
  - Control de diapositivas a pantalla completa.
  - **Puntero Láser** y **Herramientas de Dibujo / Rayado** sobre la diapositiva en tiempo real.
  - **Código Único Reutilizable (4 caracteres):** Código alfanumérico asociado a la presentación para que los alumnos ingresen a la clase.
  - **Contador de Espectadores:** Visualización en vivo de cuántos estudiantes están conectados a la sesión.
  - **Finalizar Sesión:** Cierre de transmisión mediante WebSockets que notifica a los estudiantes y finaliza la clase.

### 👨‍🎓 Portal del Estudiante
- **Acceso Directo:** Ingreso en la ruta principal `/` mediante el código de 4 caracteres.
- **Validación de Sesión:** Verifica si el código existe y si la clase está en **transmisión activa en ese momento** (evita accesos a clases no iniciadas).
- **Proyección Sincronizada en Tiempo Real:** Avance automático de diapositivas, trazos del profesor y posición del puntero láser a través de WebSockets.
- **Cierre de Clase:** Al finalizar el profesor la sesión, el estudiante recibe un mensaje interactivo notificando el fin de la clase y es redirigido a `/`.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Backend** | [Rust](https://www.rust-lang.org/) + [Axum](https://github.com/tokio-rs/axum) (REST API & WebSockets) |
| **Frontend** | [React](https://react.dev/) + [Vite](https://vitejs.dev/) + HTML5 Canvas API |
| **Base de Datos** | [PostgreSQL](https://www.postgresql.org/) |
| **Contenedores** | [Docker](https://www.docker.com/) + Docker Compose |

---

## 📁 Estructura del Proyecto (Monorepo)

```text
SlidesInejoma/
├── backend/                  # Servidor Rust + Axum
│   ├── src/
│   │   ├── api/             # Endpoints REST (Auth, Grados, Slides)
│   │   ├── ws/              # Handlers de WebSockets (Sync en tiempo real)
│   │   ├── db/              # Modelos, migraciones y script de Seed
│   │   ├── utils/           # Procesador/convertidor de PPT/PPTX
│   │   └── main.rs
│   ├── Cargo.toml
│   └── Dockerfile
├── frontend/                 # Aplicación React + Vite
│   ├── src/
│   │   ├── components/      # Lienzo de dibujo, puntero, contador
│   │   ├── pages/           # Login, Home, Modo Presentador, Vista Alumno
│   │   ├── services/        # Cliente API y conexión WebSockets
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Orquestación (Postgres + Backend + Frontend)
└── README.md
```

---

## ⚙️ Configuración e Instalación

### 📦 Opción 1: Ejecución con Docker Compose (Recomendado)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/SlidesInejoma.git
   cd SlidesInejoma
   ```

2. **Configurar variables de entorno (`.env`):**
   Crea un archivo `.env` en la raíz del proyecto basándote en el siguiente esquema:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=slides_inejoma_db
   DATABASE_URL=postgres://postgres:postgres@db:5432/slides_inejoma_db
   JWT_SECRET=super_secret_jwt_key
   PORT=3000
   ```

3. **Iniciar los servicios:**
   ```bash
   docker-compose up --build
   ```

4. **Ejecutar el Seed inicial (Creación de Admin):**
   ```bash
   docker-compose exec backend cargo run --bin seed
   ```

---

### 💻 Opción 2: Ejecución Local Sin Docker

#### Requisitos Previos
- PostgreSQL corriendo localmente.
- Rust (Cargo) instalado.
- Node.js (v18+) y npm/pnpm.

#### 1. Configurar la Base de Datos
Crea la base de datos en tu PostgreSQL local y ejecuta las migraciones de Rust:
```bash
cd backend
export DATABASE_URL=postgres://usuario:password@localhost:5432/slides_inejoma_db
cargo run --bin seed  # Crea las tablas y el usuario administrador por defecto
```

#### 2. Iniciar el Backend (Rust / Axum)
```bash
cd backend
cargo run
# El backend iniciará en http://localhost:3000
```

#### 3. Iniciar el Frontend (React)
```bash
cd frontend
npm install
npm run dev
# El frontend iniciará en http://localhost:5173
```

---

## 🔌 Eventos WebSocket (Tiempo Real)

La comunicación en tiempo real entre el **Docente** y los **Estudiantes** utiliza los siguientes eventos WebSocket JSON:

- `JOIN_SESSION`: El estudiante se une usando el código de 4 caracteres.
- `SPECTATOR_COUNT`: Notifica a todos el número actual de espectadores conectados.
- `CHANGE_SLIDE`: Cambia la diapositiva visible actual `{ slide_index: number }`.
- `DRAW_STROKE`: Sincroniza líneas/trazos creados en el lienzo canvas.
- `POINTER_MOVE`: Sincroniza las coordenadas (X, Y) del puntero láser.
- `CLEAR_CANVAS`: Limpia los dibujos de la diapositiva actual.
- `END_SESSION`: Notifica la finalización de la clase, cierra conexiones y redirige al estudiante a `/`.

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT.
