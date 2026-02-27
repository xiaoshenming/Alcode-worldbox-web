import { describe, it, expect, beforeEach } from 'vitest'
import { MigrationSystem } from '../systems/MigrationSystem'
function makeSys() { return new MigrationSystem() }
describe('MigrationSystem', () => {
  let sys: MigrationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始bands为空Map', () => { expect((sys as any).bands.size).toBe(0) })
})
