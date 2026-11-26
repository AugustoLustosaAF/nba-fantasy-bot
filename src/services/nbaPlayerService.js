
const axios = require('axios');
const { buscarDadosFantasy } = require('./espnService');

const TEMPORADA = process.env.ESPN_SEASON || '2027';

function numero(valor) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function separarArremessos(valor) {
  const partes = String(valor || '0-0').split('-');

  return {
    convertidos: numero(partes[0]),
    tentados: numero(partes[1])
  };
}

// Converte os dados da ESPN em estatísticas identificadas pelos IDs da Fantasy.
function extrairEstatisticas(stats) {
  const arremessos = separarArremessos(stats[1]);
  const tresPontos = separarArremessos(stats[3]);
  const lancesLivres = separarArremessos(stats[5]);

  return {
    0: numero(stats[13]),              // Pontos
    1: numero(stats[9]),               // Tocos
    2: numero(stats[10]),              // Roubos
    3: numero(stats[8]),               // Assistências
    6: numero(stats[7]),               // Rebotes
    11: numero(stats[12]),             // Turnovers
    13: arremessos.convertidos,        // FGM
    14: arremessos.tentados,           // FGA
    15: lancesLivres.convertidos,      // FTM
    16: lancesLivres.tentados,         // FTA
    17: tresPontos.convertidos,       // 3PTM

    minutos: numero(stats[0])
  };
}

// Calcula os pontos usando as regras reais da liga.
function calcularFPTS(estatisticas, regras) {
  return regras.reduce((total, regra) => {
    const valor = estatisticas[regra.statId];

    if (valor === undefined) {
      throw new Error(
        `Estatística ESPN não mapeada: ID ${regra.statId}`
      );
    }

    return total + (valor * numero(regra.points));
  }, 0);
}

function calcularMedia(jogos, campo) {
  if (!jogos.length) return 0;

  const total = jogos.reduce(
    (soma, jogo) => soma + jogo[campo],
    0
  );

  return total / jogos.length;
}

async function buscarJogador(nome) {
  const busca = await axios.get(
    'https://site.api.espn.com/apis/common/v3/search',
    {
      params: {
        query: nome,
        limit: 10,
        type: 'player',
        sport: 'basketball',
        league: 'nba'
      }
    }
  );

  const jogadores = busca.data.items || [];

  if (!jogadores.length) {
    throw new Error('Não encontrei esse jogador na NBA.');
  }

  const jogador = jogadores.find(item =>
    item.displayName?.toLowerCase() === nome.toLowerCase()
  ) || jogadores[0];

  return jogador;
}

