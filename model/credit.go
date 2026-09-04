package model

import (
	"time"
)

// UserCreditBalance 用户积分余额表
type UserCreditBalance struct {
	UserID    string    `json:"userId" gorm:"primaryKey;column:user_id"`
	Available int       `json:"available"`
	Plan      string    `json:"plan"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (UserCreditBalance) TableName() string {
	return "user_credit_balances"
}

// CreditTransaction 积分交易记录
type CreditTransaction struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	UserID          string    `json:"userId" gorm:"column:user_id;index"`
	Amount          int       `json:"amount"`
	BalanceAfter    int       `json:"balanceAfter" gorm:"column:balance_after"`
	TransactionType string    `json:"transactionType" gorm:"column:transaction_type"` // recharge, consume, refund, gift, membership
	Reason          string    `json:"reason"`
	TaskID          *string   `json:"taskId,omitempty" gorm:"column:task_id"`
	OrderID         *string   `json:"orderId,omitempty" gorm:"column:order_id"`
	CreatedAt       time.Time `json:"createdAt"`
}

func (CreditTransaction) TableName() string {
	return "credit_logs"
}
