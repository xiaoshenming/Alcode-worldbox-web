import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePinMakersSystem } from '../systems/CreaturePinMakersSystem'
import type { PinMaker, PinMaterial } from '../systems/CreaturePinMakersSystem'

let nextId = 1
function makeSys(): CreaturePinMakersSystem { return new CreaturePinMakersSystem() }
function makeMaker(entityId: number, material: PinMaterial = 'brass'): PinMaker {
  return { id: nextId++, entityId, skill: 70, pinsMade: 50, material, sharpness: 75, reputation: 40, tick: 0 }
}

describe('CreaturePinMakersSystem.getMakers', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无针钉工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silver'))
    expect(sys.getMakers()[0].material).toBe('silver')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有4种材料', () => {
    const materials: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = sys.getMakers()
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
