import type { CreativeModel, GenerationTaskType, ImagePricingTier, ModelInputLimits, ModelParamSchema, ModelPricingConfig, VideoPricingConfig } from '@/lib/types';
import { apiRequest } from './client';

type PricingTierDto = Readonly<{
  low: number;
  medium: number;
  high: number;
}>;

type ImagePricingConfigDto = Readonly<{
  tier_1k?: PricingTierDto;
  tier_2k?: PricingTierDto;
  tier_4k?: PricingTierDto;
}>;

type ModelPricingConfigDto = Readonly<{
  image?: ImagePricingConfigDto;
  video?: VideoPricingConfigDto;
}>;

type VideoPricingConfigDto = Readonly<{
  mode?: 'duration' | 'fixed';
  credits?: number;
  credits_per_second?: number;
  min_seconds?: number;
  duration_param?: string;
  count_param?: string;
  resolution_param?: string;
  resolution_multipliers?: Readonly<Record<string, number>>;
}>;

type ModelDto = Readonly<{
  id: string;
  name: string;
  type: GenerationTaskType;
  description: string;
  tags: readonly string[];
  capabilities?: readonly string[];
  params_schema?: readonly ModelParamSchema[];
  pricing_config?: ModelPricingConfigDto;
  input_limits?: ModelInputLimitsDto;
}>;

type ModelInputLimitsDto = Readonly<{
  reference_images?: number;
  reference_videos?: number;
  reference_audios?: number;
}>;

export async function listModels(): Promise<readonly CreativeModel[]> {
  const models = await apiRequest<readonly ModelDto[]>('/v1/models');
  return models.map((model) => ({
    ...model,
    capabilities: model.capabilities ?? [],
    paramsSchema: model.params_schema ?? [],
    pricingConfig: fromPricingConfigDto(model.pricing_config),
    inputLimits: fromInputLimitsDto(model.input_limits),
    isNew: true,
  }));
}

function fromInputLimitsDto(limits?: ModelInputLimitsDto): ModelInputLimits {
  return {
    referenceImages: limits?.reference_images ?? 0,
    referenceVideos: limits?.reference_videos ?? 0,
    referenceAudios: limits?.reference_audios ?? 0,
  };
}

function fromPricingConfigDto(config?: ModelPricingConfigDto): ModelPricingConfig {
  return {
    ...(config?.image ? { image: {
      tier1k: fromPricingTierDto(config.image.tier_1k),
      tier2k: fromPricingTierDto(config.image.tier_2k),
      tier4k: fromPricingTierDto(config.image.tier_4k),
    } } : {}),
    ...(config?.video ? { video: fromVideoPricingConfigDto(config.video) } : {}),
  };
}

function fromVideoPricingConfigDto(config: VideoPricingConfigDto): VideoPricingConfig {
  return {
    mode: config.mode === 'fixed' ? 'fixed' : 'duration',
    credits: config.credits,
    creditsPerSecond: config.credits_per_second,
    minSeconds: config.min_seconds,
    durationParam: config.duration_param,
    countParam: config.count_param,
    resolutionParam: config.resolution_param,
    resolutionMultipliers: config.resolution_multipliers,
  };
}

function fromPricingTierDto(tier?: PricingTierDto): ImagePricingTier {
  return {
    low: tier?.low ?? 0,
    medium: tier?.medium ?? 0,
    high: tier?.high ?? 0,
  };
}
