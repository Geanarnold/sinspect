// Tela do Porta-Palete: projeto com cortes; cada corte com quadro e N módulos, cada módulo com palete, carga, níveis e túnel próprios.
// Calcula (pp_engine.js), mostra vistas e lista de peças e gera DXF, PDF e Excel do projeto (uma folha por corte).
// Os dados ficam no navegador (localStorage) e podem ser salvos/abertos como arquivo .pp.json.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kg = (v) => v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtKg = (v) => v == null ? '–' : Math.round(v).toLocaleString('pt-BR');
  const CAB = ['ppCliente', 'ppProjeto', 'ppCidade', 'ppUf', 'ppDesenhista', 'ppRevisao'];
  const CHAVE = 'paletcad_pp_projeto';
  const PERFIS = ['80#1,5', '90#1,5', '100#1,5', '110#1,5', '130#1,5', '150#1,5', '150#1,8', '150#2,0'];
  const MOD0 = { paletesNivel: 2, frentePalete: 1000, alturaPalete: 1200, cargaPalete: 1000, niveis: 3, paleteChao: true, tunel: false, alturas: '', perfilLongarina: '', compLongarina: '' };
  const novoCorte = (nome) => ({ nome: nome || '', qtd: 1, coluna: '80', espessura: '2.0', profPalete: 1200, profQuadro: 1000, modulacao: 'padrao', espTrav: '1.4', fileiras: '1', entreFileiras: 300, peDireito: '',
    alturasColunas: [], editarColunas: false, modulos: [1, 2, 3, 4].map(() => ({ ...MOD0 })) });
  let proj = { cab: {}, atual: 0, cortes: [novoCorte('A')] }, vista = 'frontal', ultimo = null, lista = [];
  const C = () => proj.cortes[proj.atual];

  const guardar = () => { proj.cab = Object.fromEntries(CAB.map((k) => [k, $(k).value])); try { localStorage.setItem(CHAVE, JSON.stringify(proj)); } catch (e) { /* sem armazenamento */ } };
  const carregar = (d) => {
    if (!d || !Array.isArray(d.cortes) || !d.cortes.length) return false;
    proj = { cab: d.cab || {}, atual: Math.min(d.atual || 0, d.cortes.length - 1), cortes: d.cortes.map((c) => ({ ...novoCorte(), ...c, modulos: (c.modulos || []).map((m) => ({ ...MOD0, ...m })) })) };
    for (const k of CAB) $(k).value = proj.cab[k] != null ? proj.cab[k] : k === 'ppRevisao' ? 'REV.00' : '';
    return true;
  };

  // ---------- formulário do corte (caixas 2 a 5), montado a partir do estado ----------
  const campo = (id, rot, val, { tipo = 'number', un = '', extra = '', full = false } = {}) =>
    `<div class="campo${full ? ' full' : ''}"><label for="${id}">${rot}</label><div class="in${un ? ' com-un' : ''}"><input id="${id}" type="${tipo}" value="${esc(val)}"${extra}/>${un ? `<span class="un">${un}</span>` : ''}</div></div>`;
  const sel = (id, rot, opts, val, un = '') =>
    `<div class="campo"><label for="${id}">${rot}</label><div class="in${un ? ' com-un' : ''}"><select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${t}</option>`).join('')}</select>${un ? `<span class="un">${un}</span>` : ''}</div></div>`;
  const chk = (id, rot, v) => `<div class="campo"><label class="chk"><input id="${id}" type="checkbox"${v ? ' checked' : ''}/> ${rot}</label></div>`;
  const prof = []; for (let v = 600; v <= 1200; v += 50) prof.push([v, v]);

  function formCorte() {
    const c = C();
    const mods = c.modulos.map((m, i) => `
      <details class="pp-mod${m.tunel ? ' tunel' : ''}" data-i="${i}"${i < 2 || c.modulos.length <= 4 ? ' open' : ''}><summary><span>Módulo ${i + 1}${m.tunel ? ' · TÚNEL' : ''}</span><span class="pp-mod-res" id="ppModRes${i}"></span></summary><div class="pp-campos">
        ${campo(`m${i}_paletesNivel`, 'Paletes por nível', m.paletesNivel)}${campo(`m${i}_cargaPalete`, 'Peso do palete', m.cargaPalete, { un: 'kg' })}
        ${campo(`m${i}_frentePalete`, 'Frente do palete', m.frentePalete, { un: 'mm' })}${campo(`m${i}_alturaPalete`, 'Altura do palete', m.alturaPalete, { un: 'mm' })}
        ${chk(`m${i}_paleteChao`, 'Palete no chão', m.paleteChao && !m.tunel)}${chk(`m${i}_tunel`, 'Túnel (passagem embaixo)', m.tunel)}
        ${campo(`m${i}_niveis`, 'Níveis (se as alturas ficarem em branco)', m.niveis)}
        ${campo(`m${i}_alturas`, 'Alturas dos níveis – apoio da longarina', m.alturas, { tipo: 'text', un: 'mm', full: true, extra: ` placeholder="em branco = calculado; ex.: 1000 2400 3800"` })}
        ${sel(`m${i}_perfilLongarina`, 'Longarina', [['', 'Automática'], ...PERFIS.map((p) => [p, 'TB ' + p.replace('#', ' #')])], m.perfilLongarina)}${campo(`m${i}_compLongarina`, 'Comprimento', m.compLongarina, { un: 'mm', extra: ' step="50" placeholder="calculado"' })}
        <div class="full pp-mod-acoes">${i ? `<button type="button" class="mini-btn" data-copiar="${i}">Igual ao módulo ${i}</button>` : '<button type="button" class="mini-btn" id="ppAplicarTodos">Aplicar este módulo a todos</button>'}<button type="button" class="mini-btn" data-alturas="${i}">Preencher alturas calculadas</button></div>
      </div></details>`).join('');
    $('ppFormCorte').innerHTML = `
      <details class="pp-box" open><summary>2. Corte</summary><div class="pp-campos">
        ${campo('cNome', 'Nome do corte', c.nome, { tipo: 'text', extra: ' maxlength="12"' })}${campo('cQtd', 'Blocos iguais', c.qtd, { extra: ' min="1"' })}
        ${campo('cNmod', 'Quantos módulos?', c.modulos.length, { extra: ' min="1" max="60"' })}
      </div></details>
      <details class="pp-box" open><summary>3. Quadro e palete</summary><div class="pp-campos">
        ${sel('cColuna', 'Coluna', [['80', 'AMPP COL 80'], ['101', 'AMPP COL 101'], ['122', 'AMPP COL 122']], c.coluna)}${sel('cEspessura', 'Espessura', [['1.8', '1,8'], ['2.0', '2,0'], ['2.25', '2,25'], ['2.65', '2,65']], c.espessura, 'mm')}
        ${sel('cProfQuadro', 'Profundidade do quadro', prof, c.profQuadro, 'mm')}${campo('cProfPalete', 'Profundidade do palete', c.profPalete, { un: 'mm' })}
        ${sel('cModulacao', 'Amarração', [['padrao', 'Padrão (900)'], ['zigzag', 'Zig-zag (600)'], ['misto', 'Misto (3×600 + 900)']], c.modulacao)}${sel('cEspTrav', 'Chapa das travessas', [['0.85', '0,85'], ['1.2', '1,20'], ['1.4', '1,40'], ['1.8', '1,80']], c.espTrav, 'mm')}
        ${sel('cFileiras', 'Fileiras', [['1', 'Simples'], ['2', 'Dupla']], c.fileiras)}${campo('cEntreFileiras', 'Entre fileiras', c.entreFileiras, { un: 'mm' })}
        ${campo('cPeDireito', 'Pé-direito (opcional)', c.peDireito, { un: 'mm' })}
      </div></details>
      <details class="pp-box" open><summary>4. Módulos (${c.modulos.length})</summary><div class="pp-mods">${mods}</div></details>
      <details class="pp-box" open><summary>5. Colunas</summary><div class="pp-cols" id="ppCols"></div></details>`;
    ligarCorte();
  }

  const MAPA_CORTE = { cNome: 'nome', cQtd: 'qtd', cColuna: 'coluna', cEspessura: 'espessura', cProfQuadro: 'profQuadro', cProfPalete: 'profPalete', cModulacao: 'modulacao', cEspTrav: 'espTrav', cFileiras: 'fileiras', cEntreFileiras: 'entreFileiras', cPeDireito: 'peDireito' };
  function ligarCorte() {
    const c = C();
    for (const [id, k] of Object.entries(MAPA_CORTE)) $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', () => { c[k] = $(id).value; if (id === 'cNome') renderCortes(); mudou(); });
    $('cNmod').addEventListener('change', () => {
      const n = Math.max(1, Math.min(60, Math.round(Number($('cNmod').value) || 1)));
      while (c.modulos.length < n) c.modulos.push({ ...c.modulos[c.modulos.length - 1] }); // módulo novo = cópia do último
      c.modulos.length = n; c.alturasColunas.length = Math.min(c.alturasColunas.length, n + 1);
      formCorte(); mudou();
    });
    c.modulos.forEach((m, i) => {
      for (const k of Object.keys(MOD0)) {
        const el = $(`m${i}_${k}`); if (!el) continue;
        el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
          m[k] = el.type === 'checkbox' ? el.checked : el.value;
          if (k === 'tunel') { if (m.tunel) m.paleteChao = false; formCorte(); }
          mudou();
        });
      }
    });
    document.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.copiar); c.modulos[i] = { ...c.modulos[i - 1] }; formCorte(); mudou(); }));
    document.querySelectorAll('[data-alturas]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.alturas); if (!ultimo || !ultimo.modulos[i]) return;
      c.modulos[i].alturas = ultimo.modulos[i].niveis.join(' '); formCorte(); mudou();
    }));
    if ($('ppAplicarTodos')) $('ppAplicarTodos').addEventListener('click', () => { c.modulos = c.modulos.map(() => ({ ...c.modulos[0] })); formCorte(); mudou(); });
  }

  // caixa 5: alturas das colunas (calculadas = última longarina + 250); edição só pelo botão e só para subir
  function renderColunas(r) {
    const c = C(), box = $('ppCols'); if (!box || !r) return;
    const linhas = r.colunasH.map((h, j) => `<tr><td>Coluna ${j + 1}</td><td class="n">${r.colunasHcalc[j]}</td><td class="n">${c.editarColunas
      ? `<input type="number" step="50" min="${r.colunasHcalc[j]}" data-col="${j}" value="${esc(c.alturasColunas[j] || '')}" placeholder="${r.colunasHcalc[j]}"/>` : `<b>${h}</b>`}</td></tr>`).join('');
    box.innerHTML = `<p class="nota">A coluna termina 250 mm acima da última longarina dos módulos vizinhos. Para subir uma coluna, clique em "Editar alturas"; não é possível abaixar.</p>
      <table class="pp-tab-col"><thead><tr><th></th><th class="n">Calculada</th><th class="n">${c.editarColunas ? 'Nova altura (só maior)' : 'Usada'}</th></tr></thead><tbody>${linhas}</tbody></table>
      <div class="pp-mod-acoes"><button type="button" class="mini-btn" id="ppEditarCol">${c.editarColunas ? 'Concluir edição' : 'Editar alturas das colunas'}</button>${c.alturasColunas.some(Boolean) ? '<button type="button" class="mini-btn discreto" id="ppVoltarCol">Voltar às calculadas</button>' : ''}</div>`;
    $('ppEditarCol').addEventListener('click', () => { c.editarColunas = !c.editarColunas; mudou(); });
    if ($('ppVoltarCol')) $('ppVoltarCol').addEventListener('click', () => { c.alturasColunas = []; c.editarColunas = false; mudou(); });
    box.querySelectorAll('input[data-col]').forEach((el) => el.addEventListener('change', () => {
      const j = Number(el.dataset.col), v = Number(el.value);
      if (v && v < r.colunasHcalc[j]) { alert(`A coluna só pode subir: mínimo ${r.colunasHcalc[j]} mm (última longarina + 250).`); el.value = ''; c.alturasColunas[j] = ''; }
      else c.alturasColunas[j] = el.value;
      mudou();
    }));
  }

  // ---------- cortes ----------
  function renderCortes() {
    $('ppListaCortes').innerHTML = proj.cortes.map((c, i) => `<button type="button" class="chip-corte${i === proj.atual ? ' active' : ''}" data-c="${i}">${esc(c.nome || '(sem nome)')}${Number(c.qtd) > 1 ? ' ×' + c.qtd : ''}</button>`).join('');
    $('ppListaCortes').querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { proj.atual = Number(b.dataset.c); renderCortes(); formCorte(); mudou(); }));
    $('ppRemCorte').disabled = proj.cortes.length < 2;
  }

  // ---------- cálculo e resultado ----------
  const calcularTodos = () => proj.cortes.map((c) => PPEngine.calcularCorte(c, window.CATALOGO));
  function mudou() { guardar(); render(); }
  function render() {
    try { lista = calcularTodos(); } catch (e) { $('ppMsgs').innerHTML = `<div class="pp-msg pp-erro">Erro no cálculo: ${esc(e.message)}</div>`; return; }
    const r = ultimo = lista[proj.atual], nomes = new Set(), dup = proj.cortes.some((c) => { const n = String(c.nome || '').trim().toUpperCase(); if (nomes.has(n)) return true; nomes.add(n); return false; });
    const errosProj = [...(proj.cortes.some((c) => !String(c.nome || '').trim()) ? ['Dê nome a todos os cortes.'] : []), ...(dup ? ['Há cortes com o mesmo nome.'] : [])];
    const outros = lista.map((x, i) => (i !== proj.atual && x.erros.length ? `Corte ${x.nome || i + 1}: ${x.erros.length} erro(s).` : null)).filter(Boolean);
    $('ppMsgs').innerHTML = [...errosProj, ...r.erros, ...outros].map((m) => `<div class="pp-msg pp-erro">${esc(m)}</div>`).join('') + r.alertas.map((m) => `<div class="pp-msg pp-alerta">${esc(m)}</div>`).join('');
    const d = r.dimensoes, totPos = lista.reduce((s, x) => s + x.posicoes * x.qtd, 0), totPeso = lista.reduce((s, x) => s + x.pesoTotal * x.qtd, 0);
    $('ppResumo').innerHTML = [[`Corte ${r.nome || ''}`, `${r.posicoes} posições${r.qtd > 1 ? ` × ${r.qtd}` : ''}`], ['Comprimento × prof. × altura', `${Math.round(d.comprimento)} × ${Math.round(d.profundidade)} × ${d.altura} mm`],
      ['Peso do corte', `${kg(r.pesoTotal)} kg`], ['Projeto', `${proj.cortes.length} corte(s) · ${totPos} posições · ${kg(totPeso)} kg`]].map(([k, v]) => `<div>${esc(k)}<b>${esc(v)}</b></div>`).join('');
    r.modulos.forEach((m, i) => { const el = $(`ppModRes${i}`); if (el) el.innerHTML = `TB ${m.TB} · ${m.L} · ${m.niveis.join('/')}${m.atencao ? ' <b class="pp-nok">⚠</b>' : ''}`; });
    const ok = !r.erros.length && !errosProj.length && !outros.length;
    for (const id of ['ppDxf', 'ppPdf', 'ppXlsx', 'ppBtnBom']) $(id).disabled = !ok;
    $('ppVista').innerHTML = !r.erros.length ? PPDesenho.svg(r, vista) : '<p class="nota">Corrija os erros para ver o desenho.</p>';
    let grupo = '', html = '<table><thead><tr><th>Código</th><th>Descrição</th><th class="n">Qtd</th><th class="n">Compr.</th><th class="n">Peso unit.</th><th class="n">Peso total</th><th>Obs.</th></tr></thead><tbody>';
    for (const p of r.pecas) {
      if (p.grupo !== grupo) { grupo = p.grupo; html += `<tr class="grp"><td colspan="7">${esc(grupo)}</td></tr>`; }
      html += `<tr${p.atencao ? ' class="atencao"' : ''}><td>${esc(p.codigo)}</td><td>${esc(p.desc)}</td><td class="n">${p.qtd}</td><td class="n">${p.compr == null ? '' : Math.round(p.compr * 10) / 10}</td><td class="n">${kg(p.pesoUnit)}</td><td class="n">${kg(p.pesoTotal)}</td><td>${esc(p.obs)}</td></tr>`;
    }
    $('ppBom').innerHTML = `<p class="nota">Corte ${esc(r.nome)} – quantidades de 1 bloco${r.qtd > 1 ? ` (o projeto tem ${r.qtd} blocos iguais; a lista em Excel já multiplica)` : ''}.</p>` + html + `</tbody><tfoot><tr><td colspan="5">Total do corte (itens com peso)</td><td class="n">${kg(r.pesoTotal)}</td><td></td></tr></tfoot></table>`;
    painelLongarina(r); painelColuna(r); renderColunas(r);
  }

  // "Calcular longarina": por módulo, todos os perfis da F 237 no comprimento do módulo, com o escolhido marcado
  function painelLongarina(r) {
    const blocos = r.modulos.map((md, i) => {
      const linhas = PPLongarina.PERFIS.map((p) => {
        const cap = PPLongarina.capacidade(p, md.L), ok = cap != null && cap >= md.cargaPar, peso = p.kgm * md.L / 1000 + 2 * p.garra.kg;
        return `<tr${p.id === md.perfil ? ' class="sel"' : ''}><td>TB ${p.h} #${p.esp.toFixed(2).replace('.', ',')}${p.id === md.auto ? ' (automático)' : ''}</td><td class="n">${fmtKg(cap)}</td><td class="${cap == null ? '' : ok ? 'pp-ok' : 'pp-nok'}">${cap == null ? 'sem tabela' : ok ? 'atende' : 'não atende'}</td><td class="n">${kg(peso)}</td><td>${p.id === md.perfil ? 'em uso' : `<button type="button" class="mini-btn" data-m="${i}" data-perfil="${p.id}">usar</button>`}</td></tr>`;
      }).join('');
      return `<h4>Módulo ${i + 1}${md.tunel ? ' (túnel)' : ''} – ${md.L} mm, carga no par ${fmtKg(md.cargaPar)} kg (${md.nPal} × ${fmtKg(md.carga)} kg)</h4>
        <table><thead><tr><th>Perfil</th><th class="n">Capacidade (kg/par)</th><th>Situação</th><th class="n">Peso (kg/un.)</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`;
    }).join('');
    $('ppPainelLong').innerHTML = `<h3>Longarinas – corte ${esc(r.nome)}</h3><p class="nota">F 237 rev.006 – carga admissível no par, flecha &lt; L/200 (NBR 17150 / NBR 15524 / NBR 14762). Comprimento intermediário usa o tabelado maior seguinte.</p>${blocos}`;
    $('ppPainelLong').querySelectorAll('button[data-perfil]').forEach((b) => b.addEventListener('click', () => { C().modulos[Number(b.dataset.m)].perfilLongarina = b.dataset.perfil; formCorte(); mudou(); }));
  }
  // "Calcular colunas": F 382 – cada linha de colunas com a carga dos módulos vizinhos e o maior vão entre níveis
  function painelColuna(r) {
    const E = r.entradas, opcoes = Object.keys(PPEngine.F382).filter((k) => k.startsWith(E.col + '#'));
    const linhas = r.verifColunas.map((v) => `<tr><td>Coluna ${v.j + 1}</td><td class="n">${v.colunaH || r.colunasH[v.j]}</td><td class="n">${fmtKg(v.carga)}</td><td class="n">${v.h}${v.hRef && v.hRef !== v.h ? ` (${v.hRef})` : ''}</td>${opcoes.map((o) => {
      const cap = v.hRef ? PPEngine.F382[o][v.hRef] : null, ok = cap != null && v.carga <= cap && !(r.colunasH[v.j] > 12000);
      return `<td class="n ${cap == null ? '' : ok ? 'pp-ok' : 'pp-nok'}${o === v.id ? ' sel' : ''}">${cap == null ? '–' : Math.round(100 * v.carga / cap) + '%'}</td>`; }).join('')}<td>${v.motivo ? `<span class="pp-nok">${esc(v.motivo)}</span>` : ''}</td></tr>`).join('');
    $('ppPainelCol').innerHTML = `<h3>Colunas – corte ${esc(r.nome)} – COL ${E.col} #${E.esp.replace('.', ',')} em uso</h3>
      <p class="nota">F 382 rev.00. Carga em cada coluna = ¼ da carga do par em cada nível dos módulos vizinhos (o palete do chão não carrega a coluna); h = maior distância entre níveis, do piso ao 1º nível e entre níveis (tabela no h imediatamente maior). Uso = carga ÷ capacidade.</p>
      <table><thead><tr><th></th><th class="n">Altura</th><th class="n">Carga (kg)</th><th class="n">h (mm)</th>${opcoes.map((o) => `<th class="n">#${o.split('#')[1]}${o === r.verifColuna.id ? ' (em uso)' : ''}</th>`).join('')}<th></th></tr></thead><tbody>${linhas}</tbody></table>
      <div class="pp-mod-acoes">${opcoes.filter((o) => o !== r.verifColuna.id).map((o) => `<button type="button" class="mini-btn" data-esp="${o.split('#')[1].replace(',', '.')}">Usar #${o.split('#')[1]}</button>`).join('')}</div>
      <p class="nota">Para outro modelo de coluna (80/101/122), troque na caixa "3. Quadro e palete".</p>`;
    $('ppPainelCol').querySelectorAll('button[data-esp]').forEach((b) => b.addEventListener('click', () => { const e = b.dataset.esp; C().espessura = e.endsWith('.0') || e.includes('.') ? e : e + '.0'; formCorte(); mudou(); }));
  }
  const abrir = (id) => { $(id).classList.remove('hidden'); $(id).scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  // ---------- saídas ----------
  const maius = (id) => String($(id).value || '').trim().toUpperCase();
  const nomeArq = () => ($('ppProjeto').value || 'porta-palete').replace(/[^\w-]+/g, '_');
  function dadosFolhas() {
    const hoje = new Date().toLocaleDateString('pt-BR'), rev = ($('ppRevisao').value || 'REV.00').replace('.', '-'), totPos = lista.reduce((s, x) => s + x.posicoes * x.qtd, 0);
    const pals = []; for (const x of lista) for (const m of x.modulos) { const k = [m.frente, x.entradas.profPal, m.hp, m.carga].join('|'); if (!pals.some((p) => p.k === k)) pals.push({ k, modelo: `P${String(pals.length + 1).padStart(2, '0')}`, larg: m.frente, prof: x.entradas.profPal, alt: m.hp, peso: m.carga }); }
    return lista.map((r, i) => ({ cliente: maius('ppCliente'), cidade: maius('ppCidade'), uf: maius('ppUf'), representante: '', rt: '', desenhista: maius('ppDesenhista'), processo: maius('ppProjeto'), revisao: rev, data: hoje, folha: `${i + 1}/${lista.length}`,
      rev: { num: rev.replace(/^REV-?/, ''), por: maius('ppDesenhista'), data: hoje, alteracao: 'EMISSÃO INICIAL' }, capTotal: `${totPos} PALLETS`, rascunho: true, paletes: pals.slice(0, 2),
      descricao: { bloco: `CORTE ${r.nome}${r.qtd > 1 ? ` (x${r.qtd})` : ''}`, dims: `${Math.round(r.dimensoes.comprimento)}/${Math.round(r.dimensoes.profundidade)}/${r.dimensoes.altura}`, empilhamento: `${r.modulos.length} MÓDULOS`,
        carga: `${Math.max(...r.modulos.map((m) => m.carga))} KG`, porRua: `${r.posicoes} PALLETS`, ruas: `${r.entradas.fileiras} FILEIRA(S)`, total: `${r.posicoes * r.qtd} PALLETS` } }));
  }
  const baixar = (nome, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); };
  function excel() {
    const B = (v) => ({ v, b: true }), cab = ['Grupo', 'Código', 'Descrição', 'Qtd', 'Compr. (mm)', 'Peso unit. (kg)', 'Peso total (kg)', 'Obs.'].map(B);
    const topo = (t) => [[{ v: `PaletCad – Porta-Palete – ${t}`, fmt: 'tit' }], [{ v: `Projeto ${$('ppProjeto').value || '—'} · ${$('ppCliente').value || '—'} · ${$('ppRevisao').value} · ${new Date().toLocaleDateString('pt-BR')}`, fmt: 'sub' }], [],
      [B('RASCUNHO – NÃO EMITIDO')], [B(PPEngine.AVISO_ESTRUTURAL)], [PPEngine.NOTA_RESPONSABILIDADE], []];
    const linha = (p, q) => [p.grupo, p.codigo, p.desc, { v: q, fmt: 'int' }, p.compr == null ? '' : Math.round(p.compr * 10) / 10, p.pesoUnit == null ? '' : { v: p.pesoUnit, fmt: 'kg' }, p.pesoUnit == null ? '' : { v: p.pesoUnit * q, fmt: 'kg' }, (p.atencao ? '⚠ ' : '') + p.obs];
    // consolidado: soma os cortes × blocos iguais
    const cons = [];
    for (const r of lista) for (const p of r.pecas) { const k = [p.grupo, p.codigo, p.desc, p.compr].join('|'), ex = cons.find((x) => x.k === k); if (ex) { ex.q += p.qtd * r.qtd; ex.cortes.add(r.nome); } else cons.push({ k, p, q: p.qtd * r.qtd, cortes: new Set([r.nome]) }); }
    const pesoT = cons.reduce((s, x) => s + (x.p.pesoUnit || 0) * x.q, 0);
    const folhas = [{ nome: 'Projeto', larguras: [24, 13, 60, 9, 12, 14, 15, 50], linhas: [...topo('Lista de materiais do projeto'), [B('Cortes'), lista.map((r) => `${r.nome} x${r.qtd}`).join(' · ')], [], cab,
      ...cons.map((x) => { const l = linha(x.p, x.q); l[7] = `${[...x.cortes].join(', ')}${x.p.atencao ? ' ⚠' : ''}`; return l; }), [], [B('TOTAL DO PROJETO (itens com peso)'), '', '', '', '', '', { v: pesoT, fmt: 'kg' }]] }];
    for (const r of lista) folhas.push({ nome: `Corte ${r.nome}`.slice(0, 31), larguras: [24, 13, 60, 9, 12, 14, 15, 50], linhas: [...topo(`Corte ${r.nome}`), [B(`CORTE ${r.nome}`), `${r.qtd} bloco(s) igual(is) — quantidades por bloco`], ...r.alertas.map((a) => [a]), [], cab,
      ...r.pecas.map((p) => linha(p, p.qtd)), [], [B('TOTAL DO CORTE (1 bloco)'), '', '', '', '', '', { v: r.pesoTotal, fmt: 'kg' }]] });
    baixar(`lista-pecas-${nomeArq()}-PP_RASCUNHO.xlsx`, Planilha.gerar(folhas));
  }

  function init() {
    if (!$('paginaPP')) return;
    let d = null; try { d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { /* ignora */ }
    if (!carregar(d)) $('ppRevisao').value = $('ppRevisao').value || 'REV.00';
    for (const k of CAB) $(k).addEventListener('input', guardar);
    renderCortes(); formCorte();
    $('ppNovoCorte').addEventListener('click', () => { proj.cortes.push(novoCorte(String.fromCharCode(65 + proj.cortes.length))); proj.atual = proj.cortes.length - 1; renderCortes(); formCorte(); mudou(); $('cNome').focus(); });
    $('ppDupCorte').addEventListener('click', () => { const c = JSON.parse(JSON.stringify(C())); c.nome = ''; proj.cortes.push(c); proj.atual = proj.cortes.length - 1; renderCortes(); formCorte(); mudou(); $('cNome').focus(); });
    $('ppRemCorte').addEventListener('click', () => { if (proj.cortes.length < 2 || !confirm(`Remover o corte ${C().nome || ''}?`)) return; proj.cortes.splice(proj.atual, 1); proj.atual = Math.max(0, proj.atual - 1); renderCortes(); formCorte(); mudou(); });
    $('ppSalvar').addEventListener('click', () => { guardar(); baixar(`${nomeArq()}_${($('ppRevisao').value || 'REV.00')}.pp.json`, new Blob([JSON.stringify({ tipo: 'porta-palete', versao: 1, ...proj }, null, 1)], { type: 'application/json' })); });
    $('ppAbrir').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { if (!carregar(JSON.parse(await f.text()))) throw new Error('arquivo sem cortes'); renderCortes(); formCorte(); mudou(); } catch (err) { alert('Não foi possível abrir: ' + err.message); }
    });
    document.querySelectorAll('.pp-abas button[data-v]').forEach((b) => b.addEventListener('click', () => {
      vista = b.dataset.v; document.querySelectorAll('.pp-abas button[data-v]').forEach((x) => x.classList.toggle('ativo', x === b)); render();
    }));
    $('ppBtnLong').addEventListener('click', () => { render(); abrir('ppPainelLong'); });
    $('ppBtnCol').addEventListener('click', () => { render(); abrir('ppPainelCol'); });
    $('ppBtnBom').addEventListener('click', () => { render(); abrir('ppBomCard'); });
    // fora do Emitir (que o PP ainda não tem), DXF, PDF e lista saem como RASCUNHO, igual ao Drive-In
    $('ppDxf').addEventListener('click', () => { if (lista.length) baixar(`${nomeArq()}-PP-projeto_RASCUNHO.dxf`, new Blob([PPDesenho.dxfProjeto(lista, dadosFolhas())], { type: 'application/dxf' })); });
    $('ppPdf').addEventListener('click', () => {
      if (!lista.length) return;
      if (!(window.DesenhoPdf && window.jspdf)) { alert('Biblioteca de PDF não carregada (pasta lib/).'); return; }
      try { DesenhoPdf.gerar(PPDesenho.projeto(lista, dadosFolhas()), `${nomeArq()}-PP-projeto_RASCUNHO.pdf`); } catch (e) { alert('Não foi possível gerar o PDF: ' + e.message); }
    });
    $('ppXlsx').addEventListener('click', () => { if (lista.length) excel(); });
  }
  window.PPApp = { render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
