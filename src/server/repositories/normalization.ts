function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeQuestionText(value: string) {
  return collapseWhitespace(value)
    .replace(/^[\d\s\-*•.)、:：]+/u, "")
    .replace(/[?？!！.。:：]+$/u, "")
    .toLowerCase();
}

export function normalizeTagName(value: string) {
  return collapseWhitespace(value).toLowerCase();
}
