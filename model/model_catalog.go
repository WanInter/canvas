package model

import (
	"time"
)

// ModelType 模型类型
type ModelType string

const (
	ModelTypeImage ModelType = "image"
	ModelTypeVideo ModelType = "video"
)

// ModelCatalogConfig 模型目录配置
type ModelCatalogConfig struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	Name            string    `json:"name"`
	Provider        string    `json:"provider"`
	ModelType       ModelType `json:"modelType"`
	Description     string    `json:"description"`
	Tags            string    `json:"tags" gorm:"type:jsonb"` // JSON array
	Capabilities    string    `json:"capabilities" gorm:"type:jsonb"` // JSON array
	ParamsSchema    string    `json:"paramsSchema" gorm:"type:jsonb;column:params_schema"` // JSON array - 核心字段
	IsEnabled       bool      `json:"isEnabled" gorm:"column:is_enabled"`
	UpdatedAt       time.Time `json:"updatedAt"`
	UpstreamModelID string    `json:"upstreamModelId" gorm:"column:upstream_model_id"`
	PricingConfig   string    `json:"pricingConfig" gorm:"type:jsonb;column:pricing_config"` // JSON object
	DisplayOrder    int       `json:"displayOrder" gorm:"column:display_order"`
	InputLimits     string    `json:"inputLimits" gorm:"type:jsonb;column:input_limits"` // JSON object
}

func (ModelCatalogConfig) TableName() string {
	return "model_catalog_configs"
}
