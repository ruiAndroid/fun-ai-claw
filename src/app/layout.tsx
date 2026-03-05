import type { Metadata } from "next";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "fun-ai-claw claw\u5b9e\u4f8b\u7ba1\u7406\u53f0",
  description: "Claw instance management console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#0f766e",
              colorInfo: "#0f766e",
              colorSuccess: "#0f766e",
              colorWarning: "#d97706",
              colorError: "#dc2626",
              colorBgLayout: "#f4faf8",
              colorBgContainer: "#ffffff",
              colorText: "#0f172a",
              colorTextSecondary: "#475569",
              borderRadius: 14,
              fontFamily: "\"Plus Jakarta Sans\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif",
            },
            components: {
              Layout: {
                bodyBg: "transparent",
                headerBg: "transparent",
              },
              Card: {
                bodyPadding: 20,
              },
              Button: {
                controlHeight: 38,
                borderRadius: 12,
              },
              Table: {
                headerBg: "#eff7f5",
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
