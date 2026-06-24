import type { ReactNode } from "react";

export function PageHeader({
  eyebrow, title, lead, children,
}: { eyebrow?: string; title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-border/60 bg-[var(--sand)]/30">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        {eyebrow && <p className="tag-label">{eyebrow}</p>}
        <h1 className="font-display mt-6 text-5xl leading-tight sm:text-6xl">{title}</h1>
        {lead && <p className="mt-6 max-w-2xl text-base text-muted-foreground">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
