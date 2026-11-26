#!/usr/bin/env node
/**
 * Génère les captures d'écran du dossier DevOps (docs/devops/preuves/) avec le Chromium de Playwright.
 *
 *   node scripts/preuves/capture.mjs url <url> <sortie.png> [--full] [--width=1440] [--height=900] [--wait=<ms>]
 *   node scripts/preuves/capture.mjs terminal <fichier.txt|-> <sortie.png> [--title="…"]
 *
 * Mode « url »      : photographie une page (GitHub, application déployée…).
 * Mode « terminal » : met en forme une sortie de commande (fichier ou entrée standard) façon terminal.
 * Prérequis : dépendances du client installées (cd client && npm ci && npx playwright install chromium).
 */
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(resolve(root, 'client', 'package.json'))
const { chromium } = require('@playwright/test')

const [mode, source, output, ...rest] = process.argv.slice(2)
const opts = Object.fromEntries(rest.map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=')
  return [k, v.length ? v.join('=') : true]
}))

if (!['url', 'terminal'].includes(mode) || !source || !output) {
  console.error('Usage : capture.mjs url <url> <sortie.png> | terminal <fichier|-> <sortie.png> [--title=…]')
  process.exit(2)
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Retire les séquences de couleur ANSI des sorties de commandes.
const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')

const terminalHtml = (text, title) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 24px; background: #e8eaed; font-family: system-ui, sans-serif; }
  .win { background: #1e1e2e; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.25); overflow: hidden; display: inline-block; min-width: 900px; max-width: 1600px; }
  .bar { background: #313244; color: #cdd6f4; padding: 8px 14px; font-size: 13px; display: flex; gap: 8px; align-items: center; }
  .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  pre { margin: 0; padding: 16px 20px; color: #cdd6f4; font: 13px/1.45 Consolas, 'Cascadia Mono', monospace; white-space: pre-wrap; word-break: break-word; }
</style></head><body><div class="win"><div class="bar">
  <span class="dot" style="background:#f38ba8"></span><span class="dot" style="background:#f9e2af"></span>
  <span class="dot" style="background:#a6e3a1"></span><span style="margin-left:8px">${escapeHtml(title)}</span>
</div><pre>${escapeHtml(text)}</pre></div></body></html>`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: Number(opts.width) || 1440, height: Number(opts.height) || 900 },
    deviceScaleFactor: 1,
    locale: 'fr-FR',
  })
  mkdirSync(dirname(resolve(output)), { recursive: true })
  if (mode === 'url') {
    await page.goto(source, { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(Number(opts.wait) || 2500) // laisse les contenus dynamiques s'afficher
    await page.screenshot({ path: output, fullPage: Boolean(opts.full) })
  } else {
    const raw = source === '-' ? readFileSync(0, 'utf8') : readFileSync(source, 'utf8')
    await page.setContent(terminalHtml(stripAnsi(raw).trimEnd(), opts.title || 'Terminal'))
    await page.locator('.win').screenshot({ path: output })
  }
  console.log(`Capture enregistrée : ${output}`)
} finally {
  await browser.close()
}
