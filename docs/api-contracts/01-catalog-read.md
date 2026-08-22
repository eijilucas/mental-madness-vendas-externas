# Contrato 1 — Leitura de catálogo (`mental-madness-estoque`)

**Direção:** Vendas Externas → `mental-madness-estoque`
**Status:** novo, a implementar em `mental-madness-estoque` (branch `feature/external-orders-api`)

## Endpoint

```
GET /api/catalog/variants
```

## Autenticação

```
Authorization: Bearer <CATALOG_READ_SECRET>
```

Secret dedicado (não reutilizar `MM_ETIQUETAS_SECRET` nem `CRON_SECRET`), comparação em tempo constante, rotação independente.

## Query params (opcionais)

| Param | Tipo | Descrição |
|---|---|---|
| `updatedSince` | ISO 8601 | retorna somente variantes alteradas após esse timestamp (sync incremental) |
| `includeInactive` | boolean | padrão `false` — inclui produtos/variantes arquivados quando `true` |

## Resposta 200

```json
{
  "syncedAt": "2026-08-22T14:00:00Z",
  "products": [
    {
      "id": "prod_123",
      "title": "Calça Hell Hounds",
      "status": "active",
      "imageUrl": "https://.../hell-hounds.jpg",
      "variants": [
        {
          "variantKey": "M::Preto",
          "sku": "CAL-HH-M-PT",
          "size": "M",
          "color": "Preto",
          "price": "289.90",
          "estoqueReal": 4,
          "active": true
        }
      ]
    }
  ]
}
```

## Erros

| Código | Corpo | Motivo |
|---|---|---|
| 401 | `{"error":"unauthorized"}` | secret ausente/incorreto |
| 500 | `{"error":"internal_error"}` | falha ao consultar o banco |

## Notas de implementação

- Somente leitura — não usa o padrão `load()/save()` existente; é uma query direta (`SELECT` com `estoque_real`), sem side effects.
- `estoqueReal` é a mesma coluna que já alimenta o painel interno do estoque — não há duplicação de fonte de verdade.
- Rate limit recomendado: a sincronização do Vendas Externas deve rodar no máximo a cada poucos minutos (incremental) + 1x/dia completa — não é uma rota de alto tráfego.
