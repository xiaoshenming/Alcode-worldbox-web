import { describe, it, expect, beforeEach } from 'vitest'
import { VolcanoSystem } from '../systems/VolcanoSystem'
import type { Volcano } from '../systems/VolcanoSystem'

function makeSys(): VolcanoSystem { return new VolcanoSystem() }
let nextId = 1
function makeVolcano(): Volcano {
  return {
    id: nextId++, x: 10, y: 10,
    pressure: 50, pressureRate: 0.5, active: false,
    eruptionTick: 0, eruptionDuration: 200,
    dormantUntil: 0, lavaFlows: []
  }
}

describe('VolcanoSystem.getVolcanoes', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无火山', () => { expect(sys.getVolcanoes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()).toHaveLength(1)
  })
  it('返回内部引用（只读数组）', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()).toBe(sys.getVolcanoes())
  })
  it('火山字段正确', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    const v = sys.getVolcanoes()[0]
    expect(v.pressure).toBe(50)
    expect(v.active).toBe(false)
    expect(v.lavaFlows).toHaveLength(0)
  })
  it('多个火山全部返回', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()).toHaveLength(2)
  })
})
