export interface ReviewItem {
  id: string;
  rawText: string;
  productQuery: string;
  size: string;
  // Vazio até o operador preencher — o parser não tenta extrair cor do
  // texto livre (ver matchCatalogItem), só o tamanho. Produtos com mais de
  // uma cor por tamanho (ex.: "Calça Reta Stitched (NOVAS CORES)") ficam
  // sem correspondência no catálogo até esse campo ser preenchido.
  color: string;
  quantity: number;
  unitPrice: number;
  variantMatched: boolean;
}

export type OrderSource = "whatsapp" | "discord" | "instagram";

export interface ReviewForm {
  customerName: string;
  cpf: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  items: ReviewItem[];
  originalMessage: string;
  source: OrderSource;
  // @usuário (discord/instagram) — para whatsapp é derivado do telefone,
  // não digitado.
  sourceUsername: string;
  // Cupom de afiliado, opcional, de qualquer origem — não só WhatsApp.
  couponCode: string;
}

export type FieldStatus = "recognized" | "missing" | "invalid" | "ambiguous" | "corrected";
