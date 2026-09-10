-- Espelha coupon_sale_status (0007) / shipping_status (0011), mas pro
-- Jackpot (mental-lucro-liquido) — o cálculo de lucro líquido só via venda
-- da Shopify até agora; pedido do Vendas Externas nunca passa pelo checkout,
-- então ficava de fora da DRE (contrato: docs/api-contracts/07-jackpot-lucro-liquido.md).
--
-- 'skipped_members' = pedido do grupo "Pedidos dos Membros" — peça enviada
-- pro time, não é venda, não conta como faturamento.

alter table orders add column jackpot_sale_status text not null default 'none'
  check (jackpot_sale_status in ('none', 'registered', 'skipped_members', 'error'));
