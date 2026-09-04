package model

import (
	"time"
)

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskStatusQueued     TaskStatus = "queued"
	TaskStatusProcessing TaskStatus = "processing"
	TaskStatusSucceeded  TaskStatus = "succeeded"
	TaskStatusFailed     TaskStatus = "failed"
	TaskStatusCanceled   TaskStatus = "canceled"
)

// GenerationTaskType 生成任务类型
type GenerationTaskType string

const (
	GenerationTaskTypeImage GenerationTaskType = "image"
	GenerationTaskTypeVideo GenerationTaskType = "video"
)

// GenerationTaskBatch 生成任务批次
type GenerationTaskBatch struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	UserID      string     `json:"userId" gorm:"column:user_id;index:idx_user_created"`
	TotalCount  int        `json:"totalCount" gorm:"column:total_count"`
	Status      TaskStatus `json:"status"`
	CreatedAt   time.Time  `json:"createdAt" gorm:"index:idx_user_created"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

func (GenerationTaskBatch) TableName() string {
	return "generation_task_batches"
}

// GenerationTask 生成任务
type GenerationTask struct {
	ID                     string             `json:"id" gorm:"primaryKey"`
	UserID                 string             `json:"userId" gorm:"column:user_id;index:idx_user_created"`
	Provider               string             `json:"provider"`
	Model                  string             `json:"model"`
	TaskType               GenerationTaskType `json:"taskType" gorm:"column:task_type"`
	Status                 TaskStatus         `json:"status" gorm:"index:idx_status"`
	Prompt                 string             `json:"prompt"`
	NegativePrompt         *string            `json:"negativePrompt,omitempty" gorm:"column:negative_prompt"`
	ParamsJSON             string             `json:"paramsJson" gorm:"type:jsonb;column:params_json"`
	CreditsUsed            int                `json:"creditsUsed" gorm:"column:credits_used"`
	ResultURLs             string             `json:"resultUrls" gorm:"type:jsonb;column:result_urls"` // JSON array
	ErrorMessage           *string            `json:"errorMessage,omitempty" gorm:"column:error_message"`
	CreatedAt              time.Time          `json:"createdAt" gorm:"index:idx_user_created"`
	CompletedAt            *time.Time         `json:"completedAt,omitempty"`
	ProviderModel          string             `json:"providerModel" gorm:"column:provider_model"`
	ModelName              string             `json:"modelName" gorm:"column:model_name"`
	BatchID                *string            `json:"batchId,omitempty" gorm:"column:batch_id;index:idx_batch_index"`
	BatchIndex             *int               `json:"batchIndex,omitempty" gorm:"column:batch_index;index:idx_batch_index"`
	WorkerID               *string            `json:"workerId,omitempty" gorm:"column:worker_id"`
	LockedUntil            *time.Time         `json:"lockedUntil,omitempty" gorm:"column:locked_until"`
	AttemptCount           int                `json:"attemptCount" gorm:"column:attempt_count"`
	LastWorkerHeartbeatAt  *time.Time         `json:"lastWorkerHeartbeatAt,omitempty" gorm:"column:last_worker_heartbeat_at"`
	ErrorCategory          string             `json:"errorCategory" gorm:"column:error_category"`
	ErrorCode              string             `json:"errorCode" gorm:"column:error_code"`
	Retryable              bool               `json:"retryable"`
	ProviderTraceID        string             `json:"providerTraceId" gorm:"column:provider_trace_id"`
	LeaseToken             *string            `json:"leaseToken,omitempty" gorm:"column:lease_token"`
	NextAttemptAt          *time.Time         `json:"nextAttemptAt,omitempty" gorm:"column:next_attempt_at"`
	ProcessingStartedAt    *time.Time         `json:"processingStartedAt,omitempty" gorm:"column:processing_started_at"`
	StatusUpdatedAt        time.Time          `json:"statusUpdatedAt" gorm:"column:status_updated_at"`
	LastProgressAt         *time.Time         `json:"lastProgressAt,omitempty" gorm:"column:last_progress_at"`
	StatusSyncCheckedAt    *time.Time         `json:"statusSyncCheckedAt,omitempty" gorm:"column:status_sync_checked_at"`
	IdempotencyKey         *string            `json:"idempotencyKey,omitempty" gorm:"column:idempotency_key;index:idx_user_idempotency"`
}

func (GenerationTask) TableName() string {
	return "generation_tasks"
}

// GenerationWorker Worker 管理
type GenerationWorker struct {
	ID               string    `json:"id" gorm:"primaryKey"`
	Name             string    `json:"name"`
	Status           string    `json:"status"` // online, offline, busy
	LastHeartbeatAt  time.Time `json:"lastHeartbeatAt" gorm:"column:last_heartbeat_at"`
	Capabilities     string    `json:"capabilities" gorm:"type:jsonb"` // JSON object
	CreatedAt        time.Time `json:"createdAt"`
}

func (GenerationWorker) TableName() string {
	return "generation_workers"
}
