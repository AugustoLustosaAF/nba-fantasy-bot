
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events
} = require('discord.js');


const {
  executarComandoAoVivo
} = require('./commands/aoVivo');

const {
  executarComandoFantasy
} = require('./commands/fantasy');

const {
  executarComandoNBA
} = require('./commands/nba');

const {
  executarComandoNoticias
} = require('./commands/noticias');

const {
  executarComandoLesoes
} = require('./commands/lesoes');

const {
  executarComandoComparar
} = require('./commands/comparar');

const { executarComandoJogador } = require('./commands/jogador');

const {
  executarComandoTroca
} = require('./commands/troca');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// Quando o bot conectar
client.once(Events.ClientReady, (bot) => {
  console.log(`Bot conectado como ${bot.user.tag}`);
});

// Comandos
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const command = message.content.toLowerCase().trim();
console.log('COMANDO RECEBIDO:', command);

// Comandos de acompanhamento ao vivo
if (
  command === '!aovivo' ||
  command.startsWith('!aovivo ') ||
  command === '!pararaovivo'
) {
  await executarComandoAoVivo(message);
  return;
}

// Comandos da ESPN Fantasy
if (
  command === '!elenco' ||
  command === '!fantasy'
) {
  await executarComandoFantasy(message, command);
  return;
}

// Comandos gerais da NBA
if (
  command === '!nba' ||
  command === '!jogos'
) {
  await executarComandoNBA(message, command);
  return;
}

  // Notícias da NBA
if (command === '!noticias') {
  await executarComandoNoticias(message);
  return;
}

// Relatório de lesões
if (command === '!lesoes') {
  await executarComandoLesoes(message);
  return;
}

if (command.startsWith('!jogador')) {
  const nome = message.content.trim().slice('!jogador'.length).trim();

  await executarComandoJogador(message, nome);
  return;
}


if (command.startsWith('!comparar')) {
  const argumento = message.content
    .trim()
    .slice('!comparar'.length)
    .trim();

  const nomes = argumento
    .split('|')
    .map(nome => nome.trim())
    .filter(Boolean);

  if (nomes.length !== 2) {
    await message.reply(
      'Informe dois jogadores separados por |. Exemplo: `!comparar Nikola Jokic | Luka Doncic`'
    );
    return;
  }

  await executarComandoComparar(message, nomes);
  return;
}

// Análise de trocas da Fantasy
if (command.startsWith('!troca')) {
  const argumento = message.content
    .trim()
    .slice('!troca'.length)
    .trim();

  const lados = argumento.split('|');

  if (lados.length !== 2) {
    await message.reply(
      'Use: `!troca Jogador 1, Jogador 2 | Jogador 3`'
    );
    return;
  }

  const nomesEnviados = lados[0]
    .split(',')
    .map(nome => nome.trim())
    .filter(Boolean);

  const nomesRecebidos = lados[1]
    .split(',')
    .map(nome => nome.trim())
    .filter(Boolean);

  await executarComandoTroca(
    message,
    nomesEnviados,
    nomesRecebidos
  );

  return;
}

}
);

// Inicia o bot
client.login(process.env.DISCORD_TOKEN);
