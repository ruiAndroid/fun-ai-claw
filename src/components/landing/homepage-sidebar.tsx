"use client";

import { useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import type { SidebarMessageGroup, SidebarNavItem, SidebarMessageSessionItem } from "./homepage-data";
import type { HomepageUserCard } from "./use-homepage-shell-data";

function getSessionStatusDotClassName(status: SidebarMessageSessionItem["status"]) {
  switch (status) {
    case "thinking":
      return "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]";
    case "connected":
      return "bg-violet-500 shadow-[0_0_0_4px_rgba(139,61,255,0.12)]";
    case "active":
      return "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]";
    case "closed":
    default:
      return "bg-slate-300 shadow-[0_0_0_4px_rgba(148,163,184,0.12)]";
  }
}

function getSessionStatusLabel(status: SidebarMessageSessionItem["status"]) {
  switch (status) {
    case "thinking":
      return "思考中";
    case "connected":
      return "在线";
    case "active":
      return "待继续";
    case "closed":
    default:
      return "已结束";
  }
}

function SidebarBrand() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/78 px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-200/80 hover:shadow-[0_16px_36px_rgba(139,61,255,0.14)]"
      aria-label="返回首页"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_44%,#8b3dff_100%)] text-slate-950 shadow-[0_16px_30px_rgba(139,61,255,0.2)]">
        <XiamiIcon size={24} />
      </span>
      <span className="min-w-0">
        <span className="block bg-[linear-gradient(135deg,#0f172a_0%,#ff7a18_42%,#8b3dff_100%)] bg-clip-text text-[15px] font-black tracking-[-0.05em] text-transparent">
          FunClaw
        </span>
      </span>
    </Link>
  );
}

