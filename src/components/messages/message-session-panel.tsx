"use client";

import { useState } from "react";
import { AlertTriangle, Clock3, LoaderCircle, MessagesSquare, PencilLine, Radio, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTimestamp } from "./messages-data";
import type { MessageSessionListItem } from "./use-message-session-list";

const SESSION_TITLE_MAX_LENGTH = 10;

const text = {
  panelTitle: "\u4f1a\u8bdd\u5217\u8868",
  panelSubtitle: "\u5c55\u793a\u5f53\u524d\u667a\u80fd\u4f53\u4e0b\u7684\u5168\u90e8\u4f1a\u8bdd",
  refreshSessions: "\u5237\u65b0\u4f1a\u8bdd\u5217\u8868",
  current: "\u5f53\u524d",
  switching: "\u5207\u6362\u4e2d",
  emptyTitle: "\u6682\u65e0\u4f1a\u8bdd",
  emptyDescription: "\u5f53\u524d\u667a\u80fd\u4f53\u8fd8\u6ca1\u6709\u53ef\u5c55\u793a\u7684\u4f1a\u8bdd\uff0c\u53d1\u51fa\u7b2c\u4e00\u6761\u6d88\u606f\u540e\u8fd9\u91cc\u5c31\u4f1a\u51fa\u73b0\u65b0\u4f1a\u8bdd\u3002",
  transcriptReady: "\u53ef\u67e5\u770b\u5185\u5bb9",
  sessionMetaOnly: "\u4ec5\u4f1a\u8bdd\u4fe1\u606f",
  renameLabel: "\u4fee\u6539\u540d\u79f0",
  renameTitle: "\u4fee\u6539\u4f1a\u8bdd\u540d",
  renameDescription: "\u6700\u591a 10 \u4e2a\u5b57\u7b26\uff0c\u4e2d\u6587\u6309 2 \u4e2a\u5b57\u7b26\u8ba1\u7b97\u3002",
  renameFieldLabel: "\u4f1a\u8bdd\u540d\u79f0",
  renamePlaceholder: "\u8f93\u5165\u65b0\u7684\u4f1a\u8bdd\u540d",
  renameCurrentPrefix: "\u5f53\u524d\u4f1a\u8bdd\uff1a",
  renameEmptyError: "\u8bf7\u8f93\u5165\u4f1a\u8bdd\u540d",
  renameTooLongError: "\u4f1a\u8bdd\u540d\u6700\u591a 10 \u4e2a\u5b57\u7b26",
  renameFailedError: "\u4fee\u6539\u4f1a\u8bdd\u540d\u5931\u8d25",
  deleteLabel: "\u5220\u9664\u4f1a\u8bdd",
  deleteTitle: "\u786e\u8ba4\u5220\u9664\u8be5\u4f1a\u8bdd\uff1f",
  deleteDescription: "\u5220\u9664\u540e\u5c06\u65e0\u6cd5\u6062\u590d\u8fd9\u6bb5\u804a\u5929\u8bb0\u5f55\uff0c\u8bf7\u786e\u8ba4\u540e\u518d\u7ee7\u7eed\u3002",
  deleteBlockTitle: "\u5c06\u88ab\u5220\u9664",
  deleteBlockDescription: "\u5220\u9664\u540e\u4f1a\u6e05\u7a7a\u8be5\u4f1a\u8bdd\u7684\u5386\u53f2\u6d88\u606f\uff0c\u4e14\u65e0\u6cd5\u6062\u590d\u3002",
  deleteFailedError: "\u5220\u9664\u4f1a\u8bdd\u5931\u8d25",
  closeDialogAria: "\u5173\u95ed\u5f39\u7a97",
  cancel: "\u53d6\u6d88",
  save: "\u4fdd\u5b58",
  saving: "\u4fdd\u5b58\u4e2d...",
  confirmDelete: "\u786e\u8ba4\u5220\u9664",
  deleting: "\u5220\u9664\u4e2d...",
  closeSession: "\u7ed3\u675f",
  closingSession: "\u7ed3\u675f\u4e2d...",
  deleteSession: "\u5220\u9664",
  deletingSession: "\u5220\u9664\u4e2d...",
  remoteConnected: "\u540e\u53f0\u5728\u7ebf",
};

function getCharacterLengthUnit(value: string) {
  const codePoint = value.codePointAt(0);
  if (codePoint == null) {
    return 0;
  }
  return codePoint <= 0x7f ? 1 : 2;
}

function clampSessionTitle(value: string) {
  let result = "";
  let currentLength = 0;

  for (const char of Array.from(value.trim())) {
    const nextLength = currentLength + getCharacterLengthUnit(char);
    if (nextLength > SESSION_TITLE_MAX_LENGTH) {
      break;
    }
    result += char;
    currentLength = nextLength;
  }

  return result;
}

