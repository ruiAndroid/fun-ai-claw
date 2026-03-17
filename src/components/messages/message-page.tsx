"use client";

import { useEffect, useMemo } from "react";
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

  const session = useMessageSession(selectedRobot);
  const sessionList = useMessageSessionList({
    selectedRobot,
    currentSessionId: session.currentSessionId,
    hasConversation: session.hasConversation,
    sessionArchives: session.sessionArchives,
  });

  const selectedArchive = useMemo(
    () => session.sessionArchives.find((item) => item.sessionId === sessionList.selectedSessionId),
    [session.sessionArchives, sessionList.selectedSessionId],
  );

  const isViewingCurrentSession = !sessionList.selectedSessionId
    || sessionList.selectedSessionId === session.currentSessionId
    || (session.hasConversation && !session.currentSessionId && sessionList.selectedSession?.isDraft);

  const threadMessages = isViewingCurrentSession
    ? session.messages
    : selectedArchive?.messages ?? [];

  const viewOnly = Boolean(
    sessionList.selectedSessionId
    && !isViewingCurrentSession,
  );

  const threadEmptyNotice = viewOnly
    ? selectedArchive
      ? "这是你在当前页面里已打开过的旧会话快照；本版先支持查看，若要继续聊天请切回当前会话或新建会话。"
      : "该会话目前只能展示概要信息，因为控制台接口暂未提供按 sessionId 回放历史消息的能力。"
    : undefined;

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
    <main className="brand-sunset-theme h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,138,26,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_24%),linear-gradient(180deg,#fff9fc_0%,#fff6fb_48%,#faf7ff_100%)]">
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
            error={session.error}
            hasConversation={session.hasConversation}
            onRefreshRobots={() => void refresh()}
            onReconnect={() => {
              session.reconnect();
            }}
            onDisconnect={() => {
              session.disconnect();
            }}
            onNewSession={session.startNewSession}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white/78 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <MessageThread
              selectedRobot={selectedRobot}
              messages={threadMessages}
              pendingResponse={isViewingCurrentSession ? session.pendingResponse : false}
              selectedSessionTitle={sessionList.selectedSession?.title}
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
                session.sendMessage();
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
            sessions={sessionList.sessionItems}
            selectedSessionId={sessionList.selectedSessionId}
            loading={sessionList.loading}
            error={sessionList.error}
            onSelect={sessionList.setSelectedSessionId}
            onRefresh={() => void sessionList.refresh()}
          />
        </div>
      </div>
    </main>
  );
}
