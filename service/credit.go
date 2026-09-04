package service

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/tigerowo/infinite-canvas/model"
	"github.com/tigerowo/infinite-canvas/repository"
)

// GenerateID 生成唯一 ID
func GenerateID() string {
	return uuid.New().String()
}

// CreateAuditLog 创建审计日志
func CreateAuditLog(actorUserID, action, resourceType, resourceID string, details interface{}) error {
	db, err := repository.DB()
	if err != nil {
		return err
	}

	detailsJSON, _ := json.Marshal(details)

	log := model.AdminAuditLog{
		ID:           GenerateID(),
		ActorUserID:  &actorUserID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   &resourceID,
		Details:      string(detailsJSON),
		CreatedAt:    time.Now(),
	}

	return db.Create(&log).Error
}

// GetUserCreditBalance 获取用户积分余额
func GetUserCreditBalance(userID string) (int, error) {
	db, err := repository.DB()
	if err != nil {
		return 0, err
	}

	var balance model.UserCreditBalance
	if err := db.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		return 0, err
	}
	return balance.Available, nil
}

// AdjustUserCreditsV2 调整用户积分（新版本，使用独立的积分余额表）
func AdjustUserCreditsV2(userID string, amount int, transactionType, reason string, taskID, orderID *string) error {
	db, err := repository.DB()
	if err != nil {
		return err
	}

	// 获取当前余额
	var balance model.UserCreditBalance
	if err := db.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		// 如果不存在，创建初始余额
		balance = model.UserCreditBalance{
			UserID:    userID,
			Available: 0,
			Plan:      "Free",
			UpdatedAt: time.Now(),
		}
		if err := db.Create(&balance).Error; err != nil {
			return err
		}
	}

	// 计算新余额
	newBalance := balance.Available + amount
	if newBalance < 0 {
		return safeMessageError{message: "Insufficient credits"}
	}

	// 更新余额
	if err := db.Model(&model.UserCreditBalance{}).Where("user_id = ?", userID).Update("available", newBalance).Error; err != nil {
		return err
	}

	// 创建交易记录
	transaction := model.CreditTransaction{
		ID:              GenerateID(),
		UserID:          userID,
		Amount:          amount,
		BalanceAfter:    newBalance,
		TransactionType: transactionType,
		Reason:          reason,
		TaskID:          taskID,
		OrderID:         orderID,
		CreatedAt:       time.Now(),
	}

	return db.Create(&transaction).Error
}
