
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events
} = require('discord.js');

const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const NBA_API =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

// Busca notícias da NBA
async function buscarNoticias() {
  const response = await axios.get(`${NBA_API}/news?limit=8`);
  return response.data.articles || [];
}

// Busca os dados privados da liga ESPN

async function buscarDadosFantasy() {
  const ESPN_S2 = process.env.ESPN_S2?.trim();
  const ESPN_SWID = process.env.ESPN_SWID?.trim();
  const ESPN_LEAGUE_ID = process.env.ESPN_LEAGUE_ID?.trim();
  const ESPN_SEASON = process.env.ESPN_SEASON?.trim();

  if (!ESPN_S2 || !ESPN_SWID || !ESPN_LEAGUE_ID || !ESPN_SEASON) {
    throw new Error('Configurações da ESPN ausentes no .env');
  }

  const url =
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}?view=mSettings&view=mTeam&view=mRoster`;

  const response = await axios.get(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${ESPN_SWID}`,
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json'
    }
  });

  const liga = response.data;

  const equipe = (liga.teams || []).find(time =>
    normalizarNome(time.name || '') ===
    normalizarNome('Cavaleiros do Barra 23')
  ) || (liga.teams || []).find(time => time.id === 3);

  if (!equipe) {
    throw new Error('Não foi possível localizar seu time na liga.');
  }

  return { liga, equipe };
}

// Extrai a média real de Fantasy Points do jogador
function obterMediaFpts(jogador) {
  const estatisticas = jogador.stats || [];

  const reais = estatisticas.filter(
    stat => Number(stat.statSourceId) === 1
  );

  const temporada = reais.find(
    stat =>
      Number(stat.statSplitTypeId) === 0 &&
      Number.isFinite(Number(stat.appliedAverage))
  );

  const alternativa = reais.find(
    stat => Number.isFinite(Number(stat.appliedAverage))
  );

  const estatistica = temporada || alternativa;

  return estatistica
    ? Number(estatistica.appliedAverage)
    : null;
}

async function buscarPontuacaoAoVivo() {
  const {
    ESPN_S2,
    ESPN_SWID,
    ESPN_LEAGUE_ID,
    ESPN_SEASON
  } = process.env;

  const url =
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}?view=mBoxscore&view=mLiveScoring&view=mScoreboard`;

  const response = await axios.get(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2.trim()}; SWID=${ESPN_SWID.trim()}`,
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json'
    }
  });

  const liga = response.data;

  const equipe = (liga.teams || []).find(time =>
    normalizarNome(time.name || '') ===
    normalizarNome('Cavaleiros do Barra 23')
  );

  if (!equipe) {
    throw new Error('Seu time não foi encontrado.');
  }

  const confronto = (liga.schedule || []).find(jogo =>
    jogo.home?.teamId === equipe.id ||
    jogo.away?.teamId === equipe.id
  );

  if (!confronto) {
    return [];
  }

  const lado = confronto.home?.teamId === equipe.id
    ? confronto.home
    : confronto.away;

  const jogadores =
    lado.rosterForCurrentScoringPeriod?.entries || [];

  return jogadores.map(entry => {
    const jogador = entry.playerPoolEntry?.player;
    const pontos =
      entry.playerPoolEntry?.appliedStatTotal ??
      entry.appliedStatTotal ??
      0;

    return {
      nome: jogador?.fullName || 'Jogador desconhecido',
      pontos: Number(pontos)
    };
  }).filter(jogador => jogador.nome !== 'Jogador desconhecido');
}

const acompanhamentosAoVivo = new Map();

async function atualizarMensagemAoVivo(message) {
  const jogadores = await buscarPontuacaoAoVivo();

  if (jogadores.length === 0) {
    await message.edit(
      '🏀 Nenhuma pontuação ao vivo disponível neste momento.'
    );
    return;
  }

  jogadores.sort((a, b) => b.pontos - a.pontos);

  const lista = jogadores.map(jogador =>
    `**${jogador.nome}** — ${jogador.pontos.toFixed(1)} FPTS`
  );

  const total = jogadores.reduce(
    (soma, jogador) => soma + jogador.pontos, 0
  );

  await message.edit(
    `🏀 **CAVALEIROS DO BARRA 23 — AO VIVO**\n` +
    `🔄 Atualização automática a cada 1 minuto\n\n` +
    `${lista.join('\n')}\n\n` +
    `**Total: ${total.toFixed(1)} FPTS**`
  );
}


// Busca lesões da NBA

