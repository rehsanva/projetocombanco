# Aula 7 — CRUD de Senioridade e Tatuadores

## Antes de começar — relembrando o ambiente

Se você está numa máquina do laboratório que foi reiniciada (ou é um dia novo de aula), o banco de dados e o ambiente virtual não vêm salvos do GitHub. Antes de seguir com essa aula, repita os passos que já vimos:

1. **Importe o banco de novo.** Abra o phpMyAdmin, aba **Importar**, selecione `banco/estudio_tatuagem.sql` e clique em **Executar** (processo completo na Aula 2, Passo 4).

2. **Recrie o arquivo `.env`** dentro da pasta `backend` — ele também não vai pro GitHub, então some toda vez que a máquina é reiniciada:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=estudio_tatuagem
   ```
   Detalhes desse arquivo na Aula 5, Parte 1.

3. **Recrie o ambiente virtual**, dentro da pasta `backend` (se a pasta `venv` já existir, pule esse passo e vá direto pra ativação):
   ```powershell
   cd backend
   python -m venv venv
   ```

4. **Ative o ambiente virtual:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   Se aparecer erro de política de execução, ou o erro de `pydantic-core`/Rust ao instalar, o passo a passo completo de correção está na Aula 3, seção "Se der erro — resolução de problemas".

5. **Reinstale as dependências** (o venv novo começa vazio):
   ```powershell
   pip install -r requirements.txt
   ```

6. **Rode a API:**
   ```powershell
   uvicorn main:app --reload
   ```

> **Atenção:** quando você criar os arquivos novos de rotas nessa aula (`rotas/senioridade.py` e `rotas/tatuadores.py`) com o servidor já ligado, às vezes o `--reload` não percebe os arquivos novos sozinho. Se uma rota nova não aparecer em `/docs` ou não devolver dados mesmo com tudo certo, pare o servidor com **Ctrl+C** e rode `uvicorn main:app --reload` de novo.

---

## O que vamos fazer nessa aula

1. Entender por que vamos cadastrar Senioridade antes de Tatuador
2. Criar o CRUD completo de Senioridade (backend + frontend)
3. Criar o CRUD de Tatuadores, que depende da Senioridade (chave estrangeira)
4. Aprender o que é um `JOIN` para mostrar o nome da senioridade em vez do número
5. Aprender a preencher um `<select>` dinamicamente com dados vindos da API
6. Criar uma barra de navegação simples para transitar entre as páginas

---

## Parte 1 — Por que Senioridade antes de Tatuador?

Olhe de novo o campo `uf` do formulário de clientes, lá na Aula 6. Você digita "SP" num campo de texto livre — nada impede alguém de digitar "sp", "São Paulo" ou errar a mão e digitar "SPP".

Agora olhe a tabela `tatuador` no banco (`banco/estudio_tatuagem.sql`). Ela tem uma coluna `idsenioridade` que não guarda o texto "Júnior" — guarda só um número, que aponta para uma linha da tabela `senioridade`. Isso se chama **chave estrangeira (foreign key, ou FK)**.

| Guardando texto livre (como o `uf` de clientes) | Guardando com chave estrangeira |
|---|---|
| Qualquer um digita o que quiser | O usuário só pode escolher de uma lista pronta |
| "Júnior", "junior", "JR" viram valores diferentes no banco | Sempre existe um único registro "Júnior" |
| Pra renomear, precisa mudar linha por linha | Pra renomear, muda em um lugar só |

Por isso a tabela `senioridade` existe separada: ela é a "lista pronta" de onde o `tatuador` escolhe.

E é exatamente por causa disso que a ordem da aula importa: **um tatuador só pode ser cadastrado se a senioridade dele já existir no banco.** Se tentarmos programar `tatuador` primeiro, não vamos ter de onde puxar as opções. Por isso, senioridade vem primeiro.

---

## Parte 2 — Backend de Senioridade

Crie `backend/rotas/senioridade.py`. Essa tabela só tem `idsenioridade` e `nome` — o padrão de rotas é idêntico ao de clientes, você já sabe fazer:

```python
# ============================================================
# rotas/senioridade.py — CRUD de Senioridade
# Descrição: Endpoints para gerenciar os níveis de senioridade
#            dos tatuadores (Júnior, Pleno, Sênior).
# ============================================================

