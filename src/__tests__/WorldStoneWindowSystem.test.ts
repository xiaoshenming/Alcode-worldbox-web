import { describe, it, expect, beforeEach } from 'vitest'
import { WorldStoneWindowSystem } from '../systems/WorldStoneWindowSystem'
import type { StoneWindow } from '../systems/WorldStoneWindowSystem'

function makeSys(): WorldStoneWindowSystem { return new WorldStoneWindowSystem() }
let nextId = 1
function makeWindow(): StoneWindow {
  return { id: nextId++, x: 20, y: 30, openingWidth: 5, openingHeight: 4, wallThickness: 3, frameSolidity: 80, lightEffect: 70, spectacle: 85, tick: 0 }
}

describe('WorldStoneWindowSystem.getWindows', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石窗', () => { expect(sys.getWindows()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).windows.push(makeWindow())
    expect(sys.getWindows()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getWindows()).toBe((sys as any).windows)
  })
  it('石窗字段正确', () => {
    ;(sys as any).windows.push(makeWindow())
    const w = sys.getWindows()[0]
    expect(w.frameSolidity).toBe(80)
    expect(w.lightEffect).toBe(70)
    expect(w.spectacle).toBe(85)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
