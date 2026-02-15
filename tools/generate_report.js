const fs = require('fs')
const path = require('path')

function findLatestCSV(dir, prefix) {
  const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.csv'))
  if (files.length === 0) return null
  files.sort()
  return path.join(dir, files[files.length - 1])
}

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const header = lines[0].split(',')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    // naive split: handle quoted fields
    const raw = lines[i]
    const cols = []
    let cur = ''
    let inQuotes = false
    for (let ch of raw) {
      if (ch === '"') {
        inQuotes = !inQuotes
        cur += ch
        continue
      }
      if (ch === ',' && !inQuotes) {
        cols.push(cur)
        cur = ''
        continue
      }
      cur += ch
    }
    cols.push(cur)
    const obj = {}
    for (let j = 0; j < header.length; j++) obj[header[j]] = cols[j] === undefined ? '' : cols[j]
    rows.push(obj)
  }
  return { header, rows }
}

function toNumber(v) {
  if (!v && v !== 0) return 0
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function safeParseActionJson(s) {
  if (!s) return []
  // remove surrounding quotes if present
  let t = s
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1)
  // convert doubled quotes to single
  t = t.replace(/""/g, '"')
  try {
    return JSON.parse(t)
  } catch (e) {
    return []
  }
}

function generateHTML(summaryStats, summaryRows, roundsRows, outPath) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Simulation Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body{font-family: Arial, Helvetica, sans-serif; padding:20px}
    .grid{display:flex;gap:20px}
    .card{border:1px solid #ddd;padding:12px;border-radius:6px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #eee;padding:6px}
  </style>
</head>
<body>
  <h1>仿真报告</h1>
  <div class="grid">
    <div class="card" style="flex:1">
      <h3>总体统计</h3>
      <p>Games: ${summaryStats.total}</p>
      <p>Win: ${summaryStats.wins} (${(summaryStats.wins/summaryStats.total*100).toFixed(2)}%)</p>
      <p>Loss: ${summaryStats.losses} (${(summaryStats.losses/summaryStats.total*100).toFixed(2)}%)</p>
      <p>Draw: ${summaryStats.draws} (${(summaryStats.draws/summaryStats.total*100).toFixed(2)}%)</p>
      <p>Avg P1 Injury: ${summaryStats.avgP1Injury.toFixed(2)}</p>
      <p>Avg P2 Injury: ${summaryStats.avgP2Injury.toFixed(2)}</p>
    </div>
    <div class="card" style="flex:2">
      <canvas id="winChart" height="120"></canvas>
    </div>
  </div>

  <h2>Top 10 Games (by P1 points)</h2>
  <table>
    <thead><tr><th>gameId</th><th>winner</th><th>p1_hp</th><th>p2_hp</th><th>p1_points</th><th>p2_points</th></tr></thead>
    <tbody>
    ${summaryRows.slice(0,10).map(r=>`<tr><td>${r.gameId}</td><td>${r.winner}</td><td>${r.p1_hp}</td><td>${r.p2_hp}</td><td>${r.p1_points}</td><td>${r.p2_points}</td></tr>`).join('\n')}
    </tbody>
  </table>

  <h2>First Game Round Details (JSON logs)</h2>
  <pre id="firstGame"></pre>

  <script>
    const ctx = document.getElementById('winChart').getContext('2d')
    const data = {
      labels: ['Win','Loss','Draw'],
      datasets:[{label:'Count',data:[${summaryStats.wins},${summaryStats.losses},${summaryStats.draws}],backgroundColor:['#4caf50','#f44336','#ffc107'] }]
    }
    new Chart(ctx,{type:'bar',data})

    // inject first game rounds
    const rounds = ${JSON.stringify(roundsRows.slice(0,1))}
    document.getElementById('firstGame').textContent = JSON.stringify(rounds, null, 2)
  </script>
</body>
</html>`
  fs.writeFileSync(outPath, html, 'utf8')
}

function main() {
  const testDir = path.join(__dirname, '..', 'test')
  const summaryPath = findLatestCSV(testDir, 'simulation_summary_')
  const roundsPath = findLatestCSV(testDir, 'simulation_rounds_')
  if (!summaryPath) {
    console.error('No summary CSV found in test/ folder.')
    process.exit(1)
  }
  const summary = parseCSV(summaryPath)
  const rounds = roundsPath ? parseCSV(roundsPath) : { header: [], rows: [] }

  // normalize summary rows
  const srows = summary.rows.map(r => ({
    gameId: r.gameId || r.gameId,
    winner: r.winner,
    p1_hp: toNumber(r.p1_hp || r.p1_hp),
    p2_hp: toNumber(r.p2_hp || r.p2_hp),
    p1_injury: toNumber(r.p1_injury || r.p1_injury),
    p2_injury: toNumber(r.p2_injury || r.p2_injury),
    p1_exposure: toNumber(r.p1_exposure || r.p1_exposure),
    p2_exposure: toNumber(r.p2_exposure || r.p2_exposure),
    p1_points: toNumber(r.p1_points || r.p1_points),
    p2_points: toNumber(r.p2_points || r.p2_points)
  }))

  const total = srows.length
  const wins = srows.filter(s => String(s.winner) === '1').length
  const losses = srows.filter(s => String(s.winner) === '-1').length
  const draws = srows.filter(s => String(s.winner) === '0' || s.winner === '').length
  const avgP1Injury = srows.reduce((a,b) => a + b.p1_injury, 0) / Math.max(1,total)
  const avgP2Injury = srows.reduce((a,b) => a + b.p2_injury, 0) / Math.max(1,total)

  const summaryStats = { total, wins, losses, draws, avgP1Injury, avgP2Injury }

  // prepare rounds rows parsed
  const roundsRows = rounds.rows.map(r => ({ gameId: r.gameId, round: r.round, actionLog: safeParseActionJson(r.actionLog), p1_hp: toNumber(r.p1_hp), p2_hp: toNumber(r.p2_hp), p1_injury: toNumber(r.p1_injury), p2_injury: toNumber(r.p2_injury) }))

  // sort summaryRows by p1_points desc
  srows.sort((a,b) => b.p1_points - a.p1_points)

  const outPath = path.join(testDir, `report_${Date.now()}.html`)
  generateHTML(summaryStats, srows, roundsRows, outPath)
  console.log('Report generated:', outPath)
}

if (require.main === module) main()
