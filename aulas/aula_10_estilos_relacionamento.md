# Aula 10 — Estilos e Relacionamento N:N com Tatuadores

## Antes de começar — relembrando o ambiente

Se a máquina foi reiniciada desde a última aula (ou você acabou de clonar o projeto numa máquina nova), repita os passos de sempre antes de continuar:

1. **Importe o banco de novo** no phpMyAdmin, aba **Importar**, usando `banco/estudio_tatuagem.sql` (processo completo na Aula 2, Passo 4).
2. **Recrie o arquivo `.env`** dentro da pasta `backend`:
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

> **Lembrete das Aulas 7/8:** você vai criar o arquivo `rotas/estilos.py` nessa aula. Se ele não aparecer em `/docs` com o servidor já ligado, pare com **Ctrl+C** e rode `uvicorn main:app --reload` de novo.

---

## O que vamos fazer nessa aula

1. Entender por que "estilo" precisa de uma tabela no meio pra se relacionar com tatuador
2. Criar o CRUD completo de Estilos (backend + frontend)
3. Fazer o cadastro de tatuador devolver o ID recém-criado (mesmo padrão da Aula 9)
4. Criar rotas pra listar e salvar quais estilos um tatuador domina
5. Adicionar checkboxes de estilo no formulário de tatuador

---

## Parte 1 — Por que Estilo é diferente de tudo que vimos até agora

Toda relação que vimos até aqui é **1 pra muitos**: um tatuador tem **uma** senioridade; um agendamento tem **um** cliente e **um** tatuador. Sempre uma FK apontando pra um único registro.

Estilo é diferente: **um tatuador pode dominar vários estilos, e um estilo pode ser dominado por vários tatuadores.** Pense em matérias de escola: um aluno cursa várias matérias, e uma matéria tem vários alunos — não dá pra guardar isso numa coluna só de `aluno` nem de `materia`. Isso se chama relacionamento **N:N (muitos para muitos)**.

> **Não precisa criar nada no banco nessa parte.** A tabela que resolve esse problema, `tatuador_estilo`, **já existe desde a Aula 2** — ela já foi criada e já tem dados de exemplo (o `INSERT` também foi lá). O trecho abaixo é só uma **lembrança** de como ela é, pra explicar o relacionamento, não um passo pra executar de novo:
>
> ```sql
> CREATE TABLE tatuador_estilo (
>     idtatuador INT NOT NULL,
>     idestilo   INT NOT NULL,
>     dataestilo DATE,
>     PRIMARY KEY (idtatuador, idestilo),
>     FOREIGN KEY (idtatuador) REFERENCES tatuador(idtatuador),
>     FOREIGN KEY (idestilo)   REFERENCES estilo(idestilo)
> );
> ```

Repare que a chave primária dessa tabela é a **combinação** de `idtatuador` + `idestilo` — cada linha representa "esse tatuador domina esse estilo", nada mais. É por causa dela existir que as rotas que vamos criar (Partes 6 e 7) conseguem funcionar sem precisar mexer no banco.

---

## Parte 2 — Backend: CRUD de Estilo

Crie `backend/rotas/estilos.py`. A tabela `estilo` (`idestilo`, `descricao`) é simples, sem FK — você já sabe fazer esse CRUD:

