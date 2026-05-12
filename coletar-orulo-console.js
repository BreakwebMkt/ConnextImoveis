(() => {
  const onlyImg = (u = '') => /static\.orulo\.com\.br\/images\/properties\//i.test(u) && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u);
  const clean = (u = '') => u.replace(/\?.*$/, '');

  const urls = new Set();

  const collectFromDoc = () => {
    document.querySelectorAll('img').forEach((img) => {
      const u = img.currentSrc || img.src || '';
      if (u && onlyImg(u)) urls.add(clean(u));
    });

    document.querySelectorAll('[style]').forEach((el) => {
      const s = el.getAttribute('style') || '';
      const m = s.match(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/i);
      if (m && m[2] && onlyImg(m[2])) urls.add(clean(m[2]));
    });

    document.querySelectorAll('a[href]').forEach((a) => {
      const u = a.href || '';
      if (u && onlyImg(u)) urls.add(clean(u));
    });
  };

  const collectFromViewer = () => {
    document.querySelectorAll('img.fr-content-element, .fr-content img, .fr-image, .fresco img').forEach((img) => {
      const u = img.currentSrc || img.src || '';
      if (u && onlyImg(u)) urls.add(clean(u));
    });
  };

  collectFromDoc();
  collectFromViewer();

  const result = {
    pagina: location.href,
    coletado_em: new Date().toISOString(),
    total: urls.size,
    imagens: [...urls]
  };

  console.log('Total de imagens:', result.total);
  console.log(result);
  copy(JSON.stringify(result, null, 2));
})();
