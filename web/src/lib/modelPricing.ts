import type { ImagePricingTier, ModelPricingConfig, VideoPricingConfig } from './types';

export type ImagePricingQualityKey = 'standard' | 'hd';
export type ImagePricingResolutionKey = '1024x1024' | '1024x1792' | '1792x1024';

export const IMAGE_PRICING_QUALITY_KEYS: readonly ImagePricingQualityKey[] = ['standard', 'hd'];
export const IMAGE_PRICING_RESOLUTION_KEYS: readonly ImagePricingResolutionKey[] = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
];

export function defaultImagePricingConfig(): ModelPricingConfig {
  return {
    type: 'image',
    credits_per_image: 10,
    tiers: [],
  };
}

export function defaultVideoPricingConfig(): VideoPricingConfig {
  return {
    type: 'video',
    credits_per_second: 10,
  };
}

export function normalizeModelPricingConfig(config: ModelPricingConfig): ModelPricingConfig {
  if (!config) return defaultImagePricingConfig();

  if (config.type === 'video') {
    return {
      type: 'video',
      credits_per_second: config.credits_per_second || 10,
    } as VideoPricingConfig;
  }

  return {
    type: 'image',
    credits_per_image: config.credits_per_image || 10,
    tiers: config.tiers || [],
  };
}
