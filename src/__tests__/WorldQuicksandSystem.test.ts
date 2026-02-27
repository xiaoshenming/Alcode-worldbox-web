import { describe, it, expect, beforeEach } from 'vitest'
import { WorldQuicksandSystem } from '../systems/WorldQuicksandSystem'
import type { QuicksandPit } from '../systems/WorldQuicksandSystem'

function makeSys(): WorldQuicksandSystem { return new WorldQuicksandSystem() }
let nextId = 1
function makePit(): QuicksandPit {
  return { id: nextId++, x: 30, y: 40, depth: 5, viscosity: 0.8, radius: 4, trappedCount: 0, active: true, tick: 0 }
}

describe('WorldQuicksandSystem.getPits', () => {
  let sys: WorldQuicksandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流沙坑', () => { expect(sys.getPits()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pits.push(makePit())
    expect(sys.getPits()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPits()).toBe((sys as any).pits)
  })
  it('流沙坑字段正确', () => {
    ;(sys as any).pits.push(makePit())
    const p = sys.getPits()[0]
    expect(p.depth).toBe(5)
    expect(p.viscosity).toBe(0.8)
    expect(p.active).toBe(true)
  })
  it('多个流沙坑全部返回', () => {
    ;(sys as any).pits.push(makePit())
    ;(sys as any).pits.push(makePit())
    ;(sys as any).pits.push(makePit())
    expect(sys.getPits()).toHaveLength(3)
  })
})
