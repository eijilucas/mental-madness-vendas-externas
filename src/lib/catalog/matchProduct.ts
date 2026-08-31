import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

function stripAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const STOPWORDS = new Set(["a", "o", "de", "da", "do", "e", "com", "para", "tamanho"]);

function significantWords(text: string): string[] {
  return stripAccents(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Mesma lista de tipos de peça usada no parser (parseWhatsappMessage.ts) —
// já normalizada sem acento, já que compara contra significantWords().
const GARMENT_TYPES = [
  "calca", "camiseta", "moletom", "jaqueta", "bone", "vestido",
  "shorts", "regata", "casaco", "blusa",
];

// Apelidos, plurais e erros de grafia comuns que cliente usa no lugar do
// nome oficial da categoria. Nenhuma dessas peças (jaqueta/casaco/blusão,
// blusa/camisa, bermuda) existe como categoria própria no catálogo real
// hoje — só calça/camiseta/moletom/regata — então mapeamos pro tipo real
// mais próximo em vez de deixar sem match. Se um dia existir um produto de
// verdade nessas categorias, essa peça vai precisar de tipo próprio de novo.
const GARMENT_ALIASES: Record<string, string> = {
  // "casaco"/"jaqueta"/"blusão" → moletom (a peça com zíper que mais se
  // parece com isso no catálogo é o moletom zip-up)
  casaco: "moletom",
  casacos: "moletom",
  jaqueta: "moletom",
  jaquetas: "moletom",
  blusao: "moletom",
  blusoes: "moletom",
  moleton: "moletom", // erro de grafia comum
  moletons: "moletom",
  // "camisa"/"blusa"/"compressão" → camiseta (compressão hoje só existe
  // como variação de camiseta no catálogo — sem essa entrada, um pedido que
  // só diz "compressão X" sem falar "camiseta" perde a trava de tipo)
  camisa: "camiseta",
  camisas: "camiseta",
  camisao: "camiseta",
  blusa: "camiseta",
  blusas: "camiseta",
  camisetas: "camiseta",
  compressao: "camiseta",
  compressoes: "camiseta",
  // plurais dos tipos que já existem tal e qual
  calcas: "calca",
  regatas: "regata",
  regatinha: "regata",
  regatinhas: "regata",
  // "bermuda" → shorts
  bermuda: "shorts",
  bermudas: "shorts",
};

// Sinônimos de palavras descritivas específicas de cada peça (não do tipo)
// — levantados olhando o catálogo real inteiro (18 produtos). Diferente de
// GARMENT_ALIASES, essas palavras NÃO canonicalizam pro nome do tipo (ex.:
// "capuz" não vira "moletom"), senão a palavra perde o poder de distinguir
// entre variantes do mesmo tipo (ex.: "Moletom Zip Up Com Touca" vs
// "Moletom Careca Stitched" — as duas são moletom, só a touca diferencia).
const WORD_SYNONYMS: Record<string, string> = {
  capuz: "touca", // "Moletom Zip Up Com Touca"
  capuzes: "touca",
  ziper: "zip", // "Moletom Zip Up..." / "...Quarter Zip"
  comprida: "longa", // "manga comprida" = "manga longa"
  compridas: "longa",
  oversize: "oversized", // grafia sem o "d" final
  oversizes: "oversized",
};

// Concordância de gênero da cor: "camiseta preta" (cliente concorda com o
// substantivo da peça) vs "Preto" (nome da cor no catálogo, sem concordar
// com nada). Sem isso, o texto do cliente nunca bate literalmente com a cor.
const COLOR_ALIASES: Record<string, string> = {
  preta: "preto",
  branca: "branco",
  cinza: "cinza", // já é neutro, mantido explícito por clareza
};

// Todas as palavras canônicas conhecidas (tipo + apelido), numa lista só,
// pra fuzzy-match de erro de digitação — ex.: "compreensão" (typo real de
// "compressão") só bate com o apelido "compressao" se a comparação por
// proximidade rodar contra a PALAVRA DO APELIDO, não contra o resultado já
// canonicalizado ("camiseta", que é bem diferente de "compreensao").
const KNOWN_WORDS: Array<[string, string]> = [
  ...GARMENT_TYPES.map((t): [string, string] => [t, t]),
  ...Object.entries(GARMENT_ALIASES),
  ...Object.entries(WORD_SYNONYMS),
];

function canonicalizeWord(word: string): string {
  if (GARMENT_ALIASES[word]) return GARMENT_ALIASES[word];
  if (WORD_SYNONYMS[word]) return WORD_SYNONYMS[word];
  if (GARMENT_TYPES.includes(word)) return word;

  // Sem match exato — tenta por proximidade de digitação contra as palavras
  // conhecidas (nunca em palavras curtas, ver fuzzyTolerance). Faz isso
  // ANTES de qualquer canonicalização, comparando com a grafia original de
  // cada apelido/tipo, senão a tolerância a erro de digitação nunca teria
  // uma palavra "certa" pra comparar.
  for (const [known, canonical] of KNOWN_WORDS) {
    if (wordsMatch(word, known)) return canonical;
  }

  return word;
}

// Substitui cada apelido/plural/erro de grafia pela palavra canônica antes
// de contar sobreposição — senão "regatinha" nunca bate com "regata" na
// pontuação, mesmo que os dois sejam reconhecidos como o mesmo tipo de peça.
function canonicalizeWords(words: string[]): string[] {
  return words.map(canonicalizeWord);
}

function garmentType(words: string[]): string | null {
  return words.map(canonicalizeWord).find((w) => GARMENT_TYPES.includes(w)) ?? null;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Quantos erros de digitação tolerar, proporcional ao tamanho da palavra —
// nunca em palavras curtas (≤4 letras), senão qualquer coisa colide com
// qualquer coisa. Isso NUNCA entra na trava de tipo de peça (garmentType),
// só na pontuação de sobreposição — erro de digitação em nome próprio de
// drop (ex.: cliente escreveu "darkmonn bload" em vez de "Darkmoon Blood")
// não pode enfraquecer a proteção contra casar o tipo errado de peça.
function fuzzyTolerance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const tolerance = Math.min(fuzzyTolerance(a.length), fuzzyTolerance(b.length));
  if (tolerance === 0) return false;
  return levenshtein(a, b) <= tolerance;
}

export interface MatchResult {
  product: CatalogSnapshotProduct;
  variantKey: string;
}

/**
 * Casamento simples por palavras em comum entre o texto digitado pelo
 * cliente e o nome real do produto — versão mínima até existir a UI de
 * sugestões com múltiplas opções (§7 do briefing).
 *
 * Bug real encontrado em produção: dentro do mesmo drop, vários produtos
 * compartilham as mesmas palavras do nome do drop (ex.: "Hell Hounds"
 * aparece em calça, camiseta E moletom) — um casamento só por contagem de
 * palavras em comum casava "casaco Hell Hounds" com a CALÇA do drop, só
 * porque "hell"+"hounds" batiam. Por isso, quando o texto do cliente
 * menciona um tipo de peça (calça/camiseta/moletom/...), o produto
 * candidato PRECISA ser do mesmo tipo — nunca casa peça diferente só
 * porque o nome do drop bate.
 */
export function matchCatalogItem(
  productQuery: string,
  size: string,
  products: CatalogSnapshotProduct[],
): MatchResult | null {
  const queryWordsList = significantWords(productQuery);
  if (queryWordsList.length === 0) return null;
  const queryWords = new Set(canonicalizeWords(queryWordsList));

  const queryType = garmentType(queryWordsList);

  let best: { product: CatalogSnapshotProduct; score: number } | null = null;

  for (const product of products) {
    if (!product.active) continue;
    const nameWordsList = significantWords(product.name);
    // Set (não array) para não contar "compressão"+"camiseta" como dois
    // pontos de sobreposição só porque os dois canonicalizam pra "camiseta".
    const nameWords = new Set(canonicalizeWords(nameWordsList));

    if (queryType) {
      // Cliente mencionou um tipo de peça: só considera produtos desse
      // mesmo tipo, mesmo que outras palavras (nome do drop) batam.
      const nameType = garmentType(nameWordsList);
      if (nameType !== queryType) continue;
    }

    // Sobreposição tolera erro de digitação em palavras longas (nome
    // próprio de drop, ex.: "darkmonn" ≈ "darkmoon") — nunca em palavras
    // curtas, pra não colidir à toa.
    const overlap = [...nameWords].filter((nw) => [...queryWords].some((qw) => wordsMatch(nw, qw)))
      .length;
    const required = Math.min(2, nameWords.size);
    if (overlap < required) continue;
    if (!best || overlap > best.score) {
      best = { product, score: overlap };
    }
  }

  if (!best) return null;

  const normalizedSize = size.trim().toUpperCase();
  const sizeMatches = best.product.variants.filter((v) => v.size === normalizedSize);
  if (sizeMatches.length === 0) return null;
  if (sizeMatches.length === 1) return { product: best.product, variantKey: sizeMatches[0].variantKey };

  // Mesmo tamanho existe em mais de uma cor (ex.: "Moletom Zip Up Com
  // Touca" tem Cinza Claro e Preto) — escolher a primeira da lista sem
  // olhar a cor pedida seria um erro silencioso. Só aceita quando dá pra
  // identificar SEM ambiguidade qual cor o cliente quis: exatamente uma
  // variante cuja cor tem palavra em comum com o texto do cliente.
  const colorCandidates = sizeMatches.filter((v) => {
    if (!v.color) return false;
    const colorWords = new Set(significantWords(v.color).map((w) => COLOR_ALIASES[w] ?? w));
    return queryWordsList.some((w) => colorWords.has(COLOR_ALIASES[w] ?? w));
  });
  if (colorCandidates.length !== 1) return null;

  return { product: best.product, variantKey: colorCandidates[0].variantKey };
}
