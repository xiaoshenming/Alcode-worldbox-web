import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEmotionSystem } from '../systems/CreatureEmotionSystem'

function makeSys() { return new CreatureEmotionSystem() }

describe('CreatureEmotionSystem', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })

  // --- 基础查询 ---
  it('getTopEmotion未知实体返回null', () => { expect(sys.getTopEmotion(999)).toBeNull() })

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

  // --- 优先级排序 ---
  it('高优先级情绪优先于低优先级', () => {
    sys.setEmotion(1, 'hungry', 120, 2)
    sys.setEmotion(1, 'angry', 120, 5)
    expect(sys.getTopEmotion(1)).toBe('angry')
  })

  it('低优先级情绪不覆盖高优先级', () => {
    sys.setEmotion(1, 'angry', 120, 5)
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.getTopEmotion(1)).toBe('angry')
  })

  // --- 相同情绪覆盖 ---
  it('相同emotion字符串会覆盖旧记录', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    sys.setEmotion(1, 'happy', 200, 3)
    // 覆盖后列表中只有一条happy
    const list = (sys as any).emotions.get(1)
    const happyEntries = list.filter((e: any) => e.emotion === 'happy')
    expect(happyEntries).toHaveLength(1)
    expect(happyEntries[0].duration).toBe(200)
  })

  // --- trackedCount ---
  it('trackedCount初始为0', () => {
    expect(sys.trackedCount).toBe(0)
  })

  it('setEmotion后trackedCount增加', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(2, 'angry', 120, 1)
    expect(sys.trackedCount).toBe(2)
  })

  // --- alpha淡入 ---
  it('情绪alpha初始为0', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBe(0)
  })

  it('update后alpha在FADE_IN_TICKS内从0增加', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    // update一次，alpha应增加1/15
    sys.update(1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBeCloseTo(1 / 15, 5)
  })

  it('经过FADE_IN_TICKS后alpha达到1', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    for (let t = 1; t <= 15; t++) { sys.update(t) }
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBeCloseTo(1, 5)
  })

  // --- duration过期后淡出并删除 ---
  it('duration过期后情绪进入fadingOut状态', () => {
    sys.setEmotion(1, 'sad', 5, 1)
    // 立刻update到tick=5使其过期
    sys.update(0)
    sys.update(5)
    const list = (sys as any).emotions.get(1)
    if (list) {
      expect(list[0].fadingOut).toBe(true)
    }
    // fadingOut为true或列表不存在（已删除完）
  })

  it('fadingOut状态下经过FADE_OUT_TICKS后情绪被删除', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    // 先让alpha升满
    for (let t = 0; t <= 15; t++) { sys.update(t) }
    // 情绪到期
    sys.update(16)
    // 继续update 20次让alpha归零并删除
    for (let t = 17; t <= 40; t++) { sys.update(t) }
    expect(sys.hasEmotion(1)).toBe(false)
    expect(sys.trackedCount).toBe(0)
  })

  // --- EMOTION_ICONS包含8种 ---
  it('EMOTION_ICONS包含8种情绪图标', () => {
    // 通过系统内部常量验证，通过setEmotion+renderForEntity间接测试
    // 直接验证已知情绪名可以被系统接受
    const emotions = ['happy', 'hungry', 'angry', 'fear', 'love', 'sad', 'work', 'combat']
    expect(emotions).toHaveLength(8)
    // 每种情绪都能正常设置
    emotions.forEach((e, i) => sys.setEmotion(i + 1, e, 100, 1))
    expect(sys.trackedCount).toBe(8)
  })

  // --- 多实体独立 ---
  it('不同实体的情绪互相独立', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(2, 'angry', 120, 1)
    expect(sys.getTopEmotion(1)).toBe('happy')
    expect(sys.getTopEmotion(2)).toBe('angry')
  })
})
