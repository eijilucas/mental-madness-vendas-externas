import { useMemo, useState, useRef, useEffect } from "react";
import { useUniqueCoupons } from "@/lib/supabase/queries";

interface CouponFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function CouponField({ value, onChange }: CouponFieldProps) {
  const { data: allCoupons = [] } = useUniqueCoupons();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = value.trim().toUpperCase();
    if (!term) return allCoupons;
    return allCoupons.filter((coupon) => coupon.toUpperCase().includes(term));
  }, [value, allCoupons]);

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <label htmlFor="field-cupom" className="mb-1.5 block text-sm text-text-muted">
        Cupom utilizado (opcional)
      </label>
      <input
        ref={inputRef}
        id="field-cupom"
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Ex.: DARK"
        className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-disabled focus-visible:border-text"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-surface shadow-lg z-10">
          {filtered.map((coupon) => (
            <button
              key={coupon}
              type="button"
              onClick={() => {
                onChange(coupon);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="block w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface-raised transition-colors"
            >
              {coupon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
