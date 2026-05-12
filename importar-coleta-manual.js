const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = __dirname;
const INPUT_JSON = path.join(ROOT, 'orulo-coleta-manual.json');
const IMOVEIS_JSON = path.join(ROOT, 'imoveis.json');
const ASSETS_DIR = path.join(ROOT, 'assets', 'imoveis');

function clean(s = '') { return String(s).replace(/\s+/g, ' ').trim(); }
function fixText(s = '') {
  return String(s)
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
    .replace(/�/g, '');
}

function inferCode(url = '') {
  const m = String(url).match(/building_id\D+(\d{4,6})|buildings\/(\d{4,6})/i);
  return (m && (m[1] || m[2])) || `manual-${Date.now()}`;
}

function extFromUrl(url = '') {
  const m = String(url).match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
  return m ? `.${m[1].toLowerCase()}` : '.jpg';
}

async function baixar(url, dest) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.orulo.com.br/",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
  fs.writeFileSync(dest, res.data);
}

async function main() {
  if (!fs.existsSync(INPUT_JSON)) {
    console.error('Arquivo não encontrado:', INPUT_JSON);
    process.exit(1);
  }
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const input = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8').replace(/^\uFEFF/, ''));
  const imagens = Array.isArray(input.imagens) ? [...new Set(input.imagens)] : [];
  const plantasOriginais = new Set((Array.isArray(input.plantas) ? input.plantas : []).map((u) => String(u).replace(/\?.*$/, '')));
  const pagina = input.pagina || '';
  const codigo = clean(input.codigo || inferCode(pagina));

  const relFotos = [];
  const relPlantas = [];
  const fotoMap = new Map();
  for (let i = 0; i < imagens.length; i++) {
    const url = imagens[i];
    try {
      const ext = extFromUrl(url);
      const name = `${codigo}-${String(i + 1).padStart(2, '0')}${ext}`;
      const abs = path.join(ASSETS_DIR, name);
      await baixar(url, abs);
      const rel = `./assets/imoveis/${name}`;
      relFotos.push(rel);
      fotoMap.set(String(url).replace(/\?.*$/, ''), rel);
      console.log('baixada:', name);
    } catch (e) {
      console.log('falha:', url);
    }
  }
  plantasOriginais.forEach((p) => {
    const rel = fotoMap.get(p);
    if (rel) relPlantas.push(rel);
  });

  const db = JSON.parse(fs.readFileSync(IMOVEIS_JSON, 'utf8').replace(/^\uFEFF/, ''));
  const idx = db.findIndex((x) => String(x.codigo) === String(codigo));

  const base = idx >= 0 ? db[idx] : {
    id: `orulo-${codigo}`,
    codigo: String(codigo),
    zona: 'Zona Sul',
    bairro: 'São Paulo',
    cidade: 'São Paulo',
    nome: `Empreendimento ${codigo}`,
    construtora: 'Não informada',
    tipo: 'Apartamento',
    metragem: 'A consultar',
    quartos: 'A consultar',
    suites: 'A consultar',
    banheiros: 'A consultar',
    vagas: 'A consultar',
    descricao: 'Descrição pendente de ajuste.',
    endereco: '',
    alt: `Empreendimento ${codigo} em São Paulo`,
    whatsappTexto: `Tenho interesse no empreendimento ${codigo}.`,
    destaque: true,
  };

  const nome = clean(fixText(input.nome || base.nome || `Empreendimento ${codigo}`));
  const descricao = clean(fixText(input.descricao || base.descricao || 'Descrição pendente de ajuste.'));
  const endereco = clean(fixText(input.endereco || base.endereco || ''));
  const metragem = clean(fixText(input.metragem || base.metragem || 'A consultar')).replace(/m\^?2/g, 'm²');
  const quartos = clean(fixText(input.quartos || base.quartos || 'A consultar'));
  const suites = clean(fixText(input.suites || base.suites || 'A consultar'));
  const banheiros = clean(fixText(input.banheiros || base.banheiros || 'A consultar'));
  const vagas = clean(fixText(input.vagas || base.vagas || 'A consultar'));
  const outrasInformacoes = input.outrasInformacoes || base.outrasInformacoes || {};

  const merged = {
    ...base,
    id: base.id || `orulo-${codigo}`,
    codigo: String(codigo),
    nome,
    descricao,
    endereco,
    metragem,
    quartos,
    suites,
    banheiros,
    vagas,
    outrasInformacoes,
    oruloUrl: pagina,
    alt: `Empreendimento ${nome} em São Paulo`,
    whatsappTexto: `Tenho interesse no empreendimento ${nome} (Código ${codigo}).`,
    imagem: relFotos[0] || base.imagem || './assets/imoveis/sao-paulo.jpg',
    fotos: relFotos.length ? relFotos : (base.fotos || []),
    plantas: relPlantas.length ? relPlantas : (base.plantas || []),
  };

  if (idx >= 0) db[idx] = merged;
  else db.push(merged);

  db.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
  fs.writeFileSync(IMOVEIS_JSON, JSON.stringify(db, null, 2), 'utf8');

  console.log('\nConcluído.');
  console.log('Imagens:', relFotos.length);
  console.log('Atualizado:', IMOVEIS_JSON);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
