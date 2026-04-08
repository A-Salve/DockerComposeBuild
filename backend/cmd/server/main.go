package main

import (
	"database/sql"
	"log"
	"os"
	"runtime"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"taskflow-backend/handlers"
	"taskflow-backend/middleware"
)

func connectDB() *sqlx.DB {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://taskflow:taskflow_secret@localhost:5432/taskflow?sslmode=disable"
	}
	var db *sqlx.DB
	var err error
	for i := 0; i < 15; i++ {
		db, err = sqlx.Connect("postgres", dbURL)
		if err == nil {
			log.Println("Connected to PostgreSQL")
			return db
		}
		log.Printf("DB not ready, retrying %d/15...", i+1)
		time.Sleep(2 * time.Second)
	}
	log.Fatalf("Cannot connect to DB: %v", err)
	return nil
}

func main() {
	db := connectDB()
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authH := handlers.NewAuthHandler(db)
	boardH := handlers.NewBoardHandler(db)
	taskH := handlers.NewTaskHandler(db)
	wsH := handlers.NewWorkspaceHandler(db)
	notifH := handlers.NewNotificationHandler(db)

	// Public routes
	api := r.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authH.Register)
			auth.POST("/login", authH.Login)
		}
	}

	// Protected routes
	protected := api.Group("/")
	protected.Use(middleware.AuthRequired())
	{
		protected.GET("/auth/me", authH.Me)

		// Workspaces
		protected.GET("/workspaces", wsH.GetWorkspaces)
		protected.POST("/workspaces", wsH.CreateWorkspace)
		protected.GET("/workspaces/:workspaceId", wsH.GetWorkspace)
		protected.GET("/workspaces/:workspaceId/members", wsH.GetMembers)

		// Boards
		protected.GET("/workspaces/:workspaceId/boards", boardH.GetBoards)
		protected.POST("/workspaces/:workspaceId/boards", boardH.CreateBoard)
		protected.GET("/boards/:boardId", boardH.GetBoard)
		protected.DELETE("/boards/:boardId", boardH.DeleteBoard)

		// Tasks
		protected.POST("/columns/:columnId/tasks", taskH.CreateTask)
		protected.GET("/tasks/:taskId", taskH.GetTask)
		protected.PATCH("/tasks/:taskId", taskH.UpdateTask)
		protected.POST("/tasks/:taskId/move", taskH.MoveTask)
		protected.DELETE("/tasks/:taskId", taskH.DeleteTask)
		protected.POST("/tasks/:taskId/comments", taskH.AddComment)

		// Notifications
		protected.GET("/notifications", notifH.GetNotifications)
		protected.POST("/notifications/mark-read", notifH.MarkRead)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "taskflow-api"})
	})

	r.GET("/metrics", func(c *gin.Context) {
		dbStats := db.Stats()
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		c.JSON(200, gin.H{
			"service":   "taskflow-api",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"resource": gin.H{
				"cpu_count":          runtime.NumCPU(),
				"goroutines":         runtime.NumGoroutine(),
				"memory_alloc_bytes": memStats.Alloc,
				"memory_sys_bytes":   memStats.Sys,
				"memory_heap_inuse":  memStats.HeapInuse,
				"memory_heap_idle":   memStats.HeapIdle,
				"memory_num_gc":      memStats.NumGC,
			},
			"database": formatDBStats(dbStats),
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("TaskFlow API running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func formatDBStats(stats sql.DBStats) gin.H {
	return gin.H{
		"max_open_connections": stats.MaxOpenConnections,
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration.String(),
		"max_idle_closed":      stats.MaxIdleClosed,
		"max_idle_time_closed": stats.MaxIdleTimeClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	}
}