"""Embed browser-language detection and six translations in portable SVGs."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/logo/social'
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('html','http://www.w3.org/1999/xhtml')
ET.register_namespace('xlink','http://www.w3.org/1999/xlink')

def localize_svg(path):
    root = ET.parse(path).getroot()
    script = root.find(f'{{{SVG}}}script')
    if script is None:
        return
    dictionary = json.loads((BASE / 'translations.json').read_text(encoding='utf-8'))
    original = script.text.split('// topic-earth-social-i18n')[0]
    script.text = original + '\n// topic-earth-social-i18n\n' + '''(() => {
  const translations = DICTIONARY;
  const requested = new URLSearchParams(location.search).get('lang');
  const codes = [requested, ...(navigator.languages || []), navigator.language, 'en'].filter(Boolean).map(value => value.toLowerCase().split('-')[0]);
  const language = codes.find(code => translations[code]) || 'en';
  const copy = translations[language];
  const root = document.documentElement;
  root.setAttribute('lang', language);
  root.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', language);
  function fit(node, width, size) {
    if (!node) return;
    node.style.fontSize = size + 'px';
    const measured = node.getComputedTextLength();
    if (measured > width) node.style.fontSize = (size * width / measured) + 'px';
  }
  function apply() {
    const mode = copy.modes[root.getAttribute('data-theme') || 'world'];
    const label = document.getElementById('modeLabel');
    const square = label && label.classList.contains('mode');
    const values = {modeLabel:square ? mode.short : mode.label, headline:mode.title, infoLineA:mode.a, infoLineB:mode.b};
    for (const [id, value] of Object.entries(values)) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }
    document.querySelectorAll('.chip-text').forEach((node, i) => {
      node.textContent = copy.chips[i]; fit(node, i === 3 ? 122 : 98, 18);
    });
    fit(label, square ? 174 : 305, square ? 15 : 18);
    fit(document.getElementById('headline'), 640, 42);
    fit(document.getElementById('infoLineA'), 640, 21);
    fit(document.getElementById('infoLineB'), 640, 18);
    const description = root.querySelector('desc');
    if (description) description.textContent = mode.title + '. ' + copy.earthClock;
  }
  new MutationObserver(apply).observe(root, {attributes:true,attributeFilter:['data-theme']});
  apply();
  if (document.fonts) document.fonts.ready.then(apply);
  window.TopicSocialLanguage = {language,apply};
})();'''.replace('DICTIONARY',json.dumps(dictionary,ensure_ascii=False,separators=(',',':')))
    ET.ElementTree(root).write(path,encoding='utf-8',xml_declaration=True)

if __name__ == '__main__':
    paths = list((ROOT / 'assets/logo/local').glob('*.svg')) + list((BASE / 'formats').glob('*.svg'))
    for path in paths:
        localize_svg(path)
    print(f'Localized {len(paths)} SVGs: en, fr, nl, de, ru, zh, hi.')
