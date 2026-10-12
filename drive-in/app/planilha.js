// Gera planilha Excel (.xlsx) sem biblioteca externa: ZIP sem compressão (método "store") com o mínimo do formato OOXML.
// Uso: Planilha.gerar([{ nome: 'Projeto', larguras: [18, 12, ...], linhas: [[...], ...] }, ...]) → Blob
// Célula: número → número no Excel; texto → texto; { v, b: true } → negrito; { v, fmt: 'kg' | 'brl' | 'int' } → formato numérico.
(function () {
  'use strict';
  const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const enc = new TextEncoder();
  // CRC-32 (o ZIP exige)
  const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(arquivos) { // [{ nome, dados: Uint8Array }]
    const partes = [], central = []; let off = 0;
    const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff], u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
    for (const a of arquivos) {
      const nome = enc.encode(a.nome), crc = crc32(a.dados), n = a.dados.length;
      const loc = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(n), ...u32(n), ...u16(nome.length), ...u16(0)]);
      partes.push(loc, nome, a.dados);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(n), ...u32(n), ...u16(nome.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nome);
      off += loc.length + nome.length + n;
    }
    const tamC = central.reduce((s, b) => s + b.length, 0);
    const fim = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(arquivos.length), ...u16(arquivos.length), ...u32(tamC), ...u32(off), ...u16(0)]);
    return new Blob([...partes, ...central, fim], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const colL = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  // estilos: 0 normal, 1 negrito, 2 kg (0,000), 3 R$ (#.##0,00), 4 inteiro (#.##0), 5 R$ unitário (0,0000), 6 negrito R$
  const ESTILO = { b: 1, kg: 2, brl: 3, int: 4, brl4: 5, bbrl: 6, tit: 7, sub: 8 };
  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="4"><numFmt numFmtId="164" formatCode="0.000"/><numFmt numFmtId="165" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="166" formatCode="#,##0"/><numFmt numFmtId="167" formatCode="&quot;R$&quot; #,##0.0000"/></numFmts>'
    + '<fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF0F172A"/><name val="Arial"/></font><font><sz val="9"/><color rgb="FF64748B"/><name val="Arial"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/>'
    + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="167" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="165" fontId="1" fillId="0" borderId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function folha(f) {
    const cols = (f.larguras || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    const linhas = f.linhas.map((ln, r) => `<row r="${r + 1}">` + ln.map((c, i) => {
      if (c == null || c === '') return '';
      const o = typeof c === 'object' ? c : { v: c }, ref = colL(i) + (r + 1), s = o.fmt ? ESTILO[o.fmt] : o.b ? 1 : 0;
      if (typeof o.v === 'number' && isFinite(o.v)) return `<c r="${ref}"${s ? ` s="${s}"` : ''}><v>${o.v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t xml:space="preserve">${xml(o.v)}</t></is></c>`;
    }).join('') + '</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + (f.congelar ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${f.congelar}" topLeftCell="A${f.congelar + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '')
      + (cols ? `<cols>${cols}</cols>` : '') + `<sheetData>${linhas}</sheetData></worksheet>`;
  }
  function gerar(folhas) {
    const nomes = []; for (const f of folhas) { let n = String(f.nome).replace(/[\[\]:*?/\\]/g, '-').slice(0, 31) || 'Planilha', k = 2; const base = n; while (nomes.includes(n)) n = (base.slice(0, 28) + ' ' + k++); nomes.push(n); }
    const arq = [
      { nome: '[Content_Types].xml', txt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>' },
      { nome: '_rels/.rels', txt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { nome: 'xl/workbook.xml', txt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + nomes.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>' },
      { nome: 'xl/_rels/workbook.xml.rels', txt: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${folhas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { nome: 'xl/styles.xml', txt: STYLES },
      ...folhas.map((f, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, txt: folha(f) })),
    ];
    return zip(arq.map((a) => ({ nome: a.nome, dados: enc.encode(a.txt) })));
  }
  const api = { gerar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Planilha = api;
})();