```python
# ============================================================
# rotas/estilos.py — CRUD de Estilos
# Descrição: Endpoints para gerenciar os estilos de tatuagem
#            (Blackwork, Aquarela, Realismo, Old School...).
# ============================================================

from fastapi import APIRouter
from pydantic import BaseModel
from database import conectar

router = APIRouter()

# Modelo de dados — define os campos que o estilo deve ter
class Estilo(BaseModel):
    descricao: str    # obrigatório — ex: "Blackwork", "Aquarela"

# GET /estilos — lista todos os estilos
@router.get("/estilos")
def listar_estilos():
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM estilo")
    estilos = cursor.fetchall()
    conn.close()
    return estilos

# GET /estilos/{id} — busca um estilo pelo ID
@router.get("/estilos/{id}")
def buscar_estilo(id: int):
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM estilo WHERE idestilo = %s", (id,))
    estilo = cursor.fetchone()
    conn.close()
    if not estilo:
        return {"erro": "Estilo não encontrado"}
    return estilo

# POST /estilos — cadastra um novo estilo
@router.post("/estilos")
def criar_estilo(estilo: Estilo):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO estilo (descricao) VALUES (%s)", (estilo.descricao,))
    conn.commit()
    conn.close()
    return {"mensagem": "Estilo cadastrado com sucesso"}

# PUT /estilos/{id} — atualiza um estilo existente
@router.put("/estilos/{id}")
def atualizar_estilo(id: int, estilo: Estilo):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("UPDATE estilo SET descricao=%s WHERE idestilo=%s", (estilo.descricao, id))
    conn.commit()
    conn.close()
    return {"mensagem": "Estilo atualizado com sucesso"}

# DELETE /estilos/{id} — deleta um estilo
@router.delete("/estilos/{id}")
def deletar_estilo(id: int):
    conn = conectar()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM estilo WHERE idestilo = %s", (id,))
        conn.commit()
        conn.close()
        return {"mensagem": "Estilo deletado com sucesso"}
    except Exception as erro:
        conn.rollback()
        conn.close()
        return {"erro": "Não foi possível excluir este estilo. Verifique se algum tatuador já foi marcado com ele."}
```

---

## Parte 3 — Registrando a rota no main.py

```python
from rotas import clientes, senioridade, tatuadores, agendamentos, estilos   # ← adiciona estilos aqui
...
app.include_router(estilos.router)   # ← registra a nova rota
```

**Teste:** acesse `/docs` e confirme que o grupo `/estilos` aparece com as 5 rotas. O banco de exemplo já vem com "Blackwork", "Aquarela", "Realismo" e "Old School" cadastrados.

---

## Parte 4 — Frontend de Estilo

Crie `frontend/estilos.html` — mesmo padrão de `senioridade.html`:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Estilos — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-4">

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

  <h1>Estilos</h1>

  <form id="form-estilo" class="row g-2 mt-2 mb-4">
    <div class="col-md-4">
      <input type="text" id="descricao" class="form-control" placeholder="Descrição (ex: Blackwork)" required>
    </div>
    <div class="col-md-2">
      <button id="btn-submit-estilo" type="submit" class="btn btn-primary w-100">Cadastrar</button>
    </div>
  </form>

  <table class="table table-bordered">
    <thead>
      <tr>
        <th>ID</th>
        <th>Descrição</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="corpo-tabela">
    </tbody>
  </table>

  <script src="js/estilos.js"></script>

</body>
</html>
```

Crie `frontend/js/estilos.js` — mesmo padrão de `senioridade.js`:

```javascript
const API = 'http://127.0.0.1:8000'
const formEstilo = document.getElementById('form-estilo')
const botaoSubmit = document.getElementById('btn-submit-estilo')

function limparFormulario() {
  formEstilo.reset()
  delete formEstilo.dataset.idEstilo
  botaoSubmit.textContent = 'Cadastrar'
  botaoSubmit.classList.remove('btn-success')
  botaoSubmit.classList.add('btn-primary')
}

async function listarEstilos() {
  const resposta = await fetch(`${API}/estilos`)
  const estilos = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  estilos.forEach(e => {
    corpo.innerHTML += `
      <tr>
        <td>${e.idestilo}</td>
        <td>${e.descricao}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(e)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarEstilo(${e.idestilo})">Excluir</button>
        </td>
      </tr>`
  })
}

listarEstilos()

formEstilo.addEventListener('submit', async (e) => {
  e.preventDefault()

  const estilo = { descricao: document.getElementById('descricao').value }
  const idEstilo = formEstilo.dataset.idEstilo

  if (idEstilo) {
    await fetch(`${API}/estilos/${idEstilo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estilo)
    })
  } else {
    await fetch(`${API}/estilos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estilo)
    })
  }

  limparFormulario()
  listarEstilos()
})

function preencherFormularioEdicao(estilo) {
  document.getElementById('descricao').value = estilo.descricao
  formEstilo.dataset.idEstilo = estilo.idestilo
  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}

