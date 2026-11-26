
const {
  buscarClassificacaoOrganizada
} = require('../services/nbaTeamService');

async function executarComandoTime(message, nomeTime) {
    console.log('COMANDO TIME EXECUTADO:', nomeTime);
  try {
    if (!nomeTime || !nomeTime.trim()) {
      await message.reply(
        'Informe o time. Exemplo: `!time Lakers`'
      );
      return;
    }

    await message.channel.sendTyping();

    const conferencias = await buscarClassificacaoOrganizada();

    const normalizar = texto =>
      texto.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const busca = normalizar(nomeTime);

    const resultados = conferencias.flatMap(conferencia =>
      conferencia.equipes.map((equipe, index) => ({
        ...equipe,
        posicao: index + 1,
        nomeConferencia: conferencia.nome
      }))
    );

    const equipe = resultados.find(time =>
      normalizar(time.nome) === busca ||
      normalizar(time.abreviacao) === busca
    ) || resultados.find(time =>
      normalizar(time.nome).includes(busca)
    );

    if (!equipe) {
      await message.reply(
        `❌ Não encontrei o time "${nomeTime}". Confira o nome e tente novamente.`
      );
      return;
    }

    const texto = [
      `🏀 **${equipe.nome.toUpperCase()}**`,
      '',
      `🏆 Conferência: ${equipe.nomeConferencia}`,
      `📊 Posição: ${equipe.posicao}º lugar`,
      `📈 Campanha: ${equipe.campanha}`,
      `🎯 Aproveitamento: ${equipe.aproveitamento}`,
      '',
      `🔥 Pontos por jogo: ${equipe.pontosPorJogo}`,
      `🛡️ Pontos sofridos por jogo: ${equipe.pontosSofridos}`,
      `⚖️ Saldo médio: ${equipe.saldoMedio}`,
      '',
      `📅 Últimos 10 jogos: ${equipe.ultimosDez}`,
      `🔥 Sequência atual: ${equipe.sequencia}`
    ].join('\n');

    await message.reply(texto);

  } catch (error) {
    console.error('Erro ao buscar time:', error);

    await message.reply(
      '❌ Não consegui buscar os dados desse time.'
    );
  }
}

module.exports = {
  executarComandoTime
};
