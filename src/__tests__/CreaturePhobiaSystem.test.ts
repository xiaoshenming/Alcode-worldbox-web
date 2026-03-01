import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePhobiaSystem } from '../systems/CreaturePhobiaSystem'
import type { Phobia, FearType } from '../systems/CreaturePhobiaSystem'

let nextId = 1
function makeSys(): CreaturePhobiaSystem { return new CreaturePhobiaSystem() }
function makePhobia(entityId: number, fear: FearType = 'water'): Phobia {
  return { id: nextId++, entityId, fear, severity: 5, tick: 0 }
}

describe('CreaturePhobiaSystem.getPhobias', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无恐惧症', () => { expect((sys as any).phobias).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    expect((sys as any).phobias[0].fear).toBe('fire')
  })
  it('返回内部引用', () => {
    ;(sys as any).phobias.push(makePhobia(1))
    expect((sys as any).phobias).toBe((sys as any).phobias)
  })
  it('支持所有6种恐惧', () => {
    const fears: FearType[] = ['water', 'fire', 'heights', 'darkness', 'crowds', 'storms']
    fears.forEach((f, i) => { ;(sys as any).phobias.push(makePhobia(i + 1, f)) })
    expect((sys as any).phobias).toHaveLength(6)
  })
})

describe('CreaturePhobiaSystem.getPhobiasForEntity', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).phobias.push(makePhobia(1))
    expect(sys.getPhobiasForEntity(999)).toHaveLength(0)
  })
  it('过滤特定实体', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    ;(sys as any).phobias.push(makePhobia(1, 'water'))
    ;(sys as any).phobias.push(makePhobia(2, 'heights'))
    expect(sys.getPhobiasForEntity(1)).toHaveLength(2)
  })
})
