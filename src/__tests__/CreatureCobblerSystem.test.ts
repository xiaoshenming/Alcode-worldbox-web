import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCobblersSystem } from '../systems/CreatureCobblerSystem'
import type { Cobbler, FootwearType } from '../systems/CreatureCobblerSystem'

let nextId = 1
function makeSys(): CreatureCobblersSystem { return new CreatureCobblersSystem() }
function makeCobbler(entityId: number, footwearType: FootwearType = 'sandal'): Cobbler {
  return { id: nextId++, entityId, skill: 30, pairsCompleted: 10, footwearType, durability: 60, comfort: 50, tick: 0 }
}

describe('CreatureCobblersSystem.getCobblers', () => {
  let sys: CreatureCobblersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无鞋匠', () => { expect(sys.getCobblers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).cobblers.push(makeCobbler(1, 'boot'))
    expect(sys.getCobblers()[0].footwearType).toBe('boot')
  })

  it('返回内部引用', () => {
    ;(sys as any).cobblers.push(makeCobbler(1))
    expect(sys.getCobblers()).toBe((sys as any).cobblers)
  })

  it('支持所有 4 种鞋类类型', () => {
    const types: FootwearType[] = ['sandal', 'shoe', 'boot', 'armored']
    types.forEach((t, i) => { ;(sys as any).cobblers.push(makeCobbler(i + 1, t)) })
    const all = sys.getCobblers()
    types.forEach((t, i) => { expect(all[i].footwearType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).cobblers.push(makeCobbler(1))
    ;(sys as any).cobblers.push(makeCobbler(2))
    expect(sys.getCobblers()).toHaveLength(2)
  })
})
