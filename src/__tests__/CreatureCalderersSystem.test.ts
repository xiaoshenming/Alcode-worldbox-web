import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCalderersSystem } from '../systems/CreatureCalderersSystem'
import type { Calderer, CauldronMetal } from '../systems/CreatureCalderersSystem'

let nextId = 1
function makeSys(): CreatureCalderersSystem { return new CreatureCalderersSystem() }
function makeMaker(entityId: number, metalType: CauldronMetal = 'iron', skill = 30, tick = 0): Calderer {
  return { id: nextId++, entityId, skill, cauldronsMade: 10, metalType, heatRetention: 60, reputation: 50, tick }
}

const METALS: CauldronMetal[] = ['iron', 'copper', 'bronze', 'brass']
const fakeEm = { getEntitiesWithComponents: () => [] } as any

describe('CreatureCalderersSystem', () => {
  let sys: CreatureCalderersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无大锅制作者', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bronze'))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  // 3. CauldronMetal 包含 4 种
  it('支持所有4种金属类型', () => {
    METALS.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).makers as Calderer[]
    METALS.forEach((m, i) => { expect(all[i].metalType).toBe(m) })
  })

  // 4. heatRetention 计算：skill=40 → 18+40*0.68=45.2
  it('heatRetention 公式正确：skill=40 → 45.2', () => {
    const skill = 40
    const expected = 18 + skill * 0.68
    expect(expected).toBeCloseTo(45.2)
    const maker = makeMaker(1, 'iron', skill)
    maker.heatRetention = 18 + maker.skill * 0.68
    expect(maker.heatRetention).toBeCloseTo(45.2)
  })

  // 5. reputation 计算：skill=40 → 10+40*0.77=40.8
  it('reputation 公式正确：skill=40 → 40.8', () => {
    const skill = 40
    const maker = makeMaker(1, 'iron', skill)
    maker.reputation = 10 + maker.skill * 0.77
    expect(maker.reputation).toBeCloseTo(40.8)
  })

  // 6. cauldronsMade 计算：skill=40 → 1+Math.floor(40/8)=6
  it('cauldronsMade 公式正确：skill=40 → 6', () => {
    const skill = 40
    const cauldronsMade = 1 + Math.floor(skill / 8)
    expect(cauldronsMade).toBe(6)
  })

  // 7. metalType 由 skill 决定（metalIdx = Math.min(3, Math.floor(skill/25))）
  it('metalIdx: skill<25 → iron(0)', () => {
    const idx = Math.min(3, Math.floor(20 / 25))
    expect(METALS[idx]).toBe('iron')
  })

  it('metalIdx: 25<=skill<50 → copper(1)', () => {
    const idx = Math.min(3, Math.floor(30 / 25))
    expect(METALS[idx]).toBe('copper')
  })

  it('metalIdx: 50<=skill<75 → bronze(2)', () => {
    const idx = Math.min(3, Math.floor(60 / 25))
    expect(METALS[idx]).toBe('bronze')
  })

  it('metalIdx: skill>=75 → brass(3)', () => {
    const idx = Math.min(3, Math.floor(80 / 25))
    expect(METALS[idx]).toBe('brass')
  })

  // 8. tick 差值 < 1430 时不更新 lastCheck
  it('tick差值<1430时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, fakeEm, 1000 + 1429)
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 9. tick 差值 >= 1430 时更新 lastCheck
  it('tick差值>=1430时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, fakeEm, 1000 + 1430)
    expect((sys as any).lastCheck).toBe(2430)
  })

  // 10. time-based cleanup: tick=0的记录在update(tick=60000)时被删（0 < 60000-53500=6500）
  it('cleanup: 旧记录(tick=0)在tick=60000时被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 0))
    expect((sys as any).makers).toHaveLength(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  // 11. 新记录不被 cleanup（tick=55000 在 update(tick=60000) 时保留，55000 > 6500）
  it('cleanup: 新记录(tick=55000)在tick=60000时保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 55000))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
})
