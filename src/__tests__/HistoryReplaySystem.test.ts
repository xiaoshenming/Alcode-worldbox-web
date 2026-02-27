import { describe, it, expect, beforeEach } from 'vitest'
import { HistoryReplaySystem } from '../systems/HistoryReplaySystem'
function makeSys() { return new HistoryReplaySystem() }
describe('HistoryReplaySystem', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  it('getSnapshotCount初始为0', () => { expect(sys.getSnapshotCount()).toBe(0) })
  it('getReplayIndex初始为-1', () => { expect(sys.getReplayIndex()).toBe(-1) })
  it('getSnapshot越界返回null', () => { expect(sys.getSnapshot(0)).toBeNull() })
  it('getCurrentReplaySnapshot初始为null', () => { expect(sys.getCurrentReplaySnapshot()).toBeNull() })
})
