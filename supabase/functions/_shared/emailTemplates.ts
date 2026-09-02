// ============================================================================
// Template de e-mail transacional "pedido saiu para entrega" (Resend).
//
// Direção visual: identidade Mental Madness (preto absoluto, branco,
// tipografia condensada tracked, muito espaço negativo, bordas finas,
// botão contornado) — seguindo o mesmo visual do site (cards com borda +
// título em Horst Blackletter, botões outline, sem preenchimento sólido).
// HTML com layout em tabela + CSS inline (bulletproof) para renderizar de
// forma consistente em Outlook, Gmail e clientes mobile.
//
// Wordmark: renderizado a partir da fonte real (Horst Blackletter, mesma
// usada no site) e hospedado no Storage do projeto — e-mail não consegue
// carregar @font-face customizada de forma confiável, então a marca vira
// imagem (leve, PNG com fundo transparente).
//
// Imagens via URL hospedada (Storage), não CID: testamos embutir como
// anexo inline (cid:...) pra evitar o aviso de "conteúdo externo" do
// Gmail/Outlook, mas o Outlook.com/New Outlook não resolve CID vindo de
// APIs de terceiros de forma confiável — quebrou a renderização em teste
// real (ficou com ícone de imagem quebrada + anexos soltos). Revertido
// pra URL direta, que é o que comprovadamente funciona nos clientes
// testados. EMAIL_ASSET_CIDS/EMAIL_ASSET_URLS ficam exportados caso essa
// rota volte a ser viável no futuro.
// ============================================================================

const ASSET_BASE = "https://yriimdzhvohlqdgigbbg.supabase.co/storage/v1/object/public/email-assets";
// Fundo preto sólido como IMAGEM (não CSS) — o algoritmo de dark-mode dos
// clientes de e-mail reprocessa cor de CSS, mas não mexe em pixel de
// imagem, então isso é a garantia mais forte de que o fundo nunca vira
// claro. Continua atrás do bgcolor/background-color (que aparecem antes da
// imagem carregar, ou se imagens estiverem bloqueadas).
const BG_BLACK_URL = `${ASSET_BASE}/mental-madness-bg-black.png`;

export const EMAIL_ASSET_CIDS = {
  mark: "mm-mark",
  wordmark: "mm-wordmark",
  banner: "mm-banner",
  tribalTl: "mm-tribal-tl",
  tribalBr: "mm-tribal-br",
  iconDiscord: "mm-icon-discord",
  iconWhatsapp: "mm-icon-whatsapp",
  iconInstagram: "mm-icon-instagram",
} as const;

export const EMAIL_ASSET_URLS: Record<keyof typeof EMAIL_ASSET_CIDS, string> = {
  mark: `${ASSET_BASE}/mental-madness-mark.png`,
  wordmark: `${ASSET_BASE}/mental-madness-wordmark.png`,
  banner: `${ASSET_BASE}/mental-madness-banner.jpg`,
  // -v2: nome novo pra evitar cache de imagem de proxy de e-mail (Outlook)
  // que ficou servindo uma versão antiga do arquivo com o mesmo nome.
  tribalTl: `${ASSET_BASE}/mental-madness-tribal-tl-v2.png`,
  tribalBr: `${ASSET_BASE}/mental-madness-tribal-br-v2.png`,
  iconDiscord: `${ASSET_BASE}/mental-madness-icon-discord.png`,
  iconWhatsapp: `${ASSET_BASE}/mental-madness-icon-whatsapp.png`,
  iconInstagram: `${ASSET_BASE}/mental-madness-icon-instagram.png`,
};

