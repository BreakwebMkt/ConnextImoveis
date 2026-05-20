const WHATSAPP_NUMBER = '5511942682245';

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
const zonaSelect = document.getElementById('zonaSelect');
const buscaRapida = document.getElementById('buscaRapida');
const cadastrarBtn = document.getElementById('cadastrarBtn');
const leadNome = document.getElementById('leadNome');
const leadEmail = document.getElementById('leadEmail');
const leadWhatsapp = document.getElementById('leadWhatsapp');
const cardsContainer = document.getElementById('cardsContainer');
const emptyResult = document.getElementById('emptyResult');

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

function formatarMetragem(texto = '') {
  return String(texto).replace(/(\d+[.,]\d+)/g, (valor) => {
    const numero = Number(valor.replace(',', '.'));
    return Number.isFinite(numero) ? String(Math.floor(numero)) : valor;
  });
}

function criarCard(imovel) {
  const article = document.createElement('article');
  article.className = 'card';
  const metragem = formatarMetragem(imovel.metragem);
  article.innerHTML = `
    <img src="${imovel.imagem}" alt="${imovel.alt}" />
    <div class="card-content">
      <span class="chip">${imovel.zona}</span>
      <h3>${imovel.nome}</h3>
      <div class="card-meta">
        <p><strong>Bairro:</strong> ${imovel.bairro}</p>
        <p><strong>Metragem:</strong> ${metragem}</p>
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
    const marcados = imoveis.filter((item) => item.destaque === true);
    const fallback = imoveis.filter((item) => item.destaque !== true);
    const destaques = [...marcados, ...fallback].slice(0, 3);

    cardsContainer.innerHTML = '';
    destaques.forEach((imovel) => cardsContainer.appendChild(criarCard(imovel)));
    if (emptyResult) {
      emptyResult.hidden = true;
    }
  } catch (error) {
    if (emptyResult) {
      emptyResult.hidden = false;
      emptyResult.textContent = 'Não foi possível carregar os destaques no momento.';
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
  const nome = (leadNome?.value || '').trim();
  const email = (leadEmail?.value || '').trim();
  const whatsapp = (leadWhatsapp?.value || '').trim();

  if (!nome || !email || !whatsapp) {
    alert('Preencha nome, e-mail e WhatsApp para continuar.');
    return;
  }

  const msg =
    'Olá! Me chamo ' + nome + ' e quero receber ofertas de imóveis de alto padrão.\n' +
    'Meu WhatsApp: ' + whatsapp + '\n' +
    'Meu e-mail: ' + email;

  window.open(toWhatsappLink(msg), '_blank', 'noopener');
});

document.querySelectorAll('.menu a').forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

carregarDestaques();



