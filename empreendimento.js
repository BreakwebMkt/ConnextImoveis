const WHATSAPP_NUMBER = '5511999999999';

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
const detailHero = document.getElementById('detailHero');
const detailGrid = document.getElementById('detailGrid');

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

function toWhatsappLink(texto) {
  const text = encodeURIComponent(texto);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

function renderNotFound() {
  detailHero.style.backgroundImage = 'url(./assets/imoveis/sao-paulo.jpg)';
  detailGrid.innerHTML = '<p>Empreendimento não encontrado.</p>';
}

function renderEmpreendimento(item) {
  document.title = `${item.nome} | Connext Imóveis`;
  detailHero.style.backgroundImage = `linear-gradient(120deg, rgba(25,28,34,0.75), rgba(203,123,68,0.55)), url(${item.imagem})`;

  const fotos = item.fotos?.length ? item.fotos : [item.imagem];

  detailGrid.innerHTML = `
    <article>
      <p class="results-breadcrumb">Comprar &gt; ${item.zona} &gt; ${item.nome}</p>
      <h1>${item.nome}</h1>
      <p>${item.descricao}</p>
      <div class="detail-specs">
        <div><strong>Código</strong><span>${item.codigo}</span></div>
        <div><strong>Bairro</strong><span>${item.bairro}</span></div>
        <div><strong>Metragem</strong><span>${item.metragem}</span></div>
        <div><strong>Quartos</strong><span>${item.quartos}</span></div>
        <div><strong>Suítes</strong><span>${item.suites}</span></div>
        <div><strong>Vagas</strong><span>${item.vagas}</span></div>
        <div><strong>Construtora</strong><span>${item.construtora}</span></div>
      </div>
      <a class="contact-cta" target="_blank" rel="noopener" href="${toWhatsappLink(item.whatsappTexto)}">Quero atendimento deste empreendimento</a>
    </article>
    <aside>
      <div class="detail-gallery-main">
        <img id="mainFoto" src="${fotos[0]}" alt="${item.alt}" />
      </div>
      <div class="detail-thumbs" id="detailThumbs">
        ${fotos.map((foto, idx) => `<button type="button" class="thumb-btn ${idx === 0 ? 'active' : ''}" data-src="${foto}"><img src="${foto}" alt="Foto ${idx + 1} - ${item.nome}" /></button>`).join('')}
      </div>
    </aside>
  `;

  const mainFoto = document.getElementById('mainFoto');
  document.querySelectorAll('.thumb-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      mainFoto.src = btn.dataset.src;
      document.querySelectorAll('.thumb-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    renderNotFound();
    return;
  }

  const response = await fetch('./imoveis.json', { cache: 'no-store' });
  const imoveis = JSON.parse((await response.text()).replace(/^\uFEFF/, ''));
  const item = imoveis.find((x) => x.id === id);

  if (!item) {
    renderNotFound();
    return;
  }

  renderEmpreendimento(item);
}

init().catch(() => renderNotFound());
