# Aula 6 — Frontend de Clientes

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

---

## O que vamos fazer nessa aula

1. Entender o que é CORS e por que ele existe
2. Configurar o CORS no `main.py`
3. Criar o `clientes.html` com a estrutura da página
4. Criar o `js/clientes.js` com toda a lógica
5. Testar tudo no navegador

---

## Parte 1 — O que é CORS?

Até agora testamos a API pelo `/docs`. Mas numa aplicação real, quem chama a API é uma página HTML.

O problema: o navegador bloqueia por segurança chamadas entre origens diferentes.

**Origem** = protocolo + endereço + porta. Exemplos:
- `file://` → arquivo aberto direto no computador
- `http://127.0.0.1:8000` → API rodando no servidor
- `http://meusite.com` → site em produção

Quando o HTML e a API estão em origens diferentes, o navegador barra a requisição e mostra um erro de **CORS**.

Isso é proposital — imagina se qualquer site pudesse chamar a API do seu banco sem permissão.

**CORS** (Cross-Origin Resource Sharing) é o mecanismo que permite ou bloqueia essas chamadas. Nós configuramos na API quais origens têm permissão.

---

## Parte 2 — Configurando o CORS no main.py

Abra o `backend/main.py` e substitua o conteúdo:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # importa o middleware de CORS
from rotas import clientes

app = FastAPI()

# Configura quais origens têm permissão de chamar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # "*" = qualquer origem (usado em desenvolvimento)
    allow_methods=["*"],      # permite todos os métodos (GET, POST, PUT, DELETE)
    allow_headers=["*"],      # permite todos os cabeçalhos
)

app.include_router(clientes.router)


@app.get("/")
def inicio():
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}
```

### O que essa função faz?

A função `app.add_middleware(...)` serve para dizer ao FastAPI: "permita que páginas HTML de outras origens possam chamar esta API".

Em outras palavras, ela abre uma porta de comunicação entre o frontend e o backend.

Sem essa configuração, o navegador pode bloquear a requisição por segurança, mesmo que a API esteja funcionando.
> Neste projeto escolar, deixamos tudo livre com `allow_origins=["*"]` para facilitar o aprendizado e os testes.
> Em um projeto de verdade, uma empresa normalmente não deixaria tudo aberto assim.
> Em geral, ela define apenas os sites autorizados, e pode adicionar regras de segurança como autenticação, login, usuário e senha, e controle de permissões.
>> Em produção, `allow_origins=["*"]` seria substituído pelo endereço real do seu site,
> por exemplo: `allow_origins=["https://meusite.com"]`.
> Para desenvolvimento, `"*"` libera tudo e facilita os testes.

Salve o arquivo — o uvicorn vai reiniciar automaticamente.

---

## Parte 3 — Criando o HTML

Crie o arquivo `frontend/clientes.html`. Não esqueça de sair da pasta backend


O HTML cuida apenas da **estrutura da página** — títulos, tabela, formulário.
A lógica (buscar dados, cadastrar, excluir) vai ficar no arquivo JS separado.

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Clientes — Estúdio de Tatuagem</title>
  <!-- Bootstrap: biblioteca de estilos prontos -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-4">

  <h1>Clientes</h1>

  <!-- Formulário para cadastrar novo cliente -->
  <form id="form-cliente" class="row g-2 mt-2 mb-4">
    <div class="col-md-3">
      <input type="text" id="nome" class="form-control" placeholder="Nome" required>
    </div>
    <div class="col-md-2">
      <input type="text" id="cpf" class="form-control" placeholder="CPF (só números)" required>
    </div>
    <div class="col-md-2">
      <input type="text" id="telefone" class="form-control" placeholder="Telefone">
    </div>
    <div class="col-md-2">
      <input type="text" id="cidade" class="form-control" placeholder="Cidade">
    </div>
    <div class="col-md-1">
      <input type="text" id="uf" class="form-control" placeholder="UF" maxlength="2">
    </div>
    <div class="col-md-2">
      <button id="btn-submit-cliente" type="submit" class="btn btn-primary w-100">Cadastrar</button>
    </div>
  </form>

  <!-- Tabela onde os clientes vão aparecer -->
  <table class="table table-bordered">
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>CPF</th>
        <th>Telefone</th>
        <th>Cidade</th>
        <th>UF</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="corpo-tabela">
      <!-- os clientes vão aparecer aqui -->
    </tbody>
  </table>

  <!-- Importa o arquivo JavaScript separado -->
  <script src="js/clientes.js"></script>

</body>
</html>
```

**Teste:** abra o `clientes.html` no navegador agora. A tabela aparece vazia — normal, ainda não criamos o JS.

---

## Parte 4 — Criando o JavaScript

Crie o arquivo `frontend/js/clientes.js`. Vamos construir função por função.

### 4.1 — Estrutura inicial do JavaScript

Cole no `js/clientes.js` e salve:

