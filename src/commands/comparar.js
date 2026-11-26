
const {
  buscarAnaliseJogador
} = require('../services/nbaPlayerService');

async function executarComandoComparar(message, nomes) {
  try {
    if (!nomes || nomes.length !== 2) {
      await message.reply(
        'Informe dois jogadores separados por |. Exemplo: `!comparar Nikola Jokic | Luka Doncic`'
      );
      return;
    }

    await message.channel.sendTyping();

    const [jogador1, jogador2] = await Promise.all([
      buscarAnaliseJogador(nomes[0]),
      buscarAnaliseJogador(nomes[1])
    ]);

    const comparar = (valor1, valor2) => {
      if (valor1 > valor2) return '🏆';
      if (valor2 > valor1) return '🏆';
      return '🤝';
    };

    const resposta = [
      '🏀 **COMPARAÇÃO DE JOGADORES**',
      '',
      `**${jogador1.jogador.nome}** x **${jogador2.jogador.nome}**`,
      '',
      '📊 **MÉDIAS DA TEMPORADA**',
      `• Fantasy Points: ${jogador1.mediaTemporada.toFixed(2)} x ${jogador2.mediaTemporada.toFixed(2)} ${comparar(jogador1.mediaTemporada, jogador2.mediaTemporada)}`,
      `• Pontos: ${jogador1.mediaPontos.toFixed(1)} x ${jogador2.mediaPontos.toFixed(1)} ${comparar(jogador1.mediaPontos, jogador2.mediaPontos)}`,
      `• Rebotes: ${jogador1.mediaRebotes.toFixed(1)} x ${jogador2.mediaRebotes.toFixed(1)} ${comparar(jogador1.mediaRebotes, jogador2.mediaRebotes)}`,
      `• Assistências: ${jogador1.mediaAssistencias.toFixed(1)} x ${jogador2.mediaAssistencias.toFixed(1)} ${comparar(jogador1.mediaAssistencias, jogador2.mediaAssistencias)}`,
      `• Minutos: ${jogador1.mediaMinutos.toFixed(1)} x ${jogador2.mediaMinutos.toFixed(1)}`,
      '',
      '🔥 **DESEMPENHO RECENTE**',
      `• Últimos 5 jogos: ${jogador1.media5.toFixed(2)} x ${jogador2.media5.toFixed(2)} ${comparar(jogador1.media5, jogador2.media5)}`,
      `• Últimos 10 jogos: ${jogador1.media10.toFixed(2)} x ${jogador2.media10.toFixed(2)} ${comparar(jogador1.media10, jogador2.media10)}`,
      '',
      '🏆 **MELHOR PARTIDA**',
      `• ${jogador1.jogador.nome}: ${jogador1.melhorJogo.fpts} FPTS`,
      `• ${jogador2.jogador.nome}: ${jogador2.melhorJogo.fpts} FPTS`,
      '',
      '📈 **TENDÊNCIA**',
      `• ${jogador1.jogador.nome}: ${jogador1.tendencia}`,
      `• ${jogador2.jogador.nome}: ${jogador2.tendencia}`
    ].join('\n');

    await message.reply(resposta);

  } catch (error) {
    console.error('Erro na comparação:', error.message);

    await message.reply(
      `❌ Não consegui comparar os jogadores: ${error.message}`
    );
  }
}

module.exports = {
  executarComandoComparar
};
