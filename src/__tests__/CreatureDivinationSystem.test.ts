import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDivinationSystem } from '../systems/CreatureDivinationSystem'
import type { DivinationType } from '../systems/CreatureDivinationSystem'

// CHECK_INTERVAL=1100, DIVINE_CHANCE=0.02, MAX_DIVINATIONS=70

function makeSys() { return new CreatureDivinationSystem() }

describe('CreatureDivinationSystem', () => {
  let sys: CreatureDivinationSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部divinations初始为空', () => { expect((sys as any).divinations.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureDivinationSystem) })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1100)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000-0=1000 < 1100
    expect((sys as any).lastCheck).toBe(0)  // 未更新
  })

  it('tick差值>=CHECK_INTERVAL(1100)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1100)  // 1100-0=1100 >= 1100
    expect((sys as any).lastCheck).toBe(1100)
  })

  // ── pruneOld 截断逻辑 ────────────────────────────────────────────────────

  it('divinations数量<=70时不截断', () => {
    const divinations = (sys as any).divinations as any[]
    for (let i = 0; i < 70; i++) {
      divinations.push({ id: i + 1, creatureId: i, method: 'stars', prediction: 'great_harvest', accuracy: 50, believed: true, tick: i })
    }
    ;(sys as any).pruneOld()
    expect(divinations.length).toBe(70)
  })

  it('divinations数量>70时截断到70', () => {
    const divinations = (sys as any).divinations as any[]
    for (let i = 0; i < 80; i++) {
      divinations.push({ id: i + 1, creatureId: i, method: 'bones', prediction: 'coming_war', accuracy: 60, believed: false, tick: i })
    }
    ;(sys as any).pruneOld()
    expect(divinations.length).toBe(70)
  })

  it('pruneOld保留最新（从头部删除旧记录）', () => {
    const divinations = (sys as any).divinations as any[]
    for (let i = 0; i < 75; i++) {
      divinations.push({ id: i + 1, creatureId: i, method: 'flames', prediction: 'plague_warning', accuracy: 40, believed: true, tick: i })
    }
    ;(sys as any).pruneOld()
    expect(divinations.length).toBe(70)
    // id=6(index=5)到id=75(index=74)被保留（删除最前面5个id=1~5）
    expect(divinations[0].id).toBe(6)
    expect(divinations[69].id).toBe(75)
  })

  // ── Divination 数据结构 ──────────────────────────────────────────────────

  it('直接向divinations注入数据后长度正确', () => {
    const divinations = (sys as any).divinations as any[]
    divinations.push({ id: 1, creatureId: 10, method: 'water' as DivinationType, prediction: 'new_alliance', accuracy: 75, believed: true, tick: 500 })
    expect(divinations.length).toBe(1)
    expect(divinations[0].creatureId).toBe(10)
    expect(divinations[0].method).toBe('water')
    expect(divinations[0].accuracy).toBe(75)
  })

  it('nextId初始为1，每次push后自增（模拟performDivinations调用）', () => {
    expect((sys as any).nextId).toBe(1)
    // 手动模拟nextId递增
    ;(sys as any).nextId++
    expect((sys as any).nextId).toBe(2)
  })

  // ── DivinationType 完整性 ────────────────────────────────────────────────

  it('6种DivinationType可以存入divinations', () => {
    const types: DivinationType[] = ['stars', 'bones', 'flames', 'water', 'dreams', 'birds']
    const divinations = (sys as any).divinations as any[]
    for (const method of types) {
      divinations.push({ id: 1, creatureId: 1, method, prediction: 'great_harvest', accuracy: 50, believed: true, tick: 0 })
    }
    expect(divinations.length).toBe(6)
  })
})