const JOGADORES_DO_TIME = [
  'Luka Doncic',
  'Kawhi Leonard',
  'Donovan Mitchell',
  'Jayson Tatum',
  'Chet Holmgren',
  "De'Aaron Fox",
  'Franz Wagner',
  'Ty Jerome',
  'Caleb Wilson',
  'Brandin Podziemski',
  'Christian Braun',
  'Ace Bailey',
  'Saddiq Bey',
  'Isaiah Hartenstein',
  "De'Andre Hunter",
  'Myles Turner'
];

const JOGADORES_IMPORTANTES = [
  'Nikola Jokic',
  'Giannis Antetokounmpo',
  'Shai Gilgeous-Alexander',
  'Victor Wembanyama',
  'Joel Embiid',
  'Stephen Curry',
  'LeBron James',
  'Anthony Davis',
  'Kevin Durant',
  'Jalen Brunson',
  'Anthony Edwards',
  'Devin Booker',
  'Trae Young',
  'Tyrese Haliburton',
  'Ja Morant',
  'Paolo Banchero',
  'Alperen Sengun',
  'Jalen Williams',
  'Lauri Markkanen',
  'Jamal Murray',
  'Jayson Tatum',
  'Donovan Mitchell',
  'Kawhi Leonard',
  'Chet Holmgren',
  'Luka Doncic',
  "De'Aaron Fox",
  'Franz Wagner',
  'Lauri Markkanen',
  'Austin Reaves',
  'Og Anunoby',
  'Domantas Sabonis',
  'Cooper Flagg',
  'Paul George',
  'Jaden McDaniels',
  'Ausar Thompson',
  'Deni Avdija',
  'Alperen Sengun',
  'Jimmy Butler',
  'Duncan Robinson'

];

