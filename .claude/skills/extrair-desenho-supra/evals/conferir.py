#!/usr/bin/env python3
"""Confere o extrair.py contra valores já validados pelo Gean (13–14/10/2026).
Uso: python3 -I conferir.py <pasta-com-os-pdfs>   (procura os PDFs pelo código do desenho no nome)"""
import json, subprocess, sys, tempfile
from pathlib import Path

GAB = {  # desenho → {(folha): (codigo, peso, {codigo_componente: qtd})}
    '0004.0003.01.012': {'1/5': ('PK041340', 1.507, {'CO040998': 1, 'INT0648': 4, 'INT0993': 1, 'INT0650': 5}),
                         '2/5': ('PK041367', 2.782, {'INT0994': 1}), '3/5': ('PK041444', 1.780, {}), '4/5': ('PK041466', 2.142, {}),
                         '5/5': ('PK041553', 1.907, {'INT0958': 1, 'INT0650': 5})},
    '0004.0003.02.001_-_REV.02': {'1/4': ('CO041028', 1.209, {'SA042676': 1, 'SA041442': 1}), '2/4': ('CO040437', 1.251, {}),
                                  '3/4': ('CO040544', 1.294, {'SA041652': 1}), '4/4': ('CO***', 1.578, {})},
    '0004.0003.01.014': {'1/14': ('PK040863', 1.536, {'INT0812': 9, 'INT1550': 1, 'INT0650': 5, 'INT0648': 4}),
                         '2/14': ('PK040864', 2.146, {'INT0812': 10, 'INT1550': 2, 'INT0650': 6}),
                         '9/14': ('PK041559', 1.768, {}), '12/14': ('PK041562', 2.658, {}), '8/14': ('PK041376', 2.803, {})},
    '0004.0003.03.009': {'1/6': ('SA041451', 5.709, {}), '4/6': ('SA042687', 9.667, {}), '6/6': ('SA042978', 4.386, {})},
    '0004.0003.01.009': {'1/1': ('PK041124', 1.387, {'SA042123': 1, 'INT0654': 2, 'INT0648': 4, 'INT0650': 4})},
    '0004.0003.03.015': {'1/2': ('SA041463', 0.223, {}), '2/2': ('SA041649', 0.231, {})},
    '0004.0003.01.015': {'1/4': ('PK041335', 4.158, {'INT0812': 4, 'INT0648': 4, 'INT0650': 4})},
    '0004.0003.01.017': {'1/4': ('PK040222', 1.502, {}), '4/4': ('PK04XXX', 2.088, {})},
    '0004.0003.01.004': {'1/4': ('PA042114', 30.310, {'INT0654': 11, 'SA041451': 4, 'SA041450': 4})},
    '0004.0003.01.007': {'1/2': ('PA042118', 0.424, {})},
}

def main(pasta):
    pdfs = sorted(Path(pasta).glob('*.[pP][dD][fF]'))
    ok = falhas = 0
    for chave, folhas in GAB.items():
        arq = [p for p in pdfs if chave in p.name]
        if not arq:
            print(f'-- sem PDF para {chave}'); continue
        out = Path(tempfile.mkdtemp()) / 'o.json'
        subprocess.run([sys.executable, '-I', str(Path(__file__).parents[1] / 'scripts/extrair.py'), str(arq[0]), '--json', str(out)], check=True, capture_output=True)
        dados = {f['folha']: f for f in json.loads(out.read_text())}
        for folha, (cod, peso, comp) in folhas.items():
            f = dados.get(folha)
            checks = [(f'{chave} {folha} código {cod}', f and f['codigo'] == cod), (f'{chave} {folha} peso {peso}', f and f['peso_kg'] is not None and abs(f['peso_kg'] - peso) < 1e-6)]
            for c, q in comp.items():
                checks.append((f'{chave} {folha} componente {c} qtd {q}', f and any(r['codigo'] == c and r['qtd'] == q for r in f['componentes'])))
            for nome, passou in checks:
                ok += bool(passou); falhas += not passou
                if not passou: print('FALHOU', nome, '→', f and (f['codigo'], f['peso_kg'], [(r['codigo'], r['qtd']) for r in f['componentes']]))
    print(f'{ok} conferências OK, {falhas} falha(s)')
    return falhas == 0

if __name__ == '__main__':
    sys.exit(0 if main(sys.argv[1]) else 1)
