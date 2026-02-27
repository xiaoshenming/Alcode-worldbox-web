import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBlowholeSystem } from '../systems/WorldBlowholeSystem'
import type { Blowhole } from '../systems/WorldBlowholeSystem'

function makeSys(): WorldBlowholeSystem { return new WorldBlowholeSystem() }
let nextId = 1
function makeBlowhole(): Blowhole {
  return { id: nextId++, x: 5, y: 10, caveDepth: 8, openingSize: 3, sprayHeight: 15, waveForce: 6, erosionRate: 0.5, spectacle: 80, tick: 0 }
}

describe('WorldBlowholeSystem.getBlowholes', () => {
  let sys: WorldBlowholeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无喷水洞', () => { expect(sys.getBlowholes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    expect(sys.getBlowholes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getBlowholes()).toBe((sys as any).blowholes)
  })
  it('喷水洞字段正确', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    const b = sys.getBlowholes()[0]
    expect(b.caveDepth).toBe(8)
    expect(b.sprayHeight).toBe(15)
    expect(b.spectacle).toBe(80)
  })
  it('多个喷水洞全部返回', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    ;(sys as any).blowholes.push(makeBlowhole())
    expect(sys.getBlowholes()).toHaveLength(2)
  })
})
