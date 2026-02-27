import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMoraineSystem } from '../systems/WorldMoraineSystem'
import type { Moraine } from '../systems/WorldMoraineSystem'

function makeSys(): WorldMoraineSystem { return new WorldMoraineSystem() }
let nextId = 1
function makeMoraine(): Moraine {
  return { id: nextId++, x: 25, y: 35, length: 20, height: 8, debrisType: 2, glacialAge: 10000, vegetationCover: 30, stability: 70, tick: 0 }
}

describe('WorldMoraineSystem.getMoraines', () => {
  let sys: WorldMoraineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰碛', () => { expect(sys.getMoraines()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).moraines.push(makeMoraine())
    expect(sys.getMoraines()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getMoraines()).toBe((sys as any).moraines)
  })
  it('冰碛字段正确', () => {
    ;(sys as any).moraines.push(makeMoraine())
    const m = sys.getMoraines()[0]
    expect(m.glacialAge).toBe(10000)
    expect(m.stability).toBe(70)
    expect(m.vegetationCover).toBe(30)
  })
  it('多个冰碛全部返回', () => {
    ;(sys as any).moraines.push(makeMoraine())
    ;(sys as any).moraines.push(makeMoraine())
    expect(sys.getMoraines()).toHaveLength(2)
  })
})
