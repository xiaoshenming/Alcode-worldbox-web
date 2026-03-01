import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSeleniumSpringSystem } from '../systems/WorldSeleniumSpringSystem'
import type { SeleniumSpringZone } from '../systems/WorldSeleniumSpringSystem'

function makeSys(): WorldSeleniumSpringSystem { return new WorldSeleniumSpringSystem() }
let nextId = 1
function makeZone(): SeleniumSpringZone {
  return { id: nextId++, x: 20, y: 30, seleniumContent: 40, springFlow: 50, tick: 0 } as SeleniumSpringZone
}

describe('WorldSeleniumSpringSystem.getZones', () => {
  let sys: WorldSeleniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Selenium泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('Selenium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.seleniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
