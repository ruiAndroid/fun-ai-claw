"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { messageShortcuts } from "./homepage-data";

export function HomepageSidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(true);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 104 : 286 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="hidden shrink-0 border-r border-md-outline-variant/25 bg-white/76 px-4 py-5 backdrop-blur-2xl xl:flex xl:flex-col"
    >
      <div className="mb-4 flex items-center justify-between">
        {!isSidebarCollapsed ? (
          <div className="text-xs font-bold tracking-[0.18em] uppercase text-md-primary">Sidebar</div>
        ) : (
          <div className="h-6" />
        )}
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
            className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-md-primary text-md-on-primary shadow-md-2"
            aria-label="新建消息"
          >
            <Plus size={18} />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/78 text-md-primary shadow-sm">
            <MessageCircle size={18} />
          </div>
          <Link
            href="/console"
            className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/78 text-md-on-surface shadow-sm"
          >
            <Bot size={18} />
          </Link>
          <Link
            href="/docs"
            className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/78 text-md-on-surface shadow-sm"
          >
            <BookOpen size={18} />
          </Link>
          <Link
            href="/docs/open-v1-external-frontend-integration"
            className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/78 text-md-on-surface shadow-sm"
          >
            <Network size={18} />
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-[28px] border border-white/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] px-2 py-2 text-md-on-surface">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-md-surface-container text-md-primary shadow-sm">
                  <MessageCircle size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">消息</div>
                  <div className="truncate text-xs text-md-on-surface-variant">机器人会话入口</div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary shadow-md-2 transition-transform duration-300 hover:scale-105"
                aria-label="新建消息"
              >
                <Plus size={18} />
              </button>

              <button
                type="button"
                onClick={() => setIsMessageExpanded((value) => !value)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/76 text-md-on-surface shadow-sm transition-all duration-300 hover:border-md-primary/20 hover:text-md-primary"
                aria-label={isMessageExpanded ? "收起消息区块" : "展开消息区块"}
              >
                {isMessageExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isMessageExpanded ? (
                <motion.div
                  key="message-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-md-outline-variant/20 px-5 pb-5 pt-3">
                    <div className="rounded-[28px] border border-white/70 bg-white/76 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.04)]">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-400/25 via-teal-400/15 to-transparent text-md-primary shadow-sm">
                        <MessageCircle size={24} />
                      </div>
                      <h3 className="mt-4 text-xl font-bold tracking-tight text-md-on-surface">消息中心</h3>
                      <p className="mt-2 text-sm leading-7 text-md-on-surface-variant">
                        这里暂不填充假会话数据。等你真正接入机器人、实例与消息流后，最近会话会自然出现在这里。
                      </p>

                      <div className="mt-5 max-h-[280px] space-y-3 overflow-y-auto pr-1">
                        {messageShortcuts.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center justify-between rounded-[20px] border border-md-outline-variant/30 bg-md-surface/75 px-4 py-3 text-sm font-semibold text-md-on-surface transition-all duration-300 hover:border-md-primary/18 hover:bg-white hover:text-md-primary"
                          >
                            <span>{item.label}</span>
                            <ArrowRight size={15} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.07)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 text-white shadow-md-2">
                <Bot size={20} />
              </div>
              <div>
                <div className="text-base font-bold text-md-on-surface">机器人</div>
                <div className="text-xs text-md-on-surface-variant">主入口模块</div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/console"
                className="flex items-center justify-between rounded-[20px] bg-md-primary px-4 py-3 text-sm font-semibold text-md-on-primary shadow-md-2"
              >
                <span>进入控制台</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/docs"
                className="flex items-center justify-between rounded-[20px] border border-md-outline-variant/35 bg-white px-4 py-3 text-sm font-semibold text-md-on-surface transition-colors duration-300 hover:text-md-primary"
              >
                <span>文档中心</span>
                <BookOpen size={15} />
              </Link>
              <Link
                href="/docs/open-v1-external-frontend-integration"
                className="flex items-center justify-between rounded-[20px] border border-md-outline-variant/35 bg-white px-4 py-3 text-sm font-semibold text-md-on-surface transition-colors duration-300 hover:text-md-primary"
              >
                <span>Open API</span>
                <Network size={15} />
              </Link>
            </div>
          </div>
        </>
      )}
    </motion.aside>
  );
}
