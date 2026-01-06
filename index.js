import { render, buildWAV } from "./render.js"

const getElements = tag => [...document.getElementsByTagName(tag)];

for (const code of getElements('code')) {
  const container = document.createElement('div');

  const input = document.createElement('input');
  input.value = code.innerText;

  const button = document.createElement('button');
  button.innerText = '▶ play';

  container.appendChild(button);
  container.appendChild(input);

  code.after(container);
  code.remove();

  button.addEventListener('click', () => play(input.value));
}

function copyText(event) {
  const text = event.target.innerText;

  navigator.clipboard.writeText(text);
  event.preventDefault();

  const textbox = document.activeElement;
  if (textbox instanceof HTMLTextAreaElement || textbox instanceof HTMLInputElement) {
    textbox.setRangeText(text, textbox.selectionStart, textbox.selectionEnd, 'end');
  }

  const bubble = document.createElement('span');
  bubble.ariaHidden = "true";
  bubble.innerText = text;
  bubble.classList.add('copy-anim');

  const rect = event.target.getClientRects()[0];
  bubble.style.left = rect.x + window.scrollX + 'px';
  bubble.style.top = rect.y + window.scrollY + 'px';
  bubble.style.fontSize = getComputedStyle(event.target).fontSize;

  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1000);
}

function preventAccidentalSelect(event) {
  window.getSelection().removeAllRanges();
  event.preventDefault();
}

for (const mark of getElements('mark')) {
  mark.addEventListener('click', copyText);
  mark.addEventListener('mousedown', preventAccidentalSelect);
}

const audioElem = document.getElementsByTagName('audio')[0];

export async function play(score_text) {
  const samples = await render(score_text);
  audioElem.src = URL.createObjectURL(buildWAV(samples, 48000));
  audioElem.play();
}


document.addEventListener('click', event => {
  const settingsBox = document.getElementById('visual-settings');
  const toggle = document.getElementById('show-visual-settings');

  if (!settingsBox.contains(event.target) && !toggle.parentElement.contains(event.target)) {
    toggle.checked = false;
  }
});

let localFontsAdded = false;
export async function addLocalFonts(datalist) {
  if (localFontsAdded) return;
  if (!("queryLocalFonts" in window)) return;

  let fonts;
  try {
    fonts = await window.queryLocalFonts();
  } catch {
    return;
  }

  const families = new Set();
  for (const font of fonts) {
    families.add(font.family);
  }

  for (const family of families) {
    const option = document.createElement('option');
    option.value = family;
    datalist.appendChild(option);
  }

  localFontsAdded = true;
}

function makeFontStack(font) {
  switch (font) {
    case 'sans-serif':
      return font;

    case 'monospace':
    case 'serif': 
      return `${font}, sans-serif`;

    case 'Cascadia Code':
      return `'Cascadia Code', monospace, sans-serif`;

    default:
      if (font.includes(' ')) font = `'${font}'`;
      return `${font}, 'Cascadia Code', monospace, sans-serif`;
  }
}

function getRootStyleRule() {
  const stylesheet = document.styleSheets[0];
  return [...stylesheet.cssRules].find(r => r.selectorText === ":root");
}

export function updateFont(font) {
  font = font.trim();
  if (font === "") font = "Cascadia Code";
  getRootStyleRule().style.fontFamily = makeFontStack(font);
}

export function updateFontSize(size) {
  size = +(size || 16);
  if (size < 4) size = 4;
  getRootStyleRule().style.fontSize = size + "px";
}

updateFont(document.getElementById('fontbox').value);
updateFontSize(document.getElementById('sizebox').value);

function anchorify(heading) {
  const link = document.createElement('a');
  link.href = '#' + heading.id;
  for (const child of [...heading.childNodes]) {
    link.appendChild(child);
  }
  heading.appendChild(link);
}

for (const elem of document.querySelectorAll('[id]:is(h2, h3, h4)')) {
  anchorify(elem);
}
