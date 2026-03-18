import Image from "next/image";
import type { UserCenterMe } from "@/types/user-center";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUserStatus(status?: string | null) {
  if (!status) {
    return "未知";
  }
  if (status === "1") {
    return "启用";
  }
  if (status === "0") {
    return "禁用";
  }
  return status;
}

function buildUserRows(profile: UserCenterMe) {
  return [
    { label: "昵称", value: profile.nickname || "暂无" },
    { label: "手机号", value: profile.phoneMasked || profile.phone || "暂无" },
    { label: "邀请码", value: profile.invitationCode || "暂无" },
    { label: "注册时间", value: formatDateTime(profile.createdAt) },
    { label: "最后登录时间", value: formatDateTime(profile.lastLoginAt) },
    { label: "账号状态", value: formatUserStatus(profile.status) },
  ];
}

function InfoGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-8">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-3 border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-center"
        >
          <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950">{row.label}</div>
          <div className="text-left text-[20px] font-bold tracking-[-0.03em] text-slate-500 sm:text-right">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountSettingsPanel({
  profile,
}: {
  profile: UserCenterMe;
}) {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">个人资料</h1>
        <div className="mt-3 text-lg font-semibold text-slate-500">
          在这里查看你的账号基础信息。
        </div>
        <div className="mt-8 flex flex-col gap-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-5">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname || "用户头像"}
                width={80}
                height={80}
                unoptimized
                className="h-20 w-20 rounded-full object-cover shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] text-3xl font-black text-white shadow-[0_16px_36px_rgba(139,61,255,0.22)]">
                {(profile.nickname || "我").slice(0, 1)}
              </div>
            )}
            <div>
              <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                {profile.nickname || "未设置昵称"}
              </div>
              <div className="mt-2 text-base font-semibold text-slate-500">
                {profile.phoneMasked || profile.phone || "暂无手机号"}
              </div>
            </div>
          </div>

          <InfoGrid rows={buildUserRows(profile)} />
        </div>
      </section>
    </div>
  );
}
