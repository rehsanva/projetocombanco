# Aula 8 — CRUD de Agendamentos

## Antes de começar — relembrando o ambiente

Se a máquina foi reiniciada desde a última aula, repita os passos de sempre antes de continuar:

1. **Importe o banco de novo** no phpMyAdmin, aba **Importar**, usando `banco/estudio_tatuagem.sql` (processo completo na Aula 2, Passo 4).
2. **Recrie o arquivo `.env`** dentro da pasta `backend` — ele também não vai pro GitHub, então some toda vez que a máquina é reiniciada:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=estudio_tatuagem
   ```
   Detalhes desse arquivo na Aula 5, Parte 1.
3. **Recrie e ative o ambiente virtual**, dentro da pasta `backend`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
   Se der erro de política de execução ou de `pydantic-core`/Rust, o passo a passo de correção está na Aula 3.
4. **Reinstale as dependências e rode a API:**
   ```powershell
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

> **Lembrete da Aula 7:** se você criar o arquivo `rotas/agendamentos.py` com o servidor já ligado e a rota não aparecer em `/docs`, pare com **Ctrl+C** e rode `uvicorn main:app --reload` de novo.

---

## O que vamos fazer nessa aula

1. Entender por que Agendamento é o CRUD mais completo do projeto até agora
2. Criar a rota de Agendamentos, que tem **duas** chaves estrangeiras (cliente e tatuador)
3. Fazer duas JOINs na mesma consulta
4. Deixar o `status` nascer como "pendente" sozinho, direto do banco
5. Criar o formulário com campos de data, hora, valor e descrição
6. Esconder o campo de status até a hora de editar um agendamento

---

## Parte 1 — Por que Agendamento é o CRUD mais completo até agora

Olhando a tabela `agendamento` (`banco/estudio_tatuagem.sql`), ela junta várias coisas que vimos separadas até aqui:

| Conceito | Já visto em | Novidade na Aula 8 |
|---|---|---|
| Chave estrangeira | Aula 7 (1 FK: tatuador → senioridade) | 2 FKs no mesmo formulário (cliente e tatuador) |
| `JOIN` | Aula 7 (1 JOIN) | 2 JOINs na mesma consulta |
| Escolha de data | Aula 6 (data preenchida sozinha com "hoje") | Aula 8: o usuário escolhe a data e a hora de verdade |
| Campo condicional no formulário | — | `status` só aparece quando está editando |

A tabela também tem a coluna `desenhoaprovado` (pra guardar o caminho de uma imagem do desenho aprovado) — vamos deixar ela de fora por enquanto. Upload de arquivo de verdade é assunto grande o suficiente pra ganhar a própria aula: a **Aula 9**.

---

## Parte 2 — Backend: o modelo de dados

Crie `backend/rotas/agendamentos.py`:

```python
# ============================================================
# rotas/agendamentos.py — CRUD de Agendamentos
# Descrição: Endpoints para gerenciar os agendamentos de sessões
#            de tatuagem. Cada agendamento liga um cliente a um
#            tatuador (duas chaves estrangeiras).
# ============================================================

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from database import conectar

router = APIRouter()

# Modelo de dados — define os campos que o agendamento deve ter
class Agendamento(BaseModel):
    idcliente: int                          # obrigatório — aponta para a tabela cliente
    idtatuador: int                         # obrigatório — aponta para a tabela tatuador
    dataagendamento: str                    # obrigatório
    horaagendamento: str                    # obrigatório
    descricaotatuagem: Optional[str] = None # opcional
    valortatuagem: Optional[float] = None   # opcional
    status: Optional[str] = None            # só é usado ao atualizar (ver Parte 7)
```

---

## Parte 3 — Registrando a rota no main.py

Antes de sair criando as rotas, já deixa o `main.py` sabendo que esse arquivo existe — é o mesmo truque da Aula 5: registra o router vazio primeiro, depois vai preenchendo.

