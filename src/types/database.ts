/**
 * Tipos manuais espelhando supabase/migrations até que `supabase gen types`
 * seja rodado contra um projeto real (ver README — ambiente é greenfield).
 */

export type UserRole = "admin" | "operator" | "viewer";

export type OrderStatus = "created" | "not_created";

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  public_number: number;
  status: OrderStatus;
  customer_name: string;
  cpf: string;
  email: string | null;
  phone: string;
  source: "whatsapp" | "discord" | "instagram" | "manual";
  // últimos 4 dígitos do telefone (whatsapp) ou @usuário (discord/instagram)
  source_identifier: string | null;
  original_message: string;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  failure_reason: string | null;
  coupon_code: string | null;
  coupon_sale_status: "none" | "registered" | "not_found" | "error";
  shipping_status: "pending" | "sent" | "failed";
  shipping_last_error: string | null;
  // Estágio real no pipeline de etiquetas do mm-etiquetas — null até o
  // primeiro callback chegar (pedido ainda em fila de aprovação lá). Ver
  // migração 0013 e docs/api-contracts/04-shipping-callback.md.
  shipping_stage:
    | "approved"
    | "cart_created"
    | "purchased"
    | "label_generated"
    | "tracking_ready"
    | "tracking_synced"
    | "held"
    | "failed"
    | "archived"
    | null;
  shipping_posted_at: string | null;
  tracking_code: string | null;
  // Quando o e-mail de rastreio foi mandado pro cliente (Resend, ver
  // integration-callback) — não confundir com shipping_stage
  // "tracking_synced" (o mm-etiquetas liberou o código; o e-mail pode
  // ainda não ter sido enviado/ter falhado).
  tracking_notified_at: string | null;
  group_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderGroup {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  id: string;
  order_id: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  ibge_code: string | null;
  cep_verified: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  catalog_product_id: string | null;
  catalog_variant_id: string | null;
  sku: string | null;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/**
 * Espelha o que `GET /api/catalog/variants` do mental-madness-estoque
 * realmente retorna (docs/api-contracts/01-catalog-read.md) — sem sku,
 * barcode, preço ou imagem: essas colunas não existem no estoque. Preço
 * continua sendo digitado manualmente pelo operador na revisão do pedido.
 */
export interface CatalogProduct {
  id: string;
  name: string;
  type: "basico" | "exclusivo";
  category: string | null;
  drop: { id: string; name: string; status: string } | null;
  active: boolean;
  synced_at: string;
}

export interface CatalogVariant {
  product_id: string;
  variant_key: string;
  size: string | null;
  color: string | null;
  estoque_real: number;
}

export interface ProductAlias {
  id: string;
  alias: string;
  product_id: string;
  variant_id: string | null;
  created_by: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Placeholder — substituir por `supabase gen types typescript` no projeto real.
export type Database = Record<string, unknown>;
