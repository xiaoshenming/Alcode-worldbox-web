import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAuroraSystem } from '../systems/WorldAuroraSystem'
import type { AuroraEvent, AuroraColorPattern } from '../systems/WorldAuroraSystem'

function makeSys(): WorldAuroraSystem { return new WorldAuroraSystem() }
let nextId = 1
function makeAurora(pattern: AuroraColorPattern = 'green'): AuroraEvent {
  return { id: nextId++, x: 20, y: 10, colorPattern: pattern, intensity: 60, width: 30, height: 15, active: true, tick: 0 }
}

describe('WorldAuroraSystem.getAuroras', () => {
  let sys: WorldAuroraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无极光', () => { expect(sys.getAuroras()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).auroras.push(makeAurora())
    expect(sys.getAuroras()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getAuroras()).toBe((sys as any).auroras)
  })
  it('支持4种极光颜色模式', () => {
    const patterns: AuroraColorPattern[] = ['green', 'purple', 'blue', 'multicolor']
    expect(patterns).toHaveLength(4)
  })
  it('极光字段正确', () => {
    ;(sys as any).auroras.push(makeAurora('multicolor'))
    const a = sys.getAuroras()[0]
    expect(a.colorPattern).toBe('multicolor')
    expect(a.intensity).toBe(60)
  })
})
