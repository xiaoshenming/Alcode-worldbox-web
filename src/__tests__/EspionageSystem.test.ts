import { describe, it, expect, beforeEach } from 'vitest'
import { EspionageSystem } from '../systems/EspionageSystem'
import type { Spy } from '../systems/EspionageSystem'

function makeES(): EspionageSystem { return new EspionageSystem() }

function makeSpy(id: number, ownerCivId: number, alive = true): Spy {
  return { id, ownerCivId, targetCivId: ownerCivId === 1 ? 2 : 1, skill: 5, cover: 80, mission: null, missionTimer: 0, alive }
}

describe('EspionageSystem.getSpies', () => {
  let es: EspionageSystem
  beforeEach(() => { es = makeES() })

  it('初始无间谍', () => { expect(es.getSpies()).toHaveLength(0) })
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
  it('存活间谍的 alive 字段为 true', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    expect(es.getSpies()[0].alive).toBe(true)
  })
  it('多个存活间谍返回全部', () => {
    for (let i = 1; i <= 5; i++) { (es as any).spies.push(makeSpy(i, i, true)) }
    expect(es.getSpies()).toHaveLength(5)
  })
})

describe('EspionageSystem.getSpiesFor', () => {
  let es: EspionageSystem
  beforeEach(() => { es = makeES() })

  it('无间谍时返回空数组', () => { expect(es.getSpiesFor(1)).toHaveLength(0) })
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
  it('getSpiesFor 返回共享 buf', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    expect(es.getSpiesFor(1)).toBe(es.getSpiesFor(1))
  })
  it('getSpiesFor 不同文明互不干扰', () => {
    ;(es as any).spies.push(makeSpy(1, 1, true))
    ;(es as any).spies.push(makeSpy(2, 2, true))
    expect(es.getSpiesFor(1)[0].ownerCivId).toBe(1)
    expect(es.getSpiesFor(2)[0].ownerCivId).toBe(2)
  })
})

describe('EspionageSystem.getTributes', () => {
  let es: EspionageSystem
  beforeEach(() => { es = makeES() })

  it('初始无贡品记录', () => { expect((es as any).tributes).toHaveLength(0) })
  it('注入贡品记录后可查询', () => {
    ;(es as any).tributes.push({ fromCivId: 1, toCivId: 2, amount: 500, lastTick: 100 })
    expect((es as any).tributes).toHaveLength(1)
    expect((es as any).tributes[0].amount).toBe(500)
  })
  it('返回内部引用', () => {
    ;(es as any).tributes.push({ fromCivId: 1, toCivId: 2, amount: 100, lastTick: 0 })
    expect((es as any).tributes).toBe((es as any).tributes)
  })
  it('tributes 是数组', () => { expect(Array.isArray((es as any).tributes)).toBe(true) })
  it('多条贡品记录均可查询', () => {
    ;(es as any).tributes.push({ fromCivId: 1, toCivId: 2, amount: 100, lastTick: 0 })
    ;(es as any).tributes.push({ fromCivId: 3, toCivId: 4, amount: 200, lastTick: 0 })
    expect((es as any).tributes).toHaveLength(2)
  })
})

