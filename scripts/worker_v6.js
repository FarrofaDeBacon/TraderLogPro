/* WORKER v7.2 - TRADERLOGPRO PRIVATE COMMAND CENTER
 * 
 * Central Command (EXCLUSIVE FOR ADMIN):
 * - Internal License Generator (Manual .lic emission)
 * - Manual License Management
 * - Hotmart Automation Monitoring
 * - Remote Machine Reset & License Editing
 * - Background Activation API (For Tauri App)
 */

const PREFIX = "TLP";
const VERSION = "v1";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Hotmart-Hottok",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // --- 0. HELPER: NORMALIZAÇÃO DE E-MAIL ---
    const normalizeEmail = (email) => {
      if (!email) return "";
      let lowEmail = email.toLowerCase().trim();
      if (lowEmail.endsWith("@gmail.com")) {
        const [user, domain] = lowEmail.split("@");
        return `${user.replace(/\./g, "")}@${domain}`;
      }
      return lowEmail;
    };

    // --- 1. HOTMART WEBHOOK ---
    if ((url.pathname === "/hotmart-webhook" || url.pathname === "/webhook") && request.method === "POST") {
      return await handleHotmartWebhook(request, env, normalizeEmail);
    }

    // --- 2. VERIFICAÇÃO ONLINE (APP HEARTBEAT) ---
    if (url.pathname === "/verify" && request.method === "POST") {
      return await handleVerify(request, env, corsHeaders, normalizeEmail);
    }

    // --- 3. API ADMIN (PROTEGIDA) ---
    if (url.pathname.startsWith("/api/admin/")) {
      const auth = request.headers.get("Authorization");
      const expectedPass = (env.ADMIN_PASSWORD || "1234").trim();
      const masterPass = "TLP2026"; // SENHA MESTRA DE EMERGÊNCIA
      
      const isCorrect = auth === `Basic ${btoa("admin:" + expectedPass)}` || auth === `Basic ${btoa("admin:" + masterPass)}`;

      if (!auth || !isCorrect) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      if (url.pathname === "/api/admin/clients") {
        try {
          if (request.method === "GET") {
            const list = await env.CLIENTS_KV.list();
            const clients = [];
            for (const key of list.keys) {
              const val = await env.CLIENTS_KV.get(key.name, "json");
              clients.push({ email: key.name, ...val });
            }
            return new Response(JSON.stringify(clients), { headers: { "Content-Type": "application/json", ...corsHeaders } });
          }
          if (request.method === "POST") {
            const body = await request.json();
            const cleanEmail = normalizeEmail(body.email);
            const existing = await env.CLIENTS_KV.get(cleanEmail, "json");
            
            let expiration = body.expiration || (existing ? existing.expiration : null);
            if (body.days && body.plan !== "Lifetime") {
              const date = existing && existing.expiration ? new Date(existing.expiration) : new Date();
              date.setDate(date.getDate() + parseInt(body.days));
              expiration = date.toISOString();
            }

            const dataToSave = {
              plan: body.plan || (existing ? existing.plan : "Pro"),
              seats: parseInt(body.seats || (existing ? existing.seats : 1)),
              expiration: expiration,
              purchase_date: existing?.purchase_date || new Date().toISOString(),
              status: body.status || (existing ? existing.status : "approved"),
              devices: body.reset_devices ? [] : (existing ? existing.devices : []),
              hotmart_trans: body.is_manual ? "manual" : (existing?.hotmart_trans || "manual")
            };

            await env.CLIENTS_KV.put(cleanEmail, JSON.stringify(dataToSave));
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
          }
          if (request.method === "DELETE") {
            const email = url.searchParams.get("email");
            await env.CLIENTS_KV.delete(normalizeEmail(email));
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
          }
        } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); }
      }
    }

    // --- 4. ATIVAÇÃO (API FONTE - ACESSÍVEL PARA O APP E AGORA PARA O ADMIN NO PORTAL) ---
    if (request.method === "POST" && url.pathname === "/activate") {
      try {
        const { email, hwid } = await request.json();
        if (!email || !hwid) return new Response(JSON.stringify({ error: "E-mail e HWID são obrigatórios." }), { status: 200, headers: corsHeaders });
        
        const rawEmail = email.toLowerCase().trim();
        let clientData = await env.CLIENTS_KV.get(rawEmail, "json");
        let activeKey = rawEmail;

        if (!clientData && rawEmail.endsWith("@gmail.com")) {
            const cleanEmail = normalizeEmail(rawEmail);
            if (cleanEmail !== rawEmail) {
                clientData = await env.CLIENTS_KV.get(cleanEmail, "json");
                activeKey = cleanEmail;
            }
        }
        
        if (!clientData) return new Response(JSON.stringify({ error: `E-mail não autorizado: ${rawEmail}` }), { status: 200, headers: corsHeaders });
        
        if (clientData.status === "refunded" || clientData.status === "canceled") {
           return new Response(JSON.stringify({ error: "Sua licença foi revogada." }), { status: 200, headers: corsHeaders });
        }

        const cleanID = hwid.trim().toUpperCase(); 
        const devices = clientData.devices || [];
        
        if (!devices.includes(cleanID)) {
          if (devices.length >= (clientData.seats || 1)) return new Response(JSON.stringify({ error: `Limite de máquinas atingido (${devices.length}/${clientData.seats || 1})` }), { status: 200, headers: corsHeaders });
          devices.push(cleanID);
          clientData.devices = devices;
          await env.CLIENTS_KV.put(activeKey, JSON.stringify(clientData));
        }

        const pDate = new Date(clientData.purchase_date || clientData.updatedAt || new Date());
        const daysDiff = (new Date().getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24);
        const isManual = clientData.hotmart_trans === "manual";
        const inGuarantee = !isManual && daysDiff < 7;
        let finalExp = clientData.expiration;

        // Se estiver em garantia (Hotmart), liberamos o Pro por apenas 7 dias
        // para dar acesso imediato mas garantir um novo check após o prazo de reembolso.
        if (inGuarantee) {
           const tempDate = new Date();
           tempDate.setDate(tempDate.getDate() + 7);
           finalExp = tempDate.toISOString();
        }

        const payload = { plan: clientData.plan, exp: finalExp || null, cid: cleanID, real_exp: clientData.expiration || null };
        const payloadB64 = btoa(JSON.stringify(payload));
        const dataToSign = `${PREFIX}-${VERSION}-${payloadB64}`;
        const secret = env.SECRET_KEY || env.HMAC_SECRET || "TRADERLOGPRO_SECRET_KEY_2026";
        const sig = await signHMAC(secret, dataToSign);
        
        return new Response(JSON.stringify({ 
          success: true, 
          license: `${dataToSign}-${sig}`, 
          filename: `${cleanID}.lic`,
          plan: clientData.plan,
          expiration: clientData.expiration,
          inGuarantee: inGuarantee,
          daysLeft: Math.ceil(7 - daysDiff)
        }), { headers: corsHeaders });
      } catch (e) { return new Response(JSON.stringify({ error: "Erro interno no servidor." }), { status: 500, headers: corsHeaders }); }
    }

    // --- 5. PRIVATE PORTAL (GET ALL) ---
    if (request.method === "GET") {
      return new Response(getAdminPortalHTML(), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};

// --- HELPERS ---
async function handleHotmartWebhook(request, env, normalizeEmail) {
  const hottok = request.headers.get("X-HOTMART-HOTTOK") || request.headers.get("X-HOTMART-H-TOKEN") || request.headers.get("h-token");
  const expectedTok = env.HOTTOK || env.HOTMART_TOKEN || "B2A6045CF14_SEU_TOKEN_PADRAO";
  if (hottok && hottok !== expectedTok) return new Response("Unauthorized", { status: 401 });
  const payload = await request.json();
  const data = payload.data;
  if (!data || !data.buyer) return new Response("Invalid Payload", { status: 400 });
  const email = normalizeEmail(data.buyer.email);
  if (payload.event === "PURCHASE_APPROVED") {
    const isLifetime = data.product?.name?.toUpperCase()?.includes("LIFETIME");
    let expiration = null;
    if (!isLifetime) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      expiration = expiryDate.toISOString();
    }
    await env.CLIENTS_KV.put(email, JSON.stringify({
      plan: isLifetime ? "Lifetime" : "Pro",
      seats: 1,
      expiration: expiration,
      purchase_date: new Date().toISOString(),
      status: "approved",
      devices: [],
      hotmart_trans: data.purchase?.transaction || "webhook"
    }));
  } else if (["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED"].includes(payload.event)) {
    const existing = await env.CLIENTS_KV.get(email, "json");
    if (existing) {
      existing.status = "refunded";
      await env.CLIENTS_KV.put(email, JSON.stringify(existing));
    }
  }
  return new Response("OK");
}

