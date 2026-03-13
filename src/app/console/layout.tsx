import { cookies } from "next/headers";
import { ConsoleAccessGate } from "@/components/console-access-gate";
import { ConsoleThemeProvider } from "@/components/console-theme-provider";
import {
  CONSOLE_ACCESS_COOKIE_NAME,
  hasConsoleAccess,
  isConsoleAccessPasswordConfigured,
} from "@/lib/console-access";

export default async function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const consoleAccessCookie = cookieStore.get(CONSOLE_ACCESS_COOKIE_NAME)?.value;

  if (!hasConsoleAccess(consoleAccessCookie)) {
    return (
      <ConsoleThemeProvider>
        <ConsoleAccessGate passwordConfigured={isConsoleAccessPasswordConfigured()} />
      </ConsoleThemeProvider>
    );
  }

  return (
    <ConsoleThemeProvider>
      {children}
    </ConsoleThemeProvider>
  );
}
