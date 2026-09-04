import type { ModelPricingConfig, VideoPricingConfig, ImagePricingTier } from './types';

export function estimateCredits(
  pricingConfig: ModelPricingConfig,
  params: Record<string, unknown>
): number {
  if (!pricingConfig) return 0;

  if (pricingConfig.type === 'video') {
    const videoConfig = pricingConfig as VideoPricingConfig;
    const duration = (params.duration as number) || 5;
    return Math.ceil(videoConfig.credits_per_second * duration);
  }

  if (pricingConfig.type === 'image') {
    const resolution = (params.resolution as string) || '1024x1024';
    const quality = (params.quality as string) || 'standard';

    const tier = pricingConfig.tiers?.find(
      (t: ImagePricingTier) => t.resolution === resolution && t.quality === quality
    );

    return tier?.credits_per_image || pricingConfig.credits_per_image || 0;
  }

  return pricingConfig.credits_per_image || 0;
}
