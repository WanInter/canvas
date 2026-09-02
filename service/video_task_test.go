package service

import (
	"testing"
	"time"

	"github.com/tigerowo/infinite-canvas/model"
)

func TestNormalizeVideoTaskStatus(t *testing.T) {
	tests := map[string]string{
		"SUCCESS":    "completed",
		"unknown":    "processing",
		"new_status": "processing",
		"failed":     "failed",
	}
	for input, want := range tests {
		if got := NormalizeVideoTaskStatus(input); got != want {
			t.Errorf("NormalizeVideoTaskStatus(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestVideoTaskTimedOut(t *testing.T) {
	now := time.Now()
	if !videoTaskTimedOut(model.VideoTask{CreatedAt: now.Add(-videoTaskTimeout).Format(time.RFC3339)}, now) {
		t.Fatal("expected task at timeout boundary to expire")
	}
	if videoTaskTimedOut(model.VideoTask{CreatedAt: now.Add(-videoTaskTimeout + time.Second).Format(time.RFC3339)}, now) {
		t.Fatal("expected recent task to remain active")
	}
}
