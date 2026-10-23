const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT_DIR = '.expo/icons';
const SIZE = 1024;
// Android launchers crop the adaptive icon to as little as a 66dp circle of the 108dp canvas.
const ANDROID_SAFE_RADIUS = (33 / 108) * SIZE * 0.98;

/**
 * Makes every app icon from one SVG, so the SVG is the only file to edit.
 * Expo only reads PNGs, so this renders them into .expo/icons/ (git-ignored)
 * whenever the config is read, and skips the work if neither the SVG nor this
 * file changed:
 * - the iOS icon, as a full square (iOS rounds the corners itself)
 * - Android's adaptive icon: background, foreground and themed-icon layers
 * - the web favicon
 *
 * The SVG must be 1024×1024 with its background in one element with
 * id="bg" (a layer named "bg"). A clip-path around the whole drawing, such as
 * rounded corners, is left out of the iOS and Android icons.
 */
module.exports = function withSvgIcon(config, { svg } = {}) {
  const projectRoot = config._internal?.projectRoot ?? process.cwd();
  const svgPath = path.resolve(projectRoot, svg ?? './assets/icon.svg');
  const out = (name) => `./${OUT_DIR}/${name}`;
  renderIcons(svgPath, path.join(projectRoot, OUT_DIR));

  config.icon = out('icon.png');
  config.android = {
    ...config.android,
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      foregroundImage: out('android-foreground.png'),
      backgroundImage: out('android-background.png'),
      monochromeImage: out('android-monochrome.png'),
    },
  };
  config.web = { ...config.web, favicon: out('favicon.png') };
  return config;
};

const FILES = ['icon.png', 'android-foreground.png', 'android-background.png', 'android-monochrome.png', 'favicon.png'];

function renderIcons(svgPath, outDir) {
  const source = fs.readFileSync(svgPath, 'utf8');
  const stamp = crypto.createHash('sha256').update(source).update(fs.readFileSync(__filename)).digest('hex');
  const stampPath = path.join(outDir, 'stamp');
  const upToDate =
    fs.existsSync(stampPath) &&
    fs.readFileSync(stampPath, 'utf8') === stamp &&
    FILES.every((file) => fs.existsSync(path.join(outDir, file)));
  if (upToDate) return;

  if (!/<[a-zA-Z]+\s[^>]*\bid="bg"[^>]*\/>/.test(source)) {
    throw new Error(`${svgPath} needs its background in one element with id="bg".`);
  }
  // The clip-path on the element that holds the background clips the whole drawing.
  const full = source.replace(/\sclip-path="url\(#[^)]*\)"(?=[^]*?id="bg")/, '');
  const art = full.replace(/<[a-zA-Z]+\s[^>]*\bid="bg"[^>]*\/>/, '');
  const background = wrap(full, '<defs>', '</defs><use href="#bg"/>');

  // Shrink the art just enough to fit Android's safe circle.
  const scale = Math.min(1, ANDROID_SAFE_RADIUS / farthestPixel(art));
  const offset = (SIZE * (1 - scale)) / 2;
  const shrink = (filter = '') =>
    wrap(art, `<g transform="translate(${offset} ${offset}) scale(${scale})"${filter}>`, '</g>');

  fs.mkdirSync(outDir, { recursive: true });
  const write = (file, svgText, width) =>
    fs.writeFileSync(path.join(outDir, file), render(svgText, width).asPng());
  write('icon.png', full, SIZE);
  write('android-background.png', background, 512);
  write('android-foreground.png', shrink(), 512);
  // Android tints only the alpha of the themed icon: keep the light parts, drop the dark ones.
  write(
    'android-monochrome.png',
    wrap(shrink(' filter="url(#themedIcon)"'), '', MONOCHROME_FILTER),
    512
  );
  write('favicon.png', source, 48);
  fs.writeFileSync(stampPath, stamp);
}

// Alpha = 4 × luminance − 1 (so dark navy disappears and light colours stay), cut to the art's own edges.
const MONOCHROME_FILTER = `<filter id="themedIcon" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">
  <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.8504 2.8608 0.2888 0 -1"/>
  <feComposite in2="SourceAlpha" operator="in"/>
</filter>`;

/** Inserts markup just inside the root <svg> element, keeping its attributes (such as fill-rule). */
function wrap(svgText, start, end) {
  const close = svgText.lastIndexOf('</svg>');
  return (svgText.slice(0, close) + end + svgText.slice(close)).replace(/<svg\b[^>]*>/, (tag) => tag + start);
}

function render(svgText, width) {
  return new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render();
}

/** Distance, in 1024-canvas pixels, from the centre to the farthest visible pixel. */
function farthestPixel(svgText) {
  const size = 256;
  const { pixels } = render(svgText, size);
  let farthest = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (pixels[(y * size + x) * 4 + 3] > 8) {
        farthest = Math.max(farthest, Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2));
      }
    }
  }
  return (farthest * SIZE) / size;
}