```python
from rotas import clientes, senioridade, tatuadores, agendamentos   # ← adiciona agendamentos aqui
...
app.include_router(agendamentos.router)   # ← registra a nova rota
```

**Teste:** acesse `/docs`. Ainda não vai aparecer nenhuma rota de `/agendamentos` — o arquivo só tem o modelo até agora, sem nenhum `@router.get/post/put/delete`. Mas a conexão já está pronta: conforme formos adicionando as rotas nas próximas partes, elas vão aparecer sozinhas em `/docs` (o `--reload` cuida disso).

---

## Parte 4 — Cadastrar um agendamento (POST)

```python
# POST /agendamentos — cadastra um novo agendamento
@router.post("/agendamentos")
def criar_agendamento(agendamento: Agendamento):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO agendamento (idcliente, idtatuador, dataagendamento, horaagendamento, descricaotatuagem, valortatuagem)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (agendamento.idcliente, agendamento.idtatuador, agendamento.dataagendamento,
         agendamento.horaagendamento, agendamento.descricaotatuagem, agendamento.valortatuagem)
    )
    # repare que a coluna status nem aparece aqui — o banco aplica sozinho
    # o DEFAULT 'pendente' que já foi definido lá na Aula 2
    conn.commit()
    conn.close()
    return {"mensagem": "Agendamento cadastrado com sucesso"}
```

> **Por que não mandamos o status no cadastro?** Porque a coluna `status` já nasceu, lá na Aula 2, com `DEFAULT 'pendente'`. Se o `INSERT` não menciona essa coluna, o próprio MySQL preenche "pendente" sozinho. É um bom exemplo de regra de negócio que já mora no banco, sem precisar de nenhuma linha extra de Python.

### Exemplo de JSON para testar

`idcliente` e `idtatuador` são chaves estrangeiras — só funcionam se já existirem de verdade nas tabelas `cliente` e `tatuador`. Antes de testar, dá uma olhada em `GET /clientes` e `GET /tatuadores` pra saber quais IDs existem no seu banco agora.

Um exemplo válido, usando os dados de teste que vieram da Aula 2 (cliente 1 = Ana Silva, tatuador 1 = Lucas Mendes):

```json
{
  "idcliente": 1,
  "idtatuador": 1,
  "dataagendamento": "2026-10-20",
  "horaagendamento": "15:30",
  "descricaotatuagem": "Fênix nas costas",
  "valortatuagem": 450.00
}
```

> Se você usar um `idcliente` ou `idtatuador` que não existe no banco, o cadastro vai dar erro. É a chave estrangeira te protegendo de criar um agendamento "órfão" — sem cliente ou tatuador de verdade por trás.

**Teste:** no `/docs`, cadastre um agendamento pelo `POST /agendamentos` usando o JSON de exemplo acima (ajustando os IDs para os que existirem no seu banco). Ainda não temos como ver o resultado formatado — isso vem na próxima parte.

---

## Parte 5 — Listar agendamentos (GET) — duas JOINs

```python
# GET /agendamentos — lista todos os agendamentos, já com nome do cliente e do tatuador
@router.get("/agendamentos")
def listar_agendamentos():
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT agendamento.*, cliente.nome AS cliente, tatuador.nometatuador AS tatuador
        FROM agendamento
        JOIN cliente  ON agendamento.idcliente  = cliente.idcliente
        JOIN tatuador ON agendamento.idtatuador = tatuador.idtatuador
    """)
    agendamentos = cursor.fetchall()
    conn.close()

    # o mysql-connector-python devolve colunas TIME como um "timedelta" (tempo decorrido),
    # não como texto — por isso convertemos aqui pra "HH:MM:SS" antes de mandar pro frontend
    for a in agendamentos:
        total_segundos = int(a["horaagendamento"].total_seconds())
        horas, resto = divmod(total_segundos, 3600)
        minutos, segundos = divmod(resto, 60)
        a["horaagendamento"] = f"{horas:02d}:{minutos:02d}:{segundos:02d}"

    return agendamentos

```

