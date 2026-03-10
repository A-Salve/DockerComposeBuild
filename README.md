# TaskFlow — Full-Stack Project Management App

A production-grade project management application built with modern technologies.

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80)                        │
│                     Reverse Proxy / Router                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
    ┌────▼────┐      ┌─────▼─────┐    ┌──────▼──────┐
    │Frontend │      │  Backend  │    │  Analytics  │
    │  React  │      │  Go/Gin   │    │  Service    │
    │ Port 80 │      │ Port 8080 │    │ Port 8082   │
    └─────────┘      └─────┬─────┘    └──────┬──────┘
                           │                  │
              ┌────────────┼──────────────────┤
              │            │                  │
        ┌─────▼────┐  ┌────▼────┐   ┌────────▼───────┐
        │PostgreSQL│  │  Redis  │   │  Notification  │
        │ Port5432 │  │ Port6379│   │  Service       │
        └──────────┘  └─────────┘   │  Port 8081     │
                                    └────────────────┘
```

## 🚀 Tech Stack

### Frontend
- **React 18** — UI framework
- **React Router v6** — Client-side routing
- **Recharts** — Analytics charts
- **Drag & Drop** — Native HTML5 DnD for Kanban
- **Custom Design System** — Dark theme with purple accent

### Backend (Go)
- **Gin** — HTTP framework
- **sqlx** — PostgreSQL ORM
- **JWT** — Authentication
- **golang-jwt** — Token generation
- **go-redis** — Redis client
- **bcrypt** — Password hashing

### Database
- **PostgreSQL 16** — Primary database
  - Users, Workspaces, Boards, Columns, Tasks
  - Comments, Notifications, Activity logs
  - Full relational schema with UUID PKs

### Microservices
- **Notification Service** (Go + Redis Pub/Sub)
  - Real-time notifications via SSE
  - Redis queue for async processing
- **Analytics Service** (Go + PostgreSQL)
  - Workspace statistics
  - Task completion rates
  - Activity heatmaps

### Infrastructure
- **Docker Compose** — Service orchestration
- **NGINX** — Reverse proxy, load balancing
- **Redis** — Caching, pub/sub, queues

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose

### Run Everything
```bash
git clone <repo>
cd taskflow
docker-compose up --build
```

App available at: **http://localhost**

### Services
| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API | http://localhost/api/v1 |
| API Direct | http://localhost:8080 |
| Analytics | http://localhost:8082 |
| Notifications | http://localhost:8081 |

## 📋 Features

- ✅ **Authentication** — JWT-based login/register
- ✅ **Workspaces** — Multi-workspace support
- ✅ **Kanban Boards** — Drag & drop task management
- ✅ **Task Management** — Create, edit, move, delete tasks
- ✅ **Comments** — Threaded comments on tasks
- ✅ **Priority System** — Critical/High/Medium/Low
- ✅ **Labels & Tags** — Task categorization
- ✅ **Due Dates** — Overdue detection
- ✅ **Analytics Dashboard** — Charts and KPIs
- ✅ **Real-time Notifications** — SSE-based
- ✅ **Responsive Design** — Works on all screen sizes

## 🔌 API Endpoints

### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Workspaces
```
GET  /api/v1/workspaces
POST /api/v1/workspaces
GET  /api/v1/workspaces/:id
GET  /api/v1/workspaces/:id/members
```

### Boards
```
GET    /api/v1/workspaces/:wsId/boards
POST   /api/v1/workspaces/:wsId/boards
GET    /api/v1/boards/:id
DELETE /api/v1/boards/:id
```

### Tasks
```
POST   /api/v1/columns/:colId/tasks
GET    /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id
POST   /api/v1/tasks/:id/move
DELETE /api/v1/tasks/:id
POST   /api/v1/tasks/:id/comments
```

## 🗄 Database Schema

8 tables with full relational integrity:
- `users` — Authentication & profiles  
- `workspaces` — Top-level containers
- `workspace_members` — Many-to-many
- `boards` — Kanban boards per workspace
- `columns` — Board columns (To Do, In Progress, etc.)
- `tasks` — The actual work items
- `comments` — Task discussions
- `notifications` — User notification inbox
