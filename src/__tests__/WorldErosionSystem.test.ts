import { describe, it, expect, beforeEach } from 'vitest'
import { WorldErosionSystem } from '../systems/WorldErosionSystem'

function makeSys(): WorldErosionSystem { return new WorldErosionSystem() }

describe('WorldErosionSystem.getTotalErosions', () => {
  let sys: WorldErosionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始侵蚀数为0', () => {
    expect(sys.getTotalErosions()).toBe(0)
  })
  it('注入后增加', () => {
    ;(sys as any).totalErosions = 42
    expect(sys.getTotalErosions()).toBe(42)
  })
  it('返回数值类型', () => {
    expect(typeof sys.getTotalErosions()).toBe('number')
  })
})
