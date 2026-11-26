
require('dotenv').config();

const {
  buscarAnaliseJogador
} = require('./services/nbaPlayerService');

async function testar() {
  try {
    const analise = await buscarAnaliseJogador('Nikola Jokic');

    console.log('\n=== ANÁLISE DO JOGADOR ===');
    console.log('Nome:', analise.jogador.nome);
    console.log('Equipe:', analise.jogador.equipe);
    console.log('Posição:', analise.jogador.posicao);
    console.log('Partidas:', analise.totalJogos);

    console.log('\n=== MÉDIAS DA TEMPORADA ===');
    console.log('Fantasy Points:', analise.mediaTemporada.toFixed(2));
    console.log('Pontos:', analise.mediaPontos.toFixed(1));
    console.log('Rebotes:', analise.mediaRebotes.toFixed(1));
    console.log('Assistências:', analise.mediaAssistencias.toFixed(1));
    console.log('Minutos:', analise.mediaMinutos.toFixed(1));

    console.log('\n=== DESEMPENHO RECENTE ===');
    console.log('Últimos 5:', analise.media5.toFixed(2));
    console.log('Últimos 10:', analise.media10.toFixed(2));
    console.log('Variação:', analise.variacaoPercentual.toFixed(1) + '%');
    console.log('Tendência:', analise.tendencia);

    console.log('\n=== DESTAQUES ===');
    console.log(
      'Melhor partida:',
      analise.melhorJogo.fpts,
      'FPTS contra',
      analise.melhorJogo.adversario
    );

    console.log(
      'Pior partida:',
      analise.piorJogo.fpts,
      'FPTS contra',
      analise.piorJogo.adversario
    );

    console.log(
      'Maior sequência acima da média:',
      analise.maiorSequencia,
      'jogos'
    );

    console.log('\n=== ÚLTIMAS 5 PARTIDAS ===');

    analise.jogosRecentes.forEach(jogo => {
      console.log(
        `${jogo.data} | ${jogo.adversario} | ${jogo.fpts} FPTS | ${jogo.minutos} min`
      );
    });

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testar();
