import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFletchersSystem } from '../systems/CreatureFletchersSystem'
import type { Fletcher, ProjectileType } from '../systems/CreatureFletchersSystem'

let nextId = 1
function makeSys(): CreatureFletchersSystem { return new CreatureFletchersSystem() }
function makeFletcher(entityId: number, projectileType: ProjectileType = 'arrow'): Fletcher {
  return { id: nextId++, entityId, skill: 40, projectilesCrafted: 30, projectileType, accuracy: 75, penetration: 65, tick: 0 }
}

describe('CreatureFletchersSystem.getFletchers', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无箭匠', () => { expect(sys.getFletchers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, 'bolt'))
    expect(sys.getFletchers()[0].projectileType).toBe('bolt')
  })

  it('返回内部引用', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect(sys.getFletchers()).toBe((sys as any).fletchers)
  })

  it('支持所有 4 种投射物类型', () => {
    const types: ProjectileType[] = ['arrow', 'bolt', 'dart', 'javelin']
    types.forEach((t, i) => { ;(sys as any).fletchers.push(makeFletcher(i + 1, t)) })
    const all = sys.getFletchers()
    types.forEach((t, i) => { expect(all[i].projectileType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).fletchers.push(makeFletcher(2))
    expect(sys.getFletchers()).toHaveLength(2)
  })
})
