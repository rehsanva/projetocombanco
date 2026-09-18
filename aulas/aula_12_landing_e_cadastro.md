# Aula 12 — Landing Page e Cadastro de Usuário

## Antes de começar — relembrando o ambiente

Se a máquina foi reiniciada desde a última aula, repita os passos de sempre antes de continuar:

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
4. **Reinstale as dependências e rode a API:**
   ```powershell
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

---

## Sobre essa aula (e as próximas 3)

Login de verdade é o assunto mais denso do curso até aqui, então ele foi dividido em **4 aulas**, cada uma com uma peça só:

| Aula | O que resolve |
|---|---|
| **12 (essa)** | Cadastro de usuário + Landing Page — a "porta de entrada" do sistema |
| 13 | Login que gera um "crachá" digital (token JWT) |
| 14 | Fazer as rotas existentes exigirem esse crachá pra funcionar |
| 15 | Tela de login de verdade, Dashboard, e as 5 telas antigas usando o crachá |

Diferente das aulas anteriores, aqui o código de autenticação em si (hash de senha, geração de token) **não vem pronto pra copiar** — vamos explicar o conceito, dar um checklist do que cada parte precisa fazer, e indicar onde ver o código de referência. Segurança é uma área onde vale mais a pena aprender lendo uma fonte confiável e daí adaptar, do que copiar um trecho genérico sem entender.

**Fontes de referência pra essas 4 aulas** (vamos indicar a parte específica de cada uma, conforme for chegando o assunto):
- [FastAPI — OAuth2 com Senha (hashing) e Bearer com tokens JWT](https://fastapi.tiangolo.com/pt/tutorial/security/oauth2-jwt/) — documentação oficial, em português
- [FastAPI do Zero — Autenticação e Autorização com JWT](https://fastapidozero.dunossauro.com/estavel/06/) — curso gratuito, explica com bastante calma
- [Curso de FastAPI 2025 — Autenticação e Autorização com tokens JWT (YouTube)](https://www.youtube.com/watch?v=wGZzEoO7e9s) — versão em vídeo, se preferir ver em vez de ler

---

## O que vamos fazer nessa aula

1. Entender por que uma senha nunca pode ficar guardada como texto puro
2. Criar a tabela `usuario` no banco
3. Entender o que é "hash" (com uma analogia, sem matemática)
4. Criar a rota de cadastro no backend
5. Criar a Landing Page do sistema
6. Criar a tela de Cadastro

---

## Parte 1 — Por que senha nunca fica em texto puro

Lembra da regra do `REGRAS.md`: "nunca deixar senha no código"? Agora vai um passo além: **nunca deixar a senha do usuário guardada como texto puro no banco, nem mesmo você, que é quem administra o sistema, deveria conseguir ver a senha de alguém.**

Por quê? Porque se um dia esse banco vazar (acontece até com empresas grandes), todo mundo que usa a mesma senha em outros lugares fica exposto. A solução é nunca guardar a senha em si — só um "resultado" dela, chamado **hash**.

> **Analogia:** pense num triturador de papel. Você bota a senha original lá dentro, sai um monte de picadinho de papel — o **hash**. Ninguém consegue juntar os pedacinhos e voltar a ter a senha original. Mas se você triturar a **mesma senha** de novo, sai exatamente o mesmo padrão de picadinho. É assim que o login confere depois: não compara "senha com senha", compara "picadinho com picadinho".

A biblioteca que faz esse "triturador" de forma segura se chama **bcrypt** — não vamos inventar nosso próprio jeito de triturar, porque fazer isso errado é a causa de muito vazamento de dado por aí.

---

## Parte 2 — Criando a tabela `usuario`

No phpMyAdmin, aba SQL, execute:

```sql
CREATE TABLE usuario (
    idusuario INT AUTO_INCREMENT PRIMARY KEY,
    nome      VARCHAR(100) NOT NULL,
    email     VARCHAR(150) NOT NULL UNIQUE,
    senha     VARCHAR(255) NOT NULL,                            -- aqui vai o hash, nunca a senha em si
    tipo      ENUM('admin', 'funcionario', 'cliente') NOT NULL DEFAULT 'funcionario',
    idcliente INT DEFAULT NULL,                                  -- só preenchido se tipo = 'cliente'
    FOREIGN KEY (idcliente) REFERENCES cliente(idcliente)
);
```

Repare que `email` é `UNIQUE` — dois usuários não podem se cadastrar com o mesmo e-mail.

> **Por que já tem `tipo` e `idcliente`, se ainda não vamos usar isso?** Pensando no futuro: hoje só quem trabalha no estúdio vai se cadastrar (por isso o `DEFAULT` já vem como `'funcionario'`), mas um dia o próprio cliente pode querer logar pra agendar sozinho, sem precisar ligar pro estúdio. Quando isso acontecer, `tipo = 'cliente'` e `idcliente` vão apontar pro cadastro que já existe na tabela `cliente`, sem duplicar nada. É o mesmo espírito de deixar a tabela pronta antes de usar, igual `estilo`/`tatuador_estilo` ficaram esperando desde a Aula 2 até ganharem tela na Aula 10.
>
> Por enquanto, nas Aulas 12 a 15, todo mundo que se cadastrar e logar vai ser tratado como `funcionario`, sem nenhuma trava adicional por tipo.

**Teste:** confira no phpMyAdmin se a tabela `usuario` apareceu, com as 6 colunas.

---

## Parte 3 — Backend: instalando o bcrypt

Lembra do "triturador de papel" da Parte 1? O `bcrypt` é a biblioteca que faz esse trituramento de verdade — ela pega a senha que o usuário digitou e devolve o hash, de um jeito seguro e testado (por isso não vamos escrever nosso próprio código pra "triturar" senha, só usar essa biblioteca pronta).

Com o venv ativado:

Caso o projeto esteja rodando, aperte o Ctrl C para parar o projeto e conseguir digitar isso no terminal

```powershell
pip install bcrypt
pip freeze > requirements.txt
```

---

## Parte 4 — Backend: a rota de cadastro

Crie `backend/rotas/usuarios.py`. Essa rota precisa: receber `nome`/`email`/`senha`, transformar a senha em hash, guardar tudo no banco (menos a senha original), e nunca devolver a senha nem o hash na resposta.

```python
# ============================================================
# rotas/usuarios.py — Cadastro de Usuários
# Descrição: Endpoint para cadastrar novos usuários do sistema,
#            guardando a senha como hash (nunca em texto puro).
# ============================================================

