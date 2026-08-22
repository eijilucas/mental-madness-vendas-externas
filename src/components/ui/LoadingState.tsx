export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-md border border-border bg-surface p-6 text-sm text-text-muted"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-text"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
