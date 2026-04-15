const STORAGE_KEY = 'connext_imoveis_admin_draft';
const form = document.getElementById('adminForm');
const listaImoveisEl = document.getElementById('listaImoveis');
const statusEl = document.getElementById('status');
const saveLocalBtn = document.getElementById('saveLocalBtn');
const downloadBtn = document.getElementById('downloadBtn');
const uploadJsonInput = document.getElementById('uploadJson');
const imagemInput = document.getElementById('imagem');
const imagemPreview = document.getElementById('imagemPreview');

let imoveis = [];

function normalizarId(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mostrarStatus(mensagem, erro = false) {
  statusEl.textContent = mensagem;
  statusEl.style.color = erro ? '#b72121' : '#1f6d40';
}

function renderLista() {
  if (!imoveis.length) {
    listaImoveisEl.innerHTML = '<p class="admin-note">Nenhum imovel cadastrado.</p>';
    return;
  }

  listaImoveisEl.innerHTML = '';

  imoveis.forEach((imovel) => {
    const item = document.createElement('article');
    item.className = 'admin-item';
    item.innerHTML = `
      <img src="${imovel.imagem}" alt="${imovel.alt}" />
      <div>
        <h3>${imovel.nome}</h3>
        <p>${imovel.zona} | ${imovel.descricao}</p>
      </div>
      <button type="button" data-id="${imovel.id}">Remover</button>
    `;

    item.querySelector('button').addEventListener('click', () => {
      imoveis = imoveis.filter((current) => current.id !== imovel.id);
      renderLista();
      mostrarStatus('Imovel removido. Clique em "Baixar imoveis.json" para publicar.');
    });

    listaImoveisEl.appendChild(item);
  });
}

async function carregarInicial() {
  const draft = localStorage.getItem(STORAGE_KEY);

  if (draft) {
    try {
      imoveis = JSON.parse(draft);
      renderLista();
      mostrarStatus('Rascunho local carregado do navegador.');
      return;
    } catch (error) {
      console.error(error);
    }
  }

  try {
    const response = await fetch('./imoveis.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Falha ao ler imoveis.json');
    }

    imoveis = await response.json();
    renderLista();
    mostrarStatus('imoveis.json carregado com sucesso.');
  } catch (error) {
    console.error(error);
    renderLista();
    mostrarStatus('Nao foi possivel carregar imoveis.json.', true);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const zona = document.getElementById('zona').value;
  const descricao = document.getElementById('descricao').value.trim();
  const imagem = imagemInput.value.trim();
  const whatsappTextoInput = document.getElementById('whatsappTexto').value.trim();
  const altInput = document.getElementById('alt').value.trim();

  if (!imagem) {
    mostrarStatus('Informe o caminho da imagem, ex: ./assets/imoveis/imovel-01.jpg', true);
    return;
  }

  const whatsappTexto = whatsappTextoInput || `Tenho interesse no ${nome}`;
  const alt = altInput || `Imagem do empreendimento ${nome}`;

  const baseId = normalizarId(nome);
  const candidateId = `${baseId}-${Date.now()}`;

  imoveis.unshift({
    id: candidateId,
    zona,
    nome,
    descricao,
    imagem,
    alt,
    whatsappTexto
  });

  form.reset();
  imagemPreview.src = './assets/imoveis/sao-paulo.jpg';
  renderLista();
  mostrarStatus('Imovel adicionado. Clique em "Baixar imoveis.json" para publicar.');
});

imagemInput.addEventListener('input', () => {
  const src = imagemInput.value.trim();
  imagemPreview.src = src || './assets/imoveis/sao-paulo.jpg';
});

saveLocalBtn.addEventListener('click', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(imoveis, null, 2));
  mostrarStatus('Rascunho salvo no navegador deste computador.');
});

downloadBtn.addEventListener('click', () => {
  const content = JSON.stringify(imoveis, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'imoveis.json';
  link.click();
  URL.revokeObjectURL(url);
  mostrarStatus('Arquivo imoveis.json baixado. Suba este arquivo na Hostinger.');
});

uploadJsonInput.addEventListener('change', async () => {
  const file = uploadJsonInput.files?.[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error('Arquivo invalido');
    }

    imoveis = parsed;
    renderLista();
    mostrarStatus('JSON importado com sucesso.');
  } catch (error) {
    console.error(error);
    mostrarStatus('Falha ao importar JSON. Verifique o arquivo.', true);
  }

  uploadJsonInput.value = '';
});

imagemPreview.src = './assets/imoveis/sao-paulo.jpg';
carregarInicial();
