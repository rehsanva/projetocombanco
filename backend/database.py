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