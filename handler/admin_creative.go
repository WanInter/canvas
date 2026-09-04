package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tigerowo/infinite-canvas/model"
	"github.com/tigerowo/infinite-canvas/repository"
)

// AdminOverviewResponse 管理后台概览响应
type AdminOverviewResponse struct {
	GenerationProviders      []AdminGenerationProvider    `json:"generation_providers"`
	StorageProviders         []AdminStorageProvider       `json:"storage_providers"`
	Models                   []model.ModelCatalogConfig   `json:"models"`
	BillingProducts          []model.BillingProduct       `json:"billing_products"`
	EffectiveBillingProducts []model.BillingProduct       `json:"effective_billing_products"`
	PaymentChannels          []model.PaymentChannel       `json:"payment_channels"`
	UserCounts               AdminUserCounts              `json:"user_counts"`
}

type AdminGenerationProvider struct {
	Provider          string `json:"provider"`
	Adapter           string `json:"adapter"`
	Enabled           bool   `json:"enabled"`
	BaseURL           string `json:"base_url"`
	APIKeyConfigured  bool   `json:"api_key_configured"`
	UpdatedAt         string `json:"updated_at,omitempty"`
}

type AdminStorageProvider struct {
	ID                   string `json:"id"`
	Provider             string `json:"provider"`
	EndpointURL          string `json:"endpoint_url"`
	UploadEndpointURL    string `json:"upload_endpoint_url"`
	AccessKeyConfigured  bool   `json:"access_key_configured"`
	SecretKeyConfigured  bool   `json:"secret_key_configured"`
	Bucket               string `json:"bucket"`
	Region               string `json:"region"`
	PathStyle            string `json:"path_style"`
	PublicBaseURL        string `json:"public_base_url"`
	SignedURLTTLSeconds  int    `json:"signed_url_ttl_seconds"`
	GeneratedAssetPrefix string `json:"generated_asset_prefix"`
	IsActive             bool   `json:"is_active"`
	Source               string `json:"source"`
	UpdatedAt            string `json:"updated_at,omitempty"`
}

type AdminUserCounts struct {
	Total    int64 `json:"total"`
	Active   int64 `json:"active"`
	Disabled int64 `json:"disabled"`
}

// AdminGetOverview 获取管理后台概览
func AdminGetOverview(c *gin.Context) {
	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// 获取 Generation Providers
	var providerSettings []model.GenerationProviderSetting
	if err := db.Where("is_deleted = ?", false).Find(&providerSettings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch providers"})
		return
	}

	generationProviders := make([]AdminGenerationProvider, len(providerSettings))
	for i, p := range providerSettings {
		generationProviders[i] = AdminGenerationProvider{
			Provider:         p.Provider,
			Adapter:          p.Adapter,
			Enabled:          p.Enabled,
			BaseURL:          p.BaseURL,
			APIKeyConfigured: p.APIKeyCiphertext != "",
			UpdatedAt:        p.UpdatedAt.Format(time.RFC3339),
		}
	}

	// 获取模型目录
	var models []model.ModelCatalogConfig
	if err := db.Order("display_order ASC, updated_at DESC").Find(&models).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch models"})
		return
	}

	// 获取计费产品
	var billingProducts []model.BillingProduct
	if err := db.Order("sort_order ASC, created_at DESC").Find(&billingProducts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch billing products"})
		return
	}

	// 获取有效的计费产品（is_active = true）
	var effectiveBillingProducts []model.BillingProduct
	if err := db.Where("is_active = ?", true).Order("sort_order ASC, created_at DESC").Find(&effectiveBillingProducts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch effective billing products"})
		return
	}

	// 获取支付渠道
	var paymentChannels []model.PaymentChannel
	if err := db.Order("created_at DESC").Find(&paymentChannels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment channels"})
		return
	}

	// 获取用户统计
	var totalUsers int64
	if err := db.Model(&model.User{}).Count(&totalUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count users"})
		return
	}

	var activeUsers int64
	if err := db.Model(&model.User{}).Where("status = ?", "active").Count(&activeUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count active users"})
		return
	}

	var disabledUsers int64
	if err := db.Model(&model.User{}).Where("status = ?", "disabled").Count(&disabledUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count disabled users"})
		return
	}

	// 构建响应
	response := AdminOverviewResponse{
		GenerationProviders:      generationProviders,
		StorageProviders:         []AdminStorageProvider{}, // TODO: 实现存储提供商
		Models:                   models,
		BillingProducts:          billingProducts,
		EffectiveBillingProducts: effectiveBillingProducts,
		PaymentChannels:          paymentChannels,
		UserCounts: AdminUserCounts{
			Total:    totalUsers,
			Active:   activeUsers,
			Disabled: disabledUsers,
		},
	}

	c.JSON(http.StatusOK, response)
}

