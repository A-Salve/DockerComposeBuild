package main

import (
	"database/sql"
	"fmt"
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

	// Prometheus-compatible metrics endpoint
	r.GET("/metrics", func(c *gin.Context) {
		dbStats := db.Stats()
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		var out string

		// Runtime metrics
		out += "# HELP go_goroutines Number of goroutines\n"
		out += "# TYPE go_goroutines gauge\n"
		out += fmt.Sprintf("go_goroutines %d\n", runtime.NumGoroutine())

		out += "# HELP go_memory_alloc_bytes Bytes allocated and in use\n"
		out += "# TYPE go_memory_alloc_bytes gauge\n"
		out += fmt.Sprintf("go_memory_alloc_bytes %d\n", memStats.Alloc)

		out += "# HELP go_memory_sys_bytes Bytes obtained from system\n"
		out += "# TYPE go_memory_sys_bytes gauge\n"
		out += fmt.Sprintf("go_memory_sys_bytes %d\n", memStats.Sys)

		out += "# HELP go_memory_heap_inuse_bytes Bytes in in-use spans\n"
		out += "# TYPE go_memory_heap_inuse_bytes gauge\n"
		out += fmt.Sprintf("go_memory_heap_inuse_bytes %d\n", memStats.HeapInuse)

		out += "# HELP go_memory_heap_idle_bytes Bytes in idle spans\n"
		out += "# TYPE go_memory_heap_idle_bytes gauge\n"
		out += fmt.Sprintf("go_memory_heap_idle_bytes %d\n", memStats.HeapIdle)

		out += "# HELP go_gc_count Total number of GC cycles\n"
		out += "# TYPE go_gc_count counter\n"
		out += fmt.Sprintf("go_gc_count %d\n", memStats.NumGC)

		out += "# HELP go_cpu_count Number of logical CPUs\n"
		out += "# TYPE go_cpu_count gauge\n"
		out += fmt.Sprintf("go_cpu_count %d\n", runtime.NumCPU())

		// DB pool metrics
		out += "# HELP db_max_open_connections Maximum number of open connections\n"
		out += "# TYPE db_max_open_connections gauge\n"
		out += fmt.Sprintf("db_max_open_connections %d\n", dbStats.MaxOpenConnections)

		out += "# HELP db_open_connections Current number of open connections\n"
		out += "# TYPE db_open_connections gauge\n"
		out += fmt.Sprintf("db_open_connections %d\n", dbStats.OpenConnections)

		out += "# HELP db_in_use_connections Connections currently in use\n"
		out += "# TYPE db_in_use_connections gauge\n"
		out += fmt.Sprintf("db_in_use_connections %d\n", dbStats.InUse)

		out += "# HELP db_idle_connections Idle connections\n"
		out += "# TYPE db_idle_connections gauge\n"
		out += fmt.Sprintf("db_idle_connections %d\n", dbStats.Idle)

		out += "# HELP db_wait_count Total number of connections waited for\n"
		out += "# TYPE db_wait_count counter\n"
		out += fmt.Sprintf("db_wait_count %d\n", dbStats.WaitCount)

		out += "# HELP db_wait_duration_seconds Total time blocked waiting for connections\n"
		out += "# TYPE db_wait_duration_seconds counter\n"
		out += fmt.Sprintf("db_wait_duration_seconds %f\n", dbStats.WaitDuration.Seconds())

		out += "# HELP db_max_idle_closed_total Connections closed due to max idle\n"
		out += "# TYPE db_max_idle_closed_total counter\n"
		out += fmt.Sprintf("db_max_idle_closed_total %d\n", dbStats.MaxIdleClosed)

		out += "# HELP db_max_idle_time_closed_total Connections closed due to max idle time\n"
		out += "# TYPE db_max_idle_time_closed_total counter\n"
		out += fmt.Sprintf("db_max_idle_time_closed_total %d\n", dbStats.MaxIdleTimeClosed)

		out += "# HELP db_max_lifetime_closed_total Connections closed due to max lifetime\n"
		out += "# TYPE db_max_lifetime_closed_total counter\n"
		out += fmt.Sprintf("db_max_lifetime_closed_total %d\n", dbStats.MaxLifetimeClosed)

		c.Data(200, "text/plain; version=0.0.4; charset=utf-8", []byte(out))
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