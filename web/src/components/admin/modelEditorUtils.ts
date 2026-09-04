import { defaultImagePricingConfig, normalizeModelPricingConfig, type ImagePricingQualityKey, type ImagePricingResolutionKey } from '@/lib/modelPricing';
import { isStepAligned } from '@/lib/modelParamRange';
import type { ModelInputLimits, ModelParamKind, ModelParamSchema, ModelPricingConfig, VideoPricingConfig } from '@/lib/types';

const RANDOM_ID_SLICE_START = 2;
const RANDOM_ID_SLICE_END = 8;
const DEFAULT_PARAM_KIND: ModelParamKind = 'text';
const EMPTY_NUMBER = '';
const IMAGE_DEFAULT_SIZE = '1024x1024';
const IMAGE_DEFAULT_QUALITY = 'medium';

const DEFAULT_IMAGE_SIZE_OPTIONS = [
  { label: '1K · 1:1 · 1024×1024', value: '1024x1024' },
  { label: '1K · 3:2 · 1536×1024', value: '1536x1024' },
  { label: '1K · 2:3 · 1024×1536', value: '1024x1536' },
  { label: '1K · 3:4 · 960×1280', value: '960x1280' },
  { label: '1K · 4:3 · 1280×960', value: '1280x960' },
  { label: '2K · 1:1 · 2048×2048', value: '2048x2048' },
  { label: '2K · 16:9 · 2560×1440', value: '2560x1440' },
  { label: '2K · 9:16 · 1440×2560', value: '1440x2560' },
  { label: '2K · 3:4 · 1920×2560', value: '1920x2560' },
  { label: '2K · 4:3 · 2560×1920', value: '2560x1920' },
  { label: '4K · 1:1 · 2880×2880', value: '2880x2880' },
  { label: '4K · 16:9 · 3840×2160', value: '3840x2160' },
  { label: '4K · 9:16 · 2160×3840', value: '2160x3840' },
  { label: '4K · 4:3 · 4096×3072', value: '4096x3072' },
  { label: '4K · 3:4 · 3072×4096', value: '3072x4096' },
] as const;

const DEFAULT_IMAGE_QUALITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
] as const;


const GEMINI_PRO_ASPECT_RATIO_OPTIONS = [
  { label: 'Square · 1:1', value: '1:1' },
  { label: 'Portrait · 1:4', value: '1:4' },
  { label: 'Portrait · 1:8', value: '1:8' },
  { label: 'Portrait · 2:3', value: '2:3' },
  { label: 'Landscape · 3:2', value: '3:2' },
  { label: 'Portrait · 3:4', value: '3:4' },
  { label: 'Landscape · 4:1', value: '4:1' },
  { label: 'Landscape · 4:3', value: '4:3' },
  { label: 'Portrait · 4:5', value: '4:5' },
  { label: 'Landscape · 5:4', value: '5:4' },
  { label: 'Landscape · 8:1', value: '8:1' },
  { label: 'Portrait · 9:16', value: '9:16' },
  { label: 'Landscape · 16:9', value: '16:9' },
  { label: 'Ultrawide · 21:9', value: '21:9' },
] as const;

const GEMINI_IMAGE_SIZE_OPTIONS = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
] as const;

const NANO_IMAGE_SIZE_OPTIONS = [
  { label: '1K · 1:1 · 1024x1024', value: '1024x1024' },
  { label: '1K · 2:3 · 1024x1536', value: '1024x1536' },
  { label: '1K · 3:2 · 1536x1024', value: '1536x1024' },
  { label: '1K · 1:2 · 1024x2048', value: '1024x2048' },
  { label: '1K · 2:1 · 2048x1024', value: '2048x1024' },
  { label: '2K · 3:4 · 1536x2048', value: '1536x2048' },
  { label: '2K · 4:3 · 2048x1536', value: '2048x1536' },
  { label: '2K · 1:1 · 2048x2048', value: '2048x2048' },
  { label: '4K · 9:16 · 2304x4096', value: '2304x4096' },
  { label: '4K · 16:9 · 4096x2304', value: '4096x2304' },
  { label: '4K · 3:4 · 3072x4096', value: '3072x4096' },
  { label: '4K · 4:3 · 4096x3072', value: '4096x3072' },
] as const;

export type EditableModelParamOption = {
  id: string;
  label: string;
  value: string;
};

