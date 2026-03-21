"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useSearchParams } from "next/navigation";
import { useRequireUserCenterAuth } from "@/lib/use-require-user-center-auth";
import { MessageComposer } from "./message-composer";
import { MessageSessionPanel } from "./message-session-panel";
import { MessageSidebar } from "./message-sidebar";
import { MessageThread } from "./message-thread";
import { MessageTopbar } from "./message-topbar";
import { useMessageRobots } from "./use-message-robots";
import { useMessageSession } from "./use-message-session";
import { useMessageSessionActivity } from "./use-message-session-activity";
import { useMessageSessionList } from "./use-message-session-list";

const ROBOT_SWITCH_COOLDOWN_MS = 240;
const THREAD_LOADING_REVEAL_DELAY_MS = 180;

function MessagePageContent() {
  const [messageApi, messageContextHolder] = message.useMessage();
  const searchParams = useSearchParams();
  const preferredInstanceId = searchParams.get("instanceId")?.trim() || undefined;
  const preferredAgentId = searchParams.get("agentId")?.trim() || undefined;
  const preferredSessionId = searchParams.get("sessionId")?.trim() || undefined;

  const {
    robots,
    selectedRobot,
    selectedRobotId,
    setSelectedRobotId,
    loading,
    error: robotsError,
    refresh,
  } = useMessageRobots({
    preferredInstanceId,
    preferredAgentId,
  });

  const sessionList = useMessageSessionList({
    robots,
    selectedRobot,
    preferredSessionId,
  });

  const sessionActivity = useMessageSessionActivity();
  const [closingSessionId, setClosingSessionId] = useState<string>();
  const [deletingSessionId, setDeletingSessionId] = useState<string>();
  const [renamingSessionId, setRenamingSessionId] = useState<string>();
  const [switchingRobotId, setSwitchingRobotId] = useState<string>();
  const [robotSwitchCooldown, setRobotSwitchCooldown] = useState(false);
  const [threadLoadingVisible, setThreadLoadingVisible] = useState(false);

  const session = useMessageSession({
    selectedRobot,
    selectedSession: sessionList.selectedSession,
    ensureSession: sessionList.ensureSession,
    refreshSessions: sessionList.refresh,
  });

  const robotSwitchReady = Boolean(
    switchingRobotId
    && selectedRobot?.id === switchingRobotId
    && sessionList.selectedSessionId
    && session.currentSessionId === sessionList.selectedSessionId
    && !session.sessionLoading,
  );
  const robotSwitching = Boolean(switchingRobotId) && !robotSwitchReady;
  const robotSwitchInteractionLocked = robotSwitching || robotSwitchCooldown;
  const showRobotSwitchLoading = Boolean(
    switchingRobotId
    && selectedRobot?.id === switchingRobotId
    && !robotSwitchReady
    && (
      session.sessionLoading
      || (
        Boolean(sessionList.selectedSessionId)
        && session.currentSessionId !== sessionList.selectedSessionId
      )
    ),
  );
  const threadLoading = session.sessionLoading || showRobotSwitchLoading;

  const isCurrentSessionSelected = Boolean(
    session.currentSessionId
    && (!sessionList.selectedSessionId || sessionList.selectedSessionId === session.currentSessionId),
  );

  const panelSessions = useMemo(
    () => sessionList.sessionItems.map((item) => {
      const isCurrent = item.sessionId === session.currentSessionId;
      const remoteConnected = Boolean(item.remoteConnected);
      const starting = isCurrent && session.sessionPhase === "starting";
      const sending = isCurrent && session.sessionPhase === "sending";
      const generating = Boolean(item.generating) || (isCurrent && session.sessionPhase === "generating");
      const connected = (session.connected && isCurrent) || remoteConnected;

      let statusLabel = "待开始";
      if (item.status === "CLOSED") {
        statusLabel = "已关闭";
      } else if (starting) {
        statusLabel = "启动中";
      } else if (sending) {
        statusLabel = "发送中";
      } else if (generating) {
        statusLabel = "思考中";
      } else if (session.connected && isCurrent) {
        statusLabel = "对话中";
      } else if (remoteConnected) {
        statusLabel = "后台在线";
      }

      return {
        ...item,
        isCurrent,
        starting,
        sending,
        connected,
        remoteConnected,
        generating,
        statusLabel,
      };
    }),
    [session.connected, session.currentSessionId, session.sessionPhase, sessionList.sessionItems],
  );

  const activityByRobotId = useMemo(() => {
    const next = { ...sessionActivity.activityByRobotId };
    if (!selectedRobotId) {
      return next;
    }

    const current = next[selectedRobotId] ?? {
      activeSessionCount: 0,
      connectedSessionCount: 0,
      generatingSessionCount: 0,
    };

    next[selectedRobotId] = {
      activeSessionCount: Math.max(
        current.activeSessionCount,
        sessionList.sessionItems.filter((item) => item.status === "ACTIVE").length,
      ),
      connectedSessionCount: Math.max(current.connectedSessionCount, session.connected ? 1 : 0),
      generatingSessionCount: Math.max(current.generatingSessionCount, session.pendingResponse ? 1 : 0),
    };

    return next;
  }, [
    selectedRobotId,
    session.connected,
    session.pendingResponse,
    sessionActivity.activityByRobotId,
    sessionList.sessionItems,
  ]);

  const selectedSession = useMemo(
    () => panelSessions.find((item) => item.sessionId === sessionList.selectedSessionId),
    [panelSessions, sessionList.selectedSessionId],
  );

  const topbarStatus = useMemo(() => {
    if (selectedSession?.status === "CLOSED") {
      return { label: "已关闭", tone: "closed" as const };
    }
    if (isCurrentSessionSelected && session.sessionPhase === "starting") {
      return { label: "启动中", tone: "starting" as const };
    }
    if (isCurrentSessionSelected && session.sessionPhase === "sending") {
      return { label: "发送中", tone: "sending" as const };
    }
    if (selectedSession?.generating) {
      return { label: "思考中", tone: "generating" as const };
    }
    if (isCurrentSessionSelected && session.connected) {
      return { label: "对话中", tone: "connected" as const };
    }
    if (selectedSession?.remoteConnected) {
      return { label: "后台在线", tone: "remote" as const };
    }
    if (isCurrentSessionSelected && session.connecting) {
      return { label: "准备中", tone: "starting" as const };
    }
    return { label: "待开始", tone: "idle" as const };
  }, [isCurrentSessionSelected, selectedSession?.generating, selectedSession?.remoteConnected, selectedSession?.status, session.connected, session.connecting, session.sessionPhase]);

  const threadStatusLabel = useMemo(() => {
    if (!isCurrentSessionSelected) {
      return undefined;
    }
    if (session.sessionPhase === "starting") {
      return "启动会话中...";
    }
    if (session.sessionPhase === "sending") {
      return "消息发送中...";
    }
    if (session.sessionPhase === "generating") {
      return "思考中...";
    }
    return undefined;
  }, [isCurrentSessionSelected, session.sessionPhase]);

  const viewOnly = selectedSession?.status === "CLOSED";
  const threadEmptyNotice = viewOnly
    ? "当前会话已关闭，可以查看历史记录；如需继续聊天，请新建一个会话。"
    : !selectedSession
      ? "当前机器人还没有会话，点击“新会话”或直接发送第一条消息即可开始。"
      : undefined;

  const handleCreateSession = useCallback(async () => {
    try {
      await sessionList.createSession();
      await sessionActivity.refreshActivity();
    } catch (createError) {
      session.setError(undefined);
      messageApi.error(createError instanceof Error ? createError.message : "创建会话失败");
    }
  }, [messageApi, session, sessionActivity, sessionList]);

  const handleCloseSession = useCallback(async (sessionId: string) => {
    setClosingSessionId(sessionId);
    try {
      if (session.currentSessionId === sessionId) {
        session.disconnect(true);
      }
      await sessionList.closeSession(sessionId);
      await sessionActivity.refreshActivity();
    } catch (closeError) {
      session.setError(closeError instanceof Error ? closeError.message : "关闭会话失败");
    } finally {
      setClosingSessionId((current) => (current === sessionId ? undefined : current));
    }
  }, [session, sessionActivity, sessionList]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setDeletingSessionId(sessionId);
    try {
      if (session.currentSessionId === sessionId) {
        session.disconnect(true);
      }
      await sessionList.deleteSession(sessionId);
      await sessionActivity.refreshActivity();
    } catch (deleteError) {
      session.setError(deleteError instanceof Error ? deleteError.message : "删除会话失败");
      throw deleteError;
    } finally {
      setDeletingSessionId((current) => (current === sessionId ? undefined : current));
    }
  }, [session, sessionActivity, sessionList]);

  const handleRenameSession = useCallback(async (sessionId: string, title: string) => {
    setRenamingSessionId(sessionId);
    try {
      await sessionList.renameSession(sessionId, title);
    } catch (renameError) {
      session.setError(renameError instanceof Error ? renameError.message : "修改会话名失败");
      throw renameError;
    } finally {
      setRenamingSessionId((current) => (current === sessionId ? undefined : current));
    }
  }, [session, sessionList]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!switchingRobotId) {
      return;
    }
    if (selectedRobot?.id !== switchingRobotId) {
      return;
    }
    if (robotSwitchReady || (!sessionList.loading && !session.sessionLoading)) {
      setSwitchingRobotId(undefined);
      setRobotSwitchCooldown(true);
    }
  }, [robotSwitchReady, selectedRobot?.id, session.sessionLoading, sessionList.loading, switchingRobotId]);

  useEffect(() => {
    if (!robotSwitchCooldown) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRobotSwitchCooldown(false);
    }, ROBOT_SWITCH_COOLDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [robotSwitchCooldown]);

  useEffect(() => {
    if (!threadLoading) {
      setThreadLoadingVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setThreadLoadingVisible(true);
    }, THREAD_LOADING_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [threadLoading]);

  return (
    <>
      {messageContextHolder}
      <main className="brand-sunset-theme h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.16),transparent_24%),linear-gradient(180deg,#fffaf7_0%,#fff7fb_48%,#f8f4ff_100%)]">
        <div className="mx-auto grid h-full max-w-[1920px] gap-4 p-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px] lg:p-6">
        <MessageSidebar
          robots={robots}
          selectedRobotId={selectedRobotId}
          loading={loading}
          error={robotsError}
          activityByRobotId={activityByRobotId}
          switchingRobotId={switchingRobotId}
          interactionLocked={robotSwitchInteractionLocked}
          onSelect={(robotId) => {
            if (robotSwitchInteractionLocked || robotId === selectedRobotId) {
              return;
            }
            setSwitchingRobotId(robotId);
            setSelectedRobotId(robotId);
          }}
          onRefresh={() => {
            void Promise.allSettled([refresh(), sessionActivity.refreshActivity()]);
          }}
        />

        <section className="flex min-h-0 flex-col gap-4">
          <MessageTopbar
            selectedRobot={selectedRobot}
            connected={session.connected}
            connecting={session.connecting}
            remoteConnected={selectedSession?.remoteConnected}
            generating={selectedSession?.generating}
            statusLabel={topbarStatus.label}
            statusTone={topbarStatus.tone}
            notice={session.notice}
            error={session.error ?? sessionList.error}
            canCloseSession={selectedSession?.status === "ACTIVE"}
            closingSession={Boolean(selectedSession && closingSessionId === selectedSession.sessionId)}
            onCloseSession={() => {
              if (!selectedSession?.sessionId) {
                return;
              }
              void handleCloseSession(selectedSession.sessionId);
            }}
            onNewSession={() => {
              void handleCreateSession();
            }}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white/78 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <MessageThread
              selectedRobot={selectedRobot}
              messages={session.messages}
              pendingResponse={session.pendingResponse}
              statusLabel={threadStatusLabel}
              loading={threadLoadingVisible}
              selectedSessionTitle={selectedSession?.title}
              emptyNotice={threadEmptyNotice}
              interactionsEnabled={!viewOnly}
              onAction={session.runInteractionAction}
            />

            <MessageComposer
              selectedRobot={selectedRobot}
              input={session.input}
              canSend={session.canSend && !viewOnly}
              connecting={session.connecting || session.sessionLoading || session.sessionPhase === "starting" || robotSwitching}
              connected={session.connected}
              interactionDraft={session.interactionDraft}
              inputLocked={session.inputLocked && !viewOnly}
              inputLockedHint="正在生成上一轮回复，请等待完成后再继续发送"
              viewOnly={viewOnly}
              viewOnlyHint={threadEmptyNotice}
              onInputChange={session.setInput}
              onSend={() => {
                void session.sendMessage();
              }}
              onCancelDraft={() => {
                session.setInput("");
                session.clearInteractionDraft();
              }}
              onKeyDown={session.handleInputKeyDown}
              onCompositionStart={session.handleCompositionStart}
              onCompositionEnd={session.handleCompositionEnd}
            />
          </div>
        </section>

        <div className="hidden min-h-0 xl:block">
            <MessageSessionPanel
              sessions={panelSessions}
              selectedSessionId={sessionList.selectedSessionId}
              loading={sessionList.loading}
              switching={session.sessionLoading || showRobotSwitchLoading}
              error={sessionList.error}
              onSelect={sessionList.setSelectedSessionId}
              onRefresh={() => {
                void Promise.allSettled([sessionList.refresh(), sessionActivity.refreshActivity()]);
              }}
              onClose={handleCloseSession}
              onDelete={handleDeleteSession}
              onRename={handleRenameSession}
              closingSessionId={closingSessionId}
              deletingSessionId={deletingSessionId}
              renamingSessionId={renamingSessionId}
            />
        </div>
        </div>
      </main>
    </>
  );
}

export function MessagePage() {
  const { checking, authenticated } = useRequireUserCenterAuth();

  if (checking || !authenticated) {
    return (
      <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1200px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">正在校验登录状态...</div>
          <div className="mt-4 text-base font-semibold text-slate-500">未登录用户将自动跳转到登录页</div>
        </div>
      </main>
    );
  }

  return <MessagePageContent />;
}
