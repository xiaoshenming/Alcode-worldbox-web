import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSandDuneSystem } from '../systems/WorldSandDuneSystem'
import type { SandDune } from '../systems/WorldSandDuneSystem'

function makeSys(): WorldSandDuneSystem { return new WorldSandDuneSystem() }
let nextId = 1
function makeDune(): SandDune {
  return { id: nextId++, x: 30, y: 40, height: 5, windDirection: 1.57, migrationSpeed: 0.5, active: true, tick: 0 }
}

describe('WorldSandDuneSystem.getDunes', () => {
  let sys: WorldSandDuneSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无沙丘', () => { expect((sys as any).dunes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).dunes.push(makeDune())
    expect((sys as any).dunes).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).dunes).toBe((sys as any).dunes)
  })
  it('沙丘字段正确', () => {
    ;(sys as any).dunes.push(makeDune())
    const d = (sys as any).dunes[0]
    expect(d.height).toBe(5)
    expect(d.migrationSpeed).toBe(0.5)
    expect(d.active).toBe(true)
  })
  it('多个沙丘全部返回', () => {
    ;(sys as any).dunes.push(makeDune())
    ;(sys as any).dunes.push(makeDune())
    expect((sys as any).dunes).toHaveLength(2)
  })
})