export type EditableModelParam = {
  id: string;
  key: string;
  label: string;
  kind: ModelParamKind;
  required: boolean;
  defaultText: string;
  defaultBoolean: boolean;
  options: EditableModelParamOption[];
  min: string;
  max: string;
  step: string;
  description: string;
};

export type EditableModelState = {
  id: string;
  name: string;
  provider: string;
  upstreamModelID: string;
  displayOrder: string;
  type: 'image' | 'video';
  description: string;
  tagsText: string;
  capabilitiesText: string;
  params: EditableModelParam[];
  pricingConfig: EditablePricingConfig;
  inputLimits: EditableInputLimits;
  isEnabled: boolean;
};

export type EditableInputLimits = {
  referenceImages: string;
  referenceVideos: string;
  referenceAudios: string;
};

type EditableImagePricingTier = {
  low: string;
  medium: string;
  high: string;
};

export type EditableImagePricingConfig = {
  tier1k: EditableImagePricingTier;
  tier2k: EditableImagePricingTier;
  tier4k: EditableImagePricingTier;
};

export type EditablePricingConfig = {
  image?: EditableImagePricingConfig;
  video?: EditableVideoPricingConfig;
};

export type EditableVideoPricingConfig = {
  mode: 'duration' | 'fixed';
  credits: string;
  creditsPerSecond: string;
  minSeconds: string;
  durationParam: string;
  countParam: string;
  resolutionParam: string;
  resolutionMultipliersText: string;
};

export type ModelListSnapshot = Readonly<{
  provider: string;
  type: 'image' | 'video';
  searchText: string;
  sortText: string;
}>;

export type ModelValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

export type ModelValidationLabels = Readonly<{
  modelId: string;
  name: string;
  provider: string;
  upstreamModelId: string;
  modelDisplayOrder: string;
  description: string;
  paramKey: string;
  paramLabel: string;
  paramDefault: string;
  paramOptions: string;
  paramOptionLabel: string;
  paramOptionValue: string;
  paramMin: string;
  paramMax: string;
  paramStep: string;
  fieldRequiredSuffix: string;
  invalidNumber: string;
  positiveNumber: string;
  minMaxInvalid: string;
  duplicateParamKey: string;
  selectNeedsOptions: string;
  defaultOptionMismatch: string;
  optionLabelRequired: string;
  optionValueRequired: string;
  numberDefaultOutOfRange: string;
  numberDefaultNotOnStep: string;
  numberMaxNotOnStep: string;
  modelPricing: string;
  pricingTier1k: string;
  pricingTier2k: string;
  pricingTier4k: string;
  pricingLow: string;
  pricingMedium: string;
  pricingHigh: string;
  videoPricingMode: string;
  videoPricingModeDuration: string;
  videoPricingModeFixed: string;
  videoFixedCredits: string;
  videoCreditsPerSecond: string;
  videoMinSeconds: string;
  videoDurationParam: string;
  videoCountParam: string;
  videoResolutionParam: string;
  videoResolutionMultipliers: string;
  positiveInteger: string;
  nonNegativeInteger: string;
  referenceImagesLimit: string;
  referenceVideosLimit: string;
  referenceAudiosLimit: string;
}>;

export function emptyEditableModelState(provider = ''): EditableModelState {
  return {
    id: '',
    name: '',
    provider,
    upstreamModelID: '',
    displayOrder: '100',
    type: 'image',
    description: '',
    tagsText: '',
    capabilitiesText: '',
    params: defaultEditableParamsForType('image'),
    pricingConfig: defaultEditablePricingConfig('image'),
    inputLimits: emptyEditableInputLimits(),
    isEnabled: true,
  };
}

function emptyEditableInputLimits(): EditableInputLimits {
  return {
    referenceImages: '',
    referenceVideos: '',
    referenceAudios: '',
  };
}

export function editableInputLimitsFromModel(limits: ModelInputLimits): EditableInputLimits {
  return {
    referenceImages: editableInputLimitValue(limits.referenceImages),
    referenceVideos: editableInputLimitValue(limits.referenceVideos),
    referenceAudios: editableInputLimitValue(limits.referenceAudios),
  };
}

export function emptyEditableParam(): EditableModelParam {
  return {
    id: createLocalID('param'),
    key: '',
    label: '',
    kind: DEFAULT_PARAM_KIND,
    required: true,
    defaultText: '',
    defaultBoolean: false,
    options: [],
    min: EMPTY_NUMBER,
    max: EMPTY_NUMBER,
    step: EMPTY_NUMBER,
    description: '',
  };
}

