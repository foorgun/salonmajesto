export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16 md:py-24">
      <h1 className="headline text-5xl md:text-6xl">{title}</h1>
      <div className="mt-10 space-y-6 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:font-medium [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </article>
  );
}
