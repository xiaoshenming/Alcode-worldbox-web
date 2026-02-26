/**
 * WorldLawSystem - 世界法则系统
 * 提供可调整的世界规则参数面板，玩家可通过滑块修改物理、生物、战斗、经济等参数。
 * 按 W 键打开/关闭面板。
 */

/** 单条法则参数定义 */
interface LawParam {
  name: string
  label: string
  value: number
  defaultValue: number
  min: number
  max: number
}

/** 法则分类定义 */
interface LawCategory {
  key: string
  label: string
  params: LawParam[]
}

const PANEL_W = 480, PANEL_H = 400, TAB_W = 90, HEADER_H = 36
const SLIDER_H = 28, SLIDER_PAD = 6, SLIDER_TRACK_H = 6, SLIDER_THUMB_R = 8
const BTN_H = 32, BTN_W = 100, SCROLL_BAR_W = 6

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function buildCategories(): LawCategory[] {
  const make = (name: string, label: string, def = 1.0): LawParam => ({
    name, label, value: def, defaultValue: def, min: 0.1, max: 5.0
  })
  return [
    {
      key: 'physics', label: '物理',
      params: [
        make('gravity', '重力'),
        make('moveSpeed', '移动速度倍率'),
      ]
    },
    {
      key: 'creature', label: '生物',
      params: [
        make('reproduction', '繁殖率'),
        make('lifespan', '寿命倍率'),
        make('hungerRate', '饥饿速度'),
      ]
    },
    {
      key: 'combat', label: '战斗',
      params: [
        make('damage', '伤害倍率'),
        make('defense', '防御倍率'),
      ]
    },
    {
      key: 'economy', label: '经济',
      params: [
        make('resourceOutput', '资源产出倍率'),
        make('tradeEfficiency', '贸易效率'),
      ]
    },
  ]
}

export class WorldLawSystem {
  private visible = false
  private categories: LawCategory[]
  private activeTab = 0

  constructor() {
    this.categories = buildCategories()
  }

  /**
   * 获取指定分类下某条法则的当前值
   * @param category 分类 key，如 'physics'
   * @param name 参数 name，如 'gravity'
   * @returns 当前倍率值，未找到返回 1.0
   */
  getLaw(category: string, name: string): number {
    const cat = this.categories.find(c => c.key === category)
    if (!cat) return 1.0
    const p = cat.params.find(pp => pp.name === name)
    return p ? p.value : 1.0
  }

  /**
   * 设置指定分类下某条法则的值
   * @param category 分类 key
   * @param name 参数 name
   * @param value 新值，会被 clamp 到 [0.1, 5.0]
   */
  setLaw(category: string, name: string, value: number): void {
    const cat = this.categories.find(c => c.key === category)
    if (!cat) return
    const p = cat.params.find(pp => pp.name === name)
    if (p) p.value = clamp(value, p.min, p.max)
  }

  /**
   * 处理键盘事件
   * @param key 按键字符串（event.key）
   * @returns 是否消费了该事件
   */
  handleKey(key: string): boolean {
    if (key === 'w' || key === 'W') {
      this.visible = !this.visible
      return true
    }
    if (key === 'Escape' && this.visible) {
      this.visible = false
      return true
    }
    return false
  }

  /**
   * 处理鼠标点击/拖拽
   * @returns 是否消费了该事件
   */
  handleClick(x: number, y: number, screenW: number, screenH: number): boolean {
    if (!this.visible) return false
    const px = (screenW - PANEL_W) / 2
    const py = (screenH - PANEL_H) / 2
    // 面板外点击关闭
    if (x < px || x > px + PANEL_W || y < py || y > py + PANEL_H) {
      this.visible = false
      return true
    }
    const lx = x - px
    const ly = y - py
    // 标签栏点击
    if (lx < TAB_W && ly > HEADER_H) {
      const tabIdx = Math.floor((ly - HEADER_H) / 40)
      if (tabIdx >= 0 && tabIdx < this.categories.length) {
        this.activeTab = tabIdx
      }
      return true
    }
    // 重置按钮（右下角）
    const btnX = PANEL_W - BTN_W - 12
    const btnY = PANEL_H - BTN_H - 8
    if (lx >= btnX && lx <= btnX + BTN_W && ly >= btnY && ly <= btnY + BTN_H) {
      this.resetDefaults()
      return true
    }
    // 滑块区域
    const cat = this.categories[this.activeTab]
    if (!cat) return true
    const contentX = TAB_W + 12
    const contentW = PANEL_W - TAB_W - 24 - SCROLL_BAR_W
    const sliderW = contentW - 80
    const sliderStartX = contentX + 80
    for (let i = 0; i < cat.params.length; i++) {
      const sy = HEADER_H + 12 + i * (SLIDER_H + SLIDER_PAD)
      if (ly >= sy && ly <= sy + SLIDER_H) {
        const ratio = clamp((lx - sliderStartX) / sliderW, 0, 1)
        const p = cat.params[i]
        p.value = Math.round((p.min + ratio * (p.max - p.min)) * 100) / 100
        return true
      }
    }
    return true
  }

