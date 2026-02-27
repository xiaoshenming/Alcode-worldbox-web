import { describe, it, expect } from 'vitest'
import { WorldExportSystem } from '../systems/WorldExportSystem'

describe('WorldExportSystem', () => {
  it('可以实例化', () => {
    const sys = new WorldExportSystem()
    expect(sys).toBeDefined()
  })
})
