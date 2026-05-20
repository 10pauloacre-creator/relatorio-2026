with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Corrigir texto do botão no voltarEtapa1
content = content.replace(
    "btn.textContent = '🤖 Gerar com Gemini'; btn.disabled = false;",
    "btn.textContent = '🤖 Gerar com Groq'; btn.disabled = false;"
)

# 2. Substituir gerarComIA() inteiro
NEW_GERAR = """let _blocos = { geral: '', t1: '', t2: '', t3: '' };

function _extrairSecao(texto, chave) {
  const re = new RegExp('===SECAO_' + chave + '===([\\\\s\\\\S]*?)===FIM_' + chave + '===', 'i');
  const m = texto.match(re);
  return m ? m[1].trim() : '';
}

async function gerarComIA() {
  const rascunho = document.getElementById('relato-rascunho').value.trim();
  const dataVal = document.getElementById('relato-data').value;
  const hora = document.getElementById('relato-hora').value.trim();
  const groqKey = localStorage.getItem('gemini_key') || '';

  if (!rascunho) { alert('Escreva o rascunho antes de continuar!'); return; }
  if (!dataVal) { alert('Selecione a data da aula!'); return; }
  if (!groqKey) {
    alert('Configure a Chave API Groq primeiro!\\n\\nClique em \u2699\ufe0f Configuração GitHub acima, preencha o campo "Chave API Groq" e clique em \U0001f4be Salvar.');
    document.getElementById('cfg-gh-fields').style.display = 'block';
    document.getElementById('cfg-arrow').textContent = '\u25b4 recolher';
    return;
  }

  const dataObj = new Date(dataVal + 'T12:00:00');
  const dia = String(dataObj.getDate()).padStart(2,'0');
  const mm  = String(dataObj.getMonth() + 1).padStart(2,'0');
  const idData = mm + dia;
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mes = meses[dataObj.getMonth()] + ' 2026';

  const prompt = [
    'Você é assistente do Prof. Paulo Roberto Ramalho Magalhães, que leciona Língua Portuguesa, Artes, Trilhas de Linguagens e Trilhas de C. Humanas no Ensino Médio (1ª, 2ª e 3ª Série) e 6º Ano na E.E. Rural Pe. Carlos Casavequia, Senador Guiomard – AC.',
    '',
    'Gere relatos diários em HTML puro. Retorne APENAS os blocos HTML separados pelos marcadores — sem texto adicional, sem markdown.',
    '',
    'DADOS: Dia="' + dia + '" | Mês="' + mes + '" | idData="' + idData + '" | Horário="' + (hora||'ver rascunho') + '"',
    '',
    'Formato GERAL (resumo de todas as turmas):',
    '<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">' + dia + '</div><div class="my">' + mes + '</div></div><div class="em"><div class="ed">DISCIPLINAS — TURMAS</div><div class="ec"><span class="ch ch-h">⏰ HORÁRIO</span><span class="ch ch-p">👥 X·Y presentes</span><span class="ch ch-i">📖 TEMAS</span><span class="ch ch-a">⚠️ N obs.</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="ipane on" style="padding:16px 22px"><div class="ct">RESUMO FLUIDO COM <strong>NEGRITO</strong> NOS PONTOS IMPORTANTES.</div></div></div></div>',
    '',
    'Formato TURMA (detalhado — substituir tX por t1, t2 ou t3 conforme a série):',
    '<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">' + dia + '</div><div class="my">' + mes + '</div></div><div class="em"><div class="ed">Língua Portuguesa — 2 h/aula</div><div class="ec"><span class="ch ch-h">⏰ HORÁRIO</span><span class="ch ch-p">👥 X presentes</span><span class="ch ch-i">📖 TEMA</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,\'r-tX-' + idData + '\')">📄 Relato</button><button class="itab" onclick="itab(this,\'p-tX-' + idData + '\')">👥 Presença</button><button class="itab" onclick="itab(this,\'a-tX-' + idData + '\')">📝 Atividades</button></div><div class="ipane on" id="r-tX-' + idData + '"><div class="st">📖 Conteúdo</div><div class="ct"><strong>CONTEÚDO.</strong><br>DETALHES DA AULA.</div><div class="st">🔎 Comportamento</div><div class="ol">OCORRENCIAS</div></div><div class="ipane" id="p-tX-' + idData + '"><div class="pres-av"><span>ℹ️</span><span>X presentes: NOMES · Falta: NOME (motivo)</span></div><div id="pl-tX-' + idData + '" class="pres-grid"></div></div><div class="ipane" id="a-tX-' + idData + '"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>TÍTULO</strong><br><span style="font-size:.82rem;color:var(--cm)">STATUS · DATA</span></div><div class="atv-av"><span>📋</span><span>OBSERVAÇÃO.</span></div></div></div></div>',
    '',
    'REGRAS:',
    '- ch-h=horário(⏰) ch-i=tema(📖/📌) ch-p=presença(👥) ch-a=alerta(⚠️)',
    '- Ocorrência: <div class="oi"><span class="oi-ic">EMOJI</span><div><div class="oa">NOME</div><div class="od">DESCRIÇÃO. Nª ocorrência.</div></div></div>',
    '- Sem ocorrência: <div class="oi nt"><span class="oi-ic">✅</span><div><div class="oa" style="color:var(--ai)">Nenhuma ocorrência registrada</div><div class="od">Turma colaborativa.</div></div></div>',
    '- Use idData="' + idData + '" exatamente em todos os IDs de abas',
    '- Se uma turma NÃO teve aula, deixe vazio entre os marcadores dessa turma',
    '- .ct deve ter <strong> nos destaques; citar nomes, faltas com motivo, Nª ocorrência',
    '',
    'Retorne no formato:',
    '===SECAO_GERAL===',
    '[HTML da seção geral]',
    '===FIM_GERAL===',
    '===SECAO_T1===',
    '[HTML da 1ª série ou vazio]',
    '===FIM_T1===',
    '===SECAO_T2===',
    '[HTML da 2ª série ou vazio]',
    '===FIM_T2===',
    '===SECAO_T3===',
    '[HTML da 3ª série ou vazio]',
    '===FIM_T3===',
    '',
    'RASCUNHO DO PROFESSOR:',
    rascunho
  ].join('\\n');

  const btn = document.getElementById('btn-gerar');
  btn.textContent = '⏳ Gerando...';
  btn.disabled = true;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4000
      })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error?.message || 'Erro na API Groq (' + resp.status + ')');
    }
    const json = await resp.json();
    const raw = (json.choices?.[0]?.message?.content || '').trim();

    _blocos.geral = _extrairSecao(raw, 'GERAL');
    _blocos.t1    = _extrairSecao(raw, 'T1');
    _blocos.t2    = _extrairSecao(raw, 'T2');
    _blocos.t3    = _extrairSecao(raw, 'T3');

    if (!_blocos.geral) throw new Error('A IA não gerou o relato geral. Verifique o rascunho e tente novamente.');

    _relatoGerado = _blocos.geral;
    const preview = [_blocos.geral, _blocos.t1, _blocos.t2, _blocos.t3].filter(Boolean).join('\\n\\n');
    document.getElementById('relato-html-colado').value = preview;
    document.getElementById('relato-etapa1').style.display = 'none';
    document.getElementById('relato-etapa2').style.display = 'block';
    document.getElementById('relato-preview').innerHTML = preview;
    document.getElementById('relato-preview').style.display = 'block';
    document.getElementById('pub-status').style.display = 'none';
  } catch(e) {
    alert('Erro ao chamar o Groq:\\n' + e.message);
    btn.textContent = '🤖 Gerar com Groq';
    btn.disabled = false;
  }
}"""

