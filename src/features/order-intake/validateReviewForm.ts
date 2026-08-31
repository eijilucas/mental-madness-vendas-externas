import { isValidCep, isValidCpf, isValidEmail, isValidPhone, normalizeUf } from "@/lib/parser/normalizers";
import type { ReviewForm } from "./reviewTypes";

const SOURCE_LABELS: Record<string, string> = {
  discord: "Discord",
  instagram: "Instagram",
};

export function validateReviewForm(form: ReviewForm): string[] {
  const errors: string[] = [];
  if (!form.customerName.trim()) errors.push("Nome do cliente é obrigatório.");
  if (!isValidCpf(form.cpf)) errors.push("CPF inválido.");
  if (!isValidCep(form.cep)) errors.push("CEP não encontrado.");
  if (!form.street.trim()) errors.push("Endereço é obrigatório.");
  if (!form.number.trim()) errors.push("Número do endereço não informado.");
  if (!form.district.trim()) errors.push("Bairro é obrigatório.");
  if (!form.city.trim()) errors.push("Cidade é obrigatória.");
  if (!normalizeUf(form.state)) errors.push("Selecione um estado válido.");
  if (!isValidPhone(form.phone)) errors.push("Telefone inválido.");
  if (form.email && !isValidEmail(form.email)) errors.push("E-mail inválido.");
  if ((form.source === "discord" || form.source === "instagram") && !form.sourceUsername.trim()) {
    errors.push(`Informe o usuário do ${SOURCE_LABELS[form.source]}.`);
  }
  if (form.items.length === 0) errors.push("Adicione ao menos um item.");
  form.items.forEach((item, i) => {
    if (!item.size) errors.push(`Item ${i + 1}: selecione uma variante válida.`);
    if (!(item.unitPrice > 0)) errors.push(`Item ${i + 1}: informe o preço.`);
  });
  return errors;
}