export interface TrackingEmailParams {
  customerName: string;
  publicNumber: number;
  trackingCode: string;
  trackingUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTrackingEmailHtml(params: TrackingEmailParams): string {
  const customerName = escapeHtml(params.customerName);
  const trackingCode = escapeHtml(params.trackingCode);
  const trackingUrl = params.trackingUrl ?? "https://melhorrastreio.com.br";

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Seu pedido saiu para entrega</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>
  table, td { border-collapse: collapse; }
  * { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" type="text/css">
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #000000; }
  a { text-decoration: none; }

  /* Trava a paleta escura independente do tema do dispositivo — alguns
     clientes (Gmail, Outlook.com) tentam "adaptar" a cor de fundo/texto
     pro modo claro/escuro do sistema mesmo com um design já intencionalmente
     escuro. Reafirmar as MESMAS cores dentro dos dois media queries (e não
     só nos metas color-scheme/supported-color-schemes do <head>, que
     alguns clientes ignoram) impede tanto a inversão quanto o clareamento. */
  @media (prefers-color-scheme: light), (prefers-color-scheme: dark) {
    body, .mm-bg { background-color: #000000 !important; }
  }

  @media only screen and (max-width: 600px) {
    .mm-container { width: 100% !important; max-width: 100% !important; }
    .mm-px { padding-left: 24px !important; padding-right: 24px !important; }
    .mm-headline { font-size: 24px !important; line-height: 30px !important; }
    .mm-code { font-size: 22px !important; letter-spacing: 3px !important; }
    .mm-btn-pad { padding-left: 32px !important; padding-right: 32px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#000000; background-image:url('${BG_BLACK_URL}'); background-repeat:repeat;" bgcolor="#000000" background="${BG_BLACK_URL}">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#000000; opacity:0;">
    Seu pedido já foi postado. Código de rastreio: ${trackingCode}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" background="${BG_BLACK_URL}" class="mm-bg" style="background-color:#000000; background-image:url('${BG_BLACK_URL}'); background-repeat:repeat;">
    <tr>
      <td align="center" bgcolor="#000000" background="${BG_BLACK_URL}" class="mm-bg" style="padding: 48px 16px; background-color:#000000; background-image:url('${BG_BLACK_URL}'); background-repeat:repeat;">

        <table role="presentation" class="mm-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

          <tr>
            <td align="center" class="mm-px" style="padding: 40px 0 20px;">
              <img src="${EMAIL_ASSET_URLS.mark}" width="60" height="60" alt="" style="display:block; width:60px; height:60px; border:0; outline:none; margin: 0 auto 18px;">
              <img src="${EMAIL_ASSET_URLS.wordmark}" width="280" height="58" alt="Mental Madness" style="display:block; width:280px; height:58px; border:0; outline:none; margin: 0 auto;">
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0 0;">
              <img src="${EMAIL_ASSET_URLS.banner}" width="600" height="202" alt="" style="display:block; width:100%; max-width:600px; height:auto; border:0; outline:none;">
            </td>
          </tr>

          <tr>
            <td style="border-top: 1px solid #1c1c1a; font-size:1px; line-height:1px;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" class="mm-px" style="padding: 36px 48px 16px;">
              <span class="mm-headline" style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 28px; line-height: 34px; font-weight: 600; color: #f4f4f2; text-transform: uppercase; letter-spacing: 0.5px;">
                Seu pedido saiu&nbsp;para entrega&nbsp;💜
              </span>
            </td>
          </tr>

          <tr>
            <td align="center" class="mm-px" style="padding: 0 48px 36px;">
              <span style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; font-weight: 400; color: #9a9a94;">
                Oi, ${customerName}. Seu pedido <span style="color:#f4f4f2; font-weight:600;">#${params.publicNumber}</span> já foi postado e está a caminho.
              </span>
            </td>
          </tr>

          <tr>
            <td align="center" class="mm-px" style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #2a2a28;">
                <tr>
                  <td width="62" valign="middle" align="left" style="padding: 0 0 0 10px; line-height:0;">
                    <img src="${EMAIL_ASSET_URLS.tribalTl}" width="52" height="53" alt="" style="display:block; width:52px; height:53px; border:0; outline:none;">
                  </td>
                  <td align="center" valign="middle" style="padding: 26px 4px;">
                    <span style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 3px; color: #7a7a74; text-transform: uppercase;">Código de rastreio</span>
                    <br>
                    <span class="mm-code" style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 26px; line-height: 40px; font-weight: 600; letter-spacing: 4px; color: #ffffff;">${trackingCode}</span>
                  </td>
                  <td width="62" valign="middle" align="right" style="padding: 0 10px 0 0; line-height:0;">
                    <img src="${EMAIL_ASSET_URLS.tribalBr}" width="52" height="53" alt="" style="display:block; width:52px; height:53px; border:0; outline:none;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#000000" style="background-color:#000000; border: 1px solid #f4f4f2;">
                    <a href="${trackingUrl}" target="_blank" class="mm-btn-pad"
                       style="display:inline-block; font-family:'Oswald', Arial, Helvetica, sans-serif; font-size:14px; font-weight:700; letter-spacing:3px; color:#f4f4f2; text-transform:uppercase; text-decoration:none; padding: 16px 52px;">
                      Acompanhar pedido
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" class="mm-px" style="padding: 0 48px 48px;">
              <span style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; color: #7a7a74;">
                Acompanhe seu pedido pelo Melhor Rastreio usando o código acima.
              </span>
            </td>
          </tr>

          <tr>
            <td style="border-top: 1px solid #1c1c1a; font-size:1px; line-height:1px;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" class="mm-px" style="padding: 36px 48px 44px;">
              <span style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; color: #7a7a74;">
                Obrigado por fazer parte da Mental Madness.
              </span>
            </td>
          </tr>

          <tr>
            <td align="center" class="mm-px" style="padding: 0 24px 28px;">
              <span style="font-family: 'Oswald', Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 4px; color: #f4f4f2; text-transform: uppercase;">MENTAL MADNESS</span>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 16px 48px; font-size:0;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block; border: 1px solid #2a2a28; margin: 4px;">
                <tr>
                  <td style="padding: 10px 16px;">
                    <a href="https://discord.gg/jR96jVhdwt" target="_blank" style="display:inline-block; font-family:'Oswald', Arial, Helvetica, sans-serif; font-size:11px; font-weight:500; letter-spacing:1px; color:#f4f4f2; text-decoration:none; white-space:nowrap;">
                      <img src="${EMAIL_ASSET_URLS.iconDiscord}" width="13" height="13" alt="" style="display:inline-block; width:13px; height:13px; vertical-align:middle; margin-right:7px; border:0;">Discord
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block; border: 1px solid #2a2a28; margin: 4px;">
                <tr>
                  <td style="padding: 10px 16px;">
                    <a href="https://wa.me/5511920858357" target="_blank" style="display:inline-block; font-family:'Oswald', Arial, Helvetica, sans-serif; font-size:11px; font-weight:500; letter-spacing:1px; color:#f4f4f2; text-decoration:none; white-space:nowrap;">
                      <img src="${EMAIL_ASSET_URLS.iconWhatsapp}" width="13" height="13" alt="" style="display:inline-block; width:13px; height:13px; vertical-align:middle; margin-right:7px; border:0;">WhatsApp
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block; border: 1px solid #2a2a28; margin: 4px;">
                <tr>
                  <td style="padding: 10px 16px;">
                    <a href="https://instagram.com/mentalmadness__" target="_blank" style="display:inline-block; font-family:'Oswald', Arial, Helvetica, sans-serif; font-size:11px; font-weight:500; letter-spacing:1px; color:#f4f4f2; text-decoration:none; white-space:nowrap;">
                      <img src="${EMAIL_ASSET_URLS.iconInstagram}" width="13" height="13" alt="" style="display:inline-block; width:13px; height:13px; vertical-align:middle; margin-right:7px; border:0;">Instagram
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
