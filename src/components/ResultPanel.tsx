import Image from "next/image";

interface FitInsight {
  label: string;
  value: string;
}

interface ResultPanelProps {
  previewUrl: string | null;
  generatedAt: string;
  insights: FitInsight[];
}

export function ResultPanel({ previewUrl, generatedAt, insights }: ResultPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-900">Mock try-on result</h3>
        <span className="text-xs text-zinc-500">Generated {generatedAt}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        This is a local demo preview for product validation. Connect a real AI provider/backend to generate production try-on images.
      </p>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-100 p-3">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Customer mock try-on preview"
            width={720}
            height={960}
            unoptimized
            className="mx-auto aspect-[3/4] max-h-[28rem] w-auto rounded-xl object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-white text-sm text-zinc-500">
            AI try-on output placeholder
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {insights.map((insight) => (
          <article key={insight.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{insight.label}</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{insight.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
