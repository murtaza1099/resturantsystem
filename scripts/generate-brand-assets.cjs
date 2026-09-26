#!/usr/bin/env node
// Regenerates every logo, icon, splash and favicon in the apps from brand/flippin-mark.svg.
// Usage: node scripts/generate-brand-assets.cjs   (needs Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')));
}

const ROOT = path.resolve(__dirname, '..');
const NAVY = '#0B1225';
const MARK = fs.readFileSync(path.join(ROOT, 'brand/flippin-mark.svg'), 'utf8')
  .replace(/width="100" height="120"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"');
const FONT = "'DejaVu Sans', Inter, Arial, sans-serif";

const page = (w, h, bg, body) => `<!doctype html><html><head><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${bg}}
  .c{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .m{display:block} .t{font-family:${FONT};font-weight:700;letter-spacing:-0.02em;line-height:1}
</style></head><body>${body}</body></html>`;

// Layouts
const mark = (w, h, pad = 0.06) => page(w, h, 'transparent',
  `<div class="c"><div class="m" style="width:${w * (1 - 2 * pad)}px;height:${h * (1 - 2 * pad)}px">${MARK}</div></div>`);

const icon = (w, h, label) => {
  const s = Math.min(w, h);
  const withText = s >= 150;
  const markH = withText ? s * 0.4 : s * 0.62;
  return page(w, h, NAVY, `<div class="c">
    <div class="m" style="width:${markH * 0.83}px;height:${markH}px">${MARK}</div>
    ${withText ? `<div class="t" style="color:#fff;font-size:${s * 0.11}px;margin-top:${s * 0.05}px">Flippin</div>` : ''}
    ${withText && label ? `<div class="t" style="color:#9BE870;font-size:${s * 0.045}px;letter-spacing:0.2em;margin-top:${s * 0.03}px">${label}</div>` : ''}
  </div>`);
};

const wordmark = (w, h, color) => page(w, h, 'transparent',
  `<div class="c"><div class="t" style="color:${color};font-size:${h * 0.82}px">Flippin</div></div>`);

const lockup = (w, h, color) => page(w, h, 'transparent',
  `<div class="c" style="flex-direction:row;gap:${h * 0.18}px">
    <div class="m" style="width:${h * 0.78}px;height:${h * 0.94}px">${MARK}</div>
    <div class="t" style="color:${color};font-size:${h * 0.66}px">Flippin</div></div>`);

const stacked = (w, h) => page(w, h, 'transparent', `<div class="c">
    <div class="m" style="width:${h * 0.45}px;height:${h * 0.54}px">${MARK}</div>
    <div class="t" style="color:${NAVY};font-size:${h * 0.2}px;margin-top:${h * 0.04}px">Flippin</div>
    <div class="t" style="color:#2E9E4F;font-size:${h * 0.07}px;font-weight:400;margin-top:${h * 0.02}px">Restaurant Management</div></div>`);

const splash = (w, h) => page(w, h, NAVY, `<div class="c">
    <div class="m" style="width:${w * 0.2}px;height:${w * 0.24}px">${MARK}</div>
    <div class="t" style="color:#fff;font-size:${w * 0.09}px;margin-top:${w * 0.04}px">Flippin</div></div>`);

const TARGETS = [
  // Web
  ['apps/web/lib/assets/flippin-logo.png', 360, 81, lockup(360, 81, NAVY)],
  ['apps/web/public/144.png', 144, 144, mark(144, 144)],
  ['apps/web/public/192.png', 192, 192, mark(192, 192)],
  ['apps/web/public/512.png', 512, 512, mark(512, 512)],
  ['apps/web/public/favicon.png', 128, 128, mark(128, 128, 0.02)],
  ['apps/web/public/favsicon.png', 32, 32, mark(32, 32, 0.02)],
  ['apps/web/public/splash-screen.png', 393, 852, splash(393, 852)],
  // Admin panels
  ...['admin', 'admin-single'].flatMap((a) => [
    [`apps/${a}/public/favicon.png`, 32, 32, mark(32, 32, 0.02)],
    [`apps/${a}/public/favsicons.png`, a === 'admin' ? 128 : 32, a === 'admin' ? 128 : 32, mark(a === 'admin' ? 128 : 32, a === 'admin' ? 128 : 32, 0.02)],
    [`apps/${a}/public/assets/images/png/logo.png`, 500, 499, mark(500, 499)],
  ]),
  // Customer app
  ['apps/customer/assets/icon.png', 1024, 1024, icon(1024, 1024)],
  ['apps/customer/assets/appIcon.png', 216, 216, icon(216, 216)],
  ['apps/customer/assets/Group1000003768.png', 43, 48, mark(43, 48, 0)],
  ['apps/customer/src/assets/images/logo.png', 701, 509, stacked(701, 509)],
  ['apps/customer/targets/widget/flippin-logo.png', 512, 512, mark(512, 512)],
  ...['flippin-logo.png', 'flippin-logo@2x.png', 'flippin-logo@3x.png'].map((f) =>
    [`apps/customer/targets/widget/Assets.xcassets/FlippinLogo.imageset/${f}`, 512, 512, mark(512, 512)]),
  // Rider and store apps
  ['apps/rider/lib/assets/images/icon.png', 1024, 1024, icon(1024, 1024, 'RIDER')],
  ['apps/rider/lib/assets/images/appIcon.png', 216, 216, icon(216, 216, 'RIDER')],
  ['apps/store/lib/assets/images/icon.png', 1024, 1024, icon(1024, 1024, 'STORE')],
  ['apps/store/lib/assets/images/appIcon.png', 216, 216, icon(216, 216, 'STORE')],
  // Animated splash pieces (pin + wordmarks) in every mobile app
  ...[
    'apps/customer/src/components/Splash/assets',
    'apps/customer/splash_claud_assets/flippin-animated-splash/assets',
    'apps/rider/lib/ui/useable-components/splash/assets',
    'apps/rider/splash_claud_assets/flippin-animated-splash/assets',
    'apps/store/lib/ui/useable-components/splash/assets',
  ].flatMap((d) => [
    [`${d}/pin.png`, 632, 834, mark(632, 834, 0)],
    [`${d}/wordmarkNavy.png`, 461, 77, wordmark(461, 77, NAVY)],
    [`${d}/wordmarkWhite.png`, 461, 77, wordmark(461, 77, '#FFFFFF')],
  ]),
];

// iOS widget app icon set: size comes from the file name (e.g. App-Icon-40x40@3x.png)
const iconSetDir = 'apps/customer/targets/widget/Assets.xcassets/AppIcon.appiconset';
for (const f of fs.readdirSync(path.join(ROOT, iconSetDir)).filter((n) => n.endsWith('.png'))) {
  const m = f.match(/(\d+(?:\.\d+)?)x\d+(?:\.\d+)?@(\d)x/);
  const px = m ? Math.round(parseFloat(m[1]) * Number(m[2])) : 1024;
  TARGETS.push([`${iconSetDir}/${f}`, px, px, icon(px, px)]);
}

// .ico files hold one PNG image (supported by all current browsers)
const ICOS = ['apps/web/public/favicon.ico', 'apps/web/app/(localized)/favicon.ico',
  'apps/admin/app/(localized)/favicon.ico', 'apps/admin-single/app/(localized)/favicon.ico'];

const toIco = (png, size) => {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header.writeUInt8(size >= 256 ? 0 : size, 6); header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const shot = async (w, h, html) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(html);
    return p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  };
  for (const [rel, w, h, html] of TARGETS) {
    fs.writeFileSync(path.join(ROOT, rel), await shot(w, h, html));
    console.log('wrote', rel);
  }
  const icoPng = await shot(64, 64, mark(64, 64, 0.02));
  for (const rel of ICOS) {
    fs.writeFileSync(path.join(ROOT, rel), toIco(icoPng, 64));
    console.log('wrote', rel);
  }
  await browser.close();
})();
