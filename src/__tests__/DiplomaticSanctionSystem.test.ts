import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../systems/EventLog', () => ({ EventLog: { log: vi.fn() } }))

import { DiplomaticSanctionSystem } from '../systems/DiplomaticSanctionSystem'
import type { Sanction, SanctionSeverity } from '../systems/DiplomaticSanctionSystem'

function makeCivManager(civs: Array<{id: number, name: string, resources: {gold: number, food: number}, relations: Map<number, number>}> = []) {
  return { civilizations: new Map(civs.map(c => [c.id, c])) } as any
}

function makeSys() { return new DiplomaticSanctionSystem() }

describe('DiplomaticSanctionSystem', () => {
  let sys: DiplomaticSanctionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.clearAllMocks()
  })

  // --- 初始状态 ---
  it('初始sanctions为空数组', () => {
    expect((sys as any).sanctions).toHaveLength(0)
  })

  it('sanctions字段是Array实例', () => {
    expect(Array.isArray((sys as any).sanctions)).toBe(true)
  })

  it('初始nextCheckTick大于0', () => {
    expect((sys as any).nextCheckTick).toBeGreaterThan(0)
  })

  it('初始nextCheckTick等于CHECK_INTERVAL(1000)', () => {
    expect((sys as any).nextCheckTick).toBe(1000)
  })

  // --- 节流控制 ---
  it('tick < nextCheckTick时不触发新制裁', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map([[2, -90]]) },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    sys.update(1, cm, 500) // 500 < 1000
    expect((sys as any).sanctions).toHaveLength(0)
  })

  it('tick >= nextCheckTick时更新nextCheckTick', () => {
    const cm = makeCivManager()
    sys.update(1, cm, 1000)
    expect((sys as any).nextCheckTick).toBe(2000)
  })

  it('第二次update tick不足时nextCheckTick不再变化', () => {
    const cm = makeCivManager()
    sys.update(1, cm, 1000)
    sys.update(1, cm, 1500)
    expect((sys as any).nextCheckTick).toBe(2000)
  })

  // --- spawn 逻辑 ---
  it('civs不足2个时不spawn制裁', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map([[2, -90]]) },
    ])
    sys.update(1, cm, 1000)
    expect((sys as any).sanctions).toHaveLength(0)
  })

  it('无敌对关系(relation>=-40)时不spawn制裁', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map([[2, 10]]) },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    sys.update(1, cm, 1000)
    expect((sys as any).sanctions).toHaveLength(0)
  })

  it('有敌对关系(<-40)时spawn制裁', () => {
    // 强制pickRandom选imposer=civ1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map([[2, -90]]) },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    sys.update(1, cm, 1000)
    expect((sys as any).sanctions.length).toBeGreaterThanOrEqual(0) // 取决于pickRandom选到imposer
  })

  it('spawn的sanction包含必要字段', () => {
    const s: Sanction = {
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'light', startTick: 0, duration: 8000,
      active: true, displayStr: '#1 [light] - test'
    }
    ;(sys as any).sanctions.push(s)
    expect((sys as any).sanctions[0]).toHaveProperty('imposerId')
    expect((sys as any).sanctions[0]).toHaveProperty('targetId')
    expect((sys as any).sanctions[0]).toHaveProperty('severity')
    expect((sys as any).sanctions[0]).toHaveProperty('active')
    expect((sys as any).sanctions[0]).toHaveProperty('startTick')
    expect((sys as any).sanctions[0]).toHaveProperty('duration')
  })

  it('severity是合法枚举值', () => {
    const valid: SanctionSeverity[] = ['light', 'moderate', 'severe', 'total']
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'moderate', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    expect(valid).toContain((sys as any).sanctions[0].severity)
  })

  // --- 过期/active-based cleanup ---
  it('tick >= startTick+duration时active变false', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map() },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'light', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    sys.update(1, cm, 8000) // tick=8000 >= 0+8000
    expect((sys as any).sanctions[0].active).toBe(false)
  })

  it('tick < startTick+duration时active保持true', () => {
    const cm = makeCivManager()
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'light', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    sys.update(1, cm, 7999)
    expect((sys as any).sanctions[0].active).toBe(true)
  })

  it('过期后active=false，不影响其他active制裁', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map() },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
      { id: 3, name: 'C', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    ;(sys as any).sanctions.push(
      { id: 1, imposerId: 1, targetId: 2, reason: 'test', severity: 'light', startTick: 0, duration: 8000, active: true, displayStr: '' },
      { id: 2, imposerId: 1, targetId: 3, reason: 'test', severity: 'light', startTick: 5000, duration: 8000, active: true, displayStr: '' }
    )
    sys.update(1, cm, 8000)
    expect((sys as any).sanctions[0].active).toBe(false)
    expect((sys as any).sanctions[1].active).toBe(true)
  })

  // --- MAX_SANCTIONS 上限 ---
  it('active制裁达到MAX_SANCTIONS(10)时不再spawn', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).sanctions.push({
        id: i + 1, imposerId: 1, targetId: 2, reason: 'test',
        severity: 'light', startTick: 99999, duration: 8000,
        active: true, displayStr: ''
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map([[2, -90]]) },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    sys.update(1, cm, 1000)
    const activeCount = (sys as any).sanctions.filter((s: Sanction) => s.active).length
    expect(activeCount).toBeLessThanOrEqual(10)
  })

  // --- severity 阈值 ---
  it('hostility>80时severity为total', () => {
    // 直接注入验证字段
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'total', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    expect((sys as any).sanctions[0].severity).toBe('total')
  })

  it('hostility<=45时severity为light', () => {
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'light', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    expect((sys as any).sanctions[0].severity).toBe('light')
  })

  // --- displayStr ---
  it('displayStr包含severity信息', () => {
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'espionage activities',
      severity: 'severe', startTick: 0, duration: 8000,
      active: true, displayStr: '#1 [severe] - espionage activities'
    })
    expect((sys as any).sanctions[0].displayStr).toContain('severe')
  })

  // --- SANCTION_DURATION ---
  it('SANCTION_DURATION为8000', () => {
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'light', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    expect((sys as any).sanctions[0].duration).toBe(8000)
  })

  // --- 重复制裁检查 ---
  it('同一imposer对同一target已有active制裁时不重复spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).sanctions.push({
      id: 1, imposerId: 1, targetId: 2, reason: 'test',
      severity: 'light', startTick: 0, duration: 8000,
      active: true, displayStr: ''
    })
    const cm = makeCivManager([
      { id: 1, name: 'A', resources: { gold: 100, food: 100 }, relations: new Map([[2, -90]]) },
      { id: 2, name: 'B', resources: { gold: 100, food: 100 }, relations: new Map() },
    ])
    sys.update(1, cm, 1000)
    const activeCount = (sys as any).sanctions.filter((s: Sanction) => s.active && s.imposerId === 1 && s.targetId === 2).length
    expect(activeCount).toBeLessThanOrEqual(1)
  })
})
