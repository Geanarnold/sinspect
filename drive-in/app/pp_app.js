// Tela do Porta-Palete no padrão SUPRA (Gean, 17/10/2026): CORTE = TIPO DE MÓDULO (A, B, TÚNEL…) e a PLANTA define a quantidade
// (fileiras simples ou duplas, cada uma com a sequência de tipos e o corredor). Calcula (PPEngine.calcularProjeto), mostra frontal e lateral
// do tipo, planta baixa e lista de peças, e gera DXF/PDF (folha 1: tipos + descrições técnicas; folha 2: planta) e Excel.
// Os dados ficam no navegador (localStorage) e podem ser salvos/abertos como arquivo .pp.json.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kg = (v) => v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtKg = (v) => v == null ? '–' : Math.round(v).toLocaleString('pt-BR');
  const CAB = ['ppCliente', 'ppProjeto', 'ppCidade', 'ppUf', 'ppDesenhista', 'ppRevisao'];
  const CHAVE = 'paletcad_pp_v2';
  const PERFIS = ['80#1,5', '90#1,5', '100#1,5', '110#1,5', '130#1,5', '150#1,5', '150#1,8', '150#2,0'];
  const MOD0 = { paletesNivel: 2, frentePalete: 1000, alturaPalete: 1200, cargaPalete: 1000, niveis: 3, paleteChao: true, tunel: false, alturas: [], perfilLongarina: '', compLongarina: '', alturaColuna: '' };
  const QUADRO0 = { coluna: '80', espessura: '2.0', profPalete: 1200, profQuadro: 1000, modulacao: 'padrao', espTrav: '1.4', entreFileiras: 300, peDireito: '' };
  const novoTipo = (nome) => ({ nome, modulo: { ...MOD0, alturas: [] } });
  const novoProjeto = () => ({ cab: {}, quadro: { ...QUADRO0 }, tipos: [novoTipo('A')], atual: 0, fileiras: [{ nome: 'F1', dupla: false, seq: [{ tipo: 'A', qtd: 4 }], corredor: 3000 }] });
  let proj = novoProjeto(), vista = 'frontal', ultimo = null, etapa = 0;
  const T = () => proj.tipos[proj.atual] || proj.tipos[0];
  const copia = (o) => JSON.parse(JSON.stringify(o));

  const guardar = () => { proj.cab = Object.fromEntries(CAB.map((k) => [k, $(k).value])); try { localStorage.setItem(CHAVE, JSON.stringify(proj)); } catch (e) { /* sem armazenamento */ } };
  const carregar = (d) => {
    if (!d || !Array.isArray(d.tipos) || !d.tipos.length) return false;
    proj = { ...novoProjeto(), ...d, quadro: { ...QUADRO0, ...(d.quadro || {}) }, tipos: d.tipos.map((t) => ({ nome: t.nome, modulo: { ...MOD0, ...(t.modulo || {}) } })), fileiras: d.fileiras || [] };
    proj.atual = Math.min(proj.atual || 0, proj.tipos.length - 1);
    for (const k of CAB) $(k).value = proj.cab[k] != null ? proj.cab[k] : k === 'ppRevisao' ? 'REV.00' : '';
    return true;
  };

  // ---------- campos ----------
  const campo = (id, rot, val, { tipo = 'number', un = '', extra = '', full = false } = {}) =>
    `<div class="campo${full ? ' full' : ''}"><label for="${id}">${rot}</label><div class="in${un ? ' com-un' : ''}"><input id="${id}" type="${tipo}" value="${esc(val)}"${extra}/>${un ? `<span class="un">${un}</span>` : ''}</div></div>`;
  const sel = (id, rot, opts, val, un = '') =>
    `<div class="campo"><label for="${id}">${rot}</label><div class="in${un ? ' com-un' : ''}"><select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${t}</option>`).join('')}</select>${un ? `<span class="un">${un}</span>` : ''}</div></div>`;
  const chk = (id, rot, v) => `<div class="campo"><label class="chk"><input id="${id}" type="checkbox"${v ? ' checked' : ''}/> ${rot}</label></div>`;
  const prof = []; for (let v = 600; v <= 1200; v += 50) prof.push([v, v]);

  // ---------- 2. quadro e palete (vale para o projeto todo) ----------
  const MAPA_Q = { qColuna: 'coluna', qEspessura: 'espessura', qProfQuadro: 'profQuadro', qProfPalete: 'profPalete', qModulacao: 'modulacao', qEspTrav: 'espTrav', qEntre: 'entreFileiras', qPeDireito: 'peDireito' };
  function formQuadro() {
    const q = proj.quadro;
    $('ppFormQuadro').innerHTML = `<details class="pp-box" open><summary>2. Quadro e palete</summary><div class="pp-campos">
      ${sel('qColuna', 'Coluna', [['80', 'AMPP COL 80'], ['101', 'AMPP COL 101'], ['122', 'AMPP COL 122']], q.coluna)}${sel('qEspessura', 'Espessura', [['1.8', '1,8'], ['2.0', '2,0'], ['2.25', '2,25'], ['2.65', '2,65']], q.espessura, 'mm')}
      ${sel('qProfQuadro', 'Profundidade do quadro', prof, q.profQuadro, 'mm')}${campo('qProfPalete', 'Profundidade do palete', q.profPalete, { un: 'mm' })}
      ${sel('qModulacao', 'Amarração', [['padrao', 'Padrão (900)'], ['zigzag', 'Zig-zag (600)'], ['misto', 'Misto (3×600 + 900)']], q.modulacao)}${sel('qEspTrav', 'Chapa das travessas', [['0.85', '0,85'], ['1.2', '1,20'], ['1.4', '1,40'], ['1.8', '1,80']], q.espTrav, 'mm')}
      ${campo('qEntre', 'Entre fileiras (dupla)', q.entreFileiras, { un: 'mm' })}${campo('qPeDireito', 'Pé-direito (opcional)', q.peDireito, { un: 'mm' })}
    </div></details>`;
    for (const [id, k] of Object.entries(MAPA_Q)) $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', () => { q[k] = $(id).value; mudou(); });
  }

  // ---------- 3. tipos de módulo ----------
  function alturasArr(m) {
    let a = Array.isArray(m.alturas) ? m.alturas.slice() : String(m.alturas || '').split(/[;,\s]+/).filter(Boolean);
    const n = Math.max(1, Math.round(Number(m.niveis) || 1));
    a = a.slice(0, n); while (a.length < n) a.push('');
    m.alturas = a; return a;
  }
  function renderTipos() {
    $('ppListaTipos').innerHTML = proj.tipos.map((t, i) => `<button type="button" class="chip-corte${i === proj.atual ? ' active' : ''}" data-t="${i}">${esc(t.nome || '(sem nome)')}${t.modulo.tunel ? ' · túnel' : ''}</button>`).join('');
    $('ppListaTipos').querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { proj.atual = Number(b.dataset.t); renderTipos(); formTipo(); render(); }));
    $('ppRemTipo').disabled = proj.tipos.length < 2;
  }
  function formTipo() {
    const t = T(), m = t.modulo, k0 = 't_';
    $('ppFormTipo').innerHTML = `<div class="pp-mod${m.tunel ? ' tunel' : ''}"><div class="pp-campos">
      ${campo('tNome', 'Nome do tipo (corte)', t.nome, { tipo: 'text', extra: ' maxlength="10"' })}${chk(k0 + 'tunel', 'Túnel (passagem embaixo)', m.tunel)}
      ${campo(k0 + 'paletesNivel', 'Paletes por nível', m.paletesNivel)}${campo(k0 + 'cargaPalete', 'Peso do palete', m.cargaPalete, { un: 'kg' })}
      ${campo(k0 + 'frentePalete', 'Frente do palete', m.frentePalete, { un: 'mm' })}${campo(k0 + 'alturaPalete', 'Altura do palete', m.alturaPalete, { un: 'mm' })}
      ${chk(k0 + 'paleteChao', 'Palete no chão', m.paleteChao && !m.tunel)}${campo(k0 + 'niveis', 'Níveis de longarina', m.niveis, { extra: ' min="1" max="20"' })}
      <div class="full pp-niv"><label>Altura de cada nível (topo da longarina, medido do piso, em mm)</label><div class="pp-niv-g">${alturasArr(m).map((v, k) => `<div class="pp-niv-c"><span>N${k + 1}</span><input type="number" step="50" min="0" id="tn${k}" data-k="${k}" value="${esc(v)}"/></div>`).join('')}</div>
        <p class="nota">Em branco = calculado pelo nível de baixo (palete + 100 + longarina). Digite só o que for diferente${m.tunel ? '; no túnel o N1 é obrigatório' : ''}.</p></div>
      ${sel(k0 + 'perfilLongarina', 'Longarina', [['', 'Automática'], ...PERFIS.map((p) => [p, 'TB ' + p.replace('#', ' #')])], m.perfilLongarina)}${campo(k0 + 'compLongarina', 'Comprimento da longarina', m.compLongarina, { un: 'mm', extra: ' step="50" placeholder="calculado"' })}
      <div class="full pp-colh" id="ppColH"></div>
      <div class="full pp-mod-acoes"><button type="button" class="mini-btn" id="tLimpar">Limpar alturas (voltar ao calculado)</button></div>
    </div></div>`;
    $('tNome').addEventListener('input', () => {
      const novo = $('tNome').value.trim().toUpperCase(), velho = String(t.nome || '').toUpperCase();
      for (const f of proj.fileiras) for (const sg of f.seq) if (String(sg.tipo).toUpperCase() === velho) sg.tipo = novo; // a planta acompanha o nome
      t.nome = novo; renderTipos(); formPlanta(); mudou();
    });
    for (const k of Object.keys(MOD0)) {
      const el = $(k0 + k); if (!el) continue;
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' || k === 'niveis' ? 'change' : 'input', () => {
        m[k] = el.type === 'checkbox' ? el.checked : el.value;
        // re-render fora do evento: o 'change' dispara no blur, e trocar o HTML do campo que está saindo do foco quebra o navegador
        if (k === 'tunel') { if (m.tunel) m.paleteChao = false; setTimeout(() => { renderTipos(); formTipo(); }); }
        if (k === 'niveis') { alturasArr(m); setTimeout(formTipo); }
        setTimeout(mudou);
      });
    }
    document.querySelectorAll('#ppFormTipo .pp-niv input[data-k]').forEach((el) => el.addEventListener('input', () => { m.alturas[Number(el.dataset.k)] = el.value; mudou(); }));
    $('tLimpar').addEventListener('click', () => { m.alturas = []; alturasArr(m); formTipo(); mudou(); });
  }
  // altura da coluna do tipo: calculada (última longarina + 250); só sobe, e só pelo botão
  function renderColH() {
    const box = $('ppColH'), t = ultimo && ultimo.tipos.find((x) => x.nome === String(T().nome).toUpperCase()); if (!box || !t) return;
    const m = T().modulo, hc = t.r.colunasHcalc[0], editar = !!m._editarColuna;
    box.innerHTML = `<div class="pp-colh-l">Altura da coluna: calculada <b>${hc}</b> mm (última longarina + 250)${m.alturaColuna && Number(m.alturaColuna) > hc ? ` · usada <b>${t.r.colunasH[0]}</b> mm` : ''}</div>
      ${editar ? `<div class="pp-colh-e"><input type="number" step="50" min="${hc}" id="tColH" value="${esc(m.alturaColuna)}" placeholder="${hc}"/><button type="button" class="mini-btn" id="tColOk">Concluir</button></div>` : `<button type="button" class="mini-btn" id="tColEd">Editar altura da coluna</button>`}
      ${m.alturaColuna ? '<button type="button" class="mini-btn discreto" id="tColVolta">Voltar à calculada</button>' : ''}`;
    if ($('tColEd')) $('tColEd').addEventListener('click', () => { m._editarColuna = true; renderColH(); });
    if ($('tColOk')) $('tColOk').addEventListener('click', () => { m._editarColuna = false; renderColH(); });
    if ($('tColVolta')) $('tColVolta').addEventListener('click', () => { m.alturaColuna = ''; m._editarColuna = false; mudou(); });
    if ($('tColH')) $('tColH').addEventListener('change', () => {
      const v = Number($('tColH').value);
      if (v && v < hc) { alert(`A coluna só pode subir: mínimo ${hc} mm (última longarina + 250).`); m.alturaColuna = ''; } else m.alturaColuna = $('tColH').value;
      setTimeout(mudou);
    });
  }

  // ---------- 4. planta: fileiras ----------
  function formPlanta() {
    const tiposOpt = proj.tipos.map((t) => [String(t.nome || '').toUpperCase(), String(t.nome || '').toUpperCase() || '?']);
    $('ppFormPlanta').innerHTML = `<div class="pp-mods">${proj.fileiras.map((f, i) => `
      <div class="pp-mod" data-f="${i}"><div class="pp-fil-cab"><b>Fileira</b><input class="pp-fil-nome" data-f="${i}" value="${esc(f.nome)}" maxlength="8"/>
        <select data-dupla="${i}"><option value="0"${f.dupla ? '' : ' selected'}>Simples</option><option value="1"${f.dupla ? ' selected' : ''}>Dupla</option></select>
        <span class="pp-fil-res" id="ppFilRes${i}"></span></div>
        <div class="pp-seq">${f.seq.map((sg, k) => `<div class="pp-seq-i"><select data-f="${i}" data-k="${k}" data-c="tipo">${tiposOpt.map(([v, t]) => `<option value="${esc(v)}"${v === String(sg.tipo).toUpperCase() ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><span>×</span><input type="number" min="0" data-f="${i}" data-k="${k}" data-c="qtd" value="${esc(sg.qtd)}"/><button type="button" class="mini-btn discreto" data-rmseg="${i}:${k}" title="Remover trecho">✕</button></div>`).join('')}
          <button type="button" class="mini-btn" data-addseg="${i}">+ trecho</button></div>
        <div class="pp-fil-pe">${i < proj.fileiras.length - 1 ? `<label>Corredor até a próxima <input type="number" step="50" data-corr="${i}" value="${esc(f.corredor)}"/> mm</label>` : '<span class="nota">última fileira</span>'}
          <span class="pp-fil-ac"><button type="button" class="mini-btn" data-dupf="${i}">Duplicar</button><button type="button" class="mini-btn discreto" data-rmf="${i}"${proj.fileiras.length < 2 ? ' disabled' : ''}>Remover</button></span></div>
      </div>`).join('')}
      <button type="button" class="mini-btn" id="ppAddFil">+ Fileira</button>
      <p class="nota">Sequência da fileira na ordem da planta (da esquerda para a direita): ex.: A × 17, TÚNEL × 1, A × 19. Fileira dupla = duas linhas de quadros costas com costas, com o distanciador.</p></div>`;
    const P = $('ppFormPlanta'), F = proj.fileiras;
    P.querySelectorAll('.pp-fil-nome').forEach((el) => el.addEventListener('input', () => { F[el.dataset.f].nome = el.value; mudou(); }));
    P.querySelectorAll('[data-dupla]').forEach((el) => el.addEventListener('change', () => { F[el.dataset.dupla].dupla = el.value === '1'; mudou(); }));
    P.querySelectorAll('[data-c]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { F[el.dataset.f].seq[el.dataset.k][el.dataset.c] = el.value; mudou(); }));
    P.querySelectorAll('[data-corr]').forEach((el) => el.addEventListener('input', () => { F[el.dataset.corr].corredor = el.value; mudou(); }));
    P.querySelectorAll('[data-addseg]').forEach((b) => b.addEventListener('click', () => { const f = F[b.dataset.addseg]; f.seq.push({ tipo: T().nome || 'A', qtd: 1 }); formPlanta(); mudou(); }));
    P.querySelectorAll('[data-rmseg]').forEach((b) => b.addEventListener('click', () => { const [i, k] = b.dataset.rmseg.split(':').map(Number); F[i].seq.splice(k, 1); formPlanta(); mudou(); }));
    P.querySelectorAll('[data-dupf]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.dupf), c = copia(F[i]); c.nome = `F${F.length + 1}`; F.splice(i + 1, 0, c); if (!F[i].corredor) F[i].corredor = 3000; formPlanta(); mudou(); }));
    P.querySelectorAll('[data-rmf]').forEach((b) => b.addEventListener('click', () => { if (F.length < 2) return; F.splice(Number(b.dataset.rmf), 1); formPlanta(); mudou(); }));
    $('ppAddFil').addEventListener('click', () => { const ult = F[F.length - 1]; if (ult && !ult.corredor) ult.corredor = 3000; F.push({ nome: `F${F.length + 1}`, dupla: false, seq: [{ tipo: T().nome || 'A', qtd: 4 }], corredor: '' }); formPlanta(); mudou(); });
  }

  // ---------- etapas (abas como no Drive-In): 1 Projeto · 2 Quadro e palete · 3 Tipos de módulo · 4 Planta ----------
  const NETAPAS = 4;
  function mostrarEtapa(k) {
    etapa = Math.max(0, Math.min(NETAPAS - 1, k));
    document.querySelectorAll('[data-pp-etapa]').forEach((el) => el.classList.toggle('hidden', Number(el.dataset.ppEtapa) !== etapa));
    document.querySelectorAll('[data-pp-passo]').forEach((el) => { const i = Number(el.dataset.ppPasso); el.classList.toggle('active', i === etapa); el.classList.toggle('feito', i < etapa); });
    $('ppVoltar').disabled = etapa === 0; $('ppAvancar').textContent = etapa === NETAPAS - 1 ? 'Gerar lista de peças' : 'Avançar';
    // a vista acompanha a etapa: tipos → frontal do tipo; planta → planta baixa
    const v = etapa === 3 ? 'planta' : etapa === 2 && vista === 'planta' ? 'frontal' : null;
    if (v) document.querySelector(`.pp-abas button[data-v="${v}"]`).click();
  }
  // pendências (erros) por etapa, no número da aba
  function marcarPendencias(P) {
    const n = [0, 0, 0, 0];
    for (const e of P.erros) n[/^Tipo|tipos? de módulo/i.test(e) ? 2 : /^Fileira|planta/i.test(e) ? 3 : 1]++;
    document.querySelectorAll('[data-pp-passo]').forEach((el) => { let b = el.querySelector('.pend'); const q = n[Number(el.dataset.ppPasso)];
      if (!q) { if (b) b.remove(); return; } if (!b) { b = document.createElement('span'); b.className = 'pend'; el.appendChild(b); } b.textContent = q; });
  }

  // ---------- cálculo e resultado ----------
  function mudou() { guardar(); render(); }
  function render() {
    try { ultimo = PPEngine.calcularProjeto(proj, window.CATALOGO); } catch (e) { $('ppMsgs').innerHTML = `<div class="pp-msg pp-erro">Erro no cálculo: ${esc(e.message)}</div>`; return; }
    const P = ultimo, t = P.tipos.find((x) => x.nome === String(T().nome || '').toUpperCase()) || P.tipos[0];
    $('ppMsgs').innerHTML = P.erros.map((m) => `<div class="pp-msg pp-erro">${esc(m)}</div>`).join('') + P.alertas.map((m) => `<div class="pp-msg pp-alerta">${esc(m)}</div>`).join('');
    $('ppResumo').innerHTML = [['Módulos', `${P.modulos}`], ['Posições', `${P.posicoes} pallets`], ['Peso total', `${kg(P.pesoTotal)} kg`],
      ...P.tipos.map((x) => [`Tipo ${x.nome}`, `${x.qtdModulos} mód. · ${x.posicoes} pos. · TB ${x.r.modulos[0].TB} ${x.r.modulos[0].L}`])].map(([k, v]) => `<div>${esc(k)}<b>${esc(v)}</b></div>`).join('');
    document.querySelectorAll('.pp-fil-res').forEach((el) => { el.textContent = ''; });
    P.fileiras.forEach((f) => { const i = proj.fileiras.findIndex((x, k) => String(x.nome || `F${k + 1}`).trim() === f.nome), el = $(`ppFilRes${i}`); if (el) el.textContent = `${f.r.modulos.length} mód. · ${Math.round(f.r.dimensoes.comprimento)} mm · ${f.r.posicoes} pos.`; });
    const ok = !P.erros.length;
    for (const id of ['ppDxf', 'ppPdf', 'ppXlsx', 'ppBtnBom']) $(id).disabled = !ok;
    marcarPendencias(P);
    try {
      $('ppVista').innerHTML = vista === 'planta' ? (P.fileiras.length ? PPDesenho.svgPlanta(P) : '<p class="nota">Monte a planta (caixa 4).</p>') : t && !t.r.erros.length ? PPDesenho.svgTipo(t, vista) : '<p class="nota">Corrija os erros do tipo para ver o desenho.</p>';
    } catch (e) { $('ppVista').innerHTML = `<p class="nota">Desenho indisponível: ${esc(e.message)}</p>`; }
    let grupo = '', html = '<table><thead><tr><th>Código</th><th>Descrição</th><th class="n">Qtd</th><th class="n">Compr.</th><th class="n">Peso unit.</th><th class="n">Peso total</th><th>Obs.</th></tr></thead><tbody>';
    for (const p of P.pecas) {
      if (p.grupo !== grupo) { grupo = p.grupo; html += `<tr class="grp"><td colspan="7">${esc(grupo)}</td></tr>`; }
      html += `<tr${p.atencao ? ' class="atencao"' : ''}><td>${esc(p.codigo)}</td><td>${esc(p.desc)}</td><td class="n">${p.qtd}</td><td class="n">${p.compr == null ? '' : Math.round(p.compr * 10) / 10}</td><td class="n">${kg(p.pesoUnit)}</td><td class="n">${kg(p.pesoTotal)}</td><td>${esc(p.obs)}</td></tr>`;
    }
    $('ppBom').innerHTML = `<p class="nota">Projeto inteiro (todas as fileiras da planta).</p>` + html + `</tbody><tfoot><tr><td colspan="5">Total do projeto (itens com peso)</td><td class="n">${kg(P.pesoTotal)}</td><td></td></tr></tfoot></table>`;
    renderColH(); painelLongarina(P); painelColuna(P);
  }

  // "Calcular longarina": por tipo, todos os perfis da F 237 no comprimento do tipo, com o escolhido marcado
  function painelLongarina(P) {
    $('ppPainelLong').innerHTML = `<h3>Longarinas por tipo de módulo</h3><p class="nota">F 237 rev.006 – carga admissível no par, flecha &lt; L/200 (NBR 17150 / NBR 15524 / NBR 14762). Comprimento intermediário usa o tabelado maior seguinte.</p>` + P.tipos.map((t, i) => {
      const md = t.r.modulos[0];
      const linhas = PPLongarina.PERFIS.map((p) => {
        const cap = PPLongarina.capacidade(p, md.L), ok = cap != null && cap >= md.cargaPar, peso = p.kgm * md.L / 1000 + 2 * p.garra.kg;
        return `<tr${p.id === md.perfil ? ' class="sel"' : ''}><td>TB ${p.h} #${p.esp.toFixed(2).replace('.', ',')}${p.id === md.auto ? ' (automático)' : ''}</td><td class="n">${fmtKg(cap)}</td><td class="${cap == null ? '' : ok ? 'pp-ok' : 'pp-nok'}">${cap == null ? 'sem tabela' : ok ? 'atende' : 'não atende'}</td><td class="n">${kg(peso)}</td><td>${p.id === md.perfil ? 'em uso' : `<button type="button" class="mini-btn" data-ti="${i}" data-perfil="${p.id}">usar</button>`}</td></tr>`;
      }).join('');
      return `<h4>Tipo ${esc(t.nome)}${t.tunel ? ' (túnel)' : ''} – ${md.L} mm, carga no par ${fmtKg(md.cargaPar)} kg (${md.nPal} × ${fmtKg(md.carga)} kg)</h4><table><thead><tr><th>Perfil</th><th class="n">Capacidade (kg/par)</th><th>Situação</th><th class="n">Peso (kg/un.)</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`;
    }).join('');
    $('ppPainelLong').querySelectorAll('button[data-perfil]').forEach((b) => b.addEventListener('click', () => {
      const nome = P.tipos[Number(b.dataset.ti)].nome, tp = proj.tipos.find((x) => String(x.nome).toUpperCase() === nome); if (!tp) return;
      tp.modulo.perfilLongarina = b.dataset.perfil; if (tp === T()) formTipo(); mudou();
    }));
  }
  // "Calcular colunas": F 382 – pior coluna de cada fileira (carga dos módulos vizinhos e maior vão entre níveis)
  function painelColuna(P) {
    const Q = P.quadro, col = String(Q.coluna), opcoes = Object.keys(PPEngine.F382).filter((k) => k.startsWith(col + '#'));
    const linhas = P.fileiras.map((f) => {
      const v = f.r.verifColunas.reduce((a, x) => (!a || x.carga > a.carga ? x : a), null); if (!v) return '';
      return `<tr><td>Fileira ${esc(f.nome)} – coluna ${v.j + 1}</td><td class="n">${f.r.colunasH[v.j]}</td><td class="n">${fmtKg(v.carga)}</td><td class="n">${v.h}${v.hRef && v.hRef !== v.h ? ` (${v.hRef})` : ''}</td>${opcoes.map((o) => {
        const cap = v.hRef ? PPEngine.F382[o][v.hRef] : null, ok = cap != null && v.carga <= cap;
        return `<td class="n ${cap == null ? '' : ok ? 'pp-ok' : 'pp-nok'}${o === v.id ? ' sel' : ''}">${cap == null ? '–' : Math.round(100 * v.carga / cap) + '%'}</td>`; }).join('')}<td>${v.motivo ? `<span class="pp-nok">${esc(v.motivo)}</span>` : ''}</td></tr>`;
    }).join('');
    const emUso = P.fileiras.length ? P.fileiras[0].r.verifColuna.id : '';
    $('ppPainelCol').innerHTML = `<h3>Colunas – COL ${esc(col)} #${esc(String(Q.espessura).replace('.', ','))} em uso</h3>
      <p class="nota">F 382 rev.00. Coluna mais carregada de cada fileira. Carga = ¼ da carga do par em cada nível dos módulos vizinhos (o palete do chão não carrega a coluna); h = maior distância entre níveis (tabela no h imediatamente maior). Uso = carga ÷ capacidade.</p>
      <table><thead><tr><th></th><th class="n">Altura</th><th class="n">Carga (kg)</th><th class="n">h (mm)</th>${opcoes.map((o) => `<th class="n">#${o.split('#')[1]}${o === emUso ? ' (em uso)' : ''}</th>`).join('')}<th></th></tr></thead><tbody>${linhas}</tbody></table>
      <div class="pp-mod-acoes">${opcoes.filter((o) => o !== emUso).map((o) => `<button type="button" class="mini-btn" data-esp="${o.split('#')[1].replace(',', '.')}">Usar #${o.split('#')[1]}</button>`).join('')}</div>`;
    $('ppPainelCol').querySelectorAll('button[data-esp]').forEach((b) => b.addEventListener('click', () => { proj.quadro.espessura = b.dataset.esp; formQuadro(); mudou(); }));
  }
  const abrir = (id) => { $(id).classList.remove('hidden'); $(id).scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  // ---------- saídas ----------
  const maius = (id) => String($(id).value || '').trim().toUpperCase();
  const nomeArq = () => ($('ppProjeto').value || 'porta-palete').replace(/[^\w-]+/g, '_');
  function dadosFolhas(P) {
    const hoje = new Date().toLocaleDateString('pt-BR'), rev = ($('ppRevisao').value || 'REV.00').replace('.', '-');
    const pals = []; for (const t of P.tipos) { const m = t.r.modulos[0], k = [m.frente, P.quadro.profPalete, m.hp, m.carga].join('|'); if (!pals.some((p) => p.k === k)) pals.push({ k, modelo: `P${String(pals.length + 1).padStart(2, '0')}`, larg: m.frente, prof: P.quadro.profPalete, alt: m.hp, peso: m.carga }); }
    const base = { cliente: maius('ppCliente'), cidade: maius('ppCidade'), uf: maius('ppUf'), representante: '', rt: '', desenhista: maius('ppDesenhista'), processo: maius('ppProjeto'), revisao: rev, data: hoje,
      rev: { num: rev.replace(/^REV-?/, ''), por: maius('ppDesenhista'), data: hoje, alteracao: 'EMISSÃO INICIAL' }, capTotal: `${P.posicoes} PALLETS`, rascunho: true, paletes: pals.slice(0, 2),
      descricao: { bloco: P.tipos.map((t) => t.nome).join('/'), dims: '', empilhamento: '', carga: '', porRua: `${P.modulos} MÓDULOS`, ruas: `${P.fileiras.length} FILEIRA(S)`, total: `${P.posicoes} PALLETS` } };
    return [{ ...base, folha: '1/2' }, { ...base, folha: '2/2' }];
  }
  const baixar = (nome, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); };
  function excel(P) {
    const B = (v) => ({ v, b: true }), cab = ['Grupo', 'Código', 'Descrição', 'Qtd', 'Compr. (mm)', 'Peso unit. (kg)', 'Peso total (kg)', 'Obs.'].map(B);
    const topo = (t) => [[{ v: `PaletCad – Porta-Palete – ${t}`, fmt: 'tit' }], [{ v: `Projeto ${$('ppProjeto').value || '—'} · ${$('ppCliente').value || '—'} · ${$('ppRevisao').value} · ${new Date().toLocaleDateString('pt-BR')}`, fmt: 'sub' }], [],
      [B('RASCUNHO – NÃO EMITIDO')], [B(PPEngine.AVISO_ESTRUTURAL)], [PPEngine.NOTA_RESPONSABILIDADE], []];
    const linha = (p) => [p.grupo, p.codigo, p.desc, { v: p.qtd, fmt: 'int' }, p.compr == null ? '' : Math.round(p.compr * 10) / 10, p.pesoUnit == null ? '' : { v: p.pesoUnit, fmt: 'kg' }, p.pesoTotal == null ? '' : { v: p.pesoTotal, fmt: 'kg' }, (p.atencao ? '⚠ ' : '') + p.obs];
    const folhas = [{ nome: 'Projeto', larguras: [24, 13, 60, 9, 12, 14, 15, 50], linhas: [...topo('Lista de materiais do projeto'),
      [B('DESCRIÇÕES TÉCNICAS PORTA PALLETS')], ['Tipo', 'Dimensão do módulo', 'Empilhamento', 'Carga máx. por plano (kg)', 'Qtd. módulos', 'Capacidade (pallets)'].map(B),
      ...P.tipos.map((t) => { const r = t.r, m = r.modulos[0]; return [t.nome, `${m.L + 2 * r.entradas.col}/${r.entradas.P}/${r.dimensoes.altura}`, `${m.chao ? 'PISO + ' : ''}${m.niveis.length} NÍVEIS`, { v: m.cargaPar, fmt: 'int' }, { v: t.qtdModulos, fmt: 'int' }, { v: t.posicoes, fmt: 'int' }]; }),
      [], ...P.alertas.map((a) => [a]), [], cab, ...P.pecas.map(linha), [], [B('TOTAL DO PROJETO (itens com peso)'), '', '', '', '', '', { v: P.pesoTotal, fmt: 'kg' }]] }];
    for (const f of P.fileiras) folhas.push({ nome: `Fileira ${f.nome}`.slice(0, 31), larguras: [24, 13, 60, 9, 12, 14, 15, 50], linhas: [...topo(`Fileira ${f.nome}`), [B(`FILEIRA ${f.nome}`), `${f.dupla ? 'dupla' : 'simples'} · ${f.rot.length} módulo(s) por linha`], [], cab, ...f.r.pecas.map(linha), [], [B('TOTAL DA FILEIRA'), '', '', '', '', '', { v: f.r.pesoTotal, fmt: 'kg' }]] });
    baixar(`lista-pecas-${nomeArq()}-PP_RASCUNHO.xlsx`, Planilha.gerar(folhas));
  }

  function init() {
    if (!$('paginaPP')) return;
    let d = null; try { d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { /* ignora */ }
    if (!carregar(d)) $('ppRevisao').value = $('ppRevisao').value || 'REV.00';
    for (const k of CAB) $(k).addEventListener('input', guardar);
    formQuadro(); renderTipos(); formTipo(); formPlanta();
    const proximoNome = () => { const usados = new Set(proj.tipos.map((t) => String(t.nome).toUpperCase())); for (let c = 65; c < 91; c++) if (!usados.has(String.fromCharCode(c))) return String.fromCharCode(c); return 'X'; };
    $('ppNovoTipo').addEventListener('click', () => { proj.tipos.push(novoTipo(proximoNome())); proj.atual = proj.tipos.length - 1; renderTipos(); formTipo(); formPlanta(); mudou(); $('tNome').focus(); });
    $('ppDupTipo').addEventListener('click', () => { const c = copia(T()); c.nome = proximoNome(); proj.tipos.push(c); proj.atual = proj.tipos.length - 1; renderTipos(); formTipo(); formPlanta(); mudou(); $('tNome').focus(); });
    $('ppRemTipo').addEventListener('click', () => {
      if (proj.tipos.length < 2) return; const nome = String(T().nome).toUpperCase();
      const usado = proj.fileiras.some((f) => f.seq.some((sg) => String(sg.tipo).toUpperCase() === nome));
      if (!confirm(`Remover o tipo ${nome}?${usado ? ' Ele está na planta: os trechos com esse tipo também saem.' : ''}`)) return;
      for (const f of proj.fileiras) f.seq = f.seq.filter((sg) => String(sg.tipo).toUpperCase() !== nome);
      proj.tipos.splice(proj.atual, 1); proj.atual = Math.max(0, proj.atual - 1); renderTipos(); formTipo(); formPlanta(); mudou();
    });
    $('ppNovoProj').addEventListener('click', () => { if (!confirm('Começar um projeto de porta-palete em branco? O atual será descartado da tela (salve o arquivo antes, se precisar).')) return; proj = novoProjeto(); for (const k of CAB) $(k).value = k === 'ppRevisao' ? 'REV.00' : ''; formQuadro(); renderTipos(); formTipo(); formPlanta(); mudou(); });
    $('ppSalvar').addEventListener('click', () => { guardar(); baixar(`${nomeArq()}_${($('ppRevisao').value || 'REV.00')}.pp.json`, new Blob([JSON.stringify({ tipo: 'porta-palete', versao: 2, ...proj }, null, 1)], { type: 'application/json' })); });
    $('ppAbrir').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { if (!carregar(JSON.parse(await f.text()))) throw new Error('arquivo sem tipos de módulo (versão antiga?)'); formQuadro(); renderTipos(); formTipo(); formPlanta(); mudou(); } catch (err) { alert('Não foi possível abrir: ' + err.message); }
    });
    document.querySelectorAll('.pp-abas button[data-v]').forEach((b) => b.addEventListener('click', () => {
      vista = b.dataset.v; document.querySelectorAll('.pp-abas button[data-v]').forEach((x) => x.classList.toggle('ativo', x === b)); render();
    }));
    document.querySelectorAll('[data-pp-passo]').forEach((el) => el.addEventListener('click', () => mostrarEtapa(Number(el.dataset.ppPasso))));
    $('ppVoltar').addEventListener('click', () => mostrarEtapa(etapa - 1));
    $('ppAvancar').addEventListener('click', () => { if (etapa === NETAPAS - 1) $('ppBtnBom').click(); else mostrarEtapa(etapa + 1); });
    $('ppBtnLong').addEventListener('click', () => { render(); abrir('ppPainelLong'); });
    $('ppBtnCol').addEventListener('click', () => { render(); abrir('ppPainelCol'); });
    $('ppBtnBom').addEventListener('click', () => { render(); abrir('ppBomCard'); });
    // fora do Emitir (que o PP ainda não tem), DXF, PDF e lista saem como RASCUNHO, igual ao Drive-In
    $('ppDxf').addEventListener('click', () => { if (ultimo && !ultimo.erros.length) baixar(`${nomeArq()}-PP-projeto_RASCUNHO.dxf`, new Blob([PPDesenho.dxfPP(ultimo, dadosFolhas(ultimo))], { type: 'application/dxf' })); });
    $('ppPdf').addEventListener('click', () => {
      if (!ultimo || ultimo.erros.length) return;
      if (!(window.DesenhoPdf && window.jspdf)) { alert('Biblioteca de PDF não carregada (pasta lib/).'); return; }
      try { DesenhoPdf.gerar(PPDesenho.projetoPP(ultimo, dadosFolhas(ultimo)), `${nomeArq()}-PP-projeto_RASCUNHO.pdf`); } catch (e) { alert('Não foi possível gerar o PDF: ' + e.message); }
    });
    $('ppXlsx').addEventListener('click', () => { if (ultimo && !ultimo.erros.length) excel(ultimo); });
  }
  window.PPApp = { render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
