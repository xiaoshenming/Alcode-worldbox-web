import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLavaTubeSystem } from '../systems/WorldLavaTubeSystem'
import type { LavaTube } from '../systems/WorldLavaTubeSystem'

function makeSys(): WorldLavaTubeSystem { return new WorldLavaTubeSystem() }
let nextId = 1
function makeTube(): LavaTube {
  return { id: nextId++, x: 15, y: 25, length: 50, diameter: 5, crustThickness: 3, internalTemp: 150, collapseRisk: 20, spectacle: 65, tick: 0 }
}

describe('WorldLavaTubeSystem.getTubes', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无熔岩管', () => { expect((sys as any).tubes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tubes.push(makeTube())
    expect((sys as any).tubes).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).tubes).toBe((sys as any).tubes)
  })
  it('熔岩管字段正确', () => {
    ;(sys as any).tubes.push(makeTube())
    const t = (sys as any).tubes[0]
    expect(t.internalTemp).toBe(150)
    expect(t.collapseRisk).toBe(20)
    expect(t.spectacle).toBe(65)
  })
  it('多个熔岩管全部返回', () => {
    ;(sys as any).tubes.push(makeTube())
    ;(sys as any).tubes.push(makeTube())
    expect((sys as any).tubes).toHaveLength(2)
  })
})
