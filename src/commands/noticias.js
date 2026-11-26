
const axios = require('axios');

const NBA_API =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

async function executarComandoNoticias(message) {
  try {
    await message.channel.sendTyping();

    const response = await axios.get(`${NBA_API}/news?limit=8`);

    const noticias = response.data.articles || [];

    if (noticias.length === 0) {
      await message.reply('📰 Não encontrei notícias no momento.');
      return;
    }

    const texto = noticias.slice(0, 5).map(noticia => {
      const titulo = noticia.headline || 'Notícia sem título';
      const resumo = noticia.description || '';
      const link = noticia.links?.web?.href || '';

      return [
        `**${titulo}**`,
        resumo,
        link
      ].filter(Boolean).join('\n');
    });

    await message.reply(
      `📰 **ÚLTIMAS NOTÍCIAS DA NBA**\n\n${texto.join('\n\n')}`.slice(0, 1900)
    );

  } catch (error) {
    console.error('Erro nas notícias:', error.message);
    await message.reply('❌ Não consegui buscar as notícias.');
  }
}

module.exports = {
  executarComandoNoticias
};
