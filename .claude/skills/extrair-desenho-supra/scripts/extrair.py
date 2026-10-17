#!/usr/bin/env python3
"""Extrai os dados do carimbo e da lista de componentes de desenhos SUPRA / Metalúrgica Amapá (PDF do SolidWorks)
e compara com o catálogo do PaletCad (drive-in/app/catalogo.js).

Uso:
  python3 -I extrair.py desenho1.pdf [desenho2.pdf ...] [--catalogo drive-in/app/catalogo.js] [--json saida.json] [--png pasta]

Saída: relatório em Markdown no stdout (uma seção por folha + divergências) e, com --json, os dados estruturados.
Com --png, salva uma imagem de cada folha (para conferir visualmente o que o texto não trouxe).
"""
import argparse, json, re, sys
from pathlib import Path

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:  # pragma: no cover
    import fitz

COD = r'(?:PK|CO|SA|PA|AC|IN[TD])(?:\d{6}|\d{4}|(?:04)?[X*]{3,6})'
RE_COD = re.compile(rf'\b({COD})\b', re.I)
RE_COD_LINHA = re.compile(rf'^({COD})$', re.I)
RE_DES = re.compile(r'\b(\d{4}\.\d{4}\.\d{2}\.\d{3})\b')
RE_PROJ = re.compile(r'(\d{4}\.\d{4}\.\d{2}\.\d{3})\s*-\s*REV\.?\s*(\d+)', re.I)
RE_PESO = re.compile(r'^([\d.,]+)\s*kg\.?$', re.I)
RE_AREA = re.compile(r'^([\d.,]*)\s*m²$')
RE_FOLHA = re.compile(r'^(\d+)\s*/\s*(\d+)$')
RE_REVH = re.compile(r'^(REV\.\d+):\s*(.*)$')


def num(t):
    t = t.strip()
    if not t:
        return None
    # carimbo do SolidWorks usa ponto decimal ("1.507 kg."); cotas usam vírgula ("1017,8")
    t = t.replace(',', '.') if t.count(',') == 1 and '.' not in t else t
    try:
        return float(t)
    except ValueError:
        return None


def linhas_pagina(p):
    return [l.strip() for l in p.get_text().split('\n') if l.strip()]


def parse_bom(L):
    """Lista de componentes: entre o cabeçalho (Nº … QTD.) e 'MATERIAL:'."""
    try:
        i0 = next(i for i, l in enumerate(L) if l.startswith('QTD')) + 1
    except StopIteration:
        return []
    i1 = next((i for i in range(i0, len(L)) if L[i].startswith('MATERIAL')), len(L))
    seg = L[i0:i1]
    # linha "10 0004.0003.01.001 PA042125" (número + desenho juntos) → separa
    toks = []
    for l in seg:
        m = re.match(r'^(\d{1,2})\s+(\d{4}\.\d{4}\.\d{2}\.\d{3}.*)$', l)
        if m:
            toks += [m.group(1), m.group(2)]
        else:
            toks.append(l)
    rows, n, i = [], 1, 0
    while i < len(toks):
        if toks[i] != str(n):
            i += 1
            continue
        # fim da linha = próximo token igual a n+1 que não seja a quantidade da própria linha
        j = i + 1
        while j < len(toks) and not (toks[j] == str(n + 1) and j + 1 < len(toks) and not re.fullmatch(r'\d+', toks[j + 1])):
            j += 1
        corpo = toks[i + 1:j]
        qtd = None
        if corpo and re.fullmatch(r'\d+', corpo[-1]):
            qtd = int(corpo.pop())
        texto = ' | '.join(corpo)
        des = RE_DES.search(texto)
        cods = RE_COD.findall(texto)
        codigo = cods[0].upper() if cods else None
        desc = [c for c in corpo if c != '-' and not RE_DES.fullmatch(c.split()[0] if c.split() else '') and not RE_COD_LINHA.match(c)]
        desc = ' '.join(desc)
        desc = re.sub(r'^\d{4}\.\d{4}\.\d{2}\.\d{3}\s*', '', desc)
        if codigo:
            desc = re.sub(rf'^{re.escape(codigo)}\s*-?\s*', '', desc, flags=re.I)
        rows.append({'n': n, 'desenho': des.group(1) if des else None, 'codigo': codigo, 'descricao': desc.strip(), 'qtd': qtd})
        n += 1
        i = j
    return rows


