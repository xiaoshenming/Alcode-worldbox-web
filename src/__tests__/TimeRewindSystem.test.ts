import { describe, it, expect, beforeEach } from 'vitest'
import { TimeRewindSystem } from '../systems/TimeRewindSystem'
function makeSys() { return new TimeRewindSystem() }
describe('TimeRewindSystem', () => {
  let sys: TimeRewindSystem
  beforeEach(() => { sys = makeSys() })
  it('getSnapshots初始为空', () => { expect(sys.getSnapshots()).toHaveLength(0) })
  it('getSnapshotCount初始为0', () => { expect(sys.getSnapshotCount()).toBe(0) })
  it('getSelectedIndex初始为-1', () => { expect(sys.getSelectedIndex()).toBe(-1) })
})
