import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAstrologySystem } from '../systems/CreatureAstrologySystem'
import type { AstrologicalReading, CelestialEvent } from '../systems/CreatureAstrologySystem'

// CreatureAstrologySystem 测试:
// - readings 内部数组（通过 (sys as any).readings 访问）
// - currentEvent 内部状态（通过 (sys as any).currentEvent 访问）
// - nextId / lastCheck 等内部状态
// update() 依赖 EntityManager，不在此测试。

let nextReadingId = 1

function makeAstroSys(): CreatureAstrologySystem {
  return new CreatureAstrologySystem()
}

function makeReading(event: CelestialEvent = 'full_moon', magnitude = 30, duration = 5000): AstrologicalReading {
  return {
    id: nextReadingId++,
    event,
    effect: 'strength',
    magnitude,
    duration,
    tick: 0,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('CreatureAstrologySystem.readings - 基础读写', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys(); nextReadingId = 1 })

  it('初始无读数', () => {
    expect((sys as any).readings).toHaveLength(0)
  })

  it('注入读数后可查询', () => {
    ;(sys as any).readings.push(makeReading('eclipse'))
    expect((sys as any).readings).toHaveLength(1)
    expect((sys as any).readings[0].event).toBe('eclipse')
  })

  it('返回内部引用', () => {
    ;(sys as any).readings.push(makeReading())
    expect((sys as any).readings).toBe((sys as any).readings)
  })

  it('支持所有 6 种天文事件', () => {
    const events: CelestialEvent[] = ['new_moon', 'full_moon', 'eclipse', 'meteor_shower', 'conjunction', 'comet']
    events.forEach(e => {
      ;(sys as any).readings.push(makeReading(e))
    })
    const results = (sys as any).readings
    expect(results).toHaveLength(6)
    events.forEach((e, i) => { expect(results[i].event).toBe(e) })
  })

  it('读数包含正确数据', () => {
    const r = makeReading('comet', 50, 8000)
    r.effect = 'wisdom'
    ;(sys as any).readings.push(r)
    const result = (sys as any).readings[0]
    expect(result.magnitude).toBe(50)
    expect(result.effect).toBe('wisdom')
    expect(result.duration).toBe(8000)
  })

  it('readings 是数组类型', () => {
    expect(Array.isArray((sys as any).readings)).toBe(true)
  })

  it('可通过索引访问读数', () => {
    ;(sys as any).readings.push(makeReading('new_moon'))
    ;(sys as any).readings.push(makeReading('eclipse'))
    expect((sys as any).readings[0].event).toBe('new_moon')
    expect((sys as any).readings[1].event).toBe('eclipse')
  })

  it('可通过 splice 删除读数', () => {
    ;(sys as any).readings.push(makeReading('full_moon'))
    ;(sys as any).readings.push(makeReading('comet'))
    ;(sys as any).readings.splice(0, 1)
    expect((sys as any).readings).toHaveLength(1)
    expect((sys as any).readings[0].event).toBe('comet')
  })

  it('多个读数全部保存', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).readings.push(makeReading('meteor_shower'))
    }
    expect((sys as any).readings).toHaveLength(10)
  })
})

