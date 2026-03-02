import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFullerSystem } from '../systems/CreatureFullerSystem'
import type { Fuller } from '../systems/CreatureFullerSystem'

let nextId = 1
function makeSys(): CreatureFullerSystem { return new CreatureFullerSystem() }
function makeFuller(entityId: number, fulleringSkill = 50): Fuller {
  return { id: nextId++, entityId, fulleringSkill, spreadControl: 60, metalThinning: 70, grooveDepth: 80, tick: 0 }
}

describe('CreatureFullerSystem', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无展宽工', () => {
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).fullers.push(makeFuller(1))
    expect((sys as any).fullers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).fullers.push(makeFuller(1))
    ;(sys as any).fullers.push(makeFuller(2))
    expect((sys as any).fullers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeFuller(10)
    f.fulleringSkill = 90; f.spreadControl = 85; f.metalThinning = 80; f.grooveDepth = 75
    ;(sys as any).fullers.push(f)
    const r = (sys as any).fullers[0]
    expect(r.fulleringSkill).toBe(90)
    expect(r.spreadControl).toBe(85)
    expect(r.metalThinning).toBe(80)
    expect(r.grooveDepth).toBe(75)
  })

  it('tick差值<3050不触发更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 4049)  // 4049 - 1000 = 3049 < 3050
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=3050更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 4050)  // 4050 - 1000 = 3050 >= 3050
    expect((sys as any).lastCheck).toBe(4050)
  })

  it('update后fulleringSkill+0.02', () => {
    const f = makeFuller(1, 50)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].fulleringSkill).toBeCloseTo(50.02, 5)
  })

  it('update后spreadControl+0.015', () => {
    const f = makeFuller(1, 50)
    f.spreadControl = 60
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].spreadControl).toBeCloseTo(60.015, 5)
  })

  it('update后grooveDepth+0.01', () => {
    const f = makeFuller(1, 50)
    f.grooveDepth = 80
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].grooveDepth).toBeCloseTo(80.01, 5)
  })

  it('fulleringSkill上限100', () => {
    const f = makeFuller(1, 99.99)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].fulleringSkill).toBe(100)
  })

  it('cleanup: fulleringSkill<=4时删除，>4时保留', () => {
    // entityId=1: fulleringSkill=3.98, after +0.02 => 4.00 <= 4 => 删除
    const f1 = makeFuller(1, 3.98)
    // entityId=2: fulleringSkill=4.01, after +0.02 => 4.03 > 4 => 保留
    const f2 = makeFuller(2, 4.01)
    ;(sys as any).fullers.push(f1)
    ;(sys as any).fullers.push(f2)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    const remaining = (sys as any).fullers
    expect(remaining.some((f: Fuller) => f.entityId === 1)).toBe(false)
    expect(remaining.some((f: Fuller) => f.entityId === 2)).toBe(true)
  })
})
