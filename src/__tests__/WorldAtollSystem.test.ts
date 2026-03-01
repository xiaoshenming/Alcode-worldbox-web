import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAtollSystem } from '../systems/WorldAtollSystem'
import type { Atoll } from '../systems/WorldAtollSystem'

function makeSys(): WorldAtollSystem { return new WorldAtollSystem() }
let nextId = 1
function makeAtoll(): Atoll {
  return { id: nextId++, x: 30, y: 40, radius: 12, lagoonDepth: 15, coralHealth: 80, marineLife: 70, sandAccumulation: 20, age: 300, tick: 0 }
}

describe('WorldAtollSystem.getAtolls', () => {
  let sys: WorldAtollSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无环礁', () => { expect((sys as any).atolls).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).atolls.push(makeAtoll())
    expect((sys as any).atolls).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).atolls).toBe((sys as any).atolls)
  })
  it('环礁字段正确', () => {
    ;(sys as any).atolls.push(makeAtoll())
    const a = (sys as any).atolls[0]
    expect(a.lagoonDepth).toBe(15)
    expect(a.coralHealth).toBe(80)
    expect(a.marineLife).toBe(70)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
