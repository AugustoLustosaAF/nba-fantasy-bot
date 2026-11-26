
const {
  buscarClassificacaoOrganizada
} = require('../services/nbaTeamService');

async function executarComandoClassificacao(message) {
    console.log('COMANDO CLASSIFICACAO EXECUTADO');
  try {
    await message.channel.sendTyping();

    const conferencias = await buscarClassificacaoOrganizada();

    const emoji = {
      'Eastern Conference': '🔵',
      'Western Conference': '🔴'
    };

    for (const conferencia of conferencias) {
      const equipesOrdenadas = [...conferencia.equipes].sort(
        (a, b) => Number(b.vitorias) - Number(a.vitorias) ||
          Number(a.derrotas) - Number(b.derrotas)
      );

      const linhas = equipesOrdenadas.map((equipe, index) => {
        return [
          `**${index + 1}. ${equipe.abreviacao}**`,
          `${equipe.campanha}`,
          `PCT: ${equipe.aproveitamento}`,
          `Últimos 10: ${equipe.ultimosDez}`
        ].join(' | ');
      });

      const titulo = emoji[conferencia.nome] || '🏀';

      await message.channel.send(
        `${titulo} **${conferencia.nome.toUpperCase()}**\n\n${linhas.join('\n')}`
      );
    }

  } catch (error) {
    console.error('Erro na classificação:', error.message);

    await message.reply(
      '❌ Não consegui buscar a classificação da NBA.'
    );
  }
}

module.exports = {
  executarComandoClassificacao
};