function normalizarNome(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function buscarLesoes() {
  const response = await axios.get(`${NBA_API}/injuries`);

  // A ESPN pode retornar os grupos diretamente ou dentro de "injuries"
  const grupos = Array.isArray(response.data)
    ? response.data
    : response.data.injuries || [];

  const prioritarios = new Set([
    ...JOGADORES_DO_TIME,
    ...JOGADORES_IMPORTANTES
  ].map(normalizarNome));

  const resultados = [];

  for (const grupo of grupos) {
    // Também aceita registros individuais, caso a estrutura mude
    const equipe = grupo.team?.displayName ||
      grupo.team?.name ||
      'Equipe não identificada';

    const registros = grupo.injuries
      ? grupo.injuries
      : [grupo];

    for (const injury of registros) {
      const atleta = injury.athlete || {};
      const nome = atleta.displayName || atleta.fullName;

      if (!nome) continue;

      // Ignora jogadores fora da lista de prioridade
      if (!prioritarios.has(normalizarNome(nome))) continue;

      const detalhes = injury.details || {};

      const retorno = detalhes.returnDate || injury.returnDate || null;

// Data atual em horário de Brasília/Recife
const hoje = new Date().toLocaleDateString('en-CA', {
  timeZone: 'America/Recife'
});

// Converte a previsão de retorno para uma data comparável
let dataRetorno = null;

if (retorno) {
  const data = new Date(retorno);

  if (!isNaN(data.getTime())) {
    dataRetorno = data.toLocaleDateString('en-CA', {
      timeZone: 'America/Recife'
    });
  }
}

// Ignora lesões cuja previsão de retorno já passou
if (dataRetorno && dataRetorno < hoje) continue;

resultados.push({
  nome,
  equipe,
  status:
    injury.status ||
    detalhes.fantasyStatus ||
    'Não informado',
  motivo:
    injury.longComment ||
    injury.shortComment ||
    detalhes.type ||
    injury.type?.description ||
    'Detalhes não informados',
  retorno
});
    }
  }

  // Jogadores do seu elenco aparecem primeiro
  resultados.sort((a, b) => {
    const aDoTime = JOGADORES_DO_TIME
      .some(nome => normalizarNome(nome) === normalizarNome(a.nome));

    const bDoTime = JOGADORES_DO_TIME
      .some(nome => normalizarNome(nome) === normalizarNome(b.nome));

    return Number(bDoTime) - Number(aDoTime);
  });

  return resultados;
}


// Quando o bot conectar
client.once(Events.ClientReady, (bot) => {
  console.log(`Bot conectado como ${bot.user.tag}`);
});

// Comandos
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const command = message.content.toLowerCase().trim();

  // Teste do bot
  if (command === '!nba') {
    return message.reply('🏀 Bot da NBA está online!');
  }

  // Inicia acompanhamento ao vivo
  if (command === '!aovivo') {
    if (acompanhamentosAoVivo.has(message.channel.id)) {
      return message.reply('🏀 O acompanhamento já está ativo!');
    }

    const mensagem = await message.channel.send(
      '🏀 Iniciando acompanhamento do seu elenco...'
    );

    try {
      await atualizarMensagemAoVivo(mensagem);

      const intervalo = setInterval(async () => {
        try {
          await atualizarMensagemAoVivo(mensagem);
        } catch (error) {
          console.error('Erro na atualização ao vivo:', error.message);
        }
      }, 60000);

      acompanhamentosAoVivo.set(message.channel.id, {
        intervalo,
        mensagem
      });

    } catch (error) {
      console.error('Erro ao iniciar acompanhamento:', error.message);
      await mensagem.edit('❌ Não consegui buscar a pontuação ao vivo.');
    }

    return;
  }

  // Para acompanhamento
  if (command === '!pararaovivo') {
    const acompanhamento =
      acompanhamentosAoVivo.get(message.channel.id);

    if (!acompanhamento) {
      return message.reply('Não existe acompanhamento ativo neste canal.');
    }

    clearInterval(acompanhamento.intervalo);
    acompanhamentosAoVivo.delete(message.channel.id);

    return message.reply('⏹️ Acompanhamento ao vivo encerrado!');
  }


  // Meu elenco da ESPN Fantasy
  if (command === '!elenco') {
    try {
      await message.channel.sendTyping();

      const { equipe } = await buscarDadosFantasy();

      const jogadores = equipe.roster?.entries || [];

      if (jogadores.length === 0) {
        return message.reply('Não encontrei jogadores no seu elenco.');
      }

      const lista = jogadores.map(entry => {
        const jogador = entry.playerPoolEntry?.player;

        if (!jogador) return null;

        const media = obterMediaFpts(jogador);

        return {
          nome: jogador.fullName || jogador.firstName,
          media
        };
      }).filter(Boolean);

      lista.sort((a, b) =>
        (b.media ?? -1) - (a.media ?? -1)
      );

      const texto = lista.map(jogador => {
        const fpts = jogador.media !== null
          ? jogador.media.toFixed(1)
          : 'Indisponível';

        return `**${jogador.nome}** — ${fpts} FPTS`;
      });

      await message.reply(
        `🏀 **CAVALEIROS DO BARRA 23 — ELENCO**\n\n${texto.join('\n')}`
      );

    } catch (error) {
      console.error('Erro no elenco:', error.response?.status, error.message);
      await message.reply('❌ Não consegui consultar seu elenco na ESPN.');
    }
  }

  // Resumo da liga e do seu time
  if (command === '!fantasy') {
    try {
      await message.channel.sendTyping();

      const { liga, equipe } = await buscarDadosFantasy();

      const campanha = equipe.record?.overall || equipe.record || {};

      const vitorias = campanha.wins ?? 0;
      const derrotas = campanha.losses ?? 0;
      const empates = campanha.ties ?? 0;

      const pontosFeitos = Number(equipe.pointsFor || 0);
      const pontosSofridos = Number(equipe.pointsAgainst || 0);

      await message.reply(
        `🏆 **${liga.settings?.name || 'Sua liga ESPN'}**\n\n` +
        `🏀 **${equipe.name}**\n` +
        `📊 Campanha: ${vitorias}V - ${derrotas}D - ${empates}E\n` +
        `📈 Pontos feitos: ${pontosFeitos.toFixed(1)}\n` +
        `📉 Pontos sofridos: ${pontosSofridos.toFixed(1)}\n` +
        `👥 Equipes na liga: ${liga.teams?.length || 0}`
      );

    } catch (error) {
      console.error('Erro no Fantasy:', error.response?.status, error.message);
      await message.reply('❌ Não consegui consultar os dados da sua liga.');
    }
  }

  // Jogos do dia
  if (command === '!jogos') {
    try {
      await message.channel.sendTyping();

      const response = await axios.get(
        `${NBA_API}/scoreboard`
      );

      const jogos = response.data.events || [];

      if (jogos.length === 0) {
        return message.reply('🏀 Não há jogos disponíveis no momento.');
      }

      const texto = jogos.map((jogo) => {
        const competicao = jogo.competitions?.[0];
        const equipes = competicao?.competitors || [];

        const mandante = equipes.find(
          (equipe) => equipe.homeAway === 'home'
        );

        const visitante = equipes.find(
          (equipe) => equipe.homeAway === 'away'
        );

        const status =
          jogo.status?.type?.shortDetail || 'Horário não informado';

        const horario = jogo.date
          ? new Date(jogo.date).toLocaleTimeString('pt-BR', {
              timeZone: 'America/Recife',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'A definir';

        return [
          `**${visitante?.team?.displayName || 'Visitante'} x ${mandante?.team?.displayName || 'Mandante'}**`,
          `Placar: ${visitante?.score ?? '-'} x ${mandante?.score ?? '-'}`,
          `Status: ${status}`,
          `Horário: ${horario}`
        ].join('\n');
      });

      await message.reply(
        `🏀 **JOGOS DA NBA**\n\n${texto.join('\n\n')}`.slice(0, 1900)
      );

    } catch (error) {
      console.error('Erro nos jogos:', error.message);
      await message.reply('❌ Não consegui buscar os jogos da NBA.');
    }
  }

  // Notícias da NBA
  if (command === '!noticias') {
    try {
      await message.channel.sendTyping();

      const noticias = await buscarNoticias();

      if (noticias.length === 0) {
        return message.reply('📰 Não encontrei notícias no momento.');
      }

      const texto = noticias.slice(0, 5).map((noticia) => {
        const titulo = noticia.headline || 'Notícia sem título';
        const resumo = noticia.description || '';
        const link = noticia.links?.web?.href || '';

        return [
          `**${titulo}**`,
          resumo,
          link
        ].filter(Boolean).join('\n');
      });

      await message.reply(
        `📰 **ÚLTIMAS NOTÍCIAS DA NBA**\n\n${texto.join('\n\n')}`.slice(0, 1900)
      );

    } catch (error) {
      console.error('Erro nas notícias:', error.message);
      await message.reply('❌ Não consegui buscar as notícias.');
    }
  }

  // Relatório de lesões
  
  // Relatório de lesões
  
  // Relatório de lesões
  
  // Relatório compacto de lesões
  if (command === '!lesoes') {
    try {
      await message.channel.sendTyping();

      const lesoes = await buscarLesoes();

      if (lesoes.length === 0) {
        return message.reply('🏥 Nenhuma lesão importante encontrada.');
      }

      const texto = lesoes.slice(0, 10).map((jogador) => {
        const motivoOriginal = (jogador.motivo || '').toLowerCase();

        let motivo = 'Detalhes não informados';

        if (motivoOriginal.includes('ankle')) motivo = 'Entorse no tornozelo';
        else if (motivoOriginal.includes('knee')) motivo = 'Lesão no joelho';
        else if (motivoOriginal.includes('hamstring')) motivo = 'Lesão na coxa';
        else if (motivoOriginal.includes('calf')) motivo = 'Lesão na panturrilha';
        else if (motivoOriginal.includes('back')) motivo = 'Lesão nas costas';
        else if (motivoOriginal.includes('foot')) motivo = 'Lesão no pé';
        else if (motivoOriginal.includes('wrist')) motivo = 'Lesão no pulso';
        else if (motivoOriginal.includes('shoulder')) motivo = 'Lesão no ombro';
        else if (motivoOriginal.includes('concussion')) motivo = 'Concussão';
        else if (motivoOriginal.includes('illness')) motivo = 'Doença';
        else if (motivoOriginal.includes('hip')) motivo = 'Lesão no quadril';
        else if (motivoOriginal.includes('groin')) motivo = 'Lesão na virilha';
        else if (motivoOriginal.includes('foot')) motivo = 'Lesão no pé';
        else if (motivoOriginal.includes('fractured right hand')) motivo = 'Fratura na mão direita';
        else if (motivoOriginal.includes('fractured left hand')) motivo = 'Fratura na mão esquerda';
        else if (motivoOriginal.includes('swelling')) motivo = 'Inchaço';
        else if (motivoOriginal.includes('ACL')) motivo = 'Ligamento cruzado anterior';
        else if (motivoOriginal.includes('MCL')) motivo = 'Ligamento Colateral Medial';


        let retorno = 'Sem previsão';

        if (jogador.retorno) {
          const data = new Date(jogador.retorno);

          if (!isNaN(data.getTime())) {
            retorno = data.toLocaleDateString('pt-BR', {
              timeZone: 'America/Recife'
            });
          }
        }

        return `**${jogador.nome}**\nLesão: ${motivo}\nRetorno: ${retorno}`;
      });

      await message.reply(
        `🏥 **LESÕES IMPORTANTES**\n\n${texto.join('\n\n')}`.slice(0, 1900)
      );

    } catch (error) {
      console.error('Erro nas lesões:', error.message);
      await message.reply('❌ Erro ao buscar lesões.');
    }
  }



});

// Inicia o bot
client.login(process.env.DISCORD_TOKEN);
