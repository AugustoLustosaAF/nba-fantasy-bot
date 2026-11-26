require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { resumoDaLiga, resumoDoTime, todosOsElencos, jogadoresLivres } = require('./services/ligaService');

const { buscarAnaliseJogador } = require('./services/nbaPlayerService');

const PORTA = Number(process.env.PORT) || 3000;
// Por padrão só o próprio computador acessa.
const HOST = process.env.HOST || '127.0.0.1';
const SENHA = process.env.SENHA_APP || '';
const SO_LOCAL = ['127.0.0.1', 'localhost', '::1'].includes(HOST);

if (!SO_LOCAL && SENHA.length < 12) {
  console.error('Para abrir o acesso, defina SENHA_APP no .env com pelo menos 12 caracteres.');
  process.exit(1);
}

// Compara sem revelar, pelo tempo de resposta, quanto da senha está certo.
function senhaCorreta(tentativa) {
  const resumo = texto => crypto.createHash('sha256').update(texto).digest();
  return crypto.timingSafeEqual(resumo(tentativa), resumo(SENHA));
}

// O navegador pede usuário e senha. O usuário pode ser qualquer nome.
function exigirSenha(req, res, next) {
  if (!SENHA) return next();

  const [tipo, codigo] = (req.headers.authorization || '').split(' ');
  const texto = Buffer.from(codigo || '', 'base64').toString('utf8');
  const tentativa = texto.slice(texto.indexOf(':') + 1);

  if (tipo === 'Basic' && senhaCorreta(tentativa)) return next();

  res.set('WWW-Authenticate', 'Basic realm="Fantasy", charset="UTF-8"');
  res.status(401).send('Informe a senha da liga.');
}

const app = express();
app.use(exigirSenha); // precisa vir antes das telas e da API
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/liga', async (req, res) => {
  res.json(await resumoDaLiga(Number(req.query.semana) || null));
});

app.get('/api/times/:id', async (req, res) => {
  const time = await resumoDoTime(Number(req.params.id));

  if (!time) {
    return res.status(404).json({ erro: 'Time não encontrado nesta liga.' });
  }

  res.json(time);
});

app.get('/api/elencos', async (req, res) => {
  res.json(await todosOsElencos());
});

app.get('/api/livres', async (req, res) => {
  res.json(await jogadoresLivres());
});

app.get('/api/jogador', async (req, res) => {
  const nome = String(req.query.nome || '').trim();
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do jogador.' });

  try {
    res.json(await buscarAnaliseJogador(nome));
  } catch (erro) {
    // Mensagens do próprio serviço ("não encontrei...") podem ir para a tela.
    if (!erro.response && erro.message.startsWith('Não encontrei')) {
      return res.status(404).json({ erro: erro.message });
    }
    throw erro;
  }
});

app.use((erro, req, res, next) => {
  const status = erro.response?.status;
  console.error('Erro na API:', status || '', erro.message);

  let mensagem = 'Não foi possível consultar a ESPN.';
  if (status === 401 || status === 403) {
    mensagem = 'A ESPN recusou o acesso. Atualize ESPN_S2 e ESPN_SWID no .env.';
  } else if (status === 404) {
    mensagem = 'Liga não encontrada. Confira ESPN_LEAGUE_ID e ESPN_SEASON.';
  } else if (erro.message.includes('.env')) {
    mensagem = erro.message;
  }

  res.status(502).json({ erro: mensagem });
});

app.listen(PORTA, HOST, () => {
  console.log(`Aplicação em http://localhost:${PORTA}`);
});
