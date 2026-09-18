# Aula 2 — Criando o banco de dados no MySQL

## O que vamos criar

O banco de dados do nosso estúdio de tatuagem. Você já conhece esse processo — vamos só executar o script no XAMPP.

---

## Passo 1 — Abra o XAMPP

1. Abra o XAMPP Control Panel
2. Clique em **Start** no Apache e no MySQL
3. Clique em **Admin** ao lado do MySQL (abre o phpMyAdmin)

---

## Passo 2 — Execute o script

No phpMyAdmin, clique na aba **SQL** e cole o script abaixo:

```sql
-- Cria e seleciona o banco
CREATE DATABASE estudio_tatuagem;
USE estudio_tatuagem;

-- Níveis de experiência dos tatuadores (Júnior, Pleno, Sênior)
CREATE TABLE senioridade (
    idsenioridade INT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(50) NOT NULL
);

-- Estilos de tatuagem (Blackwork, Aquarela, etc.)
CREATE TABLE estilo (
    idestilo  INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(50) NOT NULL
);

-- Tatuadores do estúdio
CREATE TABLE tatuador (
    idtatuador      INT AUTO_INCREMENT PRIMARY KEY,
    nometatuador    VARCHAR(100) NOT NULL,
    cpf             CHAR(11)     NOT NULL UNIQUE,
    email           VARCHAR(100),
    telefone        VARCHAR(20),
    datacontratacao DATE,
    idsenioridade   INT NOT NULL,
    FOREIGN KEY (idsenioridade) REFERENCES senioridade(idsenioridade)
);

-- Quais estilos cada tatuador domina (relação N:N)
CREATE TABLE tatuador_estilo (
    idtatuador INT  NOT NULL,
    idestilo   INT  NOT NULL,
    dataestilo DATE,                        -- data em que o tatuador começou a trabalhar com esse estilo
    PRIMARY KEY (idtatuador, idestilo),
    FOREIGN KEY (idtatuador) REFERENCES tatuador(idtatuador),
    FOREIGN KEY (idestilo)   REFERENCES estilo(idestilo)
);

-- Clientes do estúdio
CREATE TABLE cliente (
    idcliente    INT AUTO_INCREMENT PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    cpf          CHAR(11)     NOT NULL UNIQUE,
    telefone     VARCHAR(20),
    datacadastro DATE,
    cidade       VARCHAR(100),
    uf           CHAR(2)
);

-- Agendamentos de sessões
CREATE TABLE agendamento (
    idagendamento     INT AUTO_INCREMENT PRIMARY KEY,
    idcliente         INT            NOT NULL,
    idtatuador        INT            NOT NULL,
    dataagendamento   DATE           NOT NULL,
    horaagendamento   TIME           NOT NULL,
    descricaotatuagem TEXT,
    desenhoaprovado   VARCHAR(255),                                        -- caminho do arquivo com o desenho aprovado
    valortatuagem     DECIMAL(10,2),                                       -- valor combinado da tatuagem
    status            ENUM('pendente','confirmado','concluido','cancelado') -- situação do agendamento
                      NOT NULL DEFAULT 'pendente',
    FOREIGN KEY (idcliente)  REFERENCES cliente(idcliente),
    FOREIGN KEY (idtatuador) REFERENCES tatuador(idtatuador)
);
```

Clique em **Executar**.

---

## Passo 3 — Insira dados de teste

Ainda na aba **SQL**, cole e execute:

```sql
USE estudio_tatuagem;

INSERT INTO senioridade (nome) VALUES ('Júnior'), ('Pleno'), ('Sênior');

INSERT INTO estilo (descricao) VALUES ('Blackwork'), ('Aquarela'), ('Realismo'), ('Old School');

INSERT INTO tatuador (nometatuador, cpf, email, telefone, datacontratacao, idsenioridade) VALUES
    ('Lucas Mendes', '11111111111', 'lucas@estudio.com', '11999990001', '2020-03-01', 3),
    ('Carla Souza',  '22222222222', 'carla@estudio.com', '11999990002', '2022-06-15', 2),
    ('Pedro Lima',   '33333333333', 'pedro@estudio.com', '11999990003', '2024-01-10', 1);

INSERT INTO tatuador_estilo (idtatuador, idestilo, dataestilo) VALUES
    (1, 1, '2020-03-01'),
    (1, 3, '2021-05-10'),
    (2, 2, '2022-06-15'),
    (3, 4, '2024-01-10');

INSERT INTO cliente (nome, cpf, telefone, datacadastro, cidade, uf) VALUES
    ('Ana Silva',   '44444444444', '11988880001', '2024-01-15', 'São Paulo',      'SP'),
    ('Bruno Costa', '55555555555', '31988880002', '2024-03-22', 'Belo Horizonte', 'MG');

INSERT INTO agendamento (idcliente, idtatuador, dataagendamento, horaagendamento, descricaotatuagem, valortatuagem, status) VALUES
    (1, 1, '2025-05-10', '14:00', 'Mandala no braço',       350.00, 'pendente'),
    (2, 2, '2025-05-11', '10:00', 'Rosa aquarela no ombro', 200.00, 'pendente');
```

---

## Verifique se funcionou

Na coluna esquerda do phpMyAdmin você deve ver o banco **estudio_tatuagem** com as 6 tabelas.

Clique em qualquer tabela → aba **Visualizar** para conferir os dados.

---

## Passo 4 — Salvar o banco como backup

Como os computadores da escola são congelados, o banco criado hoje pode desaparecer quando a máquina for reiniciada ou quando a aula terminar.

Por isso, vamos salvar uma cópia do banco em um arquivo SQL dentro da pasta **banco/** do projeto.

### Como fazer

1. No phpMyAdmin, Selecione o banco **estudio_tatuagem**. 
2. clique na aba **Exportar**.
3. Escolha o Método de exportação  **Personalizada**
4. Escolha o formato **SQL**.
5. Cofirme se todas as tabelas estão selecionas
6. Adicione a instrução: **Adicionar comando CREATE DATABASE / USE**
7. Clique em **Exportar** para baixar o arquivo.
8. Salve o arquivo dentro da pasta **banco/** com o nome **estudio_tatuagem.sql**.

### Por que isso é importante?

Esse arquivo será nosso "backup" do banco. Na próxima aula, ou em qualquer outra aula que usar o banco, vamos importar esse arquivo de volta no MySQL.

> Se o banco for alterado nas próximas aulas, vale a pena exportar de novo e substituir o arquivo anterior, para manter tudo atualizado.

---

## Próxima aula

Na **Aula 3** vamos instalar o Python e o FastAPI para começar a criar a API.
