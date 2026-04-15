const WHATSAPP_NUMBER = '5511999999999';

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
const zonaSelect = document.getElementById('zonaSelect');
const zoneButtons = document.querySelectorAll('.zone-buttons a');
const buscaRapida = document.getElementById('buscaRapida');
const cadastrarBtn = document.getElementById('cadastrarBtn');
const cardsContainer = document.getElementById('cardsContainer');
const emptyResult = document.getElementById('emptyResult');
const seoStrip = document.getElementById('seoStrip');
const seoClose = document.getElementById('seoClose');
const chipZona = document.getElementById('chipZona');
const resultsSubtitle = document.getElementById('resultsSubtitle');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

let imoveis = [];

function setMenuState(open) {
  menu.classList.toggle('open', open);
  menuToggle.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('nav-open', open);
}

menuToggle?.addEventListener('click', () => {
  const isOpen = menu.classList.contains('open');
  setMenuState(!isOpen);
});

document.addEventListener('click', (event) => {
  const alvo = event.target;
  if (!menu.classList.contains('open')) {
    return;
  }

  if (!menu.contains(alvo) && !menuToggle.contains(alvo)) {
    setMenuState(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenuState(false);
  }
});

function toWhatsappLink(texto) {
  const text = encodeURIComponent(texto);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

function criarCard(imovel) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.zona = imovel.zona;
  article.innerHTML = `
    <img src="${imovel.imagem}" alt="${imovel.alt}" />
    <div class="card-content">
      <span class="chip">${imovel.zona}</span>
      <h3>${imovel.nome}</h3>
      <p>${imovel.descricao}</p>
      <a class="cta" target="_blank" rel="noopener" href="${toWhatsappLink(imovel.whatsappTexto)}">Saiba Mais</a>
    </div>
  `;

  return article;
}

function renderizarCards(lista) {
  cardsContainer.innerHTML = '';

  if (!lista.length) {
    emptyResult.hidden = false;
    return;
  }

  emptyResult.hidden = true;
  lista.forEach((imovel) => {
    cardsContainer.appendChild(criarCard(imovel));
  });

  ativarAnimacaoRevelar();
}

function filtrarCards(zona) {
  const filtrados = zona === 'Todas'
    ? imoveis
    : imoveis.filter((imovel) => imovel.zona === zona);

  renderizarCards(filtrados);
}

function ativarModoResultados(zona) {
  document.body.classList.add('results-active');
  chipZona.textContent = zona === 'Todas' ? 'Todas as zonas' : zona;
  resultsSubtitle.textContent = zona === 'Todas'
    ? 'Apartamentos a venda em Sao Paulo - SP'
    : `Apartamentos a venda em Sao Paulo - ${zona}`;
}

function limparModoResultados() {
  document.body.classList.remove('results-active');
  zonaSelect.value = 'Todas';
  chipZona.textContent = 'Todas as zonas';
  resultsSubtitle.textContent = 'Empreendimentos da construtora Dialogo para teste de performance comercial.';
  filtrarCards('Todas');
  document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' });
}

async function carregarImoveis() {
  try {
    const response = await fetch('./imoveis.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Falha ao carregar imoveis.json');
    }

    const raw = await response.text();
    const clean = raw.replace(/^\uFEFF/, '');
    imoveis = JSON.parse(clean);
    filtrarCards(zonaSelect.value);
  } catch (error) {
    emptyResult.hidden = false;
    if (window.location.protocol === 'file:') {
      emptyResult.textContent = 'Abrindo como arquivo local bloqueia a leitura do JSON. Publique na Hostinger ou rode um servidor local.';
    } else {
      emptyResult.textContent = 'Nao foi possivel carregar os imoveis. Verifique o arquivo imoveis.json.';
    }
    console.error(error);
  }
}

zoneButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const zona = button.dataset.zone || 'Todas';
    zonaSelect.value = zona;
    filtrarCards(zona);
    ativarModoResultados(zona);
  });
});

buscaRapida?.addEventListener('submit', (event) => {
  event.preventDefault();
  const zonaSelecionada = zonaSelect.value;
  filtrarCards(zonaSelecionada);
  ativarModoResultados(zonaSelecionada);
  document.getElementById('comprar')?.scrollIntoView({ behavior: 'smooth' });
});

cadastrarBtn?.addEventListener('click', () => {
  const msg = 'Ola, quero cadastrar meu interesse em imoveis da Connext Imoveis.';
  window.open(toWhatsappLink(msg), '_blank', 'noopener');
});

document.querySelectorAll('.menu a').forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

clearFiltersBtn?.addEventListener('click', () => {
  limparModoResultados();
});

function ativarAnimacaoRevelar() {
  const elementos = document.querySelectorAll('.hero-content, .about, .listings, .register, .contact, .card');
  elementos.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  elementos.forEach((el) => observer.observe(el));
}

function configurarSeoStrip() {
  if (!seoStrip || !seoClose) {
    return;
  }

  if (localStorage.getItem('connext_hide_seo_strip') === '1') {
    seoStrip.style.display = 'none';
    return;
  }

  seoClose.addEventListener('click', () => {
    seoStrip.style.display = 'none';
    localStorage.setItem('connext_hide_seo_strip', '1');
  });
}

configurarSeoStrip();
carregarImoveis();
