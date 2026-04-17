const WHATSAPP_NUMBER = '5511999999999';

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
const zonaSelect = document.getElementById('zonaSelect');
const buscaRapida = document.getElementById('buscaRapida');
const cadastrarBtn = document.getElementById('cadastrarBtn');
const cardsContainer = document.getElementById('cardsContainer');
const emptyResult = document.getElementById('emptyResult');
const seoStrip = document.getElementById('seoStrip');
const seoClose = document.getElementById('seoClose');

function setMenuState(open) {
  if (!menu || !menuToggle) {
    return;
  }
  menu.classList.toggle('open', open);
  menuToggle.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('nav-open', open);
}

menuToggle?.addEventListener('click', () => {
  setMenuState(!menu.classList.contains('open'));
});

document.addEventListener('click', (event) => {
  if (!menu || !menuToggle || !menu.classList.contains('open')) {
    return;
  }
  const alvo = event.target;
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
  article.innerHTML = `
    <img src="${imovel.imagem}" alt="${imovel.alt}" />
    <div class="card-content">
      <span class="chip">${imovel.zona}</span>
      <h3>${imovel.nome}</h3>
      <div class="card-meta">
        <p><strong>Bairro:</strong> ${imovel.bairro}</p>
        <p><strong>Metragem:</strong> ${imovel.metragem}</p>
        <p><strong>Quartos:</strong> ${imovel.quartos}</p>
      </div>
      <a class="cta" href="./empreendimento.html?id=${encodeURIComponent(imovel.id)}">Ver detalhes</a>
    </div>
  `;

  return article;
}

async function carregarDestaques() {
  if (!cardsContainer) {
    return;
  }

  try {
    const response = await fetch('./imoveis.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Falha ao carregar imoveis.json');
    }

    const imoveis = JSON.parse((await response.text()).replace(/^\uFEFF/, ''));
    const destaques = imoveis.slice(0, 3);

    cardsContainer.innerHTML = '';
    destaques.forEach((imovel) => cardsContainer.appendChild(criarCard(imovel)));
    if (emptyResult) {
      emptyResult.hidden = true;
    }
  } catch (error) {
    if (emptyResult) {
      emptyResult.hidden = false;
      emptyResult.textContent = 'Nao foi possivel carregar os destaques no momento.';
    }
    console.error(error);
  }
}

buscaRapida?.addEventListener('submit', (event) => {
  event.preventDefault();
  const zona = zonaSelect?.value || 'Todas';
  const target = zona === 'Todas'
    ? './comprar.html'
    : `./comprar.html?zona=${encodeURIComponent(zona)}`;
  window.location.href = target;
});

cadastrarBtn?.addEventListener('click', () => {
  const msg = 'Ola, quero cadastrar meu interesse em imoveis da Connext Imoveis.';
  window.open(toWhatsappLink(msg), '_blank', 'noopener');
});

document.querySelectorAll('.menu a').forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

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
carregarDestaques();
