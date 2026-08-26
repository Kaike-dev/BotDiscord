# Bot de Torneios para Discord

Bot em **JavaScript (ES Modules) + discord.js** para criar torneios, cadastrar jogadores, registrar partidas e consultar a classificação pelo Discord.

Os dados continuam no mesmo formato JSON, agora em `data/tournaments.json`. Os torneios que já estavam cadastrados foram preservados.

## Funcionalidades

- Criação de torneios nos formatos pontos corridos, fase de grupos, suíço e mata-mata.
- Cadastro manual de jogadores.
- Registro de vitórias, derrotas e empates.
- Tabela com jogos, resultados, pontos e porcentagens de vitória.
- Vários torneios, com seleção de um torneio ativo.
- Persistência local em JSON.

## Requisitos

- Node.js 20 ou superior. Para uma instalação nova, prefira uma versão LTS atual.
- Uma aplicação com bot criada no [Discord Developer Portal](https://discord.com/developers/applications).

## Configuração no Discord

1. Abra o Discord Developer Portal e crie ou selecione sua aplicação.
2. Em **General Information**, copie o **Application ID**. Esse valor será o `CLIENT_ID`.
3. Em **Bot**, crie ou redefina o token e copie-o. Esse valor será o `DISCORD_TOKEN`.
4. Instale o bot no servidor com os escopos `bot` e `applications.commands`. Conceda ao menos as permissões para visualizar o canal, enviar mensagens e anexar arquivos.
5. Para obter o `GUILD_ID`, ative o **Modo desenvolvedor** em Discord > Configurações > Avançado, clique com o botão direito no servidor e escolha **Copiar ID do servidor**.

O token é secreto. Não o envie para outras pessoas, não o publique e não o adicione ao Git. Se ele for exposto, redefina-o imediatamente no Developer Portal.

## Instalação local

Instale as dependências:

```bash
npm install
```

Copie `.env.example` para `.env`. No PowerShell:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Preencha o arquivo sem aspas:

```dotenv
DISCORD_TOKEN=seu_token_do_bot
CLIENT_ID=id_da_aplicacao
GUILD_ID=id_do_servidor_opcional
DATA_FILE=./data/tournaments.json
```

Variáveis disponíveis:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DISCORD_TOKEN` | Sim | Autentica o bot no Discord. |
| `CLIENT_ID` | Sim para o deploy | Identifica a aplicação ao registrar os slash commands. |
| `GUILD_ID` | Não | Registra comandos apenas nesse servidor, ideal para desenvolvimento. Vazio significa registro global. |
| `DATA_FILE` | Não | Caminho do JSON. O padrão é `./data/tournaments.json`. |

Este projeto usa um único arquivo de dados. Para evitar que servidores diferentes compartilhem torneios, preencha `GUILD_ID` e instale o bot somente no servidor correspondente. Se você optar por comandos globais, todas as instalações usarão o mesmo estado.

Por compatibilidade com o bot original, os comandos de alteração não exigem uma permissão administrativa específica. O administrador pode restringi-los em **Configurações do servidor > Integrações > Bots e aplicativos**.

## Registrar e iniciar o bot

Registre os slash commands antes da primeira execução:

```bash
npm run deploy:commands
```

Esse comando precisa ser repetido quando nomes, opções ou descrições dos comandos mudarem. Com `GUILD_ID`, a atualização aparece rapidamente apenas naquele servidor; sem ele, o registro é global e pode levar algum tempo para se propagar.

Depois, inicie o bot:

```bash
npm start
```

## Comandos do Discord

- `/new_tournament`: cria um torneio e o define como ativo.
- `/add_player`: adiciona um jogador ao torneio ativo ou a um torneio informado.
- `/record_match`: registra o resultado entre dois jogadores.
- `/set_active`: escolhe o torneio ativo.
- `/list_tournaments`: lista os torneios cadastrados.
- `/show_table`: exibe a classificação.

## Testes e verificação

Execute os testes automatizados:

```bash
npm test
```

Verifique a sintaxe dos arquivos JavaScript:

```bash
npm run check
```

## Docker

O Docker Compose executa somente o bot. Ele monta o diretório local `data/` em `/app/data`, permitindo a gravação atômica do JSON e preservando os dados quando o container é recriado.

Antes de subir o serviço, confirme que `.env` está preenchido e que `data/tournaments.json` existe. Para registrar os comandos usando a imagem:

```bash
docker compose build
docker compose run --rm bot npm run deploy:commands
```

Inicie o bot em segundo plano e acompanhe os logs:

```bash
docker compose up -d
docker compose logs -f bot
```

Para encerrar:

```bash
docker compose down
```

O arquivo local `data/tournaments.json` permanece fora do container. Faça backup dele antes de alterações manuais e execute apenas uma instância do bot quando usar armazenamento em JSON, para evitar gravações concorrentes entre processos.

## Estrutura principal

```text
src/
├── commands/             # Slash commands
├── data/json-store.js    # Leitura e gravação do JSON
├── domain/               # Regras de classificação
├── utils/                # Formatação da tabela
├── deploy-commands.js    # Registro dos comandos no Discord
└── index.js              # Inicialização do bot
test/                     # Testes com node:test
data/tournaments.json     # Dados persistidos
```