from fastapi import APIRouter      # organiza rotas em grupos
from pydantic import BaseModel     # valida os dados que chegam na API
from database import conectar      # nossa função de conexão

router = APIRouter()               # cria o grupo de rotas

# Modelo de dados — define os campos que a senioridade deve ter
class Senioridade(BaseModel):
    nome: str    # obrigatório — ex: "Júnior", "Pleno", "Sênior"

# GET /senioridade — lista todas as senioridades
@router.get("/senioridade")
def listar_senioridade():
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM senioridade")
    senioridades = cursor.fetchall()
    conn.close()
    return senioridades

# GET /senioridade/{id} — busca uma senioridade pelo ID
@router.get("/senioridade/{id}")
def buscar_senioridade(id: int):
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM senioridade WHERE idsenioridade = %s", (id,))
    senioridade = cursor.fetchone()
    conn.close()
    if not senioridade:
        return {"erro": "Senioridade não encontrada"}
    return senioridade

# POST /senioridade — cadastra uma nova senioridade
@router.post("/senioridade")
def criar_senioridade(senioridade: Senioridade):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO senioridade (nome) VALUES (%s)", (senioridade.nome,))
    conn.commit()
    conn.close()
    return {"mensagem": "Senioridade cadastrada com sucesso"}

# PUT /senioridade/{id} — atualiza uma senioridade existente
@router.put("/senioridade/{id}")
def atualizar_senioridade(id: int, senioridade: Senioridade):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("UPDATE senioridade SET nome=%s WHERE idsenioridade=%s", (senioridade.nome, id))
    conn.commit()
    conn.close()
    return {"mensagem": "Senioridade atualizada com sucesso"}

# DELETE /senioridade/{id} — deleta uma senioridade
@router.delete("/senioridade/{id}")
def deletar_senioridade(id: int):
    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM senioridade WHERE idsenioridade = %s", (id,))
        conn.commit()
        conn.close()
        return {"mensagem": "Senioridade deletada com sucesso"}
    except Exception as erro:
        conn.rollback()
        conn.close()
        return {"erro": "Não foi possível excluir esta senioridade. Verifique se ela está sendo usada por algum tatuador."}
```

---

## Parte 3 — Registrando a rota no main.py

Abra o `backend/main.py` e atualize os imports e o registro de rotas:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rotas import clientes, senioridade   # ← adiciona senioridade aqui

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes.router)
app.include_router(senioridade.router)   # ← registra a nova rota


@app.get("/")
def inicio():
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}
```

**Teste:** acesse `http://127.0.0.1:8000/docs` — deve aparecer o grupo de rotas `/senioridade`. O banco de exemplo já vem com "Júnior", "Pleno" e "Sênior" cadastrados; confira em `GET /senioridade`.

---

## Parte 4 — Frontend de Senioridade

Crie `frontend/senioridade.html`:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Senioridade — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-4">

  <h1>Senioridade</h1>

  <!-- Formulário para cadastrar nova senioridade -->
  <form id="form-senioridade" class="row g-2 mt-2 mb-4">
    <div class="col-md-4">
      <input type="text" id="nome" class="form-control" placeholder="Nome (ex: Júnior)" required>
    </div>
    <div class="col-md-2">
      <button id="btn-submit-senioridade" type="submit" class="btn btn-primary w-100">Cadastrar</button>
    </div>
  </form>

  <!-- Tabela onde as senioridades vão aparecer -->
  <table class="table table-bordered">
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="corpo-tabela">
      <!-- as senioridades vão aparecer aqui -->
    </tbody>
  </table>

  <script src="js/senioridade.js"></script>

