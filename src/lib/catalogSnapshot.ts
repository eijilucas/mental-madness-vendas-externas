/**
 * Snapshot real do catálogo do mental-madness-estoque, obtido em
 * 2026-08-22 via `GET /api/catalog/variants` (contrato 1) contra o
 * Supabase de produção. Usado como dado de demonstração local até que a
 * sincronização real (`catalog_cache`, fase 7 do plano) esteja implementada
 * contra um projeto Supabase próprio do Vendas Externas.
 *
 * NÃO são produtos inventados — vieram do banco real do estoque. Re-gerar
 * rodando o estoque localmente com credenciais reais e chamando o endpoint,
 * caso o catálogo mude.
 */

export interface CatalogSnapshotVariant {
  variantKey: string;
  size: string | null;
  color: string | null;
  estoqueReal: number;
  // Preço real da Shopify (sync do estoque) — null até o próximo sync
  // popular; nesse caso o operador preenche na mão (ver docs/decisions/004).
  price?: number | null;
}

export interface CatalogSnapshotProduct {
  id: string;
  name: string;
  type: "basico" | "exclusivo";
  category: string | null;
  drop: { id: string; name: string; status: string } | null;
  active: boolean;
  variants: CatalogSnapshotVariant[];
}

export const CATALOG_SNAPSHOT_SYNCED_AT = "2026-08-22T16:36:34.799Z";

