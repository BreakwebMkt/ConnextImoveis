const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LINKS_FILE = path.join(__dirname, "orulo-links.txt");
const LINKS = (() => {
  if (!fs.existsSync(LINKS_FILE)) return [];
  const raw = fs.readFileSync(LINKS_FILE, "utf-8");
  const urls = raw.match(/https?:\/\/[^\s]+/gi) || [];
  return [...new Set(urls)];
})();

const ROOT = __dirname;
const ASSETS_DIR = path.join(ROOT, "assets", "imoveis");
const SHOTS_DIR = path.join(ROOT, "orulo-screenshots");
const IMOVEIS_JSON = path.join(ROOT, "imoveis.json");
const RAW_OUTPUT = path.join(ROOT, "orulo-extraido.json");
const REVIEW_OUTPUT = path.join(ROOT, "orulo-revisao.json");

function clean(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}

function fixText(s = "") {
  return String(s)
    .replace(/Ã¡/g, "á")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã©/g, "é")
    .replace(/Ãª/g, "ê")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú")
    .replace(/Ã§/g, "ç")
    .replace(/Â²/g, "²")
    .replace(/Â/g, "")
    .replace(/�/g, "");
}

function normalizeName(name = "") {
  return clean(fixText(name))
    .replace(/\s*-\s*Breve Lançamento$/i, "")
    .replace(/\s*-\s*Breve Lancamento$/i, "");
}

function sanitizeDescricao(text = "") {
  let t = fixText(clean(text));
  if (!t) return "";
  if (/^caracter[ií]sticas condominiais/i.test(t)) return "";

  const stopWords = [
    "Tipologias disponíveis",
    "Contato",
    "Outras informações",
    "Mapa",
    "IMPORTANTE: Os valores exibidos",
    "Características condominiais",
  ];
  for (const word of stopWords) {
    const idx = t.toLowerCase().indexOf(word.toLowerCase());
    if (idx > 80) {
      t = t.slice(0, idx).trim();
    }
  }

  t = t
    .replace(/\bVer mais\b/gi, "")
    .replace(/\bVer menos\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return t;
}

function detectConstrutora(nome = "") {
  const n = nome.toLowerCase();
  if (n.includes("cyrela")) return "Cyrela";
  if (n.includes("mitre")) return "Mitre";
  if (n.includes("eztec")) return "Eztec";
  if (n.includes("diálogo") || n.includes("dialogo")) return "Diálogo";
  return "Não informada";
}

function detectZona(text = "") {
  const t = text.toLowerCase();
  if (t.includes("zona sul")) return "Zona Sul";
  if (t.includes("zona leste")) return "Zona Leste";
  if (t.includes("zona oeste")) return "Zona Oeste";
  if (t.includes("zona norte")) return "Zona Norte";
  if (t.includes("brooklin") || t.includes("moema") || t.includes("ibirapuera")) return "Zona Sul";
  return "Zona Sul";
}

function detectBairro(text = "") {
  const t = text.toLowerCase();
  if (t.includes("brooklin")) return "Brooklin";
  if (t.includes("moema")) return "Moema";
  if (t.includes("ibirapuera")) return "Ibirapuera";
  if (t.includes("tatuapé")) return "Tatuapé";
  return "São Paulo";
}

async function baixarImagem(url, destino) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  fs.writeFileSync(destino, res.data);
}

