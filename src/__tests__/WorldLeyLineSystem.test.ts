import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLeyLineSystem } from '../systems/WorldLeyLineSystem'

function makeSys(): WorldLeyLineSystem { return new WorldLeyLineSystem() }

describe('WorldLeyLineSystem.getLeyLines', () => {
  let sys: WorldLeyLineSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无地脉线（未初始化）', () => {
    expect(sys.getLeyLines()).toHaveLength(0)
  })
  it('注入后可查询', () => {
    ;(sys as any).leyLines.push({ id: 1, points: [], energy: 0.8, color: '#4fc3f7' })
    expect(sys.getLeyLines()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getLeyLines()).toBe((sys as any).leyLines)
  })
})

describe('WorldLeyLineSystem.getNexuses', () => {
  let sys: WorldLeyLineSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无能量节点', () => { expect(sys.getNexuses()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nexuses.push({ x: 50, y: 50, energy: 0.9, radius: 18 })
    expect(sys.getNexuses()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getNexuses()).toBe((sys as any).nexuses)
  })
})
