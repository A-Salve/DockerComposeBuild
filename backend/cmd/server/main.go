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
@@ -86,65 +87,97 @@ func main() {
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

		c.Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")

		writeMetric(c, "taskflow_runtime_cpu_count", "gauge", "Number of logical CPUs available.", runtime.NumCPU())
		writeMetric(c, "taskflow_runtime_goroutines", "gauge", "Current number of goroutines.", runtime.NumGoroutine())
		writeMetric(c, "taskflow_runtime_memory_alloc_bytes", "gauge", "Number of allocated bytes.", memStats.Alloc)
		writeMetric(c, "taskflow_runtime_memory_sys_bytes", "gauge", "Number of bytes obtained from the OS.", memStats.Sys)
		writeMetric(c, "taskflow_runtime_memory_heap_inuse_bytes", "gauge", "Number of heap bytes in use.", memStats.HeapInuse)
		writeMetric(c, "taskflow_runtime_memory_heap_idle_bytes", "gauge", "Number of idle heap bytes.", memStats.HeapIdle)
		writeMetric(c, "taskflow_runtime_memory_gc_total", "counter", "Total number of completed GC cycles.", memStats.NumGC)

		writeMetric(c, "taskflow_db_max_open_connections", "gauge", "Configured max open DB connections.", dbStats.MaxOpenConnections)
		writeMetric(c, "taskflow_db_open_connections", "gauge", "Current number of open DB connections.", dbStats.OpenConnections)
		writeMetric(c, "taskflow_db_in_use_connections", "gauge", "Current number of in-use DB connections.", dbStats.InUse)
		writeMetric(c, "taskflow_db_idle_connections", "gauge", "Current number of idle DB connections.", dbStats.Idle)
		writeMetric(c, "taskflow_db_wait_count_total", "counter", "Total number of waits for a new connection.", dbStats.WaitCount)
		writeMetric(c, "taskflow_db_wait_duration_seconds_total", "counter", "Total time blocked waiting for a new connection.", dbStats.WaitDuration.Seconds())
		writeMetric(c, "taskflow_db_max_idle_closed_total", "counter", "Total connections closed due to idle limit.", dbStats.MaxIdleClosed)
		writeMetric(c, "taskflow_db_max_idle_time_closed_total", "counter", "Total connections closed due to idle time.", dbStats.MaxIdleTimeClosed)
		writeMetric(c, "taskflow_db_max_lifetime_closed_total", "counter", "Total connections closed due to max lifetime.", dbStats.MaxLifetimeClosed)
	})

	r.GET("/metrics/json", func(c *gin.Context) {
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

func writeMetric(c *gin.Context, name, metricType, help string, value any) {
	fmt.Fprintf(c.Writer, "# HELP %s %s\n", name, help)
	fmt.Fprintf(c.Writer, "# TYPE %s %s\n", name, metricType)
	fmt.Fprintf(c.Writer, "%s %v\n", name, value)
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