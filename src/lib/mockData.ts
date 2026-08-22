import type { Order, OrderAddress, OrderItem } from "@/types/database";

/**
 * Dados fictícios para demonstração local (fase "páginas com dados mockados"
 * do plano). Clientes/pedidos são fictícios, mas os PRODUTOS referenciados
 * são os nomes reais do catálogo do estoque (ver src/lib/catalogSnapshot.ts,
 * puxado do Supabase real em 2026-08-22) — não os nomes inventados do
 * protótipo Framer usados numa versão anterior deste arquivo. Serão
 * substituídos por TanStack Query + Supabase reais nas fases seguintes.
 */

export interface MockOrderSummary {
  order: Order;
  itemsSummary: string;
}

const now = new Date();
function daysAgo(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const MOCK_ORDERS: MockOrderSummary[] = [
  {
    order: {
      id: "order-1048",
      public_number: 1048,
      status: "created",
      customer_name: "Lorenzo Rodrigues",
      cpf: "47181611852",
      email: "gunnerbr1@outlook.com",
      phone: "15991159050",
      source: "whatsapp",
      original_message: "",
      subtotal: 329.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 329.9,
      failure_reason: null,
      created_by: "00000000-0000-0000-0000-000000000001",
      created_at: daysAgo(0),
      updated_at: daysAgo(0),
    },
    itemsSummary: "Calça Oversized - Hell Hounds Drop · M",
  },
  {
    order: {
      id: "order-1047",
      public_number: 1047,
      status: "not_created",
      customer_name: "José Gustavo",
      cpf: "",
      email: null,
      phone: "",
      source: "whatsapp",
      original_message: "",
      subtotal: 579.8,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 579.8,
      failure_reason: "Produto não encontrado no catálogo.",
      created_by: "00000000-0000-0000-0000-000000000001",
      created_at: daysAgo(0),
      updated_at: daysAgo(0),
    },
    itemsSummary: "2 peças",
  },
  {
    order: {
      id: "order-1046",
      public_number: 1046,
      status: "created",
      customer_name: "Luiz Felipe Gomes de Sousa",
      cpf: "44047241873",
      email: "acardin31@gmail.com",
      phone: "16996169828",
      source: "whatsapp",
      original_message:
        "Peças, cores e tamanhos: Calça Hell Hounds tamanho M\nNome e Sobrenome: Luiz Felipe Gomes de Sousa\nCEP: 14169310",
      subtotal: 289.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 289.9,
      failure_reason: null,
      created_by: "00000000-0000-0000-0000-000000000001",
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    },
    itemsSummary: "Calça Oversized - Hell Hounds Drop · M",
  },
  {
    order: {
      id: "order-1045",
      public_number: 1045,
      status: "created",
      customer_name: "Mariana Costa",
      cpf: "",
      email: null,
      phone: "",
      source: "whatsapp",
      original_message: "",
      subtotal: 359.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 359.9,
      failure_reason: null,
      created_by: "00000000-0000-0000-0000-000000000001",
      created_at: daysAgo(2),
      updated_at: daysAgo(2),
    },
    itemsSummary: "Moletom Zip Up Gola Alta - Hell Hounds · P",
  },
  {
    order: {
      id: "order-1044",
      public_number: 1044,
      status: "not_created",
      customer_name: "Pedro Henrique",
      cpf: "",
      email: null,
      phone: "",
      source: "whatsapp",
      original_message: "",
      subtotal: 179.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 179.9,
      failure_reason: "CPF inválido.",
      created_by: "00000000-0000-0000-0000-000000000001",
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
    },
    itemsSummary: "Camiseta Regular - MM Basic Drop · G",
  },
];

export const MOCK_ORDER_ADDRESSES: Record<string, OrderAddress> = {
  "order-1048": {
    id: "address-1048",
    order_id: "order-1048",
    cep: "18270000",
    street: "Rua Ernani Cavalcante e Silva",
    number: "61",
    complement: null,
    district: "",
    city: "Tatuí",
    state: "SP",
    ibge_code: null,
    cep_verified: false,
  },
  "order-1046": {
    id: "address-1046",
    order_id: "order-1046",
    cep: "14169310",
    street: "Rua Humberto Ortolan",
    number: "2766",
    complement: null,
    district: "Jardim Montreal",
    city: "Sertãozinho",
    state: "SP",
    ibge_code: "3546801",
    cep_verified: true,
  },
};

// catalog_product_id/catalog_variant_id abaixo usam os IDs reais do estoque
// (ver src/lib/catalogSnapshot.ts) — "shopify-10799740682552" é o produto
// real "Calça Oversized - Hell Hounds Drop". Sem sku: essa coluna não existe
// no catálogo real do estoque (ver docs/decisions/002).
export const MOCK_ORDER_ITEMS: Record<string, OrderItem[]> = {
  "order-1048": [
    {
      id: "item-1048-1",
      order_id: "order-1048",
      catalog_product_id: "shopify-10799740682552",
      catalog_variant_id: "shopify-10799740682552::M",
      sku: null,
      product_name: "Calça Oversized - Hell Hounds Drop",
      color: null,
      size: "M",
      quantity: 1,
      unit_price: 329.9,
      total_price: 329.9,
    },
  ],
  "order-1046": [
    {
      id: "item-1046-1",
      order_id: "order-1046",
      catalog_product_id: "shopify-10799740682552",
      catalog_variant_id: "shopify-10799740682552::M",
      sku: null,
      // Mensagem original do cliente diz "Calça Hell Hounds" — nome real do
      // produto é "Calça Oversized - Hell Hounds Drop". Essa divergência é
      // proposital: demonstra o que o casamento com catálogo (aliases) tem
      // que resolver.
      product_name: "Calça Oversized - Hell Hounds Drop",
      color: null,
      size: "M",
      quantity: 1,
      unit_price: 289.9,
      total_price: 289.9,
    },
  ],
};