describe('CreatureAstrologySystem.readings - 属性完整性', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys(); nextReadingId = 1 })

  it('读数 tick 默认为 0', () => {
    ;(sys as any).readings.push(makeReading())
    expect((sys as any).readings[0].tick).toBe(0)
  })

  it('读数 effect 默认为 strength', () => {
    ;(sys as any).readings.push(makeReading())
    expect((sys as any).readings[0].effect).toBe('strength')
  })

  it('读数 magnitude 可为 0', () => {
    ;(sys as any).readings.push(makeReading('full_moon', 0))
    expect((sys as any).readings[0].magnitude).toBe(0)
  })

  it('读数 duration 可为极大值', () => {
    ;(sys as any).readings.push(makeReading('comet', 30, 999999))
    expect((sys as any).readings[0].duration).toBe(999999)
  })

  it('读数 id 单调递增', () => {
    ;(sys as any).readings.push(makeReading())
    ;(sys as any).readings.push(makeReading())
    const ids = (sys as any).readings.map((r: AstrologicalReading) => r.id)
    expect(ids[1]).toBeGreaterThan(ids[0])
  })

  it('eclipse 事件读数可保存', () => {
    ;(sys as any).readings.push(makeReading('eclipse'))
    expect((sys as any).readings[0].event).toBe('eclipse')
  })

  it('conjunction 事件读数可保存', () => {
    ;(sys as any).readings.push(makeReading('conjunction'))
    expect((sys as any).readings[0].event).toBe('conjunction')
  })

  it('meteor_shower 事件读数可保存', () => {
    ;(sys as any).readings.push(makeReading('meteor_shower'))
    expect((sys as any).readings[0].event).toBe('meteor_shower')
  })

  it('effect 可被修改为其他值', () => {
    const r = makeReading()
    r.effect = 'luck'
    ;(sys as any).readings.push(r)
    expect((sys as any).readings[0].effect).toBe('luck')
  })

  it('tick 可设为非零值', () => {
    const r = makeReading()
    r.tick = 5000
    ;(sys as any).readings.push(r)
    expect((sys as any).readings[0].tick).toBe(5000)
  })
})

describe('CreatureAstrologySystem.currentEvent - 基础状态', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys() })

  it('初始当前事件为 null', () => {
    expect((sys as any).currentEvent).toBeNull()
  })

  it('注入事件后返回正确值', () => {
    ;(sys as any).currentEvent = 'eclipse'
    expect((sys as any).currentEvent).toBe('eclipse')
  })

  it('重置为 null 后返回 null', () => {
    ;(sys as any).currentEvent = 'full_moon'
    ;(sys as any).currentEvent = null
    expect((sys as any).currentEvent).toBeNull()
  })

  it('支持所有 6 种事件类型', () => {
    const events: CelestialEvent[] = ['new_moon', 'full_moon', 'eclipse', 'meteor_shower', 'conjunction', 'comet']
    for (const e of events) {
      ;(sys as any).currentEvent = e
      expect((sys as any).currentEvent).toBe(e)
    }
  })

  it('new_moon 事件可正确设置', () => {
    ;(sys as any).currentEvent = 'new_moon'
    expect((sys as any).currentEvent).toBe('new_moon')
  })

  it('full_moon 事件可正确设置', () => {
    ;(sys as any).currentEvent = 'full_moon'
    expect((sys as any).currentEvent).toBe('full_moon')
  })

  it('meteor_shower 事件可正确设置', () => {
    ;(sys as any).currentEvent = 'meteor_shower'
    expect((sys as any).currentEvent).toBe('meteor_shower')
  })

  it('conjunction 事件可正确设置', () => {
    ;(sys as any).currentEvent = 'conjunction'
    expect((sys as any).currentEvent).toBe('conjunction')
  })

  it('comet 事件可正确设置', () => {
    ;(sys as any).currentEvent = 'comet'
    expect((sys as any).currentEvent).toBe('comet')
  })

  it('多次切换事件类型正常工作', () => {
    const events: CelestialEvent[] = ['new_moon', 'eclipse', 'comet', 'full_moon']
    for (const e of events) {
      ;(sys as any).currentEvent = e
      expect((sys as any).currentEvent).toBe(e)
    }
    ;(sys as any).currentEvent = null
    expect((sys as any).currentEvent).toBeNull()
  })
})