export function emptyEditableParamOption(): EditableModelParamOption {
  return {
    id: createLocalID('option'),
    label: '',
    value: '',
  };
}

export function editableParamsFromSchema(schema: readonly ModelParamSchema[]): EditableModelParam[] {
  return schema.map((item) => ({
    id: createLocalID('param'),
    key: item.key,
    label: item.label,
    kind: item.kind,
    required: item.required,
    defaultText: item.kind === 'boolean' ? '' : String(item.default),
    defaultBoolean: item.kind === 'boolean' ? Boolean(item.default) : false,
    options: (item.options ?? []).map((option) => ({
      id: createLocalID('option'),
      label: option.label,
      value: String(option.value),
    })),
    min: item.min === undefined ? EMPTY_NUMBER : String(item.min),
    max: item.max === undefined ? EMPTY_NUMBER : String(item.max),
    step: item.step === undefined ? EMPTY_NUMBER : String(item.step),
    description: item.description ?? '',
  }));
}

function defaultEditableParamsForType(type: EditableModelState['type']): EditableModelParam[] {
  return defaultEditableParamsForProvider(type, 'image_openai', '');
}

export function defaultEditableParamsForProvider(type: EditableModelState['type'], adapter: string, upstreamModelID = ''): EditableModelParam[] {
  if (type === 'video') {
    return [];
  }
  switch (adapter.trim()) {
    case 'image_gemini':
      return geminiEditableParams(upstreamModelID);
    case 'image_waninter_async':
      return isNanoImageModel(upstreamModelID) ? nanoEditableParams() : openAIImageEditableParams();
    case 'image_openai_grsai':
    case 'image_grsai':
      return grsaiEditableParams();
    case 'image_openai':
    default:
      return openAIImageEditableParams();
  }
}

function openAIImageEditableParams(): EditableModelParam[] {
  return [
    createSelectParam('size', 'Size', IMAGE_DEFAULT_SIZE, DEFAULT_IMAGE_SIZE_OPTIONS, 'Output image size. Only backend-configured presets are supported.'),
    createSelectParam('quality', 'Quality', IMAGE_DEFAULT_QUALITY, DEFAULT_IMAGE_QUALITY_OPTIONS, 'Generation quality.'),
    createSelectParam('output_format', 'Format', 'png', [
      { label: 'PNG', value: 'png' },
      { label: 'JPEG', value: 'jpeg' },
      { label: 'WEBP', value: 'webp' },
    ], 'Output file format.'),
    createNumberParam('n', 'Images', '1', '1', '10', '1', 'Number of images to generate.'),
    createSelectParam('background', 'Background', 'auto', [
      { label: 'Auto', value: 'auto' },
      { label: 'Opaque', value: 'opaque' },
    ], 'Background handling. Transparent background is not supported.'),
    createNumberParam('output_compression', 'Compression', '100', '0', '100', '1', 'JPEG/WEBP compression level. Only used when output_format is jpeg or webp.'),
  ];
}

function geminiEditableParams(upstreamModelID: string): EditableModelParam[] {
  void upstreamModelID;
  return [
    createSelectParam('aspectRatio', 'Aspect Ratio', '1:1', GEMINI_PRO_ASPECT_RATIO_OPTIONS, 'Gemini imageConfig.aspectRatio.'),
    createSelectParam('imageSize', 'Image Size', '1K', GEMINI_IMAGE_SIZE_OPTIONS, 'Gemini imageConfig.imageSize.'),
  ];
}

function nanoEditableParams(): EditableModelParam[] {
  return [
    createSelectParam('size', 'Size', '1024x1024', NANO_IMAGE_SIZE_OPTIONS, 'Explicit Waninter image dimensions.'),
    createSelectParam('quality', 'Quality', IMAGE_DEFAULT_QUALITY, DEFAULT_IMAGE_QUALITY_OPTIONS, 'Generation quality.'),
  ];
}

function isNanoImageModel(modelID: string): boolean {
  return modelID.trim().toLowerCase().includes('nano');
}

function grsaiEditableParams(): EditableModelParam[] {
  return [createSelectParam('aspectRatio', 'Aspect Ratio', IMAGE_DEFAULT_SIZE, DEFAULT_IMAGE_SIZE_OPTIONS, 'GRSAI aspectRatio. Accepts configured size/aspect presets.')];
}

