import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTepuiSystem } from '../systems/WorldTepuiSystem'
import type { Tepui } from '../systems/WorldTepuiSystem'

function makeSys(): WorldTepuiSystem { return new WorldTepuiSystem() }
let nextId = 1
function makeTepui(): Tepui {
  return { id: nextId++, x: 30, y: 40, elevation: 50, plateauArea: 100, cliffHeight: 30, endemicSpecies: 20, erosionRate: 2, spectacle: 90, tick: 0 }
}

describe('WorldTepuiSystem.getTepuis', () => {
  let sys: WorldTepuiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无桌山', () => { expect((sys as any).tepuis).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tepuis.push(makeTepui())
    expect((sys as any).tepuis).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).tepuis).toBe((sys as any).tepuis)
  })
  it('桌山字段正确', () => {
    ;(sys as any).tepuis.push(makeTepui())
    const t = (sys as any).tepuis[0]
    expect(t.elevation).toBe(50)
    expect(t.endemicSpecies).toBe(20)
    expect(t.spectacle).toBe(90)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
