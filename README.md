# WorldBox Web — God Simulator

纯前端网页版上帝模拟器。在像素风格的 2D 世界中创造地形、放置生物、触发灾难，观察文明自主演化。

零运行时依赖，浏览器直接运行。

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Lines](https://img.shields.io/badge/代码量-59k_lines-green)
![Systems](https://img.shields.io/badge/ECS_Systems-198+-orange)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → http://localhost:5174

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

构建产物在 `dist/` 目录，纯静态文件，可部署到任意 HTTP 服务器。

## 游戏特性

### 世界模拟

- **Tile-based 地图** — 200×200 网格，8 种地形（深水、浅水、沙滩、草地、森林、山地、雪地、岩浆）
- **昼夜循环 & 四季变化** — 影响生物行为和视觉表现
- **天气系统** — 雨、雪、雷暴，可手动控制
- **生态系统** — 动物迁徙、食物链、资源再生
- **河流 & 火山** — 程序化地形生成

### 生物 AI

- **7 种实体** — 人类、精灵、矮人、兽人、绵羊、狼、龙
- **需求驱动 AI** — 饥饿、移动、战斗、社交
- **遗传系统** — 基因遗传、进化、物种变异、基因突变
- **情感 & 记忆** — 生物有情绪状态和经历记忆
- **性格 & 技能树** — 个体差异化成长
- **兴趣爱好** — 钓鱼、绘画、观星、园艺等影响心情和社交
- **贸易技能** — 讨价还价、谈判、鉴定等提升经济效率
- **个人联盟** — 跨文明的个体友谊和血盟
- **迷信系统** — 生物发展吉凶预兆影响行为
- **个人野心** — 成为领袖、建造纪念碑、探索未知等目标
- **时尚潮流** — 服饰、发型、战纹等流行趋势影响士气
- **宠物系统** — 收养猫、狗、鸟等宠物提升心情
- **仪式系统** — 群体仪式祈福、丰收、备战
- **驯化系统** — 驯服野生生物
- **悬赏系统** — 文明对敌方生物发布悬赏

### 文明演化

- **村庄自动扩张** — 建筑升级、城市规划
- **科技树** — 从石器时代到高级文明
- **外交系统** — 联盟、战争、间谍活动、联姻外交、朝贡体系、宣传战、议会投票、人质交换、流放制度
- **宗教 & 文化** — 信仰传播、文化融合、季节节日、语言演化
- **贸易经济** — 商队、贸易路线、资源流通
- **时代演进** — 文明自动进入不同纪元

### 军事系统

- **军队编制 & 阵型** — 战术级战斗
- **攻城战** — 城防工事、攻城器械
- **海战** — 舰队对抗
- **传奇战役** — 史诗级大规模战斗回放

### 上帝之力

- **地形画笔** — 绘制/擦除任意地形
- **生物放置** — 投放各种族生物
- **自然力量** — 闪电、地震、陨石、龙卷风
- **毁灭之力** — 核弹、黑洞、酸雨、血月
- **传送门 & 克隆** — 高级操控手段

### 高级特性

- **神话系统** — 神话事件与传说
- **预言系统** — 世界预言与命运
- **世界叙述者** — AI 生成世界故事
- **电影模式** — 自动镜头运动，观赏世界
- **时间倒流** — 回溯世界历史
- **自定义物种** — 创建全新生物种族
- **小游戏** — 内嵌互动小游戏
- **世界法则** — 自定义物理/社会规则
- **世界遗迹** — 古代遗迹提供区域增益
- **自然奇观** — 瀑布、水晶洞、世界树等提供区域增益
- **天气锋面** — 冷锋、暖锋、风暴锋跨地图移动
- **神圣树林** — 森林中的灵性圣地提供祝福
- **潮汐系统** — 海岸线潮涨潮落影响沿海区域
- **魔法风暴** — 奥术风暴改变地形、留下附魔区域
- **土壤肥力** — 影响作物产量和森林生长
- **地形侵蚀** — 水流和天气逐渐重塑地貌
- **水晶矿脉** — 山地中生长的水晶可采集用于贸易和魔法
- **迁徙路线** — 动物和游牧群体的季节性迁徙路径

## 操作指南

| 操作 | 按键/方式 |
|------|----------|
| 平移视角 | 鼠标拖拽 / WASD |
| 缩放 | 滚轮 |
| 使用画笔 | 左键点击/拖拽 |
| 查看生物信息 | 点击生物 |
| 右键菜单 | 右键点击 |
| 暂停/继续 | 空格 |
| 快捷键帮助 | F1 / H |
| 截图模式 | 工具栏按钮 |
| 存档/读档 | Save / Load 按钮 |

## 技术架构

```
技术栈: TypeScript + HTML5 Canvas + Vite
架构:   ECS (Entity-Component-System)
渲染:   Canvas 2D, 像素风格 tile-based
依赖:   零运行时依赖
```

### 项目结构

```
src/
├── main.ts              # 入口
├── game/                # 核心引擎 (8 文件)
│   ├── Game.ts          # 主游戏循环
│   ├── World.ts         # 世界地图
│   ├── Camera.ts        # 摄像机（缩放/平移）
│   ├── Renderer.ts      # Canvas 渲染器
│   ├── SpriteRenderer.ts# 精灵渲染
│   ├── Input.ts         # 输入处理
│   ├── Powers.ts        # 上帝之力
│   └── SaveSystem.ts    # 存档系统
├── ecs/                 # ECS 框架
│   └── Entity.ts        # 实体管理
├── systems/             # 游戏系统 (198 个)
├── civilization/        # 文明管理
├── entities/            # 实体工厂
├── ui/                  # UI 组件 (8 个)
└── utils/               # 工具库
    ├── Constants.ts     # 游戏常量
    ├── Pathfinding.ts   # A* 寻路
    ├── Noise.ts         # 噪声生成
    └── NameGenerator.ts # 名称生成器
```

### 性能目标

- 1000 实体 @ 60fps
- 5000 实体 @ 30fps
- 内存 < 200MB
- 热路径零 GC（对象池复用）
- 空间索引加速范围查询

### 198 个 ECS 系统（按类别）

<details>
<summary>点击展开完整系统列表</summary>

**核心模拟** — AISystem, CombatSystem, PopulationSystem, ResourceSystem, EcosystemSystem, MoodSystem

**生物** — CreatureAgingSystem, CreatureEmotionSystem, CreatureMemorySystem, CreaturePersonalitySystem, CreatureSkillSystem, CreatureTamingSystem, CreatureBountySystem, CreatureMutationSystem, CreatureAncestorSystem, CreatureApprenticeSystem, CreatureGuildSystem, CreatureReputationSystem, CreatureHobbySystem, CreatureLanguageSystem, CreatureTradeSkillSystem, CreatureAllianceSystem, CreatureSuperstitionSystem, CreatureAmbitionSystem, CreatureFashionSystem, CreaturePetSystem, CreatureRitualSystem, GeneticsSystem, EvolutionSystem, FlockingSystem, AnimalMigrationSystem

**文明** — DiplomacySystem, DiplomaticMarriageSystem, DiplomaticSanctionSystem, DiplomaticEspionageSystem, DiplomaticTributeSystem, DiplomaticPropagandaSystem, DiplomaticCouncilSystem, DiplomaticHostageSystem, DiplomaticExileSystem, CultureSystem, ReligionSystem, ReligionSpreadSystem, TechSystem, TradeEconomySystem, EraSystem, EraTransitionSystem, AllianceSystem, EspionageSystem, LoyaltySystem, ReputationSystem, SeasonFestivalSystem

**军事** — ArmySystem, FormationSystem, SiegeSystem, SiegeWarfareSystem, NavalSystem, NavalCombatSystem, LegendaryBattleSystem, BattleReplaySystem, FortificationRenderer

**经济 & 资源** — ResourceScarcitySystem, ResourceFlowSystem, CaravanSystem, TradeFleetSystem, TradeRouteRenderer, MiningSystem, CropSystem

**自然 & 灾害** — DisasterSystem, DisasterChainSystem, DisasterWarningSystem, WeatherSystem, WeatherDisasterSystem, WeatherControlSystem, WorldWeatherFrontSystem, WorldTidalSystem, WorldMagicStormSystem, WorldFertilitySystem, WorldErosionSystem, WorldCrystalFormationSystem, WorldMigrationRouteSystem, SeasonSystem, WorldSeasonalDisasterSystem, VolcanoSystem, BloodMoonSystem, PollutionSystem, DiseaseSystem, PlagueMutationSystem, RiverSystem, BiomeEvolutionSystem

**建筑 & 城市** — BuildingUpgradeSystem, BuildingVarietySystem, CityLayoutSystem, CityPlanningSystem, MonumentSystem, WonderSystem, RuinsSystem

**渲染 & 视觉** — DayNightRenderer, FogOfWarRenderer, FogOfWarEnhanced, LODRenderSystem, RenderCullingSystem, ParticleSystem, UnifiedParticleSystem, WeatherParticleSystem, AmbientParticleSystem, WaterAnimationSystem, SeasonVisualSystem, EraVisualSystem, EvolutionVisualSystem, DiplomacyVisualSystem, PlagueVisualSystem, TerrainDecorationSystem, WorldDecorationSystem, WorldBorderSystem, SpriteRenderer (in game/)

**UI & 工具** — MinimapSystem, MinimapEnhancedSystem, MiniMapModeSystem, MinimapOverlaySystem, HelpOverlaySystem, ChartPanelSystem, EntityInspectorSystem, EntitySearchSystem, EnhancedTooltipSystem, NotificationCenterSystem, WorldDashboardSystem, WorldStatsOverviewSystem, SpeedIndicatorSystem, MapMarkerSystem

**高级特性** — MythologySystem, ProphecySystem, WorldNarratorSystem, CinematicModeSystem, MiniGameSystem, TimeRewindSystem, CustomSpeciesSystem, CreatureLineageSystem, WorldLawSystem, ZoneManagementSystem, HeroLegendSystem, ArtifactSystem, QuestSystem, GodPowerSystem, PortalSystem, ClonePowerSystem, PowerFavoriteSystem, WorldHeatmapSystem, WorldAgeSystem, WorldChronicleSystem, WorldRelicSystem, WorldAnomalySystem, WorldMythicBeastSystem, WorldAncientRuinSystem, WorldNaturalWonderSystem, WorldSacredGroveSystem

**基础设施** — SpatialHashSystem, ObjectPoolSystem, TickBudgetSystem, PerformanceMonitorSystem, AutoSaveSystem, WorldExportSystem, WorldSeedSystem, MapGenSystem, SandboxSettingsSystem, ScreenshotModeSystem, KeybindSystem, CameraAnimationSystem, CameraBookmarkSystem, TutorialSystem, HistoryReplaySystem, WorldEventSystem, WorldEventTimelineSystem, TimelineSystem, EventLog, EventNotificationSystem, StatisticsTracker, SoundSystem, AmbientSoundMixer, MusicSystem, TerraformingSystem, EditorEnhancedSystem, FogOfWarSystem, AchievementSystem, AchievementContentSystem, AchievementPopupSystem, AchievementProgressSystem

</details>

## 代码规模

| 模块 | 文件数 | 代码行数 |
|------|--------|---------|
| systems/ | 198 | ~51,400 |
| game/ | 8 | ~5,600 |
| ui/ | 8 | ~1,300 |
| civilization/ | 2 | ~1,100 |
| utils/ | 4 | ~330 |
| ecs/ | 1 | ~240 |
| entities/ | 1 | ~105 |
| **合计** | **218** | **~59,100** |

## 浏览器兼容性

Chrome / Firefox / Safari 最近 2 个大版本。

## License

Private
