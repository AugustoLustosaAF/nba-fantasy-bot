
const axios = require('axios');
const { normalizarNome } = require('../utils/formatarDados');

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
  `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}?view=mSettings&view=mTeam&view=mRoster&view=mBoxscore&view=mLiveScoring&view=mScoreboard`;

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

// Extrai a média real de Fantasy Points
function obterMediaFpts(jogador) {
  const estatisticas = jogador.stats || [];

  const reais = estatisticas.filter(
    stat => Number(stat.statSourceId) === 0 &&
      Number(stat.seasonId) === Number(process.env.ESPN_SEASON)
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

// Busca pontuação ao vivo


async function buscarPontuacaoAoVivo(nomeEquipe = 'Cavaleiros do Barra 23') {
  const ESPN_S2 = process.env.ESPN_S2?.trim();
  const ESPN_SWID = process.env.ESPN_SWID?.trim();
  const ESPN_LEAGUE_ID = process.env.ESPN_LEAGUE_ID?.trim();
  const ESPN_SEASON = process.env.ESPN_SEASON?.trim();

  if (!ESPN_S2 || !ESPN_SWID || !ESPN_LEAGUE_ID || !ESPN_SEASON) {
    throw new Error('Configurações da ESPN ausentes no .env');
  }

  const url =
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}?view=mSettings&view=mTeam&view=mRoster&view=mBoxscore&view=mLiveScoring&view=mScoreboard`;

  const response = await axios.get(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${ESPN_SWID}`,
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json'
    }
  });

  const liga = response.data;
  const scoringPeriodId = Number(liga.scoringPeriodId);

  const equipe = (liga.teams || []).find(time =>
    normalizarNome(time.name || '') === normalizarNome(nomeEquipe)
  );

  if (!equipe) {
    throw new Error(`O time "${nomeEquipe}" não foi encontrado nesta liga.`);
  }

  const jogadores = equipe.roster?.entries || [];

  const vagasTitulares = [0, 1, 2, 3, 4, 5, 6, 11];

  const titulares = jogadores.filter(entry =>
    vagasTitulares.includes(Number(entry.lineupSlotId))
  );

  const resultado = titulares.map(entry => {
    const jogador = entry.playerPoolEntry?.player;

    const estatisticasDoDia = jogador?.stats?.find(stat =>
      Number(stat.seasonId) === Number(ESPN_SEASON) &&
      Number(stat.scoringPeriodId) === scoringPeriodId &&
      Number(stat.statSourceId) === 0 &&
      Number(stat.statSplitTypeId) === 5
    );

    return {
      nome: jogador?.fullName || 'Jogador desconhecido',
      pontos: Number(estatisticasDoDia?.appliedTotal ?? 0)
    };
  });

  console.log(`DEBUG AO VIVO - ${equipe.name}:`, {
    scoringPeriodId,
    titulares: resultado.length
  });

  return resultado.filter(jogador =>
    jogador.nome !== 'Jogador desconhecido'
  );
}

module.exports = {
  buscarDadosFantasy,
  obterMediaFpts,
  buscarPontuacaoAoVivo
};
