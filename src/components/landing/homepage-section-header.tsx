import { Sparkles } from "lucide-react";

export function HomepageSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-md-primary/12 bg-white/70 px-3 py-1 text-xs font-bold tracking-[0.18em] uppercase text-md-primary shadow-sm">
        <Sparkles size={12} />
        {eyebrow}
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-md-on-surface sm:text-[30px]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-md-on-surface-variant sm:text-base">{description}</p>
    </div>
  );
}
