export function buildLikePattern(value: string) {
  const escapedValue = value.trim().replace(/[\\%_]/g, "\\$&");

  return `%${escapedValue}%`;
}

export function buildFtsPhraseQuery(value: string) {
  return `"${value.trim().replace(/"/g, '""')}"`;
}

export function shouldUseFtsQuery(value: string) {
  return value.trim().length >= 3;
}

export function parseJsonStringArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  } catch {
    return [];
  }
}
