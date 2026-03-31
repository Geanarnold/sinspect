'use strict';

// =============================================================
// SUPABASE CONFIG
// =============================================================
const SUPABASE_URL = 'https://ejgustsjagmbzuflofdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ycRGKaPJQKybH8KE-K56Uw_05Yz7bsb';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================
// CHECKLISTS POR TIPO DE ESTRUTURA
// =============================================================
const CHECKLISTS = {
  porta_paletes: [
    { grupo: 'SAPATAS', itens: ['Chumbada / fixada ao piso', 'Sem danificação ou deformação', 'Instalação adequada / nivelada'] },
    { grupo: 'COLUNA / MONTANTE', itens: ['Parafusos de fixação presentes', 'Sem danificação ou amassamento', 'Sem corrosão', 'Sem deformação ou torção', 'Prumo vertical adequado'] },
    { grupo: 'DIAGONAL / TRAVESSA', itens: ['Sem danificação', 'Sem deformação', 'Conexões e soldas íntegras'] },
    { grupo: 'LONGARINA / VIGA', itens: ['Encaixada corretamente no montante', 'Sem danificação ou amassamento', 'Pino de travamento presente', 'Sem deflexão visível'] },
    { grupo: 'PROTETOR / GUARD-RAIL', itens: ['Parafusos fixados', 'Sem danificação', 'Instalação adequada e completa'] },
    { grupo: 'GERAL', itens: ['Placa de carga visível e legível', 'Cargas dentro do limite indicado', 'Corredores livres de obstáculos', 'Sinalização de segurança adequada'] }
  ],
  drive_in: [
    { grupo: 'SAPATAS', itens: ['Chumbada / fixada ao piso', 'Sem danificação ou deformação'] },
    { grupo: 'COLUNA / MONTANTE', itens: ['Sem danificação ou amassamento', 'Sem deformação ou torção', 'Sem corrosão', 'Prumo vertical adequado'] },
    { grupo: 'GUIA DE ENTRADA (RAIL GUIDE)', itens: ['Sem danificação', 'Nivelado corretamente', 'Fixação adequada'] },
    { grupo: 'VIGA TRASEIRA / TRAVESSA', itens: ['Sem danificação', 'Fixação e parafusos adequados'] },
    { grupo: 'DIAGONAL / CONTRAVENTAMENTO', itens: ['Sem danificação', 'Sem deformação', 'Soldas e conexões íntegras'] },
    { grupo: 'TRILHO / APOIO DE PALETE', itens: ['Sem danificação', 'Nivelado', 'Fixação adequada'] },
    { grupo: 'PROTETOR DE COLUNA', itens: ['Instalado em todas as colunas expostas', 'Sem danificação'] },
    { grupo: 'GERAL', itens: ['Placa de carga visível e legível', 'Cargas dentro do limite indicado', 'Operação dentro das normas'] }
  ],
  mezanino: [
    { grupo: 'PILARES', itens: ['Sem danificação ou amassamento', 'Sem corrosão', 'Fixação ao piso adequada', 'Prumo vertical adequado'] },
    { grupo: 'VIGAS PRINCIPAIS', itens: ['Sem danificação', 'Sem deflexão visível', 'Conexões e soldas íntegras'] },
    { grupo: 'VIGAS SECUNDÁRIAS', itens: ['Sem danificação', 'Sem deflexão', 'Fixação adequada'] },
    { grupo: 'PISO / DECK', itens: ['Sem deformação ou empenamento', 'Sem folgas entre painéis', 'Fixação adequada', 'Sem trincas ou rupturas'] },
    { grupo: 'GUARDA-CORPO', itens: ['Instalado em toda extensão', 'Altura ≥ 1,10m (NBR 7678)', 'Sem danos ou deformação', 'Corrimão firmemente fixado'] },
    { grupo: 'ESCADA', itens: ['Sem danos estruturais', 'Corrimão fixo e sem folgas', 'Degraus sem folga ou deformação', 'Sinalização de segurança presente'] },
    { grupo: 'PARAFUSOS / CONEXÕES', itens: ['Todos os parafusos fixados', 'Sem corrosão nos conectores', 'Sem folgas nas ligações'] },
    { grupo: 'GERAL', itens: ['Placa de carga visível e legível', 'Sinalização de emergência adequada', 'Acesso livre e seguro'] }
  ]
};

const TIPOS = { porta_paletes: 'Porta Paletes', drive_in: 'Drive-In', mezanino: 'Mezanino' };

const STATUS_CFG = {
  ok:         { label: 'OK',         icon: '✓', bg: '#dcfce7', text: '#16a34a', border: '#16a34a' },
  revisar:    { label: 'REVISAR',    icon: '!', bg: '#fef9c3', text: '#d97706', border: '#d97706' },
  interditar: { label: 'INTERDITAR', icon: '✗', bg: '#fee2e2', text: '#dc2626', border: '#dc2626' }
};

// =============================================================
// UTILS
// =============================================================
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});
const fmtDate = d => { if (!d) return ''; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];

function calcStatus(report) {
  const vals = Object.values(report.checklist || {});
  if (vals.includes('interditar')) return 'interditar';
  if (vals.includes('revisar'))    return 'revisar';
  if (vals.length > 0)             return 'ok';
  return 'pendente';
}

function statusLabel(s) {
  return {
    ok:        { t: 'APTO',         bg: 'bg-green-100',  tx: 'text-green-700',  bd: 'border-green-400',  hex: '#16a34a' },
    revisar:   { t: 'CONDICIONAL',  bg: 'bg-yellow-100', tx: 'text-yellow-700', bd: 'border-yellow-400', hex: '#d97706' },
    interditar:{ t: 'INTERDITADO',  bg: 'bg-red-100',    tx: 'text-red-700',    bd: 'border-red-400',    hex: '#dc2626' },
    pendente:  { t: 'EM ANDAMENTO', bg: 'bg-gray-100',   tx: 'text-gray-500',   bd: 'border-gray-300',   hex: '#6b7280' }
  }[s] || { t: s, bg: 'bg-gray-100', tx: 'text-gray-500', bd: 'border-gray-300', hex: '#6b7280' };
}

function czStatus(v) {
  if (v === null || v === undefined || v === '') return { t: '—', cls: 'bg-gray-100 text-gray-400' };
  const a = Math.abs(Number(v));
  if (a <= 5)  return { t: 'OK',      cls: 'bg-green-100 text-green-700' };
  if (a <= 10) return { t: 'ATENÇÃO', cls: 'bg-yellow-100 text-yellow-700' };
  return           { t: 'CRÍTICO', cls: 'bg-red-100 text-red-700' };
}

