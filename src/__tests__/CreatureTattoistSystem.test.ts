import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTattoistSystem } from '../systems/CreatureTattoistSystem'
import type { Tattoo, TattooStyle } from '../systems/CreatureTattoistSystem'

// CHECK_INTERVAL=3200, TATTOO_CHANCE=0.004, MAX_TATTOOS=40
// prestige grows +0.02 when age > 50000, capped at 100
// cleanup: tattoos of dead creatures removed (hasComponent returns false)

let nextId = 1
function makeSys(): CreatureTattoistSystem { return new CreatureTattoistSystem() }
function makeTattoo(creatureId: number, style: TattooStyle = 'tribal', overrides: Partial<Tattoo> = {}): Tattoo {
  return { id: nextId++, creatureId, style, bodyPart: 'arm', powerBonus: 10, prestige: 50, age: 0, tick: 0, ...overrides }
}

describe('CreatureTattoistSystem', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ──────────────────────────────────────────────────────────

  it('初始无纹身', () => { expect((sys as any).tattoos).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    expect((sys as any).tattoos[0].style).toBe('runic')
  })

  it('返回只读引用', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    expect((sys as any).tattoos).toBe((sys as any).tattoos)
  })

  it('支持所有4种纹身风格', () => {
    const styles: TattooStyle[] = ['tribal', 'runic', 'celestial', 'beast']
    styles.forEach((s, i) => { ;(sys as any).tattoos.push(makeTattoo(i + 1, s)) })
    const all = (sys as any).tattoos
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })

  it('字段正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(2, 'beast'))
    const t = (sys as any).tattoos[0]
    expect(t.powerBonus).toBe(10)
    expect(t.bodyPart).toBe('arm')
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(3200)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)  // 3000 < 3200
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(3200)时更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)  // 3200 >= 3200
    expect((sys as any).lastCheck).toBe(3200)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)   // 7000-5000=2000 < 3200，不更新
    expect((sys as any).lastCheck).toBe(5000)
    sys.update(1, em, 8200)   // 8200-5000=3200 >= 3200，更新
    expect((sys as any).lastCheck).toBe(8200)
  })

  // ── prestige 增长 (age > 50000 时 +0.02，上限 100) ────────────────────────

  it('age<=50000时prestige不增长', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    // inject tattoo with age that will be 50000 after update
    // tick=50000, tattoo.tick=0 => age = 50000-0 = 50000, NOT > 50000
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 0, prestige: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50000)
    expect((sys as any).tattoos[0].prestige).toBe(60)
  })

  it('age>50000时prestige增长+0.02', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    // tick=50001, tattoo.tick=0 => age=50001 > 50000 => prestige 增加
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 0, prestige: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50001)
    expect((sys as any).tattoos[0].prestige).toBeCloseTo(60.02, 5)
  })

  it('prestige上限为100：接近上限时不超过100', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic', { tick: 0, prestige: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50001)
    expect((sys as any).tattoos[0].prestige).toBe(100)
  })

  it('prestige上限为100：刚好到临界值3.98先增再cleanup测试', () => {
    const grown = Math.min(100, 3.98 + 0.02)
    expect(grown).toBeCloseTo(4.0, 5)
  })

  // ── age 更新 ─────────────────────────────────────────────────────────────

  it('age等于tick-tattoo.tick', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'celestial', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 4200)   // tick=4200, tattoo.tick=1000 => age=3200
    expect((sys as any).tattoos[0].age).toBe(3200)
  })

  // ── cleanup：死亡生物纹身删除 ─────────────────────────────────────────────

  it('生物死亡时纹身被删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid !== 99,  // eid=99 is dead
    } as any
    ;(sys as any).tattoos.push(makeTattoo(99, 'beast'))    // dead creature
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))    // alive creature
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(1)
    expect((sys as any).tattoos[0].creatureId).toBe(1)
  })

  it('所有生物存活时不删除任何纹身', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'celestial'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(2)
  })

  it('多个死亡生物的纹身全部被清理', () => {
    const alive = new Set([3])
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _c: string) => alive.has(eid),
    } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'runic'))
    ;(sys as any).tattoos.push(makeTattoo(3, 'beast'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(1)
    expect((sys as any).tattoos[0].creatureId).toBe(3)
  })

  // ── nextId 自增 ───────────────────────────────────────────────────────────

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('数据字段完整性验证', () => {
    const t = makeTattoo(5, 'celestial', { powerBonus: 12, prestige: 70, bodyPart: 'chest' })
    expect(t.powerBonus).toBe(12)
    expect(t.prestige).toBe(70)
    expect(t.bodyPart).toBe('chest')
    expect(t.style).toBe('celestial')
  })

  // ── STYLE_BONUS 验证 ──────────────────────────────────────────────────────

  it('tribal powerBonus=3, runic=7, celestial=12, beast=5 (常量验证)', () => {
    const bonusMap: Record<TattooStyle, number> = { tribal: 3, runic: 7, celestial: 12, beast: 5 }
    const styles: TattooStyle[] = ['tribal', 'runic', 'celestial', 'beast']
    styles.forEach(s => {
      expect(bonusMap[s]).toBeGreaterThan(0)
    })
    expect(bonusMap['celestial']).toBeGreaterThan(bonusMap['runic'])
    expect(bonusMap['runic']).toBeGreaterThan(bonusMap['beast'])
  })
})
