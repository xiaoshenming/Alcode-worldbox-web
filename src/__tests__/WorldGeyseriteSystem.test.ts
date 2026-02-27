import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeyseriteSystem } from '../systems/WorldGeyseriteSystem'
import type { GeyseriteDeposit } from '../systems/WorldGeyseriteSystem'

function makeSys(): WorldGeyseriteSystem { return new WorldGeyseriteSystem() }
let nextId = 1
function makeDeposit(): GeyseriteDeposit {
  return { id: nextId++, x: 20, y: 30, silicaContent: 80, layerThickness: 5, crystallinity: 70, thermalProximity: 90, age: 3000, tick: 0 }
}

describe('WorldGeyseriteSystem.getDeposits', () => {
  let sys: WorldGeyseriteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无硅华沉积', () => { expect(sys.getDeposits()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect(sys.getDeposits()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDeposits()).toBe((sys as any).deposits)
  })
  it('硅华沉积字段正确', () => {
    ;(sys as any).deposits.push(makeDeposit())
    const d = sys.getDeposits()[0]
    expect(d.silicaContent).toBe(80)
    expect(d.crystallinity).toBe(70)
    expect(d.thermalProximity).toBe(90)
  })
  it('多个硅华沉积全部返回', () => {
    ;(sys as any).deposits.push(makeDeposit())
    ;(sys as any).deposits.push(makeDeposit())
    expect(sys.getDeposits()).toHaveLength(2)
  })
})