</body>
</html>
```

Crie `frontend/js/senioridade.js` — é o mesmo padrão de `clientes.js`, só com menos campos:

```javascript
// endereço da nossa API backend
const API = 'http://127.0.0.1:8000'

// elementos do formulário e do botão de enviar
const formSenioridade = document.getElementById('form-senioridade')
const botaoSubmit = document.getElementById('btn-submit-senioridade')

// limpa o formulário e devolve o botão para o modo de cadastro
function limparFormulario() {
  formSenioridade.reset()
  delete formSenioridade.dataset.idSenioridade
  botaoSubmit.textContent = 'Cadastrar'
  botaoSubmit.classList.remove('btn-success')
  botaoSubmit.classList.add('btn-primary')
}

// ─── Carrega a lista de senioridades ao abrir a página ───
async function listarSenioridades() {
  const resposta = await fetch(`${API}/senioridade`)
  const senioridades = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  senioridades.forEach(s => {
    corpo.innerHTML += `
      <tr>
        <td>${s.idsenioridade}</td>
        <td>${s.nome}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(s)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarSenioridade(${s.idsenioridade})">Excluir</button>
        </td>
      </tr>`
  })
}

listarSenioridades()

// ─── Cadastrar e atualizar senioridades ───
formSenioridade.addEventListener('submit', async (e) => {
  e.preventDefault()

  const senioridade = { nome: document.getElementById('nome').value }
  const idSenioridade = formSenioridade.dataset.idSenioridade

  if (idSenioridade) {
    await fetch(`${API}/senioridade/${idSenioridade}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senioridade)
    })
  } else {
    await fetch(`${API}/senioridade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senioridade)
    })
  }

  limparFormulario()
  listarSenioridades()
})

// ─── Abre os dados da senioridade no formulário para edição ───
function preencherFormularioEdicao(senioridade) {
  document.getElementById('nome').value = senioridade.nome
  formSenioridade.dataset.idSenioridade = senioridade.idsenioridade

  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}

// ─── Exclui uma senioridade ───
async function deletarSenioridade(id) {
  if (!confirm('Tem certeza que deseja excluir esta senioridade?')) return

  await fetch(`${API}/senioridade/${id}`, { method: 'DELETE' })
  listarSenioridades()
}
```

**Teste:** abra `senioridade.html` no navegador. A tabela deve listar Júnior, Pleno e Sênior. Cadastre uma nova, edite uma existente e exclua alguma — confira que tudo funciona como no CRUD de clientes.

---

## Parte 5 — Backend de Tatuadores (aqui entra o conceito novo)

Crie `backend/rotas/tatuadores.py`. O modelo agora tem o campo `idsenioridade`, que é a chave estrangeira:

```python
# ============================================================
# rotas/tatuadores.py — CRUD de Tatuadores
# Descrição: Endpoints para gerenciar os tatuadores do estúdio.
#            Cada tatuador pertence a uma senioridade (FK).
# ============================================================

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from database import conectar

router = APIRouter()

# Modelo de dados — define os campos que o tatuador deve ter
class Tatuador(BaseModel):
    nometatuador: str                      # obrigatório
    cpf: str                               # obrigatório
    email: Optional[str] = None            # opcional
    telefone: Optional[str] = None         # opcional
    datacontratacao: Optional[str] = None  # opcional
    idsenioridade: int                     # obrigatório — aponta para a tabela senioridade
