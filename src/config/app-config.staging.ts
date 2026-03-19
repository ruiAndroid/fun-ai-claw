import { sharedAppConfig, type AppConfig } from "@/config/app-config.shared";

export const stagingAppConfig = {
  ...sharedAppConfig,
  controlApiBaseUrl: "/fun-claw/api",
  uiControllerBaseUrl: "/fun-claw/api/ops/ui-controller",
  userCenterBaseUrl: "http://172.17.3.199:8091/service",
} satisfies AppConfig;
