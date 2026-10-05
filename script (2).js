
const PREFIX = 'fratella_';

const DB = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Falha ao ler', key, e);
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }
};

const money = n => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = n => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const qtd = n => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const hoje = () => new Date();
const iso = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const brDate = s => {
  if (!s) return '—';
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
};
const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const mesRef = s => s.slice(0, 7);
const nomeMes = ym => {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [a, m] = ym.split('-');
  return `${meses[Number(m) - 1]}/${a.slice(2)}`;
};

function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (tipo === 'error' ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3800);
}

/* Gerador pseudoaleatório determinístico — mantém o histórico estável */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------
   2. CATÁLOGO FIXO (insumos, fichas técnicas, bairros)
------------------------------------------------------------ */
const INSUMOS_BASE = [
  { id: 'mussarela', nome: 'Muçarela', un: 'kg', custo: 46.90, estoque: 11.4, minimo: 10, categoria: 'Laticínio' },
  { id: 'calabresa', nome: 'Calabresa', un: 'kg', custo: 32.50, estoque: 6.2, minimo: 5, categoria: 'Frios' },
  { id: 'trigo', nome: 'Farinha de trigo', un: 'kg', custo: 4.65, estoque: 38.0, minimo: 25, categoria: 'Secos' },
  { id: 'molho', nome: 'Molho de tomate', un: 'kg', custo: 13.20, estoque: 9.5, minimo: 6, categoria: 'Molhos' },
  { id: 'catupiry', nome: 'Requeijão cremoso', un: 'kg', custo: 38.90, estoque: 3.1, minimo: 4, categoria: 'Laticínio' },
  { id: 'frango', nome: 'Frango desfiado', un: 'kg', custo: 24.40, estoque: 5.6, minimo: 4, categoria: 'Carnes' },
  { id: 'azeitona', nome: 'Azeitona', un: 'kg', custo: 27.00, estoque: 2.4, minimo: 2, categoria: 'Conservas' },
  { id: 'cebola', nome: 'Cebola', un: 'kg', custo: 6.10, estoque: 7.8, minimo: 4, categoria: 'Hortifruti' },
  { id: 'chocolate', nome: 'Chocolate ao leite', un: 'kg', custo: 41.90, estoque: 2.9, minimo: 2, categoria: 'Doces' },
  { id: 'caixa', nome: 'Caixa de pizza', un: 'un', custo: 1.42, estoque: 165, minimo: 150, categoria: 'Embalagem' },
  { id: 'refri', nome: 'Refrigerante 2L', un: 'un', custo: 5.80, estoque: 42, minimo: 24, categoria: 'Bebidas' }
];

/* Ficha técnica: gramatura exata do tamanho M (kg ou unidades) */
const SABORES = [
  {
    id: 'calabresa', nome: 'Calabresa', precoM: 49.00,
    ficha: [
      { insumo: 'trigo', q: 0.30 }, { insumo: 'molho', q: 0.12 },
      { insumo: 'mussarela', q: 0.25 }, { insumo: 'calabresa', q: 0.20 },
      { insumo: 'cebola', q: 0.05 }, { insumo: 'caixa', q: 1 }
    ]
  },
  {
    id: 'mussarela', nome: 'Muçarela', precoM: 45.00,
    ficha: [
      { insumo: 'trigo', q: 0.30 }, { insumo: 'molho', q: 0.12 },
      { insumo: 'mussarela', q: 0.35 }, { insumo: 'azeitona', q: 0.03 },
      { insumo: 'caixa', q: 1 }
    ]
  },
  {
    id: 'frango', nome: 'Frango com requeijão', precoM: 56.00,
    ficha: [
      { insumo: 'trigo', q: 0.30 }, { insumo: 'molho', q: 0.12 },
      { insumo: 'mussarela', q: 0.20 }, { insumo: 'frango', q: 0.18 },
      { insumo: 'catupiry', q: 0.10 }, { insumo: 'caixa', q: 1 }
    ]
  },
  {
    id: 'portuguesa', nome: 'Portuguesa', precoM: 53.00,
    ficha: [
      { insumo: 'trigo', q: 0.30 }, { insumo: 'molho', q: 0.12 },
      { insumo: 'mussarela', q: 0.25 }, { insumo: 'calabresa', q: 0.10 },
      { insumo: 'cebola', q: 0.06 }, { insumo: 'azeitona', q: 0.04 },
      { insumo: 'caixa', q: 1 }
    ]
  },
  {
    id: 'chocolate', nome: 'Chocolate', precoM: 47.00,
    ficha: [
      { insumo: 'trigo', q: 0.30 }, { insumo: 'chocolate', q: 0.25 },
      { insumo: 'caixa', q: 1 }
    ]
  }
];

const TAMANHOS = {
  P: { fator: 0.70, preco: 0.76 },
  M: { fator: 1.00, preco: 1.00 },
  G: { fator: 1.35, preco: 1.28 }
};

/* Bairros com posição no grid do mapa de calor (linha x coluna, 6x6) */
const BAIRROS = [
  { nome: 'Centro', row: 1, col: 3 },
  { nome: '13 de Julho', row: 2, col: 4 },
  { nome: 'Jardins', row: 3, col: 5 },
  { nome: 'Grageru', row: 3, col: 3 },
  { nome: 'Salgado Filho', row: 2, col: 2 },
  { nome: 'Luzia', row: 4, col: 2 },
  { nome: 'Atalaia', row: 5, col: 5 },
  { nome: 'Coroa do Meio', row: 4, col: 6 },
  { nome: 'Farolândia', row: 5, col: 3 },
  { nome: 'Inácio Barbosa', row: 4, col: 4 },
  { nome: 'Ponto Novo', row: 2, col: 5 },
  { nome: 'São José', row: 1, col: 2 },
  { nome: 'Siqueira Campos', row: 1, col: 1 },
  { nome: 'Jabotiana', row: 6, col: 2 }
];

const CANAIS = ['Delivery próprio', 'iFood', 'Balcão'];
const TAXA_APP = 0.27;      // comissão do marketplace
const TAXA_DELIVERY = 0.10; // custo logístico do delivery próprio
const TAXA_MAQUINA = 0.032; // taxa de cartão sobre tudo

