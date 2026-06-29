<div align="center">

# 🧩 Fragments — Cloud-Native REST Microservice

### A production-grade Node.js/Express API for storing, retrieving, and converting text & image fragments — deployed to **AWS ECS** with full CI/CD automation.

[![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![AWS](https://img.shields.io/badge/AWS-ECS_·_S3_·_DynamoDB-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Version](https://img.shields.io/badge/version-0.11.0-blue)](#)

<a href="https://github.com/djpatel63/fragments">
  <img src="https://img.shields.io/badge/Source_Code-djpatel63/fragments-181717?logo=github&logoColor=white&style=for-the-badge" alt="GitHub Repository"/>
</a>

</div>

---

## ✨ What It Does

Fragments is a RESTful API that lets authenticated users store arbitrary text and image data ("fragments"), retrieve them, and convert between formats on the fly. Upload Markdown, get back HTML. Upload a PNG, get back a WebP.

> 🔗 **Repository:** [github.com/djpatel63/fragments](https://github.com/djpatel63/fragments)

---

## 🚀 Tech Stack

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

## 🛠️ Getting Started

```bash
# Clone the repository
git clone https://github.com/djpatel63/fragments.git
cd fragments

# Install dependencies
npm install

# Run in development (Basic Auth + in-memory storage)
npm run dev
```

With no AWS environment variables set, the API runs in **dev mode** using HTTP Basic Auth and an in-memory store — no cloud account required.

---

## 📡 API Endpoints

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

### 🔄 Format Conversions

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

## 🏗️ Architecture

### Request Flow

```
Client → [Cognito / Basic Auth] → Express API → [S3 + DynamoDB] / [In-Memory Map]
                                       ↓
                              Sharp / markdown-it
                               (format conversion)
```

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

```
fragments/
├── src/
│   ├── index.js
│   ├── server.js
│   ├── app.js
│   ├── logger.js
│   ├── response.js
│   ├── auth/
│   │   ├── index.js
│   │   ├── basic-auth.js
│   │   ├── cognito.js
│   │   └── utils.js
│   ├── utils/
│   │   └── owner.js
│   ├── model/
│   │   ├── fragment.js
│   │   └── data/
│   │       ├── index.js
│   │       ├── memory/
│   │       └── aws/
│   └── routes/
│       ├── index.js
│       ├── health.js
│       └── api/
│           ├── get.js
│           ├── post.js
│           └── put.js
├── tests/
│   ├── unit/
│   └── integration/
├── .github/workflows/
│   ├── ci.yml
│   └── cd.yml
├── Dockerfile
├── docker-compose.yml
├── docker-compose.local.yml
├── scripts/local-aws-setup.sh
└── fragments-definition.json
```

---

## 🧠 Key Design Decisions

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

## ⚙️ CI/CD Pipeline

**Continuous Integration** (every push):

```
ESLint → Hadolint → Jest unit tests → Hurl integration tests → Docker Hub push
```

**Continuous Deployment** (on `v*` tag):

```
Build & push to AWS ECR → Update ECS task definition → Deploy to ECS
```

---

## 🧪 Testing

- **16 unit test files** covering the Fragment model, auth strategies, response helpers, and route handlers (Jest + Supertest)
- **14 integration test scripts** running real HTTP requests against the full Docker Compose stack (Hurl)
- Tests run against both the in-memory backend and emulated AWS services

```bash
npm test            # unit tests
npm run test:watch  # watch mode
```

---

## 🐳 Docker

Multi-stage build: the build stage installs all dependencies, the production stage copies only production `node_modules` and source, and runs under **tini** as PID 1.

Two Docker Compose configs for local development:

- `docker-compose.yml` — App + DynamoDB Local + LocalStack
- `docker-compose.local.yml` — App + MinIO

```bash
docker compose up --build
```

---

## ☁️ AWS Infrastructure

| Service      | Purpose                                      |
| ------------ | -------------------------------------------- |
| **S3**       | Fragment binary content storage              |
| **DynamoDB** | Fragment metadata (hash: ownerId, range: id) |
| **Cognito**  | User authentication (JWT)                    |
| **ECR**      | Docker image registry                        |
| **ECS**      | Container orchestration (Fargate)            |

---

## 🎯 Skills Demonstrated

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

<div align="center">

**Built by Dhruv Patel** · ⭐ [Star this repo](https://github.com/djpatel63/fragments)

**Version 0.11.0**

</div>
