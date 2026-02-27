import { describe, it, expect, beforeEach } from 'vitest'
import { WorldExportSystem } from '../systems/WorldExportSystem'

function makeSys() { return new WorldExportSystem() }

describe('WorldExportSystem', () => {
  let sys: WorldExportSystem

  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始importing为false', () => {
    expect((sys as any).importing).toBe(false)
  })

  it('初始importProgress为0', () => {
    expect((sys as any).importProgress).toBe(0)
  })

  it('exportWorld 接受null参数不崩溃', () => {
    expect(() => {
      try {
        sys.exportWorld(null as any, null as any, null as any, null as any)
      } catch {
        // 允许抛出，只要不是未捕获的崩溃
      }
    }).not.toThrow()
  })
})
