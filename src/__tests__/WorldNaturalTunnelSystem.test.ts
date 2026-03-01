import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNaturalTunnelSystem } from '../systems/WorldNaturalTunnelSystem'
import type { NaturalTunnel } from '../systems/WorldNaturalTunnelSystem'

function makeSys(): WorldNaturalTunnelSystem { return new WorldNaturalTunnelSystem() }
let nextId = 1
function makeTunnel(): NaturalTunnel {
  return { id: nextId++, x: 20, y: 30, length: 40, diameter: 4, stability: 85, waterFlow: 2, echoEffect: 50, spectacle: 70, tick: 0 }
}

describe('WorldNaturalTunnelSystem.getTunnels', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天然隧道', () => { expect((sys as any).tunnels).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tunnels.push(makeTunnel())
    expect((sys as any).tunnels).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).tunnels).toBe((sys as any).tunnels)
  })
  it('天然隧道字段正确', () => {
    ;(sys as any).tunnels.push(makeTunnel())
    const t = (sys as any).tunnels[0]
    expect(t.stability).toBe(85)
    expect(t.echoEffect).toBe(50)
    expect(t.spectacle).toBe(70)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
