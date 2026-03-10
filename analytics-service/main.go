package main

import (
    "log"
    "net/http"
    "os"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
)

type AnalyticsService struct {
    DB *sqlx.DB
}

type TaskStats struct {
    Total      int     `json:"total" db:"total"`
    Completed  int     `json:"completed" db:"completed"`
    InProgress int     `json:"in_progress" db:"in_progress"`
    Overdue    int     `json:"overdue" db:"overdue"`
    AvgTime    float64 `json:"avg_completion_hours" db:"avg_completion_hours"`
}

type PriorityBreakdown struct {
    Priority string `json:"priority" db:"priority"`
    Count    int    `json:"count" db:"count"`
}

type ActivityPoint struct {
    Date  time.Time `json:"date" db:"date"`
    Count int       `json:"count" db:"count"`
}

func main() {
    dbURL := os.Getenv("DB_URL")
    if dbURL == "" {
        dbURL = "postgres://taskflow:taskflow_secret@localhost:5432/taskflow?sslmode=disable"
    }

    var db *sqlx.DB
    var err error
    for i := 0; i < 10; i++ {
        db, err = sqlx.Connect("postgres", dbURL)
        if err == nil {
            break
        }
        time.Sleep(2 * time.Second)
    }
    if err != nil {
        log.Fatalf("DB error: %v", err)
    }
    log.Println("Analytics Service connected to DB")

    svc := &AnalyticsService{DB: db}
    r := gin.Default()

    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "analytics-service"})
    })

    r.GET("/stats/workspace/:workspaceId", func(c *gin.Context) {
        wsID := c.Param("workspaceId")

        var stats TaskStats
        svc.DB.Get(&stats, `
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'done' OR column_id IN (
                    SELECT id FROM columns c JOIN boards b ON c.board_id = b.id
                    WHERE b.workspace_id = $1 AND c.name ILIKE '%done%'
                )) as completed,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') as overdue,
                COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 0) as avg_completion_hours
            FROM tasks t
            JOIN columns col ON t.column_id = col.id
            JOIN boards b ON col.board_id = b.id
            WHERE b.workspace_id = $1`, wsID)

        var priorities []PriorityBreakdown
        svc.DB.Select(&priorities, `
            SELECT priority, COUNT(*) as count
            FROM tasks t
            JOIN columns col ON t.column_id = col.id
            JOIN boards b ON col.board_id = b.id
            WHERE b.workspace_id = $1
            GROUP BY priority`, wsID)

        var activity []ActivityPoint
        svc.DB.Select(&activity, `
            SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
            FROM tasks t
            JOIN columns col ON t.column_id = col.id
            JOIN boards b ON col.board_id = b.id
            WHERE b.workspace_id = $1 AND t.created_at > NOW() - INTERVAL '30 days'
            GROUP BY date ORDER BY date`, wsID)

        if priorities == nil {
            priorities = []PriorityBreakdown{}
        }
        if activity == nil {
            activity = []ActivityPoint{}
        }

        c.JSON(http.StatusOK, gin.H{
            "summary":    stats,
            "priorities": priorities,
            "activity":   activity,
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8082"
    }
    log.Printf("Analytics Service on port %s", port)
    r.Run(":" + port)
}
