// @ts-nocheck
import bedrockProtocol from 'bedrock-protocol'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TARGET_PLAYER = '!Pranav123237'
const SERVER_HOST = 'blockbande.de'
const SERVER_PORT = 19132
const CACHE_FILES = ['da39a3_live-cache.json', 'da39a3_xbl-cache.json', 'da39a3_bed-cache.json']

// Account-Index aus Umgebungsvariable (0 = erster Account)
const ACCOUNT_INDEX = parseInt(process.env.BOT_ACCOUNT_INDEX ?? '0', 10)
const AUTH_CACHE_DIR = path.join(__dirname, `../../.auth-cache/account-${ACCOUNT_INDEX}`)

const BOT_LABEL = `[Bot #${ACCOUNT_INDEX + 1}]`

let reconnectDelay = 5_000
const MAX_RECONNECT_DELAY = 30_000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let hasLoggedIn = false
let currentClient: ReturnType<typeof bedrockProtocol.createClient> | null = null

// ─── Auth aus Umgebungsvariable laden ─────────────────────────────────────────
function loadAuthFromEnv() {
  const raw = process.env.MS_AUTH_CACHE
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw)

    // Neues Format: Array von Accounts
    let accountData: Record<string, unknown>
    if (Array.isArray(parsed)) {
      if (ACCOUNT_INDEX >= parsed.length) {
        console.warn(`${BOT_LABEL} ⚠️  Account-Index ${ACCOUNT_INDEX} existiert nicht (nur ${parsed.length} Accounts).`)
        return false
      }
      accountData = parsed[ACCOUNT_INDEX] as Record<string, unknown>
    } else {
      // Altes Format: einzelner Account (nur für Bot #1)
      if (ACCOUNT_INDEX > 0) {
        console.warn(`${BOT_LABEL} ⚠️  Altes MS_AUTH_CACHE-Format — nur 1 Account verfügbar.`)
        return false
      }
      accountData = parsed
    }

    fs.mkdirSync(AUTH_CACHE_DIR, { recursive: true })
    for (const [filename, content] of Object.entries(accountData)) {
      fs.writeFileSync(path.join(AUTH_CACHE_DIR, filename), JSON.stringify(content))
    }
    console.log(`${BOT_LABEL} ✅ Auth-Token geladen.`)
    return true
  } catch (e) {
    console.warn(`${BOT_LABEL} ⚠️  MS_AUTH_CACHE ungültig:`, (e as Error).message)
    return false
  }
}

// ─── Auth-Daten ausgeben ───────────────────────────────────────────────────────
function printAuthCache() {
  const result: Record<string, unknown> = {}
  for (const file of CACHE_FILES) {
    const filePath = path.join(AUTH_CACHE_DIR, file)
    if (fs.existsSync(filePath)) {
      try { result[file] = JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch {}
    }
  }
  if (Object.keys(result).length > 0) {
    console.log(`\n${BOT_LABEL} ════ Auth-Cache (Account #${ACCOUNT_INDEX + 1}) ════`)
    console.log(JSON.stringify(result))
    console.log('════════════════════════════════════════════════\n')
  }
}

// ─── Reconnect planen ──────────────────────────────────────────────────────────
function scheduleReconnect(reason?: string) {
  if (reconnectTimer) return
  if (currentClient) {
    try { currentClient.end?.() } catch {}
    currentClient = null
  }
  const delay = reconnectDelay
  console.log(`${BOT_LABEL} 🔄 Reconnect in ${delay / 1000}s ...${reason ? ` (${reason})` : ''}`)
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

// ─── Verbinden ────────────────────────────────────────────────────────────────
function connect() {
  console.log(`\n${BOT_LABEL} 🤖 Verbinde mit ${SERVER_HOST}:${SERVER_PORT} ...`)

  let client: ReturnType<typeof bedrockProtocol.createClient>
  try {
    client = bedrockProtocol.createClient({
      host: SERVER_HOST,
      port: SERVER_PORT,
      offline: false,
      raknetBackend: 'jsp-raknet',
      profilesFolder: AUTH_CACHE_DIR,
    })
  } catch (err: unknown) {
    console.error(`${BOT_LABEL} ❌ Client-Fehler:`, (err as Error).message)
    scheduleReconnect('Client-Fehler')
    return
  }

  currentClient = client

  function sendCommand(cmd: string) {
    try {
      client.queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: '',
        xuid: '',
        platform_chat_id: '',
        message: cmd,
      })
      console.log(`${BOT_LABEL} ✅ Gesendet: ${cmd}`)
    } catch (err: unknown) {
      console.error(`${BOT_LABEL} ❌ Senden fehlgeschlagen:`, (err as Error).message)
    }
  }

  client.on('join', () => {
    reconnectDelay = 5_000
    console.log(`${BOT_LABEL} ✅ Eingeloggt auf ${SERVER_HOST}.`)
    setTimeout(() => {
      console.log(`${BOT_LABEL} 🏠 Teleportiere zu Home...`)
      sendCommand('/home 1')
    }, 3_000)
    if (!hasLoggedIn) {
      hasLoggedIn = true
      setTimeout(printAuthCache, 5000)
    }
  })

  client.on('text', (packet: { source_name: string; message: string }) => {
    const { source_name, message } = packet
    if (source_name) console.log(`${BOT_LABEL} [Chat] ${source_name}: ${message}`)

    if (message?.trim() === '!home') {
      console.log(`${BOT_LABEL} 🏠 !home von ${source_name} — setze /sethome 1`)
      setTimeout(() => sendCommand('/sethome 1'), 500)
      return
    }

    if (source_name === TARGET_PLAYER) {
      console.log(`${BOT_LABEL} 🎯 Nachricht von ${TARGET_PLAYER}!`)
      setTimeout(() => sendCommand(`/tpa ${TARGET_PLAYER}`), 500)
    }
  })

  client.on('disconnect', (packet: { message: string }) => {
    console.log(`\n${BOT_LABEL} ❌ Getrennt: ${packet?.message ?? 'Unbekannt'}`)
    scheduleReconnect(packet?.message)
  })

  client.on('error', (err: Error) => {
    console.error(`${BOT_LABEL} ❌ Fehler: ${err.message}`)
    scheduleReconnect(err.message)
  })
}

// ─── Start ────────────────────────────────────────────────────────────────────
console.log(`${BOT_LABEL} 🤖 Minecraft Bedrock AFK-Bot gestartet`)
console.log(`${BOT_LABEL} 🎯 Ziel: ${TARGET_PLAYER} auf ${SERVER_HOST}`)

if (loadAuthFromEnv()) {
  connect()
} else {
  console.error(`${BOT_LABEL} ❌ Kein gültiger Auth-Token — Bot beendet.`)
  process.exit(1)
}
