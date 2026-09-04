package model

import (
	"time"
)

// PaymentStatus 支付状态
type PaymentStatus string

const (
	PaymentStatusPending  PaymentStatus = "pending"
	PaymentStatusSucceeded PaymentStatus = "succeeded"
	PaymentStatusFailed   PaymentStatus = "failed"
	PaymentStatusCanceled PaymentStatus = "canceled"
)

// PaymentOrder 支付订单
type PaymentOrder struct {
	ID              string        `json:"id" gorm:"primaryKey"`
	UserID          string        `json:"userId" gorm:"column:user_id;index:idx_user_created"`
	Amount          int           `json:"amount"`
	Credits         int           `json:"credits"`
	Status          PaymentStatus `json:"status" gorm:"index"`
	PaymentMethod   string        `json:"paymentMethod" gorm:"column:payment_method"`
	ProviderOrderID *string       `json:"providerOrderId,omitempty" gorm:"column:provider_order_id;index"`
	ProviderTraceID *string       `json:"providerTraceId,omitempty" gorm:"column:provider_trace_id"`
	CreatedAt       time.Time     `json:"createdAt" gorm:"index:idx_user_created"`
	PaidAt          *time.Time    `json:"paidAt,omitempty" gorm:"column:paid_at"`
	Extra           string        `json:"extra" gorm:"type:jsonb"` // JSON object
}

func (PaymentOrder) TableName() string {
	return "payment_orders"
}

// PaymentChannel 支付渠道配置
type PaymentChannel struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Enabled   bool      `json:"enabled"`
	Config    string    `json:"config" gorm:"type:jsonb"` // JSON object
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (PaymentChannel) TableName() string {
	return "payment_channels"
}

// PaymentWebhookEvent 支付回调事件
type PaymentWebhookEvent struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Provider  string    `json:"provider"`
	EventType string    `json:"eventType" gorm:"column:event_type"`
	OrderID   *string   `json:"orderId,omitempty" gorm:"column:order_id;index"`
	Payload   string    `json:"payload" gorm:"type:jsonb"` // JSON object
	Processed bool      `json:"processed" gorm:"index:idx_processed_created"`
	CreatedAt time.Time `json:"createdAt" gorm:"index:idx_processed_created"`
}

func (PaymentWebhookEvent) TableName() string {
	return "payment_webhook_events"
}

// BillingProduct 计费产品
type BillingProduct struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Credits   int       `json:"credits"`
	Price     int       `json:"price"`
	IsActive  bool      `json:"isActive" gorm:"column:is_active"`
	SortOrder int       `json:"sortOrder" gorm:"column:sort_order"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (BillingProduct) TableName() string {
	return "billing_products"
}