// =============================================================
// STATE
// =============================================================
const State = {
  user: null,
  draft: null,
  step: 1,
  reports: [],

  newDraft(tipo) {
    this.draft = {
      id: uuid(), tipo, projeto: '', empresa: '', local_inspecao: '', endereco: '',
      data_inspecao: today(), responsavel: '', crea: '', checklist: {}, fotos: [],
      corredores: [], observacoes: '', recomendacoes: '', conclusao: ''
    };
    this.step = 1;
  },

  loadDraft(report) {
    this.draft = JSON.parse(JSON.stringify(report));
    this.step = 1;
  }
};

// =============================================================
// ROUTER
// =============================================================
const Router = {
  go(page, param = '') {
    const h = param ? `#${page}/${param}` : `#${page}`;
    if (location.hash !== h) { location.hash = h; } else { this._dispatch(page, param); }
  },
  _dispatch(page, param) {
    if (!State.user && page !== 'login' && page !== 'reset') { this.go('login'); return; }
    if (page === 'login')  P.login();
    else if (page === 'dash') P.dash();
    else if (page === 'wiz')  P.wiz(parseInt(param) || 1);
    else if (page === 'rep')  P.rep(param);
    else if (page === 'print') P.print(param);
    else                      P.dash();
  },
  init() {
    window.addEventListener('hashchange', () => {
      const [pg, pm] = location.hash.replace('#','').split('/');
      this._dispatch(pg || 'login', pm || '');
    });
    // Check session on load
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        State.user = session.user;
        const [pg, pm] = location.hash.replace('#','').split('/');
        this._dispatch(pg && pg !== 'login' ? pg : 'dash', pm || '');
      } else {
        this._dispatch('login', '');
      }
    });
    // Listen for auth changes
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        State.user = session.user;
        if (location.hash === '#login' || !location.hash) Router.go('dash');
      } else if (event === 'SIGNED_OUT') {
        State.user = null;
        Router.go('login');
      }
    });
  }
};

// =============================================================
// UI
// =============================================================
const UI = {
  render(html) { document.getElementById('app').innerHTML = html; },
  toast(msg, type = 'success') {
    document.querySelectorAll('.toast').forEach(e => e.remove());
    const colors = { success: '#16a34a', error: '#dc2626', info: '#1B3A6B' };
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.background = colors[type] || colors.info;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  },
  loading(show) {
    document.getElementById('loadingOverlay')?.remove();
    if (!show) return;
    const el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9998';
    el.innerHTML = '<div style="background:white;border-radius:16px;padding:24px 32px;text-align:center"><div style="font-size:32px;margin-bottom:8px">⏳</div><p style="font-weight:700;color:#1B3A6B">Aguarde...</p></div>';
    document.body.appendChild(el);
  }
};

