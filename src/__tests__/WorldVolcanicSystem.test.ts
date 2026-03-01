import { describe, it, expect, beforeEach } from 'vitest'
import { WorldVolcanicSystem } from '../systems/WorldVolcanicSystem'
import type { Volcano, VolcanoState } from '../systems/WorldVolcanicSystem'

function makeSys(): WorldVolcanicSystem { return new WorldVolcanicSystem() }
function makeVolcano(state: VolcanoState = 'active'): Volcano {
  return { id: 1, x: 50, y: 50, state, power: 70, lastEruption: 0, eruptionCount: 0, heatRadius: 5 }
}

describe('WorldVolcanicSystem.getVolcanoes', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无火山', () => { expect((sys as any).volcanoes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect((sys as any).volcanoes).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).volcanoes).toBe((sys as any).volcanoes)
  })
  it('支持5种火山状态', () => {
    const states: VolcanoState[] = ['dormant', 'rumbling', 'active', 'erupting', 'cooling']
    expect(states).toHaveLength(5)
  })
})

describe('WorldVolcanicSystem.getActiveVolcanoes', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys() })

  it('dormant和cooling不算活跃', () => {
    ;(sys as any).volcanoes.push(makeVolcano('dormant'))
    ;(sys as any).volcanoes.push(makeVolcano('cooling'))
    expect(sys.getActiveVolcanoes()).toHaveLength(0)
  })
  it('active/erupting/rumbling算活跃', () => {
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('rumbling'))
    expect(sys.getActiveVolcanoes()).toHaveLength(3)
  })
})

describe('WorldVolcanicSystem.getEruptingCount', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys() })

  it('初始为0', () => { expect(sys.getEruptingCount()).toBe(0) })
  it('只计erupting状态', () => {
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    expect(sys.getEruptingCount()).toBe(1)
  })
})
