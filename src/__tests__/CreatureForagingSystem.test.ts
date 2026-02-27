import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureForagingSystem } from '../systems/CreatureForagingSystem'
import type { ForageEvent, ForageType } from '../systems/CreatureForagingSystem'

let nextId = 1
function makeSys(): CreatureForagingSystem { return new CreatureForagingSystem() }
function makeEvent(creatureId: number, type: ForageType = 'berries'): ForageEvent {
  return { id: nextId++, creatureId, type, amount: 10, x: 5, y: 5, tick: 0 }
}

describe('CreatureForagingSystem.getForageLog', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无觅食记录', () => { expect(sys.getForageLog()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'mushrooms'))
    expect(sys.getForageLog()[0].type).toBe('mushrooms')
  })

  it('返回内部引用', () => {
    ;(sys as any).forageLog.push(makeEvent(1))
    expect(sys.getForageLog()).toBe((sys as any).forageLog)
  })

  it('支持所有 7 种觅食类型', () => {
    const types: ForageType[] = ['berries', 'mushrooms', 'roots', 'herbs', 'nuts', 'insects', 'seaweed']
    types.forEach((t, i) => { ;(sys as any).forageLog.push(makeEvent(i + 1, t)) })
    const all = sys.getForageLog()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureForagingSystem.getRecentForaging', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空日志返回空数组', () => { expect(sys.getRecentForaging(5)).toHaveLength(0) })

  it('返回最后 N 条记录', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).forageLog.push(makeEvent(i)) }
    const recent = sys.getRecentForaging(3)
    expect(recent).toHaveLength(3)
    expect(recent[0].creatureId).toBe(3)
  })

  it('返回副本非内部引用', () => {
    ;(sys as any).forageLog.push(makeEvent(1))
    expect(sys.getRecentForaging(1)).not.toBe((sys as any).forageLog)
  })
})
