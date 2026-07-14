/**
 * Filão — coletor de contagem de anúncios da Biblioteca de Anúncios da Meta.
 * Abre cada link, lê o texto de resultados que a própria Meta exibe e grava no histórico.
 * Não estima nada: registra o número que aparece na tela.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DIR = path.resolve('data');
const ANUNCIANTES = path.join(DIR, 'anunciantes.json');
const HISTORICO = path.join(DIR, 'historico.json');

const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
const dorme = ms => new Promise(r => setTimeout(r, ms));

/** Extrai o número de "~1,200 results", "1,200 results", "1 result", "~1.2K results" */
function extrairNumero(texto) {
  if (!texto) return null;
  const t = texto.replace(/\u00a0/g, ' ').trim();

  const kk = t.match(/~?\s*([\d.,]+)\s*([KkMm])\s*(results?|resultados?|anúncios?)/i);
  if (kk) {
    const base = parseFloat(kk[1].replace(/\./g, '').replace(',', '.'));
    const mult = /[Kk]/.test(kk[2]) ? 1000 : 1000000;
    return Math.round(base * mult);
  }
  const n = t.match(/~?\s*([\d.,]+)\s*(results?|resultados?|anúncios?)/i);
  if (n) {
    const limpo = n[1].replace(/[.,]/g, '');
    const v = parseInt(limpo, 10);
    if (!isNaN(v)) return v;
  }
  if (/no results|nenhum resultado|0 result/i.test(t)) return 0;
  return null;
}

async function contar(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Aceita o banner de cookies, se aparecer.
  for (const rot of ['Allow all cookies', 'Permitir todos os cookies', 'Accept all', 'Only allow essential cookies']) {
    const b = page.getByRole('button', { name: rot });
    if (await b.count().catch(() => 0)) { await b.first().click().catch(() => {}); break; }
  }

  // A contagem aparece depois que os resultados carregam.
  const re = /(results?|resultados?)/i;
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    await dorme(2500);
    const textos = await page.locator('div,span,h1,h2').filter({ hasText: re })
      .allTextContents().catch(() => []);
    const candidatos = textos
      .map(t => t.trim())
      .filter(t => t.length < 60 && re.test(t))
      .map(extrairNumero)
      .filter(v => v !== null);
    if (candidatos.length) return candidatos[0];
    await page.mouse.wheel(0, 600).catch(() => {});
  }
  return null;
}

async function main() {
  const anunciantes = JSON.parse(fs.readFileSync(ANUNCIANTES, 'utf8'));
  let historico = { atualizadoEm: null, anunciantes: {} };
  if (fs.existsSync(HISTORICO)) historico = JSON.parse(fs.readFileSync(HISTORICO, 'utf8'));
  if (!historico.anunciantes) historico.anunciantes = {};

  const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
  });
  const page = await ctx.newPage();

  const data = hoje();
  let ok = 0, falhas = 0;

  for (const a of anunciantes) {
    let valor = null;
    for (let t = 1; t <= 2 && valor === null; t++) {
      try { valor = await contar(page, a.url); }
      catch (e) { console.log(`  erro (${t}): ${e.message}`); }
      if (valor === null) await dorme(4000);
    }

    const reg = historico.anunciantes[a.id] || { ...a, leituras: [] };
    reg.name = a.name; reg.url = a.url; reg.tag = a.tag || ''; reg.notes = a.notes || '';

    if (valor !== null) {
      reg.leituras = reg.leituras.filter(l => l.date !== data);
      reg.leituras.push({ date: data, count: valor, source: 'auto' });
      reg.leituras.sort((x, y) => (x.date < y.date ? -1 : 1));
      ok++;
      console.log(`✓ ${a.name}: ${valor} anúncios`);
    } else {
      falhas++;
      console.log(`✗ ${a.name}: não consegui ler a contagem`);
    }
    historico.anunciantes[a.id] = reg;
    await dorme(3000 + Math.random() * 3000); // ritmo humano, evita bloqueio
  }

  historico.atualizadoEm = new Date().toISOString();
  fs.writeFileSync(HISTORICO, JSON.stringify(historico, null, 2));
  await browser.close();
  console.log(`\nColeta de ${data}: ${ok} lidos, ${falhas} falharam.`);
}

main().catch(e => { console.error(e); process.exit(1); });
