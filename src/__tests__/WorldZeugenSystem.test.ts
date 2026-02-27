import { describe, it, expect, beforeEach } from 'vitest'
import { WorldZeugenSystem } from '../systems/WorldZeugenSystem'
import type { Zeugen } from '../systems/WorldZeugenSystem'

function makeSys(): WorldZeugenSystem { return new WorldZeugenSystem() }
let nextId = 1
function makeZeugen(): Zeugen {
  return { id: nextId++, x: 20, y: 30, capWidth: 10, pillarHeight: 8, erosionRate: 3, capHardness: 80, baseWeakness: 60, spectacle: 65, tick: 0 }
}

describe('WorldZeugenSystem.getZeugens', () => {
  let sys: WorldZeugenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蘑菇岩', () => { expect(sys.getZeugens()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zeugens.push(makeZeugen())
    expect(sys.getZeugens()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZeugens()).toBe((sys as any).zeugens)
  })
  it('蘑菇岩字段正确', () => {
    ;(sys as any).zeugens.push(makeZeugen())
    const z = sys.getZeugens()[0]
    expect(z.capHardness).toBe(80)
    expect(z.baseWeakness).toBe(60)
    expect(z.spectacle).toBe(65)
  })
})
