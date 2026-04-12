/**
 * TRADERLOGPRO CLOUDFLARE WORKER V2
 * 
 * Este script gerencia:
 * 1. /webhook - Recebe notificações da Hotmart e salva no KV
 * 2. /activate - Gera assinatura de licença vinculada ao Hardware ID (PIN)
 * 3. /verify - Verifica se um e-mail possui licença ativa
 */

const SECRET_KEY = "TRADERLOGPRO_SECRET_KEY_2026";
const HOTMART_TOKEN = "SEU_TOKEN_AQUI"; // Pegar na aba Autenticação do Webhook Hotmart

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, h-token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === "/webhook") {
        return await handleWebhook(request, env);
      } else if (path === "/activate") {
        return await handleActivate(request, env);
      } else if (path === "/verify") {
        return await handleVerify(request, env);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * Normaliza o e-mail para evitar erros de case ou pontos no Gmail
 */
function normalizeEmail(email) {
  let lowEmail = email.trim().toLowerCase();
  if (lowEmail.endsWith("@gmail.com")) {
    const [user, domain] = lowEmail.split("@");
    return `${user.replace(/\./g, "")}@${domain}`;
  }
  return lowEmail;
}

/**
 * 1. Gerenciador de Webhook (Hotmart -> Worker)
 */
async function handleWebhook(request, env) {
  const hToken = request.headers.get("h-token");
  
  // Segurança: Verifica se o token da Hotmart bate
  if (hToken !== HOTMART_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json();
  const event = payload.event;
  const data = payload.data;

  // Eventos de Compra Aprovada
  if (event === "PURCHASE_APPROVED") {
    const buyer = data.buyer;
    const purchase = data.purchase;
    const product = data.product;
    
    // Normalização agressiva do e-mail
    const email = normalizeEmail(buyer.email);
    
    // Identifica o plano (Anual ou Vitalício) baseado no nome do produto ou ID da oferta
    const plan = product.name.toUpperCase().includes("VITAL") ? "Lifetime" : "Pro";
    
    // Calcula expiração (se for Vitalício, null; se Anual, +366 dias)
    let expiration = null;
    if (plan === "Pro") {
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      expDate.setDate(expDate.getDate() + 1); // Margem de segurança
      expiration = expDate.toISOString();
    }

    const userData = {
      email: email,
      plan: plan,
      status: "active",
      expiration: expiration,
      transaction: purchase.transaction,
      updated_at: new Date().toISOString()
    };

    // Salva no KV (Namespace configurado no dashboard como CLIENTS_KV)
    await env.CLIENTS_KV.put(email, JSON.stringify(userData));

    return new Response(JSON.stringify({ success: true, message: "Webhook processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ success: true, status: "Event ignored" }), { status: 200 });
}

/**
 * 2. Ativação Online (App -> Worker)
 */
async function handleActivate(request, env) {
  const { email, hwid } = await request.json();
  const normalizedEmail = normalizeEmail(email);

  // Busca no KV
  const storedData = await env.CLIENTS_KV.get(normalizedEmail);
  if (!storedData) {
    return new Response(JSON.stringify({ success: false, error: "Nenhuma licença encontrada para este e-mail." }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const userData = JSON.parse(storedData);
  
  // Gera a chave assinada (Protocolo TLP-v1)
  const license = await generateSignedLicense(userData, hwid);

  return new Response(JSON.stringify({
    success: true,
    license: license,
    plan: userData.plan,
    expiration: userData.expiration
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

/**
 * 3. Verificação (App -> Worker)
 */
async function handleVerify(request, env) {
  const { email } = await request.json();
  const normalizedEmail = normalizeEmail(email);
  const storedData = await env.CLIENTS_KV.get(normalizedEmail);

  if (!storedData) {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ valid: true, data: JSON.parse(storedData) }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

/**
 * Gera a chave de licença no formato: TLP-v1-PayloadB64-Signature
 */
async function generateSignedLicense(userData, hwid) {
  const payload = {
    plan: userData.plan,
    exp: userData.expiration,
    cid: hwid,
    created_at: new Date().toISOString()
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = btoa(payloadStr); // Use btoa no Worker (env JS padrão)
  const version = "v1";
  const prefix = "TLP";

  const dataToSign = `${prefix}-${version}-${payloadB64}`;
  
  // HMAC com Web Crypto API no Worker
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign)
  );
  
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${dataToSign}-${signatureHex}`;
}