```javascript
const API = 'http://127.0.0.1:8000'  // endereço da nossa API
const formCliente = document.getElementById('form-cliente')
const botaoSubmit = document.getElementById('btn-submit-cliente')

function limparFormulario() {
  formCliente.reset()
  delete formCliente.dataset.idCliente
  botaoSubmit.textContent = 'Cadastrar'
  botaoSubmit.classList.remove('btn-success')
  botaoSubmit.classList.add('btn-primary')
}
```

### 4.2 — Listar clientes

No código abaixo, dentro da coluna `Ações` de cada linha da tabela, adicione o botão `Editar` e o botão `Excluir`:

```javascript
async function listarClientes() {
  const resposta = await fetch(`${API}/clientes`)
  const clientes = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  clientes.forEach(c => {
    corpo.innerHTML += `
      <tr>
        <td>${c.idcliente}</td>
        <td>${c.nome}</td>
        <td>${c.cpf}</td>
        <td>${c.telefone ?? '-'}</td>
        <td>${c.cidade ?? '-'}</td>
        <td>${c.uf ?? '-'}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(c)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarCliente(${c.idcliente})">Excluir</button>
        </td>
      </tr>`
  })
}

listarClientes()
```

**Teste:** recarregue o `clientes.html` no navegador. Os clientes do banco devem aparecer na tabela.

Lembrando que para aparecer o `uvicorn main:app --reload` precisa estar rodando no terminal, a API não pode estar parada.

Observe que o botão `Editar` já está dentro do próprio código da função `listarClientes()`, na parte que monta a linha da tabela. Ele chama `preencherFormularioEdicao()` para levar os dados do cliente para o formulário.

---

### 4.3 — Cadastrar e atualizar clientes

Adicione abaixo no `js/clientes.js`:

```javascript
formCliente.addEventListener('submit', async (e) => {
  e.preventDefault()

  const cliente = {
    nome: document.getElementById('nome').value,
    cpf: document.getElementById('cpf').value,
    telefone: document.getElementById('telefone').value || null,
    datacadastro: new Date().toISOString().split('T')[0],
    cidade: document.getElementById('cidade').value || null,
    uf: document.getElementById('uf').value || null
  }

  const idCliente = formCliente.dataset.idCliente

  if (idCliente) {
    await fetch(`${API}/clientes/${idCliente}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    })
  } else {
    await fetch(`${API}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    })
  }

  limparFormulario()
  listarClientes()
})
```

Agora adicione a função para abrir os dados do cliente no formulário:

```javascript
function preencherFormularioEdicao(cliente) {
  document.getElementById('nome').value = cliente.nome
  document.getElementById('cpf').value = cliente.cpf
  document.getElementById('telefone').value = cliente.telefone || ''
  document.getElementById('cidade').value = cliente.cidade || ''
  document.getElementById('uf').value = cliente.uf || ''

  formCliente.dataset.idCliente = cliente.idcliente
  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}
```

**Importante:** o formulário guarda o `id` do cliente em `formCliente.dataset.idCliente`. Quando esse valor existe, o submit faz `PUT`; quando não existe, faz `POST`.

Para que a atualização funcione, o backend também precisa ter a rota `PUT /clientes/{id}` definida em `backend/rotas/clientes.py`.

O botão `Editar` precisa estar dentro do próprio código que monta a linha da tabela e chamar essa função com os dados do cliente, como no exemplo acima.

**Teste:** preencha o formulário e clique em Cadastrar. O novo cliente deve aparecer na tabela. Depois clique em Editar em um cliente existente, altere os dados e clique em Salvar alteração. O cliente deve ser atualizado na tela.

---

### 4.4 — Excluir cliente

Adicione abaixo no `js/clientes.js`:

```javascript
async function deletarCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return

  await fetch(`${API}/clientes/${id}`, { method: 'DELETE' })
  listarClientes()
}
```

**Teste:** clique em Excluir em qualquer cliente. Ele deve sumir da tabela.

---

## Como o fetch funciona

O `fetch` é a função JavaScript que faz requisições HTTP — é o equivalente do `/docs`, mas dentro do código.

| O que fizemos     | Método   | Equivalente na API      |
|-------------------|----------|-------------------------|
| Carregar a tabela | `GET`    | `GET /clientes`         |
| Cadastrar         | `POST`   | `POST /clientes`        |
| Excluir           | `DELETE` | `DELETE /clientes/{id}` |

---

## Estrutura do projeto até agora

```
estudio-tatuagem-api/
├── aulas/
├── backend/
│   ├── rotas/
│   │   ├── __init__.py
│   │   └── clientes.py
│   ├── venv/
│   ├── .env
│   ├── database.py
│   ├── main.py              ← atualizado (CORS)
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   └── clientes.js      ← novo
│   └── clientes.html        ← novo
├── .gitignore
└── REGRAS.md
```

---

## Próxima aula

Na **Aula 7** vamos criar o CRUD de tatuadores, que tem uma chave estrangeira com a tabela `senioridade`.
