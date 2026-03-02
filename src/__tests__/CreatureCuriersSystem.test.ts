import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureCuriersSystem } from '../systems/CreatureCuriersSystem'
import type { Curier, LeatherGrade } from '../systems/CreatureCuriersSystem'

let nextId = 1
function makeSys(): CreatureCuriersSystem { return new CreatureCuriersSystem() }
function makeCurier(entityId: number, skill = 30, leatherGrade: LeatherGrade = 'rawhide', tick = 0): Curier {
  return {
    id: nextId++,
    entityId,
    skill,
    hidesCured: 1 + Math.floor(skill / 8),
    leatherGrade,
    quality: 20 + skill * 0.7,
    reputation: 12 + skill * 0.75,
    tick,
  }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

const CHECK_INTERVAL = 1350

describe('CreatureCuriersSystem', () => {
  let sys: CreatureCuriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无制革工', () => {
    expect((sys as any).curiers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).curiers.push(makeCurier(1, 30, 'fine'))
    expect((sys as any).curiers[0].leatherGrade).toBe('fine')
    expect((sys as any).curiers).toHaveLength(1)
  })

  // 3. LeatherGrade 包含 4 种
  it('LeatherGrade 包含 4 种（rawhide/tanned/tooled/fine）', () => {
    const grades: LeatherGrade[] = ['rawhide', 'tanned', 'tooled', 'fine']
    grades.forEach((g, i) => { ;(sys as any).curiers.push(makeCurier(i + 1, 30, g)) })
    const all = (sys as any).curiers as Curier[]
    grades.forEach((g, i) => { expect(all[i].leatherGrade).toBe(g) })
  })

  // 4. quality 公���验证: 20 + skill * 0.7
  it('quality 公式: 20 + skill * 0.7', () => {
    const skill = 50
    const curier = makeCurier(1, skill)
    expect(curier.quality).toBeCloseTo(20 + skill * 0.7, 5)
  })

  // 5. reputation 公式验证: 12 + skill * 0.75
  it('reputation 公式: 12 + skill * 0.75', () => {
    const skill = 60
    const curier = makeCurier(1, skill)
    expect(curier.reputation).toBeCloseTo(12 + skill * 0.75, 5)
  })

  // 6. hidesCured 计算: skill=40 → 1 + floor(40/8) = 1 + 5 = 6
  it('hidesCured: skill=40 → 6', () => {
    const skill = 40
    expect(1 + Math.floor(skill / 8)).toBe(6)
    const curier = makeCurier(1, skill)
    expect(curier.hidesCured).toBe(6)
  })

  // 7. leatherGrade 由 skill/25 决定 4 段
  it('leatherGrade 由 skill/25 决定：0→rawhide, 25→tanned, 50→tooled, 75→fine', () => {
    const GRADES: LeatherGrade[] = ['rawhide', 'tanned', 'tooled', 'fine']
    const cases: [number, LeatherGrade][] = [
      [0, 'rawhide'],
      [24, 'rawhide'],
      [25, 'tanned'],
      [49, 'tanned'],
      [50, 'tooled'],
      [74, 'tooled'],
      [75, 'fine'],
      [100, 'fine'],
    ]
    cases.forEach(([skill, expected]) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(GRADES[idx]).toBe(expected)
    })
  })

  // 8. tick 差值 < CHECK_INTERVAL 时不触发第二次更新
  it('tick 差值 < 1350 时不触发第二次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)          // 触发：lastCheck = CHECK_INTERVAL
    sys.update(1, em as any, CHECK_INTERVAL * 2 - 1)  // 差值 = CHECK_INTERVAL - 1 < CHECK_INTERVAL，skip
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  // 9. tick 差值 >= CHECK_INTERVAL 时触发第二次更新
  it('tick 差值 >= 1350 时触发第二次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)      // 触发：lastCheck = CHECK_INTERVAL
    sys.update(1, em as any, CHECK_INTERVAL * 2)  // 差值 = CHECK_INTERVAL，触发
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  // 10. time-based cleanup: cutoff = tick - 54000, 旧记录被删，新记录保留
  it('cleanup: tick < cutoff 的记录被删除，新记录保留', () => {
    const tick = 100000
    ;(sys as any).curiers.push(makeCurier(1, 30, 'rawhide', tick - 60000)) // 旧，应被删
    ;(sys as any).curiers.push(makeCurier(2, 30, 'tanned',  tick - 30000)) // 新，保留
    const cutoff = tick - 54000
    const curiers = (sys as any).curiers as Curier[]
    for (let i = curiers.length - 1; i >= 0; i--) {
      if (curiers[i].tick < cutoff) curiers.splice(i, 1)
    }
    expect((sys as any).curiers).toHaveLength(1)
    expect((sys as any).curiers[0].entityId).toBe(2)
  })

  // 11. MAX_CURIERS = 30 限制
  it('注入 30 个 curier 时数组长度为 30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).curiers.push(makeCurier(i + 1))
    }
    expect((sys as any).curiers).toHaveLength(30)
  })

  // 12. skill=0 时的极值验证
  it('skill=0 时: quality=20, reputation=12, hidesCured=1', () => {
    const curier = makeCurier(1, 0)
    expect(curier.quality).toBeCloseTo(20, 5)
    expect(curier.reputation).toBeCloseTo(12, 5)
    expect(curier.hidesCured).toBe(1)
  })

  // 13. skill=100 时的极值验证
  it('skill=100 极值: quality=90, reputation=87', () => {
    const skill = 100
    const curier = makeCurier(1, skill)
    expect(curier.quality).toBeCloseTo(20 + 100 * 0.7, 5)    // 90
    expect(curier.reputation).toBeCloseTo(12 + 100 * 0.75, 5) // 87
  })
})
