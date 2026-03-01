import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRainbowSystem } from '../systems/WorldRainbowSystem'
import type { Rainbow } from '../systems/WorldRainbowSystem'

function makeSys(): WorldRainbowSystem { return new WorldRainbowSystem() }
let nextId = 1
function makeRainbow(): Rainbow {
  return { id: nextId++, x: 50, y: 30, span: 20, brightness: 80, startTick: 0, duration: 1000 }
}

describe('WorldRainbowSystem.getRainbows', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无彩虹', () => { expect((sys as any).rainbows).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rainbows.push(makeRainbow())
    expect((sys as any).rainbows).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).rainbows).toBe((sys as any).rainbows)
  })
  it('彩虹字段正确', () => {
    ;(sys as any).rainbows.push(makeRainbow())
    const r = (sys as any).rainbows[0]
    expect(r.span).toBe(20)
    expect(r.brightness).toBe(80)
  })
  it('多个彩虹全部返回', () => {
    ;(sys as any).rainbows.push(makeRainbow())
    ;(sys as any).rainbows.push(makeRainbow())
    expect((sys as any).rainbows).toHaveLength(2)
  })
})