  /**
   * 渲染世界法则面板
   */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.visible) return
    const px = (screenW - PANEL_W) / 2
    const py = (screenH - PANEL_H) / 2

    // 半透明遮罩
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, screenW, screenH)

    // 面板背景
    ctx.fillStyle = '#1a1a2e'
    ctx.strokeStyle = '#4a4a6a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(px, py, PANEL_W, PANEL_H, 8)
    ctx.fill()
    ctx.stroke()

    // 标题栏
    ctx.fillStyle = '#16213e'
    ctx.beginPath()
    ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0])
    ctx.fill()
    ctx.fillStyle = '#e0e0e0'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('世界法则', px + PANEL_W / 2, py + HEADER_H / 2)

    // 左侧标签
    for (let i = 0; i < this.categories.length; i++) {
      const ty = py + HEADER_H + i * 40
      const active = i === this.activeTab
      ctx.fillStyle = active ? '#0f3460' : '#1a1a2e'
      ctx.fillRect(px, ty, TAB_W, 40)
      if (active) {
        ctx.fillStyle = '#e94560'
        ctx.fillRect(px, ty, 3, 40)
      }
      ctx.fillStyle = active ? '#ffffff' : '#8888aa'
      ctx.font = '13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(this.categories[i].label, px + TAB_W / 2, ty + 20)
    }

    // 右侧滑块区域
    const cat = this.categories[this.activeTab]
    if (!cat) { ctx.restore(); return }
    const contentX = px + TAB_W + 12
    const contentW = PANEL_W - TAB_W - 24 - SCROLL_BAR_W
    const sliderW = contentW - 80

    for (let i = 0; i < cat.params.length; i++) {
      const p = cat.params[i]
      const sy = py + HEADER_H + 12 + i * (SLIDER_H + SLIDER_PAD)
      // 参数标签
      ctx.fillStyle = '#ccccdd'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(p.label, contentX, sy + SLIDER_H / 2 + 1)
      // 滑轨
      const trackX = contentX + 80
      const trackY = sy + (SLIDER_H - SLIDER_TRACK_H) / 2
      ctx.fillStyle = '#2a2a4a'
      ctx.beginPath()
      ctx.roundRect(trackX, trackY, sliderW, SLIDER_TRACK_H, 3)
      ctx.fill()
      // 填充部分
      const range = p.max - p.min
      const ratio = range > 0 ? (p.value - p.min) / range : 0
      ctx.fillStyle = '#e94560'
      ctx.beginPath()
      ctx.roundRect(trackX, trackY, sliderW * ratio, SLIDER_TRACK_H, 3)
      ctx.fill()
      // 滑块圆点
      const thumbX = trackX + sliderW * ratio
      const thumbY = trackY + SLIDER_TRACK_H / 2
      ctx.beginPath()
      ctx.arc(thumbX, thumbY, SLIDER_THUMB_R, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 2
      ctx.stroke()
      // 数值
      ctx.fillStyle = '#ffdd57'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(p.value.toFixed(2) + 'x', contentX + contentW, sy + SLIDER_H / 2 + 1)
    }

    // 重置按钮
    const btnX = px + PANEL_W - BTN_W - 12
    const btnY = py + PANEL_H - BTN_H - 8
    ctx.fillStyle = '#0f3460'
    ctx.strokeStyle = '#4a4a6a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(btnX, btnY, BTN_W, BTN_H, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#e0e0e0'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('重置默认', btnX + BTN_W / 2, btnY + BTN_H / 2)

    ctx.restore()
  }

  /** 重置所有参数为默认值 */
  private resetDefaults(): void {
    for (const cat of this.categories) {
      for (const p of cat.params) {
        p.value = p.defaultValue
      }
    }
  }
}
