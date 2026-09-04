package service

import (
	"github.com/tigerowo/infinite-canvas/repository"
	"gorm.io/gorm"
)

// GetDB 获取数据库连接（封装 repository.DB）
func GetDB() (*gorm.DB, error) {
	return repository.DB()
}