**Teste:** acesse `GET /agendamentos` no `/docs`. Cada agendamento deve vir com `cliente` e `tatuador` como nomes (não como números) e `status` já como `"pendente"`, mesmo sem ter sido enviado no cadastro.

---

## Parte 6 — Rota: Buscar um agendamento (GET por ID)

```python
# GET /agendamentos/{id} — busca um agendamento pelo ID
@router.get("/agendamentos/{id}")
def buscar_agendamento(id: int):
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM agendamento WHERE idagendamento = %s", (id,))
    agendamento = cursor.fetchone()
    conn.close()
    if not agendamento:
        return {"erro": "Agendamento não encontrado"}

    # mesma conversão da Parte 5 — sem isso, horaagendamento viria como número de segundos
    total_segundos = int(agendamento["horaagendamento"].total_seconds())
    horas, resto = divmod(total_segundos, 3600)
    minutos, segundos = divmod(resto, 60)
    agendamento["horaagendamento"] = f"{horas:02d}:{minutos:02d}:{segundos:02d}"

    return agendamento
```

**Teste:** acesse `GET /agendamentos/{id}` no `/docs` usando o ID de um agendamento que você já cadastrou. Depois teste com um ID que não existe — deve devolver o erro.

---

## Parte 7 — Rota: Atualizar um agendamento (PUT)

```python
# PUT /agendamentos/{id} — atualiza um agendamento existente
@router.put("/agendamentos/{id}")
def atualizar_agendamento(id: int, agendamento: Agendamento):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE agendamento
           SET idcliente=%s, idtatuador=%s, dataagendamento=%s, horaagendamento=%s,
               descricaotatuagem=%s, valortatuagem=%s, status=%s
           WHERE idagendamento=%s""",
        (agendamento.idcliente, agendamento.idtatuador, agendamento.dataagendamento,
         agendamento.horaagendamento, agendamento.descricaotatuagem,
         agendamento.valortatuagem, agendamento.status, id)
    )
    conn.commit()
    conn.close()
    return {"mensagem": "Agendamento atualizado com sucesso"}
```

**Teste:** no `/docs`, use `PUT /agendamentos/{id}` para mudar o `status` de um agendamento para `"confirmado"`. Depois busque o mesmo ID com `GET /agendamentos/{id}` para confirmar a alteração.

### Exemplo de JSON para testar

O PUT também exige o objeto completo (não só o `status` — todos os campos, porque o `UPDATE` reescreve a linha inteira). Pra deixar claro que é uma atualização de verdade, imagine que o cliente remarcou pra outro dia e o valor foi reajustado, além de confirmarmos o agendamento:

```json
{
  "idcliente": 1,
  "idtatuador": 1,
  "dataagendamento": "2026-10-22",
  "horaagendamento": "16:00",
  "descricaotatuagem": "Fênix nas costas segurando um arco",
  "valortatuagem": 480.00,
  "status": "confirmado"
}
```

Repare o que mudou em relação ao cadastro da Parte 4: a data (de 20 pra 22), a hora (de 15:30 pra 16:00), o valor (de 450 pra 480) e o `status`, que agora aparece pela primeira vez.

> Lembre de colocar, na URL (`PUT /agendamentos/{id}`), o `id` de um agendamento que você já cadastrou — esse JSON só atualiza um agendamento existente, não cria um novo.

---

## Parte 8 — Rota: Deletar um agendamento (DELETE)

```python
# DELETE /agendamentos/{id} — deleta um agendamento
@router.delete("/agendamentos/{id}")
def deletar_agendamento(id: int):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM agendamento WHERE idagendamento = %s", (id,))
    conn.commit()
    conn.close()
    return {"mensagem": "Agendamento deletado com sucesso"}
```

