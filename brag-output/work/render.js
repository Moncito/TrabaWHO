// usage: node render.js stills <t...>  |  node render.js video [posterT]
const path = require('path'), fs = require('fs'), { spawn } = require('child_process'), { pathToFileURL } = require('url');
const req = require('module').createRequire(process.env.RENDER_DEPS + '/package.json');
const puppeteer = req('puppeteer-core'), ffmpeg = req('ffmpeg-static');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = path.resolve(__dirname, '..');
const [mode = 'video', ...rest] = process.argv.slice(2);

(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(path.join(__dirname, 'scene.html')).href);
  console.log('shards:', await p.evaluate(() => window.ready));
  const shot = async t => { await p.evaluate(t => draw(t), t); return p.screenshot({ type: 'png' }); };

  if (mode === 'stills') {
    const dir = path.join(__dirname, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const t of rest.map(Number)) fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.png`), await shot(t));
  } else {
    const posterT = Number(rest[0] ?? 9);
    const poster = await shot(posterT);
    fs.writeFileSync(path.join(__dirname, 'poster.png'), poster);
    const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'brag.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < 300; f++) {
      const buf = f === 0 ? poster : await shot(f / 30); // frame 0 = poster, so thumbnails show the settled title
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 0) console.log('frame', f);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    await new Promise(r => spawn(ffmpeg, ['-y', '-i', path.join(__dirname, 'poster.png'), '-q:v', '2', path.join(OUT, 'brag.jpg')], { stdio: 'ignore' }).on('close', r));
  }
  await b.close();
})();
