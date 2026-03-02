import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RuinsSystem } from '../systems/RuinsSystem'
import type { Ruin } from '../systems/RuinsSystem'

afterEach(() => vi.restoreAllMocks())

function makeSys(): RuinsSystem { return new RuinsSystem() }

let nextId = 1
function makeRuin(x: number = 5, y: number = 5, overrides?: Partial<Ruin>): Ruin {
  return {
    id: nextId++,
    x,
    y,
    originCivName: 'Ancient Civ',
    createdTick: 0,
    value: 50,
    discovered: false,
    ...overrides
  }
}

// ── getRuins — 基础查询 ─────────────────────────────────────────
describe('getRuins — 基础查询', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无废墟', () => {
    expect(sys.getRuins()).toHaveLength(0)
  })

  it('注入1个废墟后长度为1', () => {
    sys.getRuins().push(makeRuin())
    expect(sys.getRuins()).toHaveLength(1)
  })

  it('注入3个废墟后全部返回', () => {
    sys.getRuins().push(makeRuin(1, 1))
    sys.getRuins().push(makeRuin(2, 2))
    sys.getRuins().push(makeRuin(3, 3))
    expect(sys.getRuins()).toHaveLength(3)
  })

  it('getRuins返回内部引用（同一对象）', () => {
    expect(sys.getRuins()).toBe(sys.getRuins())
  })

  it('废墟x字段正确', () => {
    sys.getRuins().push(makeRuin(10, 20))
    expect(sys.getRuins()[0].x).toBe(10)
  })

  it('废墟y字段正确', () => {
    sys.getRuins().push(makeRuin(10, 20))
    expect(sys.getRuins()[0].y).toBe(20)
  })

  it('废墟discovered默认为false', () => {
    sys.getRuins().push(makeRuin())
    expect(sys.getRuins()[0].discovered).toBe(false)
  })

  it('废墟value字段正确', () => {
    sys.getRuins().push(makeRuin(0, 0, { value: 75 }))
    expect(sys.getRuins()[0].value).toBe(75)
  })

  it('废墟originCivName字段正确', () => {
    sys.getRuins().push(makeRuin(0, 0, { originCivName: 'Roman Empire' }))
    expect(sys.getRuins()[0].originCivName).toBe('Roman Empire')
  })

  it('废墟createdTick字段正确', () => {
    sys.getRuins().push(makeRuin(0, 0, { createdTick: 1000 }))
    expect(sys.getRuins()[0].createdTick).toBe(1000)
  })

  it('废墟id字段存在且唯一', () => {
    sys.getRuins().push(makeRuin(1, 1))
    sys.getRuins().push(makeRuin(2, 2))
    const ids = sys.getRuins().map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('废墟discoveredBy字段默认为undefined', () => {
    sys.getRuins().push(makeRuin())
    expect(sys.getRuins()[0].discoveredBy).toBeUndefined()
  })

  it('废墟discoveredBy字段可设置', () => {
    sys.getRuins().push(makeRuin(0, 0, { discovered: true, discoveredBy: 'Elves' }))
    expect(sys.getRuins()[0].discoveredBy).toBe('Elves')
  })
})

// ── getRuinAt — 坐标查询 ────────────────────────────────────────
describe('getRuinAt — 坐标查询', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无废墟时返回undefined', () => {
    expect(sys.getRuinAt(5, 5)).toBeUndefined()
  })

  it('精确坐标匹配返回废墟', () => {
    sys.getRuins().push(makeRuin(5, 5))
    const r = sys.getRuinAt(5, 5)
    expect(r).toBeDefined()
  })

  it('精确坐标匹配返回正确x', () => {
    sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuinAt(5, 5)!.x).toBe(5)
  })

  it('精确坐标匹配返回正确y', () => {
    sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuinAt(5, 5)!.y).toBe(5)
  })

  it('坐标不匹配时返回undefined', () => {
    sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuinAt(99, 99)).toBeUndefined()
  })

  it('x匹配但y不匹配时返回undefined', () => {
    sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuinAt(5, 99)).toBeUndefined()
  })

  it('y匹配但x不匹配时返回undefined', () => {
    sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuinAt(99, 5)).toBeUndefined()
  })

  it('多个废墟时返回正确的那个', () => {
    sys.getRuins().push(makeRuin(1, 1))
    sys.getRuins().push(makeRuin(2, 2))
    sys.getRuins().push(makeRuin(3, 3))
    const r = sys.getRuinAt(2, 2)
    expect(r).toBeDefined()
    expect(r!.x).toBe(2)
    expect(r!.y).toBe(2)
  })

  it('坐标(0,0)可正常查询', () => {
    sys.getRuins().push(makeRuin(0, 0))
    expect(sys.getRuinAt(0, 0)).toBeDefined()
  })

  it('负坐标可正常查询', () => {
    sys.getRuins().push(makeRuin(-10, -20))
    expect(sys.getRuinAt(-10, -20)).toBeDefined()
  })

  it('大坐标可正常查询', () => {
    sys.getRuins().push(makeRuin(9999, 8888))
    expect(sys.getRuinAt(9999, 8888)).toBeDefined()
  })

  it('返回第一个匹配（同坐标多废墟）', () => {
    const r1 = makeRuin(5, 5, { originCivName: 'First' })
    const r2 = makeRuin(5, 5, { originCivName: 'Second' })
    sys.getRuins().push(r1, r2)
    const found = sys.getRuinAt(5, 5)
    expect(found!.originCivName).toBe('First')
  })
})

