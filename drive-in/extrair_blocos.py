# Extrai os blocos DI_* (DXF enviados pelo responsável técnico) para app/blocos.js em primitivas simples.
# Uso: python3 extrair_blocos.py <pasta com DI_*.dxf>
import ezdxf,sys,glob,json,math,os
from ezdxf.math import Vec3
pasta=sys.argv[1]; out={}
def prim(b):
    P=[]
    for e in b:
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
        elif t=='HATCH': pass
        elif t=='INSERT': pass
    return P
def rnd(P):
    for q in P:
        if 'p' in q: q['p']=[[round(x,2),round(y,2)] for x,y in q['p']]
        if 'c' in q: q['c']=[round(q['c'][0],2),round(q['c'][1],2)]; q['r']=round(q['r'],2)
    return P
for f in sorted(glob.glob(os.path.join(pasta,'*DI_*.dxf'))):
    d=ezdxf.readfile(f)
    for b in d.blocks:
        if b.name.startswith('DI_'): out[b.name]=rnd(prim(b)); print(b.name,len(out[b.name]),'primitivas')
open('app/blocos.js','w',encoding='utf-8').write('// Blocos DI_* extraídos dos DXF do responsável técnico (extrair_blocos.py). Coordenadas locais em mm.\nwindow.BLOCOS = '+json.dumps(out,separators=(',',':'))+';\n')
print('tamanho',os.path.getsize('app/blocos.js'))
