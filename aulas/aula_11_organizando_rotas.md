# Aula 11 — Organizando as Rotas da API

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
   Se der erro de política de execução ou de `pydantic-core`/Rust, o passo a passo de correção está na Aula 3.
4. **Reinstale as dependências e rode a API:**
   ```powershell
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

---

## O que vamos fazer nessa aula

1. Entender por que a API precisa de uma arrumação, não um conceito novo
2. Agrupar as rotas no `/docs` por assunto, usando `tags`
3. Parar de repetir `/clientes`, `/tatuadores` etc. em toda rota de cada arquivo, usando `prefix`
4. Fazer isso um arquivo de cada vez, testando antes de ir pro próximo

---

## Parte 1 — Por que organizar agora

Com `clientes`, `senioridade`, `tatuadores`, `agendamentos` e `estilos`, a API já passou de 25 rotas. Hoje, todas aparecem soltas no `/docs`, sem nenhum agrupamento — e dentro de cada arquivo de rota, o caminho (`/clientes`, `/tatuadores`...) se repete em toda função, mesmo já estando "implícito" pelo nome do arquivo.

Duas coisas resolvem isso:
- **`tags`** — agrupa visualmente as rotas no `/docs` por assunto (uma seção "Clientes", uma "Tatuadores", etc.)
- **`prefix`** — tira a repetição do caminho de dentro de cada arquivo, deixando só a parte que muda (`""` pra lista/cadastra, `"/{id}"` pra buscar/atualizar/deletar um específico)

> **Importante: isso não muda nada pra fora.** As URLs finais que o frontend chama (`GET /clientes`, `POST /tatuadores/1/estilos`...) continuam **exatamente as mesmas** depois dessa aula. É só arrumação por dentro — nenhum arquivo do `frontend/` precisa mudar.

Vamos fazer **um arquivo de rota por vez**, sempre testando antes de seguir pro próximo — assim, se algo quebrar, você sabe exatamente onde procurar.

---

## Parte 2 — Clientes

Em `backend/main.py`, encontre a linha que registra `clientes` e adicione `prefix` e `tags`:

```python
app.include_router(clientes.router, prefix="/clientes", tags=["Clientes"])
```

Em `backend/rotas/clientes.py`, ajuste os decorators (o resto de cada função continua igual, só a linha do `@router` muda):

| Antes | Depois |
|---|---|
| `@router.get("/clientes")` | `@router.get("")` |
| `@router.get("/clientes/{id}")` | `@router.get("/{id}")` |
| `@router.post("/clientes")` | `@router.post("")` |
| `@router.put("/clientes/{id}")` | `@router.put("/{id}")` |
| `@router.delete("/clientes/{id}")` | `@router.delete("/{id}")` |

> **Por que `""` e não `"/"`?** Com `prefix="/clientes"`, `@router.get("")` vira a rota `/clientes` (certinho). Se usasse `@router.get("/")`, viraria `/clientes/` (com barra no final) — uma URL levemente diferente, que funciona mas pode causar um redirecionamento desnecessário.

**Teste:** acesse `/docs`. As rotas de cliente devem estar agrupadas sob um cabeçalho **"Clientes"**, e `GET /clientes` continua funcionando normalmente — teste também abrindo `clientes.html` no navegador pra confirmar que a tela não quebrou.

---

## Parte 3 — Senioridade

Mesmo processo. Em `main.py`:

```python
app.include_router(senioridade.router, prefix="/senioridade", tags=["Senioridade"])
```

Em `rotas/senioridade.py`:

| Antes | Depois |
|---|---|
| `@router.get("/senioridade")` | `@router.get("")` |
| `@router.get("/senioridade/{id}")` | `@router.get("/{id}")` |
| `@router.post("/senioridade")` | `@router.post("")` |
| `@router.put("/senioridade/{id}")` | `@router.put("/{id}")` |
| `@router.delete("/senioridade/{id}")` | `@router.delete("/{id}")` |

**Teste:** `/docs` mostra o grupo "Senioridade" separado, e `senioridade.html` continua funcionando.

---

## Parte 4 — Estilos

Em `main.py`:

```python
app.include_router(estilos.router, prefix="/estilos", tags=["Estilos"])
```

Em `rotas/estilos.py`:

| Antes | Depois |
|---|---|
| `@router.get("/estilos")` | `@router.get("")` |
| `@router.get("/estilos/{id}")` | `@router.get("/{id}")` |
| `@router.post("/estilos")` | `@router.post("")` |
| `@router.put("/estilos/{id}")` | `@router.put("/{id}")` |
| `@router.delete("/estilos/{id}")` | `@router.delete("/{id}")` |

**Teste:** `/docs` mostra o grupo "Estilos", e `estilos.html` continua funcionando.

---

## Parte 5 — Tatuadores

Esse arquivo tem duas rotas a mais (as de estilo do tatuador, da Aula 10) — a lógica é a mesma, só com um segmento extra no caminho.

Em `main.py`:

```python
app.include_router(tatuadores.router, prefix="/tatuadores", tags=["Tatuadores"])
```

Em `rotas/tatuadores.py`:

| Antes | Depois |
|---|---|
| `@router.get("/tatuadores")` | `@router.get("")` |
| `@router.get("/tatuadores/{id}")` | `@router.get("/{id}")` |
| `@router.post("/tatuadores")` | `@router.post("")` |
| `@router.put("/tatuadores/{id}")` | `@router.put("/{id}")` |
| `@router.delete("/tatuadores/{id}")` | `@router.delete("/{id}")` |
| `@router.get("/tatuadores/{id}/estilos")` | `@router.get("/{id}/estilos")` |
| `@router.put("/tatuadores/{id}/estilos")` | `@router.put("/{id}/estilos")` |

**Teste:** `/docs` mostra o grupo "Tatuadores" com as 7 rotas juntas, e `tatuadores.html` continua funcionando — inclusive marcar/editar os estilos de um tatuador.

---

## Parte 6 — Agendamentos

Em `main.py`:

```python
app.include_router(agendamentos.router, prefix="/agendamentos", tags=["Agendamentos"])
```

Em `rotas/agendamentos.py`:

| Antes | Depois |
|---|---|
| `@router.get("/agendamentos")` | `@router.get("")` |
| `@router.post("/agendamentos")` | `@router.post("")` |
| `@router.get("/agendamentos/{id}")` | `@router.get("/{id}")` |
| `@router.put("/agendamentos/{id}")` | `@router.put("/{id}")` |
| `@router.delete("/agendamentos/{id}")` | `@router.delete("/{id}")` |
| `@router.post("/agendamentos/{id}/desenho")` | `@router.post("/{id}/desenho")` |

**Teste:** `/docs` mostra o grupo "Agendamentos" com as 6 rotas juntas, incluindo o upload de imagem. Teste `agendamentos.html` inteiro — listar, cadastrar com imagem, editar.

---

## Erros comuns

- **`404 Not Found` numa rota que antes funcionava:** o `prefix` some se você esquecer de adicionar no `include_router()` do `main.py`, ou se ainda sobrar o caminho antigo dentro de algum decorator (ex: deixar `@router.get("/clientes")` em vez de `@router.get("")` depois de já ter posto `prefix="/clientes"` — nesse caso a rota vira `/clientes/clientes`, não `/clientes`).
- **Uma rota parece "duplicada" no `/docs`:** confira se você não deixou o caminho completo em algum decorator junto com o `prefix` já configurado — mesma causa do erro acima.
- **Uma tela do frontend parou de funcionar:** como as URLs finais não deveriam ter mudado, se algo quebrou é sinal de que uma rota ficou com o caminho errado (sobrou ou faltou uma barra `/`). Compare com a tabela "Antes/Depois" da Parte correspondente.

---

## Estrutura do projeto até agora

Nenhum arquivo novo nessa aula — só `main.py` e os 5 arquivos de `rotas/` foram ajustados por dentro. A estrutura de pastas continua igual à da Aula 10.

---

## Próxima aula

Com a API organizada e todo o CRUD do sistema completo (clientes, tatuadores, estilos, senioridade e agendamentos com imagem), as próximas aulas devem seguir para colocar tudo isso atrás de um login e reunir as telas num dashboard.
