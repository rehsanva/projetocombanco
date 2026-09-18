# Aula 5 — CRUD de Clientes

## Antes de começar — relembrando o ambiente

Se a máquina foi reiniciada desde a última aula, repita os passos de sempre antes de continuar:

1. **Importe o banco de novo** no phpMyAdmin, aba **Importar**, usando `banco/estudio_tatuagem.sql` (processo completo na Aula 2, Passo 4).
2. **Recrie e ative o ambiente virtual**, dentro da pasta `backend`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
   Se der erro de política de execução ou de `pydantic-core`/Rust, o passo a passo de correção está na Aula 3.
3. **Reinstale as dependências:**
   ```powershell
   pip install -r requirements.txt
   ```

---

## O que vamos fazer nessa aula

Vamos construir o CRUD de clientes **um passo por vez**, testando cada etapa antes de avançar:

1. Criar o `.env` e testar a conexão com o banco
2. Criar o primeiro SELECT e ver os dados
3. Adicionar busca por ID
4. Adicionar cadastro (INSERT)
5. Adicionar atualização (UPDATE)
6. Adicionar exclusão (DELETE)
---

## Parte 1 — O arquivo .env

### Por que usar o .env?

Nunca coloque senha de banco de dados direto no código Python.
Se você mandar o código para o GitHub, qualquer pessoa verá a senha.

O arquivo `.env` guarda essas informações separadas do código.
O `.gitignore` já está configurado para não mandar esse arquivo pro GitHub.

lembrando que como você sempre vai perder esse arquivo quando sair no laboratório da ETEC, o ideal é que você tenha ele num drive pessoal, ou pen drive.

### Criando o .env

Crie um arquivo chamado `.env` dentro da pasta `backend/`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=estudio_tatuagem
```

> No XAMPP o usuário padrão é `root` e a senha é vazia.

Lembrando que se não importou o banco de dados para o Xampp faça isso agora, ele está na sua pasta banco.
---

## Parte 2 — Conectando ao banco (database.py)

Crie um arquivo chamado `database.py` dentro da pasta `backend/`:

```python
import mysql.connector        # biblioteca para conectar ao MySQL
from dotenv import load_dotenv  # lê o arquivo .env
import os                      # acessa as variáveis de ambiente

load_dotenv()                  # carrega as variáveis do .env


def conectar():
    # cria e retorna uma conexão com o banco de dados
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),          # endereço do servidor (localhost)
        user=os.getenv("DB_USER"),          # usuário do banco
        password=os.getenv("DB_PASSWORD"),  # senha do banco
        database=os.getenv("DB_NAME")       # nome do banco
    )
```

### Testando a conexão antes de qualquer rota

Antes de criar qualquer endpoint, vamos garantir que a conexão com o banco está funcionando.

No terminal (com o venv ativado), execute:

```powershell
python -c "from database import conectar; conn = conectar(); print('Conexão OK!'); conn.close()"
```

Se aparecer `Conexão OK!` pode continuar.
Se aparecer erro, verifique se o XAMPP está rodando com o MySQL ligado.

---

## Parte 3 — A pasta rotas/

Crie uma pasta chamada `rotas` dentro de `backend/`.
Dentro dela, crie dois arquivos:

**`rotas/__init__.py`** — deixe vazio.

**`rotas/clientes.py`** — começa assim, só com o cabeçalho:

```python
from fastapi import APIRouter      # organiza rotas em grupos
from pydantic import BaseModel     # valida os dados que chegam na API
from typing import Optional        # permite campos opcionais
from database import conectar      # nossa função de conexão

router = APIRouter()               # cria o grupo de rotas
```

---

## Parte 4 — Atualizando o main.py

Abra o `backend/main.py` e substitua o conteúdo:

```python
from fastapi import FastAPI
from rotas import clientes         # importa as rotas de clientes

app = FastAPI()

app.include_router(clientes.router)  # registra as rotas de clientes na API


@app.get("/")
def inicio():
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}
```

Entre na pasta `backend` e inicie o servidor:

```powershell
cd backend
uvicorn main:app --reload
```

Acesse `http://127.0.0.1:8000/docs` — deve aparecer só o `GET /` por enquanto.
Se aparecer, está tudo ligado corretamente. Agora vamos adicionar as rotas.

---

## Parte 5 — Rota 1: Listar todos os clientes (GET)

Adicione essa função no `rotas/clientes.py` e salve:

```python
# GET /clientes — lista todos os clientes
@router.get("/clientes")
def listar_clientes():
    conn = conectar()                        # abre conexão
    cursor = conn.cursor(dictionary=True)    # retorna dicionários em vez de tuplas
    cursor.execute("SELECT * FROM cliente")  # executa o SELECT
    clientes = cursor.fetchall()             # pega todos os resultados
    conn.close()                             # fecha a conexão
    return clientes                          # retorna a lista em JSON
```

**Teste:** acesse `http://127.0.0.1:8000/clientes` no navegador.
Você deve ver a lista de clientes que inserimos na Aula 2.

---

## Parte 6 — Rota 2: Buscar um cliente por ID (GET)

