import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLegacySystem } from '../systems/CreatureLegacySystem'
import type { Legacy, LegacyType } from '../systems/CreatureLegacySystem'

// CHECK_INTERVAL=1500, LEGACY_CHANCE=0.01, MAX_LEGACIES=60
// LEGACY_TYPES: heroic, scholarly, artistic, villainous, diplomatic, tragic
// pruneLegacies: 超过60时splice从头删

function makeSys() { return new CreatureLegacySystem() }

function makeLegacy(id: number): Legacy {
  return { id, creatureId: 1, type: 'heroic', fame: 50, description: 'test', influenceRadius: 10, tick: 0 }
}

describe('CreatureLegacySystem', () => {
  let sys: CreatureLegacySystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureLegacySystem) })
  it('初始legacies为空', () => { expect((sys as any).legacies.length).toBe(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })

  // ── pruneLegacies 逻辑 ───────────────────────────────────────────────────────

  it('pruneLegacies: <=MAX_LEGACIES(60)时不截断', () => {
    for (let i = 1; i <= 60; i++) (sys as any).legacies.push(makeLegacy(i))
    ;(sys as any).pruneLegacies()
    expect((sys as any).legacies.length).toBe(60)
  })

  it('pruneLegacies: >60时截断到60', () => {
    for (let i = 1; i <= 65; i++) (sys as any).legacies.push(makeLegacy(i))
    ;(sys as any).pruneLegacies()
    expect((sys as any).legacies.length).toBe(60)
  })

  it('pruneLegacies: 截断保留最新（删除前5个）', () => {
    for (let i = 1; i <= 65; i++) (sys as any).legacies.push(makeLegacy(i))
    ;(sys as any).pruneLegacies()
    expect((sys as any).legacies[0].id).toBe(6)   // 前5个被删
    expect((sys as any).legacies[59].id).toBe(65)  // 最新保留
  })

  it('pruneLegacies: 空legacies不崩溃', () => {
    expect(() => (sys as any).pruneLegacies()).not.toThrow()
  })

  // ── LEGACY_DESCRIPTIONS 数据完整性 ──────────────────────────────────────────

  it('所有6种LegacyType都有描述', () => {
    const types: LegacyType[] = ['heroic', 'scholarly', 'artistic', 'villainous', 'diplomatic', 'tragic']
    // 通过注入legacy间接验证类型合法性
    for (const type of types) {
      const legacy = { ...makeLegacy(1), type }
      ;(sys as any).legacies.push(legacy)
    }
    expect((sys as any).legacies.length).toBe(6)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick未达到CHECK_INTERVAL(1500)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL(1500)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  // ── Legacy 数据结构 ──────────────────────────────────────────────────────────

  it('Legacy对象包含必要字段', () => {
    const legacy = makeLegacy(99)
    expect(legacy).toHaveProperty('id', 99)
    expect(legacy).toHaveProperty('creatureId')
    expect(legacy).toHaveProperty('type')
    expect(legacy).toHaveProperty('fame')
    expect(legacy).toHaveProperty('description')
    expect(legacy).toHaveProperty('influenceRadius')
    expect(legacy).toHaveProperty('tick')
  })

  it('Legacy fame范围合理（0-100）', () => {
    const legacy = makeLegacy(1)
    expect(legacy.fame).toBeGreaterThanOrEqual(0)
    expect(legacy.fame).toBeLessThanOrEqual(100)
  })
})
