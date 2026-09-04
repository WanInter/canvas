package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tigerowo/infinite-canvas/model"
	"github.com/tigerowo/infinite-canvas/repository"
)

// ==================== AI 调用日志 ====================

type AdminAILogResponse struct {
	Items []model.AICallLog `json:"items"`
	Total int64             `json:"total"`
}

func AdminListAILogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	var total int64
	var logs []model.AICallLog

	offset := (page - 1) * pageSize

	if err := db.Model(&model.AICallLog{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if err := db.Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": AdminAILogResponse{Items: logs, Total: total},
	})
}

func AdminDeleteAILogs(c *gin.Context) {
	var input struct {
		Before string `json:"before"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "Invalid input"})
		return
	}

	beforeTime, err := time.Parse(time.RFC3339, input.Before)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "Invalid date format"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if err := db.Where("created_at < ?", beforeTime).Delete(&model.AICallLog{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "Deleted successfully"})
}

// ==================== 积分日志 ====================

type AdminCreditLogResponse struct {
	Items []model.CreditLog `json:"items"`
	Total int64             `json:"total"`
}

func AdminListCreditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	keyword := c.Query("keyword")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	var total int64
	var logs []model.CreditLog

	query := db.Model(&model.CreditLog{})
	if keyword != "" {
		query = query.Joins("JOIN users ON users.id = credit_logs.user_id").
			Where("users.display_name LIKE ?", "%"+keyword+"%")
	}

	offset := (page - 1) * pageSize

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if err := query.Order("credit_logs.created_at DESC").Limit(pageSize).Offset(offset).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": AdminCreditLogResponse{Items: logs, Total: total},
	})
}

func AdminCreateCreditLog(c *gin.Context) {
	var input struct {
		UserID string `json:"user_id" binding:"required"`
		Type   string `json:"type" binding:"required"`
		Amount int    `json:"amount" binding:"required"`
		Remark string `json:"remark"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "Invalid input"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	// 获取用户信息
	var user model.User
	if err := db.Where("id = ?", input.UserID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 1, "msg": "User not found"})
		return
	}

	// 创建积分日志
	log := model.CreditLog{
		UserID: input.UserID,
		Type:   model.CreditLogType(input.Type),
		Amount: input.Amount,
		Remark: input.Remark,
	}

	if err := db.Create(&log).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	// 更新用户积分
	if err := db.Model(&user).Update("credits", user.Credits+input.Amount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": log})
}

// ==================== Agent 技能管理 (Gin wrappers) ====================

func AdminListAgentSkills(c *gin.Context) {
	AdminAgentSkills(c.Writer, c.Request)
}

func AdminGetAgentSkillFiles(c *gin.Context) {
	AdminAgentSkillFiles(c.Writer, c.Request, c.Param("id"))
}

// ==================== 素材库管理 (Gin wrapper) ====================

func AdminListAssets(c *gin.Context) {
	AdminAssets(c.Writer, c.Request)
}

// ==================== 提示词管理 ====================

type AdminPromptResponse struct {
	Items []model.Prompt `json:"items"`
	Total int64          `json:"total"`
}

func AdminListPrompts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	category := c.Query("category")
	keyword := c.Query("keyword")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	var total int64
	var prompts []model.Prompt

	query := db.Model(&model.Prompt{})
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if keyword != "" {
		query = query.Where("title LIKE ? OR content LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	offset := (page - 1) * pageSize

	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if err := query.Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&prompts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": AdminPromptResponse{Items: prompts, Total: total},
	})
}

func AdminSavePrompt(c *gin.Context) {
	var input model.Prompt
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "Invalid input"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if input.ID == "" {
		// Create
		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
			return
		}
	} else {
		// Update
		if err := db.Model(&model.Prompt{}).Where("id = ?", input.ID).Updates(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": input})
}

func AdminDeletePrompt(c *gin.Context) {
	id := c.Param("id")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if err := db.Where("id = ?", id).Delete(&model.Prompt{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "Deleted successfully"})
}

func AdminBatchDeletePrompts(c *gin.Context) {
	var input struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "Invalid input"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	if err := db.Where("id IN ?", input.IDs).Delete(&model.Prompt{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 1, "msg": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "Deleted successfully"})
}