def parse_pagina(L):
    d = {'folha': None, 'desenho': None, 'rev': None, 'codigo': None, 'titulo': None, 'peso_kg': None, 'area_m2': None,
         'material': None, 'escala': None, 'projetista': None, 'revisoes': [], 'componentes': [], 'cotas': [], 'avisos': []}
    for l in L:
        m = RE_PROJ.search(l)
        if m and not d['desenho']:
            d['desenho'], d['rev'] = m.group(1), int(m.group(2))
        m = RE_FOLHA.match(l)
        if m and d['folha'] is None and int(m.group(2)) >= int(m.group(1)) and int(m.group(2)) < 100:
            d['folha'] = f'{m.group(1)}/{m.group(2)}'
        if l.startswith('PROJETISTA:'):
            d['projetista'] = l.split(':', 1)[1].strip() or None
        m = RE_REVH.match(l)
        if m and m.group(2).strip():
            d['revisoes'].append(f'{m.group(1)}: {m.group(2).strip()}')
        if re.fullmatch(r'1:\d+', l) and not d['escala']:
            d['escala'] = l
    ip = next((i for i, l in enumerate(L) if RE_PESO.match(l)), None)
    if ip is not None:
        d['peso_kg'] = num(RE_PESO.match(L[ip]).group(1))
        # código do produto desenhado: a linha de código mais próxima ANTES do peso/área (campo CÓD. PRODUTO)
        for k in range(ip - 1, max(ip - 6, -1), -1):
            ma = RE_AREA.match(L[k])
            if ma:
                d['area_m2'] = num(ma.group(1))
                continue
            if RE_COD_LINHA.match(L[k]):
                d['codigo'] = L[k].upper()
                break
            if L[k] == '-':
                d['avisos'].append('campo CÓD. PRODUTO preenchido com "-" no carimbo (desenho genérico, ex.: perfil por altura)')
                break
    else:
        d['avisos'].append('peso em branco no carimbo do desenho (campo PESO sem valor)')
        # sem peso: o código do produto fica logo depois do título/material (antes de "m²"/"kg")
        try:
            it = next(i for i, l in enumerate(L) if l.startswith('CÓDIGO DESEN'))
            for l in L[it + 1:it + 9]:
                if RE_COD_LINHA.match(l):
                    d['codigo'] = l.upper(); break
        except StopIteration:
            pass
    # título do produto: linhas após "CÓDIGO DESEN.:" até a linha do projeto ("dddd… - REV.xx")
    try:
        it = next(i for i, l in enumerate(L) if l.startswith('CÓDIGO DESEN'))
        tit = []
        for l in L[it + 1:it + 5]:
            if RE_PROJ.search(l):
                break
            tit.append(l)
        d['titulo'] = ' '.join(tit) or None
        # material: entre a linha do projeto e o código do produto (ex.: "ACO0557 - CHAPA L Q - 4,75 X 1200 X 3000")
        ipj = next((i for i in range(it, len(L)) if RE_PROJ.search(L[i])), None)
        if ipj is not None:
            for l in L[ipj + 1:ipj + 5]:
                if re.search(r'ACO\d|CHAPA|USI |SLITER|CIVIL|SAE ?\d|Material', l, re.I):
                    d['material'] = None if re.search(r'<n[ãa]o especificado>|<not specified>', l, re.I) else l
                    break
    except StopIteration:
        d['avisos'].append('título (CÓDIGO DESEN.) não encontrado')
    d['componentes'] = parse_bom(L)
    # cotas: números soltos antes da lista (servem para conferir comprimentos)
    for l in L:
        if l.startswith('Nº'):
            break
        v = num(l)
        if v is not None and v > 0:
            d['cotas'].append(v)
    if not any(l.startswith('CÓDIGO DESEN') for l in L) and d['peso_kg'] is None:
        d['avisos'] = ['não parece um desenho de produto SUPRA/Amapá (sem carimbo com CÓDIGO DESEN. e PESO): pular ou ler manualmente']
        d['nao_desenho'] = True
        return d
    if not d['codigo'] and not any('"-"' in a for a in d['avisos']):
        d['avisos'].append('código do produto não encontrado no carimbo: conferir na imagem (--png)')
    elif d['codigo'] and re.search(r'[X*]', d['codigo']):
        d['avisos'].append(f'produto sem cadastro ({d["codigo"]})')
    if d['material'] is None and not d['componentes']:
        d['avisos'].append('peça sem material informado no carimbo')
    return d


# ---------- catálogo do PaletCad ----------
def carregar_catalogo(path):
    t = Path(path).read_text(encoding='utf-8')
    t = t[t.index('{'):t.rindex('}') + 1]
    return json.loads(t)


