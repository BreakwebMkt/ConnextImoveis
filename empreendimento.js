const WHATSAPP_NUMBER = '5511942682245';

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
const detailHero = document.getElementById('detailHero');
const detailGrid = document.getElementById('detailGrid');
let lightboxState = { fotos: [], index: 0 };
const THUMBS_PAGE = 6;

function normalizeText(value = '') {
  return String(value)
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Â²/g, '²')
    .replace(/Â/g, '')
    .replace(/?/g, '');
}

function formatarMetragem(texto = '') {
  return String(texto).replace(/(\d+[.,]\d+)/g, (valor) => {
    const numero = Number(valor.replace(',', '.'));
    return Number.isFinite(numero) ? String(Math.floor(numero)) : valor;
  });
}

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

function toGoogleMapsSearch(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function toGoogleMapsEmbed(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function closeLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.classList.remove('lightbox-open');
}

function ensureLightbox() {
  if (document.getElementById('imageLightbox')) {
    return;
  }

  const markup = `
    <div class="image-lightbox" id="imageLightbox" aria-hidden="true">
      <div class="lightbox-backdrop" id="lightboxBackdrop"></div>
      <div class="lightbox-panel">
        <button type="button" class="lightbox-close" id="lightboxClose" aria-label="Fechar imagem">×</button>
        <button type="button" class="lightbox-nav prev" id="lightboxPrev" aria-label="Imagem anterior">‹</button>
        <img id="lightboxImage" alt="Imagem ampliada do empreendimento" />
        <button type="button" class="lightbox-nav next" id="lightboxNext" aria-label="Próxima imagem">›</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', markup);

  const lightbox = document.getElementById('imageLightbox');
  const backdrop = document.getElementById('lightboxBackdrop');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');

  closeBtn.addEventListener('click', closeLightbox);

  backdrop.addEventListener('click', closeLightbox);

  prevBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!lightboxState.fotos.length) return;
    lightboxState.index = (lightboxState.index - 1 + lightboxState.fotos.length) % lightboxState.fotos.length;
    updateLightboxImage();
  });

  nextBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!lightboxState.fotos.length) return;
    lightboxState.index = (lightboxState.index + 1) % lightboxState.fotos.length;
    updateLightboxImage();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('open')) return;
    if (event.key === 'Escape') {
      closeLightbox();
    }
    if (event.key === 'ArrowLeft') {
      prevBtn.click();
    }
    if (event.key === 'ArrowRight') {
      nextBtn.click();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (
      target?.id === 'lightboxClose' ||
      target?.classList?.contains('lightbox-close')
    ) {
      closeLightbox();
    }
  });
}

function updateLightboxImage() {
  const image = document.getElementById('lightboxImage');
  image.src = lightboxState.fotos[lightboxState.index] || '';
}

function openLightbox(fotos, index) {
  ensureLightbox();
  lightboxState = { fotos, index };
  updateLightboxImage();
  const lightbox = document.getElementById('imageLightbox');
  lightbox.classList.add('open');
  document.body.classList.add('lightbox-open');
}

function renderNotFound() {
  detailHero.innerHTML = '<div class="container detail-hero-content"><h1>Empreendimento</h1><p>Detalhes e galeria de imagens</p></div>';
  detailGrid.innerHTML = '<p>Empreendimento não encontrado.</p>';
}

function renderEmpreendimento(item) {
  item.nome = normalizeText(item.nome);
  item.descricao = normalizeText(item.descricao);
  item.zona = normalizeText(item.zona);
  item.bairro = normalizeText(item.bairro);
  item.construtora = normalizeText(item.construtora);
  item.metragem = formatarMetragem(normalizeText(item.metragem).replace(/m\^?2/g, 'm²'));
  item.quartos = normalizeText(item.quartos);
  item.suites = normalizeText(item.suites);
  item.banheiros = normalizeText(item.banheiros || '');
  item.vagas = normalizeText(item.vagas);
  item.endereco = normalizeText(item.endereco || '');
  item.alt = normalizeText(item.alt);
  item.whatsappTexto = normalizeText(item.whatsappTexto);
  document.title = `${item.nome} | Connext Imóveis`;

  const allImages = item.fotos?.length ? item.fotos : [item.imagem];
  const fotosPrincipais = allImages;
  const thumbs = fotosPrincipais.slice(0, THUMBS_PAGE);
  detailHero.innerHTML = `
    <div class="container detail-hero-content">
      <p class="results-breadcrumb">Comprar &gt; ${item.zona}</p>
      <h1>${item.nome}</h1>
      <p>Veja fotos, plantas e informações completas do empreendimento.</p>
    </div>
  `;

  detailGrid.innerHTML = `
    <article>
      <p class="results-breadcrumb">Comprar &gt; ${item.zona} &gt; ${item.nome}</p>
      <h1>${item.nome}</h1>
      ${item.endereco ? `<p class="detail-address">${item.endereco}</p>` : ''}
      <p>${item.descricao}</p>
      <div class="detail-specs">
        <div><strong>Código</strong><span>${item.codigo}</span></div>
        <div><strong>Bairro</strong><span>${item.bairro}</span></div>
        <div><strong>Metragem</strong><span>${item.metragem}</span></div>
        <div><strong>Quartos</strong><span>${item.quartos}</span></div>
        <div><strong>Suítes</strong><span>${item.suites}</span></div>
        <div><strong>Banheiros</strong><span>${item.banheiros || 'A consultar'}</span></div>
        <div><strong>Vagas</strong><span>${item.vagas}</span></div>
        <div><strong>Construtora</strong><span>${item.construtora}</span></div>
      </div>
      <a class="contact-cta" target="_blank" rel="noopener" href="${toWhatsappLink(item.whatsappTexto)}">Quero atendimento deste empreendimento</a>
      ${item.oruloUrl ? `<a class="orulo-link" target="_blank" rel="noopener" href="${item.oruloUrl}">Ver ficha técnica</a>` : ''}
      ${item.outrasInformacoes ? `
      <section class="extra-info">
        <h3>Outras informações</h3>
        <div class="extra-info-grid">
          ${item.outrasInformacoes.estagio ? `<p><strong>Estágio:</strong> ${normalizeText(item.outrasInformacoes.estagio)}</p>` : ''}
          ${item.outrasInformacoes.estoque ? `<p><strong>Estoque:</strong> ${normalizeText(item.outrasInformacoes.estoque)}</p>` : ''}
          ${item.outrasInformacoes.lancamento ? `<p><strong>Lançamento:</strong> ${normalizeText(item.outrasInformacoes.lancamento)}</p>` : ''}
          ${item.outrasInformacoes.unidadesPorAndar ? `<p><strong>Unidades por andar:</strong> ${normalizeText(item.outrasInformacoes.unidadesPorAndar)}</p>` : ''}
          ${item.outrasInformacoes.entrega ? `<p><strong>Entrega:</strong> ${normalizeText(item.outrasInformacoes.entrega)}</p>` : ''}
          ${item.outrasInformacoes.totalUnidades ? `<p><strong>Total de unidades:</strong> ${normalizeText(item.outrasInformacoes.totalUnidades)}</p>` : ''}
          ${item.outrasInformacoes.numeroAndares ? `<p><strong>Número de andares:</strong> ${normalizeText(item.outrasInformacoes.numeroAndares)}</p>` : ''}
          ${item.outrasInformacoes.atualizadoEm ? `<p><strong>Atualizado em:</strong> ${normalizeText(item.outrasInformacoes.atualizadoEm)}</p>` : ''}
        </div>
      </section>` : ''}
      ${item.endereco ? `
      <section class="map-section">
        <div class="map-header">
          <h3>Mapa</h3>
          <a href="${toGoogleMapsSearch(item.endereco)}" target="_blank" rel="noopener">Abrir no Google Maps</a>
        </div>
        <iframe
          title="Mapa do empreendimento ${item.nome}"
          src="${toGoogleMapsEmbed(item.endereco)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </section>` : ''}
    </article>
    <aside>
      <div class="detail-gallery-main vertical-showcase">
        <img id="mainFoto" src="${fotosPrincipais[0]}" alt="${item.alt}" />
      </div>
      <div class="detail-thumbs" id="detailThumbs">
        ${thumbs.map((foto, idx) => `<button type="button" class="thumb-btn ${idx === 0 ? 'active' : ''}" data-src="${foto}" data-idx="${idx}"><img src="${foto}" alt="Foto ${idx + 1} - ${item.nome}" /></button>`).join('')}
      </div>
      ${fotosPrincipais.length > THUMBS_PAGE ? `
      <div class="thumb-nav">
        <button class="thumb-nav-btn" id="thumbPrevBtn" type="button" aria-label="Fotos anteriores">‹</button>
        <span>${fotosPrincipais.length} fotos</span>
        <button class="thumb-nav-btn" id="thumbNextBtn" type="button" aria-label="Próximas fotos">›</button>
      </div>` : ''}
    </aside>
  `;

  const mainFoto = document.getElementById('mainFoto');
  mainFoto.dataset.idx = '0';
  mainFoto.addEventListener('click', () => {
    const idx = Number(mainFoto.dataset.idx || 0);
    openLightbox(fotosPrincipais, idx);
  });
  mainFoto.style.cursor = 'zoom-in';

  let thumbStart = 0;

  function bindFotoThumbs() {
    document.querySelectorAll('#detailThumbs .thumb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        mainFoto.src = btn.dataset.src;
        mainFoto.dataset.idx = btn.dataset.idx;
        document.querySelectorAll('#detailThumbs .thumb-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function renderFotoPage() {
    const thumbsEl = document.getElementById('detailThumbs');
    const pageItems = fotosPrincipais.slice(thumbStart, thumbStart + THUMBS_PAGE);
    thumbsEl.innerHTML = pageItems
      .map((foto, pageIdx) => {
        const idx = thumbStart + pageIdx;
        const active = idx === Number(mainFoto.dataset.idx || 0) ? 'active' : '';
        return `<button type="button" class="thumb-btn ${active}" data-src="${foto}" data-idx="${idx}"><img src="${foto}" alt="Foto ${idx + 1} - ${item.nome}" /></button>`;
      })
      .join('');
    bindFotoThumbs();
  }

  document.getElementById('thumbPrevBtn')?.addEventListener('click', () => {
    thumbStart = Math.max(0, thumbStart - THUMBS_PAGE);
    renderFotoPage();
  });
  document.getElementById('thumbNextBtn')?.addEventListener('click', () => {
    thumbStart = Math.min(Math.max(0, fotosPrincipais.length - THUMBS_PAGE), thumbStart + THUMBS_PAGE);
    renderFotoPage();
  });

  bindFotoThumbs();
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
