# Estúdio de Tatuagem — Projeto Guiado

Bem-vindo(a)! Este repositório é o material de um curso passo a passo pra você construir, do zero, um sistema web completo — banco de dados, API e frontend — usando como tema a gestão de um estúdio de tatuagem.

## O que você vai construir

Um sistema com três partes conversando entre si:

```
[ Banco de dados MySQL ]  ←→  [ API em Python/FastAPI ]  ←→  [ Páginas HTML ]
```

- **Banco de dados**: MySQL, rodando via XAMPP
- **Backend**: uma API em Python com FastAPI
- **Frontend**: páginas em HTML, Bootstrap (CSS) e JavaScript puro — sem frameworks, sem ferramentas de build

A ideia é entender cada peça do sistema construindo ela com as próprias mãos, sem "mágica" escondida por trás de uma ferramenta pronta.

## O que vem neste repositório

Só a pasta `aulas/`, este `README.md` e o `REGRAS.md`. As pastas `backend/`, `frontend/` e `banco/` **você** vai criar, seguindo as aulas na ordem — elas não vêm prontas de propósito.

## Antes de começar

Você vai precisar ter instalado:

- [XAMPP](https://www.apachefriends.org/) (MySQL + phpMyAdmin)
- [Python 3.10 ou mais recente](https://www.python.org/downloads/)
- Um editor de código (recomendado: [VS Code](https://code.visualstudio.com/))
- [Git](https://git-scm.com/)

## Por onde seguir

Siga as aulas **nessa ordem, sem pular etapas** — cada uma depende do que foi construído na anterior:

1. [Aula 1 — O que é uma API?](aulas/aula_01_o_que_e_api.md)
2. [Aula 2 — Criando o banco de dados no MySQL](aulas/aula_02_banco_mysql.md)
3. [Aula 3 — Preparando o ambiente](aulas/aula_03_ambiente_python.md)
4. [Aula 4 — Primeiro endpoint](aulas/aula_04_hello_world.md)
5. [Aula 5 — CRUD de Clientes](aulas/aula_05_crud_clientes.md)
6. [Aula 6 — Frontend de Clientes](aulas/aula_06_frontend_clientes.md)
7. [Aula 7 — CRUD de Senioridade e Tatuadores](aulas/aula_07_crud_tatuadores.md)
8. [Aula 8 — CRUD de Agendamentos](aulas/aula_08_crud_agendamentos.md)
9. [Aula 9 — Upload de Imagem](aulas/aula_09_upload_imagem.md)
10. [Aula 10 — Estilos e Relacionamento N:N com Tatuadores](aulas/aula_10_estilos_relacionamento.md)
11. [Aula 11 — Organizando as Rotas da API](aulas/aula_11_organizando_rotas.md)
12. [Aula 12 — Landing Page e Cadastro de Usuário](aulas/aula_12_landing_e_cadastro.md)
13. [Aula 13 — Login com Token JWT](aulas/aula_13_login_jwt.md)

Mais aulas serão adicionadas conforme o curso avança — a lista completa e atualizada está em [REGRAS.md](REGRAS.md), na seção "Ordem de desenvolvimento".

## Convenções de código

Antes de escrever a primeira linha, dê uma olhada no [REGRAS.md](REGRAS.md) — ele explica como nomear variáveis e funções, como comentar o código, e como organizar os arquivos neste projeto. As aulas seguem essas regras o tempo todo.

## Se algo travar

Cada aula tem uma seção **"Erros comuns"** com os problemas mais frequentes de quem já passou por ali. Se mesmo assim algo não fizer sentido, fale com a professora responsável pelo curso.
