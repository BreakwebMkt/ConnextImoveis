const WHATSAPP_NUMBER = '5511999999999';

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
const buyGrid = document.getElementById('buyGrid');
const buyCount = document.getElementById('buyCount');
const buyEmpty = document.getElementById('buyEmpty');
const filterForm = document.getElementById('filterForm');
const limparBtn = document.getElementById('limparBtn');
const fBusca = document.getElementById('fBusca');
const fZona = document.getElementById('fZona');
const fQuartos = document.getElementById('fQuartos');
const fMetragem = document.getElementById('fMetragem');

let imoveis = [];

function setMenuState(open) {
  menu.classList.toggle('open', open);
  menuToggle.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('nav-open', open);
}

menuToggle?.addEventListener('click', () => setMenuState(!menu.classList.contains('open')));

document.addEventListener('click', (event) => {
  if (!menu.classList.contains('open')) {
    return;
  }
  const alvo = event.target;
  if (!menu.contains(alvo) && !menuToggle.contains(alvo)) {
    setMenuState(false);
  }
});

document.querySelectorAll('.menu a').forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

function parseMinQuartos(texto) {
  const match = String(texto).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseMinMetragem(texto) {
  const match = String(texto).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function matchMetragem(filtro, valor) {
  const min = parseMinMetragem(valor);

  if (filtro === 'ate-70') {
    return min <= 70;
  }
  if (filtro === '71-120') {
    return min >= 71 && min <= 120;
  }
  if (filtro === '121+') {
    return min >= 121;
  }
  return true;
}

function criarCard(imovel) {
  const el = document.createElement('article');
  el.className = 'buy-card';
  el.innerHTML = `
    <a class="buy-card-image" href="./empreendimento.html?id=${encodeURIComponent(imovel.id)}">
      <img src="${imovel.imagem}" alt="${imovel.alt}" />
    </a>
    <div class="buy-card-body">
      <div class="buy-card-top">
        <span class="chip">${imovel.zona}</span>
        <span class="mini-code">Cód. ${imovel.codigo}</span>
      </div>
      <h3>${imovel.nome}</h3>
      <p class="buy-loc">${imovel.bairro}, ${imovel.cidade}</p>
      <div class="buy-specs">
        <span>${imovel.metragem}</span>
        <span>${imovel.quartos} quartos</span>
        <span>${imovel.vagas} vagas</span>
      </div>
      <a class="cta" href="./empreendimento.html?id=${encodeURIComponent(imovel.id)}">Ver detalhes</a>
    </div>
  `;

  return el;
}

function aplicarFiltros() {
  const busca = fBusca.value.trim().toLowerCase();
  const zona = fZona.value;
  const quartos = fQuartos.value;
  const metragem = fMetragem.value;

  const lista = imoveis.filter((item) => {
    const matchBusca = !busca || [item.nome, item.bairro, item.construtora].join(' ').toLowerCase().includes(busca);
    const matchZona = zona === 'Todas' || item.zona === zona;
    const minQuartos = parseMinQuartos(item.quartos);
    const matchQuartos = quartos === 'Todos' || minQuartos >= Number(quartos.replace('+', ''));
    const matchMetro = metragem === 'Todos' || matchMetragem(metragem, item.metragem);
    return matchBusca && matchZona && matchQuartos && matchMetro;
  });

  buyGrid.innerHTML = '';
  lista.forEach((item) => buyGrid.appendChild(criarCard(item)));

  buyCount.textContent = `${lista.length} empreendimento(s) encontrado(s)`;
  buyEmpty.hidden = lista.length > 0;
}

filterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  aplicarFiltros();
});

limparBtn.addEventListener('click', () => {
  filterForm.reset();
  aplicarFiltros();
});

async function init() {
  const params = new URLSearchParams(window.location.search);
  const zonaQuery = params.get('zona');

  const response = await fetch('./imoveis.json', { cache: 'no-store' });
  imoveis = JSON.parse((await response.text()).replace(/^\uFEFF/, ''));

  if (zonaQuery && ['Zona Sul', 'Zona Leste', 'Todas'].includes(zonaQuery)) {
    fZona.value = zonaQuery;
  }

  aplicarFiltros();
}

init().catch((error) => {
  buyCount.textContent = 'Não foi possível carregar os empreendimentos.';
  console.error(error);
});
