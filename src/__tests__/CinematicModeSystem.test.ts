import { describe, it, expect, beforeEach } from 'vitest'
import { CinematicModeSystem } from '../systems/CinematicModeSystem'
function makeSys() { return new CinematicModeSystem() }
describe('CinematicModeSystem', () => {
  let sys: CinematicModeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始active为false', () => { expect((sys as any).active).toBe(false) })
  it('初始points为空', () => { expect((sys as any).points).toHaveLength(0) })
})