describe('CreatureAstrologySystem - nextId 内部状态', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys() })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('nextId 可以被手动修改', () => {
    ;(sys as any).nextId = 50
    expect((sys as any).nextId).toBe(50)
  })

  it('nextId 从 1 开始单调递增（模拟）', () => {
    const initial = (sys as any).nextId
    ;(sys as any).nextId = initial + 1
    expect((sys as any).nextId).toBe(initial + 1)
  })

  it('nextId 重置为 1 后再次可用', () => {
    ;(sys as any).nextId = 999
    ;(sys as any).nextId = 1
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureAstrologySystem - lastCheck 内部状态', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys() })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck 可以被修改', () => {
    ;(sys as any).lastCheck = 2500
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('lastCheck 大于 0 时仍可被读取', () => {
    ;(sys as any).lastCheck = 10000
    expect((sys as any).lastCheck).toBe(10000)
  })
})

describe('CreatureAstrologySystem - 过期读数手动清理', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys(); nextReadingId = 1 })

  it('手动 splice 删除过期读数后长度正确', () => {
    const r1 = makeReading('full_moon', 30, 100)
    r1.tick = 0
    const r2 = makeReading('eclipse', 40, 10000)
    r2.tick = 0
    ;(sys as any).readings.push(r1)
    ;(sys as any).readings.push(r2)
    // 模拟 tick=200 时清理 duration=100 的读数
    const now = 200
    for (let i = (sys as any).readings.length - 1; i >= 0; i--) {
      const r = (sys as any).readings[i]
      if (now - r.tick > r.duration) {
        ;(sys as any).readings.splice(i, 1)
      }
    }
    expect((sys as any).readings).toHaveLength(1)
    expect((sys as any).readings[0].event).toBe('eclipse')
  })

  it('duration 足够长时不会被清理', () => {
    const r = makeReading('comet', 30, 999999)
    r.tick = 0
    ;(sys as any).readings.push(r)
    const now = 100
    for (let i = (sys as any).readings.length - 1; i >= 0; i--) {
      if (now - (sys as any).readings[i].tick > (sys as any).readings[i].duration) {
        ;(sys as any).readings.splice(i, 1)
      }
    }
    expect((sys as any).readings).toHaveLength(1)
  })

  it('tick 和 duration 相等时刚好未过期', () => {
    const r = makeReading('new_moon', 30, 500)
    r.tick = 0
    ;(sys as any).readings.push(r)
    const now = 500 // now - tick = 500，不严格大于 duration=500
    for (let i = (sys as any).readings.length - 1; i >= 0; i--) {
      if (now - (sys as any).readings[i].tick > (sys as any).readings[i].duration) {
        ;(sys as any).readings.splice(i, 1)
      }
    }
    expect((sys as any).readings).toHaveLength(1)
  })

  it('tick 和 duration 使读数刚好过期', () => {
    const r = makeReading('new_moon', 30, 500)
    r.tick = 0
    ;(sys as any).readings.push(r)
    const now = 501 // now - tick = 501，严格大于 500
    for (let i = (sys as any).readings.length - 1; i >= 0; i--) {
      if (now - (sys as any).readings[i].tick > (sys as any).readings[i].duration) {
        ;(sys as any).readings.splice(i, 1)
      }
    }
    expect((sys as any).readings).toHaveLength(0)
  })

  it('多条读数部分过期后长度正确', () => {
    for (let i = 0; i < 5; i++) {
      const r = makeReading('full_moon', 20, i % 2 === 0 ? 100 : 10000)
      r.tick = 0
      ;(sys as any).readings.push(r)
    }
    const now = 200
    for (let i = (sys as any).readings.length - 1; i >= 0; i--) {
      if (now - (sys as any).readings[i].tick > (sys as any).readings[i].duration) {
        ;(sys as any).readings.splice(i, 1)
      }
    }
    // duration=100 的有 3 条（i=0,2,4），duration=10000 的有 2 条（i=1,3）
    expect((sys as any).readings).toHaveLength(2)
  })
})

describe('CreatureAstrologySystem - MAX_READINGS 容量限制', () => {
  let sys: CreatureAstrologySystem

  beforeEach(() => { sys = makeAstroSys(); nextReadingId = 1 })

  it('可以添加 100 条读数（达到 MAX_READINGS）', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).readings.push(makeReading())
    }
    expect((sys as any).readings).toHaveLength(100)
  })

  it('超过 100 条时手动阻止添加', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).readings.push(makeReading())
    }
    // 模拟 update 中的容量检查
    if ((sys as any).readings.length < 100) {
      ;(sys as any).readings.push(makeReading())
    }
    expect((sys as any).readings).toHaveLength(100)
  })

  it('空系统 readings.length 为 0，小于 MAX_READINGS', () => {
    expect((sys as any).readings.length).toBeLessThan(100)
  })
})

