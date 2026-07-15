(function(){
  var LIVROS_PROMPTS_URL='tmp/docs/prompt-capa-sumario-extract.txt';
  var LIVROS_PROMPT_GERAL_URL='tmp/docs/prompt-geral-livros.txt';
  var LIVRO_PROMPT_BUTTON_STYLE='display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:7px;border:2px solid #d8b45b;background:rgba(201,168,76,.12);color:#7a5c10;font:700 .72rem "DM Sans",sans-serif;cursor:pointer';
  var LIVROS_PROMPTS_MAP={
    casavequia:{
      't1-lp-b3':['1ª SÉRIE – LÍNGUA PORTUGUESA – 3º BIMESTRE'],
      't1-lp-b4':['1ª SÉRIE – LÍNGUA PORTUGUESA – 4º BIMESTRE'],
      't1-tc-b3':['1ª SÉRIE – TRILHAS DE CIÊNCIAS HUMANAS – 3º BIMESTRE'],
      't1-tc-b4':['1ª SÉRIE – TRILHAS DE CIÊNCIAS HUMANAS – 4º BIMESTRE'],
      't1-tl-b3':['1ª SÉRIE – TRILHAS DE LINGUAGENS – 3º BIMESTRE'],
      't1-tl-b4':['1ª SÉRIE – TRILHAS DE LINGUAGENS – 4º BIMESTRE'],
      't2-lp-b1':['2ª E 3ª SÉRIE – LÍNGUA PORTUGUESA – 1º BIMESTRE'],
      't2-lp-b3':['2ª SÉRIE – LÍNGUA PORTUGUESA – 3º BIMESTRE'],
      't2-lp-b4':['2ª SÉRIE – LÍNGUA PORTUGUESA – 4º BIMESTRE'],
      't2-tc-b3':['2ª SÉRIE – TRILHAS DE CIÊNCIAS HUMANAS – 3º BIMESTRE'],
      't2-tc-b4':['2ª SÉRIE – TRILHAS DE CIÊNCIAS HUMANAS – 4º BIMESTRE'],
      't2-tl-b3':['2ª SÉRIE – TRILHAS DE LINGUAGENS – 3º BIMESTRE'],
      't2-tl-b4':['2ª SÉRIE – TRILHAS DE LINGUAGENS – 4º BIMESTRE'],
      't2-ar-b3':['2ª SÉRIE – ARTES – 3º BIMESTRE'],
      't2-ar-b4':['2ª SÉRIE – ARTES – 4º BIMESTRE'],
      't3-lp-b1':['2ª E 3ª SÉRIE – LÍNGUA PORTUGUESA – 1º BIMESTRE'],
      't3-lp-b4':['3ª SÉRIE – LÍNGUA PORTUGUESA – 4º BIMESTRE'],
      't3-tc-b3':['3ª SÉRIE – TRILHAS DE CIÊNCIAS HUMANAS – 3º BIMESTRE'],
      't3-tc-b4':['3ª SÉRIE – TRILHAS DE CIÊNCIAS HUMANAS – 4º BIMESTRE'],
      't3-tl-b3':['3ª SÉRIE – TRILHAS DE LINGUAGENS – 3º BIMESTRE'],
      't3-tl-b4':['3ª SÉRIE – TRILHAS DE LINGUAGENS – 4º BIMESTRE'],
      't3-ar-b3':['3ª SÉRIE – ARTES – 3º BIMESTRE'],
      't3-ar-b4':['3ª SÉRIE – ARTES – 4º BIMESTRE']
    },
    herminio:{
      't89-lp-b2':['8º E 9º ANO – PORTUGUÊS – 2º BIMESTRE'],
      't89-lp-b3':['8º E 9º ANO – PORTUGUÊS – 3º BIMESTRE'],
      't89-lp-b4':['8º E 9º ANO – PORTUGUÊS – 4º BIMESTRE'],
      't89-ing-b2':['8º E 9º ANO – INGLÊS – 2º BIMESTRE'],
      't89-ing-b3':['8º E 9º ANO – INGLÊS – 3º BIMESTRE'],
      't89-ing-b4':['8º E 9º ANO – INGLÊS – 4º BIMESTRE'],
      't89-esp-b3':['8º E 9º ANO – ESPANHOL – 3º BIMESTRE'],
      't89-esp-b4':['8º E 9º ANO – ESPANHOL – 4º BIMESTRE'],
      't89-art-b1':['8º E 9º ANO – ARTES – 1º BIMESTRE'],
      't89-art-b2':['8º E 9º ANO – ARTES – 2º BIMESTRE'],
      't89-art-b3':['8º E 9º ANO – ARTES – 3º BIMESTRE'],
      't89-art-b4':['8º E 9º ANO – ARTES – 4º BIMESTRE'],
      't1-lp-b3':['1ª SÉRIE – LÍNGUA PORTUGUESA – 3º BIMESTRE'],
      't1-lp-b4':['1ª SÉRIE – LÍNGUA PORTUGUESA – 4º BIMESTRE'],
      't1-ing-b3':['1ª SÉRIE – LÍNGUA INGLESA – 3º BIMESTRE'],
      't1-ing-b4':['1ª SÉRIE – LÍNGUA INGLESA – 4º BIMESTRE'],
      't1-esp-b3':['1ª SÉRIE – LÍNGUA ESPANHOLA – 3º BIMESTRE'],
      't1-esp-b4':['1ª SÉRIE – LÍNGUA ESPANHOLA – 4º BIMESTRE'],
      't1-art-b2':['1ª SÉRIE – ARTES – 2º BIMESTRE'],
      't1-art-b3':['1ª SÉRIE – ARTES – 3º BIMESTRE'],
      't1-art-b4':['1ª SÉRIE – ARTES – 4º BIMESTRE'],
      't23-lp-b1':['2ª E 3ª SÉRIE – LÍNGUA PORTUGUESA – 1º BIMESTRE'],
      't23-lp-b3':['2ª SÉRIE – LÍNGUA PORTUGUESA – 3º BIMESTRE'],
      't23-lp-b4':['2ª SÉRIE – LÍNGUA PORTUGUESA – 4º BIMESTRE','3ª SÉRIE – LÍNGUA PORTUGUESA – 4º BIMESTRE'],
      't23-art-b3':['2ª SÉRIE – ARTES – 3º BIMESTRE','3ª SÉRIE – ARTES – 3º BIMESTRE'],
      't23-art-b4':['2ª SÉRIE – ARTES – 4º BIMESTRE','3ª SÉRIE – ARTES – 4º BIMESTRE']
    }
  };
  var TURMA_LABELS={t1:'1ª Série',t2:'2ª Série',t3:'3ª Série',t89:'8º e 9º ano',t23:'2ª e 3ª série'};
  var _livrosPromptSectionsPromise=null;
  var _livrosPromptGeralPromise=null;

  function formatarTurmaLabel(turma){
    return TURMA_LABELS[turma]||turma||'';
  }

  function formatarBimestreLabel(bimestre){
    if(bimestre===0||bimestre){
      var texto=String(bimestre).trim();
      if(/^[1-4]$/.test(texto))return texto+'º Bimestre';
      return texto;
    }
    return '';
  }

  function canon(text){
    return String(text||'')
      .replace(/LÍBGUA/gi,'LÍNGUA')
      .replace(/\s*[–-]\s*/g,' – ')
      .replace(/\s+/g,' ')
      .trim()
      .toUpperCase();
  }

  function isHeading(text){
    return /^(?:8º E 9º ANO|1ª SÉRIE|2ª SÉRIE|3ª SÉRIE|2ª E 3ª SÉRIE) – .+ – [1-4]º BIMESTRE$/i.test(canon(text));
  }

  function stripLineNumber(line){
    var match=String(line||'').match(/^\s*\d+:\s?(.*)$/);
    return match?match[1]:String(line||'');
  }

  function parsePromptSections(raw){
    var sections={};
    var currentKey='';
    var currentLines=[];
    String(raw||'').split(/\r?\n/).forEach(function(line){
      var clean=stripLineNumber(line).trim();
      if(!clean){
        if(currentKey)currentLines.push('');
        return;
      }
      if(isHeading(clean)){
        if(currentKey&&currentLines.length)sections[currentKey]=currentLines.join('\n').trim();
        currentKey=canon(clean);
        currentLines=[clean];
        return;
      }
      if(currentKey)currentLines.push(clean);
    });
    if(currentKey&&currentLines.length)sections[currentKey]=currentLines.join('\n').trim();
    return sections;
  }

  function loadPromptSections(){
    if(!_livrosPromptSectionsPromise){
      _livrosPromptSectionsPromise=fetch(LIVROS_PROMPTS_URL,{cache:'no-cache'})
        .then(function(res){
          if(!res.ok)throw new Error('HTTP '+res.status);
          return res.text();
        })
        .then(parsePromptSections)
        .catch(function(err){
          console.error('[livros-prompts]',err);
          return {};
        });
    }
    return _livrosPromptSectionsPromise;
  }

  function loadPromptGeral(){
    if(!_livrosPromptGeralPromise){
      _livrosPromptGeralPromise=fetch(LIVROS_PROMPT_GERAL_URL,{cache:'no-cache'})
        .then(function(res){
          if(!res.ok)throw new Error('HTTP '+res.status);
          return res.text();
        })
        .catch(function(err){
          console.error('[livros-prompt-geral]',err);
          return '';
        });
    }
    return _livrosPromptGeralPromise;
  }

  function ensureModal(){
    var modal=document.getElementById('livro-prompt-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='livro-prompt-modal';
    modal.style='position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:10020;display:none;align-items:center;justify-content:center;padding:18px';
    modal.innerHTML=''
      +'<div style="background:var(--cr);border-radius:18px;width:min(980px,100%);max-height:92vh;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.45);display:flex;flex-direction:column">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid var(--cl);background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(232,200,106,.08))">'
      +'<div><div id="livro-prompt-modal-title" style="font-family:\'Playfair Display\',serif;font-size:1.08rem;font-weight:700;color:var(--vd)">Prompt do livro</div><div id="livro-prompt-modal-subtitle" style="font-size:.77rem;color:var(--cm);margin-top:3px"></div></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">'
      +'<button id="livro-prompt-copy-btn" type="button" onclick="copiarLivroPromptModal()" style="padding:10px 16px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a84c,#e8c86a);color:#43310e;font:700 .8rem \'DM Sans\',sans-serif;cursor:pointer">copiar</button>'
      +'<button type="button" onclick="fecharLivroPromptModal()" style="padding:10px 16px;border:none;border-radius:999px;background:var(--cl);color:var(--ce);font:700 .8rem \'DM Sans\',sans-serif;cursor:pointer">fechar</button>'
      +'</div></div>'
      +'<div style="padding:20px;overflow:auto"><textarea id="livro-prompt-modal-texto" readonly style="width:100%;min-height:68vh;padding:16px 18px;border:1px solid var(--cl);border-radius:14px;background:#fff;color:var(--ce);font:400 .84rem/1.7 \'DM Sans\',sans-serif;resize:none;white-space:pre-wrap"></textarea></div>'
      +'</div>';
    modal.addEventListener('click',function(e){if(e.target===modal)fecharLivroPromptModal();});
    document.body.appendChild(modal);
    return modal;
  }

  function setModalState(title,subtitle,texto){
    var modal=ensureModal();
    var titleEl=document.getElementById('livro-prompt-modal-title');
    var subtitleEl=document.getElementById('livro-prompt-modal-subtitle');
    var area=document.getElementById('livro-prompt-modal-texto');
    if(titleEl)titleEl.textContent=title||'Prompt do livro';
    if(subtitleEl)subtitleEl.textContent=subtitle||'';
    if(area)area.value=texto||'';
    modal.style.display='flex';
  }

  function montarPromptLivro(escola,key,sections){
    var titles=((LIVROS_PROMPTS_MAP[escola]||{})[key]||[]);
    if(!titles.length)return '';
    var textos=titles.map(function(title){return sections[canon(title)]||'';}).filter(Boolean);
    return textos.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n').trim();
  }

  function copiarLivroPromptModal(){
    var area=document.getElementById('livro-prompt-modal-texto');
    var btn=document.getElementById('livro-prompt-copy-btn');
    if(!area)return;
    function ok(){
      if(!btn)return;
      btn.textContent='copiado!';
      clearTimeout(btn._copyTimer);
      btn._copyTimer=setTimeout(function(){btn.textContent='copiar';},1600);
    }
    function fallback(){
      area.focus();
      area.select();
      try{ if(document.execCommand('copy')) ok(); }catch(e){}
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(area.value||'').then(ok).catch(fallback);
      return;
    }
    fallback();
  }

  function fecharLivroPromptModal(){
    var modal=document.getElementById('livro-prompt-modal');
    if(modal)modal.style.display='none';
  }

  function abrirPromptGeralLivros(){
    setModalState('Prompt geral dos livros','Base para iniciar a criação dos livros em HTML.','Carregando prompt...');
    loadPromptGeral().then(function(texto){
      if(!texto)texto='Não foi possível carregar o prompt geral dos livros.';
      setModalState('Prompt geral dos livros','Base para iniciar a criação dos livros em HTML.',texto);
    });
  }

  function injetarBotaoPromptGeral(){
    var sec=document.getElementById('sec-livros');
    if(!sec||sec.querySelector('[data-livros-prompt-geral]'))return;
    var th=sec.querySelector('.th');
    if(!th)return;
    var wrap=document.createElement('div');
    wrap.setAttribute('data-livros-prompt-geral','1');
    wrap.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:-8px 0 18px';
    wrap.innerHTML=''
      +'<div style="font-size:.77rem;color:var(--cm)">Abra o prompt geral para iniciar a criação dos livros em HTML.</div>'
      +'<button type="button" onclick="abrirPromptGeralLivros()" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a84c,#e8c86a);color:#43310e;font:700 .82rem \'DM Sans\',sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(201,168,76,.18)">Prompt</button>';
    th.insertAdjacentElement('afterend',wrap);
  }

  function abrirLivroPromptLivro(escola,key,turma,disciplina,bimestre,evt){
    if(evt)evt.stopPropagation();
    var subtitulo=[formatarTurmaLabel(turma),disciplina,formatarBimestreLabel(bimestre)].filter(Boolean).join(' • ');
    setModalState('Prompt do livro',subtitulo,'Carregando prompt...');
    loadPromptSections().then(function(sections){
      var texto=montarPromptLivro(escola,key,sections);
      if(!texto){
        texto='Nenhum prompt mapeado para este livro no arquivo analisado.';
      }
      setModalState('Prompt do livro',subtitulo,texto);
    });
  }

  window.LIVRO_PROMPT_BUTTON_STYLE=LIVRO_PROMPT_BUTTON_STYLE;
  window.abrirLivroPromptLivro=abrirLivroPromptLivro;
  window.abrirPromptGeralLivros=abrirPromptGeralLivros;
  window.fecharLivroPromptModal=fecharLivroPromptModal;
  window.copiarLivroPromptModal=copiarLivroPromptModal;

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')fecharLivroPromptModal();
  });
  document.addEventListener('DOMContentLoaded',injetarBotaoPromptGeral);
})();
