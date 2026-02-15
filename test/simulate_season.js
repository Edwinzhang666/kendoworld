const fs = require('fs')
const path = require('path')
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/cards.json')))
const ais = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/ai_profiles.json')))
const { drawCards, playCard, simulateRound, newPlayerState } = require('../src/utils/cardEngine')

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function makePlayer(deckIds) {
  const deck = deckIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean)
  const p = newPlayerState({ deck: shuffle(deck.slice()) })
  p.coins = 500
  p.streak = 0
  return p
}

function seasonHeal(player) {
  // simple rule: if coins >= 100, pay 100 to reduce injury by 1
  if (player.injury > 0 && player.coins >= 100) {
    player.coins -= 100
    player.injury = Math.max(0, player.injury - 1)
    return true
  }
  // natural recovery: 10% chance reduce injury by 1
  if (player.injury > 0 && Math.random() < 0.1) {
    player.injury = Math.max(0, player.injury - 1)
    return true
  }
  return false
}

function runSeason(matches = 10, profileId = 'ai_easy') {
  const profile = ais.find((a) => a.id === profileId) || ais[0]
  const player = makePlayer(['c_001','c_002','c_005','c_006','c_004','c_009','c_007'])
  const opponentPool = [
    ['c_009','c_007','c_003','c_008','c_010','c_001','c_005'],
    ['c_001','c_004','c_005','c_006','c_002']
  ]

  const seasonLog = []
  for (let m = 1; m <= matches; m++) {
    const oppDeck = opponentPool[Math.floor(Math.random() * opponentPool.length)]
    const opp = makePlayer(oppDeck)
    drawCards(player, 5)
    drawCards(opp, 5)
    // simple single-match
    for (let round = 1; round <= 20; round++) {
      simulateRound(player, opp)
      // naive actions: play first playable
      const pIdx = player.hand.findIndex(c => c && (player.energy || 0) >= (c.cost || 0))
      if (pIdx >= 0) playCard(player, opp, pIdx, { log: [] })
      const oIdx = opp.hand.findIndex(c => c && (opp.energy || 0) >= (c.cost || 0))
      if (oIdx >= 0) playCard(opp, player, oIdx, { log: [] })
      if (player.hp <= 0 || opp.hp <= 0) break
    }

    // after match: record
    seasonLog.push({ match: m, p_hp: player.hp, p_injury: player.injury, p_coins: player.coins })
    // attempt season heal
    const healed = seasonHeal(player)
    seasonLog.push({ match: m, healed, p_injury_after: player.injury, coins_after: player.coins })
    // small restore between matches
    player.hp = Math.min(player.maxHp, player.hp + 5)
  }

  // write season csv
  const csv = ['match,p_hp,p_injury,p_coins,healed,post_injury,post_coins']
  for (let i = 0; i < seasonLog.length; i += 2) {
    const s1 = seasonLog[i]
    const s2 = seasonLog[i + 1]
    csv.push([s1.match, s1.p_hp, s1.p_injury, s1.p_coins, s2.healed ? 1 : 0, s2.p_injury_after, s2.coins_after].join(','))
  }
  const outPath = path.join(__dirname, `season_${Date.now()}.csv`)
  fs.writeFileSync(outPath, csv.join('\n'))
  console.log('Season simulation written to', outPath)
}

if (require.main === module) {
  const matches = parseInt(process.argv[2] || '10', 10)
  const profile = process.argv[3] || 'ai_easy'
  runSeason(matches, profile)
}
