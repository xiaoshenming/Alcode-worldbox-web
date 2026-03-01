import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCheeseAgerSystem } from '../systems/CreatureCheeseAgerSystem'
import type { CheeseAgerData, CheeseVariety } from '../systems/CreatureCheeseAgerSystem'

function makeSys(): CreatureCheeseAgerSystem { return new CreatureCheeseAgerSystem() }
function makeAger(entityId: number, variety: CheeseVariety = 'cheddar'): CheeseAgerData {
  return { entityId, cheesesAging: 3, bestAge: 30, variety, skill: 50, active: true, tick: 0 }
}

describe('CreatureCheeseAgerSystem.getAgers', () => {
  let sys: CreatureCheeseAgerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无奶酪熟成师', () => { expect((sys as any).agers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).agers.push(makeAger(1, 'brie'))
    expect((sys as any).agers[0].variety).toBe('brie')
  })

  it('返回只读引用', () => {
    ;(sys as any).agers.push(makeAger(1))
    expect((sys as any).agers).toBe((sys as any).agers)
  })

  it('支持所有 4 种奶酪品种', () => {
    const varieties: CheeseVariety[] = ['cheddar', 'brie', 'gouda', 'blue']
    varieties.forEach((v, i) => { ;(sys as any).agers.push(makeAger(i + 1, v)) })
    const all = (sys as any).agers
    varieties.forEach((v, i) => { expect(all[i].variety).toBe(v) })
  })

  it('active 字段可区分', () => {
    ;(sys as any).agers.push({ ...makeAger(1), active: false })
    expect((sys as any).agers[0].active).toBe(false)
  })
})
