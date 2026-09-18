# Aula 9 — Upload de Imagem (Desenho Aprovado)

## Antes de começar — relembrando o ambiente

Se a máquina foi reiniciada desde a última aula (ou você acabou de clonar o projeto numa máquina nova), repita os passos de sempre antes de continuar:

1. **Importe o banco de novo** no phpMyAdmin, aba **Importar**, usando `banco/estudio_tatuagem.sql` (processo completo na Aula 2, Passo 4). Se você salvou o banco atualizado no fim da Aula 8 (com os agendamentos de teste), é esse arquivo que deve importar.
2. **Recrie o arquivo `.env`** dentro da pasta `backend` — ele não vai pro GitHub, então some toda vez que a máquina é reiniciada:
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

1. Entender por que uma imagem não pode ser enviada dentro de um JSON comum
2. Criar uma pasta no backend pra guardar as imagens e servi-las como arquivos estáticos
3. Criar uma rota nova, separada, só pra receber o upload do desenho aprovado
4. Fazer o cadastro de agendamento devolver o ID recém-criado
5. Adicionar o campo de arquivo no formulário e mandar a imagem numa segunda chamada
6. Mostrar a imagem enviada na tabela de agendamentos

---

## Parte 1 — Por que isso não é só mais um campo no formulário

Até agora, todo `POST`/`PUT` que fizemos manda um **JSON puro** (`Content-Type: application/json`) — texto, números, nada além disso. Um arquivo de imagem é binário, não cabe dentro de um JSON.

Pra mandar um arquivo, o navegador usa um formato diferente chamado **`multipart/form-data`**, montado no JavaScript com um `FormData` em vez de `JSON.stringify(...)`.

**Decisão importante:** em vez de reescrever o `POST`/`PUT` de agendamento que já funcionam pra aceitar `multipart/form-data` (o que exigiria mudar o modelo `Agendamento` inteiro), a imagem vai ter uma **rota própria**: `POST /agendamentos/{id}/desenho`. O fluxo fica assim:

1. O aluno cadastra ou edita o agendamento normalmente (exatamente como já funciona desde a Aula 8).
2. Se ele escolheu um arquivo, o frontend faz uma **segunda chamada**, só pra essa imagem.

Isso isola o conceito novo sem arriscar quebrar o CRUD que já está testado — e, de brinde, editar um agendamento nunca apaga a imagem sem querer, porque o `PUT` de sempre nem toca na coluna `desenhoaprovado`.

---

## Parte 2 — Backend: pasta de uploads e arquivos estáticos

Abra `backend/main.py` e atualize:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles   # ← novo: serve arquivos estáticos (as imagens enviadas)
from fastapi.middleware.cors import CORSMiddleware
from rotas import clientes, senioridade, tatuadores, agendamentos
import os   # ← novo: pra criar a pasta de uploads se ela não existir

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)   # garante que a pasta existe antes de tentar servir arquivos dela
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")   # ← serve as imagens

app.include_router(clientes.router)
app.include_router(senioridade.router)
app.include_router(tatuadores.router)
app.include_router(agendamentos.router)


@app.get("/")
def inicio():
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}
```

> `app.mount("/uploads", ...)` diz ao FastAPI: "tudo que chegar em `/uploads/algumacoisa.jpg` deve ser respondido direto com o arquivo dessa pasta, sem passar por nenhuma rota". É assim que a imagem salva vai poder ser exibida depois numa tag `<img>`.

Também vale adicionar `backend/uploads/` no `.gitignore` — são arquivos de teste, não faz sentido subir imagem pro GitHub (mesma lógica do `venv/` e do `.env`).

**Teste:** rode a API e acesse `/docs`. Não muda nada visível ainda, mas se não der nenhum erro ao subir o servidor, a pasta `backend/uploads/` já deve ter sido criada sozinha.

---

## Parte 3 — Backend: rota nova de upload

Antes de mexer no código, instale uma biblioteca nova. O FastAPI usa `UploadFile`/`File` pra entender upload de arquivo, mas isso depende de outro pacote por baixo dos panos:

Caso o projeto esteja rodando, aperte o Ctrl C para parar o projeto e conseguir digitar isso no terminal

```powershell
pip install python-multipart
```

> **Sem isso, a API nem consegue iniciar.** Assim que o Python encontrar uma rota usando `UploadFile`, o servidor quebra com esse erro:
> ```
> RuntimeError: Form data requires "python-multipart" to be installed.
> ```
> Se você já escreveu a rota da Parte 3 antes de instalar essa biblioteca, é exatamente esse erro que vai aparecer no terminal do uvicorn (que também pode ficar reiniciando sem parar, tentando recarregar o arquivo). Instale o pacote, depois pare o servidor (**Ctrl+C**) e rode `uvicorn main:app --reload` de novo.

Depois de instalar, atualize o `requirements.txt` pra guardar essa dependência nova (senão, quem clonar o projeto depois não vai ter esse pacote instalado):

```powershell
pip freeze > requirements.txt
```

Agora sim, abra `backend/rotas/agendamentos.py` e atualize os imports no topo:

```python
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from database import conectar
import os
```

Adicione a rota nova no final do arquivo:

```python
# POST /agendamentos/{id}/desenho — recebe a imagem do desenho aprovado e associa ao agendamento
@router.post("/agendamentos/{id}/desenho")
async def upload_desenho(id: int, arquivo: UploadFile = File(...)):
    nome_arquivo = f"{id}_{arquivo.filename}"   # o id na frente evita nomes repetidos entre agendamentos
    caminho = os.path.join("uploads", nome_arquivo)

    conteudo = await arquivo.read()       # lê o conteúdo do arquivo enviado
    with open(caminho, "wb") as f:        # "wb" = write binary — é uma imagem, não texto
        f.write(conteudo)

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("UPDATE agendamento SET desenhoaprovado=%s WHERE idagendamento=%s", (nome_arquivo, id))
    conn.commit()
    conn.close()
    return {"mensagem": "Desenho enviado com sucesso", "arquivo": nome_arquivo}
