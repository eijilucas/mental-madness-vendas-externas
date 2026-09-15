import symbol from "@/assets/mental-madness-symbol.png";

interface MentalLogoProps {
  variant?: "full" | "symbol";
  className?: string;
}

// Aponta pro hub que reúne os painéis todos (Vendas Externas, mm-etiquetas,
// Jackpot, ...) — clicar na logo sai desse app e vai pra lá.
const HUB_URL = "https://mental-madness-hub.vercel.app/";

export function MentalLogo({ variant = "full", className = "" }: MentalLogoProps) {
  return (
    <a href={HUB_URL} className={`flex items-center gap-2 ${className}`}>
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
    </a>
  );
}
