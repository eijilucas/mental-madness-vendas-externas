# Contrato 1 — Leitura de catálogo (`mental-madness-estoque`)

**Direção:** Vendas Externas → `mental-madness-estoque`
**Status:** **implementado e testado contra dados reais** em `mental-madness-estoque` (branch local `feature/external-orders-api`, não commitado/pushado ainda). Ver `src/routes/api.js`.

## Endpoint

```
GET /api/catalog/variants
```

## Autenticação

```
Authorization: Bearer <CATALOG_READ_SECRET>
```

Secret dedicado (não reutilizar `MM_ETIQUETAS_SECRET` nem `CRON_SECRET`), comparação em tempo constante, rotação independente.

## Resposta 200 (formato real, verificado em 2026-08-22 contra o Supabase de produção do estoque)

```json
{
  "syncedAt": "2026-08-22T07:02:23.059Z",
  "products": [
    {
      "id": "shopify-10799740682552",
      "name": "Calça Oversized - Hell Hounds Drop",
      "type": "exclusivo",
      "category": null,
      "drop": { "id": "shopify-10799740682552", "name": "Calça Oversized - Hell Hounds Drop", "status": "ativo" },
      "active": true,
      "variants": [
        { "variantKey": "M", "size": "M", "color": null, "estoqueReal": 0 }
      ]
    },
    {
      "id": "shopify-9009971233006",
      "name": "Calça Cargo Premium Moletom - MM Basic Drop",
      "type": "basico",
      "category": "calca",
      "drop": null,
      "active": true,
      "variants": [
        { "variantKey": "M::Preto", "size": "M", "color": "Preto", "estoqueReal": 0 }
      ]
    }
  ]
}
```

### ⚠️ Revisão vs. versão anterior deste documento

A primeira versão deste contrato assumia campos que **não existem no schema real** (`sku`, `barcode`, `price`, `imageUrl`, `status` por variante). Confirmado lendo `src/db.js` e consultando a tabela `products`/`variants` reais via `service_role`:

- **Sem preço, SKU, código de barras ou imagem** em nenhuma tabela do estoque. O operador do Vendas Externas continua preenchendo o preço manualmente na revisão do pedido (já é assim no formulário) — não há de onde sincronizar isso.
- **`type`** é `"basico"` ou `"exclusivo"` — na prática indica de qual loja Shopify o produto foi sincronizado (`SHOPIFY_BASICO_*` vs. `SHOPIFY_EXCLUSIVO_*`), não uma categoria de vestuário.
- **`category`** é um campo livre e esparso (`"calca"`, `"outro"` ou `null` na prática) — não é confiável para filtro/match de produto.
- **`variantKey`** é `"{size}::{color}"` quando o produto tem cor, ou só `"{size}"` quando não tem (ex.: os 4 produtos do drop atual "Hell Hounds" não têm cor cadastrada).
- **`active`**: básico é sempre `true` (sempre disponível para pedido); exclusivo só é `true` enquanto o **drop** correspondente (mesmo `id` do produto, tabela `drops`) tem `status: "ativo"` e `closed_at: null`. Quando o drop fecha, o produto para de ser oferecível — isso é o "tratamento de drop encerrado" do briefing.
- **`estoqueReal: 0` é normal e esperado para itens exclusivos**, mesmo com pedidos sendo aceitos — ver `src/calc/produce.js::calcExclusivo`: é produção sob demanda (`produzir = máx(0, não_processados − restantes)`), não estoque pronto pra despachar. **Contrato 2 não deve bloquear a criação de demanda externa por `estoqueReal == 0` em produtos exclusivos** — só precisa validar que a variante existe e está ativa.
- Removidos os parâmetros `updatedSince`/`includeInactive` da v1 do contrato: o catálogo real tem 18 produtos / ~101 variantes — pequeno o suficiente para sincronização completa sempre, sem necessidade de incremental por ora.

## Erros

| Código | Corpo | Motivo |
|---|---|---|
| 401 | `{"error":"unauthorized"}` | secret ausente/incorreto |
| 500 | `{"error":"internal_error"}` | falha ao consultar o banco |

## Notas de implementação

- Somente leitura — reaproveita `db.load()` já existente (que já junta `products`+`variants`+`drops`), sem usar `save()`/`reconcileDeletes`. Sem side effects.
- `estoqueReal` é a mesma coluna que já alimenta o painel interno do estoque — não há duplicação de fonte de verdade.
- Testado localmente (`node --env-file=.env src/server.js` + `curl`) contra o Supabase real de produção do estoque em 2026-08-22: 18 produtos, os 4 do drop "Hell Hounds" corretamente marcados `active: true`.
- Catálogo é pequeno (18 produtos) — sincronização completa a cada poucos minutos é suficiente; sem necessidade de endpoint incremental por ora.
