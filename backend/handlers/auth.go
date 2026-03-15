package handlers

import (
    "net/http"
    "os"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "golang.org/x/crypto/bcrypt"

    "taskflow-backend/middleware"
    "taskflow-backend/models"
)

type AuthHandler struct {
    DB *sqlx.DB
}

func NewAuthHandler(db *sqlx.DB) *AuthHandler {
    return &AuthHandler{DB: db}
}

func generateToken(userID, email string) (string, error) {
    secret := os.Getenv("JWT_SECRET")
    if secret == "" {
        secret = "dev_secret"
    }
    claims := middleware.Claims{
        UserID: userID,
        Email:  email,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 7)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req models.RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
        return
    }

    user := models.User{
        ID:           uuid.New().String(),
        Email:        req.Email,
        PasswordHash: string(hash),
        Name:         req.Name,
        Role:         "member",
    }

    _, err = h.DB.Exec(
        `INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
        user.ID, user.Email, user.PasswordHash, user.Name, user.Role,
    )
    if err != nil {
        c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
        return
    }

    token, err := generateToken(user.ID, user.Email)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
        return
    }

    // Create default workspace
    wsID := uuid.New().String()
    h.DB.Exec(
        `INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)`,
        wsID, user.Name+"'s Workspace", user.ID,
    )
    h.DB.Exec(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
        wsID, user.ID, "owner",
    )

    c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Login(c *gin.Context) {
    var req models.LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var user models.User
    err := h.DB.Get(&user, `SELECT * FROM users WHERE email = $1`, req.Email)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
        return
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
        return
    }

    token, err := generateToken(user.ID, user.Email)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
        return
    }

    c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Me(c *gin.Context) {
    userID := c.GetString("user_id")
    var user models.User
    if err := h.DB.Get(&user, `SELECT * FROM users WHERE id = $1`, userID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }
    c.JSON(http.StatusOK, user)
}
