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
  navigator.clipboard.writeText(event.target.innerText);
  event.preventDefault();

  const bubble = document.createElement('span');
  bubble.ariaHidden = "true";
  bubble.innerText = event.target.innerText;
  bubble.classList.add('copy-anim');

  const rect = event.target.getClientRects()[0];
  bubble.style.left = rect.x + window.scrollX + 'px';
  bubble.style.top = rect.y + window.scrollY + 'px';
  bubble.style.fontSize = getComputedStyle(event.target).fontSize;

  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1000);
}

function preventAccidentalSelect(event) {
  if (event.detail > 1) {
    window.getSelection().removeAllRanges();
    event.preventDefault();
  }
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

export function updateFont(font) {
  font = font.trim();
  if (font === "") font = "Cascadia Code";

  const stylesheet = document.styleSheets[0];
  const rule = [...stylesheet.cssRules].find(r => r.selectorText === ":root");
  rule.style.fontFamily = makeFontStack(font);
}

updateFont(document.getElementById('fontbox').value);

