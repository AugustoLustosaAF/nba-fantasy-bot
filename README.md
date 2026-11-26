# 🏀 NBA Fantasy Bot

Bot para Discord desenvolvido em **Node.js**, com foco em NBA e ESPN Fantasy Basketball.

O projeto reúne informações da NBA, notícias, lesões, estatísticas de jogadores, classificação das conferências e ferramentas para acompanhar e analisar uma liga privada do ESPN Fantasy.

---

## 📌 Funcionalidades

### 🏀 NBA
- Consulta de jogos da NBA.
- Acompanhamento de partidas ao vivo.
- Classificação das Conferências Leste e Oeste.
- Consulta de informações individuais das equipes.
- Estatísticas e desempenho dos jogadores.
- Notícias da NBA.
- Relatório de lesões dos jogadores.

### 🏆 ESPN Fantasy Basketball
- Consulta do elenco da equipe.
- Acompanhamento da pontuação ao vivo.
- Análise individual de jogadores.
- Comparação entre dois jogadores.
- Análise de trocas entre jogadores.
- Integração com os dados de uma liga privada da ESPN.

---

## 🤖 Comandos disponíveis

| Comando | Descrição |
|---|---|
| `!nba` | Consulta os jogos da NBA |
| `!jogos` | Consulta os jogos da NBA |
| `!noticias` | Exibe notícias da NBA |
| `!lesoes` | Consulta o relatório de lesões |
| `!classificacao` | Mostra a classificação das conferências |
| `!time Lakers` | Exibe informações de uma equipe |
| `!jogador Nikola Jokic` | Analisa um jogador |
| `!comparar Nikola Jokic \| Luka Doncic` | Compara dois jogadores |
| `!elenco` | Consulta o elenco da equipe Fantasy |
| `!fantasy` | Consulta informações da ESPN Fantasy |
| `!aovivo` | Acompanha a pontuação ao vivo da Fantasy |
| `!pararaovivo` | Encerra o acompanhamento ao vivo |
| `!troca Jogador 1 \| Jogador 2` | Analisa uma proposta de troca |

### Exemplos

Consultar um time:

```text
!time Lakers
```

Consultar um jogador:

```text
!jogador Nikola Jokic
```

Comparar jogadores:

```text
!comparar Nikola Jokic | Luka Doncic
```

Consultar classificação:

```text
!classificacao
```

Analisar uma troca:

```text
!troca Nikola Jokic | Joel Embiid
```

---

## 🛠️ Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
- [Discord.js](https://discord.js.org/)
- [Axios](https://axios-http.com/)
- [Dotenv](https://www.npmjs.com/package/dotenv)
- [ESPN Fantasy API](https://fantasy.espn.com/)
- [ESPN NBA API](https://site.api.espn.com/)

---

## 📂 Estrutura do projeto

```text
nba-fantasy-assistant/
│
├── src/
│   ├── commands/
│   │   ├── aoVivo.js
│   │   ├── classificacao.js
│   │   ├── comparar.js
│   │   ├── fantasy.js
│   │   ├── jogador.js
│   │   ├── lesoes.js
│   │   ├── nba.js
│   │   ├── noticias.js
│   │   ├── time.js
│   │   └── troca.js
│   │
│   ├── services/
│   │   └── nbaTeamService.js
│   │
│   └── index.js
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Instalação

### 1. Pré-requisitos

Antes de começar, você precisa ter instalado:

- Node.js
- npm
- Git
- Uma conta no Discord

### 2. Clonar o repositório

```bash
git clone https://github.com/AugustoLustosaAF/nba-fantasy-bot.git
```

Entre na pasta:

```bash
cd nba-fantasy-bot
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Configurar as variáveis de ambiente

Crie um arquivo chamado `.env` na raiz do projeto.

Adicione as seguintes variáveis:

```env
DISCORD_TOKEN=seu_token_do_bot

ESPN_S2=seu_cookie_espn_s2
ESPN_SWID=seu_cookie_espn_swid

ESPN_LEAGUE_ID=id_da_sua_liga
ESPN_SEASON=2026
```

**Importante:** substitua os valores pelos seus próprios dados.

Nunca compartilhe seu token do Discord ou os cookies privados da ESPN.

### 5. Executar o bot

```bash
npm run dev
```

Se tudo estiver configurado corretamente, o terminal exibirá uma mensagem indicando que o bot está conectado ao Discord.

---

## 🔐 Segurança

As informações privadas devem permanecer no arquivo `.env`.

O arquivo `.env` não deve ser enviado ao GitHub.

O projeto utiliza `.gitignore` para evitar o compartilhamento acidental de credenciais e dependências locais.

---

## 🚀 Próximas melhorias

O projeto está em desenvolvimento e poderá receber novas funcionalidades, como:

- Consulta de elenco completo das equipes da NBA.
- Estatísticas avançadas dos times.
- Histórico de partidas.
- Melhorias nas análises de Fantasy.
- Novos recursos de acompanhamento ao vivo.
- Melhorias na apresentação das mensagens no Discord.

---

## 👨‍💻 Desenvolvedor

**Augusto Lustosa**

GitHub: [@AugustoLustosaAF](https://github.com/AugustoLustosaAF)

Repositório: [NBA Fantasy Bot](https://github.com/AugustoLustosaAF/nba-fantasy-bot)

---

Desenvolvido com 🏀 e JavaScript para acompanhar a NBA e o ESPN Fantasy Basketball.