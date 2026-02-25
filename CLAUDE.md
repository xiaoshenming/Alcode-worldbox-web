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

---

## 开发规范 (OpenSpec v2)

### 🔴 铁律（每次提交前必须通过）

1. **类型安全:** `tsc --noEmit` 零错误
2. **构建通过:** `npm run build` 成功退出
3. **无运行时崩溃:** 打开 index.html 后控制台无 uncaught error（如有 dev server 可 `curl -s http://localhost:5173/ | head -1` 验证）
4. **原子提交:** 每个功能/修复一个 commit，格式 `feat/fix/refactor/perf/test(scope): 描述`

### 🟡 质量门禁

5. **新增公共 API 必须有 JSDoc:** 导出的 class/function/interface 写清用途和参数
6. **单文件不超过 500 行:** 超过就拆分，保持模块职责单一
7. **无 any 泛滥:** 禁止 `as any` 绕过类型检查（确实需要时用 `// @ts-expect-error` + 注释原因）
8. **死代码清理:** 不要留注释掉的大段代码，用 git 管理历史

### 🟢 测试策略（渐进引入）

9. **核心逻辑必须可测:** 纯计算函数（寻路、碰撞检测、资源计算）从渲染层解耦，方便单元测试
10. **新增 bug 修复附带回归测试:** 修 bug 时写一个最小测试用例防止复发
11. **测试框架:** Vitest（已在 Vite 生态内，零配置）
12. **测试命令:** `npx vitest run`（CI 模式，不 watch）
13. **测试文件放在 `src/__tests__/` 或同目录 `*.test.ts`**

### 🔵 性能约束

14. **帧率底线:** 1000 实体 @ 60fps，5000 实体 @ 30fps
15. **内存预算:** 不超过 200MB heap（Chrome DevTools 可查）
16. **避免热路径 GC:** update/render 循环内禁止 `new Object/Array`，用对象池
17. **空间索引:** 范围查询必须用 spatial hash / quadtree，禁止 O(n²) 遍历

### 🟣 架构规则

18. **ECS 纪律:** 组件只存数据，系统只存逻辑，不要在组件里写方法
19. **单向依赖:** `systems/` → `ecs/` → `utils/`，禁止反向引用
20. **事件解耦:** 系统间通信用事件总线，不要直接 import 其他系统
21. **配置外置:** 魔法数字提取到 `Constants.ts` 或 `config/` 目录

### 🟠 迭代流程

22. **每轮迭代开始:** `git log --oneline -10` 了解上下文
23. **每轮迭代结束:** `tsc --noEmit && npm run build` 双重验证
24. **重构优先于新功能:** 如果发现代码腐化（文件过大、循环依赖、性能退化），先修再加
25. **版本号递增:** commit message 中 `feat(vX.XX)` 的版本号严格递增

### ⚫ 部署与交付

26. **构建产物:** `dist/` 目录，纯静态文件，可直接部署到任何 HTTP 服务器
27. **零外部依赖运行:** 构建后不需要 Node.js，浏览器直接打开
28. **兼容性:** 支持 Chrome/Firefox/Safari 最近 2 个大版本
29. **资源优化:** 图片用 WebP，JS bundle 开启 gzip，总体积 < 2MB

---

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
├── systems/         # 各游戏系统（56+）
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
├── __tests__/       # 单元测试
└── utils/
    ├── Pathfinding.ts
    ├── Noise.ts
    └── Constants.ts
```

## 迭代计划
### Phase 1 (v0.1-v0.15): 基础框架 ✅
### Phase 2 (v0.16-v0.30): 生物系统 ✅
### Phase 3 (v0.31-v0.45): 上帝之力 ✅
### Phase 4 (v0.46-v0.55): 文明系统 ✅
### Phase 5 (v0.56-v0.80): 打磨优化 ✅
### Phase 6 (v0.81-v1.00): 工程化 + 测试 + 部署就绪
- 引入 Vitest，核心系统补测试
- 性能 profiling 和优化
- 构建产物优化（tree-shaking、code splitting）
- README + 部署文档
### Phase 7 (v1.00+): 高级特性
- 多人联机（WebSocket/WebRTC）
- 地图编辑器导出/导入
- MOD 系统
- 移动端适配
