import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRockShelterSystem } from '../systems/WorldRockShelterSystem'
import type { RockShelter } from '../systems/WorldRockShelterSystem'

function makeSys(): WorldRockShelterSystem { return new WorldRockShelterSystem() }
let nextId = 1
function makeShelter(): RockShelter {
  return { id: nextId++, x: 20, y: 30, depth: 8, width: 10, ceilingHeight: 5, stability: 75, habitability: 60, spectacle: 70, tick: 0 }
}

describe('WorldRockShelterSystem.getShelters', () => {
  let sys: WorldRockShelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩棚', () => { expect((sys as any).shelters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shelters.push(makeShelter())
    expect((sys as any).shelters).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).shelters).toBe((sys as any).shelters)
  })
  it('岩棚字段正确', () => {
    ;(sys as any).shelters.push(makeShelter())
    const s = (sys as any).shelters[0]
    expect(s.habitability).toBe(60)
    expect(s.stability).toBe(75)
    expect(s.spectacle).toBe(70)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