export function modelFieldDOMID(formKey: string, field: string): string {
  return `model-${formKey}-${field.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

export function cloneEditableModelState(state: EditableModelState): EditableModelState {
  return {
    ...state,
    params: state.params.map(cloneEditableParam),
    pricingConfig: cloneEditablePricingConfig(state.pricingConfig),
    inputLimits: { ...state.inputLimits },
  };
}

export function editableModelSignature(state: EditableModelState): string {
  return JSON.stringify({
    id: state.id,
    name: state.name,
    provider: state.provider,
    upstreamModelID: state.upstreamModelID,
    displayOrder: state.displayOrder,
    type: state.type,
    description: state.description,
    tagsText: state.tagsText,
    capabilitiesText: state.capabilitiesText,
    params: state.params.map((param) => ({
      key: param.key,
      label: param.label,
      kind: param.kind,
      required: param.required,
      defaultText: param.defaultText,
      defaultBoolean: param.defaultBoolean,
      options: param.options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      min: param.min,
      max: param.max,
      step: param.step,
      description: param.description,
    })),
    pricingConfig: state.pricingConfig,
    inputLimits: serializeEditableInputLimits(state.inputLimits),
    isEnabled: state.isEnabled,
  });
}

export function editableInputLimitsSignature(inputLimits: EditableInputLimits): string {
  return JSON.stringify(serializeEditableInputLimits(inputLimits));
}

export function serializeEditableInputLimits(inputLimits: EditableInputLimits): ModelInputLimits {
  return {
    referenceImages: parseInputLimit(inputLimits.referenceImages),
    referenceVideos: parseInputLimit(inputLimits.referenceVideos),
    referenceAudios: parseInputLimit(inputLimits.referenceAudios),
  };
}

export function editableParamListSignature(params: readonly EditableModelParam[]): string {
  return JSON.stringify(serializeEditableParams(params));
}

export function buildModelListSnapshot(state: Pick<EditableModelState, 'provider' | 'type' | 'id' | 'name' | 'upstreamModelID' | 'displayOrder' | 'description' | 'tagsText' | 'capabilitiesText'>): ModelListSnapshot {
  return {
    provider: state.provider.trim(),
    type: state.type,
    searchText: [state.id, state.name, state.provider, state.upstreamModelID, state.type, state.description, state.tagsText, state.capabilitiesText].join(' ').toLowerCase(),
    sortText: `${parseDisplayOrder(state.displayOrder)} ${(state.name.trim() || state.id.trim()).toLowerCase()}`,
  };
}

export function serializeEditableParams(params: readonly EditableModelParam[]): ModelParamSchema[] {
  return params.map((param) => {
    const defaultValue = serializeParamDefault(param);
    const options = (param.kind === 'select' || param.kind === 'text' ? param.options : [])
      .map((option) => ({ label: option.label.trim(), value: option.value.trim() }))
      .filter((option) => option.label || option.value);
    const description = param.description.trim();

    const base: ModelParamSchema = {
      key: param.key.trim(),
      label: param.label.trim(),
      kind: param.kind,
      required: param.required,
      default: defaultValue,
      ...(options.length > 0 ? { options } : {}),
      ...(description ? { description } : {}),
    };

    if (param.kind === 'number') {
      const min = parseOptionalNumber(param.min);
      const max = parseOptionalNumber(param.max);
      const step = parseOptionalNumber(param.step);
      return {
        ...base,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
        ...(step !== undefined ? { step } : {}),
      };
    }

    return base;
  });
}

export function defaultEditablePricingConfig(type: EditableModelState['type']): EditablePricingConfig {
  if (type === 'image') {
    return { image: editableImagePricingConfig(defaultImagePricingConfig()) };
  }
  if (type === 'video') {
    return { video: defaultEditableVideoPricingConfig() };
  }
  return {};
}

export function editablePricingConfigFromModel(
  type: EditableModelState['type'],
  pricingConfig?: ModelPricingConfig,
): EditablePricingConfig {
  const normalized = normalizeModelPricingConfig(type, pricingConfig);
  if (type === 'image' && normalized.image) {
    return { image: editableImagePricingConfig(normalized.image) };
  }
  if (type === 'video' && normalized.video) {
    return { video: editableVideoPricingConfig(normalized.video) };
  }
  return defaultEditablePricingConfig(type);
}

export function editablePricingConfigSignature(pricingConfig: EditablePricingConfig): string {
  return JSON.stringify(pricingConfig);
}

export function serializeEditablePricingConfig(
  type: EditableModelState['type'],
  pricingConfig: EditablePricingConfig,
): ModelPricingConfig {
  if (type === 'image') {
    const fallback = defaultImagePricingConfig();
    return {
      image: {
        tier1k: serializeEditablePricingTier(pricingConfig.image?.tier1k, fallback.tier1k),
        tier2k: serializeEditablePricingTier(pricingConfig.image?.tier2k, fallback.tier2k),
        tier4k: serializeEditablePricingTier(pricingConfig.image?.tier4k, fallback.tier4k),
      },
    };
  }
  if (type === 'video') {
    return { video: serializeEditableVideoPricingConfig(pricingConfig.video) };
  }
  return {};
}

export function validateModelState(state: EditableModelState, labels: ModelValidationLabels): readonly ModelValidationIssue[] {
  const issues: ModelValidationIssue[] = [];

  pushRequiredIssue(issues, 'id', state.id, labels.modelId, labels.fieldRequiredSuffix);
  pushRequiredIssue(issues, 'name', state.name, labels.name, labels.fieldRequiredSuffix);
  pushRequiredIssue(issues, 'provider', state.provider, labels.provider, labels.fieldRequiredSuffix);
  pushRequiredIssue(issues, 'upstreamModelID', state.upstreamModelID, labels.upstreamModelId, labels.fieldRequiredSuffix);
  if (!Number.isInteger(parseRequiredNumber(state.displayOrder))) {
    issues.push(fieldIssue('displayOrder', `${labels.modelDisplayOrder}${labels.invalidNumber}`));
  }
  pushRequiredIssue(issues, 'description', state.description, labels.description, labels.fieldRequiredSuffix);
  pushInputLimitIssue(issues, 'referenceImages', state.inputLimits.referenceImages, labels.referenceImagesLimit, labels.nonNegativeInteger);
  pushInputLimitIssue(issues, 'referenceVideos', state.inputLimits.referenceVideos, labels.referenceVideosLimit, labels.nonNegativeInteger);
  pushInputLimitIssue(issues, 'referenceAudios', state.inputLimits.referenceAudios, labels.referenceAudiosLimit, labels.nonNegativeInteger);

  const seenKeys = new Set<string>();

  for (const param of state.params) {
    const paramFieldPrefix = `param:${param.id}`;
    const key = param.key.trim();
    const label = param.label.trim();

    if (!key) {
      issues.push(fieldIssue(`${paramFieldPrefix}:key`, `${labels.paramKey}${labels.fieldRequiredSuffix}`));
    } else {
      const normalizedKey = key.toLowerCase();
      if (seenKeys.has(normalizedKey)) {
        issues.push(fieldIssue(`${paramFieldPrefix}:key`, labels.duplicateParamKey));
      } else {
        seenKeys.add(normalizedKey);
      }
    }

    if (!label) {
      issues.push(fieldIssue(`${paramFieldPrefix}:label`, `${labels.paramLabel}${labels.fieldRequiredSuffix}`));
    }

    if (param.kind === 'boolean') {
      continue;
    }

    if ((param.kind === 'number' || param.kind === 'select') && !param.defaultText.trim()) {
      issues.push(fieldIssue(`${paramFieldPrefix}:default`, `${labels.paramDefault}${labels.fieldRequiredSuffix}`));
    }

    if (param.kind === 'number') {
      const defaultValue = parseOptionalNumber(param.defaultText);
      const min = parseOptionalNumber(param.min);
      const max = parseOptionalNumber(param.max);
      const step = parseOptionalNumber(param.step);

      if (defaultValue === undefined) {
        issues.push(fieldIssue(`${paramFieldPrefix}:default`, labels.invalidNumber));
      }
      if (param.min.trim() && min === undefined) {
        issues.push(fieldIssue(`${paramFieldPrefix}:min`, labels.invalidNumber));
      }
      if (param.max.trim() && max === undefined) {
        issues.push(fieldIssue(`${paramFieldPrefix}:max`, labels.invalidNumber));
      }
      if (param.step.trim()) {
        if (step === undefined) {
          issues.push(fieldIssue(`${paramFieldPrefix}:step`, labels.invalidNumber));
        } else if (step <= 0) {
          issues.push(fieldIssue(`${paramFieldPrefix}:step`, labels.positiveNumber));
        }
      }
      if (min !== undefined && max !== undefined && min > max) {
        issues.push(fieldIssue(`${paramFieldPrefix}:max`, labels.minMaxInvalid));
      }
      if (max !== undefined && step !== undefined && step > 0 && !isStepAligned(max, min ?? 0, step)) {
        issues.push(fieldIssue(`${paramFieldPrefix}:max`, labels.numberMaxNotOnStep));
      }
      if (defaultValue !== undefined && min !== undefined && defaultValue < min) {
        issues.push(fieldIssue(`${paramFieldPrefix}:default`, labels.numberDefaultOutOfRange));
      }
      if (defaultValue !== undefined && max !== undefined && defaultValue > max) {
        issues.push(fieldIssue(`${paramFieldPrefix}:default`, labels.numberDefaultOutOfRange));
      }
      if (defaultValue !== undefined && step !== undefined && step > 0 && !isStepAligned(defaultValue, min ?? 0, step)) {
        issues.push(fieldIssue(`${paramFieldPrefix}:default`, labels.numberDefaultNotOnStep));
      }
      continue;
    }

    if (param.kind === 'select') {
      const normalizedOptions = param.options.filter((option) => option.label.trim() || option.value.trim());
      if (normalizedOptions.length === 0) {
        issues.push(fieldIssue(`${paramFieldPrefix}:options`, labels.selectNeedsOptions));
        continue;
      }

      for (const option of normalizedOptions) {
        if (!option.label.trim()) {
          issues.push(fieldIssue(`${paramFieldPrefix}:option:${option.id}:label`, labels.optionLabelRequired));
        }
        if (!option.value.trim()) {
          issues.push(fieldIssue(`${paramFieldPrefix}:option:${option.id}:value`, labels.optionValueRequired));
        }
      }

      const valueSet = new Set(normalizedOptions.map((option) => option.value.trim()));
      if (param.defaultText.trim() && !valueSet.has(param.defaultText.trim())) {
        issues.push(fieldIssue(`${paramFieldPrefix}:default`, labels.defaultOptionMismatch));
      }
      continue;
    }

    const normalizedOptions = param.options.filter((option) => option.label.trim() || option.value.trim());
    for (const option of normalizedOptions) {
      if (!option.label.trim()) {
        issues.push(fieldIssue(`${paramFieldPrefix}:option:${option.id}:label`, labels.optionLabelRequired));
      }
      if (!option.value.trim()) {
        issues.push(fieldIssue(`${paramFieldPrefix}:option:${option.id}:value`, labels.optionValueRequired));
      }
    }
  }

  if (state.type === 'image') {
    pushPricingIssues(issues, state.pricingConfig, labels);
  }
  if (state.type === 'video') {
    pushVideoPricingIssues(issues, state.pricingConfig, labels);
  }

  return issues;
}

function editableInputLimitValue(limit: number): string {
  return limit > 0 ? String(limit) : '';
}

function parseInputLimit(value: string): number {
  const normalized = value.trim();
  return normalized ? Number(normalized) : 0;
}

function pushInputLimitIssue(issues: ModelValidationIssue[], field: keyof EditableInputLimits, value: string, label: string, message: string): void {
  if (!value.trim()) return;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 0) {
    issues.push(fieldIssue(`inputLimit:${field}`, `${label}: ${message}`));
  }
}

function cloneEditableParam(param: EditableModelParam): EditableModelParam {
  return {
    ...param,
    options: param.options.map((option) => ({ ...option })),
  };
}

function cloneEditablePricingConfig(pricingConfig: EditablePricingConfig): EditablePricingConfig {
  if (pricingConfig.image) {
    return {
      image: {
        tier1k: { ...pricingConfig.image.tier1k },
        tier2k: { ...pricingConfig.image.tier2k },
        tier4k: { ...pricingConfig.image.tier4k },
      },
    };
  }
  if (pricingConfig.video) {
    return { video: { ...pricingConfig.video } };
  }
  return {};
}

function createSelectParam(
  key: string,
  label: string,
  defaultValue: string,
  options: readonly { label: string; value: string }[],
  description: string,
): EditableModelParam {
  return {
    id: createLocalID('param'),
    key,
    label,
    kind: 'select',
    required: true,
    defaultText: defaultValue,
    defaultBoolean: false,
    options: options.map((option) => ({ id: createLocalID('option'), label: option.label, value: option.value })),
    min: EMPTY_NUMBER,
    max: EMPTY_NUMBER,
    step: EMPTY_NUMBER,
    description,
  };
}

function createNumberParam(
  key: string,
  label: string,
  defaultValue: string,
  min: string,
  max: string,
  step: string,
  description: string,
): EditableModelParam {
  return {
    id: createLocalID('param'),
    key,
    label,
    kind: 'number',
    required: true,
    defaultText: defaultValue,
    defaultBoolean: false,
    options: [],
    min,
    max,
    step,
    description,
  };
}

function createLocalID(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(RANDOM_ID_SLICE_START, RANDOM_ID_SLICE_END)}`;
}

