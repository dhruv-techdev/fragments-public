# Fragments — Cloud-Native REST Microservice

> A production-grade Node.js/Express microservice for storing, retrieving, and converting text and image fragments. Deployed to AWS ECS with full CI/CD automation.

⚠️ **This is a portfolio repository.** Source code is in a private repo due to infrastructure credentials and API keys. This README documents the architecture, design decisions, and technical depth of the project.

---

## What It Does

Fragments is a RESTful API that lets authenticated users store arbitrary text and image data ("fragments"), retrieve them, and convert between formats on the fly. Upload Markdown, get back HTML. Upload a PNG, get back a WebP.

---

## Tech Stack

| Layer                | Technology                                      |
| -------------------- | ----------------------------------------------- |
| **Runtime**          | Node.js 18 (Alpine Linux)                       |
| **Framework**        | Express 5.1.0                                   |
| **Auth (dev)**       | HTTP Basic Auth via http-auth + Passport        |
| **Auth (prod)**      | AWS Cognito JWT via aws-jwt-verify              |
| **Storage (dev)**    | In-memory Map                                   |
| **Storage (prod)**   | AWS S3 (binary content) + DynamoDB (metadata)   |
| **Image Processing** | Sharp                                           |
| **Markdown**         | markdown-it                                     |
| **Logging**          | Pino (structured JSON)                          |
| **Security**         | Helmet, CORS, Compression                       |
| **Testing**          | Jest + Supertest (unit), Hurl (integration)     |
| **CI/CD**            | GitHub Actions → Docker Hub → AWS ECR → AWS ECS |
| **Container**        | Docker (multi-stage build), Tini as PID 1       |
| **Local AWS**        | LocalStack (S3), DynamoDB Local, MinIO          |

---

## API Endpoints

All routes under `/v1/fragments` require authentication.

| Method   | Route                    | Description                                           |
| -------- | ------------------------ | ----------------------------------------------------- |
| `GET`    | `/`                      | Root health check (public)                            |
| `GET`    | `/v1/fragments/health`   | Health endpoint (public)                              |
| `GET`    | `/v1/fragments`          | List all fragment IDs (`?expand=1` for full metadata) |
| `GET`    | `/v1/fragments/:id`      | Retrieve raw fragment data                            |
| `GET`    | `/v1/fragments/:id/info` | Retrieve fragment metadata                            |
| `GET`    | `/v1/fragments/:id.:ext` | Retrieve with format conversion                       |
| `POST`   | `/v1/fragments`          | Create a new fragment (5 MB limit)                    |
| `PUT`    | `/v1/fragments/:id`      | Update fragment data (MIME type is immutable)         |
| `DELETE` | `/v1/fragments/:id`      | Delete a fragment                                     |

### Format Conversions

| Source Type        | Convertible To          |
| ------------------ | ----------------------- |
| `text/markdown`    | `.html`, `.txt`         |
| `text/html`        | `.txt`                  |
| `application/json` | `.txt`                  |
| `image/png`        | `.jpg`, `.webp`, `.gif` |
| `image/jpeg`       | `.png`, `.webp`, `.gif` |
| `image/webp`       | `.png`, `.jpg`, `.gif`  |
| `image/gif`        | `.png`, `.jpg`, `.webp` |

---

## Architecture

### Request Flow

Client → [Cognito / Basic Auth] → Express API → [S3 + DynamoDB] / [In-Memory Map]
↓
Sharp / markdown-it
(format conversion)

### Data Model

Each fragment stores two things separately:

- **Metadata** (DynamoDB in prod, Map in dev): id (UUID), ownerId, MIME type, size, created, updated
- **Content** (S3 in prod, Map in dev): raw binary Buffer, keyed by ownerId/id

The ownerId is a SHA-256 hash of the user's lowercase email.

### Dual-Environment Design

The codebase runs identically in development and production with zero code changes. Environment variables control which modules load at startup:

- `AWS_COGNITO_POOL_ID` defined → Cognito JWT auth, otherwise → Basic Auth
- `AWS_REGION` defined → S3 + DynamoDB, otherwise → In-Memory Map

### Directory Structure

fragments/
├── src/
│ ├── index.js
│ ├── server.js
│ ├── app.js
│ ├── logger.js
│ ├── response.js
│ ├── auth/
│ │ ├── index.js
│ │ ├── basic-auth.js
│ │ ├── cognito.js
│ │ └── utils.js
│ ├── utils/
│ │ └── owner.js
│ ├── model/
│ │ ├── fragment.js
│ │ └── data/
│ │ ├── index.js
│ │ ├── memory/
│ │ └── aws/
│ └── routes/
│ ├── index.js
│ ├── health.js
│ └── api/
│ ├── get.js
│ ├── post.js
│ └── put.js
├── tests/
│ ├── unit/
│ └── integration/
├── .github/workflows/
│ ├── ci.yml
│ └── cd.yml
├── Dockerfile
├── docker-compose.yml
├── docker-compose.local.yml
├── scripts/local-aws-setup.sh
└── fragments-definition.json

---

## Key Design Decisions

### Type Immutability

Once a fragment is created with a MIME type, that type can never be changed via PUT. The update endpoint enforces this at the route level, preventing broken conversion chains and ensuring metadata consistency.

### Raw Body Parsing

All POST/PUT bodies are parsed as raw Buffer regardless of Content-Type. The binary data is stored as-is, and the Content-Type header becomes the fragment's MIME type metadata.

### Graceful Shutdown

The server uses stoppable with a 10-second drain window. It handles SIGINT and SIGTERM, stops accepting new connections, waits for in-flight requests to complete, then exits. A 12-second force-kill timeout acts as a safety net.

### Owner ID Hashing

User identity is never stored in plain text. The owner ID is a SHA-256 hash of the lowercase email address.

### 5 MB Upload Limit

Enforced at the Express router level to keep the microservice focused on small content fragments.

---

## CI/CD Pipeline

### Continuous Integration (every push)

ESLint → Hadolint → Jest unit tests → Hurl integration tests → Docker Hub push

### Continuous Deployment (on v\* tag)

Build & push to AWS ECR → Update ECS task definition → Deploy to ECS

---

## Testing

- 16 unit test files covering the Fragment model, auth strategies, response helpers, and route handlers (Jest + Supertest)
- 14 integration test scripts running real HTTP requests against the full Docker Compose stack (Hurl)
- Tests run against both the in-memory backend and emulated AWS services

---

## Docker

Multi-stage build: build stage installs all dependencies, production stage copies only production node_modules and source, runs under tini as PID 1.

Two Docker Compose configs for local development:

- `docker-compose.yml` — App + DynamoDB Local + LocalStack
- `docker-compose.local.yml` — App + MinIO

---

## AWS Infrastructure

| Service      | Purpose                                      |
| ------------ | -------------------------------------------- |
| **S3**       | Fragment binary content storage              |
| **DynamoDB** | Fragment metadata (hash: ownerId, range: id) |
| **Cognito**  | User authentication (JWT)                    |
| **ECR**      | Docker image registry                        |
| **ECS**      | Container orchestration (Fargate)            |

---

## Skills Demonstrated

- REST API design with Express
- AWS service integration (S3, DynamoDB, Cognito, ECR, ECS)
- Authentication and authorization (JWT, HTTP Basic)
- Docker multi-stage builds and container orchestration
- CI/CD pipeline design with GitHub Actions
- Unit and integration testing strategies
- Structured logging and error handling
- Graceful server shutdown patterns
- Environment-based configuration management

---

**Version:** 0.11.0