> **Por que o DELETE aqui não tem `try/except`, como em cliente e tatuador?** Porque nenhuma outra tabela do banco referencia `agendamento` como chave estrangeira — ele é sempre o "filho", nunca o "pai". Então não existe como esse delete falhar por causa de uma FK. Vale a pena parar aqui e perguntar aos alunos: por que cliente e tatuador precisavam do `try/except` e agendamento não?

**Teste:** no `/docs`, use `DELETE /agendamentos/{id}` para excluir um agendamento. Depois acesse `GET /agendamentos` para confirmar que ele sumiu da lista. Nesse ponto o grupo `/agendamentos` já deve ter as 5 rotas completas (listar, buscar, criar, atualizar, deletar).

---

## Parte 9 — Frontend: HTML

Crie `frontend/agendamentos.html`:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Agendamentos — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-4">

  <nav class="navbar navbar-dark bg-dark mb-4">
    <div class="container">
      <span class="navbar-brand">Estúdio de Tatuagem</span>
      <div>
        <a href="clientes.html" class="text-light me-3">Clientes</a>
        <a href="senioridade.html" class="text-light me-3">Senioridade</a>
        <a href="tatuadores.html" class="text-light me-3">Tatuadores</a>
        <a href="agendamentos.html" class="text-light">Agendamentos</a>
      </div>
    </div>
  </nav>

  <h1>Agendamentos</h1>

  <!-- Formulário para cadastrar novo agendamento -->
  <form id="form-agendamento" class="row g-2 mt-2 mb-4">
    <div class="col-md-3">
      <select id="idcliente" class="form-select" required>
        <option value="">Cliente...</option>
      </select>
    </div>
    <div class="col-md-3">
      <select id="idtatuador" class="form-select" required>
        <option value="">Tatuador...</option>
      </select>
    </div>
    <div class="col-md-2">
      <input type="date" id="dataagendamento" class="form-control" required>
    </div>
    <div class="col-md-2">
      <input type="time" id="horaagendamento" class="form-control" required>
    </div>
    <div class="col-md-2">
      <input type="number" id="valortatuagem" class="form-control" placeholder="Valor (R$)" step="0.01" min="0">
    </div>
    <div class="col-md-12">
      <textarea id="descricaotatuagem" class="form-control" placeholder="Descrição da tatuagem"></textarea>
    </div>

    <!-- Esse bloco começa escondido — só aparece quando estamos editando um agendamento existente -->
    <div class="col-md-3" id="bloco-status" style="display: none;">
      <select id="status" class="form-select">
        <option value="pendente">Pendente</option>
        <option value="confirmado">Confirmado</option>
        <option value="concluido">Concluído</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>

    <div class="col-md-2">
      <button id="btn-submit-agendamento" type="submit" class="btn btn-primary w-100">Cadastrar</button>
    </div>
  </form>

  <!-- Tabela onde os agendamentos vão aparecer -->
  <table class="table table-bordered">
    <thead>
      <tr>
        <th>ID</th>
        <th>Cliente</th>
        <th>Tatuador</th>
        <th>Data</th>
        <th>Hora</th>
        <th>Valor</th>
        <th>Status</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="corpo-tabela">
      <!-- os agendamentos vão aparecer aqui -->
    </tbody>
  </table>

  <script src="js/agendamentos.js"></script>

</body>
</html>
```

---

## Parte 10 — Frontend: JavaScript

Crie `frontend/js/agendamentos.js`:

```javascript
// endereço da nossa API backend
const API = 'http://127.0.0.1:8000'

// elementos do formulário e do botão de enviar
const formAgendamento = document.getElementById('form-agendamento')
const botaoSubmit = document.getElementById('btn-submit-agendamento')
const blocoStatus = document.getElementById('bloco-status')

// limpa o formulário e devolve para o modo de cadastro
function limparFormulario() {
  formAgendamento.reset()
  delete formAgendamento.dataset.idAgendamento
  botaoSubmit.textContent = 'Cadastrar'
  botaoSubmit.classList.remove('btn-success')
  botaoSubmit.classList.add('btn-primary')
  blocoStatus.style.display = 'none'   // esconde o status de novo — cadastro não usa esse campo
}

