import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSleepwalkSystem } from '../systems/CreatureSleepwalkSystem'
import type { Sleepwalker } from '../systems/CreatureSleepwalkSystem'

let nextId = 1
function makeSys(): CreatureSleepwalkSystem { return new CreatureSleepwalkSystem() }
function makeSleepwalker(entityId: number): Sleepwalker {
  return { id: nextId++, entityId, startTick: 0, distance: 5, direction: 1.57, duration: 300 }
}

describe('CreatureSleepwalkSystem.getSleepwalkers', () => {
  let sys: CreatureSleepwalkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梦游者', () => { expect(sys.getSleepwalkers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1))
    expect(sys.getSleepwalkers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1))
    expect(sys.getSleepwalkers()).toBe((sys as any).sleepwalkers)
  })
  it('字段正确', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(2))
    const s = sys.getSleepwalkers()[0]
    expect(s.distance).toBe(5)
    expect(s.duration).toBe(300)
  })
})

describe('CreatureSleepwalkSystem.getSleepwalker', () => {
  let sys: CreatureSleepwalkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回undefined', () => { expect(sys.getSleepwalker(999)).toBeUndefined() })
  it('按entityId查询', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1))
    expect(sys.getSleepwalker(1)?.entityId).toBe(1)
  })
})
