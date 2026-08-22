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
      source_identifier: "9050",
      original_message: "",
      subtotal: 329.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 329.9,
      failure_reason: null,
      coupon_code: null,
      coupon_sale_status: "none",
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
      cpf: "98765432100",
      email: "jose.gustavo@example.com",
      phone: "88999998888",
      source: "whatsapp",
      source_identifier: "8888",
      original_message:
        "Peças, cores e tamanhos:calça hell hounds tamanho (P), calça preta darkmonn bload tamanho GG\nNome e Sobrenome:José Gustavo\nCEP:63430000",
      subtotal: 579.8,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 579.8,
      failure_reason: "Produto não encontrado no catálogo.",
      coupon_code: null,
      coupon_sale_status: "none",
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
      source_identifier: "9828",
      original_message:
        "Peças, cores e tamanhos: Calça Hell Hounds tamanho M\nNome e Sobrenome: Luiz Felipe Gomes de Sousa\nCEP: 14169310",
      subtotal: 289.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 289.9,
      failure_reason: null,
      coupon_code: null,
      coupon_sale_status: "none",
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
      cpf: "52998224725",
      email: "mariana.costa@example.com",
      phone: "11987654321",
      source: "whatsapp",
      source_identifier: "4321",
      original_message:
        "Moletom Zip Up Gola Alta Hell Hounds tamanho P\nMariana Costa\nAvenida Paulista, 1000, Bela Vista, São Paulo SP\n01310-930\n529.982.247-25\n(11) 98765-4321",
      subtotal: 359.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 359.9,
      failure_reason: null,
      coupon_code: null,
      coupon_sale_status: "none",
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
      cpf: "11122233344",
      email: "pedro.henrique@example.com",
      phone: "21988887777",
      source: "whatsapp",
      source_identifier: "7777",
      original_message:
        "Camiseta Regular tamanho G\nPedro Henrique\nCEP: 20040020\nCPF: 111.222.333-44\nTelefone: (21) 98888-7777",
      subtotal: 179.9,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 179.9,
      failure_reason: "CPF inválido.",
      coupon_code: null,
      coupon_sale_status: "none",
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
  "order-1047": {
    id: "address-1047",
    order_id: "order-1047",
    cep: "63430000",
    street: "Alto Joaninha",
    number: "32",
    complement: "Próximo à BR",
    district: "Rua B",
    city: "Ico",
    state: "CE",
    ibge_code: null,
    cep_verified: false,
  },
  "order-1045": {
    id: "address-1045",
    order_id: "order-1045",
    cep: "01310930",
    street: "Avenida Paulista",
    number: "1000",
    complement: null,
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    ibge_code: "3550308",
    cep_verified: true,
  },
  "order-1044": {
    id: "address-1044",
    order_id: "order-1044",
    cep: "20040020",
    street: "Rua Primeiro de Março",
    number: "23",
    complement: null,
    district: "Centro",
    city: "Rio de Janeiro",
    state: "RJ",
    ibge_code: "3304557",
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
  // Nenhum dos dois itens tem catalog_product_id/catalog_variant_id: é
  // exatamente por isso que o pedido não foi criado ("Produto não encontrado
  // no catálogo") — texto do cliente não bateu com nenhum produto real.
  "order-1047": [
    {
      id: "item-1047-1",
      order_id: "order-1047",
      catalog_product_id: null,
      catalog_variant_id: null,
      sku: null,
      product_name: "calça hell hounds",
      color: null,
      size: "P",
      quantity: 1,
      unit_price: 289.9,
      total_price: 289.9,
    },
    {
      id: "item-1047-2",
      order_id: "order-1047",
      catalog_product_id: null,
      catalog_variant_id: null,
      sku: null,
      product_name: "calça preta darkmonn bload",
      color: null,
      size: "GG",
      quantity: 1,
      unit_price: 289.9,
      total_price: 289.9,
    },
  ],
  "order-1045": [
    {
      id: "item-1045-1",
      order_id: "order-1045",
      catalog_product_id: "shopify-10799748612408",
      catalog_variant_id: "shopify-10799748612408::P",
      sku: null,
      product_name: "Moletom Zip Up Gola Alta - Hell Hounds",
      color: null,
      size: "P",
      quantity: 1,
      unit_price: 359.9,
      total_price: 359.9,
    },
  ],
  "order-1044": [
    {
      id: "item-1044-1",
      order_id: "order-1044",
      catalog_product_id: "shopify-9010012094702",
      catalog_variant_id: "shopify-9010012094702::G",
      sku: null,
      product_name: "Camiseta Regular - MM Basic Drop",
      color: null,
      size: "G",
      quantity: 1,
      unit_price: 179.9,
      total_price: 179.9,
    },
  ],
};