```

**Teste:** no `/docs`, procure `POST /agendamentos/{id}/desenho`. Repare que o Swagger mostra um campo de escolher arquivo em vez de uma caixa de JSON — é o `UploadFile` sendo reconhecido automaticamente. Teste enviando uma imagem qualquer pra um `id` de agendamento que já existe, depois confira em `GET /agendamentos/{id}` se o campo `desenhoaprovado` foi preenchido com o nome do arquivo.

---

## Parte 4 — Backend: o cadastro passa a devolver o ID criado

Ainda em `rotas/agendamentos.py`, vamos alterar a função `criar_agendamento` que **já existe** — não é uma rota nova.

> **Atenção pra não duplicar:** apague a função `criar_agendamento` inteira (desde o `@router.post("/agendamentos")` dela até o `return`) antes de colar a versão abaixo no lugar. Se você só colar por cima sem apagar a antiga, o arquivo fica com dois `POST /agendamentos` — e pior, corre o risco de empurrar ou apagar sem querer a rota `GET /agendamentos` que vem logo depois dela. Se preferir uma forma mais segura, edite só as duas linhas que realmente mudaram direto na função existente: a linha nova `novo_id = cursor.lastrowid` e o `return` com `idagendamento`.

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
    novo_id = cursor.lastrowid   # o ID que o MySQL gerou sozinho pro novo agendamento (AUTO_INCREMENT)
    conn.commit()
    conn.close()
    return {"mensagem": "Agendamento cadastrado com sucesso", "idagendamento": novo_id}
```

> **Por que precisamos disso agora?** Pra anexar uma imagem a um agendamento **recém-criado**, o frontend precisa saber o `id` dele — e antes o `POST` só devolvia uma mensagem de texto, sem o ID.

**Teste:** no `/docs`, cadastre um agendamento novo pelo `POST /agendamentos` e confirme que a resposta agora inclui `"idagendamento": <algum número>`.

---

## Parte 5 — Frontend: campo de arquivo no formulário

Em `frontend/agendamentos.html`, adicione um campo de arquivo — pode ser logo depois do `<textarea>` de descrição:

```html
<div class="col-md-4">
  <label class="form-label">Desenho aprovado (imagem)</label>
  <input type="file" id="desenho" class="form-control" accept="image/*">
</div>
```

Também adicione uma nova coluna na tabela, entre "Status" e "Ações":

```html
<th>Desenho</th>
```

---

## Parte 6 — Frontend: enviando a imagem numa segunda chamada

Em `frontend/js/agendamentos.js`, atualize o `submit` do formulário:

