import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEmotionSystem } from '../systems/CreatureEmotionSystem'
function makeSys() { return new CreatureEmotionSystem() }
describe('CreatureEmotionSystem', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  it('getTopEmotion未知实体返回null', () => { expect(sys.getTopEmotion(999)).toBeNull() })
  it('注入后getTopEmotion返回情绪', () => {
    ;(sys as any).emotions.set(1, [{ emotion: 'happy', priority: 1, expireTick: 9999 }])
    expect(sys.getTopEmotion(1)).toBe('happy')
  })
})
