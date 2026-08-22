interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-danger/40 bg-surface p-6 text-left">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-4 py-2 text-sm text-text hover:border-text"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
