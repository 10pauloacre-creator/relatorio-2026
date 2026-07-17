(function(){
  var LIVROS_PROMPTS_URL='tmp/docs/prompt-capa-sumario-extract.txt';
  var LIVROS_PROMPT_GERAL_URL='tmp/docs/prompt-geral-livros.txt';
  var LIVRO_PROMPT_BUTTON_STYLE='display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:7px;border:2px solid #d8b45b;background:rgba(201,168,76,.12);color:#7a5c10;font:700 .72rem "DM Sans",sans-serif;cursor:pointer';
  var DISCIPLINA_ALIASES={
    lp:['PORTUGUES','LINGUA PORTUGUESA'],
    tc:['TRILHAS DE CIENCIAS HUMANAS'],
    tl:['TRILHAS DE LINGUAGENS'],
    ar:['ARTES','ARTE'],
    art:['ARTES','ARTE'],
    ing:['INGLES','LINGUA INGLESA'],
    esp:['ESPANHOL','LINGUA ESPANHOLA'],
    red:['REDACAO']
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
      .replace(/\u00C2/g,'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[–—−]/g,'-')
      .replace(/[º°]/g,'O')
      .replace(/ª/g,'A')
      .replace(/\s+/g,' ')
      .replace(/\s*-\s*/g,' - ')
      .trim()
      .toUpperCase();
  }

  function isHeading(text){
    return /^(?:8O E 9O ANO|1A SERIE|2A SERIE|3A SERIE|2A E 3A SERIE) - .+ - [1-4]O BIMESTRE$/i.test(canon(text));
  }

  function stripLineNumber(line){
    var match=String(line||'').match(/^\s*\d+:\s?(.*)$/);
    return match?match[1]:String(line||'');
  }

  function parsePromptSections(raw){
    var sections={};
    var order=[];
    var currentKey='';
    var currentLines=[];
    String(raw||'').split(/\r?\n/).forEach(function(line){
      var clean=stripLineNumber(line).trim();
      if(!clean){
        if(currentKey)currentLines.push('');
        return;
      }
      if(isHeading(clean)){
        if(currentKey&&currentLines.length){
          sections[currentKey]=currentLines.join('\n').trim();
          order.push(currentKey);
        }
        currentKey=canon(clean);
        currentLines=[clean];
        return;
      }
      if(currentKey)currentLines.push(clean);
    });
    if(currentKey&&currentLines.length){
      sections[currentKey]=currentLines.join('\n').trim();
      order.push(currentKey);
    }
    return {sections:sections,order:order};
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
          return {sections:{},order:[]};
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

  function getTurmaAliases(turma){
    if(turma==='t89')return ['8O E 9O ANO'];
    if(turma==='t1')return ['1A SERIE'];
    if(turma==='t2')return ['2A SERIE'];
    if(turma==='t3')return ['3A SERIE'];
    if(turma==='t23')return ['2A E 3A SERIE','2A SERIE','3A SERIE'];
    return [canon(formatarTurmaLabel(turma))].filter(Boolean);
  }

  function getDisciplinaAliases(key,disciplina){
    var parts=String(key||'').split('-');
    var discId=parts.length>1?parts[1]:'';
    var aliases=(DISCIPLINA_ALIASES[discId]||[]).slice();
    var canonDisc=canon(disciplina);
    if(canonDisc)aliases.push(canonDisc);
    return aliases.map(canon).filter(Boolean).filter(function(value,index,arr){
      return arr.indexOf(value)===index;
    });
  }

  function getBimestreAlias(bimestre){
    var texto=String(bimestre||'').trim();
    if(/^[1-4]$/.test(texto))return texto+'O BIMESTRE';
    return canon(texto);
  }

  function sameOrContains(source,candidate){
    return source===candidate||source.indexOf(candidate)>=0||candidate.indexOf(source)>=0;
  }

  function resolverPromptLivro(data,key,turma,disciplina,bimestre){
    var sections=data.sections||{};
    var order=data.order||[];
    var turmaAliases=getTurmaAliases(turma);
    var discAliases=getDisciplinaAliases(key,disciplina);
    var bimestreAlias=getBimestreAlias(bimestre);
    var encontrados=order.filter(function(sectionKey){
      var parts=sectionKey.split(' - ');
      if(parts.length<3)return false;
      var turmaKey=parts[0];
      var discKey=parts[1];
      var bimKey=parts[parts.length-1];
      var turmaOk=turmaAliases.some(function(alias){return sameOrContains(turmaKey,alias);});
      var discOk=discAliases.some(function(alias){return sameOrContains(discKey,alias);});
      var bimOk=sameOrContains(bimKey,bimestreAlias);
      return turmaOk&&discOk&&bimOk&&sections[sectionKey];
    }).map(function(sectionKey){
      return sections[sectionKey];
    });
    return encontrados.join('\n\n========================================\n\n').trim();
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
    loadPromptSections().then(function(data){
      var texto=resolverPromptLivro(data,key,turma,disciplina,bimestre);
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