/* ------------------------------------------------------------
   3. SEED — primeira execução popula o localStorage
------------------------------------------------------------ */
function seed() {
  if (DB.get('seeded')) return;

  DB.set('insumos', INSUMOS_BASE);
  DB.set('meta', 92000);

  /* Histórico de preços dos últimos 6 meses (R$ por unidade) */
  const rnd = rng(20260915);
  const historico = [];
  const tendencia = { mussarela: 0.042, calabresa: 0.021, trigo: 0.012, catupiry: 0.018, frango: -0.006, molho: 0.009, chocolate: 0.027, cebola: 0.035, azeitona: 0.008, caixa: 0.006, refri: 0.011 };
  INSUMOS_BASE.forEach(ins => {
    let preco = ins.custo / Math.pow(1 + (tendencia[ins.id] || 0.01), 6);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(6 + Math.floor(rnd() * 12));
      preco = preco * (1 + (tendencia[ins.id] || 0.01) + (rnd() - 0.5) * 0.012);
      historico.push({ insumo: ins.id, data: iso(d), preco: Number(preco.toFixed(2)), fornecedor: i % 2 ? 'Distribuidora Aracaju' : 'Atacadão Sergipe' });
    }
  });
  DB.set('historico', historico);

  /* Pedidos dos últimos 45 dias */
  const pedidos = [];
  const pesoBairro = [14, 12, 11, 9, 8, 7, 13, 6, 9, 6, 5, 4, 4, 3];
  const totalPeso = pesoBairro.reduce((a, b) => a + b, 0);
  let idSeq = 1000;
  for (let d = 44; d >= 0; d--) {
    const dia = new Date();
    dia.setDate(dia.getDate() - d);
    const fds = [0, 5, 6].includes(dia.getDay());
    const n = Math.floor((fds ? 14 : 7) + rnd() * (fds ? 9 : 6));
    for (let k = 0; k < n; k++) {
      const itens = [];
      const qtdItens = rnd() > 0.72 ? 2 : 1;
      for (let j = 0; j < qtdItens; j++) {
        const sab = SABORES[Math.floor(rnd() * SABORES.length)];
        const tam = rnd() > 0.62 ? 'G' : (rnd() > 0.25 ? 'M' : 'P');
        itens.push({ sabor: sab.id, tamanho: tam, quantidade: 1, preco: Number((sab.precoM * TAMANHOS[tam].preco).toFixed(2)) });
      }
      let alvo = rnd() * totalPeso, acc = 0, bairro = BAIRROS[0].nome;
      for (let b = 0; b < BAIRROS.length; b++) {
        acc += pesoBairro[b];
        if (alvo <= acc) { bairro = BAIRROS[b].nome; break; }
      }
      const canal = rnd() > 0.55 ? 'Delivery próprio' : (rnd() > 0.45 ? 'iFood' : 'Balcão');
      pedidos.push({
        id: ++idSeq,
        data: iso(dia),
        bairro,
        canal,
        itens,
        total: Number(itens.reduce((s, i) => s + i.preco * i.quantidade, 0).toFixed(2))
      });
    }
  }
  DB.set('pedidos', pedidos);

  /* Compras recentes */
  const compras = [];
  let cId = 500;
  ['mussarela', 'calabresa', 'trigo', 'molho', 'catupiry', 'caixa'].forEach((ins, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (3 + i * 4));
    const insumo = INSUMOS_BASE.find(x => x.id === ins);
    const quantidade = insumo.un === 'kg' ? 10 + Math.round(rnd() * 20) : 200;
    compras.push({
      id: ++cId,
      data: iso(d),
      insumo: ins,
      fornecedor: i % 2 ? 'Distribuidora Aracaju' : 'Atacadão Sergipe',
      quantidade,
      total: Number((quantidade * insumo.custo * (0.96 + rnd() * 0.08)).toFixed(2)),
      nf: i < 2 ? 'pendente' : 'aprovada'
    });
  });
  DB.set('compras', compras);

  /* Custos fixos do mês */
  DB.set('custosFixos', [
    { id: 1, nome: 'Aluguel do ponto', valor: 4800, categoria: 'Ocupação' },
    { id: 2, nome: 'Salários e encargos', valor: 11200, categoria: 'Pessoal' },
    { id: 3, nome: 'Energia elétrica', valor: 2150, categoria: 'Utilidades' },
    { id: 4, nome: 'Água', valor: 480, categoria: 'Utilidades' },
    { id: 5, nome: 'Gás (P45)', valor: 960, categoria: 'Utilidades' },
    { id: 6, nome: 'Internet e telefonia', valor: 240, categoria: 'Administrativo' },
    { id: 7, nome: 'Contabilidade', valor: 690, categoria: 'Administrativo' },
    { id: 8, nome: 'Simples Nacional', valor: 2900, categoria: 'Impostos' }
  ]);

  /* Contas a pagar */
  const contas = [
    { id: 1, descricao: 'Distribuidora Aracaju — NF 8842', valor: 1980.40, venc: 2, status: 'aberto' },
    { id: 2, descricao: 'Energia elétrica', valor: 2150.00, venc: 5, status: 'aberto' },
    { id: 3, descricao: 'Aluguel do ponto', valor: 4800.00, venc: 9, status: 'aberto' },
    { id: 4, descricao: 'Atacadão Sergipe — NF 1177', valor: 1260.90, venc: -1, status: 'aberto' },
    { id: 5, descricao: 'Simples Nacional', valor: 2900.00, venc: 14, status: 'aberto' },
    { id: 6, descricao: 'Água', valor: 480.00, venc: 18, status: 'aberto' },
    { id: 7, descricao: 'Folha de pagamento', valor: 11200.00, venc: 21, status: 'aberto' }
  ].map(c => {
    const d = new Date();
    d.setDate(d.getDate() + c.venc);
    return { id: c.id, descricao: c.descricao, valor: c.valor, vencimento: iso(d), status: c.status };
  });
  DB.set('contas', contas);

  /* Pesquisa de preço em fornecedores locais */
  DB.set('fornecedores', [
    { insumo: 'mussarela', fornecedor: 'Laticínios Itabaiana', preco: 43.20, contato: '(79) 3211-0044', prazo: '28 dias' },
    { insumo: 'mussarela', fornecedor: 'Atacadão Sergipe', preco: 46.10, contato: '(79) 3255-1180', prazo: '21 dias' },
    { insumo: 'calabresa', fornecedor: 'Frigorífico Boa Carne', preco: 29.80, contato: '(79) 3245-7712', prazo: '14 dias' },
    { insumo: 'calabresa', fornecedor: 'Distribuidora Aracaju', preco: 32.90, contato: '(79) 3214-9900', prazo: '28 dias' },
    { insumo: 'trigo', fornecedor: 'Moinho Nordeste', preco: 4.10, contato: '(79) 3232-4455', prazo: '30 dias' },
    { insumo: 'catupiry', fornecedor: 'Laticínios Itabaiana', preco: 35.40, contato: '(79) 3211-0044', prazo: '28 dias' },
    { insumo: 'molho', fornecedor: 'Atacadão Sergipe', preco: 12.40, contato: '(79) 3255-1180', prazo: '21 dias' },
    { insumo: 'caixa', fornecedor: 'Embalagens Sul', preco: 1.18, contato: '(79) 3288-3020', prazo: '15 dias' },
    { insumo: 'frango', fornecedor: 'Frigorífico Boa Carne', preco: 23.90, contato: '(79) 3245-7712', prazo: '14 dias' }
  ]);

  DB.set('seeded', true);
}

/* ------------------------------------------------------------
   4. ACESSORES
------------------------------------------------------------ */
const getInsumos = () => DB.get('insumos', INSUMOS_BASE);
const getPedidos = () => DB.get('pedidos', []);
const getCompras = () => DB.get('compras', []);
const getHistorico = () => DB.get('historico', []);
const getFixos = () => DB.get('custosFixos', []);
const getContas = () => DB.get('contas', []);
const getFornecedores = () => DB.get('fornecedores', []);
const insumoPorId = id => getInsumos().find(i => i.id === id) || { nome: id, un: 'un', custo: 0 };
const saborPorId = id => SABORES.find(s => s.id === id);

/* Custo de produção de um item segundo a ficha técnica */
function custoItem(saborId, tamanho) {
  const sab = saborPorId(saborId);
  if (!sab) return 0;
  const f = TAMANHOS[tamanho].fator;
  return sab.ficha.reduce((s, ing) => s + insumoPorId(ing.insumo).custo * ing.q * (ing.insumo === 'caixa' ? 1 : f), 0);
}

function pedidosNoPeriodo(dias) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias + 1);
  return getPedidos().filter(p => new Date(p.data + 'T12:00') >= limite);
}

function pedidosDoMes(ym = mesRef(iso(hoje()))) {
  return getPedidos().filter(p => mesRef(p.data) === ym);
}

/* Resumo financeiro de um conjunto de pedidos */
function financeiro(pedidos) {
  const receita = pedidos.reduce((s, p) => s + p.total, 0);
  let cmv = 0, taxaCanal = 0;
  pedidos.forEach(p => {
    p.itens.forEach(i => { cmv += custoItem(i.sabor, i.tamanho) * i.quantidade; });
    if (p.canal === 'iFood') taxaCanal += p.total * TAXA_APP;
    else if (p.canal === 'Delivery próprio') taxaCanal += p.total * TAXA_DELIVERY;
  });
  const taxaCartao = receita * TAXA_MAQUINA;
  const fixos = getFixos().reduce((s, c) => s + c.valor, 0);
  const lucro = receita - cmv - taxaCanal - taxaCartao - fixos;
  return {
    receita, cmv, taxaCanal, taxaCartao, fixos, lucro,
    cmvPct: receita ? (cmv / receita) * 100 : 0,
    margem: receita ? (lucro / receita) * 100 : 0,
    pedidos: pedidos.length,
    ticket: pedidos.length ? receita / pedidos.length : 0
  };
}

/* Variação de preço de um insumo em 30 dias vs. 30 anteriores */
function variacao30(insumoId) {
  const hist = getHistorico().filter(h => h.insumo === insumoId).sort((a, b) => a.data.localeCompare(b.data));
  if (hist.length < 2) return 0;
  const hoje30 = new Date(); hoje30.setDate(hoje30.getDate() - 30);
  const recentes = hist.filter(h => new Date(h.data + 'T12:00') >= hoje30);
  const anteriores = hist.filter(h => new Date(h.data + 'T12:00') < hoje30);
  if (!recentes.length || !anteriores.length) return 0;
  const m = arr => arr.reduce((s, h) => s + h.preco, 0) / arr.length;
  const antes = m(anteriores.slice(-2));
  return ((m(recentes) - antes) / antes) * 100;
}

