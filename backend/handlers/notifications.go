package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"

    "taskflow-backend/models"
)

type NotificationHandler struct {
    DB *sqlx.DB
}

func NewNotificationHandler(db *sqlx.DB) *NotificationHandler {
    return &NotificationHandler{DB: db}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
    userID := c.GetString("user_id")
    var notifs []models.Notification
    h.DB.Select(&notifs, `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, userID)
    if notifs == nil {
        notifs = []models.Notification{}
    }
    c.JSON(http.StatusOK, notifs)
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
    userID := c.GetString("user_id")
    h.DB.Exec(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, userID)
    c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}