function serializeParamDefault(param: EditableModelParam): string | number | boolean {
  if (param.kind === 'boolean') {
    return param.defaultBoolean;
  }
  if (param.kind === 'number') {
    return Number(param.defaultText.trim());
  }
  return param.defaultText.trim();
}

function editableImagePricingConfig(config: NonNullable<ModelPricingConfig['image']>): EditableImagePricingConfig {
  return {
    tier1k: editableImagePricingTier(config.tier1k),
    tier2k: editableImagePricingTier(config.tier2k),
    tier4k: editableImagePricingTier(config.tier4k),
  };
}

function editableImagePricingTier(tier: { low: number; medium: number; high: number }): EditableImagePricingTier {
  return {
    low: String(tier.low),
    medium: String(tier.medium),
    high: String(tier.high),
  };
}

function defaultEditableVideoPricingConfig(): EditableVideoPricingConfig {
  return {
    mode: 'duration',
    credits: '20',
    creditsPerSecond: '4',
    minSeconds: '4',
    durationParam: 'duration',
    countParam: 'sample_count',
    resolutionParam: 'resolution',
    resolutionMultipliersText: '720p=1\n1080p=1.5\n4k=4',
  };
}

function editableVideoPricingConfig(config: VideoPricingConfig): EditableVideoPricingConfig {
  const defaults = defaultEditableVideoPricingConfig();
  return {
    mode: config.mode === 'fixed' ? 'fixed' : 'duration',
    credits: String(config.credits ?? defaults.credits),
    creditsPerSecond: String(config.creditsPerSecond ?? defaults.creditsPerSecond),
    minSeconds: String(config.minSeconds ?? defaults.minSeconds),
    durationParam: config.durationParam ?? defaults.durationParam,
    countParam: config.countParam ?? defaults.countParam,
    resolutionParam: config.resolutionParam ?? defaults.resolutionParam,
    resolutionMultipliersText: resolutionMultipliersText(config.resolutionMultipliers) || defaults.resolutionMultipliersText,
  };
}

