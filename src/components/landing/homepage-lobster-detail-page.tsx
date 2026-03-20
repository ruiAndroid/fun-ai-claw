"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alert, Tabs, message } from "antd";
import { ArrowLeft, LoaderCircle, RefreshCw, Rocket, Settings2, Wrench, Bot, Radio } from "lucide-react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import { listConsumerInstances } from "@/lib/consumer-api";
import { submitInstanceAction } from "@/lib/control-api";
import { useRequireUserCenterAuth } from "@/lib/use-require-user-center-auth";
import { InstanceAgentPanel } from "@/components/instance-agent-panel";
import { InstanceChannelsConfigPanel } from "@/components/instance-channels-config-panel";
import { InstanceSkillPanel } from "@/components/instance-skill-panel";
import type { ConsumerBoundInstance } from "@/types/consumer";

type LobsterDetailTabKey = "agents" | "skills" | "channels";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "暂无";
  }
  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInstanceStatus(status?: string) {
  switch (status) {
    case "RUNNING":
      return "运行中";
    case "STOPPED":
      return "已停止";
    case "CREATING":
      return "初始化中";
    case "ERROR":
      return "异常";
    default:
      return status || "未知";
  }
}

function formatSourceType(sourceType?: string) {
  switch (sourceType) {
    case "ADOPTION":
      return "首页领养";
    case "MANUAL":
      return "手动绑定";
    default:
      return sourceType || "系统";
  }
}

function formatRuntimeLabel() {
  return "FUNCLAW";
}

function DetailCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/84 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-md-on-surface-variant/80">
        {label}
      </div>
      <div className={`mt-3 text-sm font-bold text-md-on-surface ${mono ? "break-all font-mono text-[13px]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mt-10 space-y-5">
      <div className="h-12 w-36 animate-pulse rounded-full bg-white/70" />
      <div className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
        <div className="h-14 w-14 animate-pulse rounded-[22px] bg-orange-100/80" />
        <div className="mt-5 h-10 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-5 w-1/2 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
        </div>
      </div>
      <div className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
        <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-12 w-full animate-pulse rounded-[18px] bg-slate-100" />
        <div className="mt-6 h-80 w-full animate-pulse rounded-[24px] bg-slate-100" />
      </div>
    </div>
  );
}

function LobsterConfigTabShell({
  eyebrow,
  title,
  description,
  icon,
  instanceId,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  instanceId: string;
  children: ReactNode;
}) {
  return (
    <div className="lobster-config-shell">
      <div className="lobster-config-shell-hero">
        <div className="lobster-config-shell-kicker">{eyebrow}</div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="lobster-config-shell-icon">{icon}</div>
            <div className="min-w-0">
              <h3 className="lobster-config-shell-title">{title}</h3>
              <p className="lobster-config-shell-copy">{description}</p>
            </div>
          </div>
          <div className="lobster-config-shell-meta">
            <span className="lobster-config-shell-meta-chip">仅作用于当前龙虾</span>
            <span className="lobster-config-shell-meta-chip is-code">{instanceId}</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function HomepageLobsterDetailPage() {
  const params = useParams<{ instanceId: string }>();
  const instanceId = Array.isArray(params.instanceId) ? params.instanceId[0] : params.instanceId;
  const { checking, authenticated } = useRequireUserCenterAuth();
  const [messageApi, messageContextHolder] = message.useMessage();

  const [instance, setInstance] = useState<ConsumerBoundInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState<LobsterDetailTabKey>("agents");
  const [autoRestarting, setAutoRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string>();

  const loadDetail = useCallback(async () => {
    if (!instanceId) {
      setInstance(null);
      setError("龙虾详情地址无效");
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(undefined);

    try {
      const instancesResponse = await listConsumerInstances();
      const matchedInstance = instancesResponse.items.find((item) => item.instanceId === instanceId) ?? null;

      if (!matchedInstance) {
        setInstance(null);
        setError("没有找到这只龙虾，可能已经被删除或解绑");
        return null;
      }

      setInstance(matchedInstance);
      return matchedInstance;
    } catch (loadError) {
      setInstance(null);
      setError(loadError instanceof Error ? loadError.message : "加载龙虾详情失败");
      return null;
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    if (checking || !authenticated) {
      return;
    }
    void loadDetail();
  }, [authenticated, checking, loadDetail]);

  const handleConfigSaved = useCallback(async () => {
    const restartMessageKey = "lobster-config-restart";
    setRestartError(undefined);
    setAutoRestarting(true);
    messageApi.open({
      key: restartMessageKey,
      type: "loading",
      content: "配置已保存，正在为你重启龙虾以应用最新配置...",
      duration: 0,
    });

    try {
      const latestInstance = await loadDetail();
      if (!instanceId) {
        throw new Error("龙虾实例 ID 不存在");
      }

      const restartAction = latestInstance?.status === "STOPPED" ? "START" : "RESTART_ZEROCLAW";
      await submitInstanceAction(instanceId, restartAction);
      await loadDetail();

      messageApi.success({
        key: restartMessageKey,
        content: restartAction === "START"
          ? "配置已保存，已自动启动龙虾以应用最新配置"
          : "配置已保存，已自动发起龙虾重启，请稍候刷新查看最新状态",
      });
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : "自动重启龙虾失败";
      setRestartError(messageText);
      messageApi.error({
        key: restartMessageKey,
        content: `配置已保存，但自动重启失败：${messageText}`,
      });
    } finally {
      setAutoRestarting(false);
    }
  }, [instanceId, loadDetail, messageApi]);

  const conversationHref = instanceId ? `/messages?instanceId=${encodeURIComponent(instanceId)}` : "/messages";

  if (checking) {
    return (
      <main className="brand-sunset-theme relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.16),transparent_28%),linear-gradient(180deg,#fffaf7_0%,#fff7fb_48%,#fffaf7_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-orange-300/16 blur-3xl" />
          <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-violet-300/14 blur-3xl" />
          <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/8 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1680px] px-6 py-10">
          <PageSkeleton />
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <main className="brand-sunset-theme relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.16),transparent_28%),linear-gradient(180deg,#fffaf7_0%,#fff7fb_48%,#fffaf7_100%)]">
      {messageContextHolder}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-orange-300/16 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-violet-300/14 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(139,61,255,0.045)_1px,transparent_1px)] [background-size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-[1680px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-semibold text-md-on-surface-variant shadow-sm transition hover:bg-white/90"
          >
            <ArrowLeft size={15} />
            返回首页
          </Link>

          <button
            type="button"
            onClick={() => {
              void loadDetail();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-semibold text-md-on-surface-variant shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            刷新详情
          </button>
        </div>

        {loading && !instance && !error ? <PageSkeleton /> : null}

        {!loading && error ? (
          <div className="mt-10 rounded-[30px] border border-rose-100 bg-white/88 p-8 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
            <div className="text-2xl font-black tracking-[-0.04em] text-md-on-surface">龙虾详情加载失败</div>
            <p className="mt-3 text-sm leading-7 text-md-on-surface-variant">{error}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void loadDetail();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01]"
              >
                <RefreshCw size={15} />
                重新加载
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:scale-[1.01]"
              >
                <ArrowLeft size={15} />
                回到首页
              </Link>
            </div>
          </div>
        ) : null}

        {instance ? (
          <div className="mt-10 space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/86 shadow-[0_28px_70px_rgba(81,38,145,0.10)]">
              <div className="relative overflow-hidden border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.13)_0%,rgba(139,61,255,0.11)_100%)] px-7 py-7 sm:px-8">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-orange-300/18 blur-3xl" />
                  <div className="absolute right-[-2rem] top-10 h-36 w-36 rounded-full bg-violet-300/18 blur-3xl" />
                </div>

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/76 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-md-primary shadow-sm">
                    <Rocket size={13} />
                    Lobster Detail
                  </div>

                  <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(255,122,24,0.18),rgba(139,61,255,0.14))] text-md-primary shadow-[0_14px_28px_rgba(139,61,255,0.12)]">
                        <XiamiIcon size={32} title={instance.name} />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-[32px] font-black tracking-[-0.05em] text-md-on-surface">
                          {instance.name}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-md-on-surface-variant">
                          这只龙虾已经绑定到当前账号。现在除了进入对话，也可以直接在这里管理当前龙虾的 Agent、Skill 和渠道配置。
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                            {formatInstanceStatus(instance.status)}
                          </span>
                          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                            {formatSourceType(instance.sourceType)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={conversationHref}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(139,61,255,0.16)] transition hover:scale-[1.01]"
                      >
                        <XiamiIcon size={16} title="龙虾" />
                        进入龙虾
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-7 py-7 sm:px-8">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailCard label="实例 ID" value={instance.instanceId} mono />
                  <DetailCard label="运行状态" value={formatInstanceStatus(instance.status)} />
                  <DetailCard label="绑定来源" value={formatSourceType(instance.sourceType)} />
                  <DetailCard label="运行时" value={formatRuntimeLabel()} />
                  <DetailCard label="绑定时间" value={formatDateTime(instance.boundAt)} />
                  <DetailCard label="最近更新" value={formatDateTime(instance.bindingUpdatedAt)} />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/86 p-6 shadow-[0_28px_70px_rgba(81,38,145,0.10)] sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[22px] font-black tracking-[-0.04em] text-md-on-surface">
                    <Settings2 size={18} />
                    龙虾配置
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-md-on-surface-variant">
                    下面的配置区已经按龙虾详情页重新整理，所有修改都会和当前龙虾实例绑定，后续扩展功能也会继续在这里承接。
                  </p>
                </div>
              </div>
              {autoRestarting ? (
                <div className="mt-4">
                  <Alert
                    type="warning"
                    showIcon
                    message="检测到配置变更，正在自动重启龙虾"
                    description="我们已经自动提交了龙虾运行时的重启请求，稍候刷新后即可查看最新生效状态。"
                    className="rounded-[20px]"
                  />
                </div>
              ) : null}

              {restartError ? (
                <div className="mt-4">
                  <Alert
                    type="error"
                    showIcon
                    message="自动重启龙虾失败"
                    description={restartError}
                    className="rounded-[20px]"
                  />
                </div>
              ) : null}

              {instance.restartRequired && !autoRestarting ? (
                <div className="mt-4">
                  <Alert
                    type="warning"
                    showIcon
                    message="当前龙虾有未重启生效的配置"
                    description="如果刚刚修改过配置但还未生效，可以稍等片刻后刷新页面；若状态持续不变，再手动处理重启。"
                    className="rounded-[20px]"
                  />
                </div>
              ) : null}

              <Tabs
                className="instance-detail-tabs lobster-instance-detail-tabs mt-6"
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as LobsterDetailTabKey)}
                items={[
                  {
                    key: "agents",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Bot size={14} />
                        Agent
                      </span>
                    ),
                    children: (
                      <LobsterConfigTabShell
                        eyebrow="Agent Studio"
                        title="给这只龙虾配置专属 Agent"
                        description="你可以选择挂载哪个 Agent，并继续调整模型、提示词、工具白名单和 Skill 可见范围。"
                        icon={<Bot size={20} />}
                        instanceId={instance.instanceId}
                      >
                        <InstanceAgentPanel
                          instanceId={instance.instanceId}
                          onSaved={handleConfigSaved}
                          subjectLabel="当前龙虾"
                          updatedBy="ui-lobster-detail"
                          className="lobster-themed-panel"
                          confirmBeforeSave
                          restartTargetLabel="这只龙虾"
                          hideAdvancedConfig
                          hideSystemPrompt
                          hideDetailSection
                        />
                      </LobsterConfigTabShell>
                    ),
                  },
                  {
                    key: "skills",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Wrench size={14} />
                        Skill
                      </span>
                    ),
                    children: (
                      <LobsterConfigTabShell
                        eyebrow="Skill Dock"
                        title="管理这只龙虾可用的 Skill"
                        description="在这里决定当前龙虾挂载哪些 Skill，以及它们是否已经同步到运行时。"
                        icon={<Wrench size={20} />}
                        instanceId={instance.instanceId}
                      >
                        <InstanceSkillPanel
                          instanceId={instance.instanceId}
                          onSaved={handleConfigSaved}
                          subjectLabel="当前龙虾"
                          className="lobster-themed-panel"
                          hideDetailSection
                        />
                      </LobsterConfigTabShell>
                    ),
                  },
                  {
                    key: "channels",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Radio size={14} />
                        通道
                      </span>
                    ),
                    children: (
                      <LobsterConfigTabShell
                        eyebrow="Channel Access"
                        title="配置这只龙虾的对外接入通道"
                        description="你可以为当前龙虾打开 CLI、钉钉或 QQ 等接入方式，保存后会自动重启以应用新通道配置。"
                        icon={<Radio size={20} />}
                        instanceId={instance.instanceId}
                      >
                        <InstanceChannelsConfigPanel
                          instanceId={instance.instanceId}
                          onSaved={handleConfigSaved}
                          subjectLabel="当前龙虾"
                          updatedBy="ui-lobster-detail"
                          className="lobster-themed-panel"
                          title="当前龙虾的通道接入"
                          confirmBeforeSave
                          restartTargetLabel="这只龙虾"
                        />
                      </LobsterConfigTabShell>
                    ),
                  },
                ]}
              />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
