path = 'C:/Downloads/relatorio-2026/index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print('Tamanho inicial:', len(content))

# 1. Inserir bloco ai2 no template TURMA (dentro do ipane de relato, apos .ol)
OLD = '<div class="ol">OCORRENCIAS</div></div><div class="ipane"'
NEW = ('<div class="ol">OCORRENCIAS</div>'
       '<div class="ai2"><div class="ai2h"><div class="tg">'
       '\u2726 An\u00e1lise IA</div><span>RESUMO_SITUACAO</span></div>'
       'ITEMS_AI2'
       '<div class="ai2s">\U0001f4a1 SUGESTAO_PEDAGOGICA.</div></div>'
       '</div><div class="ipane"')

if OLD in content:
    content = content.replace(OLD, NEW)
    print('Template ai2: OK')
else:
    print('ERRO: OLD nao encontrado')
    idx = content.find('OCORRENCIAS')
    if idx > 0:
        print('OCORRENCIAS encontrado em:', idx, repr(content[idx-40:idx+40]))

# 2. Adicionar regras do ai2 no array do prompt
OLD_RULE = "    '- Se uma turma N\u00e3O teve aula, deixe vazio entre os marcadores dessa turma',"
NEW_RULE = ("    '- Bloco ai2 por aluno c/ obs. (ITEMS_AI2):"
            ' <div class="ai2i"><div class="ai2a">NOME</div>'
            '<div class="ai2p CLASSE">NIVEL obs.</div>'
            '<div class="ai2t">Recomendacao.</div></div>',
            "    '- ai2p: \"ai2p warn\"=1a/2a obs | \"ai2p grave\"=3a+ ou recusa |"
            ' "ai2p" style="color:var(--ai)"=positivo',
            "    '- RESUMO_SITUACAO: \"Turma colaborativa\", \"2 obs. leves\", etc.',",
            "    '- Se sem ocorrencias: ITEMS_AI2 vazio e sugestao positiva',",
            "    '- Se turma nao teve aula, deixe vazio entre os marcadores',",)

# Build new rule string
NEW_RULE_STR = '\n'.join([
    "    '- Bloco ai2 por aluno c/ obs. (ITEMS_AI2): <div class=\"ai2i\"><div class=\"ai2a\">NOME</div><div class=\"ai2p CLASSE\">NIVEL obs. tipo</div><div class=\"ai2t\">Recomendacao.</div></div>',",
    "    '- ai2p classes: \"ai2p warn\"=1a/2a obs | \"ai2p grave\"=3a+ ou recusa grave | \"ai2p\" style=\"color:var(--ai)\"=positivo',",
    "    '- RESUMO_SITUACAO: frase curta do clima da turma (\"Turma colaborativa\", \"2 obs. leves\", etc.)',",
    "    '- Se sem ocorrencias: ITEMS_AI2 vazio, resumo positivo e sugestao de engajamento',",
    "    '- Se turma nao teve aula deixe vazio entre os marcadores dessa turma',",
])

if OLD_RULE in content:
    content = content.replace(OLD_RULE, NEW_RULE_STR)
    print('Regras ai2: OK')
else:
    idx = content.find('Se uma turma')
    if idx > 0:
        print('AVISO: regra encontrada mas nao bateu exatamente:', repr(content[idx-10:idx+80]))
    else:
        print('AVISO: regra nao encontrada - ok se ja foi removida')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Arquivo salvo. Tamanho final:', len(content))
