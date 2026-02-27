import { describe, it, expect, beforeEach } from 'vitest'
import { WorldIceSheetSystem } from '../systems/WorldIceSheetSystem'
import type { IceSheet } from '../systems/WorldIceSheetSystem'

function makeSys(): WorldIceSheetSystem { return new WorldIceSheetSystem() }
let nextId = 1
function makeSheet(expanding = false): IceSheet {
  return { id: nextId++, x: 50, y: 50, thickness: 30, area: 100, meltRate: 2, age: 5000, expanding, tick: 0 }
}

describe('WorldIceSheetSystem.getIceSheets', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰盖', () => { expect(sys.getIceSheets()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).iceSheets.push(makeSheet())
    expect(sys.getIceSheets()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getIceSheets()).toBe((sys as any).iceSheets)
  })
  it('冰盖字段正确', () => {
    ;(sys as any).iceSheets.push(makeSheet(true))
    const s = sys.getIceSheets()[0]
    expect(s.thickness).toBe(30)
    expect(s.area).toBe(100)
    expect(s.expanding).toBe(true)
  })
  it('多个冰盖全部返回', () => {
    ;(sys as any).iceSheets.push(makeSheet())
    ;(sys as any).iceSheets.push(makeSheet())
    expect(sys.getIceSheets()).toHaveLength(2)
  })
})
