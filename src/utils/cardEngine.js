// 简易卡牌引擎 Javascript 版本（供 Node 测试脚本使用）

function drawCards(state, n = 1) {
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      state.deck = state.discard.splice(0)
      state.discard = []
    }
    const card = state.deck.shift()
    if (card) state.hand.push(card)
  }
}

function applyCardEffect(card, player, opponent, log) {
  // card may change hp, injury, exposure
  // produce structured action entries for better analysis
  const entryBase = { cardId: card.id, cardName: card.name, cardType: card.type }
  switch (card.type) {
    case 'tech': {
      const dmg = card.value || 1
      opponent.hp -= dmg
      if (card.value && card.value >= 5) player.injury = (player.injury || 0) + 1
      log.push(Object.assign({}, entryBase, { actor: 'self', effect: 'damage', value: dmg, text: `${card.name} deals ${dmg}` }))
      break
    }
    case 'body': {
      const heal = card.value || 1
      player.hp = Math.min(player.maxHp, player.hp + heal)
      log.push(Object.assign({}, entryBase, { actor: 'self', effect: 'heal', value: heal, text: `${card.name} heals ${heal}` }))
      break
    }
    case 'tactic': {
      const dmg = card.value || 0
      opponent.hp -= dmg
      log.push(Object.assign({}, entryBase, { actor: 'self', effect: 'tactic', value: dmg, text: `${card.name} tactic ${dmg}` }))
      break
    }
    case 'social': {
      if (card.value && typeof card.value === 'number') {
        player.coins = (player.coins || 0) + card.value
      }
      if (card.exposure) player.exposure = (player.exposure || 0) + card.exposure
      log.push(Object.assign({}, entryBase, { actor: 'self', effect: 'social', value: card.value || 0, exposure: card.exposure || 0, text: `${card.name} social` }))
      break
    }
    case 'event': {
      log.push(Object.assign({}, entryBase, { actor: 'system', effect: 'event', text: `${card.name} triggered` }))
      break
    }
  }
}

function playCard(player, opponent, cardIndex, context = { log: [] }) {
  const card = player.hand[cardIndex]
  if (!card) return false
  if ((player.energy || 0) < (card.cost || 0)) return false
  player.energy -= card.cost
  // apply primary effect
  applyCardEffect(card, player, opponent, context.log)
  // some cards increase exposure
  // exposure handled inside applyCardEffect; keep compatibility
  // move to discard
  player.discard.push(...player.hand.splice(cardIndex, 1))
  return true
}

function simulateRound(p1, p2) {
  // apply persistent status effects before each round
  applyStatusEffects(p1)
  applyStatusEffects(p2)
  // energy recovery depends on injury level (more injury -> less recovery)
  p1.energy = Math.max(1, 3 - Math.floor((p1.injury || 0) / 2))
  p2.energy = Math.max(1, 3 - Math.floor((p2.injury || 0) / 2))
  // natural recovery: slight HP recovery if resting
  if (p1.resting) p1.hp = Math.min(p1.maxHp, p1.hp + 1)
  if (p2.resting) p2.hp = Math.min(p2.maxHp, p2.hp + 1)
  drawCards(p1, 1)
  drawCards(p2, 1)
}

function applyStatusEffects(p) {
  // injury causes a temporary maxHp reduction and may reduce energy baseline
  const injury = p.injury || 0
  // temporary maxHp penalty: -1 maxHp per injury point (minimum 6)
  p.maxHp = Math.max(6, 20 - injury)
  if (p.injury > 0) {
    // small ongoing HP loss chance
    if (Math.random() < Math.min(0.2, 0.05 * p.injury)) {
      p.hp = Math.max(0, p.hp - 1)
    }
  }
}

function newPlayerState(base) {
  return Object.assign({ hp: 20, maxHp: 20, energy: 3, deck: [], hand: [], discard: [], injury: 0, exposure: 0, coins: 0, streak: 0, resting: false }, base || {})
}

module.exports = {
  drawCards,
  playCard,
  simulateRound,
  newPlayerState
}

