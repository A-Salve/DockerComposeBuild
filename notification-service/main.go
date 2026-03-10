package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/redis/go-redis/v9"
)

type NotificationService struct {
    Redis *redis.Client
}

type SendNotificationRequest struct {
    UserID  string `json:"user_id"`
    Title   string `json:"title"`
    Message string `json:"message"`
    Type    string `json:"type"`
}

func main() {
    redisAddr := os.Getenv("REDIS_URL")
    if redisAddr == "" {
        redisAddr = "localhost:6379"
    }

    rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
    ctx := context.Background()
    if _, err := rdb.Ping(ctx).Result(); err != nil {
        log.Printf("Redis warning: %v", err)
    } else {
        log.Println("Connected to Redis")
    }

    svc := &NotificationService{Redis: rdb}

    r := gin.Default()

    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "notification-service"})
    })

    r.POST("/send", func(c *gin.Context) {
        var req SendNotificationRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        data, _ := json.Marshal(req)
        svc.Redis.Publish(ctx, "notifications:"+req.UserID, data)
        svc.Redis.LPush(ctx, "notif_queue", data)
        svc.Redis.LTrim(ctx, "notif_queue", 0, 999)

        log.Printf("Notification sent to user %s: %s", req.UserID, req.Title)
        c.JSON(http.StatusOK, gin.H{"status": "sent"})
    })

    r.GET("/subscribe/:userId", func(c *gin.Context) {
        userID := c.Param("userId")
        sub := svc.Redis.Subscribe(ctx, "notifications:"+userID)
        defer sub.Close()

        c.Header("Content-Type", "text/event-stream")
        c.Header("Cache-Control", "no-cache")
        c.Header("Connection", "keep-alive")

        ch := sub.Channel()
        for msg := range ch {
            c.Writer.Write([]byte("data: " + msg.Payload + "\n\n"))
            c.Writer.Flush()
        }
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8081"
    }
    log.Printf("Notification Service on port %s", port)
    r.Run(":" + port)
}
