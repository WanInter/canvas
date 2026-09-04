package model

import (
	"time"
)

// MembershipStatus 会员状态
type MembershipStatus string

const (
	MembershipStatusActive   MembershipStatus = "active"
	MembershipStatusExpired  MembershipStatus = "expired"
	MembershipStatusCanceled MembershipStatus = "canceled"
)

// UserMembership 用户会员信息
type UserMembership struct {
	ID        string           `json:"id" gorm:"primaryKey"`
	UserID    string           `json:"userId" gorm:"column:user_id;index"`
	Plan      string           `json:"plan"`
	StartAt   time.Time        `json:"startAt" gorm:"column:start_at"`
	ExpireAt  time.Time        `json:"expireAt" gorm:"column:expire_at;index"`
	Status    MembershipStatus `json:"status"`
	CreatedAt time.Time        `json:"createdAt"`
	UpdatedAt time.Time        `json:"updatedAt"`
}

func (UserMembership) TableName() string {
	return "user_memberships"
}

// MembershipCreditInstallment 会员积分分期
type MembershipCreditInstallment struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	UserID       string    `json:"userId" gorm:"column:user_id;index:idx_user_issued"`
	MembershipID *string   `json:"membershipId,omitempty" gorm:"column:membership_id"`
	Credits      int       `json:"credits"`
	IssuedAt     time.Time `json:"issuedAt" gorm:"column:issued_at;index:idx_user_issued"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (MembershipCreditInstallment) TableName() string {
	return "membership_credit_installments"
}

// UserDailyEntitlement 每日权益
type UserDailyEntitlement struct {
	ID        string     `json:"id" gorm:"primaryKey"`
	UserID    string     `json:"userId" gorm:"column:user_id;uniqueIndex:idx_user_date"`
	Date      string     `json:"date" gorm:"type:date;uniqueIndex:idx_user_date"` // DATE type
	Credits   int        `json:"credits"`
	ClaimedAt *time.Time `json:"claimedAt,omitempty" gorm:"column:claimed_at"`
	CreatedAt time.Time  `json:"createdAt"`
}

func (UserDailyEntitlement) TableName() string {
	return "user_daily_entitlements"
}

// UserRechargePromotion 用户充值促销
type UserRechargePromotion struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	UserID      string    `json:"userId" gorm:"column:user_id;index:idx_user_created"`
	PromotionID string    `json:"promotionId" gorm:"column:promotion_id"`
	UsedAt      time.Time `json:"usedAt" gorm:"column:used_at"`
	Credits     int       `json:"credits"`
	CreatedAt   time.Time `json:"createdAt" gorm:"index:idx_user_created"`
}

func (UserRechargePromotion) TableName() string {
	return "user_recharge_promotions"
}
