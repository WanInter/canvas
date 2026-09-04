const DEFAULT_DIAGNOSTIC_LENGTH = 160;
const MAX_PARSE_DEPTH = 6;

export function taskErrorDiagnosticSummary(message: string, maxLength = DEFAULT_DIAGNOSTIC_LENGTH): string {
  const normalized = normalizeDiagnostic(message);
  if (!normalized) return '';

  const structured = extractStructuredDiagnostic(normalized);
  const source = structured || normalized;
  const marked = extractMarkedDiagnostic(source);
  if (marked) return truncateDiagnostic(marked, maxLength, 'end');
  if (structured) return truncateDiagnostic(structured, maxLength, 'end');

  const colonSuffix = extractLastColonSuffix(normalized);
  if (colonSuffix) return truncateDiagnostic(colonSuffix, maxLength, 'end');
  return truncateDiagnostic(normalized, maxLength, normalized.length > maxLength ? 'start' : 'end');
}

function extractStructuredDiagnostic(value: string): string {
  if (!isJSONLike(value)) return '';
  try {
    return extractDiagnosticValue(JSON.parse(value) as unknown);
  } catch {
    return '';
  }
}

function extractDiagnosticValue(value: unknown, depth = 0): string {
  if (depth > MAX_PARSE_DEPTH || value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const normalized = normalizeDiagnostic(value);
    const nested = extractStructuredDiagnostic(normalized);
    return nested || normalized;
  }
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const diagnostic = extractDiagnosticValue(value[index], depth + 1);
      if (diagnostic) return diagnostic;
    }
    return '';
  }
  if (typeof value !== 'object') return normalizeDiagnostic(String(value));

  const record = value as Record<string, unknown>;
  for (const key of ['error', 'message', 'detail', 'reason', 'cause', 'data']) {
    const diagnostic = extractDiagnosticValue(record[key], depth + 1);
    if (diagnostic) return diagnostic;
  }
  return '';
}

function extractMarkedDiagnostic(value: string): string {
  const markerPattern = /\b(?:caused by|cause|failed|error|message|detail|reason)\s*[:：]\s*/gi;
  const matches = Array.from(value.matchAll(markerPattern));
  const lastMatch = matches.at(-1);
  if (lastMatch?.index === undefined) return '';
  return cleanDiagnostic(value.slice(lastMatch.index + lastMatch[0].length));
}

function extractLastColonSuffix(value: string): string {
  const matches = Array.from(value.matchAll(/[:：]\s+/g));
  const lastMatch = matches.at(-1);
  if (lastMatch?.index === undefined || lastMatch.index < 4) return '';
  const suffix = cleanDiagnostic(value.slice(lastMatch.index + lastMatch[0].length));
  return suffix.length >= 8 ? suffix : '';
}

function truncateDiagnostic(value: string, maxLength: number, keep: 'start' | 'end'): string {
  const normalized = cleanDiagnostic(value);
  if (normalized.length <= maxLength) return normalized;
  return keep === 'start'
    ? `…${normalized.slice(-maxLength)}`
    : `${normalized.slice(0, maxLength)}…`;
}

function normalizeDiagnostic(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanDiagnostic(value: string): string {
  return normalizeDiagnostic(value).replace(/^[\s'"`([{]+|[\s'"`\])}]+$/g, '');
}

function isJSONLike(value: string): boolean {
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '{' && last === '}') || (first === '[' && last === ']') || (first === '"' && last === '"');
}