// AdminListWorkers 获取 Worker 列表
func AdminListWorkers(c *gin.Context) {
	// TODO: 实现 Worker 管理功能
	c.JSON(http.StatusOK, gin.H{
		"workers": []interface{}{},
		"stats": gin.H{
			"total":           0,
			"online":          0,
			"offline":         0,
			"busy":            0,
			"capacity":        0,
			"active_tasks":    0,
			"succeeded_tasks": 0,
			"failed_tasks":    0,
		},
	})
}

// AdminUpdateWorker 更新 Worker 配置
func AdminUpdateWorker(c *gin.Context) {
	workerID := c.Param("id")

	var input struct {
		Enabled     *bool `json:"enabled"`
		Concurrency *int  `json:"concurrency"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// TODO: 实现 Worker 更新功能
	c.JSON(http.StatusOK, gin.H{
		"id":      workerID,
		"message": "Worker management not implemented yet",
	})
}

// UpdateGenerationProviderInput 更新生成提供商输入
type UpdateGenerationProviderInput struct {
	Enabled bool    `json:"enabled"`
	BaseURL string  `json:"base_url"`
	APIKey  *string `json:"api_key,omitempty"`
}

// AdminUpdateGenerationProvider 更新生成提供商配置
func AdminUpdateGenerationProvider(c *gin.Context) {
	provider := c.Param("provider")

	var input UpdateGenerationProviderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// 查找或创建提供商配置
	var providerSetting model.GenerationProviderSetting
	result := db.Where("provider = ?", provider).First(&providerSetting)

	if result.Error != nil {
		// 创建新的
		providerSetting = model.GenerationProviderSetting{
			Provider:  provider,
			Enabled:   input.Enabled,
			BaseURL:   input.BaseURL,
			UpdatedAt: time.Now(),
		}
		if input.APIKey != nil && *input.APIKey != "" {
			providerSetting.APIKeyCiphertext = *input.APIKey // TODO: 加密
		}

		if err := db.Create(&providerSetting).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create provider"})
			return
		}
	} else {
		// 更新现有的
		providerSetting.Enabled = input.Enabled
		providerSetting.BaseURL = input.BaseURL
		providerSetting.UpdatedAt = time.Now()

		if input.APIKey != nil && *input.APIKey != "" {
			providerSetting.APIKeyCiphertext = *input.APIKey // TODO: 加密
		}

		if err := db.Save(&providerSetting).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update provider"})
			return
		}
	}

	c.JSON(http.StatusOK, AdminGenerationProvider{
		Provider:         providerSetting.Provider,
		Adapter:          providerSetting.Adapter,
		Enabled:          providerSetting.Enabled,
		BaseURL:          providerSetting.BaseURL,
		APIKeyConfigured: providerSetting.APIKeyCiphertext != "",
		UpdatedAt:        providerSetting.UpdatedAt.Format(time.RFC3339),
	})
}

// AdminTestGenerationProvider 测试生成提供商连接
func AdminTestGenerationProvider(c *gin.Context) {
	provider := c.Param("provider")

	// TODO: 实现实际的测试逻辑
	c.JSON(http.StatusOK, gin.H{
		"ok":      true,
		"message": "Provider " + provider + " test not implemented yet",
	})
}

// AdminDeleteGenerationProvider 删除生成提供商
func AdminDeleteGenerationProvider(c *gin.Context) {
	provider := c.Param("provider")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// 软删除
	if err := db.Model(&model.GenerationProviderSetting{}).
		Where("provider = ?", provider).
		Update("is_deleted", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete provider"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": provider})
}

// UpdateBillingProductInput 更新计费产品输入
type UpdateBillingProductInput struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Credits   int    `json:"credits"`
	Price     int    `json:"price"`
	IsActive  bool   `json:"is_active"`
	SortOrder int    `json:"sort_order"`
}

// AdminUpdateBillingProduct 更新计费产品
func AdminUpdateBillingProduct(c *gin.Context) {
	var input UpdateBillingProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// 查找或创建产品
	var product model.BillingProduct
	result := db.Where("id = ?", input.ID).First(&product)

	now := time.Now()
	if result.Error != nil {
		// 创建新的
		product = model.BillingProduct{
			ID:        input.ID,
			Name:      input.Name,
			Credits:   input.Credits,
			Price:     input.Price,
			IsActive:  input.IsActive,
			SortOrder: input.SortOrder,
			CreatedAt: now,
			UpdatedAt: now,
		}

		if err := db.Create(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
			return
		}
	} else {
		// 更新现有的
		product.Name = input.Name
		product.Credits = input.Credits
		product.Price = input.Price
		product.IsActive = input.IsActive
		product.SortOrder = input.SortOrder
		product.UpdatedAt = now

		if err := db.Save(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
			return
		}
	}

	c.JSON(http.StatusOK, product)
}

// AdminDeleteBillingProduct 删除计费产品
func AdminDeleteBillingProduct(c *gin.Context) {
	productID := c.Param("id")

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	if err := db.Where("id = ?", productID).Delete(&model.BillingProduct{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": productID})
}

// AdminSyncOrderStatus 同步订单状态
func AdminSyncOrderStatus(c *gin.Context) {
	orderID := c.Param("id")

	// TODO: 实现订单状态同步逻辑
	c.JSON(http.StatusOK, gin.H{
		"id":      orderID,
		"message": "Order sync not implemented yet",
	})
}

// AdminManualCompleteOrder 手动完成订单
func AdminManualCompleteOrder(c *gin.Context) {
	orderID := c.Param("id")

	var input struct {
		ProviderPaymentID *string `json:"provider_payment_id"`
		Reason            *string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// 查找订单
	var order model.PaymentOrder
	if err := db.Where("id = ?", orderID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 更新订单状态
	now := time.Now()
	order.Status = model.PaymentStatusSucceeded
	order.PaidAt = &now

	if err := db.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	// TODO: 增加用户积分

	c.JSON(http.StatusOK, gin.H{
		"id":      orderID,
		"message": "Order completed manually",
	})
}

// AdminUpdateAdminUser 更新管理员用户
func AdminUpdateAdminUser(c *gin.Context) {
	var input struct {
		ID     string  `json:"id"`
		Name   *string `json:"name"`
		Email  *string `json:"email"`
		Status *string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, err := repository.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// 查找用户
	var user model.User
	if err := db.Where("id = ?", input.ID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 更新字段
	if input.Name != nil {
		user.DisplayName = *input.Name
	}
	if input.Email != nil {
		user.Email = *input.Email
	}
	if input.Status != nil {
		user.Status = model.UserStatus(*input.Status)
	}

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// AdminResetUserPassword 重置用户密码
func AdminResetUserPassword(c *gin.Context) {
	var input struct {
		ID       string `json:"id"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// TODO: 实现密码重置逻辑（需要密码哈希）
	c.JSON(http.StatusOK, gin.H{
		"id":      input.ID,
		"message": "Password reset not fully implemented yet",
	})
}

// AdminListInvitedUsers 获取用户邀请列表
func AdminListInvitedUsers(c *gin.Context) {
	userID := c.Query("userID")

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userID is required"})
		return
	}

	// TODO: 实现邀请用户列表查询
	c.JSON(http.StatusOK, gin.H{
		"users":  []interface{}{},
		"cursor": nil,
	})
}
