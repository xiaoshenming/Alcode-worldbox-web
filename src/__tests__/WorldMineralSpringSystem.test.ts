import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMineralSpringSystem } from '../systems/WorldMineralSpringSystem'
import type { MineralSpring } from '../systems/WorldMineralSpringSystem'

function makeSys(): WorldMineralSpringSystem { return new WorldMineralSpringSystem() }
let nextId = 1
function makeSpring(): MineralSpring {
  return { id: nextId++, x: 20, y: 30, mineralRichness: 70, flowRate: 50, temperature: 20, purity: 80, tick: 0 }
}

describe('WorldMineralSpringSystem.getSprings', () => {
  let sys: WorldMineralSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无矿泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('矿泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.mineralRichness).toBe(70)
    expect(s.purity).toBe(80)
    expect(s.temperature).toBe(20)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
