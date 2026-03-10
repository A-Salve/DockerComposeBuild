package models

import (
    "time"
)

type User struct {
    ID           string     `json:"id" db:"id"`
    Email        string     `json:"email" db:"email"`
    PasswordHash string     `json:"-" db:"password_hash"`
    Name         string     `json:"name" db:"name"`
    AvatarURL    *string    `json:"avatar_url" db:"avatar_url"`
    Role         string     `json:"role" db:"role"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

type Workspace struct {
    ID          string    `json:"id" db:"id"`
    Name        string    `json:"name" db:"name"`
    Description *string   `json:"description" db:"description"`
    OwnerID     string    `json:"owner_id" db:"owner_id"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
    Members     []User    `json:"members,omitempty"`
}

type Board struct {
    ID          string    `json:"id" db:"id"`
    WorkspaceID string    `json:"workspace_id" db:"workspace_id"`
    Name        string    `json:"name" db:"name"`
    Description *string   `json:"description" db:"description"`
    Color       string    `json:"color" db:"color"`
    Position    int       `json:"position" db:"position"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
    Columns     []Column  `json:"columns,omitempty"`
}

type Column struct {
    ID        string    `json:"id" db:"id"`
    BoardID   string    `json:"board_id" db:"board_id"`
    Name      string    `json:"name" db:"name"`
    Position  int       `json:"position" db:"position"`
    Color     *string   `json:"color" db:"color"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    Tasks     []Task    `json:"tasks,omitempty"`
}

type Task struct {
    ID             string     `json:"id" db:"id"`
    ColumnID       string     `json:"column_id" db:"column_id"`
    BoardID        string     `json:"board_id" db:"board_id"`
    Title          string     `json:"title" db:"title"`
    Description    *string    `json:"description" db:"description"`
    Priority       string     `json:"priority" db:"priority"`
    Status         string     `json:"status" db:"status"`
    Position       int        `json:"position" db:"position"`
    DueDate        *time.Time `json:"due_date" db:"due_date"`
    AssigneeID     *string    `json:"assignee_id" db:"assignee_id"`
    CreatorID      *string    `json:"creator_id" db:"creator_id"`
    Labels         []string   `json:"labels" db:"labels"`
    EstimatedHours *float64   `json:"estimated_hours" db:"estimated_hours"`
    CreatedAt      time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
    Assignee       *User      `json:"assignee,omitempty"`
    Comments       []Comment  `json:"comments,omitempty"`
}

type Comment struct {
    ID        string    `json:"id" db:"id"`
    TaskID    string    `json:"task_id" db:"task_id"`
    UserID    string    `json:"user_id" db:"user_id"`
    Content   string    `json:"content" db:"content"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
    User      *User     `json:"user,omitempty"`
}

type Notification struct {
    ID         string    `json:"id" db:"id"`
    UserID     string    `json:"user_id" db:"user_id"`
    Title      string    `json:"title" db:"title"`
    Message    string    `json:"message" db:"message"`
    Type       string    `json:"type" db:"type"`
    Read       bool      `json:"read" db:"read"`
    EntityType string    `json:"entity_type" db:"entity_type"`
    EntityID   string    `json:"entity_id" db:"entity_id"`
    CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type ActivityLog struct {
    ID          string                 `json:"id" db:"id"`
    UserID      string                 `json:"user_id" db:"user_id"`
    WorkspaceID string                 `json:"workspace_id" db:"workspace_id"`
    EntityType  string                 `json:"entity_type" db:"entity_type"`
    EntityID    string                 `json:"entity_id" db:"entity_id"`
    Action      string                 `json:"action" db:"action"`
    Metadata    map[string]interface{} `json:"metadata" db:"metadata"`
    CreatedAt   time.Time              `json:"created_at" db:"created_at"`
    User        *User                  `json:"user,omitempty"`
}

// Request/Response types
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Name     string `json:"name" binding:"required"`
}

type AuthResponse struct {
    Token string `json:"token"`
    User  User   `json:"user"`
}

type CreateBoardRequest struct {
    Name        string  `json:"name" binding:"required"`
    Description *string `json:"description"`
    Color       string  `json:"color"`
}

type CreateTaskRequest struct {
    Title          string     `json:"title" binding:"required"`
    Description    *string    `json:"description"`
    Priority       string     `json:"priority"`
    DueDate        *time.Time `json:"due_date"`
    AssigneeID     *string    `json:"assignee_id"`
    Labels         []string   `json:"labels"`
    EstimatedHours *float64   `json:"estimated_hours"`
}

type MoveTaskRequest struct {
    ColumnID string `json:"column_id" binding:"required"`
    Position int    `json:"position"`
}

type CreateCommentRequest struct {
    Content string `json:"content" binding:"required"`
}

type WSMessage struct {
    Type    string      `json:"type"`
    Payload interface{} `json:"payload"`
}
