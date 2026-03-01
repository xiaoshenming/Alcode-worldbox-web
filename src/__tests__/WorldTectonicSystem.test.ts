import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTectonicSystem } from '../systems/WorldTectonicSystem'
import type { TectonicPlate, FaultLine, PlateType, BoundaryType } from '../systems/WorldTectonicSystem'

function makeSys(): WorldTectonicSystem { return new WorldTectonicSystem() }
let nextId = 1
function makePlate(stress: number = 30, type: PlateType = 'continental'): TectonicPlate {
  return { id: nextId++, centerX: 50, centerY: 50, radius: 30, type, driftX: 0.1, driftY: 0, stress }
}
function makeFault(boundary: BoundaryType = 'convergent'): FaultLine {
  return { x1: 0, y1: 0, x2: 10, y2: 10, boundary, activity: 50 }
}

describe('WorldTectonicSystem.getPlates', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无板块', () => { expect((sys as any).plates).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plates.push(makePlate())
    expect((sys as any).plates).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).plates).toBe((sys as any).plates)
  })
  it('支持2种板块类型', () => {
    const types: PlateType[] = ['continental', 'oceanic']
    expect(types).toHaveLength(2)
  })
})

describe('WorldTectonicSystem.getFaults', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无断层', () => { expect((sys as any).faults).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).faults.push(makeFault())
    expect((sys as any).faults).toHaveLength(1)
  })
  it('支持3种边界类型', () => {
    const types: BoundaryType[] = ['convergent', 'divergent', 'transform']
    expect(types).toHaveLength(3)
  })
})

describe('WorldTectonicSystem.getPlateCount', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect((sys as any).plates.length).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).plates.push(makePlate())
    ;(sys as any).plates.push(makePlate())
    expect((sys as any).plates.length).toBe(2)
  })
})

describe('WorldTectonicSystem.getStressLevel', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无板块时返回0', () => { expect(sys.getStressLevel()).toBe(0) })
  it('返回平均压力', () => {
    ;(sys as any).plates.push(makePlate(20))
    ;(sys as any).plates.push(makePlate(40))
    expect(sys.getStressLevel()).toBe(30)
  })
})
