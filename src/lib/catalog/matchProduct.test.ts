import { describe, expect, it } from "vitest";
import { colorsForSize, findCatalogProduct, findCatalogProductWithDetail, matchCatalogItem, sizesForProduct } from "./matchProduct";
import { CATALOG_SNAPSHOT } from "@/lib/catalogSnapshot";

describe("matchCatalogItem", () => {
  it('casa "Calça Hell Hounds" (texto do cliente) com o produto real do drop', () => {
    const result = matchCatalogItem("Calça Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(result?.product.name).toBe("Calça Oversized - Hell Hounds Drop");
    expect(result?.variantKey).toBe("M");
  });

  it("não casa quando o tamanho pedido não existe nesse produto", () => {
    // Moletom Zip Up Gola Alta - Hell Hounds só tem PP/P/M/G, sem GG.
    const result = matchCatalogItem("Moletom Zip Up Gola Alta Hell Hounds", "GG", CATALOG_SNAPSHOT);
    expect(result).toBeNull();
  });

  it("não casa com texto totalmente sem relação a nenhum produto", () => {
    const result = matchCatalogItem("Produto que não existe de jeito nenhum", "M", CATALOG_SNAPSHOT);
    expect(result).toBeNull();
  });

  it('não casa "casaco Hell Hounds" com a calça do mesmo drop (bug real: palavras do drop não bastam)', () => {
    // "casaco" é alias de moletom (não existe categoria própria de casaco/
    // jaqueta no catálogo hoje) — o importante aqui é que NUNCA case com a
    // calça só por causa das palavras do nome do drop baterem.
    const result = matchCatalogItem("casaco Hell M Hounds", "M", CATALOG_SNAPSHOT);
    expect(result?.product.name).toBe("Moletom Zip Up Gola Alta - Hell Hounds");
    expect(result?.product.name).not.toBe("Calça Oversized - Hell Hounds Drop");
  });

  it("distingue peças diferentes do mesmo drop pelo tipo mencionado", () => {
    const camiseta = matchCatalogItem("Camiseta Oversized Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(camiseta?.product.name).toBe("Camiseta Oversized - Hell Hounds");

    const moletom = matchCatalogItem("Moletom Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(moletom?.product.name).toBe("Moletom Zip Up Gola Alta - Hell Hounds");

    const calca = matchCatalogItem("Calça Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(calca?.product.name).toBe("Calça Oversized - Hell Hounds Drop");
  });

  it("reconhece apelidos/erros de grafia comuns de tipo de peça", () => {
    const moleton = matchCatalogItem("moleton Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(moleton?.product.name).toBe("Moletom Zip Up Gola Alta - Hell Hounds");

    const jaqueta = matchCatalogItem("jaqueta Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(jaqueta?.product.name).toBe("Moletom Zip Up Gola Alta - Hell Hounds");

    const camisa = matchCatalogItem("camisa Oversized Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(camisa?.product.name).toBe("Camiseta Oversized - Hell Hounds");

    const blusa = matchCatalogItem("blusa Oversized Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(blusa?.product.name).toBe("Camiseta Oversized - Hell Hounds");

    const regatinha = matchCatalogItem("regatinha Boxy", "M", CATALOG_SNAPSHOT);
    expect(regatinha?.product.name).toBe("Regata Boxy - MM Basic Drop");

    const calcas = matchCatalogItem("calcas Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(calcas?.product.name).toBe("Calça Oversized - Hell Hounds Drop");

    // "compressão" sozinho (sem a palavra "camiseta") também precisa cair
    // na trava de tipo camiseta, não só casar por "hell"+"hounds".
    const compressao = matchCatalogItem("compressão Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(compressao?.product.name).toBe("Camiseta De Compressão - Hell Hounds");

    // Caso real: cliente digitou "Compreensão" (erro de digitação de
    // "Compressão", não um sinônimo cadastrado) — precisa reconhecer por
    // proximidade de digitação contra o apelido, não só contra o tipo já
    // canonicalizado (senão "compreensao" nunca fica perto de "camiseta").
    const compreensao = matchCatalogItem("Compreensão hell hounds", "M", CATALOG_SNAPSHOT);
    expect(compreensao?.product.name).toBe("Camiseta De Compressão - Hell Hounds");
  });

  it("reconhece sinônimos de palavras descritivas (capuz/ziper/manga comprida/oversize)", () => {
    // as duas peças têm variante por cor no mesmo tamanho — precisa dizer a
    // cor pra desambiguar (testado à parte no describe de cor mais abaixo).
    const comCapuz = matchCatalogItem("moletom com capuz preto", "M", CATALOG_SNAPSHOT);
    expect(comCapuz?.product.name).toBe("Moletom Zip Up Com Touca - MM Basic Drop");

    // não pode confundir com o outro moletom do mesmo drop básico (sem touca)
    const careca = matchCatalogItem("moletom careca preto", "M", CATALOG_SNAPSHOT);
    expect(careca?.product.name).toBe("Moletom Careca Stitched - MM Basic Drop");

    const ziper = matchCatalogItem("moletom com ziper e touca preto", "M", CATALOG_SNAPSHOT);
    expect(ziper?.product.name).toBe("Moletom Zip Up Com Touca - MM Basic Drop");

    const mangaComprida = matchCatalogItem(
      "camiseta de compressao manga comprida quarter zip",
      "M",
      CATALOG_SNAPSHOT,
    );
    expect(mangaComprida?.product.name).toBe("Camiseta De Compressão Manga Longa Quarter Zip - MM Basic Drop");

    const oversize = matchCatalogItem("camiseta oversize black white", "M", CATALOG_SNAPSHOT);
    expect(oversize?.product.name).toBe("Camiseta Oversized Black/White - MM Basic Drop");
  });

  it("escolhe a variante da cor pedida quando o produto tem mais de uma cor no mesmo tamanho", () => {
    // "Moletom Zip Up Com Touca" tem PP/P/M/G em Cinza Claro E Preto —
    // nunca pode pegar a cor errada silenciosamente.
    const preto = matchCatalogItem("moletom touca preto", "M", CATALOG_SNAPSHOT);
    expect(preto?.variantKey).toBe("M::Preto");

    // concordância de gênero: "preta" (combinando com "camiseta"/peça) tem
    // que bater com a cor "Preto" do catálogo.
    const preta = matchCatalogItem("moletom touca preta", "M", CATALOG_SNAPSHOT);
    expect(preta?.variantKey).toBe("M::Preto");

    const cinzaClaro = matchCatalogItem("moletom touca cinza claro", "M", CATALOG_SNAPSHOT);
    expect(cinzaClaro?.variantKey).toBe("M::Cinza Claro");
  });

  it("não escolhe cor nenhuma quando o cliente não especifica (evita pegar a primeira da lista silenciosamente)", () => {
    const semCor = matchCatalogItem("moletom touca", "M", CATALOG_SNAPSHOT);
    expect(semCor).toBeNull();
  });

  it("tolera erro de digitação em nome próprio de drop (palavra longa)", () => {
    // Caso real: cliente escreveu "darkmonn bload" em vez de "Darkmoon Blood".
    const drop = {
      id: "shopify-darkmoon-calca",
      name: "Calça Preta - Darkmoon Blood Drop",
      type: "exclusivo" as const,
      category: null,
      drop: { id: "shopify-darkmoon-calca", name: "Calça Preta - Darkmoon Blood Drop", status: "ativo" },
      active: true,
      variants: [{ variantKey: "GG", size: "GG", color: null, estoqueReal: 0 }],
    };
    const result = matchCatalogItem("calça preta darkmonn bload", "GG", [...CATALOG_SNAPSHOT, drop]);
    expect(result?.product.name).toBe("Calça Preta - Darkmoon Blood Drop");
  });

  it("tolera erro de digitação no próprio tipo da peça, contra uma lista fechada e segura", () => {
    // "calsa" (typo de "calça") ainda precisa acionar a trava de tipo —
    // senão cai de volta no casamento só por "hell"+"hounds", que foi
    // exatamente o bug original.
    const result = matchCatalogItem("calsa Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(result?.product.name).toBe("Calça Oversized - Hell Hounds Drop");
  });

  it("não casa com produto inativo", () => {
    const inactiveCatalog = CATALOG_SNAPSHOT.map((p) =>
      p.name.includes("Hell Hounds") ? { ...p, active: false } : p,
    );
    const result = matchCatalogItem("Calça Hell Hounds", "M", inactiveCatalog);
    expect(result).toBeNull();
  });

  describe("campo Cor explícito (regressão do bug real: NOVAS CORES sem variação visível)", () => {
    // Bug real: depois que o operador escolhe "Calça Reta Stitched (NOVAS
    // CORES) - MM Basic Drop" pelo autocomplete, productQuery vira só o
    // nome do produto — nenhuma palavra de cor sobra pro heurístico de
    // texto livre, então o casamento sempre falhava (voltava null) e a
    // tela nunca mostrava nenhuma cor pro operador escolher.
    it("com o produto já escolhido pelo autocomplete (sem cor no texto), falha sem o campo Cor", () => {
      const semCor = matchCatalogItem("Calça Reta Stitched (NOVAS CORES) - MM Basic Drop", "P", CATALOG_SNAPSHOT);
      expect(semCor).toBeNull();
    });

    it("casa a variante certa quando o campo Cor é preenchido explicitamente", () => {
      const result = matchCatalogItem(
        "Calça Reta Stitched (NOVAS CORES) - MM Basic Drop",
        "P",
        CATALOG_SNAPSHOT,
        "Cinza Escura Com Logo Preta",
      );
      expect(result?.variantKey).toBe("P::Cinza Escura Com Logo Preta");
    });

    it("ignora acento/maiúscula no campo Cor", () => {
      const result = matchCatalogItem(
        "Calça Reta Stitched (NOVAS CORES) - MM Basic Drop",
        "P",
        CATALOG_SNAPSHOT,
        "cinza escura com logo preta",
      );
      expect(result?.variantKey).toBe("P::Cinza Escura Com Logo Preta");
    });

    it("cor que não existe nesse tamanho/produto não casa nada (não cai pro heurístico de texto livre)", () => {
      const result = matchCatalogItem(
        "Calça Reta Stitched (NOVAS CORES) - MM Basic Drop",
        "P",
        CATALOG_SNAPSHOT,
        "Roxo",
      );
      expect(result).toBeNull();
    });

    it("campo Cor tem prioridade sobre o texto livre quando os dois estão presentes", () => {
      const result = matchCatalogItem(
        "moletom touca preto", // texto livre sugeriria Preto
        "M",
        CATALOG_SNAPSHOT,
        "Cinza Claro", // campo Cor explícito vence
      );
      expect(result?.variantKey).toBe("M::Cinza Claro");
    });
  });

  describe("findCatalogProduct", () => {
    it("acha o produto sem precisar resolver tamanho/cor", () => {
      const product = findCatalogProduct("Calça Reta Stitched (NOVAS CORES) - MM Basic Drop", CATALOG_SNAPSHOT);
      expect(product?.name).toBe("Calça Reta Stitched (NOVAS CORES) - MM Basic Drop");
    });

    it("retorna null quando nada bate", () => {
      expect(findCatalogProduct("Produto que não existe de jeito nenhum", CATALOG_SNAPSHOT)).toBeNull();
    });

    // Bug real encontrado em produção: "calça stitched normal" (cliente
    // pedindo a versão normal, não a de cores novas) casava SILENCIOSAMENTE
    // com "Calça Reta Stitched (NOVAS CORES)" — nenhuma palavra do texto
    // bate com "novas"/"cores", então as duas pontuavam igual na
    // sobreposição bruta, e o desempate por ordem do catálogo escolhia
    // sempre a errada (a primeira do array), sem avisar ninguém. O
    // desempate por precisão resolve certo: "Calça Reta Stitched" tem
    // menos palavras sobrando (nenhuma) que a versão "(NOVAS CORES)".
    it("desempata pelo nome mais específico em vez de escolher a errada por ordem do catálogo", () => {
      const result = findCatalogProductWithDetail("calça stitched normal", CATALOG_SNAPSHOT);
      expect(result.ambiguous).toBe(false);
      expect(result.product?.name).toBe("Calça Reta Stitched - MM Basic Drop");
    });

    it("fica ambíguo de verdade quando dois produtos empatam também na precisão", () => {
      const tied: typeof CATALOG_SNAPSHOT[number] = {
        id: "test-tied",
        name: "Calça Reta Stitched - Outro Basic Drop",
        type: "exclusivo",
        category: "calca",
        drop: { id: "test-tied", name: "Calça Reta Stitched - Outro Basic Drop", status: "ativo" },
        active: true,
        variants: [{ variantKey: "M", size: "M", color: null, estoqueReal: 0 }],
      };
      const result = findCatalogProductWithDetail("calça stitched normal", [...CATALOG_SNAPSHOT, tied]);
      expect(result.product).toBeNull();
      expect(result.ambiguous).toBe(true);
    });

    it("empate na sobreposição bruta não é ambiguidade quando um candidato é mais específico (sem palavras sobrando)", () => {
      // "Camiseta Oversized Black/White" e "...Black/White Manga Longa" batem
      // as mesmas 4 palavras — a sem "Manga Longa" sobrando ganha, não é
      // ambíguo.
      const result = findCatalogProductWithDetail("camiseta oversize black white", CATALOG_SNAPSHOT);
      expect(result.ambiguous).toBe(false);
      expect(result.product?.name).toBe("Camiseta Oversized Black/White - MM Basic Drop");
    });
  });

  describe("colorsForSize", () => {
    it("lista as cores disponíveis pro tamanho pedido", () => {
      const product = findCatalogProduct("Calça Reta Stitched (NOVAS CORES) - MM Basic Drop", CATALOG_SNAPSHOT)!;
      expect(colorsForSize(product, "P")).toEqual(["Preto Com Logo Cinza Escura", "Cinza Escura Com Logo Preta"]);
    });

    it("lista vazia quando o tamanho não existe nesse produto", () => {
      const product = findCatalogProduct("Calça Reta Stitched (NOVAS CORES) - MM Basic Drop", CATALOG_SNAPSHOT)!;
      expect(colorsForSize(product, "GG")).toEqual([]);
    });
  });

  describe("sizesForProduct", () => {
    // Bug real em produção: "Regata Boxy - Darkmoon - Carnage" só tem
    // variante size="ÚNICO" — operador digitou "G" (tamanho que não
    // existe pra esse produto) e o pedido inteiro falhou como "Produto
    // não encontrado no catálogo" sem nenhum aviso específico sobre o
    // tamanho estar errado.
    it("lista só ÚNICO pra produto sem grade de tamanho", () => {
      const unico = {
        id: "test-unico",
        name: "Regata Teste Sem Grade",
        type: "exclusivo" as const,
        category: "regata",
        drop: null,
        active: true,
        variants: [{ variantKey: "ÚNICO", size: "ÚNICO", color: null, estoqueReal: 0 }],
      };
      expect(sizesForProduct(unico)).toEqual(["ÚNICO"]);
    });

    it("lista os tamanhos reais em ordem PP..GG, não alfabética", () => {
      const product = findCatalogProduct("Calça Reta Stitched - MM Basic Drop", CATALOG_SNAPSHOT)!;
      expect(sizesForProduct(product)).toEqual(["PP", "P", "M", "G"]);
    });
  });
});
