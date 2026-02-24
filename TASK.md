你是 WorldBox Web 项目的首席开发者。请阅读 CLAUDE.md 了解完整规范。

## 你的任务

按照 CLAUDE.md 中的迭代计划，从 Phase 1 开始，逐步构建完整的 WorldBox 上帝模拟器网页版。

## 开发流程

1. 每完成一个小功能就 git commit（格式：feat/fix/refactor: 描述）
2. 确保每次 commit 后代码可运行（npm run build 无报错）
3. 按 Phase 顺序开发，不要跳跃
4. 性能优先，200x200 地图 + 500 个实体要保持流畅

## Phase 1 详细任务（立即开始）

### v0.1 - 项目骨架
- 创建 index.html + vite.config.ts
- 创建 src/main.ts 入口
- Canvas 全屏显示
- 基础游戏循环（requestAnimationFrame）
- commit

### v0.2 - 地图数据结构
- src/game/World.ts: Tile 类型枚举，2D 数组存储
- 地形类型：DEEP_WATER, SHALLOW_WATER, SAND, GRASS, FOREST, MOUNTAIN, SNOW, LAVA
- commit

### v0.3 - Perlin Noise 地形生成
- src/utils/Noise.ts: 实现 Perlin/Simplex noise
- World.generate(): 用噪声生成自然地形
- commit

### v0.4 - Canvas 渲染器
- src/game/Renderer.ts: 按 tile 绘制地图
- 每种地形不同颜色（像素风格）
- commit

### v0.5 - 摄像机系统
- src/game/Camera.ts: 支持拖拽平移 + 滚轮缩放
- 视口裁剪（只渲染可见 tile）
- commit

### v0.6 - 输入系统
- src/game/Input.ts: 鼠标/触摸事件统一处理
- 屏幕坐标 → 世界坐标转换
- commit

### v0.7 - UI 工具栏骨架
- src/ui/Toolbar.ts: 底部/侧边工具栏
- HTML/CSS 覆盖在 Canvas 上
- 分类标签：地形、生物、自然、毁灭
- commit

### v0.8 - 地形画笔
- src/powers/TerrainBrush.ts: 选择地形类型，在地图上绘制
- 可调画笔大小
- commit

### v0.9 - 速度控制 + 世界信息
- 暂停/1x/2x/5x 速度
- 显示基础世界信息（地图大小、tick 数）
- commit

### v0.10 - 地形美化
- 地形颜色变体（同类型 tile 略有色差，更自然）
- 水面简单动画
- commit

### v0.11-v0.15 - 继续完善基础
- 地形边缘过渡
- 小地图
- 新地图生成按钮
- 性能优化（脏区域重绘）
- commit each

然后继续 Phase 2-5，按 CLAUDE.md 规划开发。

## 重要规则
- 每个功能完成后必须 git commit
- 每 5 个版本做一次 npm run build 验证
- 代码要模块化，文件不要太大
- 注释用英文
- 目标：至少 60 个 commit 版本
- 持续开发直到所有 Phase 完成
