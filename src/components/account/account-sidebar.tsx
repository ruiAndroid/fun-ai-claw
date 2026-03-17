"use client";

import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import type { AccountTabKey } from "./account-data";
import { accountNavItems } from "./account-data";

export function AccountSidebar({
  activeTab,
  onChange,
  onLogout,
  loggingOut,
}: {
  activeTab: AccountTabKey;
  onChange: (tab: AccountTabKey) => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <aside className="flex min-h-[calc(100vh-48px)] flex-col rounded-[28px] bg-white/72 px-5 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xl font-black tracking-[-0.03em] text-slate-950"
      >
        <ArrowLeft size={22} />
        返回首页
      </Link>

      <div className="mt-12 space-y-4">
        {accountNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`flex w-full items-center gap-3 rounded-[24px] px-6 py-6 text-left text-[20px] font-black tracking-[-0.03em] transition-all duration-300 ${
                isActive
                  ? "bg-cyan-200 text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.16)]"
                  : "text-slate-950 hover:bg-white/70"
              }`}
            >
              <Icon size={22} />
              {item.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="mt-auto inline-flex items-center gap-2 text-[18px] font-black tracking-[-0.02em] text-red-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={20} />
        {loggingOut ? "退出中…" : "退出登录"}
      </button>
    </aside>
  );
}
