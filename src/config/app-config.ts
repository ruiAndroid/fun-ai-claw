import { localAppConfig } from "@/config/app-config.local";
import { prodAppConfig } from "@/config/app-config.prod";
import { stagingAppConfig } from "@/config/app-config.staging";
import { activeAppProfile } from "@/config/app-profile";
import type { AppConfig, AppProfile } from "@/config/app-config.shared";

const appConfigByProfile: Record<AppProfile, AppConfig> = {
  local: localAppConfig,
  staging: stagingAppConfig,
  prod: prodAppConfig,
};

export const appProfile = activeAppProfile;
export const appConfig = appConfigByProfile[activeAppProfile];
