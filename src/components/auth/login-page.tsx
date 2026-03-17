import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "./login-form";
import { LoginShowcase } from "./login-showcase";

export function LoginPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.4),transparent_30%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.34),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.32),transparent_34%),linear-gradient(135deg,#ffcc8b_0%,#ffe9a8_48%,#90f0df_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/55 px-4 py-2 text-sm font-bold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-transform duration-300 hover:scale-[1.02]"
          >
            <ArrowLeft size={16} />
            返回首页
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.9fr)]">
          <LoginShowcase />
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
