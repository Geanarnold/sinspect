# Extrai a folha padrão (folha/FOLHA_A0_SUPRA.dxf, formato A0 em mm de papel) para app/folha.js:
# geometria (linhas, polilinhas, arcos achatados, hachuras sólidas → triângulos), textos fixos e a posição de cada campo
# (atributos dos blocos CABEÇALHO, Bloco Revisões de Projeto, CAPCIDADE TOTAL, Bloco 01 Pallet, Bloco Descrição Drive In),
# que o app preenche com os dados do projeto. Uso: python3 extrair_folha.py
import ezdxf, json, os, math
from ezdxf import bbox, path as zpath
from ezdxf.math.triangulation import mapbox_earcut_2d
from ezdxf.math import Vec2
os.chdir(os.path.dirname(os.path.abspath(__file__)))
d = ezdxf.readfile('folha/FOLHA_A0_SUPRA.dxf'); msp = d.modelspace()
# MTEXT → TEXT com quebra de linha e alinhamento calculados pelo ezdxf (MTextExplode), no modelspace e dentro dos blocos
from ezdxf.addons import MTextExplode
for lay in [msp] + [b for b in d.blocks if not b.name.startswith('*Model') and not b.name.startswith('*Paper')]:
    mts = list(lay.query('MTEXT'))
    if mts:
        with MTextExplode(lay) as xpl:
            for mt in mts: xpl.explode(mt)
REMOVER_TEXTOS = ('PLANTA BAIXA', 'CORTES - ESCALA')   # títulos de exemplo: o app escreve os títulos das vistas com a escala
CAMPOS_BLOCOS = {'CABEÇALHO', 'Bloco Revisões de Projeto', 'CAPCIDADE TOTAL', 'Bloco 01 Pallet', 'Bloco Descrição Drive In'}
prims, textos, campos = [], [], []
def aci(e, herdado=7):
    c = e.dxf.get('color', 256)
    if c == 256:
        try: c = d.layers.get(e.dxf.layer).dxf.color
        except Exception: c = 7
    if c == 0: c = herdado
    return abs(c) if c else 7
def camada(c):
    return {30: 'FOLHA_LOGO', 1: 'FOLHA_NOTA', 2: 'FOLHA'}.get(c, 'FOLHA_LINHA' if c in (7, 8, 250, 251, 252, 253, 254, 255) else ('FOLHA_LOGO' if c in range(10, 40) else 'FOLHA'))
R = lambda v: round(v, 2)
def pts_poly(p): return [[R(v.x), R(v.y)] for v in p]
def add_texto(s, x, y, h, rot, hj, vj, cor):
    s = s.strip()
    if not s or any(s.startswith(k) for k in REMOVER_TEXTOS): return
    textos.append({'s': s, 'x': R(x), 'y': R(y), 'h': R(h), 'rot': R(rot), 'j': hj, 'v': vj, 'l': camada(cor)})
