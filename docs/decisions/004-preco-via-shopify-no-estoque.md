# Decisão 004 — Preço de venda sincronizado via estoque (não Shopify direto)

**Data:** 2026-08-22
**Status:** aceito e implementado

## Contexto

Nenhum dos sistemas conectados até então tinha preço por produto:
- `mental-madness-estoque`: schema real confirmado sem `price` em `products`/`variants`.
- `mm-etiquetas`: só grava o preço de um pedido Shopify já existente, não mantém catálogo.
- `mental-madness-mvp` (comissão): `sales.gross_amount` é o valor total da venda, não por peça; `sale_items` só tem `product_name`/`quantity`.
- Uma quarta base foi encontrada (`mental-madness-jackpot`, projeto Supabase `vatoeojxpejefxqslgli`) com uma tabela `product_costs.preco_venda` — mas, checado com dados reais, só 1 de 56 produtos tinha o campo preenchido (nenhum do drop atual). Não é uma fonte confiável hoje.

O usuário decidiu reabrir a conexão direta com a Shopify só para consulta de preço (revertendo parcialmente a decisão original de "nunca falar com a Shopify direto").

## Decisão

Em vez de dar ao Vendas Externas credenciais Shopify próprias (o que criaria um 3º lugar guardando segredo da Shopify), a conexão já existente do `mental-madness-estoque` com a Shopify foi estendida:

- `variant.price` (que a Shopify já manda no payload de produtos, só nunca era lido) passa a ser capturado no sync (`mapping.js`), persistido (`variants.price`, migration nova) e devolvido em `GET /api/catalog/variants` (contrato 1).
- O Vendas Externas espelha esse campo em `catalog_variants.price` (migration `0008`).
- No Novo Pedido, quando um item casa com uma variante que tem preço sincronizado, o campo "Preço unitário" é preenchido automaticamente (mas continua editável) — só cai para digitação manual quando o preço ainda não foi sincronizado (`price: null`), o que é o caso de 100% do catálogo até este momento, já que a mudança de código só afeta o **próximo** sync real com a Shopify.

## Por que essa opção em vez de credencial própria

- Zero segredo Shopify novo — reaproveita a Custom App que o estoque já usa e mantém funcionando.
- Consistente com a arquitetura já estabelecida: Shopify é fonte de verdade só através do estoque, nunca direto do Vendas Externas.

## Testado

- Migration aplicada nos dois bancos reais (estoque e Vendas Externas).
- Preço de teste setado manualmente em ambos, endpoint e formulário confirmados devolvendo/preenchendo certo, revertido depois.
- Preço real só vai aparecer de fato depois que o estoque rodar um sync de verdade com a Shopify (não temos credencial Shopify para disparar isso nós mesmos nesta sessão).
