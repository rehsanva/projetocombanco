from fastapi import FastAPI
from rotas import clientes         # importa as rotas de clientes

app = FastAPI()

app.include_router(clientes.router)  # registra as rotas de clientes na API


@app.get("/")
def inicio():
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}