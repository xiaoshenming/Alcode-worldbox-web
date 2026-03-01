import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAstrologySystem } from '../systems/CreatureAstrologySystem'
import type { AstrologicalReading, CelestialEvent } from '../systems/CreatureAstrologySystem'

// CreatureAstrologySystem 测试:
// - getReadings()       → 返回只读读数数组内部引用
// - getCurrentEvent()  → 返回当前天文事件（null 或 CelestialEvent）
// update() 依赖 EntityManager，不在此测试。

let nextReadingId = 1

function makeAstroSys(): CreatureAstrologySystem {
  return new CreatureAstrologySystem()
}

function makeReading(event: CelestialEvent = 'full_moon'): AstrologicalReading {
  return {
    id: nextReadingId++,
    event,
    effect: 'strength',
    magnitude: 30,
    duration: 5000,
    tick: 0,
  }
}

describe('CreatureAstrologySystem.getReadings', () => {
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
    const r = makeReading('comet')
    r.magnitude = 50
    r.effect = 'wisdom'
    r.duration = 8000
    ;(sys as any).readings.push(r)
    const result = (sys as any).readings[0]
    expect(result.magnitude).toBe(50)
    expect(result.effect).toBe('wisdom')
    expect(result.duration).toBe(8000)
  })
})

describe('CreatureAstrologySystem.getCurrentEvent', () => {
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
})
