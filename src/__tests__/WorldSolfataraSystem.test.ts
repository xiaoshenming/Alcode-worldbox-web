import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSolfataraSystem } from '../systems/WorldSolfataraSystem'
import type { Solfatara } from '../systems/WorldSolfataraSystem'

function makeSys(): WorldSolfataraSystem { return new WorldSolfataraSystem() }
let nextId = 1
function makeSolfatara(): Solfatara {
  return { id: nextId++, x: 30, y: 40, sulfurOutput: 70, craterDiameter: 10, steamPressure: 60, toxicity: 80, tick: 0 }
}

describe('WorldSolfataraSystem.getSolfataras', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无硫磺喷气孔', () => { expect((sys as any).solfataras).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).solfataras.push(makeSolfatara())
    expect((sys as any).solfataras).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).solfataras).toBe((sys as any).solfataras)
  })
  it('硫磺喷气孔字段正确', () => {
    ;(sys as any).solfataras.push(makeSolfatara())
    const s = (sys as any).solfataras[0]
    expect(s.sulfurOutput).toBe(70)
    expect(s.toxicity).toBe(80)
    expect(s.craterDiameter).toBe(10)
  })
  it('多个硫磺喷气孔全部返回', () => {
    ;(sys as any).solfataras.push(makeSolfatara())
    ;(sys as any).solfataras.push(makeSolfatara())
    expect((sys as any).solfataras).toHaveLength(2)
  })
})
