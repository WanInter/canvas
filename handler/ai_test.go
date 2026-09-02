package handler

import (
	"testing"

	"github.com/tigerowo/infinite-canvas/model"
)

func TestResolveAIProxyPathUsesExplicitWaninterProtocol(t *testing.T) {
	channel := model.ModelChannel{Protocol: "waninter", BaseURL: "https://api.waninter.com"}
	if got := resolveAIProxyPath(channel, "Dream-seedance-2-0", "/videos"); got != "/videos" {
		t.Fatalf("resolveAIProxyPath() = %q, want /videos", got)
	}
}

func TestResolveAIProxyPathUsesArkBaseURL(t *testing.T) {
	channel := model.ModelChannel{Protocol: "openai", BaseURL: "https://ark.cn-beijing.volces.com/api/plan/v3"}
	if got := resolveAIProxyPath(channel, "doubao-seedance-2.0", "/videos"); got != "/contents/generations/tasks" {
		t.Fatalf("resolveAIProxyPath() = %q, want /contents/generations/tasks", got)
	}
}

func TestResolveAIProxyPathDoesNotGuessArkFromModelName(t *testing.T) {
	channel := model.ModelChannel{Protocol: "openai", BaseURL: "https://example.com"}
	if got := resolveAIProxyPath(channel, "custom-seedance-model", "/videos"); got != "/videos" {
		t.Fatalf("resolveAIProxyPath() = %q, want /videos", got)
	}
}
