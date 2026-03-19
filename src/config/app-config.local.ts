import { sharedAppConfig, type AppConfig } from "@/config/app-config.shared";

export const localAppConfig = {
  ...sharedAppConfig,
  controlApiBaseUrl: "http://127.0.0.1:8080",
  uiControllerBaseUrl: "http://127.0.0.1:8080/ops/ui-controller",
  userCenterBaseUrl: "http://172.17.3.199:8091/service",
} satisfies AppConfig;
