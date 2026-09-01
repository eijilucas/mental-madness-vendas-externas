// HMAC-SHA256 em hex — mesmo esquema descrito em
// docs/api-contracts/04-shipping-callback.md (X-Signature: <hex>), usado
// pra assinar/verificar o callback assinado do mm-etiquetas
// (integration-callback). Não reaproveita o HMAC do shopify-webhook do
// mm-etiquetas porque aquele é base64 (convenção da própria Shopify) — aqui
// é um contrato novo, nosso, então usamos hex por simplicidade de debug.

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signHmacHex(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return toHex(new Uint8Array(signature));
}

export async function verifyHmacHex(rawBody: string, signatureHex: string | null | undefined, secret: string): Promise<boolean> {
  if (!signatureHex) return false;
  const expected = await signHmacHex(rawBody, secret);
  return timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(signatureHex));
}
