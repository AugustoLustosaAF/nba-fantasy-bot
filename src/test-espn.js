
require('dotenv').config();

const axios = require('axios');

async function testarESPN() {
  const ESPN_S2 = process.env.ESPN_S2?.trim();
  const ESPN_SWID = process.env.ESPN_SWID?.trim();
  const LEAGUE_ID = process.env.ESPN_LEAGUE_ID;
  const SEASON = process.env.ESPN_SEASON;

  console.log('--- VERIFICAÇÃO DE CONFIGURAÇÃO ---');

  console.log('ESPN_S2 encontrado:', !!ESPN_S2);
  console.log('Tamanho ESPN_S2:', ESPN_S2?.length || 0);

  console.log('ESPN_SWID encontrado:', !!ESPN_SWID);
  console.log('Formato SWID correto:',
    ESPN_SWID?.startsWith('{') && ESPN_SWID?.endsWith('}')
  );

  console.log('League ID:', LEAGUE_ID);
  console.log('Temporada:', SEASON);

  if (!ESPN_S2 || !ESPN_SWID) {
    console.log('❌ Cookies não encontrados no .env');
    return;
  }

  const url =
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}?view=mSettings&view=mTeam&view=mRoster`;

  try {
    const response = await axios.get(url, {
      headers: {
        Cookie: `espn_s2=${ESPN_S2}; SWID=${ESPN_SWID}`,
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json'
      }
    });

    console.log('\n✅ AUTENTICAÇÃO ACEITA!');
    console.log('Nome da liga:', response.data.settings?.name);
    console.log('Equipes encontradas:', response.data.teams?.length);

  } catch (error) {
    console.log('\n❌ FALHA NA CONSULTA');
    console.log('Código HTTP:', error.response?.status);
    console.log('Mensagem:', error.response?.data?.message || error.message);
  }
}

testarESPN();