```

Agora a rota de listar. Em vez de `SELECT * FROM tatuador`, vamos usar um **JOIN**:

```python
# GET /tatuadores — lista todos os tatuadores, já com o nome da senioridade
@router.get("/tatuadores")
def listar_tatuadores():
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT tatuador.*, senioridade.nome AS senioridade
        FROM tatuador
        JOIN senioridade ON tatuador.idsenioridade = senioridade.idsenioridade
    """)
    # o JOIN junta as duas tabelas usando o idsenioridade como ponte
    # "AS senioridade" renomeia a coluna nome vinda de senioridade, pra não confundir
    # com um possível campo "nome" de tatuador
    tatuadores = cursor.fetchall()
    conn.close()
    return tatuadores
```

> **Por que não basta `SELECT * FROM tatuador`?** Porque essa consulta traria só o número (`idsenioridade: 3`), e quem estiver olhando a tela teria que "adivinhar" que 3 é "Sênior". O `JOIN` busca o nome de verdade na tabela `senioridade` e devolve os dois juntos: `idsenioridade` (o número, que ainda vamos precisar pra editar) e `senioridade` (o nome, pra mostrar na tela).

Resto das rotas, seguindo o padrão de sempre:

```python
# GET /tatuadores/{id} — busca um tatuador pelo ID
@router.get("/tatuadores/{id}")
def buscar_tatuador(id: int):
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tatuador WHERE idtatuador = %s", (id,))
    tatuador = cursor.fetchone()
    conn.close()
    if not tatuador:
        return {"erro": "Tatuador não encontrado"}
    return tatuador

# POST /tatuadores — cadastra um novo tatuador
@router.post("/tatuadores")
def criar_tatuador(tatuador: Tatuador):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO tatuador (nometatuador, cpf, email, telefone, datacontratacao, idsenioridade)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (tatuador.nometatuador, tatuador.cpf, tatuador.email,
         tatuador.telefone, tatuador.datacontratacao, tatuador.idsenioridade)
    )
    conn.commit()
    conn.close()
    return {"mensagem": "Tatuador cadastrado com sucesso"}

# PUT /tatuadores/{id} — atualiza um tatuador existente
@router.put("/tatuadores/{id}")
def atualizar_tatuador(id: int, tatuador: Tatuador):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE tatuador
           SET nometatuador=%s, cpf=%s, email=%s, telefone=%s, datacontratacao=%s, idsenioridade=%s
           WHERE idtatuador=%s""",
        (tatuador.nometatuador, tatuador.cpf, tatuador.email,
         tatuador.telefone, tatuador.datacontratacao, tatuador.idsenioridade, id)
    )
    conn.commit()
    conn.close()
    return {"mensagem": "Tatuador atualizado com sucesso"}

# DELETE /tatuadores/{id} — deleta um tatuador
@router.delete("/tatuadores/{id}")
def deletar_tatuador(id: int):
    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM tatuador WHERE idtatuador = %s", (id,))
        conn.commit()
        conn.close()
        return {"mensagem": "Tatuador deletado com sucesso"}
    except Exception as erro:
        conn.rollback()
        conn.close()
        return {"erro": "Não foi possível excluir este tatuador. Verifique se ele possui agendamentos ou estilos cadastrados."}
```

---

## Parte 6 — Registrando a rota de tatuadores no main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rotas import clientes, senioridade, tatuadores   # ← adiciona tatuadores aqui

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes.router)
app.include_router(senioridade.router)
app.include_router(tatuadores.router)   # ← registra a nova rota


@app.get("/")
def inicio():
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}
```

**Teste:** acesse `/docs`, teste `GET /tatuadores` e confirme que cada tatuador vem com o campo `senioridade` preenchido com o nome (não só o número).

---

## Parte 7 — Frontend de Tatuadores (segundo conceito novo)

