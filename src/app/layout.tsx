import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_SC } from "next/font/google";
import { UserCenterVipBootstrap } from "@/components/auth/user-center-vip-bootstrap";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "funClaw — AI-Powered Claw Orchestration",
  description:
    "基于 Docker 的智能 Claw 实例管理平台，支持 Agent 配置与 Skill 编排",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${plusJakarta.variable} ${notoSansSC.variable}`}>
        <UserCenterVipBootstrap />
        {children}
      </body>
    </html>
  );
}
