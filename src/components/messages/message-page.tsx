"use client";

import { useCallback, useEffect, useMemo } from "react";
import { MessageComposer } from "./message-composer";
import { MessageSessionPanel } from "./message-session-panel";
import { MessageSidebar } from "./message-sidebar";
import { MessageThread } from "./message-thread";
import { MessageTopbar } from "./message-topbar";
import { useMessageRobots } from "./use-message-robots";
import { useMessageSession } from "./use-message-session";
import { useMessageSessionList } from "./use-message-session-list";

export function MessagePage() {
  const {
    robots,
    selectedRobot,
    selectedRobotId,
    setSelectedRobotId,
    loading,
    error: robotsError,
    refresh,
  } = useMessageRobots();

  const sessionList = useMessageSessionList({
    selectedRobot,
  });

  const session = useMessageSession({
    selectedRobot,
    selectedSession: sessionList.selectedSession,
    ensureSession: sessionList.ensureSession,
    refreshSessions: sessionList.refresh,
  });

  const panelSessions = useMemo(
    () => sessionList.sessionItems.map((item) => {
      const isCurrent = item.sessionId === session.currentSessionId;
      const connected = session.connected && isCurrent;

      return {
        ...item,
        isCurrent,
        connected,
        statusLabel: connected ? "连接中" : item.status === "ACTIVE" ? "活跃" : "已关闭",
      };
    }),
    [session.connected, session.currentSessionId, sessionList.sessionItems],
  );

  const selectedSession = useMemo(
    () => panelSessions.find((item) => item.sessionId === sessionList.selectedSessionId),
    [panelSessions, sessionList.selectedSessionId],
  );

  const viewOnly = selectedSession?.status === "CLOSED";
  const threadEmptyNotice = viewOnly
    ? "当前会话已关闭，可以查看历史记录；如需继续聊天，请新建一个会话。"
    : !selectedSession
      ? "当前 Agent 还没有会话，点击“新会话”或直接发送第一条消息即可开始。"
      : undefined;

  const handleCreateSession = useCallback(async () => {
    try {
      await sessionList.createSession();
    } catch (createError) {
      session.setError(createError instanceof Error ? createError.message : "创建会话失败");
    }
  }, [session, sessionList]);

  const handleCloseSession = useCallback(async (sessionId: string) => {
    try {
      if (session.currentSessionId === sessionId) {
        session.disconnect(true);
      }
      await sessionList.closeSession(sessionId);
    } catch (closeError) {
      session.setError(closeError instanceof Error ? closeError.message : "关闭会话失败");
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

  return (
    <main className="brand-sunset-theme h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.16),transparent_24%),linear-gradient(180deg,#fffaf7_0%,#fff7fb_48%,#f8f4ff_100%)]">
      <div className="mx-auto grid h-full max-w-[1920px] gap-4 p-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px] lg:p-6">
        <MessageSidebar
          robots={robots}
          selectedRobotId={selectedRobotId}
          loading={loading}
          error={robotsError}
          onSelect={setSelectedRobotId}
          onRefresh={() => void refresh()}
        />

        <section className="flex min-h-0 flex-col gap-4">
          <MessageTopbar
            selectedRobot={selectedRobot}
            loading={loading}
            connected={session.connected}
            connecting={session.connecting}
            notice={session.notice}
            error={session.error ?? sessionList.error}
            hasConversation={session.hasConversation}
            onRefreshRobots={() => void refresh()}
            onReconnect={() => {
              void session.reconnect();
            }}
            onDisconnect={() => {
              session.disconnect();
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
              selectedSessionTitle={selectedSession?.title}
              emptyNotice={threadEmptyNotice}
              interactionsEnabled={!viewOnly}
              onAction={session.runInteractionAction}
            />

            <MessageComposer
              selectedRobot={selectedRobot}
              input={session.input}
              canSend={session.canSend && !viewOnly}
              connecting={session.connecting}
              connected={session.connected}
              interactionDraft={session.interactionDraft}
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
            error={sessionList.error}
            onSelect={sessionList.setSelectedSessionId}
            onRefresh={() => void sessionList.refresh()}
            onClose={(sessionId) => {
              void handleCloseSession(sessionId);
            }}
          />
        </div>
      </div>
    </main>
  );
}
