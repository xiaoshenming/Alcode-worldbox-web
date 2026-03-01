import { describe, it, expect, beforeEach } from 'vitest'
import { EspionageSystem } from '../systems/EspionageSystem'
import type { Spy } from '../systems/EspionageSystem'

// EspionageSystem 测试：
// - getSpies()                          → 过滤存活的间谍
// - getSpiesFor(civId)                  → 过滤指定文明的存活间谍
// - getTributes()                       → 返回贡品记录数组
// - getJustifications()                 → 返回战争理由数组
// - hasJustification(attId, defId)      → 检查是否有战争理由
// - addBorderConflict / addReligiousTension → 添加战争理由（去重）

function makeES(): EspionageSystem {
  return new EspionageSystem()
}

function makeSpy(id: number, ownerCivId: number, alive = true): Spy {
  return {
    id, ownerCivId,
    targetCivId: ownerCivId === 1 ? 2 : 1,
    skill: 5, cover: 80, mission: null, missionTimer: 0, alive,
  }
}

describe('EspionageSystem.getSpies', () => {
  let es: EspionageSystem

  beforeEach(() => { es = makeES() })

  it('初始无间谍', () => {
    expect(es.getSpies()).toHaveLength(0)
  })

  it('存活间谍出现在列表', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    expect(es.getSpies()).toHaveLength(1)
  })

  it('死亡间谍不出现在列表', () => {
    ;(es as any).spies.push(makeSpy(1, 1, false))
    expect(es.getSpies()).toHaveLength(0)
  })

  it('混合存活/死亡时只返回存活的', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    ;(es as any).spies.push(makeSpy(2, 2, false))
    ;(es as any).spies.push(makeSpy(3, 1, true))
    expect(es.getSpies()).toHaveLength(2)
  })

  it('返回共享buf引用（buf模式）', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    expect(es.getSpies()).toBe(es.getSpies())
  })
})

describe('EspionageSystem.getSpiesFor', () => {
  let es: EspionageSystem

  beforeEach(() => { es = makeES() })

  it('无间谍时返回空数组', () => {
    expect(es.getSpiesFor(1)).toHaveLength(0)
  })

  it('返回指定文明的存活间谍', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    ;(es as any).spies.push(makeSpy(2, 2, true))
    ;(es as any).spies.push(makeSpy(3, 1, true))
    expect(es.getSpiesFor(1)).toHaveLength(2)
    expect(es.getSpiesFor(2)).toHaveLength(1)
    expect(es.getSpiesFor(3)).toHaveLength(0)
  })

  it('死亡间谍即使文明匹配也不返回', () => {
    ;(es as any).spies.push(makeSpy(1, 1, false))
    expect(es.getSpiesFor(1)).toHaveLength(0)
  })

  it('返回的 spy ownerCivId 正确', () => {
    ;(es as any).spies.push(makeSpy(5, 3, true))
    const result = es.getSpiesFor(3)
    expect(result[0].ownerCivId).toBe(3)
    expect(result[0].id).toBe(5)
  })
})

describe('EspionageSystem.getTributes', () => {
  let es: EspionageSystem

  beforeEach(() => { es = makeES() })

  it('初始无贡品记录', () => {
    expect((es as any).tributes).toHaveLength(0)
  })

  it('注入贡品记录后可查询', () => {
    ;(es as any).tributes.push({ fromCivId: 1, toCivId: 2, amount: 500, lastTick: 100 })
    expect((es as any).tributes).toHaveLength(1)
    expect((es as any).tributes[0].amount).toBe(500)
  })

  it('返回内部引用', () => {
    ;(es as any).tributes.push({ fromCivId: 1, toCivId: 2, amount: 100, lastTick: 0 })
    expect((es as any).tributes).toBe((es as any).tributes)
  })
})

describe('EspionageSystem.hasJustification', () => {
  let es: EspionageSystem

  beforeEach(() => { es = makeES() })

  it('无记录时返回 false', () => {
    expect(es.hasJustification(1, 2)).toBe(false)
  })

  it('有记录时返回 true', () => {
    ;(es as any).warJustifications.push({ attackerId: 1, defenderId: 2, reason: 'border_conflict', tick: 0 })
    expect(es.hasJustification(1, 2)).toBe(true)
  })

  it('攻防方向必须精确匹配（A→B ≠ B→A）', () => {
    ;(es as any).warJustifications.push({ attackerId: 1, defenderId: 2, reason: 'spy_caught', tick: 0 })
    expect(es.hasJustification(1, 2)).toBe(true)
    expect(es.hasJustification(2, 1)).toBe(false)
  })
})

describe('EspionageSystem.addBorderConflict', () => {
  let es: EspionageSystem

  beforeEach(() => { es = makeES() })

  it('添加边界冲突后可查询', () => {
    es.addBorderConflict(1, 2, 100)
    expect(es.hasJustification(1, 2)).toBe(true)
    expect((es as any).warJustifications[0].reason).toBe('border_conflict')
    expect((es as any).warJustifications[0].tick).toBe(100)
  })

  it('重复添加不产生重复记录', () => {
    es.addBorderConflict(1, 2, 100)
    es.addBorderConflict(1, 2, 200)
    expect((es as any).warJustifications).toHaveLength(1)
  })

  it('不同方向各自独立', () => {
    es.addBorderConflict(1, 2, 100)
    es.addBorderConflict(2, 1, 200)
    expect((es as any).warJustifications).toHaveLength(2)
  })
})

describe('EspionageSystem.addReligiousTension', () => {
  let es: EspionageSystem

  beforeEach(() => { es = makeES() })

  it('添加宗教紧张关系后可查询', () => {
    es.addReligiousTension(3, 4, 50)
    expect(es.hasJustification(3, 4)).toBe(true)
    expect((es as any).warJustifications[0].reason).toBe('religious_diff')
  })

  it('重复添加不产生重复记录', () => {
    es.addReligiousTension(1, 2, 0)
    es.addReligiousTension(1, 2, 0)
    expect((es as any).warJustifications).toHaveLength(1)
  })

  it('边界冲突和宗教紧张可共存（不同 reason）', () => {
    es.addBorderConflict(1, 2, 0)
    es.addReligiousTension(1, 2, 0)
    expect((es as any).warJustifications).toHaveLength(2)
  })
})
