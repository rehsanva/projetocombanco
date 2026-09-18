# Regras do Projeto — Estúdio de Tatuagem

## O que estamos construindo?

Um sistema web completo para gerenciar um estúdio de tatuagem.
O sistema terá três partes que conversam entre si:

```
[ Banco de dados MySQL ]  ←→  [ API em Python/FastAPI ]  ←→  [ Páginas HTML ]
     (onde ficam               (o "cérebro" que         (o que o usuário
      os dados)                 processa tudo)               vai ver)
```

---

## Tecnologias e o porquê de cada uma

| Tecnologia           | Para que serve                              | Por que escolhemos          |
|----------------------|---------------------------------------------|-----------------------------|
| MySQL + XAMPP        | Guardar os dados                            | Já conhecemos!              |
| Python               | Linguagem do backend                        | Já conhecemos!              |
| FastAPI              | Criar a API em Python                       | Moderno, fácil, documentação automática |
| HTML + Bootstrap     | Páginas que o usuário vê                    | Simples, sem precisar instalar nada |
| JavaScript (Fetch)   | Conectar as páginas com a API               | Já vem no navegador         |

---

## Estrutura de pastas do projeto

```
projetocombanco/
│
├── banco/                 ← Arquivos SQL do banco exportado/importado
│   └── estudio_tatuagem.sql
├── backend/               ← Código Python da API
├── frontend/              ← Páginas HTML e JavaScript
├── REGRAS.md              ← Este arquivo
│
└── aulas/                 ← Material das aulas
```

> Como os computadores da escola podem ser congelados, o banco precisa ser tratado como um arquivo de backup. Sempre que o banco for criado ou alterado, exporte o conteúdo para a pasta `banco/` e, nas próximas aulas, importe esse arquivo no MySQL antes de continuar.


---

## Regras de código Python

### 1. Português para nomes de negócio, inglês para estruturas
```python
# CERTO — nome da variável em português, estrutura do Python em inglês
def listar_clientes():
    ...

class ClienteCreate(BaseModel):
    ...

# ERRADO
def listCustomers():
    ...
```

### 2. Todo arquivo começa com um cabeçalho explicando o que faz
```python
# ============================================================
# main.py — API do Estúdio de Tatuagem
# Descrição: Endpoints para gerenciar clientes, tatuadores
#            e agendamentos.
# Como rodar: uvicorn main:app --reload
# ============================================================
```

### 3. Cada função tem um comentário de UMA linha explicando o que faz
```python
def listar_clientes():
    # Retorna todos os clientes cadastrados no banco, em ordem alfabética
    ...
```

### 4. Linhas de código "complicadas" são comentadas
```python
cursor = conn.cursor(dictionary=True)
# dictionary=True faz o MySQL retornar os dados como dicionário Python
# Ex: {"idcliente": 1, "nome": "Ana"} em vez de (1, "Ana")
```

### 5. Nunca deixar senha ou dado sensível no código
```python
# ERRADO — senha exposta no código
DB_CONFIG = {"password": "minha_senha_secreta"}

# CERTO — no XAMPP a senha padrão é vazia, então está OK por enquanto
DB_CONFIG = {"password": ""}
```

---

## Regras de código HTML/JavaScript

### 1. Um arquivo HTML por funcionalidade
- `clientes.html` → só gerencia clientes
- `tatuadores.html` → só gerencia tatuadores

### 2. Todo bloco de JavaScript tem comentário de seção
```javascript
// ─── Carrega a lista de clientes ao abrir a página ───
async function carregarClientes() { ... }

// ─── Abre o modal para cadastrar um novo cliente ───
function abrirModalNovo() { ... }
```

### 3. Mensagens de erro sempre mostram o que aconteceu
```javascript
// ERRADO
alert("Erro!");

// CERTO
alert("Erro ao salvar cliente: " + erro.detail);
```

---

## Convenção de nomes dos endpoints da API

| Ação                  | Método HTTP | Exemplo de rota        |
|-----------------------|-------------|------------------------|
| Listar todos          | GET         | `/clientes`            |
| Buscar um pelo ID     | GET         | `/clientes/1`          |
| Criar novo            | POST        | `/clientes`            |
| Atualizar existente   | PUT         | `/clientes/1`          |
| Deletar               | DELETE      | `/clientes/1`          |

---

## Como testar se está funcionando

1. Rodar a API: `uvicorn main:app --reload`
2. Abrir no navegador: `http://localhost:8000/docs`
3. O FastAPI gera uma documentação interativa automática — use ela para testar!
4. Só depois de testar a API, abrir o HTML

---

## Ordem de desenvolvimento

Vamos construir na seguinte ordem (não pular etapas!):

- [ ] Aula 1 — O que é uma API? (teoria)
- [ ] Aula 2 — Criar o banco de dados no XAMPP
- [ ] Aula 3 — Preparando o ambiente (Python, venv, FastAPI)
- [ ] Aula 4 — Primeiro endpoint ("Hello World" com FastAPI)
- [ ] Aula 5 — CRUD de Clientes (conectando o Python ao MySQL)
- [ ] Aula 6 — Frontend de Clientes (CORS, HTML/JS, ligação com a API)
- [ ] Aula 7 — CRUD de Senioridade e Tatuadores (chave estrangeira, JOIN)
- [ ] Aula 8 — CRUD de Agendamentos (duas chaves estrangeiras, data e hora)
- [ ] Aula 9 — Upload de Imagem (desenho aprovado)
- [ ] Aula 10 — Estilos e Relacionamento N:N com Tatuadores
- [ ] Aula 11 — Organizando as rotas da API (tags e prefixos no `/docs`)
- [ ] Aula 12 — Landing Page e Cadastro de Usuário (hash de senha)
- [ ] Aula 13 — Login com Token JWT
- [ ] Aula 14 — Protegendo as Rotas da API (autenticação obrigatória)
- [ ] Aula 15 — Tela de Login, Dashboard e Logout — *a definir*
