package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tigerowo/infinite-canvas/model"
	"github.com/tigerowo/infinite-canvas/service"
)

// GetModelCatalog 获取模型目录配置（包含 params_schema）
func GetModelCatalog(c *gin.Context) {
	modelType := c.Query("type") // image, video, or empty for all

	db, err := service.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var models []model.ModelCatalogConfig
	query := db.Where("is_enabled = ?", true)

	if modelType != "" {
		query = query.Where("model_type = ?", modelType)
	}

	if err := query.Order("display_order ASC, provider ASC, name ASC").Find(&models).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch model catalog",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"models": models,
	})
}

// GetModelCatalogByID 获取单个模型配置
func GetModelCatalogByID(c *gin.Context) {
	id := c.Param("id")

	db, err := service.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var modelConfig model.ModelCatalogConfig
	if err := db.Where("id = ?", id).First(&modelConfig).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Model not found",
		})
		return
	}

	c.JSON(http.StatusOK, modelConfig)
}

// AdminListModelCatalog 管理后台：获取所有模型（包括禁用的）
func AdminListModelCatalog(c *gin.Context) {
	db, err := service.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var models []model.ModelCatalogConfig

	if err := db.Order("display_order ASC, provider ASC, name ASC").Find(&models).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch models",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"models": models,
	})
}

// AdminUpdateModelCatalog 管理后台：更新模型配置
func AdminUpdateModelCatalog(c *gin.Context) {
	id := c.Param("id")

	db, err := service.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var req model.ModelCatalogConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	if err := db.Model(&model.ModelCatalogConfig{}).Where("id = ?", id).Updates(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update model",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Model updated successfully",
	})
}

// AdminCreateModelCatalog 管理后台：创建模型配置
func AdminCreateModelCatalog(c *gin.Context) {
	db, err := service.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var req model.ModelCatalogConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	if err := db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create model",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Model created successfully",
		"model":   req,
	})
}

// AdminDeleteModelCatalog 管理后台：删除模型配置
func AdminDeleteModelCatalog(c *gin.Context) {
	id := c.Param("id")

	db, err := service.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err := db.Where("id = ?", id).Delete(&model.ModelCatalogConfig{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete model",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Model deleted successfully",
	})
}
