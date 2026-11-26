
const axios = require('axios');
const { normalizarNome } = require('../utils/formatarDados');

const NBA_API =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

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
  'Austin Reaves',
  'OG Anunoby',
  'Domantas Sabonis',
  'Cooper Flagg',
  'Paul George',
  'Jaden McDaniels',
  'Ausar Thompson',
  'Deni Avdija',
  'Jimmy Butler',
  'Duncan Robinson'
];

async function buscarLesoes() {
  const response = await axios.get(`${NBA_API}/injuries`);

  const grupos = Array.isArray(response.data)
    ? response.data
    : response.data.injuries || [];

  const prioritarios = new Set([
    ...JOGADORES_DO_TIME,
    ...JOGADORES_IMPORTANTES
  ].map(normalizarNome));

  const resultados = [];

  for (const grupo of grupos) {
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

      if (!prioritarios.has(normalizarNome(nome))) continue;

      const detalhes = injury.details || {};
      const retorno = detalhes.returnDate || injury.returnDate || null;

      const hoje = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Recife'
      });

      let dataRetorno = null;

      if (retorno) {
        const data = new Date(retorno);

        if (!isNaN(data.getTime())) {
          dataRetorno = data.toLocaleDateString('en-CA', {
            timeZone: 'America/Recife'
          });
        }
      }

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

  resultados.sort((a, b) => {
    const aDoTime = JOGADORES_DO_TIME
      .some(nome => normalizarNome(nome) === normalizarNome(a.nome));

    const bDoTime = JOGADORES_DO_TIME
      .some(nome => normalizarNome(nome) === normalizarNome(b.nome));

    return Number(bDoTime) - Number(aDoTime);
  });

  return resultados;
}

async function executarComandoLesoes(message) {
  try {
    await message.channel.sendTyping();

    const lesoes = await buscarLesoes();

    if (lesoes.length === 0) {
      await message.reply('🏥 Nenhuma lesão importante encontrada.');
      return;
    }

    const texto = lesoes.slice(0, 10).map(jogador => {
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
      else if (motivoOriginal.includes('fractured right hand')) motivo = 'Fratura na mão direita';
      else if (motivoOriginal.includes('fractured left hand')) motivo = 'Fratura na mão esquerda';
      else if (motivoOriginal.includes('swelling')) motivo = 'Inchaço';
      else if (motivoOriginal.includes('acl')) motivo = 'Ligamento cruzado anterior';
      else if (motivoOriginal.includes('mcl')) motivo = 'Ligamento colateral medial';

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

module.exports = {
  buscarLesoes,
  executarComandoLesoes
};
