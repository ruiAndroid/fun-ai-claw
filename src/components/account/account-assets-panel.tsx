"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle, PencilLine, RefreshCw, Trash2, X } from "lucide-react";
import { deleteConsumerInstance, listConsumerInstances, renameConsumerInstance } from "@/lib/consumer-api";
import { cn } from "@/lib/utils";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import type { ConsumerBoundInstance } from "@/types/consumer";

const MAX_INSTANCE_NAME_LENGTH = 128;

const text = {
  pageTitle: "\u6211\u7684\u8d44\u4ea7",
  pageDescription: "\u8fd9\u91cc\u5c55\u793a\u5f53\u524d\u8d26\u53f7\u5df2\u9886\u517b\u7684\u9f99\u867e\uff0c\u53ef\u4ee5\u76f4\u63a5\u8fdb\u884c\u6539\u540d\u548c\u5220\u9664\u7ba1\u7406\u3002",
  refresh: "\u5237\u65b0",
  refreshing: "\u5237\u65b0\u4e2d...",
  totalAssets: "\u5df2\u9886\u517b",
  runningAssets: "\u8fd0\u884c\u4e2d",
  stoppedAssets: "\u5df2\u505c\u6b62",
  errorTitle: "\u8d44\u4ea7\u5217\u8868\u52a0\u8f7d\u5931\u8d25",
  loadingTitle: "\u6b63\u5728\u52a0\u8f7d\u9f99\u867e\u8d44\u4ea7...",
  loadingDescription: "\u7a0d\u7b49\u4e00\u4e0b\uff0c\u6b63\u5728\u540c\u6b65\u4f60\u5df2\u9886\u517b\u7684\u9f99\u867e\u5217\u8868\u3002",
  emptyTitle: "\u6682\u65e0\u9f99\u867e\u8d44\u4ea7",
  emptyDescription: "\u4f60\u8fd8\u6ca1\u6709\u9886\u517b\u9f99\u867e\uff0c\u53ef\u4ee5\u5148\u53bb\u9996\u9875\u9886\u517b\u4e00\u53ea\uff0c\u7136\u540e\u518d\u56de\u6765\u7ba1\u7406\u3002",
  emptyCta: "\u53bb\u9996\u9875\u9886\u517b",
  statusLabel: "\u8fd0\u884c\u72b6\u6001",
  sourceLabel: "\u9886\u517b\u6765\u6e90",
  boundAtLabel: "\u9886\u517b\u65f6\u95f4",
  updatedAtLabel: "\u6700\u8fd1\u66f4\u65b0",
  renameAction: "\u6539\u540d",
  deleteAction: "\u5220\u9664",
  renameTag: "\u4fee\u6539\u540d\u79f0",
  renameTitle: "\u7ed9\u9f99\u867e\u91cd\u65b0\u547d\u540d",
  renameDescription: "\u540d\u79f0\u4f1a\u5728\u6d88\u606f\u9875\u3001\u8d44\u4ea7\u9875\u548c\u9886\u517b\u8bb0\u5f55\u4e2d\u540c\u6b65\u663e\u793a\u3002",
  renameFieldLabel: "\u9f99\u867e\u540d\u79f0",
  renamePlaceholder: "\u8f93\u5165\u65b0\u7684\u9f99\u867e\u540d\u79f0",
  renameCurrentPrefix: "\u5f53\u524d\u540d\u79f0\uff1a",
  renameEmptyError: "\u8bf7\u8f93\u5165\u9f99\u867e\u540d\u79f0",
  renameDuplicateError: "\u8be5\u9f99\u867e\u540d\u5df2\u5b58\u5728\uff0c\u8bf7\u6362\u4e00\u4e2a",
  renameTooLongError: "\u9f99\u867e\u540d\u6700\u591a 128 \u4e2a\u5b57\u7b26",
  renameFailedError: "\u4fee\u6539\u9f99\u867e\u540d\u5931\u8d25",
  deleteTag: "\u5220\u9664\u9f99\u867e",
  deleteTitle: "\u786e\u8ba4\u5220\u9664\u8fd9\u53ea\u9f99\u867e\uff1f",
  deleteDescription: "\u5220\u9664\u540e\uff0c\u5bf9\u5e94\u5b9e\u4f8b\u3001\u5bf9\u8bdd\u4f1a\u8bdd\u548c\u5386\u53f2\u6d88\u606f\u90fd\u4f1a\u4e00\u8d77\u6e05\u7406\uff0c\u8bf7\u8c28\u614e\u64cd\u4f5c\u3002",
  deleteBlockTitle: "\u5c06\u88ab\u5220\u9664\u7684\u9f99\u867e",
  deleteBlockDescription: "\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\uff0c\u5982\u679c\u53ea\u662f\u60f3\u8c03\u6574\u540d\u79f0\uff0c\u5efa\u8bae\u4f7f\u7528\u6539\u540d\u64cd\u4f5c\u3002",
  deleteSecondTag: "\u4e8c\u6b21\u786e\u8ba4",
  deleteSecondTitle: "\u8bf7\u518d\u6b21\u786e\u8ba4\u5220\u9664",
  deleteSecondDescription: "\u8fd9\u662f\u4e0d\u53ef\u6062\u590d\u7684\u9ad8\u98ce\u9669\u64cd\u4f5c\uff0c\u5220\u9664\u540e\u5c06\u65e0\u6cd5\u627e\u56de\u8fd9\u53ea\u9f99\u867e\u53ca\u5176\u76f8\u5173\u5bf9\u8bdd\u8bb0\u5f55\u3002",
  deleteSecondConfirm: "\u4ecd\u8981\u5220\u9664",
  deleteFailedError: "\u5220\u9664\u9f99\u867e\u5931\u8d25",
  cancel: "\u53d6\u6d88",
  save: "\u4fdd\u5b58",
  saving: "\u4fdd\u5b58\u4e2d...",
  confirmDelete: "\u786e\u8ba4\u5220\u9664",
  deleting: "\u5220\u9664\u4e2d...",
  closeDialog: "\u5173\u95ed\u5f39\u7a97",
};

