import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCoralAtollSystem } from '../systems/WorldCoralAtollSystem'
import type { CoralAtoll } from '../systems/WorldCoralAtollSystem'

function makeSys(): WorldCoralAtollSystem { return new WorldCoralAtollSystem() }
let nextId = 1
function makeAtoll(): CoralAtoll {
  return { id: nextId++, x: 40, y: 50, outerRadius: 20, innerRadius: 10, coralHealth: 80, lagoonDepth: 15, biodiversity: 90, bleachingRisk: 30, tick: 0 }
}

describe('WorldCoralAtollSystem.getAtolls', () => {
  let sys: WorldCoralAtollSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚环礁', () => { expect((sys as any).atolls).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).atolls.push(makeAtoll())
    expect((sys as any).atolls).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).atolls).toBe((sys as any).atolls)
  })
  it('珊瑚环礁字段正确', () => {
    ;(sys as any).atolls.push(makeAtoll())
    const a = (sys as any).atolls[0]
    expect(a.coralHealth).toBe(80)
    expect(a.biodiversity).toBe(90)
    expect(a.bleachingRisk).toBe(30)
  })
  it('多个珊瑚环礁全部返回', () => {
    ;(sys as any).atolls.push(makeAtoll())
    ;(sys as any).atolls.push(makeAtoll())
    expect((sys as any).atolls).toHaveLength(2)
  })
})
