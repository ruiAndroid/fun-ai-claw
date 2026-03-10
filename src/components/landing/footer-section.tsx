import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t border-md-outline-variant/30 bg-md-surface py-12">
      <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-md-on-surface-variant text-sm">
          <span className="font-bold text-md-primary">funClaw</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-md-on-surface-variant">
          <a
            href="https://github.com/user/fun-ai-claw"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-md-primary transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/docs"
            className="hover:text-md-primary transition-colors"
          >
            文档
          </Link>
        </div>
      </div>
    </footer>
  );
}
