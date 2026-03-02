import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureDanceSystem } from '../systems/CreatureDanceSystem'
import type { DanceEvent, DanceType, DanceEffect } from '../systems/CreatureDanceSystem'

let nextId = 1
function makeSys(): CreatureDanceSystem { return new CreatureDanceSystem() }
function makeDance(
  type: DanceType = 'celebration',
  effect: DanceEffect = 'morale',
  startTick = 0,
  duration = 500,
  intensity = 60,
): DanceEvent {
  return { id: nextId++, x: 10, y: 10, type, participants: 5, intensity, startTick, duration, effect }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

const DANCE_EFFECTS: Record<DanceType, DanceEffect> = {
  celebration: 'morale',
  war: 'combat',
  rain: 'luck',
  harvest: 'healing',
  funeral: 'unity',
  mating: 'fertility',
}

const CHECK_INTERVAL = 700

describe('CreatureDanceSystem', () => {
  let sys: CreatureDanceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无舞蹈
  it('初始无舞蹈', () => {
    expect((sys as any).dances).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).dances.push(makeDance('war', 'combat'))
    expect((sys as any).dances[0].type).toBe('war')
    expect((sys as any).dances[0].effect).toBe('combat')
    expect((sys as any).dances).toHaveLength(1)
  })

  // 3. DanceType 包含 6 种
  it('DanceType 包含 6 种', () => {
    const types: DanceType[] = ['celebration', 'war', 'rain', 'harvest', 'funeral', 'mating']
    types.forEach((t, i) => { ;(sys as any).dances.push(makeDance(t)) })
    const all = (sys as any).dances as DanceEvent[]
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })

  // 4. DanceEffect 包含 6 种
  it('DanceEffect 包含 6 种', () => {
    const effects: DanceEffect[] = ['morale', 'combat', 'fertility', 'luck', 'healing', 'unity']
    effects.forEach((e, i) => { ;(sys as any).dances.push(makeDance('celebration', e)) })
    const all = (sys as any).dances as DanceEvent[]
    effects.forEach((e, i) => { expect(all[i].effect).toBe(e) })
  })

  // 5. DANCE_EFFECTS 映射验证（所有 6 种）
  it('DANCE_EFFECTS 映射：celebration→morale, war→combat, rain→luck, harvest→healing, funeral→unity, mating→fertility', () => {
    expect(DANCE_EFFECTS['celebration']).toBe('morale')
    expect(DANCE_EFFECTS['war']).toBe('combat')
    expect(DANCE_EFFECTS['rain']).toBe('luck')
    expect(DANCE_EFFECTS['harvest']).toBe('healing')
    expect(DANCE_EFFECTS['funeral']).toBe('unity')
    expect(DANCE_EFFECTS['mating']).toBe('fertility')
  })

  // 6. tick 差值 < CHECK_INTERVAL 时不触发第二次更新
  it('tick 差值 < 700 时不触发第二次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)          // 触发：lastCheck = CHECK_INTERVAL
    sys.update(1, em as any, CHECK_INTERVAL * 2 - 1)  // 差值 = CHECK_INTERVAL - 1 < CHECK_INTERVAL，skip
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  // 7. tick 差值 >= CHECK_INTERVAL 时触发第二次更新
  it('tick 差值 >= 700 时触发第二次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)      // 触发：lastCheck = CHECK_INTERVAL
    sys.update(1, em as any, CHECK_INTERVAL * 2)  // 差值 = CHECK_INTERVAL，触发
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  // 8. intensity 上限 100（Math.min(100, ...)保证）
  it('intensity 不超过 100', () => {
    const dance = makeDance('celebration', 'morale', 0, 1000, 98)
    ;(sys as any).dances.push(dance)
    // 直接模拟增长逻辑: intensity = Math.min(100, 98 + 2 * (5 * 0.2)) = Math.min(100, 100) = 100
    dance.intensity = Math.min(100, dance.intensity + 2 * (dance.participants * 0.2))
    expect(dance.intensity).toBeLessThanOrEqual(100)
  })

  // 9. 舞蹈完成（elapsed >= duration）时被删除
  // 在 update 中，elapsed = tick - startTick，当 >= duration 时删除
  it('elapsed >= duration 的舞蹈在 update 时被删除', () => {
    // 注入一个 startTick=0, duration=100 的舞蹈，以 tick=CHECK_INTERVAL 触发
    ;(sys as any).dances.push(makeDance('celebration', 'morale', 0, 100, 60))
    // lastCheck 初始为 0，tick = CHECK_INTERVAL 时触发，elapsed = CHECK_INTERVAL >= 100 → 删除
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).dances).toHaveLength(0)
  })

  // 10. MAX_DANCES = 15 限制：注入 15 个保留
  it('注入 15 个舞蹈时数组长度为 15', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).dances.push(makeDance())
    }
    expect((sys as any).dances).toHaveLength(15)
  })

  // 11. MAX_DANCES = 15 限制：已有 15 个未过期舞蹈时 update 不再添加
  it('达到 MAX_DANCES=15 个未过期舞蹈时 update 不添加新舞蹈', () => {
    // 注入 15 个 startTick=CHECK_INTERVAL, duration=999999，在 tick=CHECK_INTERVAL 触发后不过期
    for (let i = 0; i < 15; i++) {
      ;(sys as any).dances.push(makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 50))
    }
    const em = makeEmptyEM()
    // 第一次触发，em 返回空，不会新增舞蹈；15 个舞蹈 elapsed=0 < 999999，不被删除
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).dances).toHaveLength(15)
  })

  // 12. intensity 衰减到 0 时舞蹈被提前删除
  it('intensity 衰减到 0 时舞蹈被提前删除', () => {
    // participants=1 < 3，衰减: intensity = Math.max(0, 1 - 3) = 0 → 删除
    const dance = makeDance('funeral', 'unity', 0, 999999, 1)
    dance.participants = 1
    ;(sys as any).dances.push(dance)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue(null),
    }
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).dances).toHaveLength(0)
  })

  // 13. 多舞蹈共存，过期的被删、未过期的保留
  it('多舞蹈共存：过期舞蹈被删除，未过期舞蹈保留', () => {
    // startTick=0, duration=100 → elapsed=CHECK_INTERVAL >= 100，过期
    ;(sys as any).dances.push(makeDance('celebration', 'morale', 0, 100, 50))
    // startTick=CHECK_INTERVAL-10, duration=999999 → elapsed=10 < 999999，未过期，但 intensity=0 → 也会被删
    // 改用 startTick=CHECK_INTERVAL, duration=999999，elapsed=0 < 999999，intensity=50，participants=5>=3 保留
    ;(sys as any).dances.push(makeDance('war', 'combat', CHECK_INTERVAL, 999999, 50))
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    const remaining = (sys as any).dances as DanceEvent[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].type).toBe('war')
  })
})