from fastapi import APIRouter
from pydantic import BaseModel
from database import conectar
import bcrypt      # biblioteca que gera e confere o hash da senha

router = APIRouter()

# Modelo de dados — define os campos que o usuário deve ter
class Usuario(BaseModel):
    nome: str     # obrigatório
    email: str    # obrigatório
    senha: str    # obrigatório — chega aqui em texto puro, só nessa etapa

# POST /usuarios — cadastra um novo usuário
@router.post("")
def criar_usuario(usuario: Usuario):
    # gera o hash da senha — gensalt() cria um "tempero" aleatório (salt) diferente
    # a cada vez, então duas pessoas com a mesma senha geram hashes diferentes
    senha_hash = bcrypt.hashpw(usuario.senha.encode("utf-8"), bcrypt.gensalt())
    # .encode("utf-8") transforma o texto da senha em bytes, porque é isso que o bcrypt espera

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO usuario (nome, email, senha) VALUES (%s, %s, %s)",
            (usuario.nome, usuario.email, senha_hash.decode("utf-8"))
            # .decode("utf-8") faz o caminho inverso: de bytes pra texto, porque a
            # coluna do banco (VARCHAR) guarda texto, não bytes
        )
        conn.commit()
        conn.close()
        return {"mensagem": "Usuário cadastrado com sucesso"}
        # repare que a resposta NUNCA inclui a senha nem o hash
    except Exception as erro:
        conn.rollback()
        conn.close()
        return {"erro": "Não foi possível cadastrar. Verifique se esse e-mail já está em uso."}
```

> **Quer se aprofundar mais no `bcrypt`?** A seção "Hash e verificação de senhas" do [FastAPI do Zero, capítulo 6](https://fastapidozero.dunossauro.com/estavel/06/) explica com mais detalhe o que está acontecendo por baixo dos panos, e mostra uma variação usando `pwdlib` (uma camada mais amigável por cima do `bcrypt`) — não é obrigatório, mas é uma boa leitura extra.

Registre a rota no `main.py`, seguindo o padrão de sempre:

Inclua os usuário as rotas: 

```python
from rotas import clientes, senioridade, tatuadores, agendamentos, estilos, usuarios 
```

```python
app.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
```

**Teste:** no `/docs`, cadastre um usuário de teste. Depois, **olhe direto na tabela `usuario` pelo phpMyAdmin** — a coluna `senha` deve mostrar um texto longo e sem sentido (o hash), nunca a senha que você digitou. Tente cadastrar de novo com o mesmo e-mail — deve dar o erro amigável, não quebrar a API.

 uvicorn main:app --reload
---

## Parte 5 — Frontend: Landing Page

Crie `frontend/index.html` — a página inicial do sistema, a "vitrine". Por enquanto o conteúdo é só Lorem Ipsum (vocês vão caprichar nisso depois); o que importa agora são os botões de Cadastro e Login:

Na verdade já podem até fazer isso, na entrega quero algo bem bonito e com conteúdo.

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>

  <nav class="navbar navbar-dark bg-dark">
    <div class="container">
      <span class="navbar-brand">Estúdio de Tatuagem</span>
      <div>
        <a href="cadastro.html" class="btn btn-outline-light me-2">Cadastrar</a>
        <a href="login.html" class="btn btn-light">Entrar</a>
      </div>
    </div>
  </nav>

  <div class="container py-5 text-center">
    <h1 class="display-4">Seu estúdio, organizado do seu jeito</h1>
    <p class="lead">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
      veniam, quis nostrud exercitation ullamco laboris.
    </p>
    <a href="cadastro.html" class="btn btn-primary btn-lg mt-3">Comece agora</a>
  </div>

</body>
</html>
```

