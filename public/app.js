const $ = seletor => document.querySelector(seletor);
const STATUS = { OUT: 'Fora', DAY_TO_DAY: 'Dúvida', QUESTIONABLE: 'Dúvida', DOUBTFUL: 'Improvável', SUSPENSION: 'Suspenso', INJURY_RESERVE: 'IR' };

let aba = 'time';
let liga = null;
let semana = null;
let aberto = null; // adversário cujo elenco está aberto
let pedido = 0;

const lembrar = {
  ler() { try { return Number(localStorage.getItem('meuTime')); } catch { return 0; } },
  gravar(id) { try { localStorage.setItem('meuTime', id); } catch { /* sem armazenamento */ } }
};

// Todo texto vindo da API é escapado antes de entrar na página.
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const num = valor => valor === null || valor === undefined ? '–' : valor.toFixed(1);

async function api(url) {
  const resposta = await fetch(url);
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro);
  return dados;
}

function textoDoJogo(jogo) {
  if (jogo === null) return 'Jogos indisponíveis';
  if (!jogo) return 'Sem jogo hoje';
  const quando = jogo.estado === 'pre'
    ? new Date(jogo.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : jogo.detalhe;
  return `${jogo.adversario} · ${quando}`;
}

function cartaoJogador(j) {
  const status = j.status === 'ACTIVE' || j.status === 'NORMAL' ? '' :
    `<span class="status">${esc(STATUS[j.status] || j.status)}</span>`;

  return `<li class="${j.jogo === false ? 'folga' : ''}">
    <span class="vaga">${esc(j.vaga)}</span>
    <div>
      <strong>${esc(j.nome)}</strong> ${status}
      <small>${esc(j.posicao)} · ${esc(textoDoJogo(j.jogo))}</small>
      <small>Média ${num(j.media)} · 7 dias ${num(j.media7)}</small>
    </div>
    <b title="Pontos de hoje">${num(j.hoje)}</b>
  </li>`;
}

function listaElenco(elenco) {
  const grupo = (titulo, jogadores) => jogadores.length
    ? `<h2>${titulo}</h2><ul class="elenco">${jogadores.map(cartaoJogador).join('')}</ul>` : '';

  return grupo('Titulares', elenco.filter(j => j.titular)) +
    grupo('Reservas e IR', elenco.filter(j => !j.titular));
}

function placar(c) {
  const lado = t => t
    ? `<div><span>${esc(t.nome)}</span><b>${num(t.pontos)}</b></div>`
    : '<div><span>Folga</span></div>';
  return `<section class="placar">${lado(c.casa)}${lado(c.fora)}${c.encerrado ? '<small>Encerrado</small>' : ''}</section>`;
}

function telaTime(t) {
  const comJogo = t.elenco.filter(j => j.titular && j.jogo).length;
  const alertas = t.elenco.filter(j => j.titular && j.jogo && ['OUT', 'SUSPENSION', 'INJURY_RESERVE'].includes(j.status));

  return `<p>${t.vitorias}V ${t.derrotas}D ${t.empates}E · ${comJogo} titulares com jogo hoje</p>
    ${alertas.length ? `<p class="alerta">Titular fora com jogo hoje: ${alertas.map(j => esc(j.nome)).join(', ')}</p>` : ''}
    ${t.confronto ? `<h2>Confronto da semana</h2>${placar(t.confronto)}` : ''}
    ${listaElenco(t.elenco)}`;
}

function telaLiga(adversario) {
  const linhas = liga.times.map((t, i) => `<tr>
    <td>${i + 1}</td>
    <td><button class="link" data-ver="${t.id}">${esc(t.nome)}</button></td>
    <td>${t.vitorias}-${t.derrotas}-${t.empates}</td>
    <td>${num(t.pontosFeitos)}</td></tr>`).join('');

  const opcoes = liga.semanas.map(s =>
    `<option value="${s}" ${s === liga.semana ? 'selected' : ''}>Semana ${s}${s === liga.semanaAtual ? ' (atual)' : ''}</option>`).join('');

  return `${adversario ? `<button class="link" data-ver="">Fechar elenco</button>
      <h2>Elenco: ${esc(adversario.nome)}</h2>${listaElenco(adversario.elenco)}` : ''}
    <h2>Classificação</h2>
    <p><small>Toque em um time para ver o elenco.</small></p>
    <table><thead><tr><th>#</th><th>Time</th><th>V-D-E</th><th>Pontos</th></tr></thead><tbody>${linhas}</tbody></table>
    <h2>Confrontos</h2>
    <select id="semana">${opcoes}</select>
    ${liga.confrontos.map(placar).join('') || '<p>Sem confrontos nesta semana.</p>'}`;
}

async function carregar() {
  const meu = ++pedido; // ignora respostas de pedidos antigos
  try {
    const dadosLiga = await api(`/api/liga${semana ? `?semana=${semana}` : ''}`);
    if (meu !== pedido) return;
    liga = dadosLiga;

    const seletor = $('#time');
    const escolhido = Number(seletor.value) || lembrar.ler();
    seletor.innerHTML = liga.times.map(t => `<option value="${t.id}">${esc(t.nome)}</option>`).join('');
    seletor.value = liga.times.some(t => t.id === escolhido) ? escolhido : liga.times[0]?.id;
    $('#liga').textContent = liga.nome;

    const modulo = [Analises, Planejamento].find(m => m.telas.includes(aba));
    if (modulo) {
      const html = await modulo.tela(aba, Number(seletor.value));
      if (meu !== pedido) return;
      $('#conteudo').innerHTML = html;
    } else {
    const id = aba === 'time' ? seletor.value : aberto;
    const time = id ? await api(`/api/times/${id}`) : null;
    if (meu !== pedido) return;

    $('#conteudo').innerHTML = aba === 'time' ? telaTime(time) : telaLiga(time);
    }
    $('#aviso').textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
  } catch (erro) {
    if (meu === pedido) $('#aviso').textContent = erro.message;
  }
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
}

document.addEventListener('click', evento => {
  const botao = evento.target.closest('button');
  if (!botao || botao.form) return;
  if (Analises.clique(botao)) return carregar();
  if (botao.dataset.jogador) aba = 'jogador';
  if (botao.dataset.aba) aba = botao.dataset.aba;
  if ('ver' in botao.dataset) {
    aberto = botao.dataset.ver || null;
    scrollTo(0, 0);
  }
  carregar();
});

document.addEventListener('submit', evento => {
  evento.preventDefault();
  Analises.buscar(new FormData(evento.target).get('nome'));
  carregar();
});

document.addEventListener('change', evento => {
  if (evento.target.name === 'nome') return; // a busca é enviada pelo formulário
  Analises.mudanca(evento.target);
  Planejamento.mudanca(evento.target);
  if (evento.target.id === 'time') lembrar.gravar(evento.target.value);
  if (evento.target.id === 'semana') semana = Number(evento.target.value);
  carregar();
});

carregar();
// As telas de análise não se redesenham sozinhas, para não atrapalhar quem está escolhendo.
setInterval(() => { if (aba === 'time' || aba === 'liga') carregar(); }, 60000);
