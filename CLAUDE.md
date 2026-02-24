# WorldBox Web - God Simulator

## 项目概述
纯前端网页版 WorldBox 上帝模拟器。玩家扮演上帝，在像素风格的 2D 世界中创造地形、放置生物、触发灾难，观察文明自主发展。

## 技术栈
- **框架:** 纯 TypeScript + HTML5 Canvas（无 React，追求性能）
- **构建:** Vite
- **样式:** CSS（UI 面板用 CSS，游戏画面用 Canvas）
- **状态管理:** 自定义 ECS（Entity-Component-System）架构
- **渲染:** Canvas 2D + 像素风格 tile-based

## 核心系统

### 1. 世界地图 (World Map)
- Tile-based 网格地图（至少 200x200）
- 地形类型：深水、浅水、沙滩、草地、森林、山地、雪地、岩浆
- 支持缩放和拖拽平移
- 地形自动过渡（边缘混合）

### 2. 上帝之力 (God Powers)
- **地形画笔:** 绘制/擦除各种地形
- **生物放置:** 人类、精灵、矮人、兽人
- **自然力量:** 下雨、闪电、火灾、地震、陨石、龙卷风
- **资源:** 放置树木、矿石、食物
- **毁灭:** 核弹、黑洞、酸雨

### 3. 生物 AI (Creature AI)
- 基础需求：饥饿、移动、战斗
- 寻路：A* 或简化寻路
- 种族关系：同盟/敌对
- 自动建造村庄（简化版）
- 人口增长和死亡

### 4. 文明系统 (Civilization)
- 村庄自动扩张
- 资源采集
- 种族间战争
- 简单外交（和平/战争）

### 5. UI 系统
- 左侧/底部工具栏（类似原版）
- 分类标签：地形、生物、自然、毁灭
- 世界信息面板（人口、村庄数等）
- 点击生物查看信息
- 速度控制（暂停/1x/2x/5x）

## 开发规范 (OpenSpec)
1. 每个功能完成后 git commit，commit message 格式：`feat/fix/refactor: 简短描述`
2. 代码模块化，每个系统独立文件
3. 性能优先：大量实体时保持 60fps
4. 渐进式开发：先核心循环，再逐步添加功能
5. 每次迭代后自测，确保无报错

## 文件结构
```
src/
├── main.ts          # 入口
├── game/
│   ├── Game.ts      # 主游戏循环
│   ├── World.ts     # 世界地图
│   ├── Camera.ts    # 摄像机（缩放/平移）
│   ├── Renderer.ts  # Canvas 渲染器
│   └── Input.ts     # 输入处理
├── ecs/
│   ├── Entity.ts    # 实体管理
│   ├── Component.ts # 组件定义
│   └── System.ts    # 系统基类
├── systems/
│   ├── MovementSystem.ts
│   ├── AISystem.ts
│   ├── CombatSystem.ts
│   ├── NeedsSystem.ts
│   ├── CivilizationSystem.ts
│   └── ParticleSystem.ts
├── entities/
│   ├── Creature.ts
│   ├── Building.ts
│   └── Resource.ts
├── powers/
│   ├── TerrainBrush.ts
│   ├── SpawnPower.ts
│   └── DisasterPower.ts
├── ui/
│   ├── Toolbar.ts
│   ├── InfoPanel.ts
│   └── SpeedControl.ts
└── utils/
    ├── Pathfinding.ts
    ├── Noise.ts      # Perlin noise 地形生成
    └── Constants.ts
```

## 迭代计划
### Phase 1 (v0.1-v0.15): 基础框架
- 项目搭建、Canvas 渲染、摄像机、地图生成

### Phase 2 (v0.16-v0.30): 生物系统
- ECS 架构、生物 AI、寻路、基础需求

### Phase 3 (v0.31-v0.45): 上帝之力
- 地形画笔、生物放置、自然灾害

### Phase 4 (v0.46-v0.55): 文明系统
- 村庄、资源、战争、外交

### Phase 5 (v0.56-v0.60+): 打磨优化
- 性能优化、视觉效果、音效、UI 美化
