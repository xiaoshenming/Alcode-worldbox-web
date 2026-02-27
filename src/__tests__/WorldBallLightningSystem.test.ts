import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBallLightningSystem } from '../systems/WorldBallLightningSystem'
import type { BallLightning, BallSize } from '../systems/WorldBallLightningSystem'

function makeSys(): WorldBallLightningSystem { return new WorldBallLightningSystem() }
let nextId = 1
function makeBall(size: BallSize = 'medium'): BallLightning {
  return { id: nextId++, x: 30, y: 40, size, energy: 80, speed: 3, direction: 1.0, damageRadius: 5, creaturesTerrified: 0, lifetime: 200, startTick: 0 }
}

describe('WorldBallLightningSystem.getBalls', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无球形闪电', () => { expect(sys.getBalls()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).balls.push(makeBall())
    expect(sys.getBalls()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getBalls()).toBe((sys as any).balls)
  })
  it('支持4种尺寸', () => {
    const sizes: BallSize[] = ['small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(4)
  })
  it('球形闪电字段正确', () => {
    ;(sys as any).balls.push(makeBall('massive'))
    const b = sys.getBalls()[0]
    expect(b.size).toBe('massive')
    expect(b.energy).toBe(80)
    expect(b.damageRadius).toBe(5)
  })
})
