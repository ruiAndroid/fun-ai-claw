export type AppProfile = "local" | "staging" | "prod";

export type AppConfig = {
  controlApiBaseUrl: string;
  uiControllerBaseUrl: string;
  defaultHostId: string;
  userCenterBaseUrl: string;
};

export const sharedAppConfig = {
  defaultHostId: "00000000-0000-0000-0000-000000000108",
} satisfies Pick<AppConfig, "defaultHostId">;

export function resolvePublicConfigValue(envKey: string, fallback: string) {
  const envValue = process.env[envKey]?.trim();
  return envValue || fallback;
}