async function deletarEstilo(id) {
  if (!confirm('Tem certeza que deseja excluir este estilo?')) return
  await fetch(`${API}/estilos/${id}`, { method: 'DELETE' })
  listarEstilos()
}
```

**Teste:** abra `estilos.html`, confirme que os 4 estilos de exemplo aparecem, e teste cadastrar/editar/excluir.

---

## Parte 5 — Backend: o cadastro de tatuador passa a devolver o ID

Igual fizemos com agendamento na Aula 9: pra marcar quais estilos um tatuador **recém-criado** domina, o frontend precisa saber o `id` dele.

Em `rotas/tatuadores.py`, vamos alterar a função `criar_tatuador` que **já existe** — não é uma rota nova.

> **Atenção pra não duplicar** (mesmo aviso da Aula 9): apague a função `criar_tatuador` inteira antes de colar a versão abaixo no lugar dela. Se preferir mais seguro, edite só a linha nova (`novo_id = cursor.lastrowid`) e o `return`, direto na função que já existe.

```python
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
    novo_id = cursor.lastrowid   # o ID que o MySQL gerou sozinho pro novo tatuador
    conn.commit()
    conn.close()
    return {"mensagem": "Tatuador cadastrado com sucesso", "idtatuador": novo_id}
```

**Teste:** no `/docs`, cadastre um tatuador novo e confirme que a resposta agora inclui `"idtatuador": <algum número>`.

---

## Parte 6 — Backend: listar os estilos de um tatuador

Ainda em `rotas/tatuadores.py`, adicione no final do arquivo:

```python
# GET /tatuadores/{id}/estilos — lista os estilos que esse tatuador já domina
@router.get("/tatuadores/{id}/estilos")
def listar_estilos_do_tatuador(id: int):
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT estilo.idestilo, estilo.descricao
        FROM tatuador_estilo
        JOIN estilo ON tatuador_estilo.idestilo = estilo.idestilo
        WHERE tatuador_estilo.idtatuador = %s
    """, (id,))
    estilos = cursor.fetchall()
    conn.close()
    return estilos
```

**Teste:** no `/docs`, teste com o `id` de algum tatuador do banco de exemplo (o Lucas Mendes, `id 1`, já vem com Blackwork e Realismo cadastrados na Aula 2).

---

## Parte 7 — Backend: salvar os estilos marcados

Ainda em `rotas/tatuadores.py`, adicione o import de `List` e o modelo novo no topo do arquivo:

```python
from typing import Optional, List
```

```python
# Modelo de dados — lista de ids de estilo marcados no formulário
class EstilosDoTatuador(BaseModel):
    idestilos: List[int]
```

E a rota, no final do arquivo:

```python
# PUT /tatuadores/{id}/estilos — substitui a lista de estilos desse tatuador
@router.put("/tatuadores/{id}/estilos")
def atualizar_estilos_do_tatuador(id: int, dados: EstilosDoTatuador):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM tatuador_estilo WHERE idtatuador = %s", (id,))
    # apaga tudo que já existia pra esse tatuador e insere de novo —
    # mais simples do que comparar o que foi marcado/desmarcado

    for idestilo in dados.idestilos:
        cursor.execute(
            "INSERT INTO tatuador_estilo (idtatuador, idestilo, dataestilo) VALUES (%s, %s, CURDATE())",
            (id, idestilo)
        )

    conn.commit()
    conn.close()
    return {"mensagem": "Estilos atualizados com sucesso"}
```

### Exemplo de JSON para testar

```json
{
  "idestilos": [1, 3]
}
```

> Mandar uma lista vazia (`"idestilos": []`) é válido — significa "esse tatuador não domina nenhum estilo agora", e apaga tudo que existia antes.

**Teste:** no `/docs`, use essa rota pra marcar 2 estilos num tatuador. Depois confira com `GET /tatuadores/{id}/estilos` se voltaram certos.

---

## Parte 8 — Frontend: checkboxes de estilo no formulário de tatuador

Em `frontend/tatuadores.html`, adicione um bloco de checkboxes — pode ser antes do botão de cadastrar:

```html
<div class="col-md-12">
  <label class="form-label">Estilos que domina</label>
  <div id="lista-estilos" class="d-flex flex-wrap gap-3">
    <!-- os checkboxes são preenchidos pelo JavaScript -->
  </div>
</div>
```

Em `frontend/js/tatuadores.js`, adicione a função que carrega os checkboxes:

```javascript
// ─── Busca os estilos na API e monta os checkboxes ───
async function carregarEstilos() {
  const resposta = await fetch(`${API}/estilos`)
  const estilos = await resposta.json()

  const lista = document.getElementById('lista-estilos')
  lista.innerHTML = ''

  estilos.forEach(e => {
    lista.innerHTML += `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${e.idestilo}" id="estilo-${e.idestilo}">
        <label class="form-check-label" for="estilo-${e.idestilo}">${e.descricao}</label>
      </div>`
  })
}

carregarEstilos()
```

Agora atualize o `submit` do formulário — depois de cadastrar/atualizar o tatuador (igual já fazia), envie os estilos marcados numa **segunda chamada**, mesmo padrão da imagem na Aula 9:

```javascript
formTatuador.addEventListener('submit', async (e) => {
  e.preventDefault()

  const tatuador = {
    nometatuador: document.getElementById('nometatuador').value,
    cpf: document.getElementById('cpf').value,
    email: document.getElementById('email').value || null,
    telefone: document.getElementById('telefone').value || null,
    datacontratacao: new Date().toISOString().split('T')[0],
    idsenioridade: Number(document.getElementById('idsenioridade').value)
  }

  const idTatuador = formTatuador.dataset.idTatuador
  let idParaEstilos = idTatuador   // qual id vamos usar pra salvar os estilos

  if (idTatuador) {
    await fetch(`${API}/tatuadores/${idTatuador}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tatuador)
    })
  } else {
    const resposta = await fetch(`${API}/tatuadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tatuador)
    })
    const dados = await resposta.json()
    idParaEstilos = dados.idtatuador   // pega o id que acabou de ser criado
  }

  // ─── Salva os estilos marcados, numa segunda chamada ───
  const idsMarcados = Array.from(document.querySelectorAll('#lista-estilos input:checked'))
    .map(checkbox => Number(checkbox.value))

  await fetch(`${API}/tatuadores/${idParaEstilos}/estilos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idestilos: idsMarcados })
  })

  limparFormulario()
  listarTatuadores()
})
```

Por fim, ajuste `preencherFormularioEdicao` pra marcar os checkboxes certos ao editar — repare que ela vira uma função `async`, porque agora busca dados na API antes de terminar:

```javascript
// ─── Abre os dados do tatuador no formulário para edição ───
async function preencherFormularioEdicao(tatuador) {
  document.getElementById('nometatuador').value = tatuador.nometatuador
  document.getElementById('cpf').value = tatuador.cpf
  document.getElementById('email').value = tatuador.email || ''
  document.getElementById('telefone').value = tatuador.telefone || ''
  document.getElementById('idsenioridade').value = tatuador.idsenioridade

  formTatuador.dataset.idTatuador = tatuador.idtatuador

  // desmarca todos os checkboxes antes de marcar os certos
  document.querySelectorAll('#lista-estilos input').forEach(cb => cb.checked = false)

  const resposta = await fetch(`${API}/tatuadores/${tatuador.idtatuador}/estilos`)
  const estilosDoTatuador = await resposta.json()
  estilosDoTatuador.forEach(e => {
    const checkbox = document.getElementById(`estilo-${e.idestilo}`)
    if (checkbox) checkbox.checked = true
  })

  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}
```

**Teste:** cadastre um tatuador marcando 2 estilos. Depois clique em Editar nele e confirme que os checkboxes certos já aparecem marcados.

---

## Parte 9 — Atualizando a navegação

Adicione o link "Estilos" na navbar de `clientes.html`, `senioridade.html`, `tatuadores.html` e `agendamentos.html`, seguindo o mesmo bloco usado na Parte 4 dessa aula.

---

## Parte 10 — Mostrando os estilos na listagem de tatuadores

Até aqui, os estilos só aparecem na tela de edição de um tatuador — a tabela de listagem não mostra nada. Pra resolver isso numa consulta só, vamos usar uma função de agregação do SQL que ainda não tinha aparecido: **`GROUP_CONCAT`**, que junta vários valores numa string só (por exemplo, "Blackwork" + "Realismo" vira `"Blackwork, Realismo"`).

Em `rotas/tatuadores.py`, vamos alterar a função `listar_tatuadores` que **já existe** — não é uma rota nova.

> **Atenção pra não duplicar** (mesmo aviso de sempre): apague a função `listar_tatuadores` inteira antes de colar a versão abaixo no lugar dela.

```python
# GET /tatuadores — lista todos os tatuadores, já com senioridade e estilos
@router.get("/tatuadores")
def listar_tatuadores():
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT tatuador.*, senioridade.nome AS senioridade,
               GROUP_CONCAT(estilo.descricao SEPARATOR ', ') AS estilos
        FROM tatuador
        JOIN senioridade ON tatuador.idsenioridade = senioridade.idsenioridade
        LEFT JOIN tatuador_estilo ON tatuador.idtatuador = tatuador_estilo.idtatuador
        LEFT JOIN estilo ON tatuador_estilo.idestilo = estilo.idestilo
        GROUP BY tatuador.idtatuador
    """)
    tatuadores = cursor.fetchall()
    conn.close()
    return tatuadores
