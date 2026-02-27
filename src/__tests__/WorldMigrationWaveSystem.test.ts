import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMigrationWaveSystem } from '../systems/WorldMigrationWaveSystem'

function makeSys(): WorldMigrationWaveSystem { return new WorldMigrationWaveSystem() }

describe('WorldMigrationWaveSystem.getActiveWaves', () => {
  let sys: WorldMigrationWaveSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无迁徙波', () => { expect(sys.getActiveWaves()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).activeWaves.push({ id: 1, fromX: 10, fromY: 20, toX: 50, toY: 60, reason: 0, progress: 0, entityIds: new Set(), scale: 10, startTick: 0 })
    expect(sys.getActiveWaves()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getActiveWaves()).toBe((sys as any).activeWaves)
  })
  it('迁徙波字段正确', () => {
    ;(sys as any).activeWaves.push({ id: 1, fromX: 10, fromY: 20, toX: 50, toY: 60, reason: 0, progress: 0.5, entityIds: new Set(), scale: 15, startTick: 100 })
    const w = sys.getActiveWaves()[0]
    expect(w.fromX).toBe(10)
    expect(w.toY).toBe(60)
    expect(w.progress).toBe(0.5)
  })
})
