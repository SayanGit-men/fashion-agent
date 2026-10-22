interface StepIndicatorProps {
  steps: string[];
  activeStep: number;
}

export function StepIndicator({ steps, activeStep }: StepIndicatorProps) {
  return (
    <ol className="grid gap-3 sm:grid-cols-4" aria-label="Virtual try-on progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === activeStep;
        const isComplete = stepNumber < activeStep;

        return (
          <li
            key={step}
            className="rounded-2xl border border-zinc-200 bg-white/75 px-3 py-2 text-sm"
            aria-current={isActive ? "step" : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                  isComplete
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : isActive
                      ? "border-zinc-900 text-zinc-900"
                      : "border-zinc-300 text-zinc-500"
                }`}
              >
                {stepNumber}
              </span>
              <span
                className={`font-medium ${
                  isActive || isComplete ? "text-zinc-900" : "text-zinc-500"
                }`}
              >
                {step}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
