"use client";

import { ConfigProvider } from "antd";
import "antd/dist/reset.css";

export function ConsoleThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#0f766e",
          colorInfo: "#0f766e",
          colorSuccess: "#059669",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          colorBgLayout: "#fafffe",
          colorBgContainer: "#ffffff",
          colorText: "#0f172a",
          colorTextSecondary: "#475569",
          borderRadius: 14,
          fontFamily:
            '"Plus Jakarta Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Layout: {
            bodyBg: "transparent",
            headerBg: "transparent",
          },
          Card: {
            bodyPadding: 20,
            headerHeight: 56,
          },
          Button: {
            controlHeight: 40,
            borderRadius: 12,
          },
          Table: {
            headerBg: "#ecfdf5",
            borderRadius: 16,
          },
          Modal: {
            borderRadiusLG: 28,
          },
          Tag: {
            borderRadiusSM: 999,
          },
          Input: {
            activeShadow: "0 0 0 3px rgba(15, 118, 110, 0.08)",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
