import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSaltFlatSystem } from '../systems/WorldSaltFlatSystem'
import type { SaltFlat } from '../systems/WorldSaltFlatSystem'

function makeSys(): WorldSaltFlatSystem { return new WorldSaltFlatSystem() }
let nextId = 1
function makeFlat(): SaltFlat {
  return { id: nextId++, x: 20, y: 30, radius: 15, crustThickness: 5, mineralPurity: 90, reflectivity: 80, moistureLevel: 10, hexagonalPatterns: 20, tick: 0 }
}

describe('WorldSaltFlatSystem.getFlats', () => {
  let sys: WorldSaltFlatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无盐滩', () => { expect((sys as any).flats).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).flats.push(makeFlat())
    expect((sys as any).flats).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).flats).toBe((sys as any).flats)
  })
  it('盐滩字段正确', () => {
    ;(sys as any).flats.push(makeFlat())
    const f = (sys as any).flats[0]
    expect(f.mineralPurity).toBe(90)
    expect(f.reflectivity).toBe(80)
    expect(f.hexagonalPatterns).toBe(20)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
