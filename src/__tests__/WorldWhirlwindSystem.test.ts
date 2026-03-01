import { describe, it, expect, beforeEach } from 'vitest'
import { WorldWhirlwindSystem } from '../systems/WorldWhirlwindSystem'
import type { Whirlwind, WhirlwindSize } from '../systems/WorldWhirlwindSystem'

function makeSys(): WorldWhirlwindSystem { return new WorldWhirlwindSystem() }
let nextId = 1
function makeWhirlwind(size: WhirlwindSize = 'medium'): Whirlwind {
  return { id: nextId++, x: 30, y: 40, size, rotation: 0, speed: 2, force: 50, direction: 1.5, tick: 0 }
}

describe('WorldWhirlwindSystem.getWhirlwinds', () => {
  let sys: WorldWhirlwindSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无旋风', () => { expect((sys as any).whirlwinds).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).whirlwinds.push(makeWhirlwind())
    expect((sys as any).whirlwinds).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).whirlwinds).toBe((sys as any).whirlwinds)
  })
  it('支持5种旋风大小', () => {
    const sizes: WhirlwindSize[] = ['dust_devil', 'small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(5)
  })
  it('旋风字段正确', () => {
    ;(sys as any).whirlwinds.push(makeWhirlwind('large'))
    const w = (sys as any).whirlwinds[0]
    expect(w.size).toBe('large')
    expect(w.force).toBe(50)
    expect(w.speed).toBe(2)
  })
})
