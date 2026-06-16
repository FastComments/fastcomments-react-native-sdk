// Drives the system Chrome (headless) over the running example-web dev server
// to screenshot the seeded demo thread. Node-only (puppeteer-core).
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(ROOT, '..', 'demo-screenshots');
mkdirSync(OUT, { recursive: true });

const URL_ID = 'fastcomments-rn-showcase-v3';
const WIDTH = 430;

const shots = [
    // 'content' = tall viewport (so the virtualized list mounts every row) then
    // clip down to the actual thread height. 'viewport' = a phone-sized screen.
    // light/dark show the regular threaded commenting widget (widget=comments);
    // the default widget is now live chat, so we request comments explicitly.
    { name: 'light', query: `?urlId=${URL_ID}&sort=OF&widget=comments`, mode: 'content', height: 1700 },
    { name: 'dark', query: `?urlId=${URL_ID}&sort=OF&theme=dark&widget=comments`, mode: 'content', height: 1700 },
    { name: 'chat', query: `?urlId=${URL_ID}&widget=chat`, mode: 'viewport', height: 900 },
];

const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb'],
});

try {
    for (const shot of shots) {
        const page = await browser.newPage();
        await page.setViewport({ width: WIDTH, height: shot.height, deviceScaleFactor: 2 });
        const url = `http://localhost:5173/${shot.query}`;
        console.log(`-> ${shot.name}: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        // Wait for the seeded thread to actually render.
        await page.waitForFunction(
            () => {
                const t = document.body.innerText || '';
                return t.includes('Maya Chen') && t.includes('Sofia Rossi');
            },
            { timeout: 45000 }
        ).catch(() => console.log(`   (warning: thread text not detected for ${shot.name})`));
        // Give avatars (external) + layout a moment to settle.
        await new Promise((r) => setTimeout(r, 2500));
        const file = resolve(OUT, `${shot.name}.png`);
        if (shot.mode === 'content') {
            // Clip to the bottom of the comment list so the tall viewport's slack
            // isn't included.
            const bottom = await page.evaluate(() => {
                // The comment list/flex containers fill the viewport, so measure the
                // lowest *content* row (small elements) to find the real thread end.
                let max = 0;
                for (const el of document.querySelectorAll('body *')) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0 && r.height < 600 && r.bottom > max) max = r.bottom;
                }
                return Math.ceil(max);
            });
            await page.screenshot({ path: file, clip: { x: 0, y: 0, width: WIDTH, height: bottom + 16 } });
        } else {
            await page.screenshot({ path: file });
        }
        console.log(`   saved ${file}`);
        await page.close();
    }
} finally {
    await browser.close();
}
console.log('done');
