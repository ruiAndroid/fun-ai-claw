"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { sidebarMessages, sidebarNavItems } from "./homepage-data";

function SidebarNavLink({
  href,
  label,
  active,
  icon: Icon,
  collapsed,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        className={`flex h-12 w-12 items-center justify-center rounded-[18px] border transition-all duration-300 ${
          active
            ? "border-cyan-200/70 bg-cyan-200 text-slate-950 shadow-[0_16px_36px_rgba(34,211,238,0.16)]"
            : "border-white/70 bg-white/78 text-md-on-surface shadow-sm"
        }`}
        aria-label={label}
      >
        <Icon size={18} />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-bold transition-all duration-300 ${
        active
          ? "bg-cyan-200 text-slate-950 shadow-[0_16px_36px_rgba(34,211,238,0.16)]"
          : "text-md-on-surface hover:bg-white/70"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-[14px] ${
          active ? "bg-white/40" : "bg-white/82 shadow-sm"
        }`}
      >
        <Icon size={18} />
      </span>
      <span>{label}</span>
    </Link>
  );
}

function SidebarUserCard({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#60a5fa_0%,#fde68a_100%)] text-sm font-black text-slate-900 shadow-[0_14px_30px_rgba(59,130,246,0.2)]">
          FC
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/78 text-md-on-surface shadow-sm"
          aria-label="用户设置"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto flex items-center gap-3 rounded-[24px] border border-white/70 bg-white/82 p-3 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#60a5fa_0%,#fde68a_100%)] text-base font-black text-slate-900 shadow-[0_14px_30px_rgba(59,130,246,0.2)]">
        FC
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-bold text-md-on-surface">FunClaw 用户</div>
        <div className="truncate text-xs text-md-on-surface-variant">登录后展示账号信息</div>
      </div>
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-md-on-surface shadow-sm"
        aria-label="用户设置"
      >
        <SlidersHorizontal size={16} />
      </button>
    </div>
  );
}

export function HomepageSidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(true);
  const hasMessages = sidebarMessages.length > 0;
  const sidebarWidth = isSidebarCollapsed ? 104 : 292;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="hidden shrink-0 xl:block"
    >
      <motion.div
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ left: "max(0px, calc((100vw - 1920px) / 2))" }}
        className="fixed top-0 z-20 hidden h-screen overflow-y-auto border-r border-md-outline-variant/25 bg-white/76 px-4 py-5 backdrop-blur-2xl xl:flex xl:flex-col"
      >
        <div className="mb-5 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/76 text-md-on-surface shadow-sm transition-all duration-300 hover:border-md-primary/20 hover:text-md-primary"
            aria-label={isSidebarCollapsed ? "展开侧栏" : "收起侧栏"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {isSidebarCollapsed ? (
          <div className="flex h-full flex-col gap-3">
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/82 text-md-on-surface shadow-sm"
              aria-label="消息"
            >
              <MessageCircle size={18} />
            </button>
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-md-primary text-md-on-primary shadow-md-2"
              aria-label="新建消息"
            >
              <Plus size={18} />
            </button>
            {sidebarNavItems.map((item) => (
              <SidebarNavLink
                key={item.label}
                href={item.href}
                label={item.label}
                active={item.active}
                icon={item.icon}
                collapsed
              />
            ))}

            <SidebarUserCard collapsed />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/82 text-md-on-surface shadow-sm">
                <MessageCircle size={16} />
              </span>
              <div className="text-[22px] font-black tracking-[-0.04em] text-md-on-surface">消息</div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-md-on-surface shadow-sm transition-transform duration-300 hover:scale-105"
                  aria-label="新建消息"
                >
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMessageExpanded((value) => !value)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-md-on-surface shadow-sm transition-transform duration-300 hover:scale-105"
                  aria-label={isMessageExpanded ? "收起消息区块" : "展开消息区块"}
                >
                  {isMessageExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isMessageExpanded ? (
                <motion.div
                  key="message-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-5 overflow-hidden"
                >
                  {hasMessages ? (
                    <div className="max-h-[460px] overflow-y-auto pr-2">
                      {sidebarMessages.map((item) => (
                        <Link
                          key={item.id}
                          href="/console"
                          className="mb-2 flex items-center gap-3 rounded-[20px] px-2 py-2.5 transition-colors duration-300 hover:bg-white/70"
                        >
                          <div className="h-11 w-11 rounded-full bg-slate-200" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-md-on-surface">
                              {item.title}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-md-outline-variant/40 bg-white/60 px-4 py-5 text-sm text-md-on-surface-variant">
                      暂无消息，接入真实会话后这里才会显示内容。
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="mt-8 space-y-2">
              {sidebarNavItems.map((item) => (
                <SidebarNavLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  active={item.active}
                  icon={item.icon}
                  collapsed={false}
                />
              ))}
            </div>

            <SidebarUserCard collapsed={false} />
          </div>
        )}
      </motion.div>
    </motion.aside>
  );
}
