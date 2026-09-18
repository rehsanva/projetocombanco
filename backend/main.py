from fastapi import FastAPI  # importa o FastAPI

app = FastAPI()              # cria a aplicação


@app.get("/")                # define que essa função responde ao endereço "/"
def inicio():                # quando alguém acessar "/", essa função vai rodar
    return {"mensagem": "API do estúdio de tatuagem funcionando!"}
