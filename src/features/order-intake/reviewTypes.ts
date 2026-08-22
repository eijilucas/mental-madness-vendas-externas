export interface ReviewItem {
  id: string;
  rawText: string;
  productQuery: string;
  size: string;
  quantity: number;
  unitPrice: number;
  variantMatched: boolean;
}

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
}

export type FieldStatus = "recognized" | "missing" | "invalid" | "ambiguous" | "corrected";
