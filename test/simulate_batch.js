const fs = require('fs')
const path = require('path')
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/cards.json')))
const ais = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/ai_profiles.json')))
const { drawCards, playCard, simulateRound, newPlayerState } = require('../src/utils/cardEngine')

function makePlayer(deckIds) {
  const deck = deckIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean)
  const p = newPlayerState({ deck: shuffle(deck.slice()) })
  p.coins = 300
  p.streak = 0
  return p
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function chooseCardIndexByProfile(player, profile) {
  // build candidate indices by type
  const byType = { attack: [], defend: [], tactic: [] }
  player.hand.forEach((c, idx) => {
    if (!c) return
    if (c.type === 'tech') byType.attack.push({ idx, card: c })
    else if (c.type === 'body') byType.defend.push({ idx, card: c })
    else if (c.type === 'tactic') byType.tactic.push({ idx, card: c })
    else {
      // prefer social/learn if no other
      byType.tactic.push({ idx, card: c })
    }
  })

  const roll = Math.random()
  const w = profile.weights
  const total = w.attack + w.defend + w.tactic
  const r = Math.random() * total
  let chosenBucket = null
  if (r < w.attack) chosenBucket = byType.attack
  else if (r < w.attack + w.defend) chosenBucket = byType.defend
  else chosenBucket = byType.tactic

  if (chosenBucket && chosenBucket.length > 0) {
    // choose highest value inside bucket within energy
    chosenBucket.sort((a, b) => (b.card.value || 0) - (a.card.value || 0))
    for (const cand of chosenBucket) {
      if ((player.energy || 0) >= (cand.card.cost || 0)) return cand.idx
    }
  }
  // fallback: any playable card
  for (let i = 0; i < player.hand.length; i++) {
    const c = player.hand[i]
    if (c && (player.energy || 0) >= (c.cost || 0)) return i
  }
  return -1
}

function simpleAIMove(player, opponent, profile, roundLog) {
  // include streak bias: if player has positive streak, be more aggressive
  const bias = (player.streak || 0) * (profile.streakBias || 0)
  const idx = chooseCardIndexByProfile(player, profile)
  if (idx >= 0) {
    // pass roundLog so playCard can append action descriptions
    playCard(player, opponent, idx, { log: roundLog })
    // update streak heuristics
    if ((player.lastActionWasAttack) || (player.lastActionWasAttack === undefined)) {
      player.streak = (player.streak || 0) + 1
      player.lastActionWasAttack = true
    }
  } else {
    // resting or no playable card
    player.resting = true
    player.streak = 0
    player.lastActionWasAttack = false
    roundLog.push('No playable card — resting')
  }
}

function runOneGame(profileId) {
  const profile = ais.find((a) => a.id === profileId) || ais[0]
  const p1 = makePlayer(['c_001','c_002','c_005','c_006','c_004','c_009','c_007'])
  const p2 = makePlayer(['c_009','c_007','c_003','c_008','c_010','c_001','c_005'])
  drawCards(p1, 5)
  drawCards(p2, 5)

  const rounds = []
  for (let round = 1; round <= 30; round++) {
    simulateRound(p1, p2)
    // per-round log
    const roundLog = []
    simpleAIMove(p1, p2, profile, roundLog)
    simpleAIMove(p2, p1, profile, roundLog)
    rounds.push({ round, log: roundLog.slice(), p1: { hp: p1.hp, injury: p1.injury, exposure: p1.exposure, coins: p1.coins }, p2: { hp: p2.hp, injury: p2.injury, exposure: p2.exposure, coins: p2.coins } })
    // end conditions
    if (p1.hp <= 0 || p2.hp <= 0) {
      break
    }
  }

  // compute simple points influenced by exposure (example rule)
  // winner gets base 100, plus exposure differential * 0.5 (rounded)
  let result = 0
  if (p1.hp > p2.hp) result = 1
  else if (p2.hp > p1.hp) result = -1
  // match points (for info only)
  const base = 100
  const p1Points = base + Math.round((p1.exposure - p2.exposure) * 0.5)
  const p2Points = base + Math.round((p2.exposure - p1.exposure) * 0.5)

  return { result, p1: { hp: p1.hp, injury: p1.injury, exposure: p1.exposure, coins: p1.coins, points: p1Points }, p2: { hp: p2.hp, injury: p2.injury, exposure: p2.exposure, coins: p2.coins, points: p2Points }, rounds }
}

function batchRun(n = 100, profileId = 'ai_easy') {
  let wins = 0, losses = 0, draws = 0
  let wins = 0, losses = 0, draws = 0
  const summaries = []
  for (let i = 0; i < n; i++) {
    const summary = runOneGame(profileId)
    // runOneGame now returns object { result, p1, p2 }
    const res = summary.result
    if (res === 1) wins++
    else if (res === -1) losses++
    else draws++
    summaries.push(summary)
  }
  return { wins, losses, draws, summaries }
}

function main() {
  const n = parseInt(process.argv[2] || '200', 10)
  const profile = process.argv[3] || 'ai_easy'
  console.log(`Running ${n} simulations vs profile=${profile}...`)
  const result = batchRun(n, profile)
  console.log('Result:', { wins: result.wins, losses: result.losses, draws: result.draws })
  console.log(`WinRate: ${(result.wins / n * 100).toFixed(2)}%  LossRate: ${(result.losses / n * 100).toFixed(2)}%  DrawRate: ${(result.draws / n * 100).toFixed(2)}%`)
  // optional CSV output
  if (process.argv.includes('--csv')) {
    // summary CSV
    const out = []
    out.push('gameId,winner,p1_hp,p2_hp,p1_injury,p2_injury,p1_exposure,p2_exposure,p1_coins,p2_coins,p1_points,p2_points')
    result.summaries.forEach((s, idx) => {
      out.push([idx + 1, s.result, s.p1.hp, s.p2.hp, s.p1.injury || 0, s.p2.injury || 0, s.p1.exposure || 0, s.p2.exposure || 0, s.p1.coins || 0, s.p2.coins || 0, s.p1.points || 0, s.p2.points || 0].join(','))
    })
    const filePath = path.join(__dirname, `simulation_summary_${Date.now()}.csv`)
    fs.writeFileSync(filePath, out.join('\n'))
    console.log('CSV summary written to', filePath)

    // detailed per-round CSV (gameId,round,actionLog,p1_hp,p2_hp,p1_injury,p2_injury,p1_exposure,p2_exposure)
    const roundsOut = []
    roundsOut.push('gameId,round,actionLog,p1_hp,p2_hp,p1_injury,p2_injury,p1_exposure,p2_exposure')
    result.summaries.forEach((s, gid) => {
      if (!s.rounds) return
        s.rounds.forEach(r => {
          const actionJson = JSON.stringify(r.log).replace(/"/g, '""')
          roundsOut.push([gid + 1, r.round, `"${actionJson}"`, r.p1.hp, r.p2.hp, r.p1.injury || 0, r.p2.injury || 0, r.p1.exposure || 0, r.p2.exposure || 0].join(','))
        })
    })
    const roundsPath = path.join(__dirname, `simulation_rounds_${Date.now()}.csv`)
    fs.writeFileSync(roundsPath, roundsOut.join('\n'))
    console.log('CSV rounds written to', roundsPath)
  }
}

main()
