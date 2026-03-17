"use client";

import { useEffect } from "react";
import { MessageComposer } from "./message-composer";
import { MessageSidebar } from "./message-sidebar";
import { MessageThread } from "./message-thread";
import { MessageTopbar } from "./message-topbar";
import { useMessageRobots } from "./use-message-robots";
import { useMessageSession } from "./use-message-session";

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
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(94,234,212,0.18),transparent_24%),linear-gradient(180deg,#f8fffe_0%,#f5fbff_48%,#f7fafc_100%)]">
      <div className="mx-auto grid h-full max-w-[1920px] gap-4 p-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:p-6">
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
              messages={session.messages}
              pendingResponse={session.pendingResponse}
              onAction={session.runInteractionAction}
            />

            <MessageComposer
              selectedRobot={selectedRobot}
              input={session.input}
              canSend={session.canSend}
              connecting={session.connecting}
              connected={session.connected}
              interactionDraft={session.interactionDraft}
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
      </div>
    </main>
  );
}