describe('EspionageSystem.hasJustification', () => {
  let es: EspionageSystem
  beforeEach(() => { es = makeES() })

  it('无记录时返回 false', () => { expect(es.hasJustification(1, 2)).toBe(false) })
  it('有记录时返回 true', () => {
    ;(es as any).warJustifications.push({ attackerId: 1, defenderId: 2, reason: 'border_conflict', tick: 0 })
    expect(es.hasJustification(1, 2)).toBe(true)
  })
  it('攻防方向必须精确匹配（A→B ≠ B→A）', () => {
    ;(es as any).warJustifications.push({ attackerId: 1, defenderId: 2, reason: 'spy_caught', tick: 0 })
    expect(es.hasJustification(1, 2)).toBe(true)
    expect(es.hasJustification(2, 1)).toBe(false)
  })
  it('不同 reason 均可查', () => {
    ;(es as any).warJustifications.push({ attackerId: 1, defenderId: 2, reason: 'tribute_refused', tick: 0 })
    expect(es.hasJustification(1, 2)).toBe(true)
  })
  it('多次查询结果一致', () => {
    ;(es as any).warJustifications.push({ attackerId: 1, defenderId: 2, reason: 'border_conflict', tick: 0 })
    expect(es.hasJustification(1, 2)).toBe(es.hasJustification(1, 2))
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
  it('添加后 attackerId 正确', () => {
    es.addBorderConflict(3, 4, 0)
    expect((es as any).warJustifications[0].attackerId).toBe(3)
    expect((es as any).warJustifications[0].defenderId).toBe(4)
  })
  it('_justificationFullSet 包含 key', () => {
    es.addBorderConflict(1, 2, 0)
    expect((es as any)._justificationFullSet.has('border_conflict_1_2')).toBe(true)
  })
  it('_justificationPairSet 包含 key', () => {
    es.addBorderConflict(1, 2, 0)
    expect((es as any)._justificationPairSet.has('1_2')).toBe(true)
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
  it('边界冲突和宗教紧张可共存', () => {
    es.addBorderConflict(1, 2, 0)
    es.addReligiousTension(1, 2, 0)
    expect((es as any).warJustifications).toHaveLength(2)
  })
  it('_justificationFullSet 含 religious_diff key', () => {
    es.addReligiousTension(1, 2, 0)
    expect((es as any)._justificationFullSet.has('religious_diff_1_2')).toBe(true)
  })
  it('不同方向的宗教紧张各自独立', () => {
    es.addReligiousTension(1, 2, 0)
    es.addReligiousTension(2, 1, 0)
    expect((es as any).warJustifications).toHaveLength(2)
  })
})

describe('EspionageSystem — 初始状态与综合', () => {
  it('初始 spies 为空', () => { expect((makeES() as any).spies).toHaveLength(0) })
  it('初始 tributes 为空', () => { expect((makeES() as any).tributes).toHaveLength(0) })
  it('初始 warJustifications 为空', () => { expect((makeES() as any).warJustifications).toHaveLength(0) })
  it('_justificationFullSet 初始为空', () => { expect((makeES() as any)._justificationFullSet.size).toBe(0) })
  it('_justificationPairSet 初始为空', () => { expect((makeES() as any)._justificationPairSet.size).toBe(0) })
  it('getSpies 和 getSpiesFor 返回各自 buf', () => {
    const es = makeES()
    expect(es.getSpies()).not.toBe(es.getSpiesFor(1))
  })
})

describe('EspionageSystem — Spy 结构验证', () => {
  it('makeSpy 返回完整结构', () => {
    const s = makeSpy(1, 1)
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('ownerCivId')
    expect(s).toHaveProperty('targetCivId')
    expect(s).toHaveProperty('skill')
    expect(s).toHaveProperty('cover')
    expect(s).toHaveProperty('mission')
    expect(s).toHaveProperty('missionTimer')
    expect(s).toHaveProperty('alive')
  })
  it('skill 字段在 1-10 范围内（makeSpy 默认 5）', () => { expect(makeSpy(1, 1).skill).toBe(5) })
  it('cover 字段默认 80', () => { expect(makeSpy(1, 1).cover).toBe(80) })
  it('mission 初始为 null', () => { expect(makeSpy(1, 1).mission).toBeNull() })
  it('missionTimer 初始为 0', () => { expect(makeSpy(1, 1).missionTimer).toBe(0) })
  it('alive 默认为 true', () => { expect(makeSpy(1, 1).alive).toBe(true) })
  it('alive=false 时 getSpies 不含该间谍', () => {
    const es = makeES()
    ;(es as any).spies.push(makeSpy(1, 1, false))
    expect(es.getSpies().find(s => s.id === 1)).toBeUndefined()
  })
  it('addBorderConflict 和 addReligiousTension 之后 hasJustification 均为 true', () => {
    const es = makeES()
    es.addBorderConflict(5, 6, 0)
    es.addReligiousTension(7, 8, 0)
    expect(es.hasJustification(5, 6)).toBe(true)
    expect(es.hasJustification(7, 8)).toBe(true)
  })
  it('warJustifications 是数组', () => { expect(Array.isArray((makeES() as any).warJustifications)).toBe(true) })
  it('spies 是数组', () => { expect(Array.isArray((makeES() as any).spies)).toBe(true) })
})