function serializeEditablePricingTier(
  tier: EditableImagePricingTier | undefined,
  fallback: { low: number; medium: number; high: number },
): { low: number; medium: number; high: number } {
  return {
    low: parsePositiveInteger(tier?.low, fallback.low),
    medium: parsePositiveInteger(tier?.medium, fallback.medium),
    high: parsePositiveInteger(tier?.high, fallback.high),
  };
}

function serializeEditableVideoPricingConfig(config?: EditableVideoPricingConfig): VideoPricingConfig {
  const fallback = defaultEditableVideoPricingConfig();
  const source = config ?? fallback;
  if (source.mode === 'fixed') {
    return {
      mode: 'fixed',
      credits: parsePositiveInteger(source.credits, 20),
    };
  }
  return {
    mode: 'duration',
    creditsPerSecond: parsePositiveFloat(source.creditsPerSecond, 4),
    minSeconds: parsePositiveFloat(source.minSeconds, 4),
    durationParam: source.durationParam.trim() || 'duration',
    countParam: source.countParam.trim() || 'sample_count',
    resolutionParam: source.resolutionParam.trim() || 'resolution',
    resolutionMultipliers: parseResolutionMultipliers(source.resolutionMultipliersText),
  };
}

function pushPricingIssues(
  issues: ModelValidationIssue[],
  pricingConfig: EditablePricingConfig,
  labels: ModelValidationLabels,
): void {
  const imagePricing = pricingConfig.image ?? defaultEditablePricingConfig('image').image;
  if (!imagePricing) {
    issues.push(fieldIssue('pricing:image', `${labels.modelPricing}${labels.fieldRequiredSuffix}`));
    return;
  }

  const resolutionEntries: ReadonlyArray<[ImagePricingResolutionKey, EditableImagePricingTier]> = [
    ['tier1k', imagePricing.tier1k],
    ['tier2k', imagePricing.tier2k],
    ['tier4k', imagePricing.tier4k],
  ];

  for (const [resolutionKey, tier] of resolutionEntries) {
    const qualityEntries: ReadonlyArray<[ImagePricingQualityKey, string]> = [
      ['low', tier.low],
      ['medium', tier.medium],
      ['high', tier.high],
    ];
    for (const [qualityKey, value] of qualityEntries) {
      const field = pricingField(resolutionKey, qualityKey);
      const label = `${labels.modelPricing} · ${pricingResolutionLabel(resolutionKey, labels)} · ${pricingQualityLabel(qualityKey, labels)}`;
      if (!value.trim()) {
        issues.push(fieldIssue(field, `${label}${labels.fieldRequiredSuffix}`));
        continue;
      }
      if (!isPositiveInteger(value)) {
        issues.push(fieldIssue(field, `${label}：${labels.positiveInteger}`));
      }
    }
  }
}

