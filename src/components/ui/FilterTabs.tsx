interface FilterTabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      className="flex gap-2 overflow-x-auto rounded-md border border-border bg-surface p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
            option.value === value
              ? "bg-text text-bg"
              : "text-text-muted hover:text-text"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