Crie `frontend/tatuadores.html`. Repare no `<select id="idsenioridade">` — ele começa praticamente vazio, porque quem vai preencher as opções é o JavaScript:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Tatuadores — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-4">

  <h1>Tatuadores</h1>

  <!-- Formulário para cadastrar novo tatuador -->
  <form id="form-tatuador" class="row g-2 mt-2 mb-4">
    <div class="col-md-3">
      <input type="text" id="nometatuador" class="form-control" placeholder="Nome" required>
    </div>
    <div class="col-md-2">
      <input type="text" id="cpf" class="form-control" placeholder="CPF (só números)" required>
    </div>
    <div class="col-md-3">
      <input type="email" id="email" class="form-control" placeholder="E-mail">
    </div>
    <div class="col-md-2">
      <input type="text" id="telefone" class="form-control" placeholder="Telefone">
    </div>
    <div class="col-md-2">
      <select id="idsenioridade" class="form-select" required>
        <option value="">Senioridade...</option>
        <!-- as opções são preenchidas pelo JavaScript -->
      </select>
    </div>
    <div class="col-md-2">
      <button id="btn-submit-tatuador" type="submit" class="btn btn-primary w-100">Cadastrar</button>
    </div>
  </form>

  <!-- Tabela onde os tatuadores vão aparecer -->
  <table class="table table-bordered">
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>CPF</th>
        <th>E-mail</th>
        <th>Telefone</th>
        <th>Senioridade</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="corpo-tabela">
      <!-- os tatuadores vão aparecer aqui -->
    </tbody>
  </table>

  <script src="js/tatuadores.js"></script>

</body>
</html>
```

Crie `frontend/js/tatuadores.js`:

```javascript
// endereço da nossa API backend
const API = 'http://127.0.0.1:8000'

// elementos do formulário e do botão de enviar
const formTatuador = document.getElementById('form-tatuador')
const botaoSubmit = document.getElementById('btn-submit-tatuador')

// limpa o formulário e devolve o botão para o modo de cadastro
function limparFormulario() {
  formTatuador.reset()
  delete formTatuador.dataset.idTatuador
  botaoSubmit.textContent = 'Cadastrar'
  botaoSubmit.classList.remove('btn-success')
  botaoSubmit.classList.add('btn-primary')
}

// ─── Busca as senioridades na API e preenche o <select> ───
async function carregarSenioridades() {
  const resposta = await fetch(`${API}/senioridade`)
  const senioridades = await resposta.json()

  const select = document.getElementById('idsenioridade')
  select.innerHTML = '<option value="">Senioridade...</option>'

  senioridades.forEach(s => {
    select.innerHTML += `<option value="${s.idsenioridade}">${s.nome}</option>`
  })
}

carregarSenioridades()

// ─── Carrega a lista de tatuadores ao abrir a página ───
async function listarTatuadores() {
  const resposta = await fetch(`${API}/tatuadores`)
  const tatuadores = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  tatuadores.forEach(t => {
    corpo.innerHTML += `
      <tr>
        <td>${t.idtatuador}</td>
        <td>${t.nometatuador}</td>
        <td>${t.cpf}</td>
        <td>${t.email ?? '-'}</td>
        <td>${t.telefone ?? '-'}</td>
        <td>${t.senioridade}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(t)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarTatuador(${t.idtatuador})">Excluir</button>
        </td>
      </tr>`
  })
}

listarTatuadores()

// ─── Cadastrar e atualizar tatuadores ───
formTatuador.addEventListener('submit', async (e) => {
  e.preventDefault()

  const tatuador = {
    nometatuador: document.getElementById('nometatuador').value,
    cpf: document.getElementById('cpf').value,
    email: document.getElementById('email').value || null,
    telefone: document.getElementById('telefone').value || null,
    datacontratacao: new Date().toISOString().split('T')[0],
    idsenioridade: Number(document.getElementById('idsenioridade').value)
    // Number(...) converte o texto do <select> em número
    // o backend espera idsenioridade como int, não como texto
  }

  const idTatuador = formTatuador.dataset.idTatuador

  if (idTatuador) {
    await fetch(`${API}/tatuadores/${idTatuador}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tatuador)
    })
  } else {
    await fetch(`${API}/tatuadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tatuador)
    })
  }

  limparFormulario()
  listarTatuadores()
})

// ─── Abre os dados do tatuador no formulário para edição ───
function preencherFormularioEdicao(tatuador) {
  document.getElementById('nometatuador').value = tatuador.nometatuador
  document.getElementById('cpf').value = tatuador.cpf
  document.getElementById('email').value = tatuador.email || ''
  document.getElementById('telefone').value = tatuador.telefone || ''
  document.getElementById('idsenioridade').value = tatuador.idsenioridade
  // o navegador encontra a <option> com esse value e a seleciona sozinho

  formTatuador.dataset.idTatuador = tatuador.idtatuador

  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}

