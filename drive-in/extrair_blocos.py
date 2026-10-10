# Extrai os blocos DI_* (DXF enviados pelo responsável técnico) para app/blocos.js em primitivas simples.
# Uso: python3 extrair_blocos.py blocos_dxf   (um DXF por bloco, nome do arquivo = nome do bloco)
import ezdxf,sys,glob,json,math,os
from ezdxf.math import Vec3
pasta=sys.argv[1]; out={}
def prim(b):
    P=[]
    for e in b:
        if e.dxf.get('invisible',0): continue  # bloco dinâmico: entidade oculta (outro estado de visibilidade)
        t=e.dxftype(); lay=e.dxf.layer
        if t=='LINE': P.append({'t':'l','l':lay,'p':[[e.dxf.start.x,e.dxf.start.y],[e.dxf.end.x,e.dxf.end.y]]})
        elif t=='CIRCLE': P.append({'t':'c','l':lay,'c':[e.dxf.center.x,e.dxf.center.y],'r':e.dxf.radius})
        elif t=='ARC':
            pts=[[v.x,v.y] for v in e.flattening(0.5)]; P.append({'t':'p','l':lay,'p':pts})
        elif t=='LWPOLYLINE':
            from ezdxf.math import ConstructionArc
            pts=[]
            vs=list(e.get_points('xyb'))
            if e.closed: vs=vs+[vs[0]]
            for i in range(len(vs)-1):
                (x0,y0,bu),(x1,y1,_)=vs[i],vs[i+1]
                if abs(bu)>1e-9:
                    arc=ConstructionArc.from_2p_angle((x0,y0),(x1,y1),math.degrees(4*math.atan(bu)))
                    seg=[[v.x,v.y] for v in arc.flattening(0.5)]
                    if bu<0: seg=seg[::-1]
                    pts+= seg if not pts else seg[1:]
                else:
                    if not pts: pts.append([x0,y0])
                    pts.append([x1,y1])
            P.append({'t':'p','l':lay,'p':pts})
        elif t=='SPLINE':
            try: pts=[[v.x,v.y] for v in e.flattening(0.5)]
            except Exception: pts=[[v.x,v.y] for v in e.control_points]
            P.append({'t':'p','l':lay,'p':pts})
        elif t=='HATCH':
            # hachura sólida → triângulos (SOLID do R12); hachura de padrão (ANSI31 etc.) é ignorada (o contorno já vem em linhas)
            if not e.dxf.solid_fill: continue
            from ezdxf import path as zpath
            from ezdxf.math.triangulation import mapbox_earcut_2d
            from ezdxf.math import Vec2
            ps=[[Vec2(v) for v in pth.flattening(0.5)] for pth in zpath.from_hatch(e)]
            ps=[q for q in ps if len(q)>=3]
            if not ps: continue
            ps.sort(key=lambda q: -abs(sum(q[i].x*q[i-1].y-q[i-1].x*q[i].y for i in range(len(q)))))
            for tri in mapbox_earcut_2d(ps[0], ps[1:]):
                a,b,c=[[v.x,v.y] for v in tri]
                P.append({'t':'s','l':lay,'p':[a,b,c,c]})
        elif t=='INSERT': P+=prim(list(e.virtual_entities()))  # inserts aninhados (arrays de furos)
    return P
def rnd(P):
    for q in P:
        if 'p' in q: q['p']=[[round(x,2),round(y,2)] for x,y in q['p']]
        if 'c' in q: q['c']=[round(q['c'][0],2),round(q['c'][1],2)]; q['r']=round(q['r'],2)
    return P
for f in sorted(glob.glob(os.path.join(pasta,'*DI_*.dxf'))):
    d=ezdxf.readfile(f)
    for b in d.blocks:
        if b.name.startswith('DI_'):
            nome=b.name[:-4] if b.name.endswith('_ESQ') else b.name   # braço: só o ESQ é enviado; o DIR é espelhado no app
            if nome!=b.name and not os.path.basename(f).startswith(b.name): continue  # ignora cópias de outros braços dentro do arquivo
            out[nome]=rnd(prim(b)); print(nome,len(out[nome]),'primitivas')
open('app/blocos.js','w',encoding='utf-8').write('// Blocos DI_* extraídos dos DXF do responsável técnico (extrair_blocos.py). Coordenadas locais em mm.\nwindow.BLOCOS = '+json.dumps(out,separators=(',',':'))+';\n')
print('tamanho',os.path.getsize('app/blocos.js'))