/* ------------------------------------------------------------
   5. AUTENTICAÇÃO E PERFIS
------------------------------------------------------------ */
const CREDENCIAIS = {
  Dona1111: { perfil: 'dono', nome: 'Dona Anne', descricao: 'Acesso total' },
  Equipe2222: { perfil: 'gerente', nome: 'Equipe Fratella', descricao: 'Pedidos, compras e estoque' }
};

let sessao = null;

function togglePassword() {
  const campo = document.getElementById('password');
  const caixa = campo.closest('.password-box');
  const botao = document.getElementById('eye-btn');
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  caixa.classList.toggle('is-visible', mostrar);
  botao.setAttribute('aria-pressed', String(mostrar));
  botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  campo.focus();
}

function aplicarPerfil(perfil) {
  document.querySelectorAll('.nav-item').forEach(li => {
    li.style.display = li.classList.contains('role-' + perfil) ? '' : 'none';
  });
}

function iniciarSessao(dados) {
  sessao = dados;
  DB.set('sessao', dados);
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('user-name').textContent = dados.nome;
  document.getElementById('user-role').textContent = dados.descricao;
  document.getElementById('user-initial').textContent = dados.nome.charAt(0);
  document.getElementById('today-chip').textContent = hoje().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  aplicarPerfil(dados.perfil);
  showSection(dados.perfil === 'dono' ? 'dashboard' : 'pedidos');
}

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const senha = document.getElementById('password').value.trim();
  const erro = document.getElementById('login-error');
  const cred = CREDENCIAIS[senha];
  if (!cred) {
    erro.textContent = 'Senha não reconhecida. Use o acesso da dona ou o da equipe.';
    return;
  }
  erro.textContent = '';
  iniciarSessao(cred);
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem(PREFIX + 'sessao');
  sessao = null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-form').reset();
  const campo = document.getElementById('password');
  if (campo.type === 'text') togglePassword();
});

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ------------------------------------------------------------
   6. NAVEGAÇÃO
------------------------------------------------------------ */
const TITULOS = {
  dashboard: 'Painel Geral',
  pedidos: 'Central de Pedidos',
  compras: 'Lançar Compras',
  estoque: 'Estoque & Insumos',
  custos: 'Custos & DRE',
  inflacao: 'Inflação & Insumos',
  mapa: 'Mapa de Calor de Entregas'
};

const RENDER = {};
let secaoAtual = 'dashboard';

function showSection(id) {
  if (!sessao) return;
  if (sessao.perfil !== 'dono' && !['pedidos', 'compras', 'estoque'].includes(id)) {
    toast('Este módulo é exclusivo do acesso da dona.', 'error');
    return;
  }
  secaoAtual = id;
  document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('welcome-msg').textContent = TITULOS[id];
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
  const link = document.querySelector(`.sidebar a[onclick*="'${id}'"]`);
  if (link) link.parentElement.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  RENDER[id]();
  window.scrollTo({ top: 0 });
}

function refresh() {
  RENDER[secaoAtual]();
}

/* Registro de gráficos para evitar duplicação ao re-renderizar */
const charts = {};
function desenharChart(canvasId, config) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  Chart.defaults.color = '#9fb2c1';
  Chart.defaults.font.family = 'Inter, sans-serif';
  charts[canvasId] = new Chart(el, config);
}

