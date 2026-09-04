export function isStepAligned(value: number, step: number): boolean {
  if (step <= 0) return true;
  const remainder = value % step;
  return Math.abs(remainder) < 0.0001 || Math.abs(remainder - step) < 0.0001;
}

export function clampToStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  if (step <= 0) return clamped;

  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
}
