import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/status", (_req, res) => {
  const html = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AFK Bot Status</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f0f1a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }

    .minecraft-icon { font-size: 36px; }

    h1 { font-size: 22px; font-weight: 700; color: #fff; }
    h1 span { color: #7c6af7; }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #12122a;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      border: 1px solid #2a2a4a;
    }

    .dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .dot.offline { background: #f87171; box-shadow: 0 0 8px #f87171; }
    .dot.pinging { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: pulse 0.5s infinite; }

    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

    .status-text { font-size: 15px; font-weight: 600; }
    .status-sub { font-size: 12px; color: #888; margin-top: 2px; }

    .countdown {
      text-align: center;
      margin-bottom: 20px;
    }

    .countdown-ring {
      position: relative;
      width: 120px; height: 120px;
      margin: 0 auto 12px;
    }

    .countdown-ring svg { transform: rotate(-90deg); }

    .countdown-ring circle {
      fill: none;
      stroke-width: 6;
    }

    .ring-bg { stroke: #2a2a4a; }
    .ring-fill {
      stroke: #7c6af7;
      stroke-linecap: round;
      stroke-dasharray: 339.3;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 1s linear;
    }

    .countdown-number {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }

    .countdown-label { font-size: 13px; color: #888; }

    .ping-btn {
      width: 100%;
      background: #7c6af7;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 20px;
      transition: background 0.2s;
    }
    .ping-btn:hover { background: #6a58e5; }
    .ping-btn:active { background: #5a48d5; }

    .log-title { font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }

    .log {
      background: #12122a;
      border-radius: 10px;
      padding: 12px;
      max-height: 180px;
      overflow-y: auto;
      font-size: 12px;
      font-family: monospace;
    }

    .log-entry {
      padding: 4px 0;
      border-bottom: 1px solid #1e1e3a;
      display: flex;
      gap: 8px;
    }
    .log-entry:last-child { border-bottom: none; }
    .log-time { color: #555; flex-shrink: 0; }
    .log-ok { color: #4ade80; }
    .log-err { color: #f87171; }

    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #444; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="minecraft-icon">⛏️</span>
      <div>
        <h1>Minecraft <span>AFK Bot</span></h1>
        <div style="font-size:13px;color:#666;">blockbande.de • !Pranav123237</div>
      </div>
    </div>

    <div class="status-badge">
      <div class="dot" id="dot"></div>
      <div>
        <div class="status-text" id="statusText">Verbinde...</div>
        <div class="status-sub" id="statusSub">Warte auf ersten Ping</div>
      </div>
    </div>

    <div class="countdown">
      <div class="countdown-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle class="ring-bg" cx="60" cy="60" r="54"/>
          <circle class="ring-fill" id="ring" cx="60" cy="60" r="54"/>
        </svg>
        <div class="countdown-number" id="countNum">5:00</div>
      </div>
      <div class="countdown-label">bis zum nächsten Ping</div>
    </div>

    <button class="ping-btn" onclick="pingNow()">🏓 Jetzt pingen</button>

    <div class="log-title">Ping-Verlauf</div>
    <div class="log" id="log">
      <div class="log-entry">
        <span class="log-time">—</span>
        <span style="color:#555">Noch keine Pings...</span>
      </div>
    </div>
  </div>

  <div class="footer">Seite offen halten = Bot bleibt wach 🟢</div>

  <script>
    const PING_INTERVAL = 5 * 60 * 1000; // 5 Minuten
    const CIRCUMFERENCE = 2 * Math.PI * 54; // 339.3

    let timeLeft = PING_INTERVAL;
    let lastPingOk = null;
    const ring = document.getElementById('ring');
    const countNum = document.getElementById('countNum');
    const dot = document.getElementById('dot');
    const statusText = document.getElementById('statusText');
    const statusSub = document.getElementById('statusSub');
    const log = document.getElementById('log');

    ring.style.strokeDasharray = CIRCUMFERENCE;

    function formatTime(ms) {
      const s = Math.ceil(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return m + ':' + String(sec).padStart(2, '0');
    }

    function addLog(ok, ms) {
      const now = new Date();
      const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML =
        '<span class="log-time">' + time + '</span>' +
        '<span class="' + (ok ? 'log-ok' : 'log-err') + '">' +
        (ok ? '✅ Online (' + ms + 'ms)' : '❌ Keine Antwort') +
        '</span>';
      if (log.querySelector('span[style]')) log.innerHTML = '';
      log.insertBefore(entry, log.firstChild);
      const entries = log.querySelectorAll('.log-entry');
      if (entries.length > 10) entries[entries.length - 1].remove();
    }

    async function ping() {
      dot.className = 'dot pinging';
      statusText.textContent = 'Pinge...';
      const start = Date.now();
      try {
        const res = await fetch(window.location.origin + '/api/healthz', { cache: 'no-store' });
        const ms = Date.now() - start;
        const ok = res.ok;
        lastPingOk = ok;
        dot.className = 'dot' + (ok ? '' : ' offline');
        statusText.textContent = ok ? '🟢 Server online' : '🔴 Server offline';
        statusSub.textContent = 'Letzter Ping: ' + new Date().toLocaleTimeString('de-DE');
        addLog(ok, ms);
      } catch {
        lastPingOk = false;
        dot.className = 'dot offline';
        statusText.textContent = '🔴 Verbindung fehlgeschlagen';
        statusSub.textContent = 'Letzter Ping: ' + new Date().toLocaleTimeString('de-DE');
        addLog(false, 0);
      }
      timeLeft = PING_INTERVAL;
    }

    function pingNow() { timeLeft = 0; }

    // Tick jede Sekunde
    setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 1000);
      countNum.textContent = formatTime(timeLeft);
      const progress = timeLeft / PING_INTERVAL;
      ring.style.strokeDashoffset = CIRCUMFERENCE * progress;
      if (timeLeft === 0) ping();
    }, 1000);

    // Sofort pingen beim Laden
    ping();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