**Teste:** abra `index.html` no navegador — deve mostrar a página com os botões. O botão "Cadastrar" já vai funcionar depois da Parte 6; o botão "Entrar" ainda não tem pra onde ir — ele só passa a funcionar na Aula 15, quando criarmos a tela de login de verdade. Até lá, é normal ele dar "página não encontrada" se você clicar.

---

## Parte 6 — Frontend: tela de Cadastro

Crie `frontend/cadastro.html`:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Cadastro — Estúdio de Tatuagem</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-5" style="max-width: 480px;">

  <h1 class="mb-4">Criar conta</h1>

  <form id="form-cadastro">
    <div class="mb-3">
      <input type="text" id="nome" class="form-control" placeholder="Nome" required>
    </div>
    <div class="mb-3">
      <input type="email" id="email" class="form-control" placeholder="E-mail" required>
    </div>
    <div class="mb-3">
      <input type="password" id="senha" class="form-control" placeholder="Senha" required>
    </div>
    <button type="submit" class="btn btn-primary w-100">Cadastrar</button>
  </form>

  <p class="mt-3 text-center">
    Já tem conta? <a href="login.html">Entrar</a>
  </p>

  <script src="js/cadastro.js"></script>

</body>
</html>
```

Crie `frontend/js/cadastro.js` — esse é um `POST` comum, igual todos os outros formulários que já fizemos:

```javascript
const API = 'http://127.0.0.1:8000'
const formCadastro = document.getElementById('form-cadastro')

formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault()

  const usuario = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    senha: document.getElementById('senha').value
  }

  const resposta = await fetch(`${API}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usuario)
  })

  if (resposta.ok) {
    alert('Cadastro feito com sucesso!')
    window.location.href = 'index.html'
    // manda pra Landing Page por enquanto — a tela de login de verdade
    // só vai existir a partir da Aula 15
  } else {
    const erro = await resposta.json()
    alert('Erro ao cadastrar: ' + JSON.stringify(erro))
  }
})
```

**Teste:** preencha o formulário e cadastre um usuário novo pela tela (não só pelo `/docs`). Confirme que ele aparece na tabela `usuario` com a senha em hash.

---

## Erros comuns

- **Erro ao instalar `bcrypt`:** em alguns Windows, o `bcrypt` puro pede compilador. Se der erro, tente `pip install bcrypt --only-binary :all:`, ou use `pwdlib[bcrypt]` como alternativa (é o que o "FastAPI do Zero" usa) — me avisa se acontecer, que ajudamos a resolver.
- **A senha aparece "certinha" no banco (não parece um hash):** confira se a rota realmente está gerando o hash antes do `INSERT` — é o erro mais grave possível aqui, porque significa que a senha está sendo salva em texto puro.
- **Erro de e-mail duplicado:** a coluna `email` é `UNIQUE` — cadastrar duas vezes com o mesmo e-mail vai dar erro do banco. Trate isso com uma mensagem amigável, mesmo padrão do `try/except` que já usamos em outros deletes.

---

## Estrutura do projeto até agora

```
estudio-tatuagem-api/
├── aulas/
├── backend/
│   ├── rotas/
│   │   ├── ...
│   │   └── usuarios.py        ← novo
│   ├── venv/
│   ├── .env
│   ├── database.py
│   ├── main.py                 ← atualizado (rota nova)
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   ├── ...
│   │   └── cadastro.js         ← novo
│   ├── index.html              ← novo (Landing Page)
│   ├── cadastro.html           ← novo
│   └── (as 5 telas de sempre)
├── banco/
│   └── estudio_tatuagem.sql
├── .gitignore
└── REGRAS.md
```

> Lembre de exportar o banco de novo antes de encerrar (agora com a tabela `usuario` também).

---

## Próxima aula

Na **Aula 13**, o usuário cadastrado vai poder fazer login de verdade — a rota vai conferir a senha (comparando hashes) e, se bater, devolver um **token JWT**: um crachá digital assinado que prova quem é a pessoa, sem precisar mandar a senha de novo a cada requisição.