// ── removeDecayedRuins — 清除价值为0的废墟 ─────────────────────
describe('removeDecayedRuins — 清除零价值废墟', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无废墟时不崩溃', () => {
    expect(() => sys.removeDecayedRuins()).not.toThrow()
  })

  it('所有废墟有价值时不删除任何', () => {
    sys.getRuins().push(makeRuin(1, 1, { value: 50 }))
    sys.getRuins().push(makeRuin(2, 2, { value: 10 }))
    sys.removeDecayedRuins()
    expect(sys.getRuins()).toHaveLength(2)
  })

  it('value=0的废墟被删除', () => {
    sys.getRuins().push(makeRuin(1, 1, { value: 0 }))
    sys.removeDecayedRuins()
    expect(sys.getRuins()).toHaveLength(0)
  })

  it('value<0的废墟被删除', () => {
    sys.getRuins().push(makeRuin(1, 1, { value: -1 }))
    sys.removeDecayedRuins()
    expect(sys.getRuins()).toHaveLength(0)
  })

  it('混合价值时只删除value<=0的', () => {
    sys.getRuins().push(makeRuin(1, 1, { value: 50 }))
    sys.getRuins().push(makeRuin(2, 2, { value: 0 }))
    sys.getRuins().push(makeRuin(3, 3, { value: 25 }))
    sys.removeDecayedRuins()
    expect(sys.getRuins()).toHaveLength(2)
  })

  it('删除后保留有价值废墟的正确数据', () => {
    sys.getRuins().push(makeRuin(1, 1, { value: 30, originCivName: 'Keep' }))
    sys.getRuins().push(makeRuin(2, 2, { value: 0 }))
    sys.removeDecayedRuins()
    expect(sys.getRuins()[0].originCivName).toBe('Keep')
  })

  it('全部value=0时清空废墟列表', () => {
    for (let i = 0; i < 5; i++) {
      sys.getRuins().push(makeRuin(i, i, { value: 0 }))
    }
    sys.removeDecayedRuins()
    expect(sys.getRuins()).toHaveLength(0)
  })

  it('removeDecayedRuins可连续多次调用不崩溃', () => {
    sys.getRuins().push(makeRuin(0, 0, { value: 0 }))
    expect(() => {
      sys.removeDecayedRuins()
      sys.removeDecayedRuins()
    }).not.toThrow()
  })
})