start_marker = 'async function gerarComIA() {'
start = content.find(start_marker)
end = content.find('\nfunction mostrarPreviewColado()', start)
if start == -1 or end == -1:
    print('ERRO: função gerarComIA não encontrada')
else:
    content = content[:start] + NEW_GERAR + content[end:]
    print('gerarComIA(): substituído OK')

# 3. Corrigir decode base64 UTF-8
OLD_DECODE = "const conteudoAtual = decodeURIComponent(escape(atob(fileData.content.replace(/\\n/g,''))));";
NEW_DECODE = """const bytes = Uint8Array.from(atob(fileData.content.replace(/\\n/g,'')), c => c.charCodeAt(0));
    const conteudoAtual = new TextDecoder('utf-8').decode(bytes);"""
if OLD_DECODE in content:
    content = content.replace(OLD_DECODE, NEW_DECODE)
    print('TextDecoder fix: OK')
else:
    print('AVISO: decode antigo não encontrado')

# 4. Corrigir encode UTF-8 no PUT
OLD_ENCODE = "        content: btoa(unescape(encodeURIComponent(novoConteudo))),"
NEW_ENCODE = "        content: btoa(String.fromCharCode(...new TextEncoder().encode(novoConteudo))),"
if OLD_ENCODE in content:
    content = content.replace(OLD_ENCODE, NEW_ENCODE)
    print('TextEncoder fix: OK')
