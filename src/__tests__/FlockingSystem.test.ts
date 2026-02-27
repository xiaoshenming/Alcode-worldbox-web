import { describe, it, expect, beforeEach } from 'vitest'
import { FlockingSystem } from '../systems/FlockingSystem'
function makeSys() { return new FlockingSystem() }
describe('FlockingSystem', () => {
  let sys: FlockingSystem
  beforeEach(() => { sys = makeSys() })
  it('getFlockCount初始为0', () => { expect(sys.getFlockCount()).toBe(0) })
  it('getFlockOf未知实体返回null', () => { expect(sys.getFlockOf(999)).toBeNull() })
  it('getFlockCount返回数字', () => { expect(typeof sys.getFlockCount()).toBe('number') })
  it('flockAssignment初始为空Map', () => { expect((sys as any).flockAssignment.size).toBe(0) })
  it('_assigned初始为空Set', () => { expect((sys as any)._assigned.size).toBe(0) })
})
