"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Input, Switch, message } from "antd";
import { Bot, CheckCircle2, LoaderCircle, Rocket, Sparkles } from "lucide-react";
import { adoptConsumerRobot, listConsumerRobotTemplates } from "@/lib/consumer-api";
import type { ConsumerRobotTemplateSummary } from "@/types/consumer";

const loadingHints = [
  "正在为你创建专属机器人…",
  "正在同步模板能力与扩展配置…",
  "正在准备对话环境与启动实例…",
] as const;

function buildSuggestedRobotName(template?: ConsumerRobotTemplateSummary) {
  const baseName = template?.displayName?.trim() || "我的机器人";
  const compactBase = baseName.replace(/\s+/g, "").slice(0, 12) || "我的机器人";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${compactBase}${suffix}`;
}

function formatTemplateSubtitle(template: ConsumerRobotTemplateSummary) {
  return template.summary?.trim() || template.description?.trim() || "适合开箱即用的机器人模板";
}

export function HomepageRobotAdoptionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [templates, setTemplates] = useState<ConsumerRobotTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>();
  const [robotName, setRobotName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.templateKey === selectedTemplateKey) ?? templates[0],
    [selectedTemplateKey, templates],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;

    const loadTemplates = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const response = await listConsumerRobotTemplates();
        if (cancelled) {
          return;
        }
        const items = response.items ?? [];
        setTemplates(items);
        if (items.length > 0) {
          setSelectedTemplateKey((current) => current && items.some((item) => item.templateKey === current)
            ? current
            : items[0].templateKey);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setTemplates([]);
        setError(loadError instanceof Error ? loadError.message : "加载机器人模板失败");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedTemplate) {
      return;
    }
    if (!nameEdited || !robotName.trim()) {
      setRobotName(buildSuggestedRobotName(selectedTemplate));
      setNameEdited(false);
    }
  }, [nameEdited, open, robotName, selectedTemplate]);

  useEffect(() => {
    if (!submitting) {
      setLoadingHintIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingHintIndex((current) => (current + 1) % loadingHints.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [submitting]);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    const template = templates.find((item) => item.templateKey === templateKey);
    if (!template) {
      return;
    }
    if (!nameEdited || !robotName.trim()) {
      setRobotName(buildSuggestedRobotName(template));
      setNameEdited(false);
    }
  };

  const handleSubmit = async () => {
    const finalTemplate = selectedTemplate;
    const finalName = robotName.trim();
    if (!finalTemplate) {
      messageApi.warning("请先选择一个机器人模板");
      return;
    }
    if (!finalName) {
      messageApi.warning("请先填写机器人名称");
      return;
    }

    setSubmitting(true);
    try {
      const response = await adoptConsumerRobot({
        templateKey: finalTemplate.templateKey,
        name: finalName,
        autoStart,
      });

      messageApi.success("领养成功，正在带你进入对话");
      onClose();

      const params = new URLSearchParams({
        instanceId: response.instance.instanceId,
      });
      if (response.primaryAgentKey?.trim()) {
        params.set("agentId", response.primaryAgentKey.trim());
      }
      router.push(`/messages?${params.toString()}`);
    } catch (submitError) {
      messageApi.error(submitError instanceof Error ? submitError.message : "领养机器人失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={() => {
          if (!submitting) {
            onClose();
          }
        }}
        footer={null}
        centered
        width={960}
        closable={!submitting}
        maskClosable={!submitting}
        destroyOnHidden
        styles={{
          content: {
            overflow: "hidden",
            borderRadius: 28,
            padding: 0,
            background:
              "linear-gradient(180deg, rgba(255,250,247,0.98) 0%, rgba(255,247,251,0.98) 100%)",
            boxShadow: "0 32px 80px rgba(76, 29, 149, 0.16)",
          },
          body: {
            padding: 0,
          },
        }}
      >
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-3rem] top-[-3rem] h-44 w-44 rounded-full bg-orange-300/18 blur-3xl" />
            <div className="absolute right-[-2rem] top-10 h-40 w-40 rounded-full bg-violet-300/18 blur-3xl" />
            <div className="absolute bottom-[-2rem] left-1/3 h-36 w-36 rounded-full bg-fuchsia-300/14 blur-3xl" />
          </div>

          <div className="relative border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.12)_0%,rgba(139,61,255,0.10)_100%)] px-7 py-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/76 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-md-primary shadow-sm">
              <Sparkles size={13} />
              Adopt Robot
            </div>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(255,122,24,0.18),rgba(139,61,255,0.14))] text-md-primary shadow-[0_14px_28px_rgba(139,61,255,0.12)]">
                <Bot size={26} strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[28px] font-black tracking-tight text-md-on-surface">领养你的专属机器人</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-md-on-surface-variant">
                  选择一个模板，取一个名字，系统会自动为你创建、绑定并启动机器人，准备好后可直接进入对话。
                </p>
              </div>
            </div>
          </div>

          <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="px-7 py-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-md-on-surface">选择机器人模板</div>
                  <div className="mt-1 text-sm text-md-on-surface-variant">推荐从正式上线的模板开始，后续还可以继续扩展能力。</div>
                </div>
                {!loading && templates.length > 0 ? (
                  <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-md-on-surface-variant shadow-sm">
                    共 {templates.length} 个模板
                  </div>
                ) : null}
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
                    >
                      <div className="h-5 w-1/2 animate-pulse rounded-full bg-slate-200" />
                      <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((__, innerIndex) => (
                          <div key={innerIndex} className="h-16 animate-pulse rounded-[18px] bg-slate-100" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-[24px] border border-rose-100 bg-white/88 p-5">
                  <div className="text-sm font-semibold text-rose-500">模板加载失败</div>
                  <div className="mt-2 text-sm leading-7 text-md-on-surface-variant">{error}</div>
                </div>
              ) : null}

              {!loading && !error && templates.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-md-outline-variant/40 bg-white/82 p-6 text-sm text-md-on-surface-variant">
                  当前还没有可领养的机器人模板，请先在控制台配置并启用模板。
                </div>
              ) : null}

              {!loading && !error && templates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((template) => {
                    const selected = template.templateKey === selectedTemplate?.templateKey;
                    return (
                      <button
                        key={template.templateKey}
                        type="button"
                        onClick={() => handleTemplateSelect(template.templateKey)}
                        className={`relative overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-300 ${
                          selected
                            ? "border-md-primary/45 bg-[linear-gradient(135deg,rgba(255,122,24,0.10),rgba(139,61,255,0.08))] shadow-[0_22px_48px_rgba(139,61,255,0.14)]"
                            : "border-white/80 bg-white/84 shadow-[0_18px_42px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(15,23,42,0.10)]"
                        }`}
                      >
                        <div className="absolute right-4 top-4">
                          {selected ? <CheckCircle2 size={18} className="text-md-primary" /> : null}
                        </div>
                        <div className="text-lg font-bold text-md-on-surface">{template.displayName}</div>
                        <p className="mt-2 min-h-12 text-sm leading-6 text-md-on-surface-variant">
                          {formatTemplateSubtitle(template)}
                        </p>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="rounded-[16px] border border-md-outline-variant/25 bg-white/72 px-3 py-3">
                            <div className="text-[11px] font-semibold text-md-on-surface-variant">模板</div>
                            <div className="mt-1 truncate text-sm font-bold text-md-on-surface">{template.templateKey}</div>
                          </div>
                          <div className="rounded-[16px] border border-md-outline-variant/25 bg-white/72 px-3 py-3">
                            <div className="text-[11px] font-semibold text-md-on-surface-variant">机器人</div>
                            <div className="mt-1 text-sm font-bold text-md-on-surface">{template.agentCount}</div>
                          </div>
                          <div className="rounded-[16px] border border-md-outline-variant/25 bg-white/72 px-3 py-3">
                            <div className="text-[11px] font-semibold text-md-on-surface-variant">扩展</div>
                            <div className="mt-1 text-sm font-bold text-md-on-surface">{template.skillCount}</div>
                          </div>
                        </div>

                        {template.tags.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {template.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-md-outline-variant/35 bg-white/72 px-3 py-1 text-[11px] font-semibold text-md-on-surface-variant"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <aside className="border-t border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.64)_100%)] px-7 py-6 lg:border-l lg:border-t-0">
              <div className="rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.68)_100%)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="text-base font-bold text-md-on-surface">领养设置</div>
                <div className="mt-1 text-sm leading-6 text-md-on-surface-variant">
                  配置完成后会自动绑定到当前账号。
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-md-on-surface">机器人名称</div>
                    <Input
                      value={robotName}
                      onChange={(event) => {
                        setRobotName(event.target.value);
                        setNameEdited(true);
                      }}
                      placeholder="给你的机器人取个名字"
                      size="large"
                      maxLength={48}
                      disabled={submitting}
                    />
                  </div>

                  <div className="rounded-[18px] border border-md-outline-variant/25 bg-white/76 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-md-on-surface">创建后立即启动</div>
                        <div className="mt-1 text-xs leading-6 text-md-on-surface-variant">
                          开启后，机器人会在领养完成后自动启动，方便你立即进入聊天。
                        </div>
                      </div>
                      <Switch checked={autoStart} onChange={setAutoStart} disabled={submitting} />
                    </div>
                  </div>

                  {selectedTemplate ? (
                    <div className="rounded-[18px] border border-md-outline-variant/25 bg-[linear-gradient(135deg,rgba(255,122,24,0.08),rgba(139,61,255,0.06))] p-4">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-md-on-surface">
                        <Rocket size={15} />
                        已选模板：{selectedTemplate.displayName}
                      </div>
                      <div className="mt-2 text-xs leading-6 text-md-on-surface-variant">
                        {selectedTemplate.primaryAgentKey?.trim()
                          ? `默认会进入 ${selectedTemplate.primaryAgentKey} 对话。`
                          : "创建完成后会自动进入可用对话。"}
                      </div>
                    </div>
                  ) : null}

                  {submitting ? (
                    <div className="rounded-[18px] border border-violet-100 bg-violet-50/80 p-4 text-sm text-violet-700">
                      <div className="inline-flex items-center gap-2 font-semibold">
                        <LoaderCircle size={16} className="animate-spin" />
                        {loadingHints[loadingHintIndex]}
                      </div>
                      <div className="mt-2 text-xs leading-6 text-violet-600">
                        首次创建可能需要几十秒，请不要关闭当前窗口。
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-md-outline-variant/40 bg-white px-4 py-3 text-sm font-semibold text-md-on-surface transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !selectedTemplate || !robotName.trim()}
                    className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(139,61,255,0.16)] transition hover:shadow-[0_18px_36px_rgba(139,61,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Bot size={16} />}
                    立即领养
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </Modal>
    </>
  );
}
