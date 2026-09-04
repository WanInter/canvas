package model

import (
	"time"
)

// GenerationProviderMode 生成服务商模式
type GenerationProviderMode string

const (
	ProviderModeReal GenerationProviderMode = "real"
	ProviderModeMock GenerationProviderMode = "mock"
)

// GenerationProviderSetting 生成服务商配置
type GenerationProviderSetting struct {
	Provider         string                 `json:"provider" gorm:"primaryKey"`
	Enabled          bool                   `json:"enabled"`
	Mode             GenerationProviderMode `json:"mode"`
	BaseURL          string                 `json:"baseUrl" gorm:"column:base_url"`
	APIKeyCiphertext string                 `json:"apiKeyCiphertext" gorm:"column:api_key_ciphertext"`
	UpdatedAt        time.Time              `json:"updatedAt"`
	Adapter          string                 `json:"adapter"`
	BuiltinKey       *string                `json:"builtinKey,omitempty" gorm:"column:builtin_key"`
	IsDeleted        bool                   `json:"isDeleted" gorm:"column:is_deleted"`
}

func (GenerationProviderSetting) TableName() string {
	return "generation_provider_settings"
}

// GenerationModelRoutingRule 模型路由规则
type GenerationModelRoutingRule struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Model     string    `json:"model" gorm:"index:idx_model_priority"`
	Priority  int       `json:"priority" gorm:"index:idx_model_priority"`
	Provider  string    `json:"provider"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (GenerationModelRoutingRule) TableName() string {
	return "generation_model_routing_rules"
}