function sortAssets(items: ConsumerBoundInstance[]) {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.bindingUpdatedAt ?? right.boundAt).getTime();
    const leftTime = new Date(left.bindingUpdatedAt ?? left.boundAt).getTime();
    return rightTime - leftTime;
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSourceType(sourceType?: string | null) {
  switch ((sourceType ?? "").toUpperCase()) {
    case "ADOPTION":
      return "\u9996\u9875\u9886\u517b";
    case "MANUAL":
      return "\u624b\u52a8\u7ed1\u5b9a";
    default:
      return sourceType?.trim() || "\u7cfb\u7edf";
  }
}

function formatInstanceStatus(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "RUNNING":
      return "\u8fd0\u884c\u4e2d";
    case "STOPPED":
      return "\u5df2\u505c\u6b62";
    case "CREATING":
      return "\u521d\u59cb\u5316\u4e2d";
    case "ERROR":
      return "\u5f02\u5e38";
    default:
      return status?.trim() || "\u672a\u77e5";
  }
}

function normalizeAssetName(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function clampAssetName(value: string) {
  return Array.from(value.trim()).slice(0, MAX_INSTANCE_NAME_LENGTH).join("");
}

export function AccountAssetsPanel() {
  const [assets, setAssets] = useState<ConsumerBoundInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingInstanceId, setRenamingInstanceId] = useState<string>();
  const [deletingInstanceId, setDeletingInstanceId] = useState<string>();
  const [renameTarget, setRenameTarget] = useState<ConsumerBoundInstance | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<ConsumerBoundInstance | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleteSecondaryConfirmOpen, setDeleteSecondaryConfirmOpen] = useState(false);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listConsumerInstances();
      setAssets(sortAssets(response.items));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text.errorTitle);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const runningCount = useMemo(
    () => assets.filter((item) => item.status === "RUNNING").length,
    [assets],
  );
  const stoppedCount = useMemo(
    () => assets.filter((item) => item.status === "STOPPED").length,
    [assets],
  );

  const renamePending = renameTarget ? renamingInstanceId === renameTarget.instanceId : false;
  const deletePending = deleteTarget ? deletingInstanceId === deleteTarget.instanceId : false;
  const deletePrimaryLocked = deletePending || deleteSecondaryConfirmOpen;

  const closeRenameModal = () => {
    if (renamePending) {
      return;
    }
    setRenameTarget(null);
    setRenameValue("");
    setRenameError(undefined);
  };

  const closeDeleteModal = () => {
    if (deletePending) {
      return;
    }
    setDeleteTarget(null);
    setDeleteError(undefined);
    setDeleteSecondaryConfirmOpen(false);
  };

  const closeDeleteSecondaryConfirm = () => {
    if (deletePending) {
      return;
    }
    setDeleteSecondaryConfirmOpen(false);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget) {
      return;
    }

    const normalizedValue = renameValue.trim();
    if (!normalizedValue) {
      setRenameError(text.renameEmptyError);
      return;
    }
    if (Array.from(normalizedValue).length > MAX_INSTANCE_NAME_LENGTH) {
      setRenameError(text.renameTooLongError);
      return;
    }

    const duplicateExists = assets.some((item) => (
      item.instanceId !== renameTarget.instanceId
      && normalizeAssetName(item.name) === normalizeAssetName(normalizedValue)
    ));
    if (duplicateExists) {
      setRenameError(text.renameDuplicateError);
      return;
    }
    if (normalizedValue === renameTarget.name.trim()) {
      closeRenameModal();
      return;
    }

    setRenamingInstanceId(renameTarget.instanceId);
    setRenameError(undefined);
    try {
      const renamed = await renameConsumerInstance(renameTarget.instanceId, { name: normalizedValue });
      setAssets((current) => sortAssets(current.map((item) => (
        item.instanceId === renamed.instanceId ? renamed : item
      ))));
      closeRenameModal();
    } catch (requestError) {
      setRenameError(requestError instanceof Error ? requestError.message : text.renameFailedError);
    } finally {
      setRenamingInstanceId(undefined);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeletingInstanceId(deleteTarget.instanceId);
    setDeleteError(undefined);
    try {
      await deleteConsumerInstance(deleteTarget.instanceId);
      setAssets((current) => current.filter((item) => item.instanceId !== deleteTarget.instanceId));
      closeDeleteModal();
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : text.deleteFailedError);
    } finally {
      setDeletingInstanceId(undefined);
    }
  };

  return (
    <>
      <section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">{text.pageTitle}</h1>
            <div className="mt-3 text-lg font-semibold text-slate-500">
              {text.pageDescription}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadAssets();
            }}
            className="inline-flex h-16 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-violet-500 px-12 text-[22px] font-black text-white shadow-[0_18px_40px_rgba(147,51,234,0.22)] transition-transform duration-300 hover:scale-[1.01]"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            {loading ? text.refreshing : text.refresh}
          </button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <article className="rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
            <div className="text-[18px] font-black tracking-[-0.03em] text-slate-500">{text.totalAssets}</div>
            <div className="mt-4 text-[42px] font-black leading-none tracking-[-0.05em] text-slate-950">{assets.length}</div>
          </article>
          <article className="rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
            <div className="text-[18px] font-black tracking-[-0.03em] text-slate-500">{text.runningAssets}</div>
            <div className="mt-4 text-[42px] font-black leading-none tracking-[-0.05em] text-emerald-600">{runningCount}</div>
          </article>
          <article className="rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
            <div className="text-[18px] font-black tracking-[-0.03em] text-slate-500">{text.stoppedAssets}</div>
            <div className="mt-4 text-[42px] font-black leading-none tracking-[-0.05em] text-slate-950">{stoppedCount}</div>
          </article>
        </div>

        {error ? (
          <div className="mt-8 rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-5 text-base font-semibold text-rose-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">{text.loadingTitle}</div>
            <div className="mt-3 text-lg font-semibold text-slate-400">
              {text.loadingDescription}
            </div>
          </div>
        ) : null}

        {!loading && assets.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">{text.emptyTitle}</div>
            <div className="mt-3 text-lg font-semibold text-slate-400">
              {text.emptyDescription}
            </div>
            <Link
              href="/"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-slate-900 px-8 text-base font-black text-white transition-transform duration-300 hover:scale-[1.01]"
            >
              {text.emptyCta}
            </Link>
          </div>
        ) : null}

        {!loading && assets.length > 0 ? (
          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            {assets.map((asset) => {
              const isRenaming = renamingInstanceId === asset.instanceId;
              const isDeleting = deletingInstanceId === asset.instanceId;

              return (
                <article
                  key={asset.instanceId}
                  className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,249,247,0.78)_100%)] p-7 shadow-[0_22px_50px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(255,122,24,0.16),rgba(139,61,255,0.14))] text-violet-700 shadow-[0_14px_28px_rgba(139,61,255,0.12)]">
                        <XiamiIcon size={32} title={asset.name} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[28px] font-black tracking-[-0.04em] text-slate-950">
                          {asset.name}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                              asset.status === "RUNNING"
                                ? "bg-emerald-100 text-emerald-700"
                                : asset.status === "ERROR"
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {formatInstanceStatus(asset.status)}
                          </span>
                          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                            {formatSourceType(asset.sourceType)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={isRenaming || isDeleting}
                        onClick={() => {
                          setRenameTarget(asset);
                          setRenameValue(asset.name);
                          setRenameError(undefined);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-500 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`${text.renameAction} ${asset.name}`}
                      >
                        <PencilLine size={18} />
                      </button>
                      <button
                        type="button"
                        disabled={isRenaming || isDeleting}
                        onClick={() => {
                          setDeleteTarget(asset);
                          setDeleteError(undefined);
                          setDeleteSecondaryConfirmOpen(false);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`${text.deleteAction} ${asset.name}`}
                      >
                        {isDeleting ? <LoaderCircle size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/80 bg-white/82 px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{text.statusLabel}</div>
                      <div className="mt-2 text-sm font-bold text-slate-900">{formatInstanceStatus(asset.status)}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/82 px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{text.sourceLabel}</div>
                      <div className="mt-2 text-sm font-bold text-slate-900">{formatSourceType(asset.sourceType)}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/82 px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{text.boundAtLabel}</div>
                      <div className="mt-2 text-sm font-bold text-slate-900">{formatDateTime(asset.boundAt)}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/82 px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{text.updatedAtLabel}</div>
                      <div className="mt-2 text-sm font-bold text-slate-900">{formatDateTime(asset.bindingUpdatedAt)}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {renameTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0.36))] px-4 py-6 backdrop-blur-md"
          onClick={closeRenameModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-asset-rename-title"
            aria-describedby="account-asset-rename-description"
            className="relative w-full max-w-[540px] overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,247,251,0.94)_54%,rgba(248,244,255,0.96)_100%)] shadow-[0_32px_100px_rgba(81,38,145,0.18)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.22),transparent_58%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.18),transparent_56%)]" />

            <div className="relative px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-sm">
                    <PencilLine size={14} className="text-orange-500" />
                    {text.renameTag}
                  </div>
                  <h3 id="account-asset-rename-title" className="mt-4 text-[28px] font-black tracking-[-0.04em] text-slate-950">
                    {text.renameTitle}
                  </h3>
                  <p id="account-asset-rename-description" className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {text.renameDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRenameModal}
                  disabled={renamePending}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-slate-500 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={text.closeDialog}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {text.renameFieldLabel}
                </div>
                <input
                  value={renameValue}
                  autoFocus
                  placeholder={text.renamePlaceholder}
                  disabled={renamePending}
                  className="mt-3 w-full rounded-[20px] border border-slate-200/90 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  onChange={(event) => {
                    setRenameValue(clampAssetName(event.target.value));
                    if (renameError) {
                      setRenameError(undefined);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleRenameSubmit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeRenameModal();
                    }
                  }}
                />

                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400">
                    {text.renameCurrentPrefix}
                    <span className="font-semibold text-slate-600">{renameTarget.name}</span>
                  </span>
                  <span className={cn("font-bold", Array.from(renameValue.trim()).length >= MAX_INSTANCE_NAME_LENGTH ? "text-orange-600" : "text-slate-400")}>
                    {Array.from(renameValue.trim()).length}/{MAX_INSTANCE_NAME_LENGTH}
                  </span>
                </div>
              </div>

              {renameError ? (
                <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {renameError}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  disabled={renamePending}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 bg-white/78 px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleRenameSubmit();
                  }}
                  disabled={renamePending}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_38%,#8b3dff_100%)] px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(139,61,255,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {renamePending ? text.saving : text.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[81] flex items-center justify-center bg-[linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0.38))] px-4 py-6 backdrop-blur-md"
          onClick={closeDeleteModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-asset-delete-title"
            aria-describedby="account-asset-delete-description"
            className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,248,0.96)_52%,rgba(255,244,246,0.97)_100%)] shadow-[0_32px_100px_rgba(244,63,94,0.18)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_56%),radial-gradient(circle_at_top_right,rgba(255,122,24,0.16),transparent_52%)]" />

            <div className="relative px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-1 text-xs font-bold text-rose-600 shadow-sm backdrop-blur-sm">
                    <Trash2 size={14} />
                    {text.deleteTag}
                  </div>
                  <h3 id="account-asset-delete-title" className="mt-4 text-[28px] font-black tracking-[-0.04em] text-slate-950">
                    {text.deleteTitle}
                  </h3>
                  <p id="account-asset-delete-description" className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {text.deleteDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deletePrimaryLocked}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-slate-500 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={text.closeDialog}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,245,247,0.94)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-rose-100 text-rose-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-400">
                      {text.deleteBlockTitle}
                    </div>
                    <div className="mt-2 truncate text-lg font-black tracking-[-0.03em] text-slate-950">
                      {deleteTarget.name}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">
                      {text.deleteBlockDescription}
                    </div>
                  </div>
                </div>
              </div>

              {deleteError ? (
                <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {deleteError}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deletePrimaryLocked}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 bg-white/78 px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(undefined);
                    setDeleteSecondaryConfirmOpen(true);
                  }}
                  disabled={deletePrimaryLocked}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f43f5e_0%,#fb7185_42%,#ff7a18_100%)] px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(244,63,94,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletePending ? text.deleting : text.confirmDelete}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget && deleteSecondaryConfirmOpen ? (
        <div
          className="fixed inset-0 z-[82] flex items-center justify-center bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.42))] px-4 py-6 backdrop-blur-sm"
          onClick={closeDeleteSecondaryConfirm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-asset-delete-second-title"
            aria-describedby="account-asset-delete-second-description"
            className="relative w-full max-w-[460px] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,245,246,0.98)_100%)] shadow-[0_32px_100px_rgba(244,63,94,0.24)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.18),transparent_62%)]" />

            <div className="relative px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/86 px-3 py-1 text-xs font-bold text-rose-600 shadow-sm">
                    <AlertTriangle size={14} />
                    {text.deleteSecondTag}
                  </div>
                  <h3 id="account-asset-delete-second-title" className="mt-4 text-[24px] font-black tracking-[-0.04em] text-slate-950">
                    {text.deleteSecondTitle}
                  </h3>
                  <p id="account-asset-delete-second-description" className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {text.deleteSecondDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteSecondaryConfirm}
                  disabled={deletePending}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-slate-500 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={text.closeDialog}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 rounded-[24px] border border-rose-100 bg-white/88 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-400">
                  {text.deleteBlockTitle}
                </div>
                <div className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-950">
                  {deleteTarget.name}
                </div>
              </div>

              {deleteError ? (
                <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {deleteError}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteSecondaryConfirm}
                  disabled={deletePending}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 bg-white/78 px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteSubmit();
                  }}
                  disabled={deletePending}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#e11d48_0%,#f43f5e_48%,#ff7a18_100%)] px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletePending ? text.deleting : text.deleteSecondConfirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
