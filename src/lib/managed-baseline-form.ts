"use client";

export const MANAGED_BASELINE_KEY_MAX_LENGTH = 128;
export const MANAGED_BASELINE_KEY_FORMAT_MESSAGE = "仅支持小写字母、数字，以及点、下划线、中划线；且不能以分隔符开头、结尾或连续出现";

const MANAGED_BASELINE_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export type ManagedBaselineIdentity = {
  key: string;
  displayName?: string | null;
};

export function normalizeManagedBaselineText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeManagedBaselineCompareValue(value: unknown): string {
  return normalizeManagedBaselineText(value).toLowerCase();
}

export function validateManagedBaselineKeyFormat(value: unknown): string | null {
  const normalized = normalizeManagedBaselineText(value);
  if (!normalized) {
    return null;
  }
  if (normalized.length > MANAGED_BASELINE_KEY_MAX_LENGTH) {
    return `长度不能超过 ${MANAGED_BASELINE_KEY_MAX_LENGTH} 个字符`;
  }
  if (!MANAGED_BASELINE_KEY_PATTERN.test(normalized)) {
    return MANAGED_BASELINE_KEY_FORMAT_MESSAGE;
  }
  return null;
}

export function isDuplicateManagedBaselineKey(
  value: unknown,
  existingKeys: string[],
  currentKey?: string,
): boolean {
  const normalized = normalizeManagedBaselineCompareValue(value);
  if (!normalized) {
    return false;
  }
  const current = normalizeManagedBaselineCompareValue(currentKey);
  return existingKeys.some((candidate) => {
    const comparable = normalizeManagedBaselineCompareValue(candidate);
    return comparable === normalized && comparable !== current;
  });
}

export function isDuplicateManagedBaselineDisplayName(
  displayName: unknown,
  fallbackKey: unknown,
  existingItems: ManagedBaselineIdentity[],
  currentKey?: string,
): boolean {
  const normalizedDisplayName = normalizeManagedBaselineCompareValue(displayName)
    || normalizeManagedBaselineCompareValue(fallbackKey);
  if (!normalizedDisplayName) {
    return false;
  }
  const current = normalizeManagedBaselineCompareValue(currentKey);
  return existingItems.some((item) => (
    normalizeManagedBaselineCompareValue(item.displayName ?? item.key) === normalizedDisplayName
    && normalizeManagedBaselineCompareValue(item.key) !== current
  ));
}
