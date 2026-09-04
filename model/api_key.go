package model

import (
	"time"
)

// APIKey API 密钥
type APIKey struct {
	ID         string     `json:"id" gorm:"primaryKey"`
	UserID     string     `json:"userId" gorm:"column:user_id;index"`
	Name       string     `json:"name"`
	KeyHash    string     `json:"keyHash" gorm:"column:key_hash;index"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty" gorm:"column:last_used_at"`
	CreatedAt  time.Time  `json:"createdAt"`
	DisabledAt *time.Time `json:"disabledAt,omitempty" gorm:"column:disabled_at"`
}

func (APIKey) TableName() string {
	return "api_keys"
}

// APIKeyUsageEvent API 使用记录
type APIKeyUsageEvent struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	APIKeyID    string    `json:"apiKeyId" gorm:"column:api_key_id;index:idx_api_key_created"`
	UserID      string    `json:"userId" gorm:"column:user_id;index:idx_user_created"`
	Endpoint    string    `json:"endpoint"`
	CreditsUsed int       `json:"creditsUsed" gorm:"column:credits_used"`
	CreatedAt   time.Time `json:"createdAt" gorm:"index:idx_user_created;index:idx_api_key_created"`
}

func (APIKeyUsageEvent) TableName() string {
	return "api_key_usage_events"
}
