type StubScreenProps = {
  step: string;
  title: string;
  body: string;
};

export function StubScreen({ step, title, body }: StubScreenProps) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-content flex-col items-start justify-center px-4 py-22 md:px-8">
      <div className="font-mono text-mono-spec uppercase tracking-wider text-accent-amber">
        {step} · მზადდება
      </div>
      <h1 className="mt-4 font-headline text-h1 text-balance text-fg-primary">{title}</h1>
      <p className="mt-6 max-w-2xl text-body-lg text-pretty text-fg-secondary">{body}</p>
    </section>
  );
}
