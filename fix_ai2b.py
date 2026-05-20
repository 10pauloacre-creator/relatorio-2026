path = 'C:/Downloads/relatorio-2026/index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar a linha que menciona "nao teve aula" e deixar vazio
target = 'deixe vazio entre os marcadores dessa turma'
idx = content.find(target)
if idx < 0:
    print('target nao encontrado')
else:
    # Find the full line (from previous single-quote to next single-quote + comma)
    start = content.rfind("    '- ", 0, idx)
    end = content.find("',\n", idx) + 3
    old_line = content[start:end]
    print('Linha encontrada:', repr(old_line[:80]))

    new_lines = (
        "    '- Bloco ai2 por aluno com obs. (ITEMS_AI2):"
        ' <div class=\"ai2i\"><div class=\"ai2a\">NOME</div>'
        '<div class=\"ai2p CLASSE\">NIVEL obs. tipo</div>'
        '<div class=\"ai2t\">Recomendacao.</div></div>',
        "    '- ai2p: \"ai2p warn\"=1a/2a obs | \"ai2p grave\"=3a+ ou grave | \"ai2p\" style=\"color:var(--ai)\"=positivo',",
        "    '- RESUMO_SITUACAO: frase curta do clima da turma',",
        "    '- Se sem ocorrencias: ITEMS_AI2 vazio + resumo positivo',",
        old_line.rstrip('\n'),
    )
    replacement = '\n'.join(new_lines) + '\n'
    content = content[:start] + replacement + content[end:]
    print('Regras ai2: OK')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Salvo. Tamanho:', len(content))