function pushVideoPricingIssues(
  issues: ModelValidationIssue[],
  pricingConfig: EditablePricingConfig,
  labels: ModelValidationLabels,
): void {
  const videoPricing = pricingConfig.video ?? defaultEditableVideoPricingConfig();
  if (videoPricing.mode === 'fixed') {
    if (!isPositiveInteger(videoPricing.credits)) {
      issues.push(fieldIssue('pricing:video:credits', `${labels.videoFixedCredits}：${labels.positiveInteger}`));
    }
    return;
  }
  for (const [field, label, value] of [
    ['creditsPerSecond', labels.videoCreditsPerSecond, videoPricing.creditsPerSecond],
    ['minSeconds', labels.videoMinSeconds, videoPricing.minSeconds],
  ] as const) {
    if (!isPositiveNumber(value)) {
      issues.push(fieldIssue(`pricing:video:${field}`, `${label}：${labels.positiveNumber}`));
    }
  }
  for (const [field, label, value] of [
    ['durationParam', labels.videoDurationParam, videoPricing.durationParam],
    ['countParam', labels.videoCountParam, videoPricing.countParam],
    ['resolutionParam', labels.videoResolutionParam, videoPricing.resolutionParam],
  ] as const) {
    if (!value.trim()) {
      issues.push(fieldIssue(`pricing:video:${field}`, `${label}${labels.fieldRequiredSuffix}`));
    }
  }
  for (const line of videoPricing.resolutionMultipliersText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [, rawValue] = trimmed.split('=');
    if (!rawValue || !isPositiveNumber(rawValue)) {
      issues.push(fieldIssue('pricing:video:resolutionMultipliersText', `${labels.videoResolutionMultipliers}：${labels.positiveNumber}`));
      return;
    }
  }
}

function parseRequiredNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const next = Number(normalized);
  return Number.isFinite(next) ? next : undefined;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const normalized = value?.trim() ?? '';
  if (!/^\d+$/.test(normalized)) {
    return fallback;
  }
  const next = Number(normalized);
  return Number.isInteger(next) && next > 0 ? next : fallback;
}

function parsePositiveFloat(value: string | undefined, fallback: number): number {
  const normalized = value?.trim() ?? '';
  const next = Number(normalized);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number(value.trim()) > 0;
}

function isPositiveNumber(value: string): boolean {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0;
}

function resolutionMultipliersText(values?: Readonly<Record<string, number>>): string {
  return Object.entries(values ?? {}).map(([key, value]) => `${key}=${value}`).join('\n');
}

function parseResolutionMultipliers(text: string): Readonly<Record<string, number>> {
  const values: Record<string, number> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [rawKey, rawValue] = trimmed.split('=');
    const key = rawKey?.trim() ?? '';
    const value = Number(rawValue?.trim());
    if (!key || !Number.isFinite(value) || value <= 0) continue;
    values[key] = value;
  }
  return values;
}

function pricingField(resolutionKey: ImagePricingResolutionKey, qualityKey: ImagePricingQualityKey): string {
  return `pricing:image:${resolutionKey}:${qualityKey}`;
}

function pricingResolutionLabel(key: ImagePricingResolutionKey, labels: ModelValidationLabels): string {
  if (key === 'tier1k') return labels.pricingTier1k;
  if (key === 'tier2k') return labels.pricingTier2k;
  return labels.pricingTier4k;
}

function pricingQualityLabel(key: ImagePricingQualityKey, labels: ModelValidationLabels): string {
  if (key === 'low') return labels.pricingLow;
  if (key === 'medium') return labels.pricingMedium;
  return labels.pricingHigh;
}

function pushRequiredIssue(issues: ModelValidationIssue[], field: string, value: string, label: string, suffix: string): void {
  if (!value.trim()) {
    issues.push(fieldIssue(field, `${label}${suffix}`));
  }
}

function fieldIssue(field: string, message: string): ModelValidationIssue {
  return { field, message };
}

export function parseDisplayOrder(value: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return 100;
  return parsed;
}
