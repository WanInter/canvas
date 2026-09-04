package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tigerowo/infinite-canvas/model"
	"github.com/tigerowo/infinite-canvas/repository"
	"github.com/tigerowo/infinite-canvas/service"
)

// AdminGetUsers 管理后台：获取用户列表
func AdminGetUsers(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	pageSize := c.DefaultQuery("pageSize", "20")
	search := c.Query("search")
	status := c.Query("status")
	role := c.Query("role")

	var users []model.User
	var total int64

	query := db.Model(&model.User{})

	if search != "" {
		query = query.Where("username LIKE ? OR email LIKE ? OR id = ?", "%"+search+"%", "%"+search+"%", search)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}

	query.Count(&total)

	offset := 0
	if page != "1" {
		offset = (atoi(page) - 1) * atoi(pageSize)
	}

	query.Order("created_at DESC").
		Limit(atoi(pageSize)).
		Offset(offset).
		Find(&users)

	// 获取每个用户的积分余额
	var userIDs []string
	for _, user := range users {
		userIDs = append(userIDs, user.ID)
	}

	var balances []model.UserCreditBalance
	db.Where("user_id IN ?", userIDs).Find(&balances)

	balanceMap := make(map[string]int)
	for _, b := range balances {
		balanceMap[b.UserID] = b.Available
	}

	// 构造返回数据
	var result []gin.H
	for _, user := range users {
		result = append(result, gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"displayName": user.DisplayName,
			"avatarUrl":   user.AvatarURL,
			"role":        user.Role,
			"status":      user.Status,
			"credits":     balanceMap[user.ID],
			"affCode":     user.AffCode,
			"affCount":    user.AffCount,
			"createdAt":   user.CreatedAt,
			"lastLoginAt": user.LastLoginAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users":    result,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// AdminGetUserDetail 管理后台：获取用户详情
func AdminGetUserDetail(c *gin.Context) {
	userID := c.Param("id")

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
	db.Where("user_id = ?", userID).
		Order("expire_at DESC").
		First(&membership)

	// 获取任务统计
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

	// 获取支付统计
	var paymentStats struct {
		TotalOrders  int64 `json:"totalOrders"`
		TotalAmount  int64 `json:"totalAmount"`
		TotalCredits int64 `json:"totalCredits"`
	}
	db.Model(&model.PaymentOrder{}).Where("user_id = ? AND status = ?", userID, model.PaymentStatusSucceeded).Count(&paymentStats.TotalOrders)
	db.Model(&model.PaymentOrder{}).Where("user_id = ? AND status = ?", userID, model.PaymentStatusSucceeded).
		Select("COALESCE(SUM(amount), 0) as total_amount, COALESCE(SUM(credits), 0) as total_credits").
		Scan(&paymentStats)

	// 获取推荐统计
	var referralCount int64
	db.Model(&model.UserReferral{}).Where("inviter_user_id = ?", userID).Count(&referralCount)

	c.JSON(http.StatusOK, gin.H{
		"user": user,
		"credits": gin.H{
			"available": creditBalance.Available,
			"plan":      creditBalance.Plan,
		},
		"membership":   membership,
		"taskStats":    taskStats,
		"paymentStats": paymentStats,
		"referral": gin.H{
			"count": referralCount,
		},
	})
}

// AdminUpdateUserStatus 管理后台：更新用户状态（启用/禁用）
func AdminUpdateUserStatus(c *gin.Context) {
	userID := c.Param("id")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var req struct {
		Status model.UserStatus `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	if err := db.Model(&model.User{}).Where("id = ?", userID).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update user status",
		})
		return
	}

	// 记录审计日志
	adminUserID := c.GetString("user_id")
	service.CreateAuditLog(adminUserID, "update_user_status", "user", userID, gin.H{
		"status": req.Status,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "User status updated successfully",
	})
}

// AdminAdjustUserCreditsV2 管理后台：调整用户积分
func AdminAdjustUserCreditsV2(c *gin.Context) {
	userID := c.Param("id")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var req struct {
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// 获取当前余额
	var balance model.UserCreditBalance
	if err := db.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		// 如果不存在，创建初始余额
		balance = model.UserCreditBalance{
			UserID:    userID,
			Available: 0,
			Plan:      "Free",
		}
		db.Create(&balance)
	}

	// 更新余额
	newBalance := balance.Available + req.Amount
	if newBalance < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Insufficient credits",
		})
		return
	}

	db.Model(&model.UserCreditBalance{}).Where("user_id = ?", userID).Update("available", newBalance)

	// 创建交易记录
	transaction := model.CreditTransaction{
		ID:              service.GenerateID(),
		UserID:          userID,
		Amount:          req.Amount,
		BalanceAfter:    newBalance,
		TransactionType: "adjustment",
		Reason:          req.Reason,
	}
	db.Create(&transaction)

	// 记录审计日志
	adminUserID := c.GetString("user_id")
	service.CreateAuditLog(adminUserID, "adjust_user_credits", "user", userID, gin.H{
		"amount": req.Amount,
		"reason": req.Reason,
		"before": balance.Available,
		"after":  newBalance,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Credits adjusted successfully",
		"balance": newBalance,
	})
}

// AdminGetAllTasks 管理后台：获取所有任务列表
func AdminGetAllTasks(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")
	status := c.Query("status")
	taskType := c.Query("type")
	userID := c.Query("userId")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var tasks []model.GenerationTask
	var total int64

	query := db.Model(&model.GenerationTask{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if taskType != "" {
		query = query.Where("task_type = ?", taskType)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
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

// AdminGetTaskStats 管理后台：获取任务统计
func AdminGetTaskStats(c *gin.Context) {
	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var stats struct {
		Total      int64 `json:"total"`
		Queued     int64 `json:"queued"`
		Processing int64 `json:"processing"`
		Succeeded  int64 `json:"succeeded"`
		Failed     int64 `json:"failed"`
		Canceled   int64 `json:"canceled"`
	}

	db.Model(&model.GenerationTask{}).Count(&stats.Total)
	db.Model(&model.GenerationTask{}).Where("status = ?", model.TaskStatusQueued).Count(&stats.Queued)
	db.Model(&model.GenerationTask{}).Where("status = ?", model.TaskStatusProcessing).Count(&stats.Processing)
	db.Model(&model.GenerationTask{}).Where("status = ?", model.TaskStatusSucceeded).Count(&stats.Succeeded)
	db.Model(&model.GenerationTask{}).Where("status = ?", model.TaskStatusFailed).Count(&stats.Failed)
	db.Model(&model.GenerationTask{}).Where("status = ?", model.TaskStatusCanceled).Count(&stats.Canceled)

	c.JSON(http.StatusOK, stats)
}

// AdminGetPaymentOrders 管理后台：获取支付订单列表
func AdminGetPaymentOrders(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")
	status := c.Query("status")
	userID := c.Query("userId")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var orders []model.PaymentOrder
	var total int64

	query := db.Model(&model.PaymentOrder{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	query.Count(&total)

	offset := 0
	if page != "1" {
		offset = (atoi(page) - 1) * atoi(pageSize)
	}

	query.Order("created_at DESC").
		Limit(atoi(pageSize)).
		Offset(offset).
		Find(&orders)

	c.JSON(http.StatusOK, gin.H{
		"orders":   orders,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// AdminGetPaymentStats 管理后台：获取支付统计
func AdminGetPaymentStats(c *gin.Context) {
	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var stats struct {
		TotalOrders    int64 `json:"totalOrders"`
		SucceededOrders int64 `json:"succeededOrders"`
		TotalAmount    int64 `json:"totalAmount"`
		TotalCredits   int64 `json:"totalCredits"`
	}

	db.Model(&model.PaymentOrder{}).Count(&stats.TotalOrders)
	db.Model(&model.PaymentOrder{}).Where("status = ?", model.PaymentStatusSucceeded).Count(&stats.SucceededOrders)
	db.Model(&model.PaymentOrder{}).Where("status = ?", model.PaymentStatusSucceeded).
		Select("COALESCE(SUM(amount), 0) as total_amount, COALESCE(SUM(credits), 0) as total_credits").
		Scan(&stats)

	c.JSON(http.StatusOK, stats)
}
