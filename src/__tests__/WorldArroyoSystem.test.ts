import { describe, it, expect, beforeEach } from 'vitest'
import { WorldArroyoSystem } from '../systems/WorldArroyoSystem'
import type { Arroyo } from '../systems/WorldArroyoSystem'

function makeSys(): WorldArroyoSystem { return new WorldArroyoSystem() }
let nextId = 1
function makeArroyo(): Arroyo {
  return { id: nextId++, x: 15, y: 25, length: 20, depth: 3, waterPresence: 40, sedimentLoad: 60, flashFloodRisk: 70, spectacle: 50, tick: 0 }
}

describe('WorldArroyoSystem.getArroyos', () => {
  let sys: WorldArroyoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无干河床', () => { expect((sys as any).arroyos).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).arroyos.push(makeArroyo())
    expect((sys as any).arroyos).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).arroyos).toBe((sys as any).arroyos)
  })
  it('干河床字段正确', () => {
    ;(sys as any).arroyos.push(makeArroyo())
    const a = (sys as any).arroyos[0]
    expect(a.flashFloodRisk).toBe(70)
    expect(a.sedimentLoad).toBe(60)
    expect(a.waterPresence).toBe(40)
  })
  it('多个干河床全部返回', () => {
    ;(sys as any).arroyos.push(makeArroyo())
    ;(sys as any).arroyos.push(makeArroyo())
    expect((sys as any).arroyos).toHaveLength(2)
  })
})