/* ------------------------------------------------------------
   7. DASHBOARD BI
------------------------------------------------------------ */
RENDER.dashboard = function () {
  const semana = financeiro(pedidosNoPeriodo(7));
  const mes = financeiro(pedidosDoMes());
  const meta = DB.get('meta', 92000);
  const progresso = meta ? Math.min(100, (mes.receita / meta) * 100) : 0;

  /* Ranking de sabores no mês */
  const ranking = {};
  pedidosDoMes().forEach(p => p.itens.forEach(i => {
    ranking[i.sabor] = (ranking[i.sabor] || 0) + i.quantidade;
  }));
  const rankOrdenado = Object.entries(ranking).sort((a, b) => b[1] - a[1]);

  /* Alertas automáticos */
  const alertas = [];
  getInsumos().forEach(ins => {
    const v = variacao30(ins.id);
    if (v >= 4) alertas.push({ tipo: '', tag: 'Variação de preço', titulo: `${ins.nome} subiu ${pct(v)} em 30 dias`, texto: `Preço atual de ${money(ins.custo)}/${ins.un}. Reveja o fornecedor antes da próxima compra ou repasse ao cardápio.` });
    if (v <= -4) alertas.push({ tipo: 'info', tag: 'Oportunidade', titulo: `${ins.nome} caiu ${pct(Math.abs(v))} em 30 dias`, texto: `Bom momento para comprar volume e travar o custo em ${money(ins.custo)}/${ins.un}.` });
  });
  getInsumos().filter(i => i.estoque <= i.minimo).forEach(i => {
    alertas.push({ tipo: 'critical', tag: 'Estoque crítico', titulo: `${i.nome} abaixo do mínimo`, texto: `Restam ${qtd(i.estoque)} ${i.un} para um mínimo de ${qtd(i.minimo)} ${i.un}. Reponha hoje para não parar a produção.` });
  });
  const nfPendentes = getCompras().filter(c => c.nf === 'pendente');
  if (nfPendentes.length) {
    alertas.push({ tipo: 'critical', tag: 'Notas fiscais', titulo: `${nfPendentes.length} nota(s) aguardando aprovação`, texto: `Total de ${money(nfPendentes.reduce((s, c) => s + c.total, 0))} lançado sem conferência. Aprove em Lançar Compras.` });
  }

  const centros = [
    ['CMV (insumos)', mes.cmv],
    ['Taxas de delivery e apps', mes.taxaCanal],
    ['Taxa de máquina', mes.taxaCartao],
    ['Aluguel', valorFixo('Aluguel do ponto')],
    ['Salários', valorFixo('Salários e encargos')],
    ['Energia', valorFixo('Energia elétrica')],
    ['Água', valorFixo('Água')],
    ['Gás', valorFixo('Gás (P45)')],
    ['Outros fixos', mes.fixos - valorFixo('Aluguel do ponto') - valorFixo('Salários e encargos') - valorFixo('Energia elétrica') - valorFixo('Água') - valorFixo('Gás (P45)')],
    ['Lucro líquido', Math.max(0, mes.lucro)]
  ];

  /* Faturamento diário dos últimos 14 dias */
  const dias = [];
  for (let d = 13; d >= 0; d--) {
    const x = new Date(); x.setDate(x.getDate() - d);
    const key = iso(x);
    dias.push({ label: key.slice(8) + '/' + key.slice(5, 7), valor: getPedidos().filter(p => p.data === key).reduce((s, p) => s + p.total, 0) });
  }

  document.getElementById('dashboard').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Faturamento da semana', money(semana.receita), `${semana.pedidos} pedidos nos últimos 7 dias`)}
      ${kpi('Faturamento do mês', money(mes.receita), `Meta de ${money(meta)} · ${pct(progresso)} atingido`)}
      ${kpi('CMV', pct(mes.cmvPct), `${money(mes.cmv)} em insumos consumidos`, mes.cmvPct > 35 ? 'bad' : mes.cmvPct > 30 ? 'warn' : 'good')}
      ${kpi('Lucro líquido real', money(mes.lucro), `Margem de ${pct(mes.margem)} no mês`, mes.lucro > 0 ? 'good' : 'bad')}
      ${kpi('Ticket médio', money(mes.ticket), `${mes.pedidos} pedidos no mês`)}
      ${kpi('Sabor mais pedido', rankOrdenado.length ? saborPorId(rankOrdenado[0][0]).nome : '—', rankOrdenado.length ? `${rankOrdenado[0][1]} unidades vendidas` : 'Sem pedidos no mês')}
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Meta de faturamento</h3>
      <p class="card-sub">Mês corrente · ajuste o valor conforme o planejamento</p>
      <div class="form-grid" style="max-width:520px">
        <div class="field">
          <label for="meta-input">Meta mensal (R$)</label>
          <input type="number" id="meta-input" value="${meta}" step="500">
        </div>
        <button class="btn" onclick="salvarMeta()">Salvar meta</button>
      </div>
      <div class="meta-bar"><span style="width:${progresso}%"></span></div>
      <p class="card-sub" style="margin:10px 0 0">${money(mes.receita)} de ${money(meta)} · faltam ${money(Math.max(0, meta - mes.receita))}</p>
    </div>

    <div class="section-title">
      <h2>Alertas do dia</h2>
      <p>Gerados a partir do histórico de preços, do estoque e das notas lançadas</p>
    </div>
    <div class="grid cards-3">
      ${alertas.length ? alertas.map(a => `
        <div class="alert-card ${a.tipo}">
          <span class="alert-tag">${a.tag}</span>
          <h4>${a.titulo}</h4>
          <p>${a.texto}</p>
        </div>`).join('') : '<p class="empty-state">Nenhum alerta aberto. Estoque, preços e notas estão em dia.</p>'}
    </div>

    <div class="grid two-col" style="margin-top:22px">
      <div class="card">
        <h3>Para onde vai cada real</h3>
        <p class="card-sub">Distribuição do faturamento do mês por centro de custo</p>
        <div class="chart-box tall"><canvas id="chart-centros"></canvas></div>
      </div>
      <div class="card">
        <h3>Ranking de sabores</h3>
        <p class="card-sub">Unidades vendidas no mês</p>
        <ul class="rank-list">
          ${rankOrdenado.map(([id, q], i) => `
            <li><span class="pos">${i + 1}</span> ${saborPorId(id).nome} <span class="val">${q} un</span></li>`).join('') || '<li class="empty-state">Sem vendas registradas.</li>'}
        </ul>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Faturamento diário</h3>
      <p class="card-sub">Últimos 14 dias</p>
      <div class="chart-box"><canvas id="chart-dias"></canvas></div>
    </div>
  `;

  const cores = ['#e07b12', '#f0a04a', '#c96a10', '#3ec98a', '#2fa26f', '#f0c040', '#5aa9e6', '#8e7cc3', '#6b7d8c', '#ef5a5a'];
  desenharChart('chart-centros', {
    type: 'doughnut',
    data: {
      labels: centros.map(c => c[0]),
      datasets: [{ data: centros.map(c => Math.max(0, Number(c[1].toFixed(2)))), backgroundColor: cores, borderColor: '#111a22', borderWidth: 2 }]
    },
    options: {
      maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: c => {
              const tot = c.dataset.data.reduce((s, v) => s + v, 0);
              return ` ${c.label}: ${money(c.parsed)} (${pct(tot ? c.parsed / tot * 100 : 0)})`;
            }
          }
        }
      }
    }
  });

  desenharChart('chart-dias', {
    type: 'bar',
    data: {
      labels: dias.map(d => d.label),
      datasets: [{ label: 'Faturamento', data: dias.map(d => d.valor), backgroundColor: '#e07b12', borderRadius: 6 }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + money(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(34,48,60,.6)' }, ticks: { callback: v => 'R$ ' + v } }
      }
    }
  });
};

function valorFixo(nome) {
  const c = getFixos().find(x => x.nome === nome);
  return c ? c.valor : 0;
}

function kpi(label, valor, rodape, estado = '') {
  return `<div class="kpi ${estado}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${valor}</div>
    <div class="kpi-foot">${rodape}</div>
  </div>`;
}

function salvarMeta() {
  const v = Number(document.getElementById('meta-input').value);
  if (!v || v <= 0) return toast('Informe uma meta maior que zero.', 'error');
  DB.set('meta', v);
  toast('Meta salva.');
  refresh();
}

/* ------------------------------------------------------------
   8. CENTRAL DE PEDIDOS (dedução automática de estoque)
------------------------------------------------------------ */
RENDER.pedidos = function () {
  const hojeISO = iso(hoje());
  const doDia = getPedidos().filter(p => p.data === hojeISO).sort((a, b) => b.id - a.id);
  const totalDia = doDia.reduce((s, p) => s + p.total, 0);

  document.getElementById('pedidos').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Pedidos de hoje', doDia.length, hoje().toLocaleDateString('pt-BR'))}
      ${kpi('Faturamento de hoje', money(totalDia), doDia.length ? `Ticket de ${money(totalDia / doDia.length)}` : 'Nenhum pedido lançado')}
      ${kpi('Pizzas produzidas', doDia.reduce((s, p) => s + p.itens.reduce((x, i) => x + i.quantidade, 0), 0), 'Baixa automática pela ficha técnica')}
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Lançar pedido</h3>
      <p class="card-sub">Ao confirmar, os insumos da ficha técnica saem do estoque automaticamente</p>
      <div class="form-grid">
        <div class="field">
          <label for="ped-sabor">Sabor</label>
          <select id="ped-sabor">${SABORES.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="ped-tamanho">Tamanho</label>
          <select id="ped-tamanho">
            <option value="P">P (${pct(70)} da gramatura)</option>
            <option value="M" selected>M (padrão)</option>
            <option value="G">G (${pct(135)} da gramatura)</option>
          </select>
        </div>
        <div class="field">
          <label for="ped-qtd">Quantidade</label>
          <input type="number" id="ped-qtd" value="1" min="1" max="20">
        </div>
        <div class="field">
          <label for="ped-bairro">Bairro de entrega</label>
          <select id="ped-bairro">${BAIRROS.map(b => `<option>${b.nome}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="ped-canal">Canal</label>
          <select id="ped-canal">${CANAIS.map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        <button class="btn" onclick="lancarPedido()">Lançar pedido</button>
      </div>
    </div>

    <div class="section-title">
      <h2>Fichas técnicas</h2>
      <p>Gramatura do tamanho M — P e G aplicam os fatores 0,70 e 1,35</p>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Sabor</th><th>Composição (tamanho M)</th><th class="num">Custo M</th><th class="num">Preço M</th><th class="num">Margem bruta</th></tr>
          </thead>
          <tbody>
            ${SABORES.map(s => {
    const c = custoItem(s.id, 'M');
    const marg = ((s.precoM - c) / s.precoM) * 100;
    return `<tr>
                <td><strong>${s.nome}</strong></td>
                <td>${s.ficha.map(i => `${insumoPorId(i.insumo).nome} ${i.insumo === 'caixa' ? i.q + ' un' : (i.q * 1000) + ' g'}`).join(' · ')}</td>
                <td class="num">${money(c)}</td>
                <td class="num">${money(s.precoM)}</td>
                <td class="num ${marg > 55 ? 'up' : ''}">${pct(marg)}</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-title"><h2>Pedidos de hoje</h2></div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Itens</th><th>Bairro</th><th>Canal</th><th class="num">Total</th></tr></thead>
          <tbody>
            ${doDia.length ? doDia.map(p => `<tr>
              <td>${p.id}</td>
              <td>${p.itens.map(i => `${i.quantidade}× ${saborPorId(i.sabor).nome} ${i.tamanho}`).join(', ')}</td>
              <td>${p.bairro}</td>
              <td>${p.canal}</td>
              <td class="num">${money(p.total)}</td>
            </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Nenhum pedido hoje. Lance o primeiro no formulário acima.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

function lancarPedido() {
  const saborId = document.getElementById('ped-sabor').value;
  const tamanho = document.getElementById('ped-tamanho').value;
  const quantidade = Number(document.getElementById('ped-qtd').value);
  const bairro = document.getElementById('ped-bairro').value;
  const canal = document.getElementById('ped-canal').value;

  if (!quantidade || quantidade < 1) return toast('Informe uma quantidade válida.', 'error');

  const sabor = saborPorId(saborId);
  const insumos = getInsumos();
  const fator = TAMANHOS[tamanho].fator;

  /* Confere o estoque antes de gravar */
  const faltando = [];
  sabor.ficha.forEach(ing => {
    const necessario = ing.q * (ing.insumo === 'caixa' ? 1 : fator) * quantidade;
    const ins = insumos.find(i => i.id === ing.insumo);
    if (!ins || ins.estoque < necessario) {
      faltando.push(`${insumoPorId(ing.insumo).nome} (precisa de ${qtd(necessario)} ${insumoPorId(ing.insumo).un}, há ${qtd(ins ? ins.estoque : 0)})`);
    }
  });
  if (faltando.length) {
    return toast('Estoque insuficiente: ' + faltando.join('; ') + '. Lance a compra antes de produzir.', 'error');
  }

  /* Baixa de estoque pela ficha técnica */
  sabor.ficha.forEach(ing => {
    const ins = insumos.find(i => i.id === ing.insumo);
    ins.estoque = Number((ins.estoque - ing.q * (ing.insumo === 'caixa' ? 1 : fator) * quantidade).toFixed(3));
  });
  DB.set('insumos', insumos);

  const preco = Number((sabor.precoM * TAMANHOS[tamanho].preco).toFixed(2));
  const pedidos = getPedidos();
  pedidos.push({
    id: (pedidos.reduce((m, p) => Math.max(m, p.id), 1000)) + 1,
    data: iso(hoje()),
    bairro, canal,
    itens: [{ sabor: saborId, tamanho, quantidade, preco }],
    total: Number((preco * quantidade).toFixed(2))
  });
  DB.set('pedidos', pedidos);

  toast(`Pedido lançado: ${quantidade}× ${sabor.nome} ${tamanho}. Estoque atualizado.`);
  refresh();
}

/* ------------------------------------------------------------
   9. LANÇAR COMPRAS
------------------------------------------------------------ */
RENDER.compras = function () {
  const compras = getCompras().sort((a, b) => b.data.localeCompare(a.data));
  const mes = compras.filter(c => mesRef(c.data) === mesRef(iso(hoje())));

  document.getElementById('compras').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Compras no mês', money(mes.reduce((s, c) => s + c.total, 0)), `${mes.length} lançamentos`)}
      ${kpi('Notas pendentes', compras.filter(c => c.nf === 'pendente').length, 'Aguardando conferência')}
      ${kpi('Último lançamento', compras.length ? brDate(compras[0].data) : '—', compras.length ? compras[0].fornecedor : 'Sem compras')}
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Nova compra</h3>
      <p class="card-sub">Entra no estoque e alimenta o histórico de preços usado no módulo de inflação</p>
      <div class="form-grid">
        <div class="field">
          <label for="comp-insumo">Insumo</label>
          <select id="comp-insumo">${getInsumos().map(i => `<option value="${i.id}">${i.nome} (${i.un})</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="comp-forn">Fornecedor</label>
          <input type="text" id="comp-forn" placeholder="Ex.: Atacadão Sergipe">
        </div>
        <div class="field">
          <label for="comp-qtd">Quantidade</label>
          <input type="number" id="comp-qtd" step="0.01" min="0.01" placeholder="0,00">
        </div>
        <div class="field">
          <label for="comp-total">Valor total da nota (R$)</label>
          <input type="number" id="comp-total" step="0.01" min="0.01" placeholder="0,00">
        </div>
        <div class="field">
          <label for="comp-data">Data</label>
          <input type="date" id="comp-data" value="${iso(hoje())}">
        </div>
        <button class="btn" onclick="lancarCompra()">Registrar compra</button>
      </div>
    </div>

    <div class="section-title"><h2>Compras lançadas</h2><p>Aprove a nota após conferir a mercadoria recebida</p></div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Insumo</th><th>Fornecedor</th><th class="num">Qtd</th><th class="num">Preço unit.</th><th class="num">Total</th><th>Nota</th><th></th></tr></thead>
          <tbody>
            ${compras.length ? compras.map(c => `<tr>
              <td>${brDate(c.data)}</td>
              <td>${insumoPorId(c.insumo).nome}</td>
              <td>${c.fornecedor}</td>
              <td class="num">${qtd(c.quantidade)} ${insumoPorId(c.insumo).un}</td>
              <td class="num">${money(c.total / c.quantidade)}</td>
              <td class="num">${money(c.total)}</td>
              <td><span class="badge ${c.nf === 'aprovada' ? 'ok' : 'warn'}">${c.nf === 'aprovada' ? 'Aprovada' : 'Pendente'}</span></td>
              <td class="num">${c.nf === 'pendente' ? `<button class="btn small" onclick="aprovarNota(${c.id})">Aprovar</button>` : ''}</td>
            </tr>`).join('') : '<tr><td colspan="8" class="empty-state">Nenhuma compra lançada.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

function lancarCompra() {
  const insumoId = document.getElementById('comp-insumo').value;
  const fornecedor = document.getElementById('comp-forn').value.trim() || 'Fornecedor não informado';
  const quantidade = Number(document.getElementById('comp-qtd').value);
  const total = Number(document.getElementById('comp-total').value);
  const data = document.getElementById('comp-data').value || iso(hoje());

  if (!quantidade || quantidade <= 0) return toast('Informe a quantidade comprada.', 'error');
  if (!total || total <= 0) return toast('Informe o valor total da nota.', 'error');

  const precoUnit = Number((total / quantidade).toFixed(2));

  const compras = getCompras();
  compras.push({
    id: compras.reduce((m, c) => Math.max(m, c.id), 500) + 1,
    data, insumo: insumoId, fornecedor, quantidade, total, nf: 'pendente'
  });
  DB.set('compras', compras);

  const insumos = getInsumos();
  const ins = insumos.find(i => i.id === insumoId);
  ins.estoque = Number((ins.estoque + quantidade).toFixed(3));
  const custoAnterior = ins.custo;
  ins.custo = precoUnit;
  DB.set('insumos', insumos);

  const hist = getHistorico();
  hist.push({ insumo: insumoId, data, preco: precoUnit, fornecedor });
  DB.set('historico', hist);

  const dif = custoAnterior ? ((precoUnit - custoAnterior) / custoAnterior) * 100 : 0;
  toast(`Compra registrada. ${ins.nome} a ${money(precoUnit)}/${ins.un} (${dif >= 0 ? '+' : ''}${pct(dif)} vs. último preço).`);
  refresh();
}

function aprovarNota(id) {
  const compras = getCompras();
  const c = compras.find(x => x.id === id);
  if (!c) return;
  c.nf = 'aprovada';
  DB.set('compras', compras);
  toast('Nota aprovada.');
  refresh();
}

/* ------------------------------------------------------------
   10. ESTOQUE & INSUMOS
------------------------------------------------------------ */
RENDER.estoque = function () {
  const insumos = getInsumos();
  const valorParado = insumos.reduce((s, i) => s + i.estoque * i.custo, 0);
  const criticos = insumos.filter(i => i.estoque <= i.minimo);

  document.getElementById('estoque').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Valor em estoque', money(valorParado), `${insumos.length} insumos cadastrados`)}
      ${kpi('Itens críticos', criticos.length, criticos.length ? criticos.map(i => i.nome).join(', ') : 'Tudo acima do mínimo', criticos.length ? 'bad' : 'good')}
      ${kpi('Cobertura da muçarela', coberturaDias('mussarela'), 'Dias no ritmo médio das últimas 4 semanas')}
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Ajuste rápido</h3>
      <p class="card-sub">Use para correções de inventário — compras devem ser lançadas em Lançar Compras</p>
      <div class="form-grid">
        <div class="field">
          <label for="est-insumo">Insumo</label>
          <select id="est-insumo">${insumos.map(i => `<option value="${i.id}">${i.nome}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="est-qtd">Quantidade contada</label>
          <input type="number" id="est-qtd" step="0.01" min="0" placeholder="0,00">
        </div>
        <div class="field">
          <label for="est-min">Novo estoque mínimo</label>
          <input type="number" id="est-min" step="0.01" min="0" placeholder="opcional">
        </div>
        <button class="btn" onclick="ajustarEstoque()">Atualizar estoque</button>
      </div>
    </div>

    <div class="section-title"><h2>Posição do estoque</h2></div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Insumo</th><th>Categoria</th><th class="num">Em estoque</th><th class="num">Mínimo</th><th>Nível</th><th class="num">Custo atual</th><th class="num">Valor total</th><th>Situação</th></tr></thead>
          <tbody>
            ${insumos.map(i => {
    const nivel = i.minimo ? Math.min(100, (i.estoque / (i.minimo * 2)) * 100) : 100;
    const classe = i.estoque <= i.minimo ? 'bad' : i.estoque <= i.minimo * 1.3 ? 'warn' : '';
    return `<tr>
                <td><strong>${i.nome}</strong></td>
                <td>${i.categoria}</td>
                <td class="num">${qtd(i.estoque)} ${i.un}</td>
                <td class="num">${qtd(i.minimo)} ${i.un}</td>
                <td><div class="bar ${classe}"><span style="width:${nivel}%"></span></div></td>
                <td class="num">${money(i.custo)}</td>
                <td class="num">${money(i.estoque * i.custo)}</td>
                <td><span class="badge ${classe === 'bad' ? 'bad' : classe === 'warn' ? 'warn' : 'ok'}">${classe === 'bad' ? 'Repor hoje' : classe === 'warn' ? 'Atenção' : 'Saudável'}</span></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

function coberturaDias(insumoId) {
  const ins = insumoPorId(insumoId);
  const pedidos = pedidosNoPeriodo(28);
  let consumo = 0;
  pedidos.forEach(p => p.itens.forEach(i => {
    const ing = saborPorId(i.sabor).ficha.find(f => f.insumo === insumoId);
    if (ing) consumo += ing.q * TAMANHOS[i.tamanho].fator * i.quantidade;
  }));
  const diario = consumo / 28;
  if (!diario) return '—';
  return Math.floor(ins.estoque / diario) + ' dias';
}

function ajustarEstoque() {
  const id = document.getElementById('est-insumo').value;
  const nova = document.getElementById('est-qtd').value;
  const min = document.getElementById('est-min').value;
  const insumos = getInsumos();
  const ins = insumos.find(i => i.id === id);
  if (nova === '' && min === '') return toast('Informe a quantidade contada ou o novo mínimo.', 'error');
  if (nova !== '') ins.estoque = Number(nova);
  if (min !== '') ins.minimo = Number(min);
  DB.set('insumos', insumos);
  toast(`${ins.nome} atualizado.`);
  refresh();
}

/* ------------------------------------------------------------
   11. CUSTOS FIXOS, CONTAS A PAGAR E DRE
------------------------------------------------------------ */
RENDER.custos = function () {
  const mes = financeiro(pedidosDoMes());
  const fixos = getFixos();
  const contas = getContas().sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const hojeISO = iso(hoje());

  document.getElementById('custos').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Receita do mês', money(mes.receita), `${mes.pedidos} pedidos`)}
      ${kpi('Custos fixos', money(mes.fixos), `${fixos.length} contas recorrentes`)}
      ${kpi('Custos variáveis', money(mes.cmv + mes.taxaCanal + mes.taxaCartao), 'CMV, taxas de app e maquininha')}
      ${kpi('Resultado do mês', money(mes.lucro), `Margem de ${pct(mes.margem)}`, mes.lucro > 0 ? 'good' : 'bad')}
    </div>

    <div class="section-title">
      <h2>DRE gerencial do mês</h2>
      <p><button class="btn small" onclick="exportarDRE()">Exportar DRE (.XLSX)</button></p>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Linha</th><th class="num">Valor</th><th class="num">% da receita</th></tr></thead>
          <tbody>
            ${linhaDRE('Receita bruta de vendas', mes.receita, mes.receita)}
            ${linhaDRE('(−) CMV — insumos consumidos', -mes.cmv, mes.receita)}
            ${linhaDRE('(−) Taxas de delivery e marketplace', -mes.taxaCanal, mes.receita)}
            ${linhaDRE('(−) Taxa de maquininha', -mes.taxaCartao, mes.receita)}
            ${linhaDRE('= Margem de contribuição', mes.receita - mes.cmv - mes.taxaCanal - mes.taxaCartao, mes.receita)}
            ${fixos.map(f => linhaDRE('(−) ' + f.nome, -f.valor, mes.receita)).join('')}
            ${linhaDRE('= Lucro líquido', mes.lucro, mes.receita)}
          </tbody>
        </table>
      </div>
    </div>

    <div class="grid two-col" style="margin-top:22px">
      <div class="card">
        <h3>Previsão de pagamentos</h3>
        <p class="card-sub">Contas em aberto ordenadas pelo vencimento</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Conta</th><th>Vencimento</th><th class="num">Valor</th><th>Prazo</th><th></th></tr></thead>
            <tbody>
              ${contas.filter(c => c.status === 'aberto').map(c => {
    const d = diasEntre(hojeISO, c.vencimento);
    const est = d < 0 ? 'bad' : d <= 3 ? 'warn' : 'ok';
    const txt = d < 0 ? `Vencida há ${Math.abs(d)} dia(s)` : d === 0 ? 'Vence hoje' : `Em ${d} dia(s)`;
    return `<tr>
                  <td>${c.descricao}</td>
                  <td>${brDate(c.vencimento)}</td>
                  <td class="num">${money(c.valor)}</td>
                  <td><span class="badge ${est}">${txt}</span></td>
                  <td class="num"><button class="btn small ghost" onclick="pagarConta(${c.id})">Dar baixa</button></td>
                </tr>`;
  }).join('') || '<tr><td colspan="5" class="empty-state">Nenhuma conta em aberto.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="form-grid" style="margin-top:18px">
          <div class="field"><label for="conta-desc">Nova conta</label><input type="text" id="conta-desc" placeholder="Descrição"></div>
          <div class="field"><label for="conta-valor">Valor (R$)</label><input type="number" id="conta-valor" step="0.01"></div>
          <div class="field"><label for="conta-venc">Vencimento</label><input type="date" id="conta-venc" value="${hojeISO}"></div>
          <button class="btn" onclick="adicionarConta()">Adicionar conta</button>
        </div>
      </div>

      <div class="card">
        <h3>Custos fixos do mês</h3>
        <p class="card-sub">Clique no valor para editar e recalcular o DRE</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Conta</th><th>Categoria</th><th class="num">Valor</th></tr></thead>
            <tbody>
              ${fixos.map(f => `<tr>
                <td>${f.nome}</td>
                <td>${f.categoria}</td>
                <td class="num"><input type="number" step="0.01" value="${f.valor}" style="width:110px;text-align:right" onchange="editarFixo(${f.id}, this.value)"></td>
              </tr>`).join('')}
              <tr><td><strong>Total</strong></td><td></td><td class="num"><strong>${money(mes.fixos)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};

function linhaDRE(nome, valor, receita) {
  const p = receita ? (valor / receita) * 100 : 0;
  const destaque = nome.startsWith('=') || nome.startsWith('Receita');
  return `<tr>
    <td>${destaque ? `<strong>${nome}</strong>` : nome}</td>
    <td class="num ${valor < 0 ? 'down' : destaque ? 'up' : ''}">${money(valor)}</td>
    <td class="num">${pct(p)}</td>
  </tr>`;
}

function editarFixo(id, valor) {
  const fixos = getFixos();
  const f = fixos.find(x => x.id === id);
  f.valor = Number(valor) || 0;
  DB.set('custosFixos', fixos);
  toast(`${f.nome} atualizado para ${money(f.valor)}.`);
  refresh();
}

function pagarConta(id) {
  const contas = getContas();
  const c = contas.find(x => x.id === id);
  c.status = 'pago';
  DB.set('contas', contas);
  toast(`Baixa registrada: ${c.descricao}.`);
  refresh();
}

function adicionarConta() {
  const descricao = document.getElementById('conta-desc').value.trim();
  const valor = Number(document.getElementById('conta-valor').value);
  const vencimento = document.getElementById('conta-venc').value;
  if (!descricao) return toast('Descreva a conta a pagar.', 'error');
  if (!valor || valor <= 0) return toast('Informe o valor da conta.', 'error');
  const contas = getContas();
  contas.push({ id: contas.reduce((m, c) => Math.max(m, c.id), 0) + 1, descricao, valor, vencimento, status: 'aberto' });
  DB.set('contas', contas);
  toast('Conta adicionada à previsão de pagamentos.');
  refresh();
}

/* ------------------------------------------------------------
   12. INFLAÇÃO DE INSUMOS & FORNECEDORES
------------------------------------------------------------ */
RENDER.inflacao = function () {
  const insumos = getInsumos();
  const hist = getHistorico();

  /* Meses dos últimos 6 períodos */
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const chave = ['mussarela', 'calabresa', 'trigo', 'catupiry'];
  const cores = { mussarela: '#e07b12', calabresa: '#ef5a5a', trigo: '#3ec98a', catupiry: '#5aa9e6' };

  const series = chave.map(id => ({
    label: insumoPorId(id).nome,
    data: meses.map(m => {
      const regs = hist.filter(h => h.insumo === id && mesRef(h.data) === m);
      return regs.length ? Number((regs.reduce((s, r) => s + r.preco, 0) / regs.length).toFixed(2)) : null;
    }),
    borderColor: cores[id],
    backgroundColor: cores[id],
    tension: .32,
    spanGaps: true,
    pointRadius: 3
  }));

  const inflacaoCesta = (() => {
    const inicio = series.reduce((s, x) => s + (x.data.find(v => v !== null) || 0), 0);
    const fim = series.reduce((s, x) => s + ([...x.data].reverse().find(v => v !== null) || 0), 0);
    return inicio ? ((fim - inicio) / inicio) * 100 : 0;
  })();

  const fornecedores = getFornecedores();

  document.getElementById('inflacao').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Inflação da cesta', pct(inflacaoCesta), 'Muçarela, calabresa, trigo e requeijão em 6 meses', inflacaoCesta > 8 ? 'bad' : inflacaoCesta > 4 ? 'warn' : 'good')}
      ${kpi('Maior alta em 30 dias', maiorAlta().texto, maiorAlta().sub, 'warn')}
      ${kpi('Economia potencial', money(economiaPotencial()), 'Trocando para o menor preço local do mês')}
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Histórico de preço por unidade</h3>
      <p class="card-sub">Média mensal paga em cada insumo nos últimos 6 meses (R$/kg ou R$/un)</p>
      <div class="chart-box tall"><canvas id="chart-inflacao"></canvas></div>
    </div>

    <div class="section-title">
      <h2>Variação por insumo</h2>
      <p><button class="btn small" onclick="exportarInflacao()">Exportar relatório de inflação (.XLSX)</button></p>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Insumo</th><th class="num">Preço atual</th><th class="num">Variação 30 dias</th><th class="num">Variação 6 meses</th><th>Leitura</th></tr></thead>
          <tbody>
            ${insumos.map(i => {
    const v30 = variacao30(i.id);
    const v6 = variacao6m(i.id);
    return `<tr>
                <td><strong>${i.nome}</strong></td>
                <td class="num">${money(i.custo)}/${i.un}</td>
                <td class="num ${v30 > 0 ? 'down' : 'up'}">${v30 >= 0 ? '+' : ''}${pct(v30)}</td>
                <td class="num ${v6 > 0 ? 'down' : 'up'}">${v6 >= 0 ? '+' : ''}${pct(v6)}</td>
                <td><span class="badge ${v30 > 4 ? 'bad' : v30 > 1.5 ? 'warn' : 'ok'}">${v30 > 4 ? 'Renegociar' : v30 > 1.5 ? 'Monitorar' : 'Estável'}</span></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-title">
      <h2>Pesquisa de fornecedores da cidade</h2>
      <p>Comparação entre o preço praticado no seu sistema e a cotação local</p>
    </div>
    <div class="card">
      <div class="form-grid" style="margin-bottom:18px">
        <div class="field">
          <label for="forn-insumo">Insumo</label>
          <select id="forn-insumo">${insumos.map(i => `<option value="${i.id}">${i.nome}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="forn-nome">Fornecedor</label><input type="text" id="forn-nome" placeholder="Nome"></div>
        <div class="field"><label for="forn-preco">Preço cotado (R$)</label><input type="number" id="forn-preco" step="0.01"></div>
        <div class="field"><label for="forn-contato">Contato</label><input type="text" id="forn-contato" placeholder="(79) 0000-0000"></div>
        <button class="btn" onclick="adicionarCotacao()">Salvar cotação</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Insumo</th><th>Fornecedor</th><th>Contato</th><th>Prazo</th><th class="num">Preço cotado</th><th class="num">Seu preço</th><th class="num">Diferença</th></tr></thead>
          <tbody>
            ${fornecedores.sort((a, b) => a.insumo.localeCompare(b.insumo) || a.preco - b.preco).map(f => {
    const meu = insumoPorId(f.insumo).custo;
    const dif = meu ? ((f.preco - meu) / meu) * 100 : 0;
    return `<tr>
                <td>${insumoPorId(f.insumo).nome}</td>
                <td><strong>${f.fornecedor}</strong></td>
                <td>${f.contato || '—'}</td>
                <td>${f.prazo || '—'}</td>
                <td class="num">${money(f.preco)}</td>
                <td class="num">${money(meu)}</td>
                <td class="num ${dif < 0 ? 'up' : 'down'}">${dif >= 0 ? '+' : ''}${pct(dif)}</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  desenharChart('chart-inflacao', {
    type: 'line',
    data: { labels: meses.map(nomeMes), datasets: series },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${money(c.parsed.y)}` } }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(34,48,60,.6)' }, ticks: { callback: v => 'R$ ' + v } }
      }
    }
  });
};

function variacao6m(insumoId) {
  const hist = getHistorico().filter(h => h.insumo === insumoId).sort((a, b) => a.data.localeCompare(b.data));
  if (hist.length < 2) return 0;
  return ((hist[hist.length - 1].preco - hist[0].preco) / hist[0].preco) * 100;
}

function maiorAlta() {
  let melhor = { id: null, v: -999 };
  getInsumos().forEach(i => {
    const v = variacao30(i.id);
    if (v > melhor.v) melhor = { id: i.id, v };
  });
  if (!melhor.id) return { texto: '—', sub: 'Sem histórico' };
  return { texto: `+${pct(melhor.v)}`, sub: `${insumoPorId(melhor.id).nome} nos últimos 30 dias` };
}

function economiaPotencial() {
  const consumo = {};
  pedidosNoPeriodo(30).forEach(p => p.itens.forEach(i => {
    saborPorId(i.sabor).ficha.forEach(ing => {
      const q = ing.q * (ing.insumo === 'caixa' ? 1 : TAMANHOS[i.tamanho].fator) * i.quantidade;
      consumo[ing.insumo] = (consumo[ing.insumo] || 0) + q;
    });
  }));
  let economia = 0;
  Object.entries(consumo).forEach(([id, q]) => {
    const cotacoes = getFornecedores().filter(f => f.insumo === id);
    if (!cotacoes.length) return;
    const menor = Math.min(...cotacoes.map(c => c.preco));
    const meu = insumoPorId(id).custo;
    if (menor < meu) economia += (meu - menor) * q;
  });
  return economia;
}

function adicionarCotacao() {
  const insumo = document.getElementById('forn-insumo').value;
  const fornecedor = document.getElementById('forn-nome').value.trim();
  const preco = Number(document.getElementById('forn-preco').value);
  const contato = document.getElementById('forn-contato').value.trim();
  if (!fornecedor) return toast('Informe o nome do fornecedor.', 'error');
  if (!preco || preco <= 0) return toast('Informe o preço cotado.', 'error');
  const lista = getFornecedores();
  lista.push({ insumo, fornecedor, preco, contato, prazo: '—' });
  DB.set('fornecedores', lista);
  toast('Cotação salva na pesquisa de fornecedores.');
  refresh();
}

/* ------------------------------------------------------------
   13. MAPA DE CALOR DE ENTREGAS
------------------------------------------------------------ */
RENDER.mapa = function () {
  const pedidos = pedidosNoPeriodo(30);
  const contagem = {};
  const receitaBairro = {};
  pedidos.forEach(p => {
    contagem[p.bairro] = (contagem[p.bairro] || 0) + 1;
    receitaBairro[p.bairro] = (receitaBairro[p.bairro] || 0) + p.total;
  });
  const max = Math.max(1, ...Object.values(contagem));
  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

  /* Monta a malha 6x6 */
  const celulas = [];
  for (let r = 1; r <= 6; r++) {
    for (let c = 1; c <= 6; c++) {
      const b = BAIRROS.find(x => x.row === r && x.col === c);
      if (!b) { celulas.push('<div class="heat-cell empty"></div>'); continue; }
      const n = contagem[b.nome] || 0;
      const intensidade = n / max;
      const bg = `rgba(224,123,18,${(0.10 + intensidade * 0.85).toFixed(2)})`;
      celulas.push(`<div class="heat-cell" style="background:${bg}" title="${b.nome}: ${n} pedidos · ${money(receitaBairro[b.nome] || 0)}">
        <span>${b.nome}</span><strong>${n}</strong>
      </div>`);
    }
  }

  document.getElementById('mapa').innerHTML = `
    <div class="grid kpi-grid">
      ${kpi('Bairro líder', ranking.length ? ranking[0][0] : '—', ranking.length ? `${ranking[0][1]} pedidos em 30 dias` : 'Sem dados')}
      ${kpi('Bairros atendidos', ranking.length, 'Com pelo menos um pedido no período')}
      ${kpi('Concentração', ranking.length ? pct((ranking.slice(0, 3).reduce((s, r) => s + r[1], 0) / pedidos.length) * 100) : '—', 'Participação dos 3 maiores bairros')}
    </div>

    <div class="grid two-col" style="margin-top:16px">
      <div class="card">
        <h3>Malha de entregas</h3>
        <p class="card-sub">Últimos 30 dias · quanto mais intensa a cor, maior o volume de pedidos</p>
        <div class="heat-grid">${celulas.join('')}</div>
        <div class="heat-legend">
          <span>Menos pedidos</span>
          <i style="background:rgba(224,123,18,.15)"></i>
          <i style="background:rgba(224,123,18,.45)"></i>
          <i style="background:rgba(224,123,18,.75)"></i>
          <i style="background:rgba(224,123,18,.95)"></i>
          <span>Mais pedidos</span>
        </div>
      </div>
      <div class="card">
        <h3>Onde investir em marketing</h3>
        <p class="card-sub">Volume e faturamento por bairro no período</p>
        <div class="table-wrap">
          <table style="min-width:auto">
            <thead><tr><th>Bairro</th><th class="num">Pedidos</th><th class="num">Faturamento</th><th class="num">Ticket</th></tr></thead>
            <tbody>
              ${ranking.map(([b, n]) => `<tr>
                <td>${b}</td>
                <td class="num">${n}</td>
                <td class="num">${money(receitaBairro[b])}</td>
                <td class="num">${money(receitaBairro[b] / n)}</td>
              </tr>`).join('') || '<tr><td colspan="4" class="empty-state">Sem entregas no período.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Volume por canal</h3>
      <p class="card-sub">Últimos 30 dias — base para negociar comissões e decidir onde crescer</p>
      <div class="chart-box"><canvas id="chart-canais"></canvas></div>
    </div>
  `;

  const porCanal = {};
  pedidos.forEach(p => { porCanal[p.canal] = (porCanal[p.canal] || 0) + p.total; });
  desenharChart('chart-canais', {
    type: 'bar',
    data: {
      labels: Object.keys(porCanal),
      datasets: [{ data: Object.values(porCanal), backgroundColor: ['#e07b12', '#ef5a5a', '#3ec98a'], borderRadius: 6 }]
    },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + money(c.parsed.x) } } },
      scales: { x: { grid: { color: 'rgba(34,48,60,.6)' }, ticks: { callback: v => 'R$ ' + v } }, y: { grid: { display: false } } }
    }
  });
};

/* ------------------------------------------------------------
   14. EXPORTAÇÕES (SheetJS)
------------------------------------------------------------ */
function baixar(wb, nome) {
  XLSX.writeFile(wb, `${nome}-${iso(hoje())}.xlsx`);
  toast('Arquivo gerado. Confira a pasta de downloads.');
}

function exportarExcel() {
  const wb = XLSX.utils.book_new();
  const mes = financeiro(pedidosDoMes());

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getPedidos().map(p => ({
      Pedido: p.id, Data: brDate(p.data), Bairro: p.bairro, Canal: p.canal,
      Itens: p.itens.map(i => `${i.quantidade}x ${saborPorId(i.sabor).nome} ${i.tamanho}`).join(', '),
      Total: p.total,
      'Custo ficha técnica': Number(p.itens.reduce((s, i) => s + custoItem(i.sabor, i.tamanho) * i.quantidade, 0).toFixed(2))
    }))), 'Pedidos');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getCompras().map(c => ({
      Nota: c.id, Data: brDate(c.data), Insumo: insumoPorId(c.insumo).nome, Fornecedor: c.fornecedor,
      Quantidade: c.quantidade, Unidade: insumoPorId(c.insumo).un,
      'Preço unitário': Number((c.total / c.quantidade).toFixed(2)), Total: c.total, Situação: c.nf
    }))), 'Compras');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getInsumos().map(i => ({
      Insumo: i.nome, Categoria: i.categoria, Unidade: i.un, Estoque: i.estoque, Mínimo: i.minimo,
      'Custo atual': i.custo, 'Valor em estoque': Number((i.estoque * i.custo).toFixed(2)),
      'Variação 30d (%)': Number(variacao30(i.id).toFixed(2))
    }))), 'Estoque');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Indicador: 'Receita bruta do mês', Valor: Number(mes.receita.toFixed(2)) },
    { Indicador: 'CMV', Valor: Number(mes.cmv.toFixed(2)) },
    { Indicador: 'CMV (%)', Valor: Number(mes.cmvPct.toFixed(2)) },
    { Indicador: 'Taxas de delivery e apps', Valor: Number(mes.taxaCanal.toFixed(2)) },
    { Indicador: 'Taxa de maquininha', Valor: Number(mes.taxaCartao.toFixed(2)) },
    { Indicador: 'Custos fixos', Valor: Number(mes.fixos.toFixed(2)) },
    { Indicador: 'Lucro líquido', Valor: Number(mes.lucro.toFixed(2)) },
    { Indicador: 'Ticket médio', Valor: Number(mes.ticket.toFixed(2)) }
  ]), 'Resumo BI');

  baixar(wb, 'fratella-gestao-completa');
}

function exportarDRE() {
  const mes = financeiro(pedidosDoMes());
  const linhas = [
    { Linha: 'Receita bruta de vendas', Valor: mes.receita },
    { Linha: '(-) CMV', Valor: -mes.cmv },
    { Linha: '(-) Taxas de delivery e marketplace', Valor: -mes.taxaCanal },
    { Linha: '(-) Taxa de maquininha', Valor: -mes.taxaCartao },
    { Linha: '= Margem de contribuição', Valor: mes.receita - mes.cmv - mes.taxaCanal - mes.taxaCartao },
    ...getFixos().map(f => ({ Linha: '(-) ' + f.nome, Valor: -f.valor })),
    { Linha: '= Lucro líquido', Valor: mes.lucro }
  ].map(l => ({ ...l, Valor: Number(l.Valor.toFixed(2)), '% da receita': mes.receita ? Number((l.Valor / mes.receita * 100).toFixed(2)) : 0 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'DRE');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getContas().map(c => ({
      Conta: c.descricao, Vencimento: brDate(c.vencimento), Valor: c.valor,
      'Dias até vencer': diasEntre(iso(hoje()), c.vencimento), Situação: c.status
    }))), 'Contas a pagar');
  baixar(wb, 'fratella-dre');
}

function exportarInflacao() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getInsumos().map(i => ({
      Insumo: i.nome, Unidade: i.un, 'Preço atual': i.custo,
      'Variação 30 dias (%)': Number(variacao30(i.id).toFixed(2)),
      'Variação 6 meses (%)': Number(variacao6m(i.id).toFixed(2))
    }))), 'Resumo da inflação');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getHistorico().sort((a, b) => a.data.localeCompare(b.data)).map(h => ({
      Data: brDate(h.data), Insumo: insumoPorId(h.insumo).nome, 'Preço unitário': h.preco, Fornecedor: h.fornecedor || '—'
    }))), 'Histórico de preços');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    getFornecedores().map(f => ({
      Insumo: insumoPorId(f.insumo).nome, Fornecedor: f.fornecedor, Contato: f.contato || '—',
      'Preço cotado': f.preco, 'Preço do sistema': insumoPorId(f.insumo).custo,
      'Diferença (%)': Number((((f.preco - insumoPorId(f.insumo).custo) / insumoPorId(f.insumo).custo) * 100).toFixed(2))
    }))), 'Fornecedores locais');

  baixar(wb, 'fratella-inflacao-insumos');
}

/* ------------------------------------------------------------
   15. BOOT
------------------------------------------------------------ */
seed();
const sessaoSalva = DB.get('sessao', null);
if (sessaoSalva) iniciarSessao(sessaoSalva);