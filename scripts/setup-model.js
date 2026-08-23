#!/usr/bin/env node
import fs from 'fs';
import {spawnSync} from 'child_process';
import https from 'https';
import {basename} from 'path';
import {URL} from 'url';

const AUTO = process.env.AUTO_YES === '1' || process.argv.includes('--yes');
const MODEL_URL = process.env.MODEL_URL || null;
const MODEL_DIR = 'models';

function info(...args){ console.log('[setup-model]', ...args); }
function error(...args){ console.error('[setup-model]', ...args); }

async function download(url, dest){
  return new Promise((resolve, reject) => {
    try{
      const u = new URL(url);
      const filename = basename(u.pathname) || 'model.bin';
      const outPath = dest + '/' + filename;
      info('Downloading', url, '->', outPath);
      const file = fs.createWriteStream(outPath);
      const req = https.get(u, res => {
        if(res.statusCode >= 300 && res.statusCode < 400 && res.headers.location){
          // redirect
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if(res.statusCode !== 200){
          reject(new Error('Download failed: ' + res.statusCode));
          return;
        }
        const total = Number(res.headers['content-length'] || 0);
        let received = 0;
        res.on('data', chunk => { received += chunk.length; if(total) process.stdout.write(`\r${Math.round((received/total)*100)}%`); });
        res.pipe(file);
        file.on('finish', () => { file.close(()=>{ if(total) process.stdout.write('\n'); resolve(outPath); }); });
      });
      req.on('error', err => { fs.unlink(outPath, ()=>{}); reject(err); });
    }catch(err){ reject(err); }
  });
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true}); }

async function main(){
  info('Starting postinstall model setup');
  ensureDir(MODEL_DIR);

  // create .env template if missing
  const envPath = '.env';
  if(!fs.existsSync(envPath)){
    const tpl = `# Environment template for CAT Tracker\nMODEL_PATH=./${MODEL_DIR}/<your-model-file>\nMODEL_TYPE=llama3.2:3b\n# Set MODEL_URL to auto-download during postinstall\n# MODEL_URL=https://example.com/path/to/model.bin\n`;
    fs.writeFileSync(envPath, tpl);
    info('Wrote .env template. Please edit it with your model path or set MODEL_URL.');
  }

  // If MODEL_URL provided, optionally download
  if(MODEL_URL){
    if(!AUTO){
      info('MODEL_URL is set but this script is not running in auto mode. Skipping download.');
      info('To auto-download set environment variable AUTO_YES=1 or pass --yes');
    } else {
      try{
        await download(MODEL_URL, MODEL_DIR);
        info('Model download complete.');
      }catch(err){ error('Model download failed:', err.message); }
    }
  }else{
    info('No MODEL_URL provided. Skipping automatic download.');
  }

  // Install python requirements if present
  const reqFiles = ['requirements.txt', 'server/requirements.txt'];
  for(const rf of reqFiles){
    if(fs.existsSync(rf)){
      info('Found', rf);
      if(!AUTO){ info('Skipping pip install (not in auto mode). To enable set AUTO_YES=1'); }
      else{
        info('Installing Python packages from', rf);
        const r = spawnSync('python', ['-m','pip','install','-r',rf], {stdio:'inherit'});
        if(r.status !== 0) error('pip install failed for', rf);
      }
    }
  }

  // Optional runtime setup: llama.cpp
  const runtime = process.env.LLM_RUNTIME || '';
  if(runtime === 'llama.cpp'){
    const dest = 'runtimes/llama.cpp';
    if(!fs.existsSync(dest)){
      if(!AUTO){ info('LLM_RUNTIME=llama.cpp requested but not in auto mode. Skipping clone.'); }
      else{
        info('Cloning llama.cpp into', dest);
        const r = spawnSync('git', ['clone','https://github.com/ggerganov/llama.cpp.git', dest], {stdio:'inherit'});
        if(r.status !== 0) error('git clone failed');
        else{
          info('Building llama.cpp (make)');
          const r2 = spawnSync('make', [], {cwd:dest, stdio:'inherit'});
          if(r2.status !== 0) error('make failed for llama.cpp');
        }
      }
    }
  }

  // Optionally run npm build
  if(process.env.RUN_BUILD === '1'){
    info('RUN_BUILD=1 set; running `npm run build`');
    const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run','build'], {stdio:'inherit'});
    if(r.status !== 0) error('npm run build failed');
  }

  info('Postinstall model setup finished. Check MODEL_SETUP.md for next steps.');
}

main().catch(err => { error(err); process.exit(1); });