// ─── Busca os clientes na API e preenche o <select> ───
async function carregarClientes() {
  const resposta = await fetch(`${API}/clientes`)
  const clientes = await resposta.json()

  const select = document.getElementById('idcliente')
  select.innerHTML = '<option value="">Cliente...</option>'

  clientes.forEach(c => {
    select.innerHTML += `<option value="${c.idcliente}">${c.nome}</option>`
  })
}

// ─── Busca os tatuadores na API e preenche o <select> ───
async function carregarTatuadores() {
  const resposta = await fetch(`${API}/tatuadores`)
  const tatuadores = await resposta.json()

  const select = document.getElementById('idtatuador')
  select.innerHTML = '<option value="">Tatuador...</option>'

  tatuadores.forEach(t => {
    select.innerHTML += `<option value="${t.idtatuador}">${t.nometatuador}</option>`
  })
}

carregarClientes()
carregarTatuadores()

// ─── Carrega a lista de agendamentos ao abrir a página ───
async function listarAgendamentos() {
  const resposta = await fetch(`${API}/agendamentos`)
  const agendamentos = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  agendamentos.forEach(a => {
    corpo.innerHTML += `
      <tr>
        <td>${a.idagendamento}</td>
        <td>${a.cliente}</td>
        <td>${a.tatuador}</td>
        <td>${a.dataagendamento}</td>
        <td>${a.horaagendamento}</td>
        <td>${a.valortatuagem ?? '-'}</td>
        <td>${a.status}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(a)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarAgendamento(${a.idagendamento})">Excluir</button>
        </td>
      </tr>`
  })
}

listarAgendamentos()

// ─── Cadastrar e atualizar agendamentos ───
formAgendamento.addEventListener('submit', async (e) => {
  e.preventDefault()

  const agendamento = {
    idcliente: Number(document.getElementById('idcliente').value),
    idtatuador: Number(document.getElementById('idtatuador').value),
    dataagendamento: document.getElementById('dataagendamento').value,
    horaagendamento: document.getElementById('horaagendamento').value,
    descricaotatuagem: document.getElementById('descricaotatuagem').value || null,
    valortatuagem: document.getElementById('valortatuagem').value
      ? Number(document.getElementById('valortatuagem').value)
      : null,
    status: document.getElementById('status').value
  }
  // no cadastro, o campo status vai vazio dentro do JSON — sem problema,
  // porque o INSERT no backend nem usa esse valor (o banco aplica 'pendente' sozinho)

  const idAgendamento = formAgendamento.dataset.idAgendamento

  if (idAgendamento) {
    await fetch(`${API}/agendamentos/${idAgendamento}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendamento)
    })
  } else {
    await fetch(`${API}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendamento)
    })
  }

  limparFormulario()
  listarAgendamentos()
})

// ─── Abre os dados do agendamento no formulário para edição ───
function preencherFormularioEdicao(agendamento) {
  document.getElementById('idcliente').value = agendamento.idcliente
  document.getElementById('idtatuador').value = agendamento.idtatuador
  document.getElementById('dataagendamento').value = agendamento.dataagendamento
  document.getElementById('horaagendamento').value = agendamento.horaagendamento
  document.getElementById('descricaotatuagem').value = agendamento.descricaotatuagem || ''
  document.getElementById('valortatuagem').value = agendamento.valortatuagem || ''

  document.getElementById('status').value = agendamento.status
  blocoStatus.style.display = 'block'   // só na edição o campo de status aparece

  formAgendamento.dataset.idAgendamento = agendamento.idagendamento

  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}

