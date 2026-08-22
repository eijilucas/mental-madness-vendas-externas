import symbol from "@/assets/mental-madness-symbol.png";

interface MentalLogoProps {
  variant?: "full" | "symbol";
  className?: string;
}

export function MentalLogo({ variant = "full", className = "" }: MentalLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={symbol}
        alt=""
        aria-hidden="true"
        className="h-8 w-8 shrink-0 object-contain"
      />
      {variant === "full" && (
        <span
          className="text-lg leading-none tracking-wide text-text"
          style={{ fontFamily: "var(--font-wordmark)" }}
        >
          Mental Madness
        </span>
      )}
    </div>
  );
}
