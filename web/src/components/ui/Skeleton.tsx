/**
 * Reusable shimmer primitives. Used both for real query-loading states and for
 * not-yet-built section scaffolds, so every screen has a consistent "loading"
 * shape instead of an empty placeholder.
 */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

export function SkeletonCircle({ className = 'h-9 w-9' }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />;
}

/** A row of KPI stat tiles. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Search box + filter chips + a primary action button. */
export function SkeletonToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-24" />
      <div className="ml-auto">
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

/** A data table with a header and shimmer rows. */
export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-40' : 'w-24'}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={c === 0 ? 'flex items-center gap-2.5' : ''}>
              {c === 0 && <SkeletonCircle className="h-7 w-7" />}
              <Skeleton className={`h-3.5 ${c === 0 ? 'w-36' : c === cols - 1 ? 'w-16' : 'w-20'}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Shimmer rows to drop inside an existing <tbody> while data loads. */
export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className={`h-3.5 ${c === 0 ? 'w-40' : c === cols - 1 ? 'w-14' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A responsive grid of content cards. */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A settings/config form: sections of labelled fields + a save button. */
export function SkeletonForm({ sections = 2, fields = 4 }: { sections?: number; fields?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: sections }).map((_, s) => (
        <div key={s} className="rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: fields }).map((_, f) => (
              <div key={f}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

/** Chart placeholder block (bars). */
export function SkeletonChart({ className = 'h-64' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 flex h-[calc(100%-2rem)] items-end gap-2">
        {[60, 40, 80, 55, 70, 35, 90, 50, 65, 45].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
