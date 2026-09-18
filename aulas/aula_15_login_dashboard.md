# Aula 15 — Tela de Login, Dashboard e Logout

## Antes de começar — relembrando o ambiente

Se a máquina foi reiniciada desde a última aula, repita os passos de sempre antes de continuar:

1. **Importe o banco de novo** no phpMyAdmin, aba **Importar**, usando `banco/estudio_tatuagem.sql`.
2. **Recrie o arquivo `.env`** dentro da pasta `backend`. Gere uma `SECRET_KEY` nova rodando isso no terminal (com o venv ativado):
   ```powershell
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   Copie o texto que apareceu e monte o `.env` assim:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=estudio_tatuagem
   SECRET_KEY=cole_aqui_o_texto_que_apareceu
   ```
   (mesmo processo das Aulas 13 e 14 — gerar uma chave nova é normal, não quebra nada, é só logar de novo depois)
3. **Recrie e ative o ambiente virtual**, dentro da pasta `backend`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
4. **Reinstale as dependências e rode a API:**
   ```powershell
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

Essa aula é só frontend — nenhum arquivo de rota novo, então não precisa do lembrete de reiniciar o `uvicorn` por causa de arquivo novo.

---

## O que vamos fazer nessa aula

1. Entender onde o navegador vai guardar o token depois do login
2. Criar funções compartilhadas de autenticação, usadas por todas as telas
3. Criar a tela de Login de verdade
4. Proteger as 5 telas existentes (clientes, senioridade, estilos, tatuadores, agendamentos)
5. Criar o Dashboard
6. Adicionar o botão de Sair (logout)

---

## Parte 1 — Onde o token vai morar

Depois do login, alguém precisa guardar o token em algum lugar do navegador, pra ele não se perder quando você troca de página. Vamos usar o **`localStorage`** — uma espécie de gaveta dentro do próprio navegador, que guarda informação mesmo depois de fechar a aba (só se perde se você fechar tudo e limpar os dados do navegador, ou se apertar "Sair").

Duas funções do JavaScript fazem esse trabalho:
- `localStorage.setItem('token', valor)` — guarda algo na gaveta
- `localStorage.getItem('token')` — pega de volta o que está guardado
- `localStorage.removeItem('token')` — apaga

---

## Parte 2 — Backend... não, frontend: funções compartilhadas de autenticação

Crie `frontend/js/auth.js` — vai ser usado por todas as 5 telas protegidas, pra não repetir a mesma lógica em cada uma:

```javascript
// ============================================================
// js/auth.js — Funções compartilhadas de autenticação
// Descrição: Usadas por toda tela protegida, pra checar login
//            e mandar o token em toda requisição pra API.
// ============================================================

// ─── Bloqueia a página se não tiver um token guardado ───
function protegerPagina() {
  const token = localStorage.getItem('token')
  if (!token) {
    window.location.href = 'login.html'
  }
}

// ─── Faz um fetch normal, mas já anexando o token no cabeçalho ───
async function fetchAutenticado(url, opcoes = {}) {
  const token = localStorage.getItem('token')

  opcoes.headers = {
    ...opcoes.headers,           // mantém qualquer header que a chamada já tivesse (tipo Content-Type)
    'Authorization': `Bearer ${token}`
  }

  const resposta = await fetch(url, opcoes)

  if (resposta.status === 401) {
    // o token não é mais válido (expirou, ou foi removido) — manda de volta pro login
    localStorage.removeItem('token')
    window.location.href = 'login.html'
  }

  return resposta
}

// ─── Desloga: apaga o token e volta pra tela de login ───
function sair() {
  localStorage.removeItem('token')
  window.location.href = 'login.html'
}
```

> **Por que uma função em vez de repetir esse código em cada tela?** Porque as 5 telas (clientes, senioridade, estilos, tatuadores, agendamentos) precisam **exatamente** da mesma lógica de token. Se cada uma tivesse sua própria cópia, e um dia precisássemos mudar alguma coisa, teríamos que lembrar de mudar em 5 lugares. Com uma função só, muda uma vez, vale pra todas — mesma ideia por trás de `conectar()` no `database.py`.

---

## Parte 3 — Tela de Login

Crie `frontend/login.html`:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Login — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-5" style="max-width: 480px;">

  <h1 class="mb-4">Entrar</h1>

  <form id="form-login">
    <div class="mb-3">
      <input type="email" id="email" class="form-control" placeholder="E-mail" required>
    </div>
    <div class="mb-3">
      <input type="password" id="senha" class="form-control" placeholder="Senha" required>
    </div>
    <button type="submit" class="btn btn-primary w-100">Entrar</button>
  </form>

  <p class="mt-3 text-center">
    Não tem conta? <a href="cadastro.html">Cadastre-se</a>
  </p>

  <script src="js/login.js"></script>

</body>
</html>
```

