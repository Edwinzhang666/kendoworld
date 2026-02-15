// 简易卡牌引擎核心类型与示例实现

export type CardType = 'tech' | 'tactic' | 'body' | 'learn' | 'social' | 'event'

export interface Card {
  id: string
  name: string
  type: CardType
  cost: number
  text: string
  value?: number
}

export interface PlayerState {
  hp: number
  maxHp: number
  energy: number
  deck: Card[]
  hand: Card[]
  discard: Card[]
}

export function drawCards(state: PlayerState, n = 1) {
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      state.deck = state.discard.splice(0)
      state.discard = []
    }
    const card = state.deck.shift()
    if (card) state.hand.push(card)
  }
}

export function playCard(player: PlayerState, opponent: PlayerState, cardIndex: number) {
  const card = player.hand[cardIndex]
  if (!card) return
  if (player.energy < card.cost) return
  player.energy -= card.cost
  // 简易效果：按类型做处理
  switch (card.type) {
    case 'tech':
      opponent.hp -= card.value ?? 1
      break
    case 'body':
      player.hp = Math.min(player.maxHp, player.hp + (card.value ?? 1))
      break
    case 'tactic':
      // 造成小额伤害并打乱对手
      opponent.hp -= (card.value ?? 0)
      break
  }
  // 弃牌
  player.discard.push(...player.hand.splice(cardIndex, 1))
}

export function simulateRound(p1: PlayerState, p2: PlayerState) {
  // 简化回合：每人抽 1，能量恢复到 3
  p1.energy = 3
  p2.energy = 3
  drawCards(p1, 1)
  drawCards(p2, 1)
}
