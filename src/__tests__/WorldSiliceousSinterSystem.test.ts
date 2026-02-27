import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSiliceousSinterSystem } from '../systems/WorldSiliceousSinterSystem'
import type { SiliceousSinter } from '../systems/WorldSiliceousSinterSystem'

function makeSys(): WorldSiliceousSinterSystem { return new WorldSiliceousSinterSystem() }
let nextId = 1
function makeDeposit(): SiliceousSinter {
  return { id: nextId++, x: 20, y: 30, silicaPurity: 80, layerCount: 5, opalescence: 70, thermalActivity: 60, age: 2000, tick: 0 }
}

describe('WorldSiliceousSinterSystem.getDeposits', () => {
  let sys: WorldSiliceousSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无硅质硅华', () => { expect(sys.getDeposits()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect(sys.getDeposits()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDeposits()).toBe((sys as any).deposits)
  })
  it('硅质硅华字段正确', () => {
    ;(sys as any).deposits.push(makeDeposit())
    const d = sys.getDeposits()[0]
    expect(d.silicaPurity).toBe(80)
    expect(d.opalescence).toBe(70)
    expect(d.thermalActivity).toBe(60)
  })
})
