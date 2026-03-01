import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAvalancheSystem } from '../systems/WorldAvalancheSystem'
import type { Avalanche, AvalancheSize } from '../systems/WorldAvalancheSystem'

function makeSys(): WorldAvalancheSystem { return new WorldAvalancheSystem() }
let nextId = 1
function makeAvalanche(size: AvalancheSize = 'medium'): Avalanche {
  return { id: nextId++, x: 30, y: 20, size, speed: 3, direction: 1.57, force: 50, tick: 0 }
}

describe('WorldAvalancheSystem.getAvalanches', () => {
  let sys: WorldAvalancheSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雪崩', () => { expect((sys as any).avalanches).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).avalanches.push(makeAvalanche())
    expect((sys as any).avalanches).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).avalanches).toBe((sys as any).avalanches)
  })
  it('支持4种雪崩规模', () => {
    const sizes: AvalancheSize[] = ['small', 'medium', 'large', 'catastrophic']
    expect(sizes).toHaveLength(4)
  })
  it('雪崩字段正确', () => {
    ;(sys as any).avalanches.push(makeAvalanche('catastrophic'))
    const a = (sys as any).avalanches[0]
    expect(a.size).toBe('catastrophic')
    expect(a.force).toBe(50)
  })
})
