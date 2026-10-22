interface StatusPanelProps {
  progress: number;
  message: string;
}

export function StatusPanel({ progress, message }: StatusPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">Generating demo preview</h3>
      <p className="mt-1 text-sm text-zinc-600">{message}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
        <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{progress}% complete</p>
    </section>
  );
}
