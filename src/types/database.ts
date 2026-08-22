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
  source: "whatsapp" | "manual";
  original_message: string;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  failure_reason: string | null;
  created_by: string;
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

export interface CatalogProduct {
  id: string;
  shopify_product_id: string | null;
  title: string;
  status: "active" | "archived";
  image_url: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface CatalogVariant {
  id: string;
  product_id: string;
  shopify_variant_id: string | null;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  size: string | null;
  price: number;
  available_quantity: number | null;
  active: boolean;
  synced_at: string;
  created_at: string;
  updated_at: string;
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