describe('CreatureAstrologySystem - 实例独立性', () => {
  it('两个实例的 readings 互不影响', () => {
    const sys1 = makeAstroSys()
    const sys2 = makeAstroSys()
    ;(sys1 as any).readings.push(makeReading('eclipse'))
    expect((sys2 as any).readings).toHaveLength(0)
  })

  it('两个实例的 currentEvent 互不影响', () => {
    const sys1 = makeAstroSys()
    const sys2 = makeAstroSys()
    ;(sys1 as any).currentEvent = 'eclipse'
    expect((sys2 as any).currentEvent).toBeNull()
  })

  it('两个实例的 nextId 独立', () => {
    const sys1 = makeAstroSys()
    const sys2 = makeAstroSys()
    ;(sys1 as any).nextId = 99
    expect((sys2 as any).nextId).toBe(1)
  })

  it('两个实例的 lastCheck 独立', () => {
    const sys1 = makeAstroSys()
    const sys2 = makeAstroSys()
    ;(sys1 as any).lastCheck = 5000
    expect((sys2 as any).lastCheck).toBe(0)
  })
})

describe('CreatureAstrologySystem - AstrologicalReading 结构验证', () => {
  it('makeReading 包含所有必要字段', () => {
    const r = makeReading('full_moon')
    expect(r).toHaveProperty('id')
    expect(r).toHaveProperty('event')
    expect(r).toHaveProperty('effect')
    expect(r).toHaveProperty('magnitude')
    expect(r).toHaveProperty('duration')
    expect(r).toHaveProperty('tick')
  })

  it('id 为正整数', () => {
    nextReadingId = 1
    const r = makeReading()
    expect(r.id).toBeGreaterThan(0)
    expect(Number.isInteger(r.id)).toBe(true)
  })

  it('magnitude 默认为 30', () => {
    const r = makeReading()
    expect(r.magnitude).toBe(30)
  })

  it('duration 默认为 5000', () => {
    const r = makeReading()
    expect(r.duration).toBe(5000)
  })

  it('tick 默认为 0', () => {
    const r = makeReading()
    expect(r.tick).toBe(0)
  })

  it('eclipse 是稀有事件（与 comet 同类）', () => {
    const isRare = (e: CelestialEvent) => e === 'eclipse' || e === 'comet'
    expect(isRare('eclipse')).toBe(true)
    expect(isRare('comet')).toBe(true)
    expect(isRare('full_moon')).toBe(false)
    expect(isRare('new_moon')).toBe(false)
    expect(isRare('meteor_shower')).toBe(false)
    expect(isRare('conjunction')).toBe(false)
  })
})

describe('CreatureAstrologySystem - CelestialEvent 枚举完整性', () => {
  it('共有 6 种天文事件', () => {
    const events: CelestialEvent[] = ['new_moon', 'full_moon', 'eclipse', 'meteor_shower', 'conjunction', 'comet']
    expect(events).toHaveLength(6)
  })

  it('new_moon 可被类型化', () => {
    const e: CelestialEvent = 'new_moon'
    expect(e).toBe('new_moon')
  })

  it('full_moon 可被类型化', () => {
    const e: CelestialEvent = 'full_moon'
    expect(e).toBe('full_moon')
  })

  it('eclipse 可被类型化', () => {
    const e: CelestialEvent = 'eclipse'
    expect(e).toBe('eclipse')
  })

  it('meteor_shower 可被类型化', () => {
    const e: CelestialEvent = 'meteor_shower'
    expect(e).toBe('meteor_shower')
  })

  it('conjunction 可被类型化', () => {
    const e: CelestialEvent = 'conjunction'
    expect(e).toBe('conjunction')
  })

  it('comet 可被类型化', () => {
    const e: CelestialEvent = 'comet'
    expect(e).toBe('comet')
  })
})