Adicione abaixo da rota anterior:

```python
# GET /clientes/{id} — busca um cliente pelo ID
@router.get("/clientes/{id}")
def buscar_cliente(id: int):
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM cliente WHERE idcliente = %s", (id,))  # %s evita SQL injection
    cliente = cursor.fetchone()   # pega só um resultado
    conn.close()
    if not cliente:               # se não encontrou, avisa
        return {"erro": "Cliente não encontrado"}
    return cliente
```

**Teste:**
- Acesse `http://127.0.0.1:8000/clientes/1` — deve retornar a Ana Silva
- Acesse `http://127.0.0.1:8000/clientes/99` — deve retornar o erro

---

## Parte 7 — Rota 3: Cadastrar um novo cliente (POST)

Antes da rota, adicione o **modelo de dados** logo após o `router = APIRouter()`:

```python
# Modelo de dados — define os campos que o cliente deve ter
class Cliente(BaseModel):
    nome: str                           # obrigatório
    cpf: str                            # obrigatório
    telefone: Optional[str] = None      # opcional
    datacadastro: Optional[str] = None  # opcional
    cidade: Optional[str] = None        # opcional
    uf: Optional[str] = None            # opcional
```

Agora adicione a rota no final do arquivo:

```python
# POST /clientes — cadastra um novo cliente
@router.post("/clientes")
def criar_cliente(cliente: Cliente):   # recebe os dados no corpo da requisição
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO cliente (nome, cpf, telefone, datacadastro, cidade, uf)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (cliente.nome, cliente.cpf, cliente.telefone,
         cliente.datacadastro, cliente.cidade, cliente.uf)
    )
    conn.commit()   # confirma a gravação no banco
    conn.close()
    return {"mensagem": "Cliente cadastrado com sucesso"}
```

**Teste:** no `/docs`, clique em `POST /clientes` → **Try it out** → preencha os dados → **Execute**.
Depois acesse `/clientes` para confirmar que o novo cliente aparece na lista.

---

## Parte 8 — Rota 4: Atualizar um cliente (PUT)

Adicione no final do arquivo:

```python
# PUT /clientes/{id} — atualiza um cliente existente
@router.put("/clientes/{id}")
def atualizar_cliente(id: int, cliente: Cliente):
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE cliente
           SET nome=%s, cpf=%s, telefone=%s, datacadastro=%s, cidade=%s, uf=%s
           WHERE idcliente=%s""",
        (cliente.nome, cliente.cpf, cliente.telefone,
         cliente.datacadastro, cliente.cidade, cliente.uf, id)
    )
    conn.commit()
    conn.close()
    return {"mensagem": "Cliente atualizado com sucesso"}
```

**Teste:** no `/docs`, use `PUT /clientes/{id}` para alterar o nome de um cliente.
Depois busque o mesmo ID com `GET /clientes/{id}` para confirmar a alteração.

---

## Parte 9 — Rota 5: Deletar um cliente (DELETE)

Adicione no final do arquivo:

```python
# DELETE /clientes/{id} — deleta um cliente
@router.delete("/clientes/{id}")
def deletar_cliente(id: int):
    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM cliente WHERE idcliente = %s", (id,))
        conn.commit()
        conn.close()
        return {"mensagem": "Cliente deletado com sucesso"}
    except Exception as erro:
        conn.rollback()
        conn.close()
        return {"erro": "Não foi possível excluir este cliente. Verifique se ele possui agendamentos."}
```

> Atenção: se o cliente tiver agendamentos na tabela `agendamento`, o delete vai falhar. Isso acontece porque existe uma chave estrangeira ligando as duas tabelas.
>
> Em outras palavras: você não consegue apagar um cliente que ainda está relacionado a um agendamento.
>
> **Teste:** no `/docs`, use `DELETE /clientes/{id}` para deletar um cliente.
> Se o cliente tiver agendamento, o sistema vai devolver um erro. Para testar o delete com sucesso, use um cliente sem agendamento.
> Depois acesse `/clientes` para confirmar se ele sumiu da lista.

---

## Estrutura do projeto até agora

```
estudio-tatuagem-api/
├── aulas/
├── backend/
│   ├── rotas/
│   │   ├── __init__.py   ← vazio
│   │   └── clientes.py   ← CRUD de clientes
│   ├── .env              ← credenciais do banco (não vai pro GitHub)
│   ├── database.py       ← conexão com o MySQL
│   ├── main.py           ← atualizado
│   └── requirements.txt
│   ├── venv  
│
├── .gitignore
└── REGRAS.md
```

---

## Final da aula

Ao terminar esta aula, lembre-se de exportar novamente o banco e salvar o arquivo em [banco/estudio_tatuagem.sql](banco/estudio_tatuagem.sql) com as atualizações feitas, como os novos clientes cadastrados.

Isso é importante porque, em laboratório, o banco pode ser perdido quando a máquina for reiniciada ou a aula terminar.

## Próxima aula

Na **Aula 6** vamos criar uma página HTML que se conecta a essa API, para ver o CRUD de clientes funcionando numa tela de verdade.
