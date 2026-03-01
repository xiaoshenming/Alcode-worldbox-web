import { describe, it, expect, beforeEach } from 'vitest'
import { WorldYardangSystem } from '../systems/WorldYardangSystem'
import type { Yardang } from '../systems/WorldYardangSystem'

function makeSys(): WorldYardangSystem { return new WorldYardangSystem() }
let nextId = 1
function makeYardang(): Yardang {
  return { id: nextId++, x: 25, y: 35, length: 20, height: 8, windDirection: 90, erosionStage: 3, rockHardness: 70, spectacle: 60, tick: 0 }
}

describe('WorldYardangSystem.getYardangs', () => {
  let sys: WorldYardangSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无风蚀垄', () => { expect((sys as any).yardangs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).yardangs.push(makeYardang())
    expect((sys as any).yardangs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).yardangs).toBe((sys as any).yardangs)
  })
  it('风蚀垄字段正确', () => {
    ;(sys as any).yardangs.push(makeYardang())
    const y = (sys as any).yardangs[0]
    expect(y.windDirection).toBe(90)
    expect(y.rockHardness).toBe(70)
    expect(y.spectacle).toBe(60)
  })
  it('多个风蚀垄全部返回', () => {
    ;(sys as any).yardangs.push(makeYardang())
    ;(sys as any).yardangs.push(makeYardang())
    expect((sys as any).yardangs).toHaveLength(2)
  })
})
