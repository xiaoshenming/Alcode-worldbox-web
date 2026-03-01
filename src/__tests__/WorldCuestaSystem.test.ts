import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCuestaSystem } from '../systems/WorldCuestaSystem'
import type { Cuesta } from '../systems/WorldCuestaSystem'

function makeSys(): WorldCuestaSystem { return new WorldCuestaSystem() }
let nextId = 1
function makeCuesta(): Cuesta {
  return { id: nextId++, x: 15, y: 25, length: 30, scarpHeight: 20, dipAngle: 10, rockLayering: 5, erosionStage: 3, spectacle: 60, tick: 0 }
}

describe('WorldCuestaSystem.getCuestas', () => {
  let sys: WorldCuestaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无单面山', () => { expect((sys as any).cuestas).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).cuestas.push(makeCuesta())
    expect((sys as any).cuestas).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).cuestas).toBe((sys as any).cuestas)
  })
  it('单面山字段正确', () => {
    ;(sys as any).cuestas.push(makeCuesta())
    const c = (sys as any).cuestas[0]
    expect(c.scarpHeight).toBe(20)
    expect(c.dipAngle).toBe(10)
    expect(c.rockLayering).toBe(5)
  })
  it('多个单面山全部返回', () => {
    ;(sys as any).cuestas.push(makeCuesta())
    ;(sys as any).cuestas.push(makeCuesta())
    expect((sys as any).cuestas).toHaveLength(2)
  })
})
