// Tela do Porta-Palete: lê o formulário, calcula (pp_engine.js), mostra vistas e lista de peças e gera DXF, PDF e Excel.
// Os dados da tela ficam no navegador (localStorage) até o projeto PP ganhar arquivo próprio.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kg = (v) => v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const CAMPOS = ['ppCliente', 'ppProjeto', 'ppCidade', 'ppUf', 'ppDesenhista', 'ppRevisao', 'ppFrente', 'ppProfPal', 'ppAltPal', 'ppCarga', 'ppPalNivel', 'ppNiveis', 'ppChao', 'ppModulos', 'ppFileiras', 'ppEntre', 'ppPeDireito',
    'ppColuna', 'ppEsp', 'ppProfQ', 'ppModulacao', 'ppEspTrav', 'ppPerfil', 'ppCompL', 'ppAlt1', 'ppAltura'];
  const CHAVE = 'paletcad_pp_tela';
  let vista = 'frontal', ultimo = null;

  const ler = () => {
    const v = (id) => $(id).value;
    return { frentePalete: v('ppFrente'), profPalete: v('ppProfPal'), alturaPalete: v('ppAltPal'), cargaPalete: v('ppCarga'), paletesNivel: v('ppPalNivel'), niveis: v('ppNiveis'), paleteChao: $('ppChao').checked,
      modulos: v('ppModulos'), fileiras: v('ppFileiras'), entreFileiras: v('ppEntre'), peDireito: v('ppPeDireito'), coluna: v('ppColuna'), espessura: v('ppEsp'), profQuadro: v('ppProfQ'), modulacao: v('ppModulacao'),
      espTrav: v('ppEspTrav'), perfilLongarina: v('ppPerfil'), compLongarina: v('ppCompL'), alt1Nivel: v('ppAlt1'), alturaManual: v('ppAltura') };
  };
  const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries(CAMPOS.map((k) => [k, $(k).type === 'checkbox' ? $(k).checked : $(k).value])))); } catch (e) { /* sem armazenamento */ } };
  const restaurar = () => { try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d) for (const k of CAMPOS) if (k in d && $(k)) { if ($(k).type === 'checkbox') $(k).checked = !!d[k]; else $(k).value = d[k]; } } catch (e) { /* ignora */ } };

  function calcular() { return PPEngine.calcular(ler(), window.CATALOGO); }

  function render() {
    let r;
    try { r = calcular(); } catch (e) { $('ppMsgs').innerHTML = `<div class="pp-msg pp-erro">Erro no cálculo: ${esc(e.message)}</div>`; return; }
    ultimo = r;
    $('ppMsgs').innerHTML = r.erros.map((m) => `<div class="pp-msg pp-erro">${esc(m)}</div>`).join('') + r.alertas.map((m) => `<div class="pp-msg pp-alerta">${esc(m)}</div>`).join('');
    const Lg = r.longarina, d = r.dimensoes;
    $('ppResumo').innerHTML = [['Posições', r.posicoes], ['Comprimento × prof. × altura', `${Math.round(d.comprimento)} × ${Math.round(d.profundidade)} × ${d.altura} mm`],
      ['Longarina', `TB ${Lg.TB} · ${Lg.L} mm · ${Lg.capacidade != null ? Lg.capacidade.toLocaleString('pt-BR') + ' kg/par' : 'sem capacidade tabelada'}`], ['Carga no par', `${Lg.cargaPar.toLocaleString('pt-BR')} kg`],
      ['Níveis (apoio)', r.niveis.join(' · ') + ' mm'], ['Peso total', `${kg(r.pesoTotal)} kg`]].map(([k, v]) => `<div>${esc(k)}<b>${esc(v)}</b></div>`).join('');
    const ok = !r.erros.length;
    for (const id of ['ppDxf', 'ppPdf', 'ppXlsx']) $(id).disabled = !ok;
    $('ppVista').innerHTML = ok ? PPDesenho.svg(r, vista) : '<p class="nota">Corrija os erros para ver o desenho.</p>';
    let grupo = '', html = '<table><thead><tr><th>Código</th><th>Descrição</th><th class="n">Qtd</th><th class="n">Compr.</th><th class="n">Peso unit.</th><th class="n">Peso total</th><th>Obs.</th></tr></thead><tbody>';
    for (const p of r.pecas) {
      if (p.grupo !== grupo) { grupo = p.grupo; html += `<tr class="grp"><td colspan="7">${esc(grupo)}</td></tr>`; }
      html += `<tr${p.atencao ? ' class="atencao"' : ''}><td>${esc(p.codigo)}</td><td>${esc(p.desc)}</td><td class="n">${p.qtd}</td><td class="n">${p.compr == null ? '' : Math.round(p.compr * 10) / 10}</td><td class="n">${kg(p.pesoUnit)}</td><td class="n">${kg(p.pesoTotal)}</td><td>${esc(p.obs)}</td></tr>`;
    }
    $('ppBom').innerHTML = html + `</tbody><tfoot><tr><td colspan="5">Total (itens com peso)</td><td class="n">${kg(r.pesoTotal)}</td><td></td></tr></tfoot></table>`;
  }

  const maius = (id) => String($(id).value || '').trim().toUpperCase();
  const nomeArq = () => ($('ppProjeto').value || 'porta-palete').replace(/[^\w-]+/g, '_');
  function dadosFolha(r) {
    const hoje = new Date().toLocaleDateString('pt-BR'), rev = ($('ppRevisao').value || 'REV.00').replace('.', '-'), E = r.entradas;
    return { cliente: maius('ppCliente'), cidade: maius('ppCidade'), uf: maius('ppUf'), representante: '', rt: '', desenhista: maius('ppDesenhista'), processo: maius('ppProjeto'), revisao: rev, data: hoje, folha: '1/1',
      rev: { num: rev.replace(/^REV-?/, ''), por: maius('ppDesenhista'), data: hoje, alteracao: 'EMISSÃO INICIAL' }, capTotal: `${r.posicoes} PALLETS`, rascunho: true,
      paletes: [{ modelo: 'P01', larg: E.frente, prof: E.profPal, alt: E.hp, peso: E.carga }],
      descricao: { bloco: 'PORTA-PALETE', dims: `${Math.round(r.dimensoes.comprimento)}/${Math.round(r.dimensoes.profundidade)}/${r.dimensoes.altura}`, empilhamento: `${E.chao ? 'PISO+' : ''}${String(r.niveis.length).padStart(2, '0')} NÍVEIS`,
        carga: `${E.carga} KG`, porRua: `${E.nPal} PAL/NÍVEL`, ruas: `${E.modulos} MÓD x ${E.fileiras}`, total: `${r.posicoes} PALLETS` } };
  }
  const baixar = (nome, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); };

  function init() {
    if (!$('paginaPP')) return;
    restaurar();
    for (const k of CAMPOS) $(k).addEventListener($(k).tagName === 'SELECT' || $(k).type === 'checkbox' ? 'change' : 'input', () => { guardar(); render(); });
    document.querySelectorAll('.pp-abas button[data-v]').forEach((b) => b.addEventListener('click', () => {
      vista = b.dataset.v; document.querySelectorAll('.pp-abas button[data-v]').forEach((x) => x.classList.toggle('ativo', x === b)); render();
    }));
    // fora do Emitir (que o PP ainda não tem), DXF, PDF e lista saem como RASCUNHO, igual ao Drive-In
    $('ppDxf').addEventListener('click', () => { if (!ultimo) return; baixar(`${nomeArq()}-PP-projeto_RASCUNHO.dxf`, new Blob([PPDesenho.dxf(ultimo, 'A', dadosFolha(ultimo))], { type: 'application/dxf' })); });
    $('ppPdf').addEventListener('click', () => {
      if (!ultimo) return;
      if (!(window.DesenhoPdf && window.jspdf)) { alert('Biblioteca de PDF não carregada (pasta lib/).'); return; }
      try { DesenhoPdf.gerar(PPDesenho.modelo(ultimo, 'A', dadosFolha(ultimo)), `${nomeArq()}-PP-projeto_RASCUNHO.pdf`); } catch (e) { alert('Não foi possível gerar o PDF: ' + e.message); }
    });
    $('ppXlsx').addEventListener('click', () => {
      if (!ultimo) return;
      const B = (v) => ({ v, b: true }), r = ultimo;
      const linhas = [[{ v: 'PaletCad – Porta-Palete – Lista de materiais', fmt: 'tit' }], [{ v: `Projeto ${$('ppProjeto').value || '—'} · ${$('ppCliente').value || '—'} · ${$('ppRevisao').value} · ${new Date().toLocaleDateString('pt-BR')}`, fmt: 'sub' }], [],
        [B('RASCUNHO – NÃO EMITIDO')], [B(PPEngine.AVISO_ESTRUTURAL)], [PPEngine.NOTA_RESPONSABILIDADE], ...r.alertas.map((a) => [a]), [],
        ['Grupo', 'Código', 'Descrição', 'Qtd', 'Compr. (mm)', 'Peso unit. (kg)', 'Peso total (kg)', 'Obs.'].map(B),
        ...r.pecas.map((p) => [p.grupo, p.codigo, p.desc, { v: p.qtd, fmt: 'int' }, p.compr == null ? '' : Math.round(p.compr * 10) / 10, p.pesoUnit == null ? '' : { v: p.pesoUnit, fmt: 'kg' }, p.pesoTotal == null ? '' : { v: p.pesoTotal, fmt: 'kg' }, (p.atencao ? '⚠ ' : '') + p.obs]),
        [], [B('TOTAL (itens com peso)'), '', '', '', '', '', { v: r.pesoTotal, fmt: 'kg' }]];
      baixar(`lista-pecas-${nomeArq()}-PP_RASCUNHO.xlsx`, Planilha.gerar([{ nome: 'Porta-Palete', larguras: [24, 13, 60, 9, 12, 14, 15, 50], linhas }]));
    });
  }
  window.PPApp = { render, calcular };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
