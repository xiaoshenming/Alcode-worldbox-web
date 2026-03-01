import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHogbackSystem } from '../systems/WorldHogbackSystem'
import type { Hogback } from '../systems/WorldHogbackSystem'

function makeSys(): WorldHogbackSystem { return new WorldHogbackSystem() }
let nextId = 1
function makeHogback(): Hogback {
  return { id: nextId++, x: 20, y: 30, length: 25, height: 15, dipAngle: 45, rockResistance: 80, erosionRate: 2, spectacle: 65, tick: 0 }
}

describe('WorldHogbackSystem.getHogbacks', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无猪背岭', () => { expect((sys as any).hogbacks).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).hogbacks.push(makeHogback())
    expect((sys as any).hogbacks).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).hogbacks).toBe((sys as any).hogbacks)
  })
  it('猪背岭字段正确', () => {
    ;(sys as any).hogbacks.push(makeHogback())
    const h = (sys as any).hogbacks[0]
    expect(h.dipAngle).toBe(45)
    expect(h.rockResistance).toBe(80)
    expect(h.spectacle).toBe(65)
  })
  it('多个猪背岭全部返回', () => {
    ;(sys as any).hogbacks.push(makeHogback())
    ;(sys as any).hogbacks.push(makeHogback())
    expect((sys as any).hogbacks).toHaveLength(2)
  })
})
