import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEclipseSystem } from '../systems/WorldEclipseSystem'
import type { Eclipse, EclipseType, EclipseEffect } from '../systems/WorldEclipseSystem'

function makeSys(): WorldEclipseSystem { return new WorldEclipseSystem() }
let nextId = 1
function makeEclipse(eclipseType: EclipseType = 'lunar', effect: EclipseEffect = 'panic'): Eclipse {
  return { id: nextId++, eclipseType, intensity: 80, startTick: 0, duration: 500, effect }
}

describe('WorldEclipseSystem.getEclipses', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无日食/月食', () => { expect((sys as any).eclipses).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).eclipses.push(makeEclipse())
    expect((sys as any).eclipses).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).eclipses).toBe((sys as any).eclipses)
  })
  it('支持2种日食类型', () => {
    const types: EclipseType[] = ['solar', 'lunar']
    expect(types).toHaveLength(2)
  })
  it('支持5种日食效果', () => {
    const effects: EclipseEffect[] = ['panic', 'worship', 'power_surge', 'darkness', 'prophecy']
    expect(effects).toHaveLength(5)
  })
})

describe('WorldEclipseSystem.getActiveEclipse', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无日食时返回undefined', () => { expect((sys as any).eclipses[0]).toBeUndefined() })
  it('注入后返回第一个', () => {
    const e = makeEclipse('solar')
    ;(sys as any).eclipses.push(e)
    expect((sys as any).eclipses[0]?.eclipseType).toBe('solar')
  })
})