async function extrairDoLink(context, url) {
  const page = await context.newPage();
  const networkImages = new Set();
  const plantasViewer = new Set();
  const screenshots = [];

  page.on("response", (response) => {
    try {
      const u = response.url();
      if (/orulo\.com\.br|static\.orulo\.com\.br|cdn\.orulo/i.test(u) && (/\/images\//i.test(u) || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u))) {
        networkImages.add(u);
      }
    } catch (_) {}
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle").catch(() => {});

  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(350);
  }
  const codeFromUrl = (url.match(/building[s|_id=\/]*(\d{4,6})/i) || [])[1] || String(Date.now());
  const shotBase = path.join(SHOTS_DIR, codeFromUrl);
  if (!fs.existsSync(shotBase)) fs.mkdirSync(shotBase, { recursive: true });
  await page.screenshot({ path: path.join(shotBase, "01-home.png"), fullPage: true });
  screenshots.push(path.join(shotBase, "01-home.png"));

  // Aguarda scripts de galeria/fresco quando existirem.
  await page
    .waitForFunction(
      () =>
        typeof window !== "undefined" &&
        (typeof window.Fresco !== "undefined" ||
          !!document.querySelector("[data-fresco-group], .fr-box, .fr-window, a[href*='static.orulo.com.br/images']")),
      { timeout: 12000 }
    )
    .catch(() => {});

  const openers = [
    page.locator("a:has-text('Ver fotos')").first(),
    page.locator("text=Ver fotos").first(),
    page.locator("[data-fresco-group]").first(),
  ];

  for (const opener of openers) {
    try {
      if (await opener.count()) {
        await opener.click({ timeout: 3000 });
        await page.waitForTimeout(1600);
        await page.screenshot({ path: path.join(shotBase, "02-viewer-open.png"), fullPage: true });
        screenshots.push(path.join(shotBase, "02-viewer-open.png"));
        break;
      }
    } catch (_) {}
  }

  // fallback: se não abriu via botão, tenta abrir primeiro thumbnail da galeria.
  const viewerOpen = await page.locator(".fr-window, .fr-box, img.fr-content-element").first().count();
  if (!viewerOpen) {
    try {
      const firstThumb = page.locator("[data-fresco-group], a[href*='static.orulo.com.br/images']").first();
      if (await firstThumb.count()) {
        await firstThumb.click({ timeout: 2500 });
        await page.waitForTimeout(1600);
      }
    } catch (_) {}
  }

  for (let i = 0; i < 90; i++) {
    try {
      const nextBtn = page.locator(".fr-side-next, .fr-next, .fr-nav .fr-next, .fresco-next").first();
      if (await nextBtn.count()) {
        if (i < 8) {
          await page.screenshot({ path: path.join(shotBase, `03-viewer-${String(i + 1).padStart(2, "0")}.png`), fullPage: true });
          screenshots.push(path.join(shotBase, `03-viewer-${String(i + 1).padStart(2, "0")}.png`));
        }
        await nextBtn.click({ timeout: 1200 });
        await page.waitForTimeout(180);
      } else {
        break;
      }
    } catch (_) {
      break;
    }
  }

  // Última tentativa direcionada: captura explícita do viewer fresco.
  try {
    const firstViewer = page.locator("img.fr-content-element").first();
    if (await firstViewer.count()) {
      for (let i = 0; i < 80; i++) {
        try {
          const src = await firstViewer.getAttribute("src");
          if (src && /^https?:\/\//i.test(src)) {
            plantasViewer.add(src.replace(/\?.*$/, ""));
          }
        } catch (_) {}

        try {
          const nextBtn = page.locator("#fresco_next, .fr-next, .fr-side-next").first();
          if (!(await nextBtn.count())) break;
          const before = await firstViewer.getAttribute("src");
          await nextBtn.click({ timeout: 1200 });
          await page.waitForTimeout(240);
          const after = await firstViewer.getAttribute("src");
          if (!after || after === before) break;
        } catch (_) {
          break;
        }
      }
    }
  } catch (_) {}

  const data = await page.evaluate(() => {
    const clean = (s = "") => String(s).replace(/\s+/g, " ").trim();
    const q = (sel, root = document) => [...root.querySelectorAll(sel)];
    const bodyText = document.body ? document.body.innerText : "";

    const rx = (re) => {
      const m = bodyText.match(re);
      return m ? clean(m[1]) : "";
    };
    const sectionBetween = (startRe, endRe) => {
      const m = bodyText.match(new RegExp(`${startRe.source}([\\s\\S]*?)${endRe.source}`, "i"));
      return m ? clean(m[1]) : "";
    };
    const pickRange = (nums, suffix) => {
      const list = [...new Set(nums.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
      if (!list.length) return "";
      if (list.length === 1) return `${list[0]} ${suffix}`;
      return `${list[0]} a ${list[list.length - 1]} ${suffix}`;
    };

    const nomeFromScript = (document.body.innerHTML.match(/building_name\s*=\s*["']([^"']+)/i) || [])[1] || "";
    const nome =
      clean(nomeFromScript) ||
      q("h1")
        .map((n) => clean(n.textContent))
        .find((t) => t && !/caracter[ií]sticas condominiais/i.test(t)) ||
      clean(document.title);

    let descricao = "";
    const anchors = q("h2,h3,strong,div,span").filter((n) => /^descri[cç][aã]o$/i.test(clean(n.textContent)));
    if (anchors.length) {
      const anchor = anchors[0];
      const parent = anchor.parentElement;
      const siblings = parent ? [...parent.children] : [];
      const idx = siblings.indexOf(anchor);
      const near = siblings.slice(Math.max(0, idx - 2), idx + 6);
      const nearText = near
        .map((n) => clean(n.textContent))
        .filter((t) => t.length >= 40)
        .filter((t) => !/^descri[cç][aã]o$/i.test(t))
        .filter((t) => !/caracter[ií]sticas condominiais|tipologias disponíveis|contato|outras informações|mapa|parceiro digital|c[oó]digo copiado|importante: os valores exibidos/i.test(t))
        .sort((a, b) => b.length - a.length);
      if (nearText[0]) descricao = nearText[0];
    }

    if (!descricao) {
      const paragraphCandidates = q("p")
        .map((n) => clean(n.textContent))
        .filter((t) => t.length >= 40 && t.length <= 700)
        .filter((t) => !/caracter[ií]sticas condominiais|tipologias disponíveis|contato|outras informações|mapa|parceiro digital|c[oó]digo copiado|importante: os valores exibidos/i.test(t))
        .sort((a, b) => b.length - a.length);
      if (paragraphCandidates[0]) descricao = paragraphCandidates[0];
    }

    if (!descricao) {
      const body = clean(bodyText);
      const start = body.search(/descri[cç][aã]o/i);
      if (start >= 0) {
        const slice = body.slice(start + 9);
        const endMatch = slice.match(/tipologias disponíveis|contato|outras informações|mapa|importante: os valores exibidos/i);
        descricao = clean(endMatch ? slice.slice(0, endMatch.index) : slice);
      }
    }

    const fromImgs = q("img").map((img) => img.currentSrc || img.src || "");
    const fromAnchors = q("a[href]").map((a) => a.href || "");
    const fromViewer = q(".fr-image,.fresco img,.fr-content img,.fr-container img").map((img) => img.currentSrc || img.src || "");

    const imagens = [...new Set([...fromImgs, ...fromAnchors, ...fromViewer]
      .filter(Boolean)
      .filter((u) => /^https?:\/\//i.test(u))
      .filter((u) => /orulo\.com\.br|static\.orulo\.com\.br|cdn\.orulo/i.test(u))
      .filter((u) => /\/images\/|\.jpg|\.jpeg|\.png|\.webp/i.test(u))
      .filter((u) => !/badge|logo|icon|avatar|whatsapp|copy|selo|\.svg/i.test(u)))];

    const blocCaracteristicas = sectionBetween(/Características/i, /Características condominiais|Descrição|Plantas/i);
    let metragem = (blocCaracteristicas.match(/(\d+[.,]?\d*\s*a\s*\d+[.,]?\d*\s*m²)/i) || [])[1] || "";
    let quartos = (blocCaracteristicas.match(/(\d+\s*a\s*\d+\s*quarto\(s\))/i) || [])[1] || "";
    let suites = (blocCaracteristicas.match(/(\d+\s*a\s*\d+\s*suite\(s\))/i) || [])[1] || "";
    let banheiros = (blocCaracteristicas.match(/(\d+\s*a\s*\d+\s*banheiro\(s\)|\d+\s*banheiro\(s\))/i) || [])[1] || "";
    let vagas = (blocCaracteristicas.match(/(\d+\s*a\s*\d+\s*vaga\(s\)|\d+\s*vaga\(s\))/i) || [])[1] || "";

    // Fallback por varredura global (tipologias/tabelas)
    const areaNums = [...bodyText.matchAll(/\b(\d{2,4})\s*m²\b/gi)].map((m) => m[1]);
    const quartoNums = [...bodyText.matchAll(/\b(\d{1,2})\s*quarto(?:\(s\)|s)?\b/gi)].map((m) => m[1]);
    const suiteNums = [...bodyText.matchAll(/\b(\d{1,2})\s*suite(?:\(s\)|s)?\b/gi)].map((m) => m[1]);
    const banheiroNums = [...bodyText.matchAll(/\b(\d{1,2})\s*banheiro(?:\(s\)|s)?\b/gi)].map((m) => m[1]);
    const vagaNums = [...bodyText.matchAll(/\b(\d{1,2})\s*vaga(?:\(s\)|s)?\b/gi)].map((m) => m[1]);

    if (!metragem) metragem = pickRange(areaNums, "m²");
    if (!quartos) quartos = pickRange(quartoNums, "quarto(s)");
    if (!suites) suites = pickRange(suiteNums, "suite(s)");
    if (!banheiros) banheiros = pickRange(banheiroNums, "banheiro(s)");
    if (!vagas) vagas = pickRange(vagaNums, "vaga(s)");

    let endereco =
      rx(/\n([^\n]*São Paulo\/SP[^\n]*)/i) ||
      rx(/([A-ZÀ-ÿa-z0-9 .,'-]+ - São Paulo\/SP)/i) ||
      "";
    if (!endereco) {
      const lines = bodyText
        .split("\n")
        .map((l) => clean(l))
        .filter(Boolean);
      const byCityLine = lines.find((l) => /são paulo\/sp/i.test(l) && /rua|avenida|av\.|alameda|travessa|praça/i.test(l));
      if (byCityLine) endereco = byCityLine;
    }
    if (!endereco) {
      const m = bodyText.match(
        /((?:Rua|R\.|Avenida|Av\.|Alameda|Travessa|Praça)\s+[^\n]+?-\s*[^\n]+?\/SP)/i
      );
      if (m) endereco = clean(m[1]);
    }

    const outrasInfosBlock = sectionBetween(/Outras informações/i, /Atualizado em:\s*[0-9/]+/i);
    const infoValue = (label) => {
      const m = bodyText.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
      return m ? clean(m[1]) : "";
    };
    const outrasInformacoes = {
      estagio: infoValue("Estágio"),
      estoque: infoValue("Estoque"),
      lancamento: infoValue("Lançamento"),
      unidadesPorAndar: infoValue("Unidades por andar"),
      entrega: infoValue("Entrega"),
      totalUnidades: infoValue("Total de unidades"),
      numeroAndares: infoValue("Número de andares"),
      atualizadoEm: infoValue("Atualizado em"),
      bloco: outrasInfosBlock || "",
    };

    return {
      url_orulo: location.href,
      nome,
      codigo: rx(/C[oó]digo\s*:\s*(\d+)/i),
      descricao,
      metragem,
      quartos,
      suites,
      banheiros,
      vagas,
      endereco,
      lancamento: rx(/Lan[çc]amento:\s*([0-9/]+)/i),
      entrega: rx(/Entrega:\s*([0-9/]+)/i),
      atualizado: rx(/Atualizado em:\s*([0-9/]+)/i),
      outrasInformacoes,
      bodyText: clean(bodyText),
      imagens,
    };
  });

  data.imagens = [...new Set([...(data.imagens || []), ...networkImages])]
    .filter((u) => /orulo\.com\.br|static\.orulo\.com\.br|cdn\.orulo/i.test(u))
    .filter((u) => /\/images\//i.test(u) || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u))
    .filter((u) => !/badge|logo|icon|avatar|whatsapp|copy|selo|\.svg/i.test(u));
  data.plantas = [...plantasViewer]
    .filter((u) => /orulo\.com\.br|static\.orulo\.com\.br|cdn\.orulo/i.test(u))
    .filter((u) => /\/images\//i.test(u) || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u));

  data.screenshots = screenshots.map((s) => path.relative(ROOT, s).replace(/\\/g, "/"));

  await page.close();
  return data;
}

function carregarImoveis() {
  const raw = fs.readFileSync(IMOVEIS_JSON, "utf-8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function salvarImoveis(items) {
  fs.writeFileSync(IMOVEIS_JSON, JSON.stringify(items, null, 2), "utf-8");
}

async function main() {
  if (!LINKS.length) {
    console.log("Nenhum link encontrado em orulo-links.txt");
    return;
  }
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  const extraidos = [];
  const novosSite = [];

  for (let i = 0; i < LINKS.length; i++) {
    const link = LINKS[i];
    console.log(`[${i + 1}/${LINKS.length}] ${link}`);
    const item = await extrairDoLink(context, link);
    const normalizedNome = normalizeName(item.nome || "");
    if (/login/i.test(normalizedNome) && /orulo|órulo/i.test(normalizedNome)) {
      console.log("  -> ignorado: página de login detectada");
      continue;
    }
    extraidos.push(item);

    const nome = normalizedNome;
    const codigo = item.codigo || `sem-codigo-${Date.now()}`;

    const imagensLocais = [];
    const imagensLocaisAbs = [];
    const plantasLocais = [];
    const plantasLocaisAbs = [];
    const plantasSet = new Set((item.plantas || []).map((u) => String(u).replace(/\?.*$/, "")));
    for (let j = 0; j < item.imagens.length; j++) {
      const img = item.imagens[j];
      try {
        const extMatch = img.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
        const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".jpg";
        const fileName = `${codigo}-${String(j + 1).padStart(2, "0")}${ext}`;
        const filePath = path.join(ASSETS_DIR, fileName);
        await baixarImagem(img, filePath);
        const localUrl = `./assets/imoveis/${fileName}`;
        imagensLocais.push(localUrl);
        imagensLocaisAbs.push(filePath);
        if (plantasSet.has(String(img).replace(/\?.*$/, "")) || /planta|pavimento|tipologia|dorm/i.test(img)) {
          plantasLocais.push(localUrl);
          plantasLocaisAbs.push(filePath);
        }
      } catch (_) {}
    }

    const bodyRef = `${item.nome} ${item.descricao} ${item.bodyText}`;
    const zona = detectZona(bodyRef);
    const bairro = detectBairro(bodyRef);

    const siteItem = {
      id: `orulo-${codigo}`,
      codigo: String(codigo),
      zona,
      bairro,
      cidade: "São Paulo",
      nome: nome || `Empreendimento ${codigo}`,
      construtora: detectConstrutora(nome),
      tipo: "Apartamento",
      metragem: fixText(item.metragem || "A consultar"),
      quartos: fixText(item.quartos || "A consultar"),
      suites: fixText(item.suites || "A consultar"),
      banheiros: fixText(item.banheiros || "A consultar"),
      vagas: fixText(item.vagas || "A consultar"),
      endereco: fixText(item.endereco || ""),
      descricao: fixText(item.descricao || "Empreendimento selecionado para atendimento consultivo da Connext Imóveis."),
      imagem: imagensLocais[0] || "./assets/imoveis/sao-paulo.jpg",
      fotos: imagensLocais.length ? imagensLocais : ["./assets/imoveis/sao-paulo.jpg"],
      fotosArquivos: imagensLocaisAbs,
      plantas: plantasLocais,
      plantasArquivos: plantasLocaisAbs,
      alt: `Empreendimento ${nome || codigo} em São Paulo`,
      whatsappTexto: `Tenho interesse no empreendimento ${nome || codigo} (Código ${codigo}).`,
      oruloUrl: item.url_orulo,
      lancamento: item.lancamento || "",
      entrega: item.entrega || "",
      atualizado: item.atualizado || "",
      outrasInformacoes: item.outrasInformacoes || {},
      destaque: true,
    };

    siteItem.descricao = sanitizeDescricao(siteItem.descricao);

    novosSite.push(siteItem);
    console.log(`  -> código ${siteItem.codigo} | fotos baixadas: ${siteItem.fotos.length} | plantas: ${siteItem.plantas.length}`);
  }

  await browser.close();

  fs.writeFileSync(RAW_OUTPUT, JSON.stringify(extraidos, null, 2), "utf-8");

  const atuais = carregarImoveis();
  const byCode = new Map(atuais.map((x) => [String(x.codigo), x]));
  for (const it of novosSite) byCode.set(String(it.codigo), it);
  const merged = [...byCode.values()].sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
  salvarImoveis(merged);

  const review = merged.map((item) => {
    const issues = [];
    const desc = String(item.descricao || "");
    if (!desc || desc.length < 90) issues.push("descrição curta");
    if (/tipologias disponíveis|contato daiane|outras informações|a partir de r\$|creci|quero mais informações/i.test(desc)) {
      issues.push("descrição com ruído");
    }
    if (!item.metragem || /a consultar/i.test(item.metragem)) issues.push("metragem pendente");
    if (!item.quartos || /a consultar/i.test(item.quartos)) issues.push("quartos pendente");
    if (!item.fotos?.length) issues.push("sem fotos");
    return {
      codigo: item.codigo,
      nome: item.nome,
      issues,
      ok: issues.length === 0,
    };
  });
  fs.writeFileSync(REVIEW_OUTPUT, JSON.stringify(review, null, 2), "utf-8");

  console.log("\nConcluído.");
  console.log(`Extraído bruto: ${RAW_OUTPUT}`);
  console.log(`Atualizado: ${IMOVEIS_JSON}`);
  console.log(`Revisão: ${REVIEW_OUTPUT}`);
}

main().catch((err) => {
  console.error("Erro geral:", err);
  process.exit(1);
});
