// Telas de análise: Estatísticas, Jogador e Trocas. Usa api, esc, num e listas de app.js.
const Analises = (() => {
  const COLUNAS = [
    ['fpts', 'FPTS'], ['min', 'MIN'], ['pts', 'PTS'], ['tpm', '3PM'], ['reb', 'REB'], ['ast', 'AST'],
    ['stl', 'STL'], ['blk', 'BLK'], ['fg', 'FG%'], ['ft', 'FT%'], ['to', 'TO']
  ];
  const PERIODOS = [['temporada', 'Temporada'], ['d30', '30 dias'], ['d15', '15 dias'], ['d7', '7 dias']];

  const estado = {
    periodo: 'temporada', ordem: 'fpts', escopo: 'time', perfil: null,
    posicao: 'todas', tipo: 'todos', ordemLivres: 'proj', jogam: 'todos', nome: '', quantos: '10', local: 'todos', linha: null,
    parceiro: 0, meuAnterior: 0, dou: new Set(), recebo: new Set()
  };

  const valor = (j, chave) => j.periodos[estado.periodo]?.[chave] ?? null;
  const sinal = v => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
  const opcoes = (lista, atual) => lista.map(([v, texto]) =>
    `<option value="${v}" ${String(v) === String(atual) ? 'selected' : ''}>${esc(texto)}</option>`).join('');
  const campo = (id, rotulo, lista) =>
    `<label>${rotulo} <select data-campo="${id}">${opcoes(lista, estado[id])}</select></label>`;
  const botaoJogador = j => `<button class="link" data-jogador="${esc(j.nome)}">${esc(j.nome)}</button>`;

  // Cor pela distância até a média dos jogadores da liga (em desvios padrão).
  function escala(jogadores) {
    const base = {};
    for (const [chave] of COLUNAS) {
      const valores = jogadores.map(j => valor(j, chave)).filter(v => v !== null);
      const media = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
      const desvio = Math.sqrt(valores.reduce((a, b) => a + (b - media) ** 2, 0) / (valores.length || 1));
      base[chave] = { media, desvio };
    }

    return (chave, v) => {
      const { media, desvio } = base[chave];
      if (v === null || !desvio || chave === 'min') return '';
      const z = ((v - media) / desvio) * (chave === 'to' ? -1 : 1);
      const forca = Math.min(Math.abs(z) / 2, 1) * 0.6;
      return `background: rgba(${z > 0 ? '22,163,74' : '220,38,38'}, ${forca.toFixed(2)})`;
    };
  }

  const nomeComPerfil = j => `<button class="link" data-perfil="${j.id}">${esc(j.nome)}</button> <small>${esc(j.posicao)}</small>`;

  function tabela(jogadores, cor, ordenar = true, celula = nomeComPerfil) {
    const cabecalho = COLUNAS.map(([chave, texto]) => ordenar
      ? `<th><button data-ordem="${chave}">${texto}${ordenar !== 'neutro' && estado.ordem === chave ? (chave === 'to' ? ' ▲' : ' ▼') : ''}</button></th>`
      : `<th>${texto}</th>`).join('');

    const linhas = jogadores.map(j => `<tr>
      <th>${celula(j)}</th>
      ${COLUNAS.map(([chave]) => `<td style="${cor(chave, valor(j, chave))}">${num(valor(j, chave))}</td>`).join('')}
    </tr>`).join('');

    return `<div class="rolagem"><table class="calor"><thead><tr><th>Jogador</th>${cabecalho}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  function ordenar(lista) {
    const direcao = estado.ordem === 'to' ? 1 : -1;
    // Quem não tem número no período vai para o fim.
    return [...lista].sort((a, b) => {
      const x = valor(a, estado.ordem), y = valor(b, estado.ordem);
      if (x === null || y === null) return (x === null) - (y === null);
      return (x - y) * direcao;
    });
  }

  const FORA = ['OUT', 'SUSPENSION', 'INJURY_RESERVE'];
  // Estimativa para 7 dias = média de FPTS do período x quantidade de jogos.
  const estimativa = j => valor(j, 'fpts') === null || j.jogos7 === null ? null : valor(j, 'fpts') * j.jogos7;
  const porEstimativa = (a, b) => (estimativa(b) ?? -Infinity) - (estimativa(a) ?? -Infinity);
  const textoStatus = j => j.status === 'ACTIVE' || j.status === 'NORMAL' ? '' : STATUS[j.status] || j.status;
  const resumo = j => `${j.jogos7} jogo(s) · média ${num(valor(j, 'fpts'))} · estimativa ${num(estimativa(j))}`;

  function sugestoes(livres, meu) {
    if (!meu) return '';

    // Quem está no IR não ocupa vaga do elenco, então não entra como dispensa.
    const dispensar = meu.elenco.filter(j => j.vaga !== 'IR' && estimativa(j) !== null)
      .sort((a, b) => porEstimativa(b, a)).slice(0, 3);
    if (!dispensar.length) return '<p><small>Sem dados suficientes para sugerir trocas neste período.</small></p>';

    const piso = estimativa(dispensar[0]);
    const pegar = livres.filter(j => !FORA.includes(j.status) && estimativa(j) > piso)
      .sort(porEstimativa).slice(0, 5);

    const item = (j, extra) => `<li><div>${botaoJogador(j)} <small>${esc(j.posicao)}</small>
      <span class="status">${esc([textoStatus(j), j.waivers ? 'Waivers' : ''].filter(Boolean).join(' · '))}</span>
      <small class="linha2">${resumo(j)}</small></div>${extra}</li>`;

    return `<div class="lados">
      <section class="placar"><h2>Melhores para pegar</h2>
        ${pegar.length ? `<ul class="elenco">${pegar.map(j => item(j, `<b class="sobe" title="Ganho sobre o seu pior">${sinal(estimativa(j) - piso)}</b>`)).join('')}</ul>`
          : '<p>Nenhum livre supera o seu jogador de menor estimativa.</p>'}</section>
      <section class="placar"><h2>Candidatos a dispensar</h2>
        <ul class="elenco">${dispensar.map(j => item(j, '')).join('')}</ul></section>
    </div>
    <p><small>O número verde é o ganho estimado em 7 dias sobre ${esc(dispensar[0].nome)}. Não considera posições, limite de escalação por dia nem retorno de lesão: confira antes de dispensar alguém.</small></p>`;
  }

  function telaLivres(livres, dados, meuId) {
    const meu = dados.times.find(t => t.id === meuId);
    const filtrados = livres.filter(j =>
      (estado.posicao === 'todas' || j.posicao === estado.posicao) &&
      (estado.tipo === 'todos' || j.waivers === (estado.tipo === 'waivers')) &&
      (estado.jogam === 'todos' || (j.jogo && !FORA.includes(j.status))));
    const porProjecao = estado.ordemLivres === 'proj';
    const lista = porProjecao ? [...filtrados].sort(porEstimativa) : ordenar(filtrados);

    const celula = j => {
      const libera = j.liberaEm ? ` até ${new Date(j.liberaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : '';
      const avisos = [textoStatus(j), j.waivers ? `Waivers${libera}` : ''].filter(Boolean);
      const variacao = j.variacao === null ? '' : ` (${sinal(j.variacao)})`;

      return `${botaoJogador(j)} <small>${esc(j.posicao)}</small> <span class="status">${esc(avisos.join(' · '))}</span>
        <small class="linha2">${j.jogos7 === null ? 'Calendário indisponível' : `${j.jogos7} jogo(s) em 7 dias · est. ${num(estimativa(j))}`}</small>
        <small class="linha2">${j.escalado === null ? '' : `${Math.round(j.escalado)}% escalado${variacao} · `}${esc(textoDoJogo(j.jogo))}</small>`;
    };

    return `${meu?.prioridade ? `<p>Sua prioridade nos waivers: <strong>${meu.prioridade}º</strong></p>` : ''}
      <div class="filtros">${campo('periodo', 'Período', PERIODOS)}
      ${campo('tipo', 'Tipo', [['todos', 'Todos'], ['livres', 'Free agents'], ['waivers', 'Waivers']])}
      ${campo('posicao', 'Posição', ['todas', 'PG', 'SG', 'SF', 'PF', 'C'].map(p => [p, p === 'todas' ? 'Todas' : p]))}
      ${campo('jogam', 'Mostrar', [['todos', 'Todos'], ['hoje', 'Só quem joga hoje']])}
      ${campo('ordemLivres', 'Ordenar por', [['proj', 'Estimativa 7 dias'], ['coluna', 'Coluna da tabela']])}</div>
      ${sugestoes(filtrados, meu)}
      <h2>Disponíveis (${lista.length})</h2>
      <p><small>Entre os 200 sem time mais escalados na ESPN. Estimativa = média do período x jogos em 7 dias, contando hoje. Cores comparam com os jogadores já nos elencos.</small></p>
      ${lista.length ? tabela(lista, escala(dados.times.flatMap(t => t.elenco)), !porProjecao ? true : 'neutro', celula) : '<p>Nenhum jogador neste filtro.</p>'}`;
  }

  function perfil(j) {
    const linhas = PERIODOS.map(([chave, texto]) => `<tr><th>${texto}</th>
      ${['fpts', 'min', 'pts', 'reb', 'ast'].map(c => `<td>${num(j.periodos[chave]?.[c] ?? null)}</td>`).join('')}</tr>`).join('');

    return `<section class="placar"><h2>${esc(j.nome)} · ${esc(j.posicao)}</h2>
      <div class="rolagem"><table><thead><tr><th></th><th>FPTS</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead><tbody>${linhas}</tbody></table></div>
      <p>${botaoJogador(j)} ← ver jogo a jogo</p></section>`;
  }

  function telaStats(dados, meuId) {
    const todos = dados.times.flatMap(t => t.elenco);
    const lista = estado.escopo === 'time' ? dados.times.find(t => t.id === meuId)?.elenco || [] : todos;
    const ordenados = ordenar(lista);
    const escolhido = todos.find(j => j.id === estado.perfil);

    return `<div class="filtros">${campo('periodo', 'Período', PERIODOS)}
      ${campo('escopo', 'Jogadores', [['time', 'Meu time'], ['liga', 'Todos os elencos']])}</div>
      <p><small>Médias por jogo. Verde = acima da média dos jogadores da liga; vermelho = abaixo (em TO, menos é melhor).</small></p>
      ${escolhido ? perfil(escolhido) : ''}
      ${tabela(ordenados, escala(todos))}`;
  }

  async function telaJogador(dados) {
    const nomes = dados.times.flatMap(t => t.elenco.map(j => j.nome)).sort();
    const busca = `<form id="busca" class="filtros"><input name="nome" list="nomes" placeholder="Nome do jogador" value="${esc(estado.nome)}" required>
      <datalist id="nomes">${nomes.map(n => `<option value="${esc(n)}">`).join('')}</datalist><button>Analisar</button></form>`;
    if (!estado.nome) return `${busca}<p>Escolha um jogador dos elencos ou digite qualquer nome da NBA.</p>`;

    let a;
    try {
      a = await api(`/api/jogador?nome=${encodeURIComponent(estado.nome)}`);
    } catch (erro) {
      return `${busca}<p class="alerta">${esc(erro.message)}</p>`;
    }

    const filtrados = a.jogos.filter(j =>
      estado.local === 'todos' || j.casa === (estado.local === 'casa'));
    const jogos = filtrados.slice(0, Number(estado.quantos) || filtrados.length).reverse();
    const linha = estado.linha ?? Math.round(a.mediaTemporada);
    const acima = jogos.filter(j => j.fpts >= linha).length;
    const media = jogos.reduce((s, j) => s + j.fpts, 0) / (jogos.length || 1);
    const teto = Math.max(linha, ...jogos.map(j => j.fpts), 1);
    const piso = Math.min(0, ...jogos.map(j => j.fpts));
    const posicao = v => ((v - piso) / (teto - piso)) * 100;

    const barras = jogos.map(j => {
      const data = j.data ? new Date(j.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
      const base = posicao(Math.min(j.fpts, 0));
      const altura = Math.abs(posicao(j.fpts) - posicao(0));
      return `<div class="coluna" title="${esc(`${data} ${j.adversario}: ${j.fpts.toFixed(1)} FPTS, ${j.minutos} min`)}">
        <div class="area"><i class="${j.fpts >= linha ? 'bom' : 'ruim'}" style="bottom:${base}%;height:${altura}%"></i>
        <b style="bottom:${base + altura}%">${Math.round(j.fpts)}</b><hr style="bottom:${posicao(linha)}%"></div>
        <small>${esc(data)}</small></div>`;
    }).join('');

    const cartao = (titulo, texto) => `<div><small>${titulo}</small><b>${texto}</b></div>`;

    return `${busca}<h2>${esc(a.jogador.nome)} · ${esc(a.jogador.posicao)} · ${esc(a.jogador.equipe)}</h2>
      <div class="cartoes">
        ${cartao('Média da temporada', num(a.mediaTemporada))}${cartao('Últimos 5', num(a.media5))}${cartao('Últimos 10', num(a.media10))}
        ${cartao(`Jogos com ${linha}+ FPTS`, jogos.length ? `${Math.round((acima / jogos.length) * 100)}% (${acima}/${jogos.length})` : '–')}
        ${cartao('Média no filtro', jogos.length ? num(media) : '–')}${cartao('Tendência', esc(a.tendencia))}
      </div>
      <div class="filtros">${campo('quantos', 'Jogos', [['5', 'Últimos 5'], ['10', 'Últimos 10'], ['20', 'Últimos 20'], ['0', 'Todos']])}
        ${campo('local', 'Local', [['todos', 'Todos'], ['casa', 'Casa'], ['fora', 'Fora']])}
        <label>Meta de FPTS <input type="number" data-campo="linha" value="${linha}"></label></div>
      ${jogos.length ? `<div class="rolagem"><div class="grafico">${barras}</div></div>
      <p><small>A linha tracejada é a meta. Verde = atingiu; vermelho = ficou abaixo.</small></p>` : '<p>Nenhum jogo neste filtro.</p>'}`;
  }

  // Força de um elenco = soma das maiores médias de FPTS, até o número de titulares.
  const forca = (elenco, vagas) => elenco.map(j => valor(j, 'fpts') ?? 0)
    .sort((a, b) => b - a).slice(0, vagas).reduce((s, v) => s + v, 0);

  function telaTroca(dados, meuId) {
    const meu = dados.times.find(t => t.id === meuId);
    const outros = dados.times.filter(t => t.id !== meuId);
    if (!meu || !outros.length) return '<p>São necessários pelo menos dois times.</p>';

    if (estado.meuAnterior !== meuId) {
      estado.meuAnterior = meuId;
      estado.dou.clear();
      estado.recebo.clear();
    }
    if (!outros.some(t => t.id === estado.parceiro)) {
      estado.parceiro = outros[0].id;
      estado.recebo.clear();
    }
    const outro = outros.find(t => t.id === estado.parceiro);
    const saem = meu.elenco.filter(j => estado.dou.has(j.id));
    const chegam = outro.elenco.filter(j => estado.recebo.has(j.id));

    const escolha = (time, lado, marcados) => `<fieldset><legend>${lado === 'dou' ? 'Você envia' : `Você recebe de ${esc(time.nome)}`}</legend>
      ${time.elenco.map(j => `<label><input type="checkbox" data-troca="${lado}" value="${j.id}" ${marcados.has(j.id) ? 'checked' : ''}>
        ${esc(j.nome)} <small>${num(valor(j, 'fpts'))}</small></label>`).join('')}</fieldset>`;

    let resultado = '<p>Marque pelo menos um jogador de cada lado.</p>';

    if (saem.length && chegam.length) {
      const depois = dados.times.map(t => {
        if (t.id === meu.id) return { ...t, elenco: [...t.elenco.filter(j => !estado.dou.has(j.id)), ...chegam] };
        if (t.id === outro.id) return { ...t, elenco: [...t.elenco.filter(j => !estado.recebo.has(j.id)), ...saem] };
        return t;
      });
      const ranking = times => times.map(t => ({ id: t.id, nome: t.nome, forca: forca(t.elenco, dados.titulares) }))
        .sort((a, b) => b.forca - a.forca);
      const antes = ranking(dados.times);
      const novo = ranking(depois);

      const linhas = novo.map((t, i) => {
        const anterior = antes.findIndex(x => x.id === t.id);
        const delta = t.forca - antes[anterior].forca;
        const mudou = anterior - i;
        return `<tr class="${t.id === meu.id || t.id === outro.id ? 'marcada' : ''}"><td>${i + 1}º ${mudou ? `<small>${mudou > 0 ? '▲' : '▼'}${Math.abs(mudou)}</small>` : ''}</td>
          <td>${esc(t.nome)}</td><td>${t.forca.toFixed(1)}</td><td class="${delta > 0.05 ? 'sobe' : delta < -0.05 ? 'desce' : ''}">${sinal(delta)}</td></tr>`;
      }).join('');

      const diferencas = COLUNAS.filter(([c]) => !['min', 'fg', 'ft'].includes(c)).map(([chave, texto]) => {
        const soma = lista => lista.reduce((s, j) => s + (valor(j, chave) ?? 0), 0);
        const d = soma(chegam) - soma(saem);
        const bom = chave === 'to' ? d < 0 : d > 0;
        return `<div><small>${texto}</small><b class="${Math.abs(d) < 0.05 ? '' : bom ? 'sobe' : 'desce'}">${sinal(d)}</b></div>`;
      }).join('');

      const cor = escala(dados.times.flatMap(t => t.elenco));
      const semDados = [...saem, ...chegam].filter(j => valor(j, 'fpts') === null);

      resultado = `${semDados.length ? `<p class="alerta">Sem dados no período (contados como zero): ${semDados.map(j => esc(j.nome)).join(', ')}</p>` : ''}
        <h2>Você envia</h2>${tabela(saem, cor, false)}<h2>Você recebe</h2>${tabela(chegam, cor, false)}
        <h2>Saldo por jogo (soma das médias)</h2><div class="cartoes">${diferencas}</div>
        <h2>Impacto na liga</h2><div class="rolagem"><table><thead><tr><th>Posição</th><th>Time</th><th>Força</th><th>Mudança</th></tr></thead><tbody>${linhas}</tbody></table></div>
        <p><small>Força = soma das ${dados.titulares} maiores médias de FPTS do elenco. É uma estimativa: não considera calendário, lesões nem posições.</small></p>`;
    }

    return `<div class="filtros">${campo('periodo', 'Período', PERIODOS)}${campo('parceiro', 'Trocar com', outros.map(t => [t.id, t.nome]))}</div>
      <div class="lados">${escolha(meu, 'dou', estado.dou)}${escolha(outro, 'recebo', estado.recebo)}</div>${resultado}`;
  }

  return {
    telas: ['stats', 'jogador', 'livres', 'troca'],

    async tela(aba, meuId) {
      const dados = await api('/api/elencos');
      if (aba === 'livres') return telaLivres(await api('/api/livres'), dados, meuId);
      if (aba === 'stats') return telaStats(dados, meuId);
      if (aba === 'jogador') return telaJogador(dados);
      return telaTroca(dados, meuId);
    },

    // Retorna true quando o clique foi tratado aqui e a tela só precisa ser redesenhada.
    clique(botao) {
      const { ordem, perfil: id, jogador } = botao.dataset;
      if (ordem) {
        estado.ordem = ordem;
        estado.ordemLivres = 'coluna';
      }
      if (id) estado.perfil = Number(id);
      if (jogador) {
        estado.nome = jogador;
        estado.linha = null;
      }
      return Boolean(ordem || id);
    },

    mudanca(alvo) {
      const { campo: nome, troca } = alvo.dataset;
      if (nome) {
        const numerico = nome === 'parceiro' || nome === 'linha';
        estado[nome] = numerico ? (alvo.value === '' ? null : Number(alvo.value)) : alvo.value;
        if (nome === 'parceiro') estado.recebo.clear();
      }
      if (troca) estado[troca][alvo.checked ? 'add' : 'delete'](Number(alvo.value));
    },

    buscar(nome) {
      estado.nome = nome.trim();
      estado.linha = null;
    }
  };
})();
