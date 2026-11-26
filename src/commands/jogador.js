
const {
  buscarAnaliseJogador
} = require('../services/nbaPlayerService');

async function executarComandoJogador(message, nome) {
  try {
    if (!nome || !nome.trim()) {
      await message.reply(
        'Informe o jogador. Exemplo: `!jogador Nikola Jokic`'
      );
      return;
    }

    await message.channel.sendTyping();

    const analise = await buscarAnaliseJogador(nome);

    const emojiTendencia = {
      'Em alta': '📈',
      'Em baixa': '📉',
      'Estável': '➡️',
      'Dados insuficientes': '❔'
    };

    const emojiVariacao =
      analise.variacaoPercentual >= 0 ? '📈' : '📉';

    const ultimosJogos = analise.jogosRecentes
      .map(jogo =>
        `• ${jogo.adversario}: **${jogo.fpts.toFixed(1)} FPTS** (${jogo.minutos} min)`
      )
      .join('\n');

    const resposta = [
      `🏀 **ANÁLISE: ${analise.jogador.nome}**`,
      '',
      `**Equipe:** ${analise.jogador.equipe}`,
      `**Posição:** ${analise.jogador.posicao}`,
      `**Jogos disputados:** ${analise.totalJogos}`,
      '',
      '📊 **MÉDIAS DA TEMPORADA**',
      `• Fantasy Points: **${analise.mediaTemporada.toFixed(2)}**`,
      `• Pontos: **${analise.mediaPontos.toFixed(1)}**`,
      `• Rebotes: **${analise.mediaRebotes.toFixed(1)}**`,
      `• Assistências: **${analise.mediaAssistencias.toFixed(1)}**`,
      `• Roubadas de bola: **${analise.mediaRoubos.toFixed(1)}**`,
      `• Turnovers: **${analise.mediaTurnovers.toFixed(1)}**`,
      `• Minutos: **${analise.mediaMinutos.toFixed(1)}**`,
      '',
      '🔥 **DESEMPENHO RECENTE**',
      `• Últimos 5 jogos: **${analise.media5.toFixed(2)} FPTS**`,
      `• Últimos 10 jogos: **${analise.media10.toFixed(2)} FPTS**`,
      `• Variação vs. média da temporada: ${emojiVariacao} **${analise.variacaoPercentual.toFixed(1)}%**`,
      `${emojiTendencia[analise.tendencia]} **Tendência: ${analise.tendencia}**`,
      '',
      '🏆 **DESTAQUES**',
      `• Melhor partida: **${analise.melhorJogo.fpts} FPTS** vs. ${analise.melhorJogo.adversario}`,
      `• Pior partida: **${analise.piorJogo.fpts} FPTS** vs. ${analise.piorJogo.adversario}`,
      `• Maior sequência acima da média: **${analise.maiorSequencia} jogos**`,
      '',
      '📝 **ÚLTIMAS 5 PARTIDAS**',
      ultimosJogos
    ].join('\n');

    await message.reply(resposta);

  } catch (error) {
    console.error('Erro no comando jogador:', error.message);

    await message.reply(
      `❌ Não consegui analisar esse jogador: ${error.message}`
    );
  }
}

module.exports = {
  executarComandoJogador
};
