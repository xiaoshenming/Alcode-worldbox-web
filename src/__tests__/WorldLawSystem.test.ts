import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLawSystem } from '../systems/WorldLawSystem'

function makeSys(): WorldLawSystem { return new WorldLawSystem() }

describe('WorldLawSystem.getLaw', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  it('未知分类返回1.0', () => { expect(sys.getLaw('unknown', 'gravity')).toBe(1.0) })
  it('未知参数返回1.0', () => { expect(sys.getLaw('physics', 'unknown')).toBe(1.0) })
  it('physics.gravity默认值为1.0', () => { expect(sys.getLaw('physics', 'gravity')).toBe(1.0) })
  it('creature.reproduction默认值为1.0', () => { expect(sys.getLaw('creature', 'reproduction')).toBe(1.0) })
  it('combat.damage默认值为1.0', () => { expect(sys.getLaw('combat', 'damage')).toBe(1.0) })
})
