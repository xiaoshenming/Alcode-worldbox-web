import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMaelstromSystem } from '../systems/WorldMaelstromSystem'
import type { Maelstrom } from '../systems/WorldMaelstromSystem'

function makeSys(): WorldMaelstromSystem { return new WorldMaelstromSystem() }
let nextId = 1
function makeMaelstrom(active = true): Maelstrom {
  return { id: nextId++, x: 50, y: 50, radius: 15, maxRadius: 20, strength: 80, phase: 0.5, growthRate: 0.1, age: 500, active }
}

describe('WorldMaelstromSystem', () => {
  let sys: WorldMaelstromSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无大漩涡', () => { expect(sys.getMaelstroms()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom())
    expect(sys.getMaelstroms()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getMaelstroms()).toBe((sys as any).maelstroms)
  })
  it('getActiveMaelstroms只返回active=true', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom(true))
    ;(sys as any).maelstroms.push(makeMaelstrom(false))
    expect(sys.getActiveMaelstroms()).toHaveLength(1)
  })
  it('大漩涡字段正确', () => {
    ;(sys as any).maelstroms.push(makeMaelstrom())
    const m = sys.getMaelstroms()[0]
    expect(m.strength).toBe(80)
    expect(m.radius).toBe(15)
    expect(m.active).toBe(true)
  })
})