```

> **Por que `LEFT JOIN` e não `JOIN` pra estilo?** Um tatuador pode não ter nenhum estilo marcado ainda. Com `JOIN` normal, esse tatuador sumiria da lista inteira (porque não existe nenhuma linha combinando com ele em `tatuador_estilo`). Com `LEFT JOIN`, ele continua aparecendo, só que com `estilos` vindo `null`.
>
> **Por que `GROUP BY tatuador.idtatuador`?** O `GROUP_CONCAT` precisa saber "juntar os estilos de quem" — o `GROUP BY` agrupa todas as linhas de um mesmo tatuador (que antes do agrupamento apareceriam repetidas, uma por estilo) numa linha só.

Em `frontend/tatuadores.html`, adicione uma coluna nova no cabeçalho da tabela, antes de "Ações":

```html
<th>Estilos</th>
```

Em `frontend/js/tatuadores.js`, adicione a célula correspondente em `listarTatuadores()` (antes da célula de Ações):

```javascript
<td>${t.estilos ?? '-'}</td>
```

**Teste:** recarregue `tatuadores.html`. Quem já tem estilo marcado deve mostrar algo como "Blackwork, Realismo" na coluna nova; quem não tem nenhum deve mostrar "-".

---

## Erros comuns

- **Os checkboxes não aparecem:** confira se `carregarEstilos()` está sendo chamada e se existe pelo menos um estilo cadastrado.
- **Ao editar, nenhum checkbox vem marcado:** confira se `preencherFormularioEdicao` virou `async function` e se o `await fetch(...)` está mesmo lá dentro — sem o `async`, o JavaScript nem deixa usar `await`.
- **Os estilos somem depois de salvar:** confira se `idsMarcados` está sendo montado a partir de `#lista-estilos input:checked` (só os marcados), e não de todos os checkboxes.
- **Erro ao excluir um estilo:** se algum tatuador já foi marcado com ele, o delete vai falhar — mesma lógica de FK que já vimos em cliente, tatuador e senioridade.
- **Erro de SQL mencionando `ONLY_FULL_GROUP_BY` na Parte 10:** algumas instalações de MySQL/MariaDB são mais rígidas sobre o que pode aparecer no `SELECT` quando tem `GROUP BY`. Se isso acontecer, me avisa que ajustamos juntas — não apareceu nos testes até agora, mas é uma configuração que varia de instalação pra instalação.

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
│   │   ├── tatuadores.py      ← atualizado (ID no cadastro + rotas de estilos do tatuador)
│   │   ├── agendamentos.py
│   │   └── estilos.py         ← novo
│   ├── uploads/
│   ├── venv/
│   ├── .env
│   ├── database.py
│   ├── main.py                ← atualizado (rota nova)
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   ├── clientes.js
│   │   ├── senioridade.js
│   │   ├── tatuadores.js      ← atualizado (checkboxes de estilo)
│   │   ├── agendamentos.js
│   │   └── estilos.js         ← novo
│   ├── clientes.html
│   ├── senioridade.html
│   ├── tatuadores.html        ← atualizado (checkboxes + navbar)
│   ├── agendamentos.html
│   └── estilos.html           ← novo
├── banco/
│   └── estudio_tatuagem.sql
├── .gitignore
└── REGRAS.md
```

> **Não esqueça de salvar o banco antes de encerrar** — exporte de novo no phpMyAdmin e atualize [banco/estudio_tatuagem.sql](banco/estudio_tatuagem.sql).

---

## Próxima aula

Com todas as entidades do sistema cobertas, a **Aula 11** vai ser uma faxina na organização da API: agrupar as rotas por assunto no `/docs` (usando `tags`) e, opcionalmente, simplificar os caminhos repetidos dentro de cada arquivo de rota (usando `prefix`).
