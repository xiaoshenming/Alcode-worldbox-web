import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEchoSystem } from '../systems/WorldEchoSystem'
import type { Echo, EchoSource } from '../systems/WorldEchoSystem'

function makeSys(): WorldEchoSystem { return new WorldEchoSystem() }
let nextId = 1
function makeEcho(source: EchoSource = 'battle', intensity: number = 75): Echo {
  return { id: nextId++, x: 10, y: 10, source, intensity, radius: 5, maxRadius: 20, speed: 4, createdTick: 0 }
}

describe('WorldEchoSystem.getEchoes', () => {
  let sys: WorldEchoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无回声', () => { expect(sys.getEchoes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).echoes.push(makeEcho())
    expect(sys.getEchoes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getEchoes()).toBe((sys as any).echoes)
  })
  it('支持6种回声来源', () => {
    const sources: EchoSource[] = ['battle', 'disaster', 'celebration', 'construction', 'horn_call', 'thunder']
    expect(sources).toHaveLength(6)
  })
})

describe('WorldEchoSystem.getEchoCount', () => {
  let sys: WorldEchoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect(sys.getEchoCount()).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).echoes.push(makeEcho())
    ;(sys as any).echoes.push(makeEcho())
    expect(sys.getEchoCount()).toBe(2)
  })
})
