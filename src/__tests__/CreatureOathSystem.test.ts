import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureOathSystem } from '../systems/CreatureOathSystem'
import type { Oath, OathType } from '../systems/CreatureOathSystem'

let nextId = 1
function makeSys(): CreatureOathSystem { return new CreatureOathSystem() }
function makeOath(creatureId: number, type: OathType = 'loyalty'): Oath {
  return { id: nextId++, creatureId, type, targetId: null, strength: 80, fulfilled: false, tick: 0 }
}

describe('CreatureOathSystem.getOaths', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无誓言', () => { expect(sys.getOaths()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).oaths.push(makeOath(1, 'vengeance'))
    expect(sys.getOaths()[0].type).toBe('vengeance')
  })
  it('返回内部引用', () => {
    ;(sys as any).oaths.push(makeOath(1))
    expect(sys.getOaths()).toBe((sys as any).oaths)
  })
  it('支持所有6种誓言类型', () => {
    const types: OathType[] = ['loyalty', 'vengeance', 'protection', 'pilgrimage', 'silence', 'service']
    types.forEach((t, i) => { ;(sys as any).oaths.push(makeOath(i + 1, t)) })
    const all = sys.getOaths()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
  it('targetId可为null', () => {
    ;(sys as any).oaths.push(makeOath(1))
    expect(sys.getOaths()[0].targetId).toBeNull()
  })
})
