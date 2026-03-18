import { Suspense } from "react";
import { MessagePage } from "@/components/messages/message-page";

export default function MessagesRoutePage() {
  return (
    <Suspense fallback={null}>
      <MessagePage />
    </Suspense>
  );
}