def indexar(cat):
    """código → lista de ocorrências {onde, peso} em todo o catálogo (produtos, uniao, travessas, colunas_sa…)."""
    idx = {}

    def add(cod, onde, peso):
        if isinstance(cod, str) and RE_COD_LINHA.match(cod.strip()):
            idx.setdefault(cod.strip().upper(), []).append({'onde': onde, 'peso': peso})

    for pid, p in (cat.get('produtos') or {}).items():
        add(p.get('codigo'), f'produtos.{pid}', p.get('peso'))
        for c in RE_COD.findall(p.get('desc') or ''):  # códigos citados na descrição (CO dentro de kit PK, SA de componentes)
            if c.upper() != (p.get('codigo') or '').upper():
                idx.setdefault(c.upper(), []).append({'onde': f'produtos.{pid} (citado na descrição)', 'peso': None})
    for i, u in enumerate(cat.get('uniao') or []):
        for k in ('pk', 'co'):
            add(u.get(k), f'uniao[{i}].{k}', u.get('peso') if k == 'pk' or not u.get('pk') else None)
    for tab in ('travessas', 'diagonais'):
        for i, x in enumerate(cat.get(tab) or []):
            add(x.get('sa'), f'{tab}[{i}]', None)
    for col, m in (cat.get('colunas_sa') or {}).items():
        for alt, sa in m.items():
            add(sa, f'colunas_sa.{col}.{alt}', None)
    return idx


def comparar(fol, idx, tol=0.005):
    div = []
    c, w = fol['codigo'], fol['peso_kg']
    if c and not re.search(r'[X*]', c):
        oc = idx.get(c)
        if not oc:
            div.append(f'**{c}** (produto desta folha) não está no catálogo do app.')
        else:
            pesos = [o for o in oc if o['peso'] is not None]
            for o in pesos:
                if w is not None and abs(float(o['peso']) - w) > tol:
                    div.append(f'**{c}**: peso no desenho {w:.3f} kg × catálogo {float(o["peso"]):.3f} kg ({o["onde"]}).')
            if not pesos:
                div.append(f'{c} está no catálogo só como referência ({", ".join(o["onde"] for o in oc)}), sem peso para comparar.')
    for r in fol['componentes']:
        k = r['codigo']
        if k and not re.search(r'[X*]', k) and k not in idx:
            div.append(f'Componente **{k}** ({r["descricao"][:50]}) não está no catálogo.')
    return div


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdfs', nargs='+')
    ap.add_argument('--catalogo', default=None)
    ap.add_argument('--json', default=None)
    ap.add_argument('--png', default=None)
    a = ap.parse_args()
    cat_path = a.catalogo or next((str(p) for p in [Path('drive-in/app/catalogo.js'), Path(__file__).resolve().parents[4] / 'drive-in/app/catalogo.js'] if p.exists()), None)
    idx = indexar(carregar_catalogo(cat_path)) if cat_path else None
    saida, out = [], []
    for pdf in a.pdfs:
        doc = fitz.open(pdf)
        out.append(f'# {Path(pdf).name}  ({len(doc)} folha(s))\n')
        for i, p in enumerate(doc):
            f = parse_pagina(linhas_pagina(p))
            f['arquivo'], f['pagina'] = Path(pdf).name, i + 1
            if a.png:
                Path(a.png).mkdir(parents=True, exist_ok=True)
                img = Path(a.png) / f'{Path(pdf).stem[:40]}_p{i + 1}.png'
                p.get_pixmap(dpi=110).save(str(img))
                f['imagem'] = str(img)
            f['divergencias'] = comparar(f, idx) if idx is not None else []
            saida.append(f)
            out.append(f"## Folha {f['folha'] or i + 1} — {f['titulo'] or '(sem título)'}")
            out.append(f"- Desenho **{f['desenho'] or '?'} REV.{f['rev'] if f['rev'] is not None else '?'}** · produto **{f['codigo'] or '?'}** · peso **{f['peso_kg'] if f['peso_kg'] is not None else '?'} kg** · área {f['area_m2'] if f['area_m2'] is not None else '–'} m² · escala {f['escala'] or '–'}")
            if f['material']:
                out.append(f"- Material: {f['material']}")
            if f['componentes']:
                out.append('\n| Nº | Desenho | Código | Descrição | Qtd |\n|---|---|---|---|---|')
                for r in f['componentes']:
                    out.append(f"| {r['n']} | {r['desenho'] or '–'} | {r['codigo'] or '?'} | {r['descricao']} | {r['qtd'] if r['qtd'] is not None else '?'} |")
            for av in f['avisos']:
                out.append(f'- ⚠ {av}')
            if idx is not None:
                out.append('- Catálogo: ' + ('confere' if not f['divergencias'] else ''))
                for dv in f['divergencias']:
                    out.append(f'  - {dv}')
            out.append('')
        if doc[0].get_text().count('REV.0') and saida:
            revs = saida[-1]['revisoes']
            if revs:
                out.append('Histórico de revisões: ' + ' · '.join(revs) + '\n')
    print('\n'.join(out))
    if a.json:
        Path(a.json).write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
