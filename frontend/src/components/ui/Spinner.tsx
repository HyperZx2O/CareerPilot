import { cn } from "@/lib/utils";

interface SpinnerProps {
  /** Size of the spinner in Tailwind size classes. Default: "h-5 w-5" */
  size?: string;
  /** Additional class names */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Animated SVG spinner used during loading states across the application.
 */
export function Spinner({
  size = "h-5 w-5",
  className,
  label = "Loading…",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <svg
        className={cn("animate-spin text-brand-500", size)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>
  );
}
