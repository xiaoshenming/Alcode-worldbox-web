import { describe, it, expect, beforeEach } from 'vitest'
import { WorldChalybeateSpringSystem } from '../systems/WorldChalybeateSpringSystem'
import type { ChalybeateSpring } from '../systems/WorldChalybeateSpringSystem'

function makeSys(): WorldChalybeateSpringSystem { return new WorldChalybeateSpringSystem() }
let nextId = 1
function makeSpring(): ChalybeateSpring {
  return { id: nextId++, x: 20, y: 30, ironContent: 50, flowRate: 40, rustDeposit: 20, waterTaste: 60, tick: 0 }
}

describe('WorldChalybeateSpringSystem.getSprings', () => {
  let sys: WorldChalybeateSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铁泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('铁泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.ironContent).toBe(50)
    expect(s.flowRate).toBe(40)
    expect(s.rustDeposit).toBe(20)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
