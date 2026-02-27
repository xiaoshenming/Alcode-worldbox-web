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
  it('setEmotion 后 hasEmotion 返回true', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.hasEmotion(1)).toBe(true)
  })
  it('setEmotion 后 getTopEmotion 返回情绪名', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.getTopEmotion(1)).toBe('happy')
  })
  it('hasEmotion 未知实体返回false', () => {
    expect(sys.hasEmotion(999)).toBe(false)
  })
})