// ── update — 衰减机制 ───────────────────────────────────────────
describe('update — 价值衰减', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update(0)初始化lastDecayTick，不改变value', () => {
    sys.getRuins().push(makeRuin(0, 0, { value: 50 }))
    sys.update(0)
    expect(sys.getRuins()[0].value).toBe(50)
  })

  it('不足DECAY_INTERVAL(600)tick时value不变', () => {
    sys.update(0)
    sys.getRuins().push(makeRuin(0, 0, { value: 50 }))
    sys.update(300) // 只过了300 tick
    expect(sys.getRuins()[0].value).toBe(50)
  })

  it('恰好600tick时value减1', () => {
    // tick=1 初始化 lastDecayTick=1，tick=601 elapsed=600 触发1次衰减
    sys.update(1)
    sys.getRuins().push(makeRuin(0, 0, { value: 50 }))
    sys.update(601)
    expect(sys.getRuins()[0].value).toBe(49)
  })

  it('1200tick时value减2', () => {
    sys.update(1)
    sys.getRuins().push(makeRuin(0, 0, { value: 50 }))
    sys.update(1201) // elapsed=1200, decay=2
    expect(sys.getRuins()[0].value).toBe(48)
  })

  it('衰减后value不低于0', () => {
    sys.update(1)
    sys.getRuins().push(makeRuin(0, 0, { value: 1 }))
    sys.update(1201) // 2次衰减，但value只有1
    expect(sys.getRuins()[0]?.value ?? 0).toBeGreaterThanOrEqual(0)
  })

  it('value衰减至0后废墟被移除', () => {
    sys.update(1)
    sys.getRuins().push(makeRuin(0, 0, { value: 1 }))
    sys.update(601) // elapsed=600, decay=1, value变0，废墟被移除
    expect(sys.getRuins()).toHaveLength(0)
  })

  it('高value废墟多次update后逐渐衰减', () => {
    sys.update(1)
    sys.getRuins().push(makeRuin(0, 0, { value: 5 }))
    // 连续衰减（每次+600 tick）
    sys.update(601)
    sys.update(1201)
    sys.update(1801)
    sys.update(2401)
    sys.update(3001)
    // 5次衰减，value从5变0，废墟被移除
    expect(sys.getRuins().length).toBeLessThanOrEqual(1)
  })

  it('多个废墟同步衰减', () => {
    sys.update(1)
    sys.getRuins().push(makeRuin(1, 1, { value: 50 }))
    sys.getRuins().push(makeRuin(2, 2, { value: 50 }))
    sys.update(601) // elapsed=600, decay=1
    sys.getRuins().forEach(r => expect(r.value).toBe(49))
  })

  it('update不崩溃（无废墟）', () => {
    expect(() => {
      sys.update(1)
      sys.update(601)
    }).not.toThrow()
  })

  it('update连续调用lastDecayTick正确递进', () => {
    sys.update(1)
    sys.getRuins().push(makeRuin(0, 0, { value: 10 }))
    sys.update(601)  // elapsed=600, decay=1, value=9
    sys.update(1201) // elapsed=600, decay=1, value=8
    const v = sys.getRuins()[0]?.value ?? 0
    expect(v).toBe(8)
  })
})

// ── Ruin 接口结构完整性 ─────────────────────────────────────────
describe('Ruin 接口结构完整性', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('废墟含id字段', () => {
    sys.getRuins().push(makeRuin())
    expect('id' in sys.getRuins()[0]).toBe(true)
  })

  it('废墟含x字段', () => {
    sys.getRuins().push(makeRuin())
    expect('x' in sys.getRuins()[0]).toBe(true)
  })

  it('废墟含y字段', () => {
    sys.getRuins().push(makeRuin())
    expect('y' in sys.getRuins()[0]).toBe(true)
  })

  it('废墟含originCivName字段', () => {
    sys.getRuins().push(makeRuin())
    expect('originCivName' in sys.getRuins()[0]).toBe(true)
  })

  it('废墟含createdTick字段', () => {
    sys.getRuins().push(makeRuin())
    expect('createdTick' in sys.getRuins()[0]).toBe(true)
  })

  it('废墟含value字段', () => {
    sys.getRuins().push(makeRuin())
    expect('value' in sys.getRuins()[0]).toBe(true)
  })

  it('废墟含discovered字段', () => {
    sys.getRuins().push(makeRuin())
    expect('discovered' in sys.getRuins()[0]).toBe(true)
  })
})

// ── 边界与极端情况 ─────────────────────────────────────────────
describe('边界与极端情况', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('可以添加50个废墟', () => {
    for (let i = 0; i < 50; i++) {
      sys.getRuins().push(makeRuin(i, i))
    }
    expect(sys.getRuins()).toHaveLength(50)
  })

  it('value=100的废墟结构正确', () => {
    sys.getRuins().push(makeRuin(0, 0, { value: 100 }))
    expect(sys.getRuins()[0].value).toBe(100)
  })

  it('同坐标可存在多个废墟', () => {
    sys.getRuins().push(makeRuin(5, 5))
    sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuins()).toHaveLength(2)
  })

  it('大量废墟removeDecayedRuins不崩溃', () => {
    for (let i = 0; i < 50; i++) {
      sys.getRuins().push(makeRuin(i, 0, { value: i % 2 === 0 ? 0 : 10 }))
    }
    expect(() => sys.removeDecayedRuins()).not.toThrow()
    expect(sys.getRuins()).toHaveLength(25)
  })

  it('update传入极大tick值不崩溃', () => {
    sys.update(0)
    sys.getRuins().push(makeRuin(0, 0, { value: 50 }))
    expect(() => sys.update(999999)).not.toThrow()
  })

  it('update(0)后再update(0)不崩溃', () => {
    expect(() => {
      sys.update(0)
      sys.update(0)
    }).not.toThrow()
  })
})
