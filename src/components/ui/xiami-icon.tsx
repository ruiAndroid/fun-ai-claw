"use client";

import { cn } from "@/lib/utils";

export function XiamiIcon({
  className,
  size = 20,
  title = "虾米",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      <path
        d="M48.8 14.9c-7.8-5.1-18.6-3.1-24 4.5-4.9 6.8-4.3 15.8.8 22L18 49.3l10.1 1.2 4.5 9.1 5.7-8.1c8 1.3 16.2-2.2 20.3-9.3 5.4-9.2 2.3-21-6.8-27.3Z"
        fill="#fb7185"
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M47.8 15.1 59 10.8l-2.7 10.7-8.5-4.2Z"
        fill="#f97316"
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M27.8 22.3c4.4-5.2 12.3-6.2 18-2.2 5.9 4.1 7.9 12.1 4.7 18.5-3.5 7-11.9 10.3-19.2 7.5-7.3-2.7-11.1-10.8-8.5-18.4"
        fill="#fdba74"
        fillOpacity="0.9"
      />
      <path
        d="M19.4 18.8C14 14.7 10.2 10.4 8 5.4"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16.8 23.9c-4.5-.8-8.7-.4-12.8 1.1"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M28.7 23.5c1.5 1.6 2.2 3.2 2.2 4.8 0 2.2-1.2 4.1-3.5 5.8"
        fill="none"
        stroke="#fff7ed"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M34.9 20.2c1.8 1.4 2.8 3 3 4.8.3 2.2-.6 4.4-2.5 6.7"
        fill="none"
        stroke="#fff7ed"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M41.7 19.5c1.6 1.6 2.3 3.5 2.2 5.6-.1 1.8-.9 3.5-2.2 5.1"
        fill="none"
        stroke="#fff7ed"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="47.2" cy="24" r="2.5" fill="#0f172a" />
    </svg>
  );
}
