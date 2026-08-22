-- Preço de venda real, espelhado do mental-madness-estoque (que passou a
-- sincronizar variant.price da Shopify — ver docs/decisions/004). Null até
-- o próximo sync do estoque popular; nesse caso o operador continua
-- preenchendo manualmente no Novo Pedido.
alter table catalog_variants add column price numeric(12, 2);
