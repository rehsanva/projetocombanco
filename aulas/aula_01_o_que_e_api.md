# Aula 1 — O que é uma API?

## Antes de programar, vamos entender o problema

Você já sabe criar um banco de dados no MySQL.
Mas como um **site** ou um **aplicativo de celular** acessa esse banco?

Não dá pra colocar o banco direto no navegador.
Precisa de um intermediário. Esse intermediário se chama **API**.

---

## API X analogia do restaurante

Imagine que você está em um restaurante:

```
[ Você (cliente) ]  →  faz o pedido  →  [ Garçom ]  →  leva para  →  [ Cozinha ]
[ Você (cliente) ]  ←  recebe o prato  ←  [ Garçom ]  ←  pega da  ←  [ Cozinha ]
```

Agora no nosso sistema:

```
[ Página HTML ]  →  faz uma requisição  →  [ API ]  →  consulta  →  [ Banco MySQL ]
[ Página HTML ]  ←  recebe os dados     ←  [ API ]  ←  retorna  ←  [ Banco MySQL ]
```

| Restaurante | Sistema web       |
|-------------|-------------------|
| Você        | Página HTML       |
| Garçom      | API (FastAPI)     |
| Cozinha     | Banco de dados    |
| Cardápio    | Documentação da API |

O garçom conhece a cozinha. Você não precisa entrar na cozinha — só fala com o garçom.
A página HTML conhece a API. Ela não acessa o banco direto — só fala com a API.

---

## APIs que você já usa todo dia

Você usa APIs o tempo todo sem saber:

- **iFood** → o app faz uma requisição para a API do iFood, que busca os restaurantes no banco
- **Instagram** → quando você abre o feed, o app pede as fotos para a API do Instagram
- **Google Maps** → o site pede a localização para a API do Google Maps
- **Spotify** → quando você clica em play, o app busca a música na API do Spotify

---

## O que é REST?

Nossa API vai ser do tipo **REST**. Entenda a ideia:

REST é um conjunto de regras de como organizar uma API. A principal regra é:

> Cada **recurso** (cliente, tatuador, agendamento) tem um **endereço** (URL).
> Você diz o que quer fazer usando o **método HTTP**.

### Os 4 métodos HTTP (são como verbos — dizem o que você quer fazer)

| Método   | O que faz           | Equivalente no banco |
|----------|---------------------|----------------------|
| `GET`    | Buscar / listar     | `SELECT`             |
| `POST`   | Criar novo          | `INSERT`             |
| `PUT`    | Atualizar existente | `UPDATE`             |
| `DELETE` | Deletar             | `DELETE`             |

### Exemplo prático — Clientes do estúdio

| O que quero fazer          | Método   | URL                    |
|----------------------------|----------|------------------------|
| Ver todos os clientes      | `GET`    | `/clientes`            |
| Ver o cliente de ID 5      | `GET`    | `/clientes/5`          |
| Cadastrar um novo cliente  | `POST`   | `/clientes`            |
| Atualizar o cliente de ID 5| `PUT`    | `/clientes/5`          |
| Deletar o cliente de ID 5  | `DELETE` | `/clientes/5`          |

Perceba: a URL identifica **o quê**. O método diz **o que fazer**.

---

## O que é JSON?

A API não devolve uma página HTML. Ela devolve dados puros no formato **JSON**.
01

> **API é o programa Python que fica no meio: recebe pedidos do HTML, faz as queries no MySQL, e devolve os dados em JSON.**

---

## O que vamos construir

Ao final do projeto, teremos uma API com estes endereços:

```
GET    /clientes           → lista todos os clientes
POST   /clientes           → cadastra um novo cliente
PUT    /clientes/{id}      → atualiza um cliente
DELETE /clientes/{id}      → deleta um cliente

GET    /tatuadores         → lista todos os tatuadores
POST   /tatuadores         → cadastra um novo tatuador
...


GET    /agendamentos       → lista todos os agendamentos
POST   /agendamentos       → cria um novo agendamento
...
```

---

## Próxima aula

Na **Aula 2** vamos criar o banco de dados no MySQL usando o XAMPP.
