import { describe, it, expect, beforeEach } from 'vitest'
import { WorldIceShelfSystem } from '../systems/WorldIceShelfSystem'
import type { IceShelf } from '../systems/WorldIceShelfSystem'

function makeSys(): WorldIceShelfSystem { return new WorldIceShelfSystem() }
let nextId = 1
function makeShelf(): IceShelf {
  return { id: nextId++, x: 40, y: 50, radius: 15, thickness: 20, stability: 70, calvingRate: 5, temperature: -15, tick: 0 }
}

describe('WorldIceShelfSystem.getShelves', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰架', () => { expect((sys as any).shelves).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shelves.push(makeShelf())
    expect((sys as any).shelves).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).shelves).toBe((sys as any).shelves)
  })
  it('冰架字段正确', () => {
    ;(sys as any).shelves.push(makeShelf())
    const s = (sys as any).shelves[0]
    expect(s.thickness).toBe(20)
    expect(s.stability).toBe(70)
    expect(s.calvingRate).toBe(5)
  })
  it('多个冰架全部返回', () => {
    ;(sys as any).shelves.push(makeShelf())
    ;(sys as any).shelves.push(makeShelf())
    expect((sys as any).shelves).toHaveLength(2)
  })
})
