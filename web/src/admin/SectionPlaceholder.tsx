import { AppShell } from '../components/layout/AppShell';
import { Icons, type IconName } from '../components/layout/icons';
import {
  SkeletonStats,
  SkeletonToolbar,
  SkeletonTable,
  SkeletonCardGrid,
  SkeletonForm,
  SkeletonChart,
} from '../components/ui/Skeleton';

export type SectionVariant = 'table' | 'cards' | 'form' | 'reports';

/**
 * Skeleton scaffold for admin sections that are on the sidebar but not yet
 * wired to live data. Rather than an empty placeholder, each section renders a
 * realistic page shell (header, toolbar, and a body shaped like its eventual
 * layout) so the IA feels complete and the build-out target is obvious.
 */
export function SectionPlaceholder({
  title,
  icon,
  description,
  variant = 'table',
}: {
  title: string;
  icon: IconName;
  description?: string;
  variant?: SectionVariant;
}) {
  const Icon = Icons[icon];
  return (
    <AppShell>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Scaffold
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {description ?? 'Interface scaffold — connect live data to activate this section.'}
            </p>
          </div>
        </div>

        {/* Variant body */}
        {variant === 'form' ? (
          <SkeletonForm />
        ) : variant === 'reports' ? (
          <>
            <SkeletonStats count={4} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonTable rows={5} />
          </>
        ) : variant === 'cards' ? (
          <>
            <SkeletonToolbar />
            <SkeletonCardGrid />
          </>
        ) : (
          <>
            <SkeletonStats count={4} />
            <SkeletonToolbar />
            <SkeletonTable />
          </>
        )}
      </div>
    </AppShell>
  );
}
