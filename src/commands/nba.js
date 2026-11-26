
const axios = require('axios');

const NBA_API =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

async function executarComandoNBA(message, command) {

  // Teste de conexão do bot
  if (command === '!nba') {
    await message.reply('🏀 Bot da NBA está online!');
    return true;
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
        await message.reply('🏀 Não há jogos disponíveis no momento.');
        return true;
      }

      const texto = jogos.map(jogo => {
        const competicao = jogo.competitions?.[0];
        const equipes = competicao?.competitors || [];

        const mandante = equipes.find(
          equipe => equipe.homeAway === 'home'
        );

        const visitante = equipes.find(
          equipe => equipe.homeAway === 'away'
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

    return true;
  }

  return false;
}

module.exports = {
  executarComandoNBA
};
