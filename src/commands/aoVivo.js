
const {
  buscarPontuacaoAoVivo
} = require('../services/espnService');

const acompanhamentosAoVivo = new Map();

async function atualizarMensagemAoVivo(mensagem, nomeEquipe) {
  const jogadores = await buscarPontuacaoAoVivo(nomeEquipe);

  if (!jogadores || jogadores.length === 0) {
    await mensagem.edit(
      `🏀 **${nomeEquipe.toUpperCase()} — AO VIVO**\n\nNenhuma pontuação ao vivo disponível neste momento.`
    );
    return;
  }

  jogadores.sort((a, b) => b.pontos - a.pontos);

  const total = jogadores.reduce(
    (soma, jogador) => soma + jogador.pontos,
    0
  );

  const lista = jogadores.map(jogador =>
    `**${jogador.nome}** — ${jogador.pontos.toFixed(1)} FPTS`
  );

  await mensagem.edit(
    `🏀 **${nomeEquipe.toUpperCase()} — AO VIVO**\n\n` +
    `${lista.join('\n')}\n\n` +
    `📊 **Total: ${total.toFixed(1)} FPTS**\n` +
    `🔄 Atualização automática a cada 60 segundos.`
  );
}

async function executarComandoAoVivo(message) {
  const partes = message.content.trim().split(/\s+/);
  const comando = partes[0].toLowerCase();

  if (comando === '!aovivo') {
    try {
      const nomeEquipe = partes.slice(1).join(' ') || 'Cavaleiros do Barra 23';
      console.log('EQUIPE SOLICITADA:', nomeEquipe);
      const canalId = message.channel.id;

      if (acompanhamentosAoVivo.has(canalId)) {
        await message.reply(
          '⚠️ Já existe um acompanhamento ao vivo neste canal. Use `!pararaovivo` antes de iniciar outro.'
        );
        return true;
      }

      await message.channel.sendTyping();

      const mensagem = await message.reply(
        `🏀 Iniciando acompanhamento de **${nomeEquipe}**...`
      );

      await atualizarMensagemAoVivo(mensagem, nomeEquipe);
      console.log('ACOMPANHAMENTO INICIADO:', nomeEquipe);
      console.log('MENSAGEM AO VIVO ATUALIZADA:', nomeEquipe);

      const intervalo = setInterval(async () => {
        try {
          await atualizarMensagemAoVivo(mensagem, nomeEquipe);
        } catch (error) {
          console.error('Erro ao atualizar pontuação ao vivo:', error.message);
        }
      }, 60000);

      acompanhamentosAoVivo.set(canalId, {
        intervalo,
        mensagem,
        nomeEquipe
      });

    } catch (error) {
      console.error('Erro no acompanhamento ao vivo:', error.message);

      await message.reply(
        `❌ ${error.message}`
      );
    }

    return true;
  }

  if (comando === '!pararaovivo') {
    const canalId = message.channel.id;
    const acompanhamento = acompanhamentosAoVivo.get(canalId);

    if (!acompanhamento) {
      await message.reply(
        '⚠️ Não existe acompanhamento ao vivo ativo neste canal.'
      );
      return true;
    }

    clearInterval(acompanhamento.intervalo);
    acompanhamentosAoVivo.delete(canalId);

    await message.reply(
      `⏹️ Acompanhamento de **${acompanhamento.nomeEquipe}** encerrado.`
    );

    return true;
  }

  return false;
}

module.exports = {
  executarComandoAoVivo
};
