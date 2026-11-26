
const {
  buscarDadosFantasy,
  obterMediaFpts
} = require('../services/espnService');

async function executarComandoFantasy(message, command) {

  // Meu elenco
  if (command === '!elenco') {
    try {
      await message.channel.sendTyping();

      const { equipe } = await buscarDadosFantasy();

      const jogadores = equipe.roster?.entries || [];

      if (jogadores.length === 0) {
        await message.reply('Não encontrei jogadores no seu elenco.');
        return true;
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

    return true;
  }

  // Resumo da liga e do time
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

    return true;
  }

  return false;
}

module.exports = {
  executarComandoFantasy
};
