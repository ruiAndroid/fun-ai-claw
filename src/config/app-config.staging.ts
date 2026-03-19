import { resolvePublicConfigValue, sharedAppConfig, type AppConfig } from "@/config/app-config.shared";

export const stagingAppConfig = {
  ...sharedAppConfig,
  controlApiBaseUrl: "/fun-claw/api",
  uiControllerBaseUrl: "/fun-claw/api/ops/ui-controller",
  userCenterBaseUrl: resolvePublicConfigValue("NEXT_PUBLIC_USER_CENTER_BASE_URL", "http://172.17.3.199:8091/service"),
} satisfies AppConfig;
