package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"

    "taskflow-backend/models"
)

type BoardHandler struct {
    DB *sqlx.DB
}

func NewBoardHandler(db *sqlx.DB) *BoardHandler {
    return &BoardHandler{DB: db}
}

func (h *BoardHandler) GetBoards(c *gin.Context) {
    workspaceID := c.Param("workspaceId")
    var boards []models.Board
    err := h.DB.Select(&boards, `SELECT * FROM boards WHERE workspace_id = $1 ORDER BY position, created_at`, workspaceID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    if boards == nil {
        boards = []models.Board{}
    }
    c.JSON(http.StatusOK, boards)
}

func (h *BoardHandler) CreateBoard(c *gin.Context) {
    workspaceID := c.Param("workspaceId")
    var req models.CreateBoardRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if req.Color == "" {
        req.Color = "#6366f1"
    }

    board := models.Board{
        ID:          uuid.New().String(),
        WorkspaceID: workspaceID,
        Name:        req.Name,
        Description: req.Description,
        Color:       req.Color,
    }

    _, err := h.DB.Exec(
        `INSERT INTO boards (id, workspace_id, name, description, color) VALUES ($1, $2, $3, $4, $5)`,
        board.ID, board.WorkspaceID, board.Name, board.Description, board.Color,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Create default columns
    defaultCols := []struct{ name, color string }{
        {"To Do", "#94a3b8"},
        {"In Progress", "#f59e0b"},
        {"Review", "#8b5cf6"},
        {"Done", "#22c55e"},
    }
    for i, col := range defaultCols {
        colID := uuid.New().String()
        h.DB.Exec(
            `INSERT INTO columns (id, board_id, name, position, color) VALUES ($1, $2, $3, $4, $5)`,
            colID, board.ID, col.name, i, col.color,
        )
    }

    c.JSON(http.StatusCreated, board)
}

func (h *BoardHandler) GetBoard(c *gin.Context) {
    boardID := c.Param("boardId")

    var board models.Board
    if err := h.DB.Get(&board, `SELECT * FROM boards WHERE id = $1`, boardID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
        return
    }

    var columns []models.Column
    h.DB.Select(&columns, `SELECT * FROM columns WHERE board_id = $1 ORDER BY position`, boardID)

    for i, col := range columns {
        var tasks []models.Task
        h.DB.Select(&tasks, `
            SELECT t.*, u.name as assignee_name
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.column_id = $1 ORDER BY t.position, t.created_at`, col.ID)
        for j := range tasks {
            if tasks[j].Labels == nil {
                tasks[j].Labels = []string{}
            }
        }
        columns[i].Tasks = tasks
    }

    board.Columns = columns
    c.JSON(http.StatusOK, board)
}

func (h *BoardHandler) DeleteBoard(c *gin.Context) {
    boardID := c.Param("boardId")
    h.DB.Exec(`DELETE FROM boards WHERE id = $1`, boardID)
    c.JSON(http.StatusOK, gin.H{"message": "Board deleted"})
}
