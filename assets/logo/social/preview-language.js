(() => {
  const base = new URL('./', document.currentScript.src);
  window.TopicPreviewLanguage = fetch(new URL('translations.json',base)).then(r => r.json()).then(translations => {
    const query = new URLSearchParams(location.search).get('lang');
    const detected = [query,...(navigator.languages || []),navigator.language,'en'].filter(Boolean).map(v => v.toLowerCase().split('-')[0]).find(v => translations[v]) || 'en';
    const selector = document.getElementById('language');
    for (const [code,copy] of Object.entries(translations)) {
      const option = document.createElement('option'); option.value = code; option.textContent = copy.name; selector.append(option);
    }
    selector.value = detected;
    function apply() {
      const language = selector.value;
      const copy = translations[language];
      document.documentElement.lang = language;
      document.querySelectorAll('[data-i18n]').forEach(node => node.textContent = copy[node.dataset.i18n] || translations.en[node.dataset.i18n]);
      document.title = 'topic.earth · ' + (document.body.dataset.preview === 'original' ? copy.set : copy.library);
      document.querySelectorAll('object[data-svg]').forEach(node => {
        const url = new URL(node.dataset.svg,location.href); url.searchParams.set('lang',language); node.data = url.href;
      });
      document.querySelectorAll('a[data-svg]').forEach(node => {
        const url = new URL(node.dataset.svg,location.href); url.searchParams.set('lang',language); node.href = url.href;
      });
      window.dispatchEvent(new CustomEvent('socialLanguageChanged',{detail:{language,copy}}));
    }
    selector.addEventListener('change',apply);
    apply();
    return {translations,get language(){return selector.value;},get copy(){return translations[selector.value];},apply};
  });
})();
