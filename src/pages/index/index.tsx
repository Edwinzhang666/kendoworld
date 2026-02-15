import React, { useEffect, useState } from 'react'
import cardsData from '../../data/cards.json'
import { Card } from '../../utils/cardEngine'

export default function IndexPage() {
  const [hand, setHand] = useState<Card[]>([])

  useEffect(() => {
    // 初始抽 5 张
    setHand((cardsData as Card[]).slice(0, 5))
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h1>一介新手，制霸剑道全国（原型）</h1>
      <p>示例手牌：</p>
      <ul>
        {hand.map((c) => (
          <li key={c.id}>
            <b>{c.name}</b> — {c.text} (消耗 {c.cost})
          </li>
        ))}
      </ul>
    </div>
  )
}
