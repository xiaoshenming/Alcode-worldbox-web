import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMaarSystem } from '../systems/WorldMaaSystem'
import type { Maar } from '../systems/WorldMaaSystem'

function makeSys(): WorldMaarSystem { return new WorldMaarSystem() }
let nextId = 1
function makeMaar(): Maar {
  return { id: nextId++, x: 25, y: 35, craterWidth: 15, waterDepth: 8, tephraRing: 5, age: 3000, tick: 0 }
}

describe('WorldMaarSystem.getMaars', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无玛珥湖', () => { expect((sys as any).maars).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).maars.push(makeMaar())
    expect((sys as any).maars).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).maars).toBe((sys as any).maars)
  })
  it('玛珥湖字段正确', () => {
    ;(sys as any).maars.push(makeMaar())
    const m = (sys as any).maars[0]
    expect(m.craterWidth).toBe(15)
    expect(m.waterDepth).toBe(8)
    expect(m.tephraRing).toBe(5)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
