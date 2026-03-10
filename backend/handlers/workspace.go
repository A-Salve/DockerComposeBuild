package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"

    "taskflow-backend/models"
)

type WorkspaceHandler struct {
    DB *sqlx.DB
}

func NewWorkspaceHandler(db *sqlx.DB) *WorkspaceHandler {
    return &WorkspaceHandler{DB: db}
}

func (h *WorkspaceHandler) GetWorkspaces(c *gin.Context) {
    userID := c.GetString("user_id")

    var workspaces []models.Workspace
    err := h.DB.Select(&workspaces, `
        SELECT w.* FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY w.created_at`, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    if workspaces == nil {
        workspaces = []models.Workspace{}
    }
    c.JSON(http.StatusOK, workspaces)
}

func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
    userID := c.GetString("user_id")

    var req struct {
        Name        string  `json:"name" binding:"required"`
        Description *string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    ws := models.Workspace{
        ID:          uuid.New().String(),
        Name:        req.Name,
        Description: req.Description,
        OwnerID:     userID,
    }

    h.DB.Exec(`INSERT INTO workspaces (id, name, description, owner_id) VALUES ($1, $2, $3, $4)`,
        ws.ID, ws.Name, ws.Description, ws.OwnerID)
    h.DB.Exec(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
        ws.ID, userID, "owner")

    c.JSON(http.StatusCreated, ws)
}

func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
    wsID := c.Param("workspaceId")

    var ws models.Workspace
    if err := h.DB.Get(&ws, `SELECT * FROM workspaces WHERE id = $1`, wsID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
        return
    }

    var members []models.User
    h.DB.Select(&members, `
        SELECT u.* FROM users u
        JOIN workspace_members wm ON u.id = wm.user_id
        WHERE wm.workspace_id = $1`, wsID)
    ws.Members = members

    c.JSON(http.StatusOK, ws)
}

func (h *WorkspaceHandler) GetMembers(c *gin.Context) {
    wsID := c.Param("workspaceId")
    var members []models.User
    h.DB.Select(&members, `
        SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.created_at, u.updated_at
        FROM users u
        JOIN workspace_members wm ON u.id = wm.user_id
        WHERE wm.workspace_id = $1`, wsID)
    if members == nil {
        members = []models.User{}
    }
    c.JSON(http.StatusOK, members)
}
