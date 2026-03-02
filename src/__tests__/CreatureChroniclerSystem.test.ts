import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChroniclerSystem } from '../systems/CreatureChroniclerSystem'
import type { ChroniclerData, ChroniclerSpecialty } from '../systems/CreatureChroniclerSystem'

function makeSys(): CreatureChroniclerSystem { return new CreatureChroniclerSystem() }
function makeChronicler(entityId: number, specialty: ChroniclerSpecialty = 'war', overrides: Partial<ChroniclerData> = {}): ChroniclerData {
  return { entityId, recordCount: 5, specialty, reputation: 50, active: true, tick: 0, ...overrides }
}

describe('CreatureChroniclerSystem', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  // ── 基础状态 ──
  it('初始无编年史家', () => { expect((sys as any).chroniclers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'culture'))
    expect((sys as any).chroniclers[0].specialty).toBe('culture')
  })

  it('ChroniclerSpecialty包含4种（war/nature/culture/trade）', () => {
    const specialties: ChroniclerSpecialty[] = ['war', 'nature', 'culture', 'trade']
    specialties.forEach((s, i) => { ;(sys as any).chroniclers.push(makeChronicler(i + 1, s)) })
    const all = (sys as any).chroniclers as ChroniclerData[]
    expect(all.map(c => c.specialty)).toEqual(['war', 'nature', 'culture', 'trade'])
  })

  it('四种specialty可以直接注入到chroniclers数组', () => {
    const specialties: ChroniclerSpecialty[] = ['war', 'nature', 'culture', 'trade']
    specialties.forEach((s, i) => {
      ;(sys as any).chroniclers.push(makeChronicler(i + 10, s))
    })
    expect((sys as any).chroniclers).toHaveLength(4)
  })

  it('active字段可区分', () => {
    ;(sys as any).chroniclers.push({ ...makeChronicler(1), active: false })
    expect((sys as any).chroniclers[0].active).toBe(false)
  })

  it('_chroniclersSet初始为空集合', () => {
    expect((sys as any)._chroniclersSet.size).toBe(0)
  })

  // ── tick 间隔控制（CHECK_INTERVAL = 3000）──
  it('tick差值<3000时不更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=3000时更新lastCheck', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  // ── reputation 上限 ──
  it('reputation上限为100，多次update后不超过100', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { reputation: 100 }))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_id: number, _comp: string) => true,
    } as any
    // 多次触发 update
    for (let t = 3000; t <= 30000; t += 3000) {
      sys.update(16, em, t)
    }
    expect((sys as any).chroniclers[0].reputation).toBeLessThanOrEqual(100)
  })

  // ── cleanup（hasComponent返回false时删除）──
  it('hasComponent返回false时删除chronicler', () => {
    ;(sys as any).chroniclers.push(makeChronicler(99, 'trade'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_id: number, _comp: string) => false,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(0)
  })

  it('hasComponent返回true时保留chronicler', () => {
    ;(sys as any).chroniclers.push(makeChronicler(99, 'nature'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_id: number, _comp: string) => true,
    } as any
    sys.update(16, em, 3000)
    expect((sys as any).chroniclers).toHaveLength(1)
  })

  it('recordCount字段可正确读取', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'war', { recordCount: 42 }))
    expect((sys as any).chroniclers[0].recordCount).toBe(42)
  })
})
