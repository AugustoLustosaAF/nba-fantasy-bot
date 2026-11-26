# 🏀 NBA Fantasy Bot

Bot para Discord desenvolvido em **Node.js**, com integração à NBA e ESPN Fantasy. O objetivo é oferecer informações, estatísticas e ferramentas para acompanhar a NBA e gerenciar seu time no fantasy.

## 🚀 Funcionalidades

- 🏀 Consulta de jogos da NBA.
- 📰 Notícias da NBA.
- 🏥 Relatório de lesões dos jogadores.
- 📊 Consulta de elenco e informações da liga ESPN Fantasy.
- ⚡ Acompanhamento de pontuação fantasy ao vivo.
- 👤 Análise individual de jogadores.
- 🔄 Comparação entre jogadores.
- 🤝 Análise de trocas entre jogadores, considerando médias de Fantasy Points e desempenho recente.

## 📌 Comandos disponíveis

| Comando | Descrição |
|---|---|
| `!nba` | Informações da NBA |
| `!jogos` | Jogos da NBA |
| `!noticias` | Notícias recentes |
| `!lesoes` | Relatório de lesões |
| `!elenco` | Consulta do elenco fantasy |
| `!fantasy` | Resumo da liga fantasy |
| `!aovivo` | Inicia acompanhamento fantasy ao vivo |
| `!pararaovivo` | Para o acompanhamento ao vivo |
| `!jogador Nome` | Analisa um jogador |
| `!comparar Jogador 1, Jogador 2` | Compara jogadores |
| `!troca Jogadores enviados \| Jogadores recebidos` | Analisa uma proposta de troca |

## 🛠️ Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [Discord.js](https://discord.js.org/)
- [Axios](https://axios-http.com/)
- [Dotenv](https://www.npmjs.com/package/dotenv)
- [ESPN Fantasy API](https://www.espn.com/fantasy/)

## ⚙️ Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/AugustoLustosaAF/nba-fantasy-bot.git
```

### 2. Entre na pasta

```bash
cd nba-fantasy-bot
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DISCORD_TOKEN=seu_token_do_bot
ESPN_S2=seu_cookie_espn_s2
ESPN_SWID=seu_cookie_espn_swid
ESPN_LEAGUE_ID=id_da_sua_liga
ESPN_SEASON=2027
```

**Importante:** substitua os valores pelos seus próprios dados. Nunca compartilhe seu arquivo `.env` ou publique seus tokens e cookies no GitHub.

### 5. Inicie o bot

```bash
npm run dev
```

## 📂 Estrutura do projeto

```text
nba-fantasy-bot/
├── src/
│   ├── commands/
│   │   ├── aoVivo.js
│   │   ├── comparar.js
│   │   ├── fantasy.js
│   │   ├── jogador.js
│   │   ├── lesoes.js
│   │   ├── nba.js
│   │   ├── noticias.js
│   │   └── troca.js
│   ├── services/
│   │   ├── espnService.js
│   │   └── nbaPlayerService.js
│   ├── utils/
│   │   └── formatarDados.js
│   └── index.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## 🔒 Segurança

As credenciais são armazenadas localmente no arquivo `.env`, que não deve ser enviado ao GitHub.

## 👨‍💻 Desenvolvedor

**Augusto Lustosa**

Projeto desenvolvido para integrar informações da NBA e ferramentas de ESPN Fantasy diretamente no Discord.

---

*Projeto em desenvolvimento. Novas funcionalidades e melhorias poderão ser adicionadas.*