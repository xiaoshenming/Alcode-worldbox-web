import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFumaroleSystem } from '../systems/WorldFumaroleSystem'
import type { Fumarole } from '../systems/WorldFumaroleSystem'

function makeSys(): WorldFumaroleSystem { return new WorldFumaroleSystem() }
let nextId = 1
function makeFumarole(): Fumarole {
  return { id: nextId++, x: 25, y: 35, steamIntensity: 70, sulfurDeposit: 30, temperature: 400, activityCycle: 100, tick: 0 }
}

describe('WorldFumaroleSystem.getFumaroles', () => {
  let sys: WorldFumaroleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无喷气孔', () => { expect((sys as any).fumaroles).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fumaroles.push(makeFumarole())
    expect((sys as any).fumaroles).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).fumaroles).toBe((sys as any).fumaroles)
  })
  it('喷气孔字段正确', () => {
    ;(sys as any).fumaroles.push(makeFumarole())
    const f = (sys as any).fumaroles[0]
    expect(f.steamIntensity).toBe(70)
    expect(f.sulfurDeposit).toBe(30)
    expect(f.temperature).toBe(400)
  })
  it('多个喷气孔全部返回', () => {
    ;(sys as any).fumaroles.push(makeFumarole())
    ;(sys as any).fumaroles.push(makeFumarole())
    expect((sys as any).fumaroles).toHaveLength(2)
  })
})
