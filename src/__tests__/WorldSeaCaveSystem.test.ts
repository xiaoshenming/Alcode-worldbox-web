import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSeaCaveSystem } from '../systems/WorldSeaCaveSystem'
import type { SeaCave } from '../systems/WorldSeaCaveSystem'

function makeSys(): WorldSeaCaveSystem { return new WorldSeaCaveSystem() }
let nextId = 1
function makeCave(): SeaCave {
  return { id: nextId++, x: 15, y: 25, depth: 15, entranceWidth: 5, ceilingHeight: 8, waveReach: 10, stability: 70, spectacle: 75, tick: 0 }
}

describe('WorldSeaCaveSystem.getCaves', () => {
  let sys: WorldSeaCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无海蚀洞', () => { expect(sys.getCaves()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).caves.push(makeCave())
    expect(sys.getCaves()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getCaves()).toBe((sys as any).caves)
  })
  it('海蚀洞字段正确', () => {
    ;(sys as any).caves.push(makeCave())
    const c = sys.getCaves()[0]
    expect(c.entranceWidth).toBe(5)
    expect(c.stability).toBe(70)
    expect(c.spectacle).toBe(75)
  })
  it('多个海蚀洞全部返回', () => {
    ;(sys as any).caves.push(makeCave())
    ;(sys as any).caves.push(makeCave())
    expect(sys.getCaves()).toHaveLength(2)
  })
})
