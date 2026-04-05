# 📚 Relatório Diário de Aulas 2026

**E.E. Rural Pe. Carlos Casavequia · Senador Guiomard – AC**
Prof. Paulo Roberto Ramalho Magalhães

Sistema web completo para gestão de diários de aula, presença, plano anual e cronograma.

---

## ✅ O que o sistema faz

- Login seguro com conta Google
- Diários de aula por turma (1ª, 2ª, 3ª Série e 6º Ano)
- Lista de presença interativa (clique para alternar: Presente → Falta → Falta Justificada)
- Plano anual com status por aula (Aplicada / Pulada / SIMAED)
- Contador de aulas com previsão de conclusão por bimestre
- Cronograma semanal com destaque do dia atual
- Modo de edição com toolbar de formatação
- Histórico de versões (últimas 10 alterações)
- **Funciona no celular como aplicativo instalado (PWA)**
- Sincronização automática com Firebase

---

## 🚀 Como colocar no ar (passo a passo)

### Passo 1 — Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: `relatorio-2026`) e clique em **Continuar**
4. Desative o Google Analytics (opcional) → **Criar projeto**

### Passo 2 — Ativar o Firebase Authentication

1. No menu lateral: **Authentication → Primeiros passos**
2. Clique em **Google** → ative → coloque seu e-mail → **Salvar**

### Passo 3 — Criar o Firestore Database

1. No menu lateral: **Firestore Database → Criar banco de dados**
2. Escolha **Modo de produção** → **Avançar**
3. Escolha a região **southamerica-east1 (São Paulo)** → **Ativar**
4. Vá em **Regras** e substitua o conteúdo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Clique em **Publicar**

### Passo 4 — Obter as credenciais do Firebase

1. No menu lateral: ⚙️ **Configurações do projeto**
2. Role até **"Seus apps"** → clique em **`</>`** (Web)
3. Dê um nome ao app → **Registrar app**
4. Copie os valores do `firebaseConfig` mostrado na tela

### Passo 5 — Configurar o arquivo de credenciais

1. Na pasta do projeto, abra o arquivo **`firebase-config.js`**
2. Substitua os valores pelos que você copiou no Passo 4
3. **NUNCA envie esse arquivo para o GitHub** (já está no .gitignore)

### Passo 6 — Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome do repositório: `relatorio-2026` (ou outro nome)
3. Deixe **Público** (necessário para o GitHub Pages gratuito)
4. **Não** inicialize com README → **Criar repositório**

### Passo 7 — Subir os arquivos

Abra o terminal na pasta `relatorio-2026` e execute:

```bash
git init
git add .
git commit -m "Primeiro commit — Relatório Diário 2026"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/relatorio-2026.git
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub.

### Passo 8 — Ativar o GitHub Pages

1. No GitHub, acesse **Settings → Pages**
2. Em **Source**, selecione **Deploy from a branch**
3. Branch: **`gh-pages`** → pasta: **`/ (root)`** → **Salvar**
4. Aguarde 2–3 minutos
5. O site estará em: `https://SEU_USUARIO.github.io/relatorio-2026`

> O deploy automático acontece a cada vez que você fizer `git push` na branch `main`.

---

## 📱 Instalar no celular (PWA)

1. Abra o site no **Chrome** do celular
2. Toque no menu **⋮** → **"Adicionar à tela inicial"**
3. Confirme a instalação
4. O app aparecerá como ícone na tela do celular e funcionará como um aplicativo nativo

---

## ✏️ Como atualizar o sistema

Se o Claude sugerir mudanças, após aplicá-las:

```bash
git add .
git commit -m "Atualização: descrição da mudança"
git push
```

O GitHub Actions fará o deploy automaticamente em 1–2 minutos.

---

## 👥 Atualizar a lista de alunos

Edite o arquivo `assets/js/data.js` e localize o objeto `ALUNOS`.
Os nomes estão organizados por turma (`t1`, `t2`, `t3`, `t6`).
Substitua pelos nomes reais dos seus alunos mantendo o formato:

```javascript
{ num: 1, nome: 'Nome Completo do Aluno' },
```

---

## 📁 Estrutura do projeto

```
relatorio-2026/
├── index.html               ← Página principal
├── firebase-config.js       ← Suas credenciais (NÃO commitar!)
├── firebase-config.example.js ← Exemplo sem credenciais reais
├── manifest.json            ← Configuração do PWA
├── sw.js                    ← Service Worker (offline/instalação)
├── .gitignore               ← Arquivos ignorados pelo Git
├── assets/
│   ├── css/
│   │   ├── main.css         ← Estilos globais
│   │   ├── editor.css       ← Modo de edição
│   │   ├── plano.css        ← Plano anual
│   │   └── responsive.css   ← Mobile/tablet
│   └── js/
│       ├── app.js           ← Inicialização e roteamento
│       ├── firebase.js      ← Operações Firebase
│       ├── data.js          ← Dados estáticos (alunos, plano, etc.)
│       ├── editor.js        ← Modo de edição
│       ├── blocks.js        ← Sistema de blocos
│       ├── plano.js         ← Plano anual interativo
│       ├── presenca.js      ← Lista de presença
│       ├── atividades.js    ← Controle de atividades
│       ├── contador.js      ← Contador de aulas
│       └── cronograma.js    ← Cronograma semanal
└── .github/
    └── workflows/
        └── deploy.yml       ← Deploy automático GitHub Pages
```

---

## 🔧 Tecnologias utilizadas

- **Vanilla JS** — sem frameworks, simples de manter
- **Firebase v10** — autenticação e banco de dados em tempo real
- **CSS Grid + Flexbox** — layout responsivo sem Bootstrap
- **PWA** — instalável no celular, funciona offline
- **GitHub Pages** — hospedagem gratuita
- **GitHub Actions** — deploy automático a cada atualização

---

*Sistema desenvolvido com assistência de IA para o Prof. Paulo Roberto Ramalho Magalhães — Ano Letivo 2026.*
