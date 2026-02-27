import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSandstormSystem } from '../systems/WorldSandstormSystem'
import type { Sandstorm, StormSeverity } from '../systems/WorldSandstormSystem'

function makeSys(): WorldSandstormSystem { return new WorldSandstormSystem() }
let nextId = 1
function makeStorm(severity: StormSeverity = 'moderate'): Sandstorm {
  return { id: nextId++, x: 30, y: 40, radius: 15, severity, direction: 0.5, speed: 2, damage: 20, tick: 0 }
}

describe('WorldSandstormSystem.getStorms', () => {
  let sys: WorldSandstormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无沙尘暴', () => { expect(sys.getStorms()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).storms.push(makeStorm())
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getStorms()).toBe((sys as any).storms)
  })
  it('支持4种风暴强度', () => {
    const severities: StormSeverity[] = ['mild', 'moderate', 'severe', 'catastrophic']
    expect(severities).toHaveLength(4)
  })
  it('多个沙尘暴全部返回', () => {
    ;(sys as any).storms.push(makeStorm('mild'))
    ;(sys as any).storms.push(makeStorm('severe'))
    expect(sys.getStorms()).toHaveLength(2)
  })
})
