interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <label className="block">
      <span className="sr-only">Buscar</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-disabled focus-visible:border-text"
      />
    </label>
  );
}
