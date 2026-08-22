export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function maskCpf(cpfDigits: string): string {
  const digits = cpfDigits.replace(/\D/g, "");
  if (digits.length !== 11) return cpfDigits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Mascara os 3 dígitos centrais do CPF para listagens (LGPD). */
export function maskCpfForList(cpfDigits: string): string {
  const digits = cpfDigits.replace(/\D/g, "");
  if (digits.length !== 11) return "—";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

/** Mascara o miolo do telefone para papéis sem acesso a dado completo (LGPD). */
export function maskPhoneForList(phoneDigits: string): string {
  const digits = phoneDigits.replace(/\D/g, "").replace(/^55/, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}****-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ****-${digits.slice(6)}`;
  }
  return "—";
}

export function formatPhone(phoneDigits: string): string {
  const digits = phoneDigits.replace(/\D/g, "").replace(/^55/, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phoneDigits;
}

export function formatCep(cepDigits: string): string {
  const digits = cepDigits.replace(/\D/g, "");
  if (digits.length !== 8) return cepDigits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