// ─── Exclui um agendamento ───
async function deletarAgendamento(id) {
  if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

  await fetch(`${API}/agendamentos/${id}`, { method: 'DELETE' })
  listarAgendamentos()
}
```

**Teste:** abra `agendamentos.html`. Os `<select>` de cliente e tatuador devem vir preenchidos sozinhos. Cadastre um agendamento e confirme que ele aparece na tabela com status "pendente", mesmo sem o campo status ter aparecido no formulário. Depois clique em Editar e confirme que o `<select>` de status só aparece agora, já com o valor certo marcado.

---

## Parte 11 — Atualizando a navegação

Adicione o link "Agendamentos" na navbar de `clientes.html`, `senioridade.html` e `tatuadores.html`, deixando as quatro páginas com a mesma barra:

```html
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container">
    <span class="navbar-brand">Estúdio de Tatuagem</span>
    <div>
      <a href="clientes.html" class="text-light me-3">Clientes</a>
      <a href="senioridade.html" class="text-light me-3">Senioridade</a>
      <a href="tatuadores.html" class="text-light me-3">Tatuadores</a>
      <a href="agendamentos.html" class="text-light">Agendamentos</a>
    </div>
  </div>
</nav>
```

---

## Erros comuns

- **Erro 422 ao cadastrar:** confira se `idcliente`, `idtatuador` e `valortatuagem` foram convertidos com `Number(...)` antes de montar o JSON — mesma causa do erro que já vimos na Aula 7 com `idsenioridade`.
- **`<select>` de cliente ou tatuador aparece vazio:** confira se `carregarClientes()` e `carregarTatuadores()` estão sendo chamadas, e se já existe pelo menos um cliente e um tatuador cadastrados.
- **`horaagendamento` aparece como um número gigante (tipo `50400`) em vez de uma hora:** o `mysql-connector-python` lê colunas `TIME` como um `timedelta` (tempo decorrido, não um horário), e sem conversão o FastAPI transforma isso no total de segundos. É por isso que as rotas de listar e buscar (Partes 5 e 6) convertem esse valor pra `"HH:MM:SS"` antes de devolver — se você pular essa parte, é isso que vai aparecer na tabela e o `<input type="time">` também não vai preencher certo na edição.
- **Esqueceu de atualizar a navbar:** se clicar em "Agendamentos" numa página antiga e não tiver o link, é só repetir o bloco da Parte 11 nas páginas que faltaram.

---

## Estrutura do projeto até agora

```
estudio-tatuagem-api/
├── aulas/
├── backend/
│   ├── rotas/
│   │   ├── __init__.py
│   │   ├── clientes.py
│   │   ├── senioridade.py
│   │   ├── tatuadores.py
│   │   └── agendamentos.py    ← novo
│   ├── venv/
│   ├── .env
│   ├── database.py
│   ├── main.py                ← atualizado (rota nova)
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   ├── clientes.js
│   │   ├── senioridade.js
│   │   ├── tatuadores.js
│   │   └── agendamentos.js    ← novo
│   ├── clientes.html          ← atualizado (navbar)
│   ├── senioridade.html       ← atualizado (navbar)
│   ├── tatuadores.html        ← atualizado (navbar)
│   └── agendamentos.html      ← novo
├── banco/
│   └── estudio_tatuagem.sql
├── .gitignore
└── REGRAS.md
```

> **Não esqueça de salvar o banco antes de encerrar.** Durante essa aula você cadastrou e alterou agendamentos de teste — se a máquina for reiniciada sem exportar, esses dados somem e a Aula 9 vai começar sem nenhum agendamento pra testar o upload de imagem. No phpMyAdmin: aba **Exportar** → método **Personalizado** → formato **SQL** → confirme que todas as tabelas estão marcadas → clique em **Exportar** e substitua o arquivo em [banco/estudio_tatuagem.sql](banco/estudio_tatuagem.sql) (mesmo processo da Aula 2, Passo 4).

---

## Próxima aula

Na **Aula 9** vamos voltar no formulário de Agendamentos só para adicionar o upload de imagem do desenho aprovado — usando `<input type="file">` no HTML, `FormData` no JavaScript e `UploadFile` no FastAPI, salvando o arquivo numa pasta do projeto.
