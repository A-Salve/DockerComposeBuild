package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"

    "taskflow-backend/models"
)

type TaskHandler struct {
    DB *sqlx.DB
}

func NewTaskHandler(db *sqlx.DB) *TaskHandler {
    return &TaskHandler{DB: db}
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
    columnID := c.Param("columnId")
    userID := c.GetString("user_id")

    var req models.CreateTaskRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if req.Priority == "" {
        req.Priority = "medium"
    }
    if req.Labels == nil {
        req.Labels = []string{}
    }

    var boardID string
    h.DB.Get(&boardID, `SELECT board_id FROM columns WHERE id = $1`, columnID)

    var maxPos int
    h.DB.Get(&maxPos, `SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE column_id = $1`, columnID)

    task := models.Task{
        ID:             uuid.New().String(),
        ColumnID:       columnID,
        BoardID:        boardID,
        Title:          req.Title,
        Description:    req.Description,
        Priority:       req.Priority,
        Status:         "todo",
        Position:       maxPos,
        DueDate:        req.DueDate,
        AssigneeID:     req.AssigneeID,
        CreatorID:      &userID,
        Labels:         req.Labels,
        EstimatedHours: req.EstimatedHours,
    }

    _, err := h.DB.Exec(`
        INSERT INTO tasks (id, column_id, board_id, title, description, priority, status, position, due_date, assignee_id, creator_id, estimated_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        task.ID, task.ColumnID, task.BoardID, task.Title, task.Description,
        task.Priority, task.Status, task.Position, task.DueDate,
        task.AssigneeID, task.CreatorID, task.EstimatedHours,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, task)
}

func (h *TaskHandler) GetTask(c *gin.Context) {
    taskID := c.Param("taskId")

    var task models.Task
    if err := h.DB.Get(&task, `SELECT * FROM tasks WHERE id = $1`, taskID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    if task.Labels == nil {
        task.Labels = []string{}
    }

    if task.AssigneeID != nil {
        var assignee models.User
        if err := h.DB.Get(&assignee, `SELECT * FROM users WHERE id = $1`, *task.AssigneeID); err == nil {
            task.Assignee = &assignee
        }
    }

    var comments []models.Comment
    h.DB.Select(&comments, `
        SELECT c.*, u.name, u.avatar_url, u.email
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = $1
        ORDER BY c.created_at`, taskID)
    task.Comments = comments

    c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
    taskID := c.Param("taskId")

    var updates map[string]interface{}
    if err := c.ShouldBindJSON(&updates); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if title, ok := updates["title"]; ok {
        h.DB.Exec(`UPDATE tasks SET title = $1, updated_at = NOW() WHERE id = $2`, title, taskID)
    }
    if desc, ok := updates["description"]; ok {
        h.DB.Exec(`UPDATE tasks SET description = $1, updated_at = NOW() WHERE id = $2`, desc, taskID)
    }
    if priority, ok := updates["priority"]; ok {
        h.DB.Exec(`UPDATE tasks SET priority = $1, updated_at = NOW() WHERE id = $2`, priority, taskID)
    }
    if assignee, ok := updates["assignee_id"]; ok {
        h.DB.Exec(`UPDATE tasks SET assignee_id = $1, updated_at = NOW() WHERE id = $2`, assignee, taskID)
    }

    var task models.Task
    h.DB.Get(&task, `SELECT * FROM tasks WHERE id = $1`, taskID)
    if task.Labels == nil {
        task.Labels = []string{}
    }
    c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) MoveTask(c *gin.Context) {
    taskID := c.Param("taskId")

    var req models.MoveTaskRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    h.DB.Exec(`UPDATE tasks SET column_id = $1, position = $2, updated_at = NOW() WHERE id = $3`,
        req.ColumnID, req.Position, taskID)

    c.JSON(http.StatusOK, gin.H{"message": "Task moved"})
}

func (h *TaskHandler) DeleteTask(c *gin.Context) {
    taskID := c.Param("taskId")
    h.DB.Exec(`DELETE FROM tasks WHERE id = $1`, taskID)
    c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

func (h *TaskHandler) AddComment(c *gin.Context) {
    taskID := c.Param("taskId")
    userID := c.GetString("user_id")

    var req models.CreateCommentRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    comment := models.Comment{
        ID:      uuid.New().String(),
        TaskID:  taskID,
        UserID:  userID,
        Content: req.Content,
    }

    h.DB.Exec(`INSERT INTO comments (id, task_id, user_id, content) VALUES ($1, $2, $3, $4)`,
        comment.ID, comment.TaskID, comment.UserID, comment.Content)

    var user models.User
    h.DB.Get(&user, `SELECT * FROM users WHERE id = $1`, userID)
    comment.User = &user

    c.JSON(http.StatusCreated, comment)
}