Crie `frontend/js/login.js`:

```javascript
const API = 'http://127.0.0.1:8000'
const formLogin = document.getElementById('form-login')

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault()

  const dados = {
    email: document.getElementById('email').value,
    senha: document.getElementById('senha').value
  }

  const resposta = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })

  const resultado = await resposta.json()

  if (resposta.ok) {
    localStorage.setItem('token', resultado.access_token)   // guarda o token na "gaveta"
    window.location.href = 'dashboard.html'
  } else {
    alert('Erro ao entrar: ' + resultado.erro)
  }
})
```

> Repare que `login.js` **não** usa `fetchAutenticado` — faz sentido, porque nesse momento ainda não existe token nenhum pra mandar.

**Teste:** abra `login.html`, entre com um usuário já cadastrado (Aula 12). Deve te levar pra `dashboard.html` (mesmo que essa página ainda não exista — vamos criar na Parte 5, por enquanto vai dar "página não encontrada", e não tem problema).

---

## Parte 4 — Protegendo as 5 telas existentes

Em **cada uma** das 5 telas (`clientes.html`/`clientes.js`, `senioridade.html`/`senioridade.js`, `estilos.html`/`estilos.js`, `tatuadores.html`/`tatuadores.js`, `agendamentos.html`/`agendamentos.js`), duas mudanças:

Atenção para não fazer em cadastro, login e index, elas não precisam da autenticação, somente as rotas protegidas

**1. No HTML**, adicione o `auth.js` **antes** do script da própria tela:

```html
<script src="js/auth.js"></script>
<script src="js/clientes.js"></script> <!-- essa linha já vai estar lá -->
```

**2. No JS**, logo depois da linha `const API = ...`, adicione:

```javascript
protegerPagina()   // bloqueia a página se não tiver login
```

E troque **toda ocorrência** da palavra `fetch(` por `fetchAutenticado(` — nada mais muda, nem os parâmetros, nem o resto da função, usem co Ctrl F para procurar e vão substituindo em todos os js que tem as tabelas:

Exemplo abaixo só no cliente.js, mas precisam replicar para todos:

```javascript
// Antes:
const resposta = await fetch(`${API}/clientes`)

// Depois:
const resposta = await fetchAutenticado(`${API}/clientes`)
```

> **Só isso — não precisa reescrever nenhuma função.** É uma troca de palavra, repetida em cada chamada de `fetch` do arquivo. Use o "Localizar e Substituir" do VS Code (Ctrl+H) pra ir mais rápido, trocando `fetch(` por `fetchAutenticado(` — sem tocar mais em nada.

Repita isso nos 5 arquivos HTML e nos 5 arquivos JS.

**Teste:** como você provavelmente já ficou logada testando a Parte 3, e o botão de "Sair" só vem na Parte 6, o jeito mais simples de testar **deslogada** agora é abrir uma **aba anônima/privada** do navegador (Ctrl+Shift+N no Chrome, Ctrl+Shift+P no Firefox) — ela sempre começa sem nada guardado. Nessa aba anônima, tente abrir `clientes.html` direto (pelo caminho do arquivo) — deve te mandar pro `login.html` sozinho. Depois, faça login nessa mesma aba e tente de novo — a tela deve carregar normalmente, com os dados aparecendo.

---

## Parte 5 — Dashboard

Crie `frontend/dashboard.html` — a tela que aparece logo depois do login, reunindo o acesso a tudo:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Dashboard — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>

  <nav class="navbar navbar-dark bg-dark mb-4">
    <div class="container">
      <span class="navbar-brand">Estúdio de Tatuagem</span>
      <button onclick="sair()" class="btn btn-outline-light btn-sm">Sair</button>
    </div>
  </nav>

  <div class="container">
    <h1 class="mb-4">Painel</h1>
    <div class="row g-3">
      <div class="col-md-4">
        <a href="clientes.html" class="btn btn-primary w-100 py-3">Clientes</a>
      </div>
      <div class="col-md-4">
        <a href="tatuadores.html" class="btn btn-primary w-100 py-3">Tatuadores</a>
      </div>
      <div class="col-md-4">
        <a href="agendamentos.html" class="btn btn-primary w-100 py-3">Agendamentos</a>
      </div>
      <div class="col-md-4">
        <a href="senioridade.html" class="btn btn-secondary w-100 py-3">Senioridade</a>
      </div>
      <div class="col-md-4">
        <a href="estilos.html" class="btn btn-secondary w-100 py-3">Estilos</a>
      </div>
    </div>
  </div>

  <script src="js/auth.js"></script>
  <script>
    protegerPagina()   // o dashboard também é protegido — sem login, não entra
  </script>