async function buscarAnaliseJogador(nome) {
  if (!nome || !nome.trim()) {
    throw new Error('Informe o nome de um jogador.');
  }

  // Busca as regras de pontuação da EpentaLeague.
  const { liga } = await buscarDadosFantasy();

  const regras =
    liga.settings?.scoringSettings?.scoringItems;

  if (!regras?.length) {
    throw new Error('Não consegui obter as regras de pontuação da liga.');
  }

  // Busca o jogador.
  const jogador = await buscarJogador(nome.trim());

  // Consulta o histórico de partidas.
  const url =
    `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${jogador.id}/gamelog?season=${TEMPORADA}`;

  const resposta = await axios.get(url);
  const dados = resposta.data;

  const categorias = (dados.seasonTypes || [])
    .flatMap(tipo => tipo.categories || []);

  const partidas = categorias.flatMap(categoria =>
    (categoria.events || []).map(evento => {
      const detalhes = dados.events?.[evento.eventId];

      return {
        id: evento.eventId,
        data: detalhes?.gameDate || '',
        adversario:
          detalhes?.opponent?.displayName ||
          detalhes?.opponent?.abbreviation ||
          'Não informado',
        stats: evento.stats
      };
    })
  );

  // Converte e calcula os Fantasy Points.
  const jogos = partidas
    .filter(partida =>
      Array.isArray(partida.stats) &&
      partida.stats.length >= 14 &&
      numero(partida.stats[0]) > 0
    )
    .map(partida => {
      const estatisticas = extrairEstatisticas(partida.stats);

      return {
        id: partida.id,
        data: partida.data,
        adversario: partida.adversario,
        minutos: estatisticas.minutos,
        pontos: estatisticas[0],
        rebotes: estatisticas[6],
        assistencias: estatisticas[3],
        roubos: estatisticas[2],
        turnovers: estatisticas[11],
        fpts: calcularFPTS(estatisticas, regras),
        fpts: calcularFPTS(estatisticas, regras)
      };
    })
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  if (!jogos.length) {
    throw new Error('Não encontrei partidas disputadas por esse jogador nesta temporada.');
  }

  const ultimos5 = jogos.slice(0, 5);
  const ultimos10 = jogos.slice(0, 10);

  const media5 = calcularMedia(ultimos5, 'fpts');
  const media10 = calcularMedia(ultimos10, 'fpts');
  const mediaTemporada = calcularMedia(jogos, 'fpts');

  const mediaMinutos = calcularMedia(jogos, 'minutos');
  const mediaPontos = calcularMedia(jogos, 'pontos');
  const mediaRebotes = calcularMedia(jogos, 'rebotes');
  const mediaAssistencias = calcularMedia(jogos, 'assistencias');
  const mediaRoubos = calcularMedia(jogos, 'roubos');
  const mediaTurnovers = calcularMedia(jogos, 'turnovers');

  // Melhor e pior partida da temporada
  const melhorJogo = jogos.reduce(
    (melhor, jogo) => jogo.fpts > melhor.fpts ? jogo : melhor,
    jogos[0]
  );

  const piorJogo = jogos.reduce(
    (pior, jogo) => jogo.fpts < pior.fpts ? jogo : pior,
    jogos[0]
  );

  // Maior sequência de partidas acima da média da temporada
  const jogosCronologicos = [...jogos].reverse();

  let sequenciaAtual = 0;
  let maiorSequencia = 0;

  for (const jogo of jogosCronologicos) {
    if (jogo.fpts > mediaTemporada) {
      sequenciaAtual++;
      maiorSequencia = Math.max(maiorSequencia, sequenciaAtual);
    } else {
      sequenciaAtual = 0;
    }
  }

  // Variação dos últimos 5 jogos em relação à média da temporada
  const variacaoPercentual = mediaTemporada
    ? ((media5 - mediaTemporada) / mediaTemporada) * 100
    : 0;

  // Tendência comparando os últimos 5 com os 5 anteriores
  const anteriores5 = jogos.slice(5, 10);

  
  // Tendência comparando os últimos 5 com os 5 anteriores
  let tendencia = 'Dados insuficientes';

  if (anteriores5.length === 5) {
    const mediaAnterior = calcularMedia(anteriores5, 'fpts');

    if (media5 > mediaAnterior) {
      tendencia = 'Em alta';
    } else if (media5 < mediaAnterior) {
      tendencia = 'Em baixa';
    } else {
      tendencia = 'Estável';
    }
  }

  return {
    jogador: {
      id: jogador.id,
      nome: jogador.displayName,
      equipe: jogador.teamRelationships?.[0]?.displayName || 'Não informada',
      posicao: jogador.position?.displayName || 'Não informada',
      imagem: jogador.headshot?.href || null
    },

    totalJogos: jogos.length,
    mediaTemporada,
    media5,
    media10,
    mediaMinutos,
    mediaPontos,
    mediaRebotes,
    mediaAssistencias,
    mediaRoubos,
    mediaTurnovers,
    melhorJogo,
    piorJogo,
    maiorSequencia,
    variacaoPercentual,
    tendencia,
    jogosRecentes: ultimos5
  };
}

module.exports = {
  buscarAnaliseJogador
};