```javascript
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

  const idAgendamento = formAgendamento.dataset.idAgendamento
  let idParaUpload = idAgendamento   // qual id vamos usar pra anexar a imagem, se houver uma

  if (idAgendamento) {
    await fetch(`${API}/agendamentos/${idAgendamento}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendamento)
    })
  } else {
    const resposta = await fetch(`${API}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendamento)
    })
    const dados = await resposta.json()
    idParaUpload = dados.idagendamento   // pega o id que acabou de ser criado
  }

  // ─── Se um arquivo foi escolhido, envia numa segunda chamada, separada ───
  const arquivo = document.getElementById('desenho').files[0]
  if (arquivo) {
    const formData = new FormData()   // FormData, não JSON — porque tem um arquivo dentro
    formData.append('arquivo', arquivo)   // "arquivo" precisa ser o mesmo nome do parâmetro no FastAPI

    await fetch(`${API}/agendamentos/${idParaUpload}/desenho`, {
      method: 'POST',
      body: formData
      // repare que aqui NÃO colocamos o header Content-Type — o navegador
      // define esse cabeçalho sozinho quando o corpo é um FormData
    })
  }

  limparFormulario()
  listarAgendamentos()
})
```

**Teste:** cadastre um agendamento novo já escolhendo uma imagem no campo. Depois de salvar, confira em `GET /agendamentos/{id}` (no `/docs`, usando o ID que apareceu na tabela) se `desenhoaprovado` foi preenchido.

---

## Parte 7 — Frontend: mostrando a imagem na tabela

Em `listarAgendamentos()`, monte a célula da imagem antes de montar a linha. Essa função **já existe** desde a Aula 8 — substitua o corpo dela por este, mas **mantenha a linha `listarAgendamentos()` sozinha que já vem logo depois dela** (é ela que carrega a tabela quando a página abre; se ela sumir junto na hora de colar, a tabela fica vazia até você cadastrar, editar ou excluir alguma coisa):

```javascript
async function listarAgendamentos() {
  const resposta = await fetch(`${API}/agendamentos`)
  const agendamentos = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  agendamentos.forEach(a => {
    // se existir um desenho salvo, monta uma miniatura; senão, mostra "-"
    const imagemHtml = a.desenhoaprovado
      ? `<img src="${API}/uploads/${a.desenhoaprovado}" style="max-width: 60px; max-height: 60px;">`
      : '-'

    corpo.innerHTML += `
      <tr>
        <td>${a.idagendamento}</td>
        <td>${a.cliente}</td>
        <td>${a.tatuador}</td>
        <td>${a.dataagendamento}</td>
        <td>${a.horaagendamento}</td>
        <td>${a.valortatuagem ?? '-'}</td>
        <td>${a.status}</td>
        <td>${imagemHtml}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(a)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarAgendamento(${a.idagendamento})">Excluir</button>
        </td>
      </tr>`
  })
}

listarAgendamentos()   // essa linha já existia — confira se ela continua aqui depois de colar a função acima
```

**Teste:** recarregue `agendamentos.html` (sem cadastrar nada antes) e confirme que a tabela já aparece preenchida sozinha. Se ela aparecer vazia até você cadastrar/editar/excluir alguma coisa, é sinal de que a linha `listarAgendamentos()` acima se perdeu na hora de colar. O agendamento com imagem deve mostrar uma miniatura na tabela, e os outros "-".

---

## Erros comuns

- **`{"detail":"Method Not Allowed"}` ao acessar `/agendamentos`, ou a tabela nunca lista nada:** provavelmente a rota `GET /agendamentos` sumiu na Parte 4 — confira se ela ainda existe em `rotas/agendamentos.py` e se não ficaram duas cópias do `POST /agendamentos` (aconteceu de colar a função nova do `criar_agendamento` do lado da antiga, em vez de substituir, empurrando o `GET` pra fora sem querer).
- **A imagem não é enviada, sem erro nenhum:** confira se o `formData.append('arquivo', ...)` usa exatamente o mesmo nome (`arquivo`) do parâmetro da rota (`arquivo: UploadFile = File(...)`). Nomes diferentes fazem o FastAPI não encontrar o arquivo.
- **Erro estranho de `Content-Type` ou o backend não reconhece o arquivo:** confira se você **não** colocou `headers: { 'Content-Type': ... }` na chamada que envia o `FormData`. O navegador precisa definir esse cabeçalho sozinho (ele inclui um "boundary" que identifica onde cada parte do arquivo começa e termina).
- **Erro ao iniciar o servidor sobre a pasta `uploads`:** confira se a linha `os.makedirs("uploads", exist_ok=True)` está antes do `app.mount(...)` no `main.py`. Sem ela, o `StaticFiles` reclama se a pasta ainda não existir.
- **A miniatura não aparece na tabela:** abra a URL da imagem direto no navegador (algo como `http://127.0.0.1:8000/uploads/3_desenho.jpg`) pra confirmar se o arquivo foi salvo com esse nome exato.
- **`RuntimeError: Form data requires "python-multipart" to be installed`** (a API não sobe, ou fica reiniciando sem parar): faltou instalar essa biblioteca — veja a Parte 3, é o primeiro passo antes do código.

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
│   │   └── agendamentos.py    ← atualizado (rota de upload + ID no cadastro)
│   ├── uploads/                ← novo (imagens enviadas, fora do Git)
│   ├── venv/
│   ├── .env
│   ├── database.py
│   ├── main.py                 ← atualizado (arquivos estáticos)
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   ├── clientes.js
│   │   ├── senioridade.js
│   │   ├── tatuadores.js
│   │   └── agendamentos.js     ← atualizado (upload + miniatura)
│   ├── clientes.html
│   ├── senioridade.html
│   ├── tatuadores.html
│   └── agendamentos.html       ← atualizado (campo de arquivo + coluna de imagem)
├── banco/
│   └── estudio_tatuagem.sql
├── .gitignore                  ← atualizado (uploads/ ignorado)
└── REGRAS.md
```

> **Não esqueça de salvar o banco antes de encerrar** (mesmo lembrete da Aula 8): exporte de novo no phpMyAdmin e atualize [banco/estudio_tatuagem.sql](banco/estudio_tatuagem.sql).

---

## Próxima aula

Com o CRUD completo — clientes, tatuadores, agendamentos e agora imagem — o sistema já cobre as operações principais do estúdio. As próximas aulas devem seguir para organizar tudo isso atrás de um login e um dashboard, reunindo as telas construídas até aqui num único ponto de entrada.
