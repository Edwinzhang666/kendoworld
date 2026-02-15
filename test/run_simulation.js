const fs = require('fs')
const path = require('path')

// 简易仿真：载入卡组，构建两名玩家，运行若干回合并输出结果
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/cards.json')))
const { simulateRound, drawCards, playCard, newPlayerState } = require('../src/utils/cardEngine')

function makePlayer(deckIds) {
  const deck = deckIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean)
  const p = newPlayerState({ deck: deck.slice() })
  p.coins = 500
  return p
}

function simpleAIPlay(player, opponent, profile) {
  // 优先打出最高伤害的技术卡；若读招成功则偏向战术
  let idx = -1
  if (Math.random() < (profile.readRate || 0)) {
    // try to read opponent: play tactic if available
    idx = player.hand.findIndex((c) => c && c.type === 'tactic')
  }
  if (idx === -1) idx = player.hand.findIndex((c) => c && c.type === 'tech')
  if (idx >= 0) playCard(player, opponent, idx, { log: [] })
}

async function run() {
  const p1 = makePlayer(['c_001','c_002','c_005','c_006','c_004'])
  const p2 = makePlayer(['c_009','c_007','c_003','c_008','c_010'])
  const profile = require('../src/data/ai_profiles.json')[0]

  // 初始抽
  drawCards(p1,5)
  drawCards(p2,5)

  const rounds = []
  for (let round = 1; round <= 10; round++) {
    const roundLog = []
    simulateRound(p1, p2)
    simpleAIPlay(p1, p2, profile, roundLog)
    simpleAIPlay(p2, p1, profile, roundLog)
    roundLog.push({ type: 'status', text: `Round ${round} status`, p1: { hp: p1.hp, injury: p1.injury, exposure: p1.exposure }, p2: { hp: p2.hp, injury: p2.injury, exposure: p2.exposure } })
    console.log(JSON.stringify(roundLog, null, 2))
    rounds.push({ round, log: roundLog.slice(), p1: { hp: p1.hp, injury: p1.injury, exposure: p1.exposure, coins: p1.coins }, p2: { hp: p2.hp, injury: p2.injury, exposure: p2.exposure, coins: p2.coins } })
    if (p1.hp <= 0 || p2.hp <= 0) break
  }

  if (p1.hp > p2.hp) console.log('Simulation result: P1 wins')
  else if (p2.hp > p1.hp) console.log('Simulation result: P2 wins')
  else console.log('Simulation result: Draw')
  console.log('Final stats:', { p1: { hp: p1.hp, injury: p1.injury, exposure: p1.exposure, coins: p1.coins }, p2: { hp: p2.hp, injury: p2.injury, exposure: p2.exposure, coins: p2.coins } })
  // output rounds to CSV for inspection
  const csvLines = ["round,actionLog,p1_hp,p2_hp,p1_injury,p2_injury,p1_exposure,p2_exposure"]
  rounds.forEach(r => {
    const actionJson = JSON.stringify(r.log).replace(/"/g, '""')
    csvLines.push([r.round, `"${actionJson}"`, r.p1.hp, r.p2.hp, r.p1.injury || 0, r.p2.injury || 0, r.p1.exposure || 0, r.p2.exposure || 0].join(','))
  })
  const outPath = require('path').join(__dirname, `run_sim_${Date.now()}.csv`)
  require('fs').writeFileSync(outPath, csvLines.join('\n'))
  console.log('Round CSV written to', outPath)
}

run()
