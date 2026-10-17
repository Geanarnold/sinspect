"""Gera drive-in/app/blocos_pp.js a partir dos DXF de longarina (vista frontal) em porta-palete/blocos_dxf/.
Uso: python3 porta-palete/extrair_blocos_pp.py [caminho/LONGARINAS.dxf]
Cada bloco: polilinhas [{t:'p', l:'0', p:[[x,y],...]}] com origem no canto esquerdo externo da garra (x = 0)
e y = 0 no topo do perfil (apoio do palete). Linhas repetidas (o SolidWorks exporta arestas sobrepostas) são removidas."""
import ezdxf, json, os
from ezdxf import path as ezpath
AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = {'PP_LONG_TB80_FR': 'PP_LONGARINA_CO040012_TB80_FRONTAL.dxf', 'PP_LONG_TB110_FR': 'PP_LONGARINA_CO040015_TB110_FRONTAL.dxf'}
out = {}
for nome, arq in FONTES.items():
    msp = ezdxf.readfile(os.path.join(AQUI, 'blocos_dxf', arq)).modelspace()
    polis = []
    for e in msp:
        if e.dxftype() == 'LINE':
            polis.append([(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)])
        elif e.dxftype() in ('ARC', 'SPLINE', 'LWPOLYLINE', 'POLYLINE', 'CIRCLE'):
            polis.append([(v.x, v.y) for v in ezpath.make_path(e).flattening(0.2)])
    xs = [x for p in polis for x, _ in p]
    longas = [p for p in polis if len(p) == 2 and abs(p[0][1] - p[1][1]) < 0.01 and abs(p[0][0] - p[1][0]) > 1000]
    x0, y0 = min(xs), max(p[0][1] for p in longas)
    vistos, prims = set(), []
    for p in polis:
        q = [(round(x - x0, 1), round(y - y0, 1)) for x, y in p]
        k = tuple(q) if q[0] <= q[-1] else tuple(reversed(q))
        if k in vistos or len(q) < 2: continue
        vistos.add(k); prims.append({'t': 'p', 'l': '0', 'p': [list(v) for v in q]})
    out[nome] = prims
    print(nome, len(polis), '→', len(prims), 'polilinhas; largura', round(max(xs) - x0, 1))
# biblioteca de longarinas da SUPRA (LONGARINAS.dxf, vista frontal, blocos LGTB_80…150): tubo de 0 a TB (altura cheia), garra de
# −35 a 115 (TB 80) ou 215 (demais), chapa da garra de ±596,5 a ±600,1 e dentes até ±624,4 → comprimento nominal 1200,2 mm.
# Normaliza para x = 0 na face externa da garra esquerda (= face da coluna) e y = 0 no topo do tubo (apoio).
import sys
LIB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'blocos_dxf', 'LONGARINAS.dxf')
if os.path.exists(LIB):
    doc = ezdxf.readfile(LIB)
    for tb in (80, 90, 100, 110, 130, 150):
        b = doc.blocks.get(f'LGTB_{tb}')
        if b is None: continue
        polis = []
        for e in b:
            if e.dxftype() == 'LINE': polis.append([(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)])
            elif e.dxftype() in ('ARC', 'SPLINE', 'LWPOLYLINE', 'POLYLINE', 'CIRCLE'): polis.append([(v.x, v.y) for v in ezpath.make_path(e).flattening(0.2)])
        vistos, prims = set(), []
        for pl in polis:
            q = [(round(x + 600.1, 1), round(y - tb, 1)) for x, y in pl]
            k = tuple(q) if q[0] <= q[-1] else tuple(reversed(q))
            if k in vistos or len(q) < 2: continue
            vistos.add(k); prims.append({'t': 'p', 'l': '0', 'p': [list(v) for v in q]})
        out[f'PP_LGTB_{tb}'] = prims
        print(f'PP_LGTB_{tb}', len(prims), 'polilinhas')
else:
    print('biblioteca LONGARINAS.dxf não encontrada (passe o caminho como argumento)')
with open(os.path.join(AQUI, '..', 'drive-in', 'app', 'blocos_pp.js'), 'w') as f:
    f.write('// Blocos do porta-palete extraídos dos DXF do responsável técnico (porta-palete/extrair_blocos_pp.py). Coordenadas locais em mm.\n')
    f.write('window.BLOCOS_PP = ' + json.dumps(out, separators=(',', ':')) + ';\n')