// ─── Exclui um tatuador ───
async function deletarTatuador(id) {
  if (!confirm('Tem certeza que deseja excluir este tatuador?')) return

  await fetch(`${API}/tatuadores/${id}`, { method: 'DELETE' })
  listarTatuadores()
}
```

**Teste:** abra `tatuadores.html`. O `<select>` de senioridade já deve vir preenchido sozinho, sem você digitar nada. Cadastre um tatuador e confirme que a coluna "Senioridade" mostra o nome, não o número. Clique em Editar num tatuador existente e confirme que o `<select>` já aparece com a opção certa marcada.

---

## Parte 8 — Navegação entre as páginas

Agora temos 3 páginas soltas (`clientes.html`, `senioridade.html`, `tatuadores.html`). Adicione este bloco logo depois da tag `<body ...>` nas três:

```html
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container">
    <span class="navbar-brand">Estúdio de Tatuagem</span>
    <div>
      <a href="clientes.html" class="text-light me-3">Clientes</a>
      <a href="senioridade.html" class="text-light me-3">Senioridade</a>
      <a href="tatuadores.html" class="text-light">Tatuadores</a>
    </div>
  </div>
</nav>
```

> Isso é só navegação — não tem login nem controle de acesso. É o mesmo bloco copiado nas três páginas. Mais pra frente, quando o projeto ganhar uma tela de login, essa barra vira o ponto de partida do dashboard, e as páginas de CRUD que já temos não vão precisar mudar quase nada.

**Teste:** clique nos links da barra e confirme que navega entre as três páginas sem erro.

---

## Dois problemas, duas soluções

| Problema | Onde resolvemos | Como resolvemos |
|---|---|---|
| Mostrar o nome da senioridade em vez do número | Backend | `JOIN` no SQL |
| Deixar o usuário escolher um nome mas enviar um número pro banco | Frontend | `<select>` preenchido dinamicamente via `fetch` |

---

## Erros comuns

- **Erro 422 no `/docs` ou no console ao cadastrar tatuador:** geralmente é o `idsenioridade` chegando como texto em vez de número. Confira se usou `Number(...)` no JavaScript antes de montar o objeto enviado pro `fetch`.
- **`<select>` de senioridade aparece vazio na tela:** confira se `carregarSenioridades()` está sendo chamada (igual fizemos com `listarTatuadores()`) e se existe pelo menos uma senioridade cadastrada no banco.
- **Erro ao excluir uma senioridade:** se algum tatuador estiver usando aquela senioridade, o delete vai falhar — é a mesma situação de chave estrangeira que já vimos no delete de cliente, na Aula 5.

---

## Estrutura do projeto até agora

```
estudio-tatuagem-api/
├── aulas/
├── backend/
│   ├── rotas/
│   │   ├── __init__.py
│   │   ├── clientes.py
│   │   ├── senioridade.py     ← novo
│   │   └── tatuadores.py      ← novo
│   ├── venv/
│   ├── .env
│   ├── database.py
│   ├── main.py                ← atualizado (2 rotas novas)
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   ├── clientes.js
│   │   ├── senioridade.js     ← novo
│   │   └── tatuadores.js      ← novo
│   ├── clientes.html          ← atualizado (barra de navegação)
│   ├── senioridade.html       ← novo
│   └── tatuadores.html        ← novo
├── banco/
│   └── estudio_tatuagem.sql
├── .gitignore
└── REGRAS.md
```

Ao terminar esta aula, lembre-se de exportar o banco novamente e salvar o arquivo em [banco/estudio_tatuagem.sql](banco/estudio_tatuagem.sql), como já fazemos desde a Aula 5.

---

## Próxima aula

Na **Aula 8** vamos criar o CRUD de Agendamentos, que tem **duas** chaves estrangeiras (`cliente` e `tatuador`) no mesmo formulário, além de campos de data e hora.