def visita(ents, herdado=7, bloco_pai=None):
    for e in ents:
        if e.dxf.get('invisible', 0): continue  # bloco dinâmico: entidade de outro estado de visibilidade (oculta no AutoCAD)
        t = e.dxftype(); c = aci(e, herdado)
        if t == 'INSERT':
            nome = e.dxf.name; ci = aci(e, herdado)
            for a in e.attribs:  # atributos = campos a preencher
                al = a.dxf.get('halign', 0); va = a.dxf.get('valign', 0)
                p = a.dxf.align_point if (al or va) and a.dxf.hasattr('align_point') else a.dxf.insert
                campos.append({'bloco': nome, 'tag': a.dxf.tag, 'exemplo': a.dxf.text, 'x': R(p.x), 'y': R(p.y), 'h': R(a.dxf.height), 'rot': R(a.dxf.get('rotation', 0)), 'j': min(al, 2) if al in (0, 1, 2) else 1, 'v': va, 'l': camada(aci(a, ci))})
            visita(list(e.virtual_entities()), ci, nome)
        elif t == 'LINE': prims.append({'t': 'p', 'l': camada(c), 'p': [[R(e.dxf.start.x), R(e.dxf.start.y)], [R(e.dxf.end.x), R(e.dxf.end.y)]]})
        elif t in ('LWPOLYLINE', 'POLYLINE', 'ARC', 'CIRCLE', 'ELLIPSE', 'SPLINE'):
            try: p = zpath.make_path(e); pts = pts_poly(p.flattening(0.05))
            except Exception: continue
            if len(pts) >= 2: prims.append({'t': 'p', 'l': camada(c), 'p': pts})
        elif t == 'HATCH':
            if not e.dxf.solid_fill: continue
            ps = [[Vec2(v) for v in pth.flattening(0.05)] for pth in zpath.from_hatch(e)]
            ps = [q for q in ps if len(q) >= 3]
            if not ps: continue
            # várias regiões (letras do logo): profundidade de aninhamento par = contorno externo, ímpar = furo do externo que o contém
            def dentro(pt, q):
                x, y, ins = pt.x, pt.y, False
                for i in range(len(q)):
                    a1, b1 = q[i - 1], q[i]
                    if (a1.y > y) != (b1.y > y) and x < (b1.x - a1.x) * (y - a1.y) / (b1.y - a1.y) + a1.x: ins = not ins
                return ins
            prof = [sum(1 for j, q in enumerate(ps) if j != i and dentro(ps[i][0], q)) for i in range(len(ps))]
            for i, q in enumerate(ps):
                if prof[i] % 2: continue
                furos = [ps[j] for j in range(len(ps)) if prof[j] == prof[i] + 1 and dentro(ps[j][0], q)]
                for tri in mapbox_earcut_2d(q, furos):
                    a, b, cc = [[R(v.x), R(v.y)] for v in tri]
                    prims.append({'t': 's', 'l': camada(c), 'p': [a, b, cc, cc]})
        elif t == 'TEXT':
            al = e.dxf.get('halign', 0); va = e.dxf.get('valign', 0)
            p = e.dxf.align_point if (al or va) and e.dxf.hasattr('align_point') else e.dxf.insert
            add_texto(e.dxf.text, p.x, p.y, e.dxf.height, e.dxf.get('rotation', 0), min(al, 2) if al in (0, 1, 2) else 1, va, c)
        elif t == 'MTEXT':
            linhas = e.plain_text(split=True); h = e.dxf.char_height; att = e.dxf.get('attachment_point', 1)
            hj = (att - 1) % 3; vrow = (att - 1) // 3  # 0 topo, 1 meio, 2 base
            ins = e.dxf.insert; passo = h * 1.667 * e.dxf.get('line_spacing_factor', 1)
            n = len(linhas); y0 = ins.y - h if vrow == 0 else ins.y + (n - 1) * passo / 2 - h / 2 if vrow == 1 else ins.y + (n - 1) * passo
            w = e.dxf.get('width', 0) or 0
            x = ins.x
            for k, s in enumerate(linhas): add_texto(s, x, y0 - k * passo, h, e.dxf.get('rotation', 0), hj, 0, c)
visita(list(msp))
fmt = next(e for e in msp if e.dxftype() == 'INSERT' and e.dxf.name.startswith('FORMATO'))
bf = bbox.extents(fmt.virtual_entities())
cab = next(e for e in msp if e.dxftype() == 'INSERT' and e.dxf.name == 'CABEÇALHO')
bc = bbox.extents(cab.virtual_entities())
out = {'origem': 'folha/FOLHA_A0_SUPRA.dxf', 'formato': 'A0', 'borda': [R(bf.extmin.x), R(bf.extmin.y), R(bf.extmax.x), R(bf.extmax.y)], 'carimbo_x': R(bc.extmin.x), 'prims': prims, 'textos': textos, 'campos': campos}
open('app/folha.js', 'w', encoding='utf-8').write('// Folha padrão A0 da Supra (extrair_folha.py). Coordenadas em mm de papel; o app escala pela escala do desenho.\nwindow.FOLHA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('prims', len(prims), 'textos', len(textos), 'campos', len(campos), 'borda', out['borda'], 'carimbo_x', out['carimbo_x'], 'kb', os.path.getsize('app/folha.js') // 1024)
for cpo in campos: print(' ', cpo['bloco'], '|', cpo['tag'], '|', cpo['exemplo'], '|', cpo['x'], cpo['y'], cpo['h'], 'j', cpo['j'], 'v', cpo['v'])
