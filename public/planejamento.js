// Telas de planejamento: Escalação, Confronto e Calendário.
// Usa api, esc, num, placar e STATUS de app.js.
const Planejamento = (() => {
  const FORA = ['OUT', 'SUSPENSION', 'INJURY_RESERVE'];
  const estado = { periodo: 'temporada', dia: 0, ate: null };

  // Média do período escolhido; sem jogos no período, usa a da temporada.
  const media = j => j.periodos[estado.periodo]?.fpts ?? j.periodos.temporada?.fpts ?? null;
  const comecou = jogo => Date.parse(jogo.inicio) <= Date.now();
  const nomeDia = data => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const opcoes = (lista, atual) => lista.map(([v, texto]) =>
    `<option value="${v}" ${String(v) === String(atual) ? 'selected' : ''}>${esc(texto)}</option>`).join('');
  const campo = (id, rotulo, lista, atual = estado[id]) =>
    `<label>${rotulo} <select data-plano="${id}">${opcoes(lista, atual)}</select></label>`;
  const campoPeriodo = () => campo('periodo', 'Médias',
    [['temporada', 'Temporada'], ['d30', '30 dias'], ['d15', '15 dias'], ['d7', '7 dias']]);
  const aviso = j => j.status === 'ACTIVE' || j.status === 'NORMAL' ? ''
    : `<span class="status">${esc(STATUS[j.status] || j.status)}</span>`;

  // Escolhe quem escalar em um dia, buscando a maior soma de médias que cabe nas vagas.
  function melhorEscalacao(elenco, vagas, dia) {
    const lugares = vagas.flatMap(v => Array.from({ length: v.quantidade }, () => ({ ...v, jogador: null, travado: false })));
    const candidatos = [];

    for (const j of elenco) {
      const jogo = j.agenda?.[dia];
      if (!jogo || j.vaga === 'IR') continue;

      // Depois que o jogo começa, a ESPN não deixa mudar o jogador de lugar.
      if (comecou(jogo)) {
        const lugar = j.titular && lugares.find(l => l.id === j.ordem && !l.jogador);
        if (lugar) Object.assign(lugar, { jogador: j, travado: true });
        continue;
      }
      if (!FORA.includes(j.status) && media(j) > 0) candidatos.push(j);
    }

    // Coloca o jogador em uma vaga, remanejando quem já está escalado se preciso.
    function encaixar(j, vistos) {
      for (const lugar of lugares) {
        if (lugar.travado || vistos.has(lugar) || !j.elegiveis.includes(lugar.id)) continue;
        vistos.add(lugar);
        if (!lugar.jogador || encaixar(lugar.jogador, vistos)) {
          lugar.jogador = j;
          return true;
        }
      }
      return false;
    }

    // Do maior para o menor: cada um entra se existir um arranjo que o comporte.
    const sobraram = candidatos.sort((a, b) => media(b) - media(a)).filter(j => !encaixar(j, new Set()));
    // Soma só os jogos que ainda não começaram.
    const total = lugares.reduce((s, l) => s + (l.jogador && !l.travado ? media(l.jogador) : 0), 0);

    return { lugares, sobraram, total };
  }

  function telaEscalacao(dados, meu) {
    const dia = estado.dia;
    const { lugares, sobraram, total } = melhorEscalacao(meu.elenco, dados.vagas, dia);
    const escalados = new Set(lugares.filter(l => l.jogador).map(l => l.jogador.id));
    const jogo = j => j.agenda[dia];

    // As trocas em relação à ESPN só fazem sentido para o dia de hoje.
    let mudancas = '';
    if (dia === 0) {
      const entrar = meu.elenco.filter(j => !j.titular && escalados.has(j.id));
      const sair = meu.elenco.filter(j => j.titular && !escalados.has(j.id) && !(jogo(j) && comecou(jogo(j))));
      const lista = jogadores => jogadores.map(j => esc(j.nome)).join(', ') || 'ninguém';
      mudancas = `<section class="placar"><p><strong class="sobe">Colocar de titular:</strong> ${lista(entrar)}</p>
        <p><strong class="desce">Pode ir para o banco:</strong> ${lista(sair)}</p></section>`;
    }

    const linhas = lugares.map(l => {
      const j = l.jogador;
      return `<li><span class="vaga">${esc(l.nome)}</span>${j ? `<div><strong>${esc(j.nome)}</strong> ${aviso(j)}
        <small>${esc(jogo(j).adversario)}${l.travado ? ' · jogo já começou' : ''}</small></div><b>${num(media(j))}</b>`
        : '<div><small>Vaga sem jogador disponível</small></div>'}</li>`;
    }).join('');

    return `<div class="filtros">${campo('dia', 'Dia', dados.dias.map((d, i) => [i, i ? nomeDia(d) : 'Hoje']))}${campoPeriodo()}</div>
      ${mudancas}
      <h2>Escalação sugerida · ${num(total)} FPTS esperados</h2>
      <ul class="elenco">${linhas}</ul>
      ${sobraram.length ? `<h2>Jogam, mas não couberam</h2><p>${sobraram.map(j => `${esc(j.nome)} (${num(media(j))})`).join(', ')}</p>` : ''}
      <p><small>Considera dia de jogo, vagas permitidas e média. Quem está fora ou suspenso não entra; confira quem está em dúvida antes do jogo.</small></p>`;
  }

  // Dias de hoje até domingo, no calendário usado pela ESPN.
  function diasAteDomingo(dados) {
    const semana = new Date(`${dados.dias[0]}T12:00:00`).getDay();
    return semana === 0 ? 1 : 8 - semana;
  }

  async function telaConfronto(dados, meu) {
    const liga = await api('/api/liga');
    const confronto = liga.confrontos.find(c => c.casa?.id === meu.id || c.fora?.id === meu.id);
    if (!confronto) return '<p>Não há confronto para o seu time nesta semana.</p>';

    const souCasa = confronto.casa?.id === meu.id;
    const eu = souCasa ? confronto.casa : confronto.fora;
    const ele = souCasa ? confronto.fora : confronto.casa;
    if (!ele) return '<p>Seu time está de folga nesta semana.</p>';
    if (confronto.encerrado) return `<p>O confronto desta semana já terminou.</p>${placar(confronto)}`;

    const adversario = dados.times.find(t => t.id === ele.id);
    const ate = Math.min(estado.ate ?? diasAteDomingo(dados), dados.dias.length);
    const projetar = time => dados.dias.slice(0, ate).map((_, i) => melhorEscalacao(time.elenco, dados.vagas, i));
    const meus = projetar(meu);
    const deles = projetar(adversario);
    const soma = lista => lista.reduce((s, d) => s + d.total, 0);
    const quantos = d => d.lugares.filter(l => l.jogador && !l.travado).length;
    const finalMeu = eu.pontos + soma(meus);
    const finalDele = ele.pontos + soma(deles);
    const diferenca = finalMeu - finalDele;

    const linhas = dados.dias.slice(0, ate).map((d, i) => `<tr><th>${i ? nomeDia(d) : 'Hoje'}</th>
      <td>${quantos(meus[i])} · ${num(meus[i].total)}</td><td>${quantos(deles[i])} · ${num(deles[i].total)}</td></tr>`).join('');

    return `<div class="filtros">${campo('ate', 'Dias que faltam', dados.dias.map((d, i) => [i + 1, `${i + 1} (até ${nomeDia(d)})`]), ate)}${campoPeriodo()}</div>
      <h2>Placar atual</h2>${placar(confronto)}
      <h2>Projeção final</h2>${placar({ casa: { nome: eu.nome, pontos: finalMeu }, fora: { nome: ele.nome, pontos: finalDele } })}
      <p class="${diferenca >= 0 ? 'sobe' : 'desce'}">${diferenca >= 0 ? 'Você está à frente' : 'Você está atrás'} por ${num(Math.abs(diferenca))} na projeção.</p>
      <div class="rolagem"><table><thead><tr><th>Dia</th><th>Você (jogadores · FPTS)</th><th>Adversário</th></tr></thead><tbody>${linhas}</tbody></table></div>
      <p><small>Projeção = placar atual + melhor escalação possível de cada time nos jogos que ainda não começaram. Confira quantos dias faltam, pois há semanas mais longas. É uma estimativa.</small></p>`;
  }

  function telaCalendario(dados, meu) {
    const elenco = [...meu.elenco].sort((a, b) => b.jogos7 - a.jogos7 || media(b) - media(a));
    const totais = time => dados.dias.map((_, i) => time.elenco.filter(j => j.vaga !== 'IR' && j.agenda[i]).length);
    const cabecalho = dados.dias.map((d, i) => `<th>${i ? nomeDia(d) : 'Hoje'}</th>`).join('');

    const linhas = elenco.map(j => `<tr><th>${esc(j.nome)} ${aviso(j)}${j.vaga === 'IR' ? ' <small>IR</small>' : ''}</th>
      ${j.agenda.map(g => g ? `<td class="joga">${esc(g.adversario)}</td>` : '<td>–</td>').join('')}<td><strong>${j.jogos7}</strong></td></tr>`).join('');

    const liga = dados.times.map(t => ({ t, dias: totais(t) }))
      .map(x => ({ ...x, total: x.dias.reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total - a.total)
      .map(x => `<tr class="${x.t.id === meu.id ? 'marcada' : ''}"><th>${esc(x.t.nome)}</th>${x.dias.map(v => `<td>${v}</td>`).join('')}<td><strong>${x.total}</strong></td></tr>`).join('');

    const tabela = (titulo, corpo) => `<div class="rolagem"><table class="agenda"><thead><tr><th>${titulo}</th>${cabecalho}<th>Total</th></tr></thead><tbody>${corpo}</tbody></table></div>`;

    return `<h2>Meu time nos próximos 7 dias</h2>${tabela('Jogador', linhas)}
      <h2>Jogadores com partida, por time da liga</h2>${tabela('Time', liga)}
      <p><small>Os totais não contam quem está no IR e incluem lesionados.</small></p>`;
  }

  return {
    telas: ['escalacao', 'confronto', 'calendario'],

    async tela(aba, meuId) {
      const dados = await api('/api/elencos');
      const meu = dados.times.find(t => t.id === meuId);
      if (!meu) return '<p>Escolha o seu time.</p>';
      if (!dados.dias.length) return '<p class="alerta">Não foi possível consultar o calendário da NBA. Tente de novo em instantes.</p>';
      if (aba === 'escalacao') return telaEscalacao(dados, meu);
      if (aba === 'confronto') return telaConfronto(dados, meu);
      return telaCalendario(dados, meu);
    },

    mudanca(alvo) {
      const nome = alvo.dataset.plano;
      if (nome) estado[nome] = nome === 'periodo' ? alvo.value : Number(alvo.value);
    },

    melhorEscalacao
  };
})();