function getSessionTitleLength(value: string) {
  return Array.from(value.trim()).reduce((total, char) => total + getCharacterLengthUnit(char), 0);
}

export function MessageSessionPanel({
  sessions,
  selectedSessionId,
  loading,
  switching,
  error,
  onSelect,
  onRefresh,
  onClose,
  onDelete,
  onRename,
  closingSessionId,
  deletingSessionId,
  renamingSessionId,
}: {
  sessions: MessageSessionListItem[];
  selectedSessionId?: string;
  loading: boolean;
  switching?: boolean;
  error?: string;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
  onClose?: (sessionId: string) => Promise<unknown> | void;
  onDelete?: (sessionId: string) => Promise<unknown> | void;
  onRename?: (sessionId: string, title: string) => Promise<unknown>;
  closingSessionId?: string;
  deletingSessionId?: string;
  renamingSessionId?: string;
}) {
  const [renameTarget, setRenameTarget] = useState<MessageSessionListItem | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameError, setRenameError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<MessageSessionListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string>();

  const currentRenameLength = getSessionTitleLength(renameTitle);
  const renamePending = renamingSessionId === renameTarget?.sessionId;
  const deletePending = deletingSessionId === deleteTarget?.sessionId;

  const closeRenameModal = () => {
    if (renamePending) {
      return;
    }
    setRenameTarget(null);
    setRenameTitle("");
    setRenameError(undefined);
  };

  const openRenameModal = (session: MessageSessionListItem) => {
    setRenameTarget(session);
    setRenameTitle(session.title);
    setRenameError(undefined);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !onRename) {
      return;
    }

    const normalizedTitle = renameTitle.trim();
    if (!normalizedTitle) {
      setRenameError(text.renameEmptyError);
      return;
    }
    if (getSessionTitleLength(normalizedTitle) > SESSION_TITLE_MAX_LENGTH) {
      setRenameError(text.renameTooLongError);
      return;
    }
    if (normalizedTitle === renameTarget.title.trim()) {
      closeRenameModal();
      return;
    }

    setRenameError(undefined);
    try {
      await onRename(renameTarget.sessionId, normalizedTitle);
      closeRenameModal();
    } catch (renameActionError) {
      setRenameError(renameActionError instanceof Error ? renameActionError.message : text.renameFailedError);
    }
  };

  const closeDeleteModal = () => {
    if (deletePending) {
      return;
    }
    setDeleteTarget(null);
    setDeleteError(undefined);
  };

  const openDeleteModal = (session: MessageSessionListItem) => {
    setDeleteTarget(session);
    setDeleteError(undefined);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget || !onDelete) {
      return;
    }
    setDeleteError(undefined);
    try {
      await onDelete(deleteTarget.sessionId);
      closeDeleteModal();
    } catch (deleteActionError) {
      setDeleteError(deleteActionError instanceof Error ? deleteActionError.message : text.deleteFailedError);
    }
  };

  return (
    <>
      <aside className="flex min-h-0 h-full flex-col rounded-[32px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <div>
            <div className="text-sm font-bold text-slate-950">{text.panelTitle}</div>
            <div className="text-xs text-slate-500">{text.panelSubtitle}</div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label={text.refreshSessions}
          >
            <RefreshCw size={15} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-[20px] bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isSelected = session.sessionId === selectedSessionId;
                const isClosing = closingSessionId === session.sessionId;
                const isDeleting = deletingSessionId === session.sessionId;
                const isRenaming = renamingSessionId === session.sessionId;
                const isSwitching = Boolean(switching && isSelected);

                return (
                  <div
                    key={session.sessionId}
                    className={cn(
                      "flex items-start gap-2 rounded-[24px] border px-3 py-3 transition-all duration-300",
                      isSelected
                        ? "border-violet-200 bg-violet-50 shadow-[0_18px_40px_rgba(147,51,234,0.12)]"
                        : "border-white/70 bg-white/72 shadow-sm hover:bg-white",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(session.sessionId)}
                      disabled={switching}
                      className="min-w-0 flex-1 text-left disabled:cursor-wait disabled:opacity-80"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]",
                            session.generating
                              ? "bg-rose-100 text-rose-700"
                              : session.sending
                                ? "bg-sky-100 text-sky-700"
                                : session.starting
                                  ? "bg-violet-100 text-violet-700"
                                  : session.connected
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {session.connected || session.generating ? <Radio size={16} /> : <MessagesSquare size={16} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="min-w-0 truncate text-sm font-bold text-slate-950">
                            {session.title}
                          </div>

                          <div className="mt-1 flex min-h-6 items-center gap-2 overflow-hidden">
                            {session.isCurrent ? (
                              <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                {text.current}
                              </span>
                            ) : null}
                            {session.remoteConnected && !session.isCurrent ? (
                              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                                {text.remoteConnected}
                              </span>
                            ) : null}
                            {session.starting || session.sending || session.generating ? (
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  session.generating
                                    ? "bg-rose-50 text-rose-600"
                                    : session.sending
                                      ? "bg-sky-50 text-sky-700"
                                      : "bg-violet-50 text-violet-700",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full animate-pulse",
                                    session.generating
                                      ? "bg-rose-500"
                                      : session.sending
                                        ? "bg-sky-500"
                                        : "bg-violet-500",
                                  )}
                                />
                                {session.statusLabel}
                              </span>
                            ) : null}
                            {isSwitching ? (
                              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                                <LoaderCircle size={11} className="animate-spin" />
                                {text.switching}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                              {session.sourceLabel}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <div className="inline-flex items-center gap-1">
                              <Clock3 size={12} />
                              {session.updatedAt ? formatMessageTimestamp(session.updatedAt) : "--"}
                            </div>
                            <div>{session.hasTranscript ? text.transcriptReady : text.sessionMetaOnly}</div>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        disabled={isClosing || isDeleting || isRenaming || switching || !onRename}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition",
                          "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                        aria-label={`${text.renameTitle} ${session.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openRenameModal(session);
                        }}
                      >
                        <PencilLine size={14} />
                      </button>

                      {session.canClose ? (
                        <button
                          type="button"
                          disabled={isClosing || isDeleting || isRenaming || switching}
                          className={cn(
                            "inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                            "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                          aria-label={`${text.closeSession} ${session.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onClose?.(session.sessionId);
                          }}
                        >
                          {isClosing ? text.closingSession : text.closeSession}
                        </button>
                      ) : session.canDelete ? (
                        <button
                          type="button"
                          disabled={isDeleting || switching || isRenaming || !onDelete}
                          className={cn(
                            "inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                            "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                          aria-label={`${text.deleteLabel} ${session.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteModal(session);
                          }}
                        >
                          {isDeleting ? text.deletingSession : text.deleteSession}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/72 px-5 py-8 text-center">
              <div className="text-sm font-semibold text-slate-900">{text.emptyTitle}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                {text.emptyDescription}
              </div>
            </div>
          )}
        </div>
      </aside>

      {renameTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0.36))] px-4 py-6 backdrop-blur-md"
          onClick={closeRenameModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-session-title"
            aria-describedby="rename-session-description"
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
                    {text.renameLabel}
                  </div>
                  <h3 id="rename-session-title" className="mt-4 text-[28px] font-black tracking-[-0.04em] text-slate-950">
                    {text.renameTitle}
                  </h3>
                  <p id="rename-session-description" className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {text.renameDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRenameModal}
                  disabled={renamePending}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-slate-500 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={text.closeDialogAria}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {text.renameFieldLabel}
                </div>
                <input
                  value={renameTitle}
                  autoFocus
                  placeholder={text.renamePlaceholder}
                  disabled={renamePending}
                  className="mt-3 w-full rounded-[20px] border border-slate-200/90 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  onChange={(event) => {
                    setRenameTitle(clampSessionTitle(event.target.value));
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
                    <span className="font-semibold text-slate-600">{renameTarget.title}</span>
                  </span>
                  <span className={cn("font-bold", currentRenameLength >= SESSION_TITLE_MAX_LENGTH ? "text-orange-600" : "text-slate-400")}>
                    {currentRenameLength}/{SESSION_TITLE_MAX_LENGTH}
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
                  disabled={renamePending || !onRename}
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
            aria-labelledby="delete-session-title"
            aria-describedby="delete-session-description"
            className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,248,0.96)_52%,rgba(255,244,246,0.97)_100%)] shadow-[0_32px_100px_rgba(244,63,94,0.18)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_56%),radial-gradient(circle_at_top_right,rgba(255,122,24,0.16),transparent_52%)]" />

            <div className="relative px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 id="delete-session-title" className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
                    {text.deleteTitle}
                  </h3>
                  <p id="delete-session-description" className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {text.deleteDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deletePending}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/78 text-slate-500 shadow-sm transition hover:border-slate-200 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={text.closeDialogAria}
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
                      {deleteTarget.title}
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
                  disabled={deletePending || !onDelete}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f43f5e_0%,#fb7185_42%,#ff7a18_100%)] px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(244,63,94,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletePending ? text.deleting : text.confirmDelete}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
