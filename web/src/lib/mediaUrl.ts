export function displayMediaURL(url: string): string {
  if (!url) return '';

  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative path, prepend API base
  if (url.startsWith('/')) {
    return url;
  }

  return url;
}

export function isDataURL(url: string): boolean {
  return url.startsWith('data:');
}
