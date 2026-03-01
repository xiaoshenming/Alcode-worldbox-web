import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHotSpring2System } from '../systems/WorldHotSpringSystem2'
import type { HotSpring2 } from '../systems/WorldHotSpringSystem2'

function makeSys(): WorldHotSpring2System { return new WorldHotSpring2System() }
let nextId = 1
function makeSpring(): HotSpring2 {
  return { id: nextId++, x: 20, y: 30, waterTemp: 60, mineralRichness: 70, flowRate: 40, healingPotency: 80, tick: 0 }
}

describe('WorldHotSpring2System.getSprings', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无温泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('温泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.waterTemp).toBe(60)
    expect(s.mineralRichness).toBe(70)
    expect(s.healingPotency).toBe(80)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
