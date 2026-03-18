export const appConfig = {
  controlApiBaseUrl: "/fun-claw/api",
  uiControllerBaseUrl: "/fun-claw/api/ops/ui-controller",
  defaultHostId: "00000000-0000-0000-0000-000000000108",
  userCenterBaseUrl: process.env.NEXT_PUBLIC_USER_CENTER_BASE_URL?.trim() || "http://172.17.3.199:8091/service",
} as const;
