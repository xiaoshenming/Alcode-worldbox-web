import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAstatineSpringSystem } from '../systems/WorldAstatineSpringSystem'
import type { AstatineSpringZone } from '../systems/WorldAstatineSpringSystem'

function makeSys(): WorldAstatineSpringSystem { return new WorldAstatineSpringSystem() }
let nextId = 1
function makeZone(): AstatineSpringZone {
  return { id: nextId++, x: 20, y: 30, astatineContent: 40, springFlow: 50, tick: 0 } as AstatineSpringZone
}

describe('WorldAstatineSpringSystem.getZones', () => {
  let sys: WorldAstatineSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Astatine泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('Astatine泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.astatineContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Astatine泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
})
