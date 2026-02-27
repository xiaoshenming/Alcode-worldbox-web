import { describe, it, expect, beforeEach } from 'vitest'
import { FortificationRenderer } from '../systems/FortificationRenderer'
import type { CityFortification } from '../systems/FortificationRenderer'

function makeSys() { return new FortificationRenderer() }

function makeFort(overrides: Partial<CityFortification> = {}): CityFortification {
  return {
    cityId: 1,
    civId: 1,
    centerX: 100,
    centerY: 100,
    radius: 50,
    level: 'wooden',
    health: 100,
    maxHealth: 100,
    towerCount: 4,
    hasMoat: false,
    isUnderAttack: false,
    color: '#8B4513',
    ...overrides,
  }
}

describe('FortificationRenderer', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })

  it('初始fortifications为空', () => { expect((sys as any).fortifications).toHaveLength(0) })
  it('初始animTime为0', () => { expect((sys as any).animTime).toBe(0) })
  it('update()后animTime增加', () => {
    sys.update()
    expect((sys as any).animTime).toBeGreaterThan(0)
  })
  it('updateFortifications后fortifications更新', () => {
    sys.updateFortifications([makeFort()])
    expect((sys as any).fortifications).toHaveLength(1)
  })
  it('updateFortifications多个fort后长度正确', () => {
    sys.updateFortifications([makeFort({ cityId: 1 }), makeFort({ cityId: 2 })])
    expect((sys as any).fortifications).toHaveLength(2)
  })
  it('updateFortifications空数组后fortifications为空', () => {
    sys.updateFortifications([makeFort()])
    sys.updateFortifications([])
    expect((sys as any).fortifications).toHaveLength(0)
  })
  it('update()多次调用不崩溃', () => {
    sys.updateFortifications([makeFort()])
    expect(() => { sys.update(); sys.update() }).not.toThrow()
  })
})
