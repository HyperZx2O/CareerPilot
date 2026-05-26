import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Primary heading */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Optional CTA element (e.g. a Button) */
  action?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Generic empty-state placeholder shown when a list or resource has no items.
 * Used across all pages that fetch data: jobs, tracker, calendar, etc.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-8 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50",
        className
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
          <Icon
            className="h-7 w-7 text-brand-500"
            aria-hidden="true"
            strokeWidth={1.5}
          />
        </div>
      )}

      <div className="max-w-xs space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