export const CATALOG_SNAPSHOT: CatalogSnapshotProduct[] = [
  {
    id: "shopify-9009971233006",
    name: "Calça Cargo Premium Moletom - MM Basic Drop",
    type: "basico",
    category: "calca",
    drop: null,
    active: true,
    variants: [
      { variantKey: "P::Cinza Escuro", size: "P", color: "Cinza Escuro", estoqueReal: 0 },
      { variantKey: "P::Cinza Claro", size: "P", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "P::Preto", size: "P", color: "Preto", estoqueReal: 0 },
      { variantKey: "M::Cinza Escuro", size: "M", color: "Cinza Escuro", estoqueReal: 0 },
      { variantKey: "M::Cinza Claro", size: "M", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "M::Preto", size: "M", color: "Preto", estoqueReal: 0 },
      { variantKey: "G::Cinza Escuro", size: "G", color: "Cinza Escuro", estoqueReal: 0 },
      { variantKey: "G::Cinza Claro", size: "G", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "G::Preto", size: "G", color: "Preto", estoqueReal: 0 },
      { variantKey: "GG::Cinza Escuro", size: "GG", color: "Cinza Escuro", estoqueReal: 0 },
      { variantKey: "GG::Preto", size: "GG", color: "Preto", estoqueReal: 0 },
      { variantKey: "GG::Cinza Claro", size: "GG", color: "Cinza Claro", estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9427240878318",
    name: "Calça Reta Stitched (NOVAS CORES) - MM Basic Drop",
    type: "basico",
    category: "calca",
    drop: null,
    active: true,
    variants: [
      { variantKey: "P::Preto Com Logo Cinza Escura", size: "P", color: "Preto Com Logo Cinza Escura", estoqueReal: 0 },
      { variantKey: "P::Cinza Escura Com Logo Preta", size: "P", color: "Cinza Escura Com Logo Preta", estoqueReal: 0 },
      { variantKey: "M::Preto Com Logo Cinza Escura", size: "M", color: "Preto Com Logo Cinza Escura", estoqueReal: 0 },
      { variantKey: "M::Cinza Escura Com Logo Preta", size: "M", color: "Cinza Escura Com Logo Preta", estoqueReal: 0 },
      { variantKey: "G::Preto Com Logo Cinza Escura", size: "G", color: "Preto Com Logo Cinza Escura", estoqueReal: 0 },
      { variantKey: "G::Cinza Escura Com Logo Preta", size: "G", color: "Cinza Escura Com Logo Preta", estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9248690110702",
    name: "Calça Reta Stitched - MM Basic Drop",
    type: "basico",
    category: "calca",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP::Cinza Claro", size: "PP", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "PP::Preto", size: "PP", color: "Preto", estoqueReal: 0 },
      { variantKey: "P::Cinza Claro", size: "P", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "P::Preto", size: "P", color: "Preto", estoqueReal: 0 },
      { variantKey: "M::Cinza Claro", size: "M", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "M::Preto", size: "M", color: "Preto", estoqueReal: 0 },
      { variantKey: "G::Cinza Claro", size: "G", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "G::Preto", size: "G", color: "Preto", estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9010031722734",
    name: "Camiseta De Compressão - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9160087961838",
    name: "Camiseta De Compressão Manga Longa Quarter Zip - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9320822276334",
    name: "Camiseta De Compressão Vermelha - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9160089207022",
    name: "Camiseta Oversized Black/White - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9248701546734",
    name: "Camiseta Oversized Black/White Manga Longa - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9010012094702",
    name: "Camiseta Regular - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9320821719278",
    name: "Linha Premium - Pump Cover Dupla Camada",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9248715342062",
    name: "Moletom Careca Stitched - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP::Cinza Claro", size: "PP", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "PP::Preto", size: "PP", color: "Preto", estoqueReal: 0 },
      { variantKey: "P::Cinza Claro", size: "P", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "P::Preto", size: "P", color: "Preto", estoqueReal: 0 },
      { variantKey: "M::Cinza Claro", size: "M", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "M::Preto", size: "M", color: "Preto", estoqueReal: 0 },
      { variantKey: "G::Cinza Claro", size: "G", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "G::Preto", size: "G", color: "Preto", estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9009989320942",
    name: "Moletom Zip Up Com Touca - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP::Cinza Claro", size: "PP", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "PP::Preto", size: "PP", color: "Preto", estoqueReal: 0 },
      { variantKey: "P::Cinza Claro", size: "P", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "P::Preto", size: "P", color: "Preto", estoqueReal: 0 },
      { variantKey: "M::Cinza Claro", size: "M", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "M::Preto", size: "M", color: "Preto", estoqueReal: 0 },
      { variantKey: "G::Cinza Claro", size: "G", color: "Cinza Claro", estoqueReal: 0 },
      { variantKey: "G::Preto", size: "G", color: "Preto", estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9248705773806",
    name: "Regata Boxy - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-9160089370862",
    name: "Regata Canelada - MM Basic Drop",
    type: "basico",
    category: "outro",
    drop: null,
    active: true,
    variants: [
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-10799740682552",
    name: "Calça Oversized - Hell Hounds Drop",
    type: "exclusivo",
    category: null,
    drop: { id: "shopify-10799740682552", name: "Calça Oversized - Hell Hounds Drop", status: "ativo" },
    active: true,
    variants: [
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-10799746351416",
    name: "Camiseta De Compressão - Hell Hounds",
    type: "exclusivo",
    category: null,
    drop: { id: "shopify-10799746351416", name: "Camiseta De Compressão - Hell Hounds", status: "ativo" },
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-10799745139000",
    name: "Camiseta Oversized - Hell Hounds",
    type: "exclusivo",
    category: null,
    drop: { id: "shopify-10799745139000", name: "Camiseta Oversized - Hell Hounds", status: "ativo" },
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
      { variantKey: "GG", size: "GG", color: null, estoqueReal: 0 },
    ],
  },
  {
    id: "shopify-10799748612408",
    name: "Moletom Zip Up Gola Alta - Hell Hounds",
    type: "exclusivo",
    category: null,
    drop: { id: "shopify-10799748612408", name: "Moletom Zip Up Gola Alta - Hell Hounds", status: "ativo" },
    active: true,
    variants: [
      { variantKey: "PP", size: "PP", color: null, estoqueReal: 0 },
      { variantKey: "P", size: "P", color: null, estoqueReal: 0 },
      { variantKey: "M", size: "M", color: null, estoqueReal: 0 },
      { variantKey: "G", size: "G", color: null, estoqueReal: 0 },
    ],
  },
];
