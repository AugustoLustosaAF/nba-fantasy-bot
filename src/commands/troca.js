
const {
  buscarAnaliseJogador
} = require('../services/nbaPlayerService');

const {
  buscarDadosFantasy
} = require('../services/espnService');

function normalizar(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function grupoPosicao(posicao) {
  const p = normalizar(posicao);

  if (p.includes('guard') || p === 'pg' || p === 'sg') {
    return 'Armadores';
  }

  if (p.includes('forward') || p === 'sf' || p === 'pf') {
    return 'Alas';
  }

  if (p.includes('center') || p === 'c') {
    return 'Pivôs';
  }

  return 'Não identificada';
}

function posicaoElenco(jogador) {
  const posicoes = {
    1: 'Armadores',
    2: 'Armadores',
    3: 'Alas',
    4: 'Alas',
    5: 'Pivôs'
  };

  return posicoes[jogador.defaultPositionId] || 'Não identificada';
}

async function analisarPacote(nomes) {
  const jogadores = [];

  for (const nome of nomes) {
    const analise = await buscarAnaliseJogador(nome);
    jogadores.push(analise);
  }

  return jogadores;
}

function somar(jogadores, campo) {
  return jogadores.reduce(
    (total, jogador) => total + (jogador[campo] || 0),
    0
  );
}

function formatarPacote(jogadores) {
  return jogadores.map(j =>
    `• ${j.jogador.nome}: ${j.mediaTemporada.toFixed(1)} FPTS`
  ).join('\n');
}

async function executarComandoTroca(message, nomesEnviados, nomesRecebidos) {
  try {
    if (
      !nomesEnviados?.length ||
      !nomesRecebidos?.length
    ) {
      await message.reply(
        'Use: `!troca Jogador 1, Jogador 2 | Jogador 3`'
      );
      return;
    }

    await message.channel.sendTyping();

    const [enviados, recebidos] = await Promise.all([
      analisarPacote(nomesEnviados),
      analisarPacote(nomesRecebidos)
    ]);

    const [dadosFantasy] = await Promise.all([
      buscarDadosFantasy()
    ]);

    const elenco = dadosFantasy.equipe.roster?.entries || [];

    const nomesEnviadosNormalizados = enviados.map(j =>
      normalizar(j.jogador.nome)
    );

    const elencoRestante = elenco.filter(entry => {
      const jogador = entry.playerPoolEntry?.player;
      const nome = normalizar(jogador?.fullName);

      return !nomesEnviadosNormalizados.includes(nome);
    });

    const posicoesAntes = {
      Armadores: 0,
      Alas: 0,
      'Pivôs': 0
    };

    const posicoesDepois = {
      ...posicoesAntes
    };

    for (const entry of elenco) {
      const jogador = entry.playerPoolEntry?.player;
      const grupo = posicaoElenco(jogador || {});

      if (posicoesAntes[grupo] !== undefined) {
        posicoesAntes[grupo]++;
      }
    }

    for (const entry of elencoRestante) {
      const jogador = entry.playerPoolEntry?.player;
      const grupo = posicaoElenco(jogador || {});

      if (posicoesDepois[grupo] !== undefined) {
        posicoesDepois[grupo]++;
      }
    }

    for (const jogador of recebidos) {
      const grupo = grupoPosicao(jogador.jogador.posicao);

      if (posicoesDepois[grupo] !== undefined) {
        posicoesDepois[grupo]++;
      }
    }

    const temporadaEnviados = somar(enviados, 'mediaTemporada');
    const temporadaRecebidos = somar(recebidos, 'mediaTemporada');

    const media5Enviados = somar(enviados, 'media5');
    const media5Recebidos = somar(recebidos, 'media5');

    const media10Enviados = somar(enviados, 'media10');
    const media10Recebidos = somar(recebidos, 'media10');

    const diferenca = temporadaRecebidos - temporadaEnviados;

    let veredito;

    if (diferenca >= 5) {
      veredito = '🏆 FAVORÁVEL — vantagem de produção para seu time';
    } else if (diferenca <= -5) {
      veredito = '❌ DESFAVORÁVEL — seu time perde produção';
    } else {
      veredito = '⚖️ EQUILIBRADA — vale negociar outros detalhes';
    }

    const texto = [
      '🏀 **ANÁLISE DE TROCA — ESPN FANTASY**',
      '',
      '**📤 SEU TIME ENVIA:**',
      formatarPacote(enviados),
      `**Total da temporada: ${temporadaEnviados.toFixed(1)} FPTS**`,
      '',
      '**📥 SEU TIME RECEBE:**',
      formatarPacote(recebidos),
      `**Total da temporada: ${temporadaRecebidos.toFixed(1)} FPTS**`,
      '',
      '📊 **COMPARAÇÃO DOS PACOTES**',
      `• Temporada: ${diferenca >= 0 ? '+' : ''}${diferenca.toFixed(1)} FPTS para seu time`,
      `• Últimos 5 jogos: ${(media5Recebidos - media5Enviados).toFixed(1)} FPTS`,
      `• Últimos 10 jogos: ${(media10Recebidos - media10Enviados).toFixed(1)} FPTS`,
      '',
      '📋 **IMPACTO NAS POSIÇÕES DO ELENCO**',
      `• Armadores: ${posicoesAntes.Armadores} → ${posicoesDepois.Armadores}`,
      `• Alas: ${posicoesAntes.Alas} → ${posicoesDepois.Alas}`,
      `• Pivôs: ${posicoesAntes['Pivôs']} → ${posicoesDepois['Pivôs']}`,
      '',
      `**VEREDITO: ${veredito}**`,
      '',
      '⚠️ Análise baseada nas médias estatísticas. Não representa garantia de resultado.'
    ].join('\n');

    await message.reply(texto);

  } catch (error) {
    console.error('Erro na análise de troca:', error);

    await message.reply(
      `❌ Não consegui analisar essa troca: ${error.message}`
    );
  }
}

module.exports = {
  executarComandoTroca
};