async function handleVerify(request, env, corsHeaders, normalizeEmail) {
  try {
    const { email } = await request.json();
    if (!email) return new Response(JSON.stringify({ valid: false }), { headers: corsHeaders });
    const data = await env.CLIENTS_KV.get(normalizeEmail(email), "json");
    if (!data || !["approved", "active"].includes(data.status)) return new Response(JSON.stringify({ valid: false }), { headers: corsHeaders });
    return new Response(JSON.stringify({ valid: true, plan: data.plan }), { headers: corsHeaders });
  } catch(e) { return new Response("Error", { status: 500 }); }
}

async function signHMAC(key, data) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Array.from(new Uint8Array(s)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- PRIVATE ADMIN PORTAL HTML v7.2 ---
function getAdminPortalHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraderLogPro | Command Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root { --emerald: #10b981; --rose: #f43f5e; --slate: #0f172a; --bg: #020617; }
    body { background: var(--bg); color: #f8fafc; font-family: 'Inter', sans-serif; overflow-x: hidden; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
    .pill { border-radius: 9999px; }
    .nav-item { transition: all 0.2s; cursor: pointer; }
    .nav-item:hover, .nav-item.active { background: rgba(255, 255, 255, 0.05); color: var(--emerald); }
    .hide { display: none !important; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    .btn-emerald { background: var(--emerald); color: #000; font-weight: 900; }
  </style>
</head>
<body>
  <!-- MAIN APP (HIDDEN UNTIL LOGIN) -->
  <div id="main-app" class="flex h-screen overflow-hidden hide">
    <!-- SIDEBAR -->
    <aside class="w-72 glass border-r border-white/5 flex flex-col p-6 z-50">
      <div class="mb-12">
        <h1 class="text-2xl font-black tracking-tighter flex items-center gap-3">
          <div class="w-8 h-8 btn-emerald pill flex items-center justify-center">
            <i data-lucide="zap" class="w-5 h-5 text-black"></i>
          </div>
          TRADERLOG<span class="text-emerald-500">PRO</span>
        </h1>
        <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2 px-1">Control HQ</p>
      </div>

      <nav class="flex-1 space-y-2">
        <div onclick="switchPage('activate')" id="nav-activate" class="nav-item flex items-center gap-4 px-4 py-4 pill text-[11px] font-black uppercase tracking-widest active">
          <i data-lucide="key" class="w-5 h-5"></i> Gerar Licença
        </div>
        <div onclick="switchPage('hotmart')" id="nav-hotmart" class="nav-item flex items-center gap-4 px-4 py-4 pill text-[11px] font-black uppercase tracking-widest">
          <i data-lucide="activity" class="w-5 h-5"></i> Gestão Hotmart
        </div>
        <div onclick="switchPage('manual')" id="nav-manual" class="nav-item flex items-center gap-4 px-4 py-4 pill text-[11px] font-black uppercase tracking-widest">
          <i data-lucide="user-plus" class="w-5 h-5"></i> Gestão Manual
        </div>
      </nav>

      <div class="mt-auto pt-6 border-t border-white/5">
        <div onclick="logout()" class="nav-item flex items-center gap-4 px-4 py-4 pill text-[10px] font-black uppercase tracking-widest text-rose-500">
          <i data-lucide="log-out" class="w-5 h-5"></i> Sair do HQ
        </div>
      </div>
    </aside>

    <!-- CONTENT -->
    <main class="flex-1 relative overflow-y-auto p-12">
      <!-- VIEW: ACTIVATE (INTERNAL TOOL) -->
      <section id="view-activate" class="max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
        <header class="text-center">
          <h2 class="text-3xl font-black">Emissor de Licença</h2>
          <p class="text-slate-500 text-sm mt-2 font-bold">Use para gerar arquivos .LIC manualmente para seus clientes.</p>
        </header>
        <div class="glass p-10 rounded-[2rem] space-y-6">
          <div class="space-y-1"><label class="text-[9px] font-black uppercase text-slate-500 ml-4">E-mail do Cliente</label><input id="act-email" class="w-full bg-black/40 border border-white/10 pill h-12 px-6 text-sm outline-none"></div>
          <div class="space-y-1"><label class="text-[9px] font-black uppercase text-slate-500 ml-4">Hardware ID</label><input id="act-hwid" class="w-full bg-black/40 border border-white/10 pill h-12 px-6 font-mono text-sm outline-none"></div>
          <button onclick="generateLic()" class="w-full h-14 btn-emerald pill text-[11px] uppercase tracking-widest hover:scale-[1.02] transition-transform">Gerar e Baixar .LIC</button>
          <div id="act-msg" class="text-center text-[10px] font-black uppercase text-slate-500 h-4"></div>
        </div>
      </section>

      <!-- VIEW: MANAGEMENT -->
      <section id="view-mgmt" class="space-y-8 animate-in fade-in duration-300 hide">
        <header class="flex items-center justify-between">
          <div><h2 id="mgmt-title" class="text-3xl font-black">Gestão Hotmart</h2><p class="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-1">Sincronizado SurrealDB/KV</p></div>
          <button onclick="openCreateModal()" id="add-manual-btn" class="h-12 px-8 btn-emerald pill text-[10px] uppercase tracking-widest flex items-center gap-3 hide"><i data-lucide="plus" class="w-4 h-4"></i> Novo Cadastro</button>
        </header>
        <div class="grid grid-cols-2 gap-6 w-full max-w-lg">
          <div class="glass p-6 rounded-3xl"><p class="text-[9px] font-black uppercase text-slate-500">Exibidos</p><h4 id="stat-total" class="text-3xl font-black text-emerald-500">0</h4></div>
          <div class="glass p-6 rounded-3xl"><p class="text-[9px] font-black uppercase text-slate-500">Garantia (Hotmart)</p><h4 id="stat-guarantee" class="text-3xl font-black text-amber-500">0</h4></div>
        </div>
        <div class="glass rounded-[2rem] overflow-hidden">
          <table class="w-full text-left">
            <thead><tr class="bg-white/5 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400"><th class="px-8 py-5">Cliente</th><th class="px-8 py-5">Plano/Termo</th><th class="px-8 py-5">Seats</th><th class="px-8 py-5 text-right">Ações</th></tr></thead>
            <tbody id="client-list"></tbody>
          </table>
        </div>
      </section>

      <!-- MODAL: EDIT -->
      <div id="modal-edit" class="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-md hide">
        <div class="glass w-[500px] p-12 rounded-[2.5rem] space-y-6">
          <h3 id="edit-title" class="text-xl font-black uppercase tracking-widest">Ajustar Licença</h3>
          <div class="space-y-4">
            <div><label class="text-[9px] font-black text-slate-500 ml-3">E-MAIL</label><input id="edit-email" class="w-full bg-black/40 border border-white/10 pill h-12 px-6 text-sm outline-none"></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="text-[9px] font-black text-slate-500 ml-3">PLANO</label><select id="edit-plan" class="w-full bg-black/40 border border-white/10 pill h-12 px-6 text-sm outline-none"><option value="Pro">Pro</option><option value="Lifetime">Lifetime</option></select></div>
              <div><label class="text-[9px] font-black text-slate-500 ml-3">ASSENTOS</label><input id="edit-seats" type="number" class="w-full bg-black/40 border border-white/10 pill h-12 px-6 text-sm outline-none"></div>
            </div>
            <div><label class="text-[9px] font-black text-slate-500 ml-3">ADD DIAS</label><input id="edit-days" type="number" placeholder="Ex: 365" class="w-full bg-black/40 border border-white/10 pill h-12 px-6 text-sm outline-none"></div>
            <div id="edit-reset-box" class="flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl hide"><input type="checkbox" id="edit-reset-hwid"><label class="text-[8px] font-bold text-rose-500 uppercase">Resetar Máquinas Vinculadas</label></div>
          </div>
          <div class="flex gap-3"><button onclick="closeEditModal()" class="flex-1 h-12 glass pill text-[10px] uppercase font-bold">Voltar</button><button onclick="saveClient()" class="flex-1 h-12 btn-emerald pill text-[10px] uppercase font-bold">Salvar</button></div>
        </div>
      </div>
    </main>
  </div>

  <!-- LOGIN -->
  <div id="modal-login" class="fixed inset-0 z-[200] flex items-center justify-center bg-bg">
    <div class="glass w-[400px] p-12 rounded-[2.5rem] space-y-8 text-center border-emerald-500/20">
      <div class="w-16 h-16 btn-emerald pill mx-auto flex items-center justify-center"><i data-lucide="lock" class="w-8 h-8"></i></div>
      <h3 class="text-xl font-black uppercase tracking-widest text-white">Private HQ</h3>
      <input id="login-pass" type="password" placeholder="SENHA MESTRE" class="w-full bg-black/40 border border-white/10 pill h-14 px-8 text-center text-lg outline-none focus:border-emerald-500/50">
      <button onclick="login()" class="w-full h-14 btn-emerald pill uppercase text-[10px] font-black tracking-widest">Entrar no Comando</button>
    </div>
  </div>

  <script>
    lucide.createIcons();
    let currentPage = 'activate';
    let allClients = [];
    let adminToken = sessionStorage.getItem('admin_token');

    function switchPage(page) {
      currentPage = page;
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.getElementById('nav-' + page).classList.add('active');
      document.getElementById('view-activate').classList.toggle('hide', page !== 'activate');
      document.getElementById('view-mgmt').classList.toggle('hide', page === 'activate');
      if (page !== 'activate') {
        document.getElementById('mgmt-title').innerText = page === 'hotmart' ? 'Licenças Hotmart' : 'Gestão Manual';
        document.getElementById('add-manual-btn').classList.toggle('hide', page !== 'manual');
        renderClients();
      }
    }

    function login() {
      const p = document.getElementById('login-pass').value.trim(); // Adicionando TRIM
      const t = btoa('admin:' + p);
      fetch('/api/admin/clients', { headers: { 'Authorization': 'Basic ' + t } }).then(r => {
        if (r.ok) { adminToken = t; sessionStorage.setItem('admin_token', t); initApp(); } else alert('Acesso Negado');
      });
    }

    function initApp() {
      document.getElementById('modal-login').classList.add('hide');
      document.getElementById('main-app').classList.remove('hide');
      loadClients();
    }

    if (adminToken) initApp();
    function logout() { sessionStorage.removeItem('admin_token'); location.reload(); }

    async function loadClients() {
      const r = await fetch('/api/admin/clients', { headers: { 'Authorization': 'Basic ' + adminToken } });
      allClients = await r.json(); renderClients();
    }

    function renderClients() {
      const isH = currentPage === 'hotmart';
      const f = allClients.filter(c => isH ? (c.hotmart_trans !== 'manual') : (c.hotmart_trans === 'manual'));
      document.getElementById('stat-total').innerText = f.length;
      document.getElementById('stat-guarantee').innerText = f.filter(c => {
        const d = (new Date() - new Date(c.purchase_date))/(1000*60*60*24);
        return d < 7 && c.hotmart_trans !== 'manual';
      }).length;

      document.getElementById('client-list').innerHTML = f.map(c => \`
        <tr class="border-b border-white/5 hover:bg-white/[0.02] group">
          <td class="px-8 py-6"><div class="flex items-center gap-3"><div onclick="navigator.clipboard.writeText('\${c.email}'); alert('Copiado!')" class="w-8 h-8 pill glass flex items-center justify-center cursor-pointer hover:bg-emerald-500"><i data-lucide="copy" class="w-3 h-3"></i></div><div class="text-sm font-black text-white">\${c.email}</div></div></td>
          <td class="px-8 py-6"><span class="px-2 py-1 bg-white/5 rounded text-[9px] font-black uppercase text-white">\${c.plan}</span><div class="text-[10px] text-slate-500 mt-1">\${c.expiration ? new Date(c.expiration).toLocaleDateString() : 'Vitalícia'}</div></td>
          <td class="px-8 py-6 text-[10px] font-bold text-slate-400">\${(c.devices||[]).length} / \${c.seats||1}</td>
          <td class="px-8 py-6 text-right space-x-2">
            <button onclick="editClient('\${c.email}')" class="w-9 h-9 pill glass inline-flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteClient('\${c.email}')" class="w-9 h-9 pill glass inline-flex items-center justify-center hover:bg-rose-500 text-white transition-all">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>\`).join('');
      lucide.createIcons();
    }

    async function generateLic() {
      const e = document.getElementById('act-email').value, h = document.getElementById('act-hwid').value, m = document.getElementById('act-msg');
      if (!e || !h) { m.innerText = 'Preencha tudo!'; return; }
      m.innerText = 'Processando...';
      try {
        const r = await fetch('/activate', { method: 'POST', body: JSON.stringify({ email: e, hwid: h }) });
        const d = await r.json();
        if (d.success) {
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d.license])); a.download = d.filename; a.click();
          m.innerText = 'LICENÇA BAIXADA!';
        } else m.innerText = 'ERRO: ' + d.error;
      } catch(ex) { m.innerText = 'Erro na conexão'; }
    }

    function editClient(email) {
      const c = allClients.find(x => x.email === email);
      document.getElementById('edit-title').innerText = 'Ajustar Licença';
      document.getElementById('edit-email').value = c.email; document.getElementById('edit-email').disabled = true;
      document.getElementById('edit-plan').value = c.plan; document.getElementById('edit-seats').value = c.seats || 1;
      document.getElementById('edit-reset-box').classList.remove('hide');
      document.getElementById('modal-edit').classList.remove('hide');
    }

    function openCreateModal() {
      document.getElementById('edit-title').innerText = 'Novo Cadastro';
      document.getElementById('edit-email').value = ''; document.getElementById('edit-email').disabled = false;
      document.getElementById('edit-plan').value = 'Pro'; document.getElementById('edit-seats').value = 1;
      document.getElementById('edit-reset-box').classList.add('hide');
      document.getElementById('modal-edit').classList.remove('hide');
    }

    async function saveClient() {
      const p = { 
        email: document.getElementById('edit-email').value, plan: document.getElementById('edit-plan').value,
        seats: document.getElementById('edit-seats').value, days: document.getElementById('edit-days').value,
        reset_devices: document.getElementById('edit-reset-hwid').checked,
        is_manual: document.getElementById('edit-title').innerText.includes('Novo')
      };
      await fetch('/api/admin/clients', { method: 'POST', headers: { 'Authorization': 'Basic ' + adminToken }, body: JSON.stringify(p) });
      closeEditModal(); loadClients();
    }

    function closeEditModal() { document.getElementById('modal-edit').classList.add('hide'); }
    async function deleteClient(e) { if(confirm('Excluir?')) { await fetch('/api/admin/clients?email='+encodeURIComponent(e), { method: 'DELETE', headers: { 'Authorization': 'Basic ' + adminToken } }); loadClients(); } }
  </script>
</body>
</html>`;
}
