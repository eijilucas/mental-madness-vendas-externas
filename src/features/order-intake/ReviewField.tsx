import type { FieldStatus } from "./reviewTypes";

const STATUS_LABEL: Record<FieldStatus, string> = {
  recognized: "Reconhecido",
  missing: "Não encontrado",
  invalid: "Inválido",
  ambiguous: "Ambíguo",
  corrected: "Corrigido",
};

const STATUS_TONE: Record<FieldStatus, string> = {
  recognized: "text-success",
  missing: "text-text-muted",
  invalid: "text-danger",
  ambiguous: "text-warning",
  corrected: "text-info",
};

interface ReviewFieldProps {
  label: string;
  value: string;
  status: FieldStatus;
  onChange: (value: string) => void;
  errorMessage?: string;
  type?: string;
}

export function ReviewField({
  label,
  value,
  status,
  onChange,
  errorMessage,
  type = "text",
}: ReviewFieldProps) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm text-text-muted">
          {label}
        </label>
        <span className={`text-xs ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={status === "invalid"}
        className={`w-full rounded-md border bg-surface px-4 py-3 text-sm text-text focus-visible:border-text ${
          status === "invalid" ? "border-danger" : "border-border"
        }`}
      />
      {status === "invalid" && errorMessage && (
        <p className="mt-1.5 text-sm text-danger">{errorMessage}</p>
      )}
    </div>
  );
}
