package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tigerowo/infinite-canvas/model"
	"github.com/tigerowo/infinite-canvas/repository"
)

// GetUserProfile 获取用户个人信息（个人中心）
func GetUserProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var user model.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	// 获取积分余额
	var creditBalance model.UserCreditBalance
	db.Where("user_id = ?", userID).First(&creditBalance)

	// 获取会员信息
	var membership model.UserMembership
	db.Where("user_id = ? AND status = ?", userID, model.MembershipStatusActive).
		Where("expire_at > ?", time.Now()).
		Order("expire_at DESC").
		First(&membership)

	// 获取最近任务统计
	var taskStats struct {
		Total      int64 `json:"total"`
		Succeeded  int64 `json:"succeeded"`
		Failed     int64 `json:"failed"`
		Processing int64 `json:"processing"`
	}
	db.Model(&model.GenerationTask{}).Where("user_id = ?", userID).Count(&taskStats.Total)
	db.Model(&model.GenerationTask{}).Where("user_id = ? AND status = ?", userID, model.TaskStatusSucceeded).Count(&taskStats.Succeeded)
	db.Model(&model.GenerationTask{}).Where("user_id = ? AND status = ?", userID, model.TaskStatusFailed).Count(&taskStats.Failed)
	db.Model(&model.GenerationTask{}).Where("user_id = ? AND status IN ?", userID, []model.TaskStatus{model.TaskStatusQueued, model.TaskStatusProcessing}).Count(&taskStats.Processing)

	// 获取推荐统计
	var referralCount int64
	db.Model(&model.UserReferral{}).Where("inviter_user_id = ?", userID).Count(&referralCount)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"displayName": user.DisplayName,
			"avatarUrl":   user.AvatarURL,
			"role":        user.Role,
			"affCode":     user.AffCode,
			"createdAt":   user.CreatedAt,
		},
		"credits": gin.H{
			"available": creditBalance.Available,
			"plan":      creditBalance.Plan,
		},
		"membership": func() interface{} {
			if membership.ID != "" {
				return gin.H{
					"plan":     membership.Plan,
					"status":   membership.Status,
					"expireAt": membership.ExpireAt,
				}
			}
			return nil
		}(),
		"taskStats": taskStats,
		"referral": gin.H{
			"count": referralCount,
		},
	})
}

// GetUserCreditHistory 获取用户积分历史
func GetUserCreditHistory(c *gin.Context) {
	userID := c.GetString("user_id")
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var transactions []model.CreditTransaction
	var total int64

	offset := 0
	if page != "1" {
		offset = (atoi(page) - 1) * atoi(pageSize)
	}

	db.Model(&model.CreditTransaction{}).Where("user_id = ?", userID).Count(&total)
	db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(atoi(pageSize)).
		Offset(offset).
		Find(&transactions)

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"total":        total,
		"page":         page,
		"pageSize":     pageSize,
	})
}

// GetUserTasks 获取用户任务列表
func GetUserTasks(c *gin.Context) {
	userID := c.GetString("user_id")
	status := c.Query("status")
	taskType := c.Query("type")
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var tasks []model.GenerationTask
	var total int64

	query := db.Model(&model.GenerationTask{}).Where("user_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if taskType != "" {
		query = query.Where("task_type = ?", taskType)
	}

	query.Count(&total)

	offset := 0
	if page != "1" {
		offset = (atoi(page) - 1) * atoi(pageSize)
	}

	query.Order("created_at DESC").
		Limit(atoi(pageSize)).
		Offset(offset).
		Find(&tasks)

	c.JSON(http.StatusOK, gin.H{
		"tasks":    tasks,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetUserAPIKeys 获取用户 API 密钥列表
func GetUserAPIKeys(c *gin.Context) {
	userID := c.GetString("user_id")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var keys []model.APIKey
	db.Where("user_id = ? AND disabled_at IS NULL", userID).
		Order("created_at DESC").
		Find(&keys)

	// 不返回 key_hash
	var safeKeys []gin.H
	for _, key := range keys {
		safeKeys = append(safeKeys, gin.H{
			"id":         key.ID,
			"name":       key.Name,
			"lastUsedAt": key.LastUsedAt,
			"createdAt":  key.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"keys": safeKeys,
	})
}

// GetUserReferrals 获取用户推荐列表
func GetUserReferrals(c *gin.Context) {
	userID := c.GetString("user_id")
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var referrals []model.UserReferral
	var total int64

	offset := 0
	if page != "1" {
		offset = (atoi(page) - 1) * atoi(pageSize)
	}

	db.Model(&model.UserReferral{}).Where("inviter_user_id = ?", userID).Count(&total)
	db.Where("inviter_user_id = ?", userID).
		Order("created_at DESC").
		Limit(atoi(pageSize)).
		Offset(offset).
		Find(&referrals)

	c.JSON(http.StatusOK, gin.H{
		"referrals": referrals,
		"total":     total,
		"page":      page,
		"pageSize":  pageSize,
	})
}

func atoi(s string) int {
	var i int
	for _, c := range s {
		i = i*10 + int(c-'0')
	}
	return i
}
