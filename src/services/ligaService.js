const axios = require('axios');

const VIEWS = ['mSettings', 'mTeam', 'mRoster', 'mMatchup', 'mMatchupScore', 'mLiveScoring', 'mScoreboard'];
const PLACAR_NBA = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const POSICOES = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' };
const VAGAS = {
  0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 7: 'SG/SF',
  8: 'G/F', 9: 'PF/C', 10: 'F/C', 11: 'UTIL', 12: 'Banco', 13: 'IR'
};

// Guarda a resposta por alguns segundos para várias pessoas não repetirem a chamada.
function comCache(buscar, duracaoMs) {
  let guardado = null;
  let validade = 0;

  return () => {
    if (!guardado || Date.now() > validade) {
      validade = Date.now() + duracaoMs;
      guardado = buscar().catch(erro => {
        guardado = null;
        throw erro;
      });
    }
    return guardado;
  };
}

async function consultarFantasy(consulta, cabecalhos = {}) {
  const { ESPN_S2, ESPN_SWID, ESPN_LEAGUE_ID, ESPN_SEASON } = process.env;

  if (!ESPN_S2 || !ESPN_SWID || !ESPN_LEAGUE_ID || !ESPN_SEASON) {
    throw new Error('Configurações da ESPN ausentes no .env');
  }

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_SEASON.trim()}/segments/0/leagues/${ESPN_LEAGUE_ID.trim()}?${consulta}`;

  const resposta = await axios.get(url, {
    timeout: 15000,
    headers: {
      Cookie: `espn_s2=${ESPN_S2.trim()}; SWID=${ESPN_SWID.trim()}`,
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
      ...cabecalhos
    }
  });

  return resposta.data;
}

const buscarLiga = comCache(
  () => consultarFantasy(VIEWS.map(view => `view=${view}`).join('&')),
  60000
);

// Os 200 jogadores sem time mais escalados na ESPN.
const buscarLivres = comCache(async () => {
  const liga = await buscarLiga();
  const temporada = Number(liga.seasonId || process.env.ESPN_SEASON);
  const filtro = {
    players: {
      filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
      // Pede os totais da temporada e dos últimos 7, 15 e 30 dias.
      filterStatsForTopScoringPeriodIds: {
        value: 5,
        additionalValue: ['00', '01', '02', '03'].map(tipo => `${tipo}${temporada}`)
      },
      sortPercOwned: { sortPriority: 1, sortAsc: false },
      limit: 200
    }
  };

  return consultarFantasy(
    `view=kona_player_info&scoringPeriodId=${Number(liga.scoringPeriodId)}`,
    { 'X-Fantasy-Filter': JSON.stringify(filtro) }
  );
}, 60000);

// Mapa: ID do time da NBA -> descrição do jogo do dia.
const buscarJogosDeHoje = comCache(async () => {
  const resposta = await axios.get(PLACAR_NBA, { timeout: 15000 });
  const jogos = {};

  for (const evento of resposta.data.events || []) {
    const times = evento.competitions?.[0]?.competitors || [];

    for (const time of times) {
      const outro = times.find(item => item !== time);
      const local = time.homeAway === 'home' ? 'vs' : '@';

      jogos[Number(time.team?.id)] = {
        adversario: `${local} ${outro?.team?.abbreviation || '?'}`,
        inicio: evento.date,
        estado: evento.status?.type?.state,
        detalhe: evento.status?.type?.shortDetail
      };
    }
  }

  return jogos;
}, 60000);

// Jogos dos próximos 7 dias, contando hoje: para cada dia, ID do time da NBA -> jogo.
const buscarJogosDaSemana = comCache(async () => {
  // A ESPN organiza os jogos pela data da costa leste dos EUA.
  const hoje = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));

  const datas = Array.from({ length: 7 }, (_, i) =>
    new Date(hoje.getTime() + i * 86400000).toISOString().slice(0, 10));

  return Promise.all(datas.map(async data => {
    const resposta = await axios.get(PLACAR_NBA, {
      params: { dates: data.replace(/-/g, '') },
      timeout: 15000
    });
    const times = {};

    for (const evento of resposta.data.events || []) {
      // Jogos adiados não contam.
      if (evento.status?.type?.name === 'STATUS_POSTPONED') continue;

      const competidores = evento.competitions?.[0]?.competitors || [];

      for (const time of competidores) {
        const outro = competidores.find(item => item !== time);
        const local = time.homeAway === 'home' ? 'vs' : '@';

        times[Number(time.team?.id)] = {
          adversario: `${local} ${outro?.team?.abbreviation || '?'}`,
          inicio: evento.date
        };
      }
    }

    return { data, times };
  }));
}, 30 * 60000);

function semFalhar(promessa, assunto) {
  return promessa.catch(erro => {
    console.error(`Erro ${assunto}:`, erro.message);
    return null;
  });
}

function nomeDoTime(time) {
  return time.name || [time.location, time.nickname].filter(Boolean).join(' ') || `Time ${time.id}`;
}

function campanha(time) {
  const registro = time.record?.overall || {};

  return {
    vitorias: registro.wins ?? 0,
    derrotas: registro.losses ?? 0,
    empates: registro.ties ?? 0,
    pontosFeitos: Number(registro.pointsFor ?? time.pointsFor ?? 0),
    pontosSofridos: Number(registro.pointsAgainst ?? time.pointsAgainst ?? 0)
  };
}

// statSourceId 0 = números reais. statSplitTypeId: 0 temporada, 1 últimos 7 dias, 5 um dia.
function estatistica(jogador, temporada, tipo, periodo) {
  return (jogador.stats || []).find(stat =>
    Number(stat.seasonId) === temporada &&
    Number(stat.statSourceId) === 0 &&
    Number(stat.statSplitTypeId) === tipo &&
    (periodo === undefined || Number(stat.scoringPeriodId) === periodo)
  );
}

function numeroOuNulo(valor) {
  return Number.isFinite(valor) ? valor : null;
}

const CATEGORIAS = { pts: 0, blk: 1, stl: 2, ast: 3, reb: 6, to: 11, fgm: 13, fga: 14, ftm: 15, fta: 16, tpm: 17, min: 40 };
const PERIODOS = { temporada: 0, d7: 1, d15: 2, d30: 3 };

function medias(stat) {
  if (!stat?.averageStats) return null;

  const m = {};
  for (const [nome, id] of Object.entries(CATEGORIAS)) {
    m[nome] = numeroOuNulo(stat.averageStats[id]);
  }
  m.fg = m.fga ? (m.fgm / m.fga) * 100 : null;
  m.ft = m.fta ? (m.ftm / m.fta) * 100 : null;
  m.fpts = numeroOuNulo(stat.appliedAverage);
  return m;
}

function montarElenco(time, liga, jogos) {
  const temporada = Number(liga.seasonId || process.env.ESPN_SEASON);
  const periodo = Number(liga.scoringPeriodId);

  return (time.roster?.entries || [])
    .filter(entrada => entrada.playerPoolEntry?.player)
    .map(entrada => {
      const jogador = entrada.playerPoolEntry.player;
      const vaga = Number(entrada.lineupSlotId);

      return {
        id: jogador.id,
        nome: jogador.fullName,
        periodos: Object.fromEntries(Object.entries(PERIODOS).map(([chave, tipo]) =>
          [chave, medias(estatistica(jogador, temporada, tipo))])),
        posicao: POSICOES[jogador.defaultPositionId] || '-',
        vaga: VAGAS[vaga] || '-',
        ordem: vaga,
        titular: vaga !== 12 && vaga !== 13,
        status: jogador.injuryStatus || 'ACTIVE',
        timeNba: jogador.proTeamId,
        elegiveis: jogador.eligibleSlots || [],
        media: numeroOuNulo(estatistica(jogador, temporada, 0)?.appliedAverage),
        media7: numeroOuNulo(estatistica(jogador, temporada, 1)?.appliedAverage),
        hoje: numeroOuNulo(estatistica(jogador, temporada, 5, periodo)?.appliedTotal),
        // null = não foi possível consultar; false = sem jogo hoje.
        jogo: jogos ? jogos[jogador.proTeamId] || false : null
      };
    })
    .sort((a, b) => a.ordem - b.ordem);
}

function montarConfronto(item, nomes) {
  const lado = dados => dados && {
    id: dados.teamId,
    nome: nomes.get(dados.teamId) || `Time ${dados.teamId}`,
    pontos: Number(dados.totalPointsLive ?? dados.totalPoints ?? 0)
  };

  return {
    semana: item.matchupPeriodId,
    casa: lado(item.home),
    fora: lado(item.away),
    encerrado: Boolean(item.winner) && item.winner !== 'UNDECIDED'
  };
}

function semanaAtual(liga) {
  return Number(liga.status?.currentMatchupPeriod || 1);
}

function confrontos(liga, semana) {
  const nomes = new Map((liga.teams || []).map(time => [time.id, nomeDoTime(time)]));

  return (liga.schedule || [])
    .filter(item => item.matchupPeriodId === semana)
    .map(item => montarConfronto(item, nomes));
}

async function resumoDaLiga(semanaPedida) {
  const liga = await buscarLiga();
  const atual = semanaAtual(liga);
  const semana = semanaPedida || atual;

  const times = (liga.teams || [])
    .map(time => ({
      id: time.id,
      nome: nomeDoTime(time),
      posicao: time.playoffSeed || null,
      ...campanha(time)
    }))
    .sort((a, b) =>
      (a.posicao ?? 999) - (b.posicao ?? 999) ||
      b.vitorias - a.vitorias ||
      b.pontosFeitos - a.pontosFeitos
    );

  return {
    nome: liga.settings?.name || 'Minha liga',
    semanaAtual: atual,
    semana,
    semanas: [...new Set((liga.schedule || []).map(item => item.matchupPeriodId))].sort((a, b) => a - b),
    times,
    confrontos: confrontos(liga, semana)
  };
}

async function resumoDoTime(id) {
  const [liga, jogos] = await Promise.all([
    buscarLiga(),
    buscarJogosDeHoje().catch(erro => {
      console.error('Erro nos jogos do dia:', erro.message);
      return null;
    })
  ]);

  const time = (liga.teams || []).find(item => item.id === id);
  if (!time) return null;

  return {
    id: time.id,
    nome: nomeDoTime(time),
    ...campanha(time),
    confronto: confrontos(liga, semanaAtual(liga)).find(item =>
      item.casa?.id === id || item.fora?.id === id
    ) || null,
    elenco: montarElenco(time, liga, jogos)
  };
}

function comJogosDaSemana(elenco, semana) {
  return elenco.map(jogador => ({
    ...jogador,
    agenda: semana ? semana.map(dia => dia.times[jogador.timeNba] || null) : null,
    jogos7: semana ? semana.filter(dia => dia.times[jogador.timeNba]).length : null
  }));
}

async function todosOsElencos() {
  const liga = await buscarLiga();
  const vagas = liga.settings?.rosterSettings?.lineupSlotCounts || {};
  const titulares = Object.entries(vagas)
    .filter(([vaga]) => !['12', '13'].includes(vaga))
    .reduce((total, [, quantidade]) => total + quantidade, 0);

  const semana = await semFalhar(buscarJogosDaSemana(), 'nos jogos da semana');

  return {
    titulares: titulares || 10,
    vagas: Object.entries(vagas)
      .map(([id, quantidade]) => ({ id: Number(id), nome: VAGAS[id] || id, quantidade }))
      .filter(vaga => vaga.id !== 12 && vaga.id !== 13 && vaga.quantidade > 0),
    dias: (semana || []).map(dia => dia.data),
    times: (liga.teams || []).map(time => ({
      id: time.id,
      nome: nomeDoTime(time),
      prioridade: time.waiverRank || null,
      elenco: comJogosDaSemana(montarElenco(time, liga, null), semana)
    }))
  };
}

async function jogadoresLivres() {
  const [liga, dados, jogos, semana] = await Promise.all([
    buscarLiga(),
    buscarLivres(),
    semFalhar(buscarJogosDeHoje(), 'nos jogos do dia'),
    semFalhar(buscarJogosDaSemana(), 'nos jogos da semana')
  ]);

  const livres = (dados.players || []).filter(item => item.player);
  const extras = new Map(livres.map(item => [item.player.id, item]));
  const entradas = livres.map(item => ({ lineupSlotId: 12, playerPoolEntry: { player: item.player } }));

  const elenco = montarElenco({ roster: { entries: entradas } }, liga, jogos);

  return comJogosDaSemana(elenco, semana).map(jogador => {
    const item = extras.get(jogador.id);

    return {
      ...jogador,
      waivers: item.status === 'WAIVERS',
      liberaEm: item.waiverProcessDate || null,
      escalado: numeroOuNulo(item.player.ownership?.percentOwned),
      variacao: numeroOuNulo(item.player.ownership?.percentChange)
    };
  });
}

module.exports = {
  jogadoresLivres,
  todosOsElencos,
  resumoDaLiga,
  resumoDoTime
};
