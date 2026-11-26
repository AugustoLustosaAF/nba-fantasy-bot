
const axios = require('axios');

const TEMPORADA = process.env.ESPN_SEASON || '2027';

async function buscarClassificacao() {
  try {
    const resposta = await axios.get(
      'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
      {
        params: {
          season: TEMPORADA
        }
      }
    );

    return resposta.data;

  } catch (erro) {
    console.error(
      'Erro ao buscar classificação da NBA:',
      erro.message
    );

    throw new Error('Não foi possível buscar a classificação da NBA.');
  }
}

function obterEstatistica(stats, nome) {
  const estatistica = stats.find(item =>
    item.name === nome || item.type === nome
  );

  return estatistica?.displayValue ?? 'N/D';
}

function organizarEquipe(entrada, conferencia) {
  const stats = entrada.stats || [];
  const time = entrada.team;

  return {
    id: time.id,
    nome: time.displayName,
    abreviacao: time.abbreviation,
    logo: time.logos?.[0]?.href || null,
    conferencia,

    vitorias: obterEstatistica(stats, 'wins'),
    derrotas: obterEstatistica(stats, 'losses'),
    aproveitamento: obterEstatistica(stats, 'winPercent'),
    pontosPorJogo: obterEstatistica(stats, 'avgPointsFor'),
    pontosSofridos: obterEstatistica(stats, 'avgPointsAgainst'),
    saldoMedio: obterEstatistica(stats, 'differential'),
    sequencia: obterEstatistica(stats, 'streak'),
    ultimosDez: obterEstatistica(stats, 'lasttengames'),
    campanha: obterEstatistica(stats, 'overall')
  };
}

async function buscarClassificacaoOrganizada() {
  const dados = await buscarClassificacao();

  return (dados.children || []).map(conferencia => ({
    nome: conferencia.name,

    equipes: (conferencia.standings?.entries || []).map(
      entrada => organizarEquipe(entrada, conferencia.name)
    )
  }));
}

module.exports = {
  buscarClassificacao,
  buscarClassificacaoOrganizada
};
