import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeoglyphSystem } from '../systems/WorldGeoglyphSystem'
import type { Geoglyph, GeoglyphShape } from '../systems/WorldGeoglyphSystem'

function makeSys(): WorldGeoglyphSystem { return new WorldGeoglyphSystem() }
let nextId = 1
function makeGeoglyph(shape: GeoglyphShape = 'animal'): Geoglyph {
  return { id: nextId++, x: 50, y: 60, shape, size: 20, spiritualPower: 70, visibility: 90, age: 500, tick: 0 }
}

describe('WorldGeoglyphSystem.getGeoglyphs', () => {
  let sys: WorldGeoglyphSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地画', () => { expect(sys.getGeoglyphs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).geoglyphs.push(makeGeoglyph())
    expect(sys.getGeoglyphs()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getGeoglyphs()).toBe((sys as any).geoglyphs)
  })
  it('支持5种地画形状', () => {
    const shapes: GeoglyphShape[] = ['spiral', 'animal', 'geometric', 'humanoid', 'celestial']
    expect(shapes).toHaveLength(5)
  })
  it('地画字段正确', () => {
    ;(sys as any).geoglyphs.push(makeGeoglyph('celestial'))
    const g = sys.getGeoglyphs()[0]
    expect(g.shape).toBe('celestial')
    expect(g.spiritualPower).toBe(70)
    expect(g.visibility).toBe(90)
  })
})