// =============================================================
// DATABASE (Supabase)
// =============================================================
const DB = {
  async getReports() {
    const { data, error } = await sb.from('reports').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getReport(id) {
    const { data, error } = await sb.from('reports').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async saveReport(report) {
    const payload = {
      id: report.id,
      user_id: State.user.id,
      tipo: report.tipo,
      projeto: report.projeto || '',
      empresa: report.empresa || '',
      local_inspecao: report.local_inspecao || '',
      endereco: report.endereco || '',
      data_inspecao: report.data_inspecao || today(),
      responsavel: report.responsavel || '',
      crea: report.crea || '',
      checklist: report.checklist || {},
      fotos: report.fotos || [],
      corredores: report.corredores || [],
      observacoes: report.observacoes || '',
      recomendacoes: report.recomendacoes || '',
      conclusao: report.conclusao || '',
      atualizado_em: new Date().toISOString()
    };
    const { error } = await sb.from('reports').upsert(payload);
    if (error) throw error;
  },

  async deleteReport(id) {
    const { error } = await sb.from('reports').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadPhoto(reportId, file) {
    const ext = file.name.split('.').pop();
    const path = `${State.user.id}/${reportId}/${uuid()}.${ext}`;
    const { data, error } = await sb.storage.from('report-photos').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = sb.storage.from('report-photos').getPublicUrl(path);
    return publicUrl;
  }
};

// =============================================================
// SHARED COMPONENTS
// =============================================================
function header(title) {
  const email = State.user?.email || '';
  return `
    <div style="background:#1B3A6B" class="flex items-center justify-between px-4 py-3 text-white shadow-md flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:#E8520A">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div>
          <p class="font-black text-sm leading-tight">SInspect</p>
          <p class="text-xs opacity-60 leading-tight">${title}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs opacity-50 hidden sm:block max-w-32 truncate">${email}</span>
        <button onclick="doLogout()" class="text-xs opacity-70 hover:opacity-100 px-3 py-1.5 rounded-lg border border-white/30 font-semibold">Sair</button>
      </div>
    </div>`;
}

// =============================================================
// PAGES (P)
// =============================================================
const P = {

  // ---- LOGIN ----
  login() {
    UI.render(`
      <div class="min-h-screen flex flex-col items-center justify-center p-4 fade-in"
           style="background:linear-gradient(140deg,#1B3A6B 0%,#2d5fa8 50%,#E8520A 100%)">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style="background:#E8520A">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h1 class="text-2xl font-black" style="color:#1B3A6B">SInspect</h1>
            <p class="text-gray-400 text-sm mt-1">Sistema de Inspeção de Estruturas</p>
          </div>
          <form onsubmit="doLogin(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">E-mail</label>
              <input id="le" type="email" placeholder="seu@email.com"
                class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium"/>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Senha</label>
              <input id="lp" type="password" placeholder="••••••••"
                class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium"/>
            </div>
            <button type="submit"
              class="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wider shadow-lg"
              style="background:#E8520A">ENTRAR →</button>
          </form>
          <button onclick="showForgotPassword()" class="w-full text-center text-xs text-gray-400 mt-4 hover:text-gray-600">
            Esqueci minha senha
          </button>
          <div class="mt-6 pt-4 border-t border-gray-100 text-center">
            <p class="text-xs text-gray-300 font-semibold">NBR 17150 · EN 15635 · ANSI MH16.1</p>
          </div>
        </div>
      </div>`);
  },

  // ---- DASHBOARD ----
  async dash() {
    UI.render(`<div class="flex flex-col h-screen"><div class="flex-1 flex items-center justify-center"><div class="text-center"><div class="text-4xl mb-3">⏳</div><p class="text-gray-500 font-semibold">Carregando...</p></div></div></div>`);
    try {
      const reps = await DB.getReports();
      State.reports = reps;
      const cnt = (s) => reps.filter(r => {
        const st = r.conclusao === 'apto' ? 'ok' : r.conclusao === 'nao_apto' ? 'interditar' : r.conclusao === 'condicional' ? 'revisar' : calcStatus(r);
        return st === s;
      }).length;

      const cards = reps.map(r => {
        const s = r.conclusao === 'apto' ? 'ok' : r.conclusao === 'nao_apto' ? 'interditar' : r.conclusao === 'condicional' ? 'revisar' : calcStatus(r);
        const sl = statusLabel(s);
        return `
          <div onclick="Router.go('rep','${r.id}')"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 cursor-pointer hover:shadow-md transition-all fade-in">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="text-xs font-black px-2.5 py-0.5 rounded-full border ${sl.bg} ${sl.tx} ${sl.bd}">${sl.t}</span>
                  <span class="text-xs font-semibold text-gray-400">${TIPOS[r.tipo] || r.tipo}</span>
                </div>
                <p class="font-bold text-gray-800 text-sm truncate">${r.empresa || 'Sem empresa'}</p>
                <p class="text-xs text-gray-400 truncate">${r.local_inspecao || 'Sem local'}${r.projeto ? ' · ' + r.projeto : ''}</p>
              </div>
              <span class="text-xs text-gray-300 font-semibold ml-3 flex-shrink-0">${fmtDate(r.data_inspecao)}</span>
            </div>
            <div class="flex items-center gap-4 text-xs text-gray-400 mt-1">
              <span>👤 ${r.responsavel || 'Não informado'}</span>
              ${r.corredores?.length ? `<span>📏 ${r.corredores.length} corredor${r.corredores.length > 1 ? 'es' : ''}</span>` : ''}
              ${r.fotos?.length ? `<span>📸 ${r.fotos.length} foto${r.fotos.length > 1 ? 's' : ''}</span>` : ''}
            </div>
          </div>`;
      }).join('') || `
        <div class="text-center py-16 fade-in">
          <div class="text-6xl mb-4">📋</div>
          <p class="text-gray-500 font-bold text-lg">Nenhum relatório</p>
          <p class="text-gray-400 text-sm mt-1">Toque em <strong style="color:#E8520A">+</strong> para criar o primeiro</p>
        </div>`;

      UI.render(`
        <div class="flex flex-col h-screen">
          ${header('Relatórios de Inspeção')}
          <div class="flex-1 overflow-auto bg-gray-50 pb-24">
            <div class="grid grid-cols-4 gap-2 p-4">
              ${[
                { label: 'Total',    val: reps.length,    bg: 'white',    tx: '#374151' },
                { label: 'Aptos',    val: cnt('ok'),       bg: '#f0fdf4',  tx: '#16a34a' },
                { label: 'Cond.',    val: cnt('revisar'),  bg: '#fefce8',  tx: '#d97706' },
                { label: 'Interdit.',val: cnt('interditar'),bg: '#fff1f2', tx: '#dc2626' }
              ].map(x => `
                <div class="rounded-2xl p-3 text-center shadow-sm border border-gray-100" style="background:${x.bg}">
                  <p class="text-xl font-black" style="color:${x.tx}">${x.val}</p>
                  <p class="text-xs font-semibold" style="color:${x.tx};opacity:.7">${x.label}</p>
                </div>`).join('')}
            </div>
            <div class="px-4">${cards}</div>
          </div>
          <button onclick="openTypeModal()"
            class="fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-white text-3xl font-black z-50"
            style="background:#E8520A">+</button>
        </div>`);
    } catch (e) {
      UI.toast('Erro ao carregar relatórios: ' + e.message, 'error');
    }
  },

  // ---- WIZARD ----
  wiz(step) {
    if (!State.draft) { Router.go('dash'); return; }
    const steps = ['Tipo','Projeto','Inspeção','Fotos','Medições','Conclusão'];
    const pct = ((step-1)/(steps.length-1))*100;

    const stepsHtml = steps.map((s,i) => {
      const n=i+1, active=n===step, done=n<step;
      return `<div class="flex flex-col items-center gap-0.5">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
          ${done?'bg-green-500 text-white':active?'text-white':'bg-gray-200 text-gray-400'}"
          style="${active?'background:#E8520A':''}">
          ${done?'✓':n}
        </div>
        <span class="text-xs font-semibold ${active?'':'text-gray-400'}" style="${active?'color:#E8520A':''}">
          ${s}
        </span>
      </div>`;
    }).join('');

    const contents = { 1:this._s1, 2:this._s2, 3:this._s3, 4:this._s4, 5:this._s5, 6:this._s6 };
    const content = (contents[step] || this._s1).call(this);

    UI.render(`
      <div class="flex flex-col h-screen">
        <div style="background:#1B3A6B" class="text-white px-4 pt-3 pb-4 flex-shrink-0">
          <div class="flex items-center gap-3 mb-3">
            <button onclick="Router.go('dash')" class="opacity-70 hover:opacity-100">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <p class="font-black text-sm">Novo Relatório</p>
              <p class="text-xs opacity-60">${TIPOS[State.draft.tipo]||'—'} · Passo ${step} de 6</p>
            </div>
          </div>
          <div class="h-1.5 rounded-full mb-3" style="background:rgba(255,255,255,.2)">
            <div class="h-full rounded-full transition-all duration-500" style="background:#E8520A;width:${pct}%"></div>
          </div>
          <div class="flex justify-between px-1">${stepsHtml}</div>
        </div>
        <div class="flex-1 overflow-auto p-4 pb-28 bg-gray-50 fade-in">${content}</div>
        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3 max-w-md mx-auto" style="left:50%;transform:translateX(-50%);width:100%;max-width:28rem">
          ${step>1?`<button onclick="wizPrev()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm">← Anterior</button>`:''}
          <button onclick="wizNext(${step})" class="flex-1 py-3.5 rounded-xl text-white font-black text-sm shadow-lg" style="background:#E8520A">
            ${step===6?'✓ Salvar Relatório':'Próximo →'}
          </button>
        </div>
      </div>`);
    State.step = step;
  },

  _s1() {
    const t = State.draft.tipo;
    return `<h2 class="text-lg font-black text-gray-800 mb-1">Tipo de Estrutura</h2>
      <p class="text-sm text-gray-400 mb-5">Selecione o tipo de estrutura a ser inspecionada.</p>
      ${Object.entries(TIPOS).map(([k,v]) => `
        <button onclick="setTipo('${k}')"
          class="w-full flex items-center gap-4 p-4 mb-3 rounded-2xl border-2 text-left transition-all"
          style="${t===k?'border-color:#E8520A;background:#fff8f5':'border-color:#e5e7eb;background:white'}">
          <div class="text-3xl">${k==='porta_paletes'?'🏗️':k==='drive_in'?'🚛':'🏢'}</div>
          <div class="flex-1">
            <p class="font-black ${t===k?'':'text-gray-800'}" style="${t===k?'color:#E8520A':''}">
              ${v}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">
              ${k==='porta_paletes'?'NBR 17150 · SEMA · RMI · EN 15635':
                k==='drive_in'    ?'NBR 17150 · Alta densidade de armazenagem':
                                   'NR-11 · NBR 6118 · Piso elevado metálico'}
            </p>
          </div>
          ${t===k?`<div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0" style="background:#E8520A">✓</div>`:''}
        </button>`).join('')}`;
  },

  _s2() {
    const d = State.draft;
    const f = (key,label,type,ph,req='') => `
      <div class="mb-4">
        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">${label}${req?'<span class="text-red-400 ml-1">*</span>':''}</label>
        <input type="${type}" value="${d[key]||''}" placeholder="${ph}"
          oninput="State.draft['${key}']=this.value"
          class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-white"/>
      </div>`;
    return `<h2 class="text-lg font-black text-gray-800 mb-1">Informações do Projeto</h2>
      <p class="text-sm text-gray-400 mb-5">Dados do local, cliente e responsável técnico.</p>
      ${f('projeto',      'Código do Projeto','text','Ex: AM233698')}
      ${f('empresa',      'Empresa / Cliente','text','Ex: Coopercampos S.A.','*')}
      ${f('local_inspecao','Local da Inspeção','text','Ex: Galpão 1 / Loja 95','*')}
      ${f('endereco',     'Endereço',         'text','Rua, Nº – Bairro, Cidade – UF')}
      ${f('data_inspecao','Data da Inspeção', 'date','','*')}
      ${f('responsavel',  'Responsável Técnico','text','Nome completo','*')}
      ${f('crea',         'CREA',             'text','Ex: 198403/D')}`;
  },

  _s3() {
    const cl = CHECKLISTS[State.draft.tipo] || [];
    const saved = State.draft.checklist || {};
    const total = cl.reduce((a,g)=>a+g.itens.length,0);
    const done  = Object.keys(saved).length;

    return `
      <h2 class="text-lg font-black text-gray-800 mb-1">Inspeção Visual</h2>
      <p class="text-sm text-gray-400 mb-2">Classifique cada item conforme a condição encontrada.</p>
      <div class="flex gap-2 mb-3">
        ${Object.entries(STATUS_CFG).map(([k,v])=>`
          <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${v.bg};color:${v.text};border:1px solid ${v.border}">
            ${v.icon} ${v.label}
          </span>`).join('')}
      </div>
      <div class="mb-4">
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all" style="background:#E8520A;width:${Math.round(done/total*100)}%"></div>
        </div>
        <p class="text-xs text-gray-400 mt-1">${done} / ${total} itens avaliados</p>
      </div>
      ${cl.map(g=>`
        <div class="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
          <div class="px-4 py-2.5 font-black text-xs text-white uppercase tracking-wide" style="background:#1B3A6B">${g.grupo}</div>
          ${g.itens.map(item=>{
            const key = `${g.grupo}||${item}`;
            const val = saved[key]||'';
            return `
              <div class="px-4 py-3 border-b border-gray-100 last:border-0" data-checklist-key="${key}">
                <p class="text-sm text-gray-700 mb-2.5 leading-snug">${item}</p>
                <div class="flex gap-2">
                  ${['ok','revisar','interditar'].map(s=>{
                    const sc=STATUS_CFG[s], active=val===s;
                    return `<button
                      onclick="setCheck('${key}','${s}',this)"
                      class="status-btn flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all
                             ${active?`active-${s}`:'border-gray-200 text-gray-400 bg-white'}"
                      data-status="${s}" data-key="${key}">
                      ${sc.icon} ${sc.label}
                    </button>`;
                  }).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>`).join('')}
      <div class="rounded-2xl p-4 mt-2" style="background:#eff6ff">
        <p class="text-xs font-black text-blue-800 mb-1">📘 Normas de Referência</p>
        <p class="text-xs text-blue-600">NBR 17150 · EN 15635 · ANSI MH16.1 · SEMA · RMI</p>
      </div>`;
  },

  _s4() {
    const fotos = State.draft.fotos || [];
    return `
      <h2 class="text-lg font-black text-gray-800 mb-1">Relatório Fotográfico</h2>
      <p class="text-sm text-gray-400 mb-5">Registre fotos das avarias e não conformidades.</p>
      <button onclick="document.getElementById('fi').click()"
        class="w-full border-2 border-dashed border-gray-300 rounded-2xl py-8 text-center mb-4 hover:border-orange-400 hover:bg-orange-50 transition-all">
        <div class="text-4xl mb-2">📷</div>
        <p class="font-bold text-gray-600 text-sm">Adicionar Foto</p>
        <p class="text-xs text-gray-400 mt-1">Câmera ou galeria</p>
      </button>
      <input type="file" id="fi" accept="image/*" multiple class="hidden" onchange="handlePhotos(event)"/>
      ${fotos.length===0?'<p class="text-center text-gray-300 text-sm py-4 font-semibold">Nenhuma foto adicionada</p>':
        fotos.map((f,i)=>`
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <div class="relative">
              <img src="${f.url||f.data||''}" class="w-full h-44 object-cover" onerror="this.style.display='none'"/>
              <button onclick="removePhoto(${i})"
                class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center font-bold">✕</button>
            </div>
            <div class="p-3 space-y-2">
              <input type="text" value="${f.local||''}" placeholder="Localização (ex: C01MD01)"
                oninput="State.draft.fotos[${i}].local=this.value"
                class="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-medium"/>
              <input type="text" value="${f.descricao||''}" placeholder="Descrição da avaria"
                oninput="State.draft.fotos[${i}].descricao=this.value"
                class="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-medium"/>
              <div class="flex gap-2">
                ${['ok','revisar','interditar'].map(s=>{
                  const sc=STATUS_CFG[s], active=f.status===s;
                  return `<button onclick="setPhotoStatus(${i},'${s}')"
                    class="flex-1 py-1.5 rounded-xl text-xs font-black border-2 transition-all"
                    style="${active?`background:${sc.text};border-color:${sc.text};color:white`:'border-color:#e5e7eb;color:#9ca3af;background:white'}">
                    ${sc.icon} ${sc.label}
                  </button>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}`;
  },

  _s5() {
    const cors = State.draft.corredores || [];
    return `
      <h2 class="text-lg font-black text-gray-800 mb-1">Verificação dos Deslocamentos</h2>
      <p class="text-sm text-gray-400 mb-2">Meça os deslocamentos Cz conforme NBR 17150.</p>
      <div class="rounded-2xl p-3 mb-4 text-xs font-semibold text-blue-700" style="background:#eff6ff">
        <strong>Limites:</strong> Cz ≤ ±5mm (OK) · ±5→10mm (ATENÇÃO) · >10mm (CRÍTICO)
      </div>
      <button onclick="addCorredor()"
        class="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 mb-4 hover:border-orange-400 hover:bg-orange-50 transition-all">
        + Adicionar Corredor
      </button>
      <div id="corList">
        ${cors.map((c,ci)=>this._corCard(c,ci)).join('')}
      </div>
      ${cors.length===0?'<p class="text-center text-gray-300 text-sm py-4 font-semibold">Nenhum corredor adicionado</p>':''}`;
  },

  _corCard(c,ci) {
    return `
      <div class="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3" style="background:#1B3A6B">
          <div class="flex items-center gap-2">
            <span class="font-black text-white text-sm">Corredor</span>
            <input type="text" value="${c.numero||''}" placeholder="01"
              oninput="State.draft.corredores[${ci}].numero=this.value"
              class="w-12 bg-white/20 text-white font-black text-sm rounded-lg px-2 py-1 border border-white/30 text-center"/>
          </div>
          <div class="flex gap-2">
            <button onclick="addMontante(${ci})" class="text-xs font-bold text-white border border-white/40 rounded-lg px-2.5 py-1">+ Montante</button>
            <button onclick="removeCorredor(${ci})" class="text-white/60 hover:text-red-300 font-bold text-sm px-1">✕</button>
          </div>
        </div>
        <div class="divide-y divide-gray-100">
          ${(c.montantes||[]).length===0?`<p class="text-center text-gray-300 text-xs py-3 font-semibold">Adicione montantes</p>`:''}
          ${(c.montantes||[]).map((m,mi)=>{
            const cz = czStatus(m.cz);
            return `
              <div class="px-4 py-3">
                <div class="flex items-center gap-2 mb-2">
                  <select onchange="State.draft.corredores[${ci}].montantes[${mi}].lado=this.value"
                    class="text-xs border-2 border-gray-200 rounded-xl px-2 py-1.5 bg-white font-semibold">
                    <option value="MD" ${m.lado==='MD'?'selected':''}>MD – Direito</option>
                    <option value="ME" ${m.lado==='ME'?'selected':''}>ME – Esquerdo</option>
                  </select>
                  <input type="number" placeholder="Pos." value="${m.posicao||''}" min="1" max="99"
                    oninput="State.draft.corredores[${ci}].montantes[${mi}].posicao=this.value"
                    class="w-16 text-xs border-2 border-gray-200 rounded-xl px-2 py-1.5 bg-white font-semibold text-center"/>
                  <button onclick="removeMontante(${ci},${mi})" class="ml-auto text-red-300 hover:text-red-500 font-bold text-sm">✕</button>
                </div>
                <div class="flex items-center gap-3">
                  <input type="number" placeholder="Cz (mm)" step="0.1" value="${m.cz!==null&&m.cz!==undefined?m.cz:''}"
                    oninput="State.draft.corredores[${ci}].montantes[${mi}].cz=this.value===''?null:parseFloat(this.value)"
                    class="w-28 text-sm border-2 border-gray-200 rounded-xl px-3 py-2 bg-white font-bold text-center"/>
                  <span class="text-xs text-gray-400 font-semibold">mm</span>
                  <span class="text-xs font-black px-3 py-1.5 rounded-xl ${cz.cls}">${cz.t}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  _s6() {
    const d = State.draft;
    const auto = calcStatus(d);
    const asl  = statusLabel(auto);
    return `
      <h2 class="text-lg font-black text-gray-800 mb-1">Conclusão</h2>
      <p class="text-sm text-gray-400 mb-5">Conclusão e recomendações do responsável técnico.</p>
      <div class="rounded-2xl p-4 mb-5 border-2 ${asl.bg} ${asl.bd}">
        <p class="text-xs font-bold text-gray-400 mb-0.5 uppercase tracking-wide">Status calculado</p>
        <p class="text-xl font-black ${asl.tx}">${asl.t}</p>
        <p class="text-xs text-gray-500 mt-1">Com base nos itens da inspeção visual</p>
      </div>
      <div class="mb-5">
        <label class="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Conclusão do Responsável <span class="text-red-400">*</span></label>
        <div class="grid grid-cols-3 gap-2">
          ${[
            { v:'apto',       l:'APTO',       hex:'#16a34a', bg:'#f0fdf4' },
            { v:'condicional',l:'CONDICIONAL', hex:'#d97706', bg:'#fefce8' },
            { v:'nao_apto',   l:'NÃO APTO',   hex:'#dc2626', bg:'#fff1f2' }
          ].map(o=>`
            <button onclick="setConclusao('${o.v}')"
              class="py-3 rounded-2xl text-xs font-black border-2 transition-all"
              style="${d.conclusao===o.v?`background:${o.bg};border-color:${o.hex};color:${o.hex}`:'background:white;border-color:#e5e7eb;color:#9ca3af'}">
              ${o.l}
            </button>`).join('')}
        </div>
      </div>
      <div class="mb-4">
        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Recomendações</label>
        <textarea rows="4" placeholder="Liste as ações corretivas necessárias..."
          oninput="State.draft.recomendacoes=this.value"
          class="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium bg-white resize-none">${d.recomendacoes||''}</textarea>
      </div>
      <div class="mb-4">
        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Observações</label>
        <textarea rows="3" placeholder="Observações gerais..."
          oninput="State.draft.observacoes=this.value"
          class="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium bg-white resize-none">${d.observacoes||''}</textarea>
      </div>
      <div class="rounded-2xl p-4" style="background:#eff6ff">
        <p class="text-xs font-black text-blue-800 mb-2">📋 Normas de Referência</p>
        <ul class="text-xs text-blue-700 space-y-0.5">
          <li>• <strong>NBR 17150</strong> – Estruturas de armazenagem estáticas (Brasil)</li>
          <li>• <strong>EN 15635</strong> – Aplicação e manutenção (Europa)</li>
          <li>• <strong>ANSI MH16.1</strong> – Racks industriais (EUA)</li>
          <li>• <strong>SEMA CoP</strong> – Code of Practice (UK)</li>
          <li>• <strong>RMI Guidelines</strong> – Rack Manufacturers Institute</li>
          <li>• <strong>NR-11</strong> – Transporte e armazenagem (Brasil)</li>
        </ul>
      </div>`;
  },

  // ---- REPORT DETAIL ----
  async rep(id) {
    UI.render(`<div class="flex flex-col h-screen"><div class="flex-1 flex items-center justify-center"><div class="text-center"><div class="text-4xl mb-3">⏳</div><p class="text-gray-500 font-semibold">Carregando...</p></div></div></div>`);
    try {
      const r = await DB.getReport(id);
      const s = r.conclusao==='apto'?'ok': r.conclusao==='nao_apto'?'interditar': r.conclusao==='condicional'?'revisar': calcStatus(r);
      const sl = statusLabel(s);
      const cl = CHECKLISTS[r.tipo] || [];

      const chkHtml = cl.map(g=>{
        const rows = g.itens.map(item=>{
          const key=`${g.grupo}||${item}`, val=r.checklist?.[key]||'';
          if(!val) return '';
          const sc=STATUS_CFG[val];
          return `<div class="flex items-center justify-between py-2.5 px-4 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-700 flex-1">${item}</span>
            <span class="text-xs font-black px-2.5 py-1 rounded-xl ml-3 flex-shrink-0"
              style="background:${sc.bg};color:${sc.text};border:1px solid ${sc.border}">
              ${sc.icon} ${sc.label}
            </span>
          </div>`;
        }).join('');
        if(!rows.trim()) return '';
        return `<div class="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
          <div class="px-4 py-2.5 font-black text-xs text-white uppercase tracking-wide" style="background:#1B3A6B">${g.grupo}</div>
          ${rows}
        </div>`;
      }).join('');

      const medHtml = (r.corredores||[]).map(c=>`
        <div class="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
          <div class="px-4 py-2.5 font-black text-xs text-white" style="background:#1B3A6B">Corredor ${c.numero}</div>
          ${(c.montantes||[]).map(m=>{
            const cz=czStatus(m.cz);
            return `<div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
              <span class="font-mono text-sm font-bold text-gray-700">C${String(c.numero).padStart(2,'0')}${m.lado}${String(m.posicao||'').padStart(2,'0')}</span>
              <span class="text-sm font-black">${m.cz!==null&&m.cz!==undefined?m.cz+' mm':'—'}</span>
              <span class="text-xs font-black px-2.5 py-1 rounded-xl ${cz.cls}">${cz.t}</span>
            </div>`;
          }).join('')}
        </div>`).join('');

      UI.render(`
        <div class="flex flex-col h-screen">
          ${header('Detalhe do Relatório')}
          <div class="flex-1 overflow-auto bg-gray-50 pb-28 fade-in">
            <div class="m-4 rounded-2xl p-5 border-2 ${sl.bg} ${sl.bd}">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-bold text-gray-400 mb-1 uppercase">${TIPOS[r.tipo]||r.tipo}</p>
                  <p class="text-2xl font-black ${sl.tx}">${sl.t}</p>
                  <p class="text-sm font-semibold text-gray-700 mt-1">${r.empresa||''}</p>
                  <p class="text-xs text-gray-400 mt-0.5">${r.local_inspecao||''}${r.local_inspecao&&r.data_inspecao?' · ':''}${fmtDate(r.data_inspecao)}</p>
                </div>
                <div class="text-right text-xs text-gray-400">
                  ${r.projeto?`<p class="font-mono font-bold text-gray-600">${r.projeto}</p>`:''}
                  <p>${r.responsavel||''}</p>
                  ${r.crea?`<p>CREA: ${r.crea}</p>`:''}
                </div>
              </div>
            </div>
            <div class="px-4">
              ${chkHtml?`<h3 class="font-black text-gray-700 mb-3 text-sm uppercase tracking-wide">📋 Inspeção Visual</h3>${chkHtml}`:''}
              ${(r.fotos||[]).length?`
                <h3 class="font-black text-gray-700 mb-3 mt-5 text-sm uppercase tracking-wide">📸 Relatório Fotográfico</h3>
                <div class="grid grid-cols-2 gap-3 mb-4">
                  ${r.fotos.map((f,i)=>`
                    <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <img src="${f.url||f.data||''}" class="w-full h-32 object-cover" onerror="this.style.display='none'"/>
                      <div class="p-2.5">
                        <p class="text-xs font-bold text-gray-700 truncate">${f.local||'Sem local'}</p>
                        <p class="text-xs text-gray-400 truncate">${f.descricao||''}</p>
                      </div>
                    </div>`).join('')}
                </div>`:''}
              ${medHtml?`<h3 class="font-black text-gray-700 mb-3 mt-5 text-sm uppercase tracking-wide">📏 Deslocamentos (Cz)</h3>${medHtml}`:''}
              ${r.recomendacoes?`<h3 class="font-black text-gray-700 mb-2 mt-5 text-sm uppercase">💡 Recomendações</h3>
                <div class="bg-white rounded-2xl shadow-sm p-4 mb-3 text-sm text-gray-700 whitespace-pre-wrap">${r.recomendacoes}</div>`:''}
              ${r.observacoes?`<h3 class="font-black text-gray-700 mb-2 mt-4 text-sm uppercase">📝 Observações</h3>
                <div class="bg-white rounded-2xl shadow-sm p-4 mb-3 text-sm text-gray-700 whitespace-pre-wrap">${r.observacoes}</div>`:''}
            </div>
          </div>
          <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-2 z-40 max-w-md mx-auto" style="left:50%;transform:translateX(-50%);width:100%;max-width:28rem">
            <button onclick="Router.go('dash')" class="px-3 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm">←</button>
            <button onclick="editRep('${id}')" class="flex-1 py-3 rounded-xl border-2 font-bold text-sm" style="border-color:#1B3A6B;color:#1B3A6B">✏️ Editar</button>
            <button onclick="doPrint('${id}')" class="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg" style="background:#E8520A">🖨️ Imprimir</button>
            <button onclick="confirmDelete('${id}')" class="px-3 py-3 rounded-xl border-2 border-red-200 text-red-400 font-bold text-sm">🗑️</button>
          </div>
        </div>`);
    } catch(e) {
      UI.toast('Erro ao carregar relatório', 'error');
      Router.go('dash');
    }
  },

  // ---- PRINT ----
  async print(id) {
    let r;
    try { r = await DB.getReport(id); } catch(e) { return; }
    const s  = r.conclusao==='apto'?'ok': r.conclusao==='nao_apto'?'interditar': r.conclusao==='condicional'?'revisar': calcStatus(r);
    const sl = statusLabel(s);
    const cl = CHECKLISTS[r.tipo]||[];

    const chkRows = cl.map(g=>{
      const gRows = g.itens.map(item=>{
        const key=`${g.grupo}||${item}`, val=r.checklist?.[key]||'';
        const sc = STATUS_CFG[val]||{label:'—',icon:'',bg:'#f9fafb',text:'#6b7280',border:'#e5e7eb'};
        return `<tr><td style="padding:5px 10px;font-size:11px;border-bottom:1px solid #f3f4f6">${item}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:center;border-bottom:1px solid #f3f4f6">
            ${val?`<span style="background:${sc.bg};color:${sc.text};border:1px solid ${sc.border};padding:2px 8px;border-radius:6px;font-weight:900;font-size:10px">${sc.icon} ${sc.label}</span>`:'—'}
          </td><td style="padding:5px 10px;font-size:11px;border-bottom:1px solid #f3f4f6;color:#9ca3af"></td></tr>`;
      }).join('');
      return `<tr style="background:#1B3A6B"><td colspan="3" style="padding:7px 10px;font-size:11px;font-weight:900;color:white;text-transform:uppercase">${g.grupo}</td></tr>${gRows}`;
    }).join('');

    const medRows = (r.corredores||[]).map(c=>`
      <tr style="background:#f8fafc"><td colspan="5" style="padding:6px 10px;font-size:11px;font-weight:900;color:#1B3A6B">Corredor ${c.numero}</td></tr>
      ${(c.montantes||[]).map(m=>{
        const cz=czStatus(m.cz);
        const czHex=m.cz!==null&&Math.abs(m.cz)<=5?'#16a34a':m.cz!==null&&Math.abs(m.cz)<=10?'#d97706':'#dc2626';
        return `<tr>
          <td style="padding:5px 10px;font-size:11px;font-family:monospace;border-bottom:1px solid #f3f4f6">C${String(c.numero).padStart(2,'0')}${m.lado}${String(m.posicao||'').padStart(2,'0')}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:center;border-bottom:1px solid #f3f4f6">${m.lado}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:center;border-bottom:1px solid #f3f4f6">${m.posicao||''}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:center;font-weight:900;border-bottom:1px solid #f3f4f6">${m.cz!==null&&m.cz!==undefined?m.cz+' mm':'—'}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:center;font-weight:900;color:${czHex};border-bottom:1px solid #f3f4f6">${cz.t}</td>
        </tr>`;
      }).join('')}`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Relatório – ${r.empresa||''} – ${fmtDate(r.data_inspecao)}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#1f2937;background:white}.wrap{max-width:800px;margin:0 auto;padding:16mm}.sec{font-size:13px;font-weight:900;color:#1B3A6B;margin:18px 0 8px;border-bottom:2px solid #E8520A;padding-bottom:4px;text-transform:uppercase;letter-spacing:.05em}table{width:100%;border-collapse:collapse}@page{margin:12mm;size:A4}@media print{.no-print{display:none}body{margin:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style>
      </head><body><div class="wrap">
        <div class="no-print" style="margin-bottom:20px;padding:12px;background:#f3f4f6;border-radius:10px;display:flex;gap:10px;justify-content:center">
          <button onclick="window.print()" style="background:#E8520A;color:white;border:none;padding:10px 28px;border-radius:8px;font-weight:900;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
          <button onclick="window.close()" style="background:#6b7280;color:white;border:none;padding:10px 20px;border-radius:8px;font-weight:900;cursor:pointer">Fechar</button>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #1B3A6B">
          <div>
            <div style="background:#E8520A;display:inline-block;padding:5px 14px;border-radius:7px;margin-bottom:8px">
              <span style="color:white;font-weight:900;font-size:15px">SInspect</span>
            </div>
            <h1 style="font-size:15px;font-weight:900;color:#1B3A6B;line-height:1.3">
              RELATÓRIO DE INSPEÇÃO DE ESTRUTURAS<br/>
              <span style="color:#E8520A">${(TIPOS[r.tipo]||'').toUpperCase()}</span>
            </h1>
          </div>
          <div style="background:${sl.hex};color:white;font-weight:900;font-size:16px;padding:10px 18px;border-radius:10px;text-align:center;min-width:120px">${sl.t}</div>
        </div>
        <table style="background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:16px">
          ${[['Empresa / Cliente',r.empresa||'—'],['Local da Inspeção',r.local_inspecao||'—'],['Endereço',r.endereco||'—'],['Código do Projeto',r.projeto||'—'],['Data da Inspeção',fmtDate(r.data_inspecao)],['Responsável Técnico',r.responsavel||'—'],['CREA',r.crea||'—'],['Tipo de Estrutura',TIPOS[r.tipo]||r.tipo]].map(([k,v],i)=>`
            <tr style="${i%2?'background:#f0f4f8':''}">
              <td style="padding:7px 10px;font-size:11px;font-weight:700;color:#6b7280;width:38%">${k}</td>
              <td style="padding:7px 10px;font-size:12px;font-weight:600">${v}</td>
            </tr>`).join('')}
        </table>
        ${chkRows?`<p class="sec">Inspeção Visual</p><table style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;margin-bottom:16px"><thead><tr style="background:#f8fafc"><th style="padding:7px 10px;font-size:11px;text-align:left">Item</th><th style="padding:7px 10px;font-size:11px;text-align:center">Status</th><th style="padding:7px 10px;font-size:11px;text-align:left">Obs.</th></tr></thead><tbody>${chkRows}</tbody></table>`:''}
        ${medRows?`<p class="sec">Verificação dos Deslocamentos (Cz) — NBR 17150</p><table style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;margin-bottom:8px"><thead><tr style="background:#f8fafc"><th style="padding:7px 10px;font-size:11px;text-align:left">Código</th><th style="padding:7px 10px;font-size:11px;text-align:center">Lado</th><th style="padding:7px 10px;font-size:11px;text-align:center">Pos.</th><th style="padding:7px 10px;font-size:11px;text-align:center">Cz (mm)</th><th style="padding:7px 10px;font-size:11px;text-align:center">Status</th></tr></thead><tbody>${medRows}</tbody></table><p style="font-size:10px;color:#9ca3af;margin-bottom:16px">Limites NBR 17150: ≤±5mm (OK) · ±5→10mm (ATENÇÃO) · >10mm (CRÍTICO)</p>`:''}
        ${(r.fotos||[]).length?`<p class="sec">Relatório Fotográfico</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">${r.fotos.map((f,i)=>`<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden"><img src="${f.url||f.data||''}" style="width:100%;height:150px;object-fit:cover" onerror="this.style.display='none'"/><div style="padding:8px"><p style="font-size:11px;font-weight:700">Fig. ${i+1}${f.local?' – '+f.local:''}</p><p style="font-size:10px;color:#6b7280">${f.descricao||''}</p></div></div>`).join('')}</div>`:''}
        ${r.recomendacoes?`<p class="sec">Recomendações</p><div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;white-space:pre-wrap">${r.recomendacoes}</div>`:''}
        ${r.observacoes?`<p class="sec">Observações</p><div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;white-space:pre-wrap">${r.observacoes}</div>`:''}
        <p class="sec">Conclusão</p>
        <div style="background:${sl.hex}18;border:2px solid ${sl.hex};border-radius:12px;padding:16px;margin-bottom:28px">
          <p style="font-size:18px;font-weight:900;color:${sl.hex}">${sl.t}</p>
          <p style="font-size:11px;color:#374151;margin-top:4px">A estrutura <strong>${TIPOS[r.tipo]||r.tipo}</strong> foi inspecionada em ${fmtDate(r.data_inspecao)} e classificada como <strong>${sl.t}</strong>.</p>
        </div>
        <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-bottom:28px">
          <p style="font-size:10px;color:#9ca3af;font-weight:700;margin-bottom:3px">NORMAS DE REFERÊNCIA</p>
          <p style="font-size:10px;color:#9ca3af">NBR 17150 · EN 15635 · ANSI MH16.1 · SEMA CoP · RMI Guidelines · NR-11 · FEM 10.2.04</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:40px">
          <div style="border-top:1.5px solid #374151;padding-top:8px;text-align:center">
            <p style="font-size:12px;font-weight:700">${r.responsavel||'________________________________'}</p>
            <p style="font-size:10px;color:#6b7280">Responsável Técnico · CREA: ${r.crea||'________________'}</p>
          </div>
          <div style="border-top:1.5px solid #374151;padding-top:8px;text-align:center">
            <p style="font-size:12px;font-weight:700">________________________________</p>
            <p style="font-size:10px;color:#6b7280">Representante da Empresa · Data: ${fmtDate(r.data_inspecao)}</p>
          </div>
        </div>
        <div style="margin-top:28px;text-align:center;padding-top:12px;border-top:1px solid #f3f4f6">
          <p style="font-size:9px;color:#d1d5db">Relatório gerado por SInspect · ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div></body></html>`;

    const win = window.open('','_blank');
    if (win) { win.document.write(html); win.document.close(); }
    else {
      const blob = new Blob([html],{type:'text/html'});
      window.open(URL.createObjectURL(blob),'_blank');
    }
  }
};

// =============================================================
// GLOBAL HANDLERS
// =============================================================
async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('le').value.trim();
  const pass  = document.getElementById('lp').value.trim();
  if (!email || !pass) { UI.toast('Preencha email e senha','error'); return; }
  UI.loading(true);
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    State.user = data.user;
    UI.loading(false);
    Router.go('dash');
  } catch(e) {
    UI.loading(false);
    UI.toast(e.message.includes('Invalid') ? 'Email ou senha incorretos' : e.message, 'error');
  }
}

async function doLogout() {
  await sb.auth.signOut();
  State.user = null;
  Router.go('login');
}

async function showForgotPassword() {
  const email = prompt('Digite seu email para redefinir a senha:');
  if (!email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) UI.toast(error.message, 'error');
  else UI.toast('Email de redefinição enviado!');
}

function openTypeModal() {
  const el = document.createElement('div');
  el.id = 'typeModal';
  el.innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-end z-50" onclick="if(event.target===this)document.getElementById('typeModal').remove()">
      <div class="bg-white w-full rounded-t-3xl p-6 pb-10 max-w-md mx-auto shadow-2xl">
        <div class="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-5"></div>
        <h2 class="font-black text-lg text-gray-800 mb-2">Tipo de Estrutura</h2>
        <p class="text-sm text-gray-400 mb-5">Selecione o tipo para iniciar a inspeção:</p>
        ${Object.entries(TIPOS).map(([k,v])=>`
          <button onclick="startNew('${k}')"
            class="w-full flex items-center gap-4 p-4 mb-3 rounded-2xl border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition-all text-left">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style="background:#fff8f5">${k==='porta_paletes'?'🏗️':k==='drive_in'?'🚛':'🏢'}</div>
            <div>
              <p class="font-black text-gray-800">${v}</p>
              <p class="text-xs text-gray-400 mt-0.5">${k==='porta_paletes'?'Estrutura seletiva de armazenagem':k==='drive_in'?'Alta densidade – entrada de empilhadeira':'Piso elevado metálico'}</p>
            </div>
          </button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(el);
}

function startNew(tipo) {
  document.getElementById('typeModal')?.remove();
  State.newDraft(tipo);
  Router.go('wiz','1');
}

function setTipo(tipo) { State.draft.tipo = tipo; P.wiz(1); }

function setCheck(key, val, btn) {
  if (!State.draft.checklist) State.draft.checklist = {};
  State.draft.checklist[key] = val;
  const container = btn.closest('[data-checklist-key]');
  if (container) {
    container.querySelectorAll('[data-status]').forEach(b => {
      const s = b.getAttribute('data-status');
      b.className = `status-btn flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${s===val?`active-${s}`:'border-gray-200 text-gray-400 bg-white'}`;
    });
  }
  const cl = CHECKLISTS[State.draft.tipo]||[];
  const total = cl.reduce((a,g)=>a+g.itens.length,0);
  const done  = Object.keys(State.draft.checklist).length;
  const bar = document.querySelector('#app .h-2 div');
  if (bar) bar.style.width = Math.round(done/total*100)+'%';
  const lbl = document.querySelector('#app .h-2 + p');
  if (lbl) lbl.textContent = `${done} / ${total} itens avaliados`;
}

async function wizNext(step) {
  if (step === 2) {
    const d = State.draft;
    if (!d.empresa||!d.local_inspecao||!d.data_inspecao||!d.responsavel) {
      UI.toast('Preencha os campos obrigatórios (*)','error'); return;
    }
  }
  if (step === 6) {
    if (!State.draft.conclusao) { UI.toast('Selecione a conclusão','error'); return; }
    UI.loading(true);
    try {
      await DB.saveReport(State.draft);
      UI.loading(false);
      UI.toast('Relatório salvo! ✓');
      Router.go('rep', State.draft.id);
    } catch(e) {
      UI.loading(false);
      UI.toast('Erro ao salvar: ' + e.message, 'error');
    }
    return;
  }
  Router.go('wiz', String(step+1));
}

function wizPrev() { if (State.step > 1) Router.go('wiz', String(State.step-1)); }

async function handlePhotos(e) {
  const files = Array.from(e.target.files);
  if (!State.draft.fotos) State.draft.fotos = [];
  UI.loading(true);
  for (const file of files) {
    try {
      const url = await DB.uploadPhoto(State.draft.id, file);
      State.draft.fotos.push({ url, local:'', descricao:'', status:'revisar' });
    } catch(err) {
      // fallback to base64 if storage fails
      const reader = new FileReader();
      await new Promise(res => { reader.onload = ev => { State.draft.fotos.push({ data: ev.target.result, local:'', descricao:'', status:'revisar' }); res(); }; reader.readAsDataURL(file); });
    }
  }
  UI.loading(false);
  P.wiz(4);
  e.target.value = '';
}

function removePhoto(i) { State.draft.fotos.splice(i,1); P.wiz(4); }
function setPhotoStatus(i, s) { State.draft.fotos[i].status = s; P.wiz(4); }
function addCorredor() { if (!State.draft.corredores) State.draft.corredores=[]; State.draft.corredores.push({numero:String(State.draft.corredores.length+1).padStart(2,'0'),montantes:[]}); P.wiz(5); }
function removeCorredor(ci) { State.draft.corredores.splice(ci,1); P.wiz(5); }
function addMontante(ci) { State.draft.corredores[ci].montantes.push({lado:'MD',posicao:'',cz:null}); P.wiz(5); }
function removeMontante(ci,mi) { State.draft.corredores[ci].montantes.splice(mi,1); P.wiz(5); }
function setConclusao(v) { State.draft.conclusao = v; P.wiz(6); }

function editRep(id) {
  const r = State.reports.find(r => r.id === id);
  if (r) { State.loadDraft(r); Router.go('wiz','1'); }
  else DB.getReport(id).then(r => { State.loadDraft(r); Router.go('wiz','1'); });
}

function doPrint(id) { P.print(id); }

async function confirmDelete(id) {
  if (!confirm('Excluir este relatório permanentemente?')) return;
  try {
    await DB.deleteReport(id);
    UI.toast('Relatório excluído');
    Router.go('dash');
  } catch(e) { UI.toast('Erro ao excluir', 'error'); }
}

// =============================================================
// INIT
// =============================================================
document.addEventListener('DOMContentLoaded', () => Router.init());