function SidebarNavLink({
  href,
  label,
  active,
  badge,
  summary,
  icon: Icon,
  collapsed,
}: {
  href: string;
  label: string;
  active?: boolean;
  badge?: string;
  summary?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        className={`relative flex h-12 w-12 items-center justify-center rounded-[18px] border transition-all duration-300 ${
          active
            ? "border-violet-200/80 bg-violet-50 text-violet-900 shadow-[0_16px_36px_rgba(139,61,255,0.14)]"
            : "border-white/70 bg-white/78 text-md-on-surface shadow-sm"
        }`}
        aria-label={label}
      >
        <Icon size={18} />
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-bold transition-all duration-300 ${
        active
          ? "bg-violet-50 text-violet-900 shadow-[0_16px_36px_rgba(139,61,255,0.14)]"
          : "text-md-on-surface hover:bg-white/78 hover:shadow-[0_12px_26px_rgba(81,38,145,0.08)]"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-[14px] ${
          active ? "bg-white/40" : "bg-white/82 shadow-sm"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span>{label}</span>
          {badge ? (
            <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        {summary ? (
          <span className="mt-0.5 block truncate text-[11px] font-medium text-md-on-surface-variant">
            {summary}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function SidebarUserCard({
  collapsed,
  userCard,
}: {
  collapsed: boolean;
  userCard: HomepageUserCard;
}) {
  if (collapsed) {
    return (
      <Link
        href={userCard.href}
        className="mt-auto self-center inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] text-white shadow-[0_14px_30px_rgba(139,61,255,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(139,61,255,0.26)]"
        aria-label="前往个人中心"
      >
        <UserRound size={18} />
      </Link>
    );
  }

  return (
    <Link
      href={userCard.href}
      className="group mt-auto flex items-center gap-3 rounded-[24px] border border-white/70 bg-white/82 p-3 shadow-[0_18px_36px_rgba(81,38,145,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-200/80 hover:shadow-[0_22px_40px_rgba(81,38,145,0.12)]"
      aria-label="前往个人中心"
    >
      {userCard.avatarUrl ? (
        <Image
          src={userCard.avatarUrl}
          alt={userCard.title}
          width={56}
          height={56}
          unoptimized
          className="h-14 w-14 rounded-full object-cover shadow-[0_14px_30px_rgba(139,61,255,0.14)]"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] text-white shadow-[0_14px_30px_rgba(139,61,255,0.2)]">
          <UserRound size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-bold text-md-on-surface">{userCard.title}</div>
        <div className="truncate text-xs text-md-on-surface-variant">{userCard.subtitle}</div>
      </div>
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-md-on-surface shadow-sm transition-all duration-300 group-hover:border-violet-200/80 group-hover:text-violet-700"
        aria-hidden="true"
      >
        <UserRound size={16} />
      </span>
    </Link>
  );
}

export function HomepageSidebar({
  messagesHref,
  navItems,
  messages,
  messageEmptyText,
  userCard,
}: {
  messagesHref: string;
  navItems: SidebarNavItem[];
  messages: SidebarMessageGroup[];
  messageEmptyText: string;
  userCard: HomepageUserCard;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(true);
  const hasMessages = messages.some((group) => group.sessions.length > 0);
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
        className="fixed bottom-4 top-4 z-20 hidden overflow-hidden rounded-[28px] border border-md-outline-variant/25 bg-white/76 px-4 py-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)] backdrop-blur-2xl xl:flex xl:flex-col"
      >
        <div
          className={`mb-5 flex items-center gap-3 ${
            isSidebarCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isSidebarCollapsed ? <SidebarBrand /> : null}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            className={`inline-flex items-center justify-center border border-white/70 bg-white/76 text-md-on-surface shadow-sm transition-all duration-300 hover:border-md-primary/20 hover:text-md-primary ${
              isSidebarCollapsed ? "h-12 w-12 self-center rounded-[18px]" : "h-10 w-10 rounded-full"
            }`}
            aria-label={isSidebarCollapsed ? "展开侧栏" : "收起侧栏"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} className="-translate-x-0.5" />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        {isSidebarCollapsed ? (
          <div className="flex h-full flex-col items-center gap-3 overflow-hidden">
            <Link
              href={messagesHref}
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/82 text-md-on-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(81,38,145,0.1)]"
              aria-label="消息"
            >
              <MessageCircle size={18} />
            </Link>
            {navItems.map((item) => (
              <SidebarNavLink
                key={item.label}
                href={item.href}
                label={item.label}
                active={item.active}
                badge={item.badge}
                summary={item.summary}
                icon={item.icon}
                collapsed
              />
            ))}

            <SidebarUserCard collapsed userCard={userCard} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 pr-1">
              <div className="rounded-[28px] border border-violet-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(249,245,255,0.95)_100%)] p-3 shadow-[0_16px_34px_rgba(81,38,145,0.07)]">
                <div className="flex items-center gap-2">
                  <Link
                    href={messagesHref}
                    className="flex flex-1 items-center gap-3 rounded-[20px] bg-white/84 px-4 py-3 text-sm font-bold text-md-on-surface shadow-[0_10px_24px_rgba(81,38,145,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(81,38,145,0.08)]"
                    aria-label="消息"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-violet-50 text-violet-700 shadow-[0_8px_18px_rgba(139,61,255,0.14)]">
                      <MessageCircle size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div>消息</div>
                      <div className="mt-0.5 text-[11px] font-medium text-md-on-surface-variant">
                        最近会话
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMessageExpanded((value) => !value)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-md-on-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(81,38,145,0.1)]"
                    aria-label={isMessageExpanded ? "收起消息区域" : "展开消息区域"}
                  >
                    {isMessageExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {isMessageExpanded ? (
                    <motion.div
                      key="message-list"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4 overflow-hidden"
                    >
                      {hasMessages ? (
                        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                          {messages.map((group) => (
                            <div
                              key={group.id}
                              className="rounded-[22px] bg-white/72 px-3 py-3 shadow-[0_10px_22px_rgba(81,38,145,0.05)] ring-1 ring-white/80"
                            >
                              <Link
                                href={group.href}
                                className="flex items-center gap-3 rounded-[16px] px-1 py-1 transition-colors duration-300 hover:bg-white/80"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(255,122,24,0.14),rgba(139,61,255,0.10))]">
                                  <XiamiIcon size={20} title={group.robotName} />
                                </div>
                                <div className="min-w-0 flex-1 truncate text-sm font-bold text-md-on-surface">
                                  {group.robotName}
                                </div>
                              </Link>

                              <div className="mt-2 space-y-1 pl-9">
                                {group.sessions.map((session) => (
                                  <Link
                                    key={session.id}
                                    href={session.href}
                                    className="group flex items-center gap-3 rounded-[14px] px-1.5 py-2 text-sm transition-colors duration-300 hover:bg-violet-50/70"
                                  >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-200 transition-colors duration-300 group-hover:bg-violet-400" />
                                    <div className="min-w-0 flex-1 truncate font-medium text-md-on-surface">
                                      {session.title}
                                    </div>
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${getSessionStatusDotClassName(session.status)}`}
                                      title={getSessionStatusLabel(session.status)}
                                      aria-label={getSessionStatusLabel(session.status)}
                                    />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-dashed border-md-outline-variant/40 bg-white/60 px-4 py-5 text-sm text-md-on-surface-variant">
                          {messageEmptyText}
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="mt-8 space-y-2">
                {navItems.map((item) => (
                  <SidebarNavLink
                    key={item.label}
                    href={item.href}
                    label={item.label}
                    active={item.active}
                    badge={item.badge}
                    summary={item.summary}
                    icon={item.icon}
                    collapsed={false}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4">
              <SidebarUserCard collapsed={false} userCard={userCard} />
            </div>
          </div>
        )}
      </motion.div>
    </motion.aside>
  );
}