else:
    print('AVISO: encode antigo não encontrado')

# 5. Substituir injeção única por multi-injeção
OLD_INJECT = """    // 2. Injetar novo relato após o marcador
    const marcador = '<!-- RELATOS_INICIO -->';
    if (!conteudoAtual.includes(marcador)) throw new Error('Marcador não encontrado. Publique a versão 10 do arquivo primeiro.');
    const novoConteudo = conteudoAtual.replace(marcador, marcador + '\\n' + _relatoGerado + '\\n');"""
NEW_INJECT = """    // 2. Injetar relatos nos marcadores de cada seção
    const m_geral = '<!-- RELATOS_INICIO -->';
    const m_t1    = '<!-- T1_INICIO -->';
    const m_t2    = '<!-- T2_INICIO -->';
    const m_t3    = '<!-- T3_INICIO -->';
    if (!conteudoAtual.includes(m_geral)) throw new Error('Marcador RELATOS_INICIO não encontrado no arquivo.');
    let novoConteudo = conteudoAtual;
    if (_blocos.geral) novoConteudo = novoConteudo.replace(m_geral, m_geral + '\\n' + _blocos.geral + '\\n');
    if (_blocos.t1 && novoConteudo.includes(m_t1)) novoConteudo = novoConteudo.replace(m_t1, m_t1 + '\\n' + _blocos.t1 + '\\n');
    if (_blocos.t2 && novoConteudo.includes(m_t2)) novoConteudo = novoConteudo.replace(m_t2, m_t2 + '\\n' + _blocos.t2 + '\\n');
    if (_blocos.t3 && novoConteudo.includes(m_t3)) novoConteudo = novoConteudo.replace(m_t3, m_t3 + '\\n' + _blocos.t3 + '\\n');"""
if OLD_INJECT in content:
    content = content.replace(OLD_INJECT, NEW_INJECT)
    print('Multi-injeção: OK')
else:
    print('AVISO: injeção antiga não encontrada')

# 6. Corrigir validação de _relatoGerado (agora usa _blocos.geral)
OLD_VAL = "  if (!_relatoGerado) { alert('Gere o relato com o Gemini antes de publicar!'); return; }\n  if (!_relatoGerado.includes('<div class=\"ea\">')) { alert('O HTML gerado não parece correto. Deve conter <div class=\"ea\">.'); return; }"
NEW_VAL = "  if (!_blocos.geral) { alert('Gere o relato com o Groq antes de publicar!'); return; }"
if OLD_VAL in content:
    content = content.replace(OLD_VAL, NEW_VAL)
    print('Validação: OK')
else:
    print('AVISO: validação antiga não encontrada')

# 7. Atualizar botão do modal
content = content.replace('🤖 Gerar com Gemini\n    </button>', '🤖 Gerar com Groq\n    </button>')

# VERIFICAÇÕES
checks = [
    '_extrairSecao', '_blocos.geral', '<!-- T1_INICIO -->', '<!-- T2_INICIO -->',
    '<!-- T3_INICIO -->', 'TextDecoder', 'TextEncoder', 'Gerar com Groq',
    'm_geral', 'm_t1', 'm_t2', 'm_t3'
]
print('\nVerificações finais:')
for c in checks:
    status = 'OK' if c in content else 'FALTANDO'
    print(f'  {c}: {status}')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('\nArquivo salvo.')
