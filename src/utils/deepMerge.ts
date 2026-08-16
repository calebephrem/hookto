export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];

    const bothArePlainObjects =
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue !== null &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue);

    if (bothArePlainObjects) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}
