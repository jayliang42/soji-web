import type { AdminMetric } from "@soji/types";

export function AdminMetrics({ metrics }: { metrics: AdminMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-dune bg-shell p-6">
          <p className="text-sm uppercase text-cocoa/70">
            {metric.label}
          </p>
          <p className="mt-4 font-display text-4xl text-cocoa">{metric.value}</p>
          <p className="mt-2 text-sm text-cocoa/75">{metric.detail}</p>
        </div>
      ))}
    </div>
  );
}
