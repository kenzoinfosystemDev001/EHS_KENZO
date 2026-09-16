/**
 * Generates an enterprise-standard formatted reference ID.
 * e.g., INC-2026-NW-0042
 */
export function formatReferenceId(
  prefix: string,
  year: number,
  plantCode: string,
  sequence: number,
): string {
  const paddedSeq = String(sequence).padStart(4, "0");
  return `${prefix}-${year}-${plantCode.toUpperCase()}-${paddedSeq}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