</body>
</html>
```

**Teste:** com login feito, acesse `dashboard.html` — deve mostrar os botões, e clicar em qualquer um deve levar pra tela certa (já autenticada).

---

## Parte 6 — Botão de Sair nas 5 telas existentes

A navbar de cada uma das 5 telas existentes é esse bloco (o mesmo desde a Aula 7, só que já com "Estilos" e "Agendamentos" adicionados nas aulas seguintes):

```html
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container">
    <span class="navbar-brand">Estúdio de Tatuagem</span>
    <div>
      <a href="clientes.html" class="text-light me-3">Clientes</a>
      <a href="senioridade.html" class="text-light me-3">Senioridade</a>
      <a href="estilos.html" class="text-light me-3">Estilos</a>
      <a href="tatuadores.html" class="text-light me-3">Tatuadores</a>
      <a href="agendamentos.html" class="text-light">Agendamentos</a>
    </div>
  </div>
</nav>
```

Adicione o botão de "Sair" logo depois do último link (`Agendamentos`), **dentro** da mesma `<div>` que os outros links, e coloque `me-3` no link de Agendamentos já que ele deixa de ser o último:

```html
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container">
    <span class="navbar-brand">Estúdio de Tatuagem</span>
    <div>
      <a href="clientes.html" class="text-light me-3">Clientes</a>
      <a href="senioridade.html" class="text-light me-3">Senioridade</a>
      <a href="estilos.html" class="text-light me-3">Estilos</a>
      <a href="tatuadores.html" class="text-light me-3">Tatuadores</a>
      <a href="agendamentos.html" class="text-light me-3">Agendamentos</a>
      <button onclick="sair()" class="btn btn-outline-light btn-sm">Sair</button>
    </div>
  </div>
</nav>
```

Repita essa mudança nas 5 telas:

- `frontend/clientes.html`
- `frontend/senioridade.html`
- `frontend/estilos.html`
- `frontend/tatuadores.html`
- `frontend/agendamentos.html`

**Teste:** clique em "Sair" em qualquer tela — deve apagar o token e voltar pro `login.html`. Tente digitar a URL de `clientes.html` direto depois disso — deve te barrar de novo, mandando pro login.

---

## Erros comuns

- **`protegerPagina is not defined` ou `fetchAutenticado is not defined`:** confira se `<script src="js/auth.js"></script>` está **antes** do script da própria tela no HTML — a ordem importa, porque o navegador lê de cima pra baixo.
- **A tela redireciona pro login em loop, mesmo logado:** confira se `login.js` realmente está salvando o token certo (`localStorage.setItem('token', resultado.access_token)`) e se o nome da chave (`'token'`) é o mesmo usado em `auth.js`.
- **Erro 401 mesmo logado, em alguma chamada específica:** confira se aquele `fetch(` particular não ficou esquecido, sem virar `fetchAutenticado(`.
- **Depois de um tempo, a tela desloga sozinha:** não é bug — o token expira em 2 horas (Aula 13, Parte 4). É só fazer login de novo.

---

## Estrutura do projeto até agora

```
estudio-tatuagem-api/
├── aulas/
├── backend/
│   └── (sem mudanças nessa aula)
├── frontend/
│   ├── js/
│   │   ├── auth.js          ← novo
│   │   ├── login.js         ← novo
│   │   ├── clientes.js      ← atualizado (protegerPagina + fetchAutenticado)
│   │   ├── senioridade.js   ← atualizado
│   │   ├── estilos.js       ← atualizado
│   │   ├── tatuadores.js    ← atualizado
│   │   ├── agendamentos.js  ← atualizado
│   │   └── cadastro.js
│   ├── login.html           ← novo
│   ├── dashboard.html       ← novo
│   ├── index.html
│   ├── cadastro.html
│   ├── clientes.html        ← atualizado (auth.js + botão Sair)
│   ├── senioridade.html     ← atualizado
│   ├── estilos.html         ← atualizado
│   ├── tatuadores.html      ← atualizado
│   └── agendamentos.html    ← atualizado
├── banco/
│   └── estudio_tatuagem.sql
├── .gitignore
└── REGRAS.md
```

---

## Próxima aula

Com isso, o sistema tem login de ponta a ponta: cadastro, autenticação com token, rotas protegidas, e todas as telas exigindo estar logado. A peça que ainda falta — e que fica pra uma aula futura — é a **autorização por tipo de usuário**: hoje qualquer conta logada tem acesso total, e o campo `tipo` (preparado desde a Aula 12) ainda não é usado pra diferenciar o que um `admin` pode fazer versus um `funcionario`.
