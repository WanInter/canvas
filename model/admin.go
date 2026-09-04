package model

import (
	"time"
)

// AssetFolder 资源文件夹
type AssetFolder struct {
	ID        string     `json:"id" gorm:"primaryKey"`
	UserID    string     `json:"userId" gorm:"column:user_id;index"`
	Name      string     `json:"name"`
	ParentID  *string    `json:"parentId,omitempty" gorm:"column:parent_id;index"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

func (AssetFolder) TableName() string {
	return "asset_folders"
}

// AdminAuditLog 管理员审计日志
type AdminAuditLog struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	ActorUserID  *string   `json:"actorUserId,omitempty" gorm:"column:actor_user_id;index:idx_actor_created"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resourceType" gorm:"column:resource_type;index:idx_resource"`
	ResourceID   *string   `json:"resourceId,omitempty" gorm:"column:resource_id;index:idx_resource"`
	Details      string    `json:"details" gorm:"type:jsonb"` // JSON object
	CreatedAt    time.Time `json:"createdAt" gorm:"index:idx_actor_created"`
}

func (AdminAuditLog) TableName() string {
	return "admin_audit_logs"
}

// Announcement 公告
type Announcement struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	IsActive  bool      `json:"isActive" gorm:"column:is_active;index:idx_active_created"`
	CreatedAt time.Time `json:"createdAt" gorm:"index:idx_active_created"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (Announcement) TableName() string {
	return "announcements"
}

// RedeemCodeBatch 兑换码批次
type RedeemCodeBatch struct {
	ID         string     `json:"id" gorm:"primaryKey"`
	Name       string     `json:"name"`
	Credits    int        `json:"credits"`
	TotalCount int        `json:"totalCount" gorm:"column:total_count"`
	UsedCount  int        `json:"usedCount" gorm:"column:used_count"`
	ExpireAt   *time.Time `json:"expireAt,omitempty" gorm:"column:expire_at"`
	CreatedBy  *string    `json:"createdBy,omitempty" gorm:"column:created_by"`
	CreatedAt  time.Time  `json:"createdAt"`
}

func (RedeemCodeBatch) TableName() string {
	return "redeem_code_batches"
}

// RedeemCode 兑换码
type RedeemCode struct {
	ID        string     `json:"id" gorm:"primaryKey"`
	Code      string     `json:"code" gorm:"uniqueIndex"`
	BatchID   *string    `json:"batchId,omitempty" gorm:"column:batch_id;index"`
	Credits   int        `json:"credits"`
	UsedBy    *string    `json:"usedBy,omitempty" gorm:"column:used_by;index"`
	UsedAt    *time.Time `json:"usedAt,omitempty" gorm:"column:used_at"`
	ExpireAt  *time.Time `json:"expireAt,omitempty" gorm:"column:expire_at"`
	CreatedAt time.Time  `json:"createdAt"`
}

func (RedeemCode) TableName() string {
	return "redeem_codes"
}

// RedeemCodeUsage 兑换码使用记录
type RedeemCodeUsage struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"userId" gorm:"column:user_id;index:idx_user_created"`
	CodeID    string    `json:"codeId" gorm:"column:code_id"`
	Credits   int       `json:"credits"`
	CreatedAt time.Time `json:"createdAt" gorm:"index:idx_user_created"`
}

func (RedeemCodeUsage) TableName() string {
	return "redeem_code_usages"
}

// UserReferral 用户推荐关系
type UserReferral struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	InviterUserID  string    `json:"inviterUserId" gorm:"column:inviter_user_id;index:idx_inviter_created"`
	InviteeUserID  string    `json:"inviteeUserId" gorm:"column:invitee_user_id;index"`
	RewardCredits  int       `json:"rewardCredits" gorm:"column:reward_credits"`
	CreatedAt      time.Time `json:"createdAt" gorm:"index:idx_inviter_created"`
}

func (UserReferral) TableName() string {
	return "user_referrals"
}

// StorageProviderSetting 存储提供商配置
type StorageProviderSetting struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Type      string    `json:"type"`
	Enabled   bool      `json:"enabled"`
	Config    string    `json:"config" gorm:"type:jsonb"` // JSON object
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (StorageProviderSetting) TableName() string {
	return "storage_provider_settings"
}

// EmailVerificationCode 邮箱验证码
type EmailVerificationCode struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Email     string    `json:"email" gorm:"index:idx_email_created"`
	Code      string    `json:"code"`
	ExpireAt  time.Time `json:"expireAt" gorm:"column:expire_at"`
	CreatedAt time.Time `json:"createdAt" gorm:"index:idx_email_created"`
}

func (EmailVerificationCode) TableName() string {
	return "email_verification_codes"
}

// EmailVerificationToken 邮箱验证令牌
type EmailVerificationToken struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"userId" gorm:"column:user_id;index"`
	Token     string    `json:"token" gorm:"uniqueIndex"`
	ExpireAt  time.Time `json:"expireAt" gorm:"column:expire_at"`
	CreatedAt time.Time `json:"createdAt"`
}

func (EmailVerificationToken) TableName() string {
	return "email_verification_tokens"
}

// PasswordResetToken 密码重置令牌
type PasswordResetToken struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"userId" gorm:"column:user_id;index"`
	Token     string    `json:"token" gorm:"uniqueIndex"`
	ExpireAt  time.Time `json:"expireAt" gorm:"column:expire_at"`
	CreatedAt time.Time `json:"createdAt"`
}

func (PasswordResetToken) TableName() string {
	return "password_reset_tokens"
}

// PurchaseModeLabel 购买模式标签
type PurchaseModeLabel struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Mode      string    `json:"mode" gorm:"uniqueIndex"`
	Label     string    `json:"label"`
	CreatedAt time.Time `json:"createdAt"`
}

func (PurchaseModeLabel) TableName() string {
	return "purchase_mode_labels"
}
