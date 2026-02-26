# WorldBox Web — God Simulator

纯前端网页版上帝模拟器。在像素风格的 2D 世界中创造地形、放置生物、触发灾难，观察文明自主演化。

零运行时依赖，浏览器直接运行。

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Lines](https://img.shields.io/badge/代码量-~97k_lines-green)
![Systems](https://img.shields.io/badge/ECS_Systems-673-orange)

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
- **怀旧情结** — 生物对出生地产生眷恋，远离家乡时情绪低落
- **宠物系统** — 收养猫、狗、鸟等宠物提升心情
- **仪式系统** — 群体仪式祈福、丰收、备战
- **驯化系统** — 驯服野生生物
- **悬赏系统** — 文明对敌方生物发布悬赏
- **发明创造** — 生物发明工具、武器、农业技术，发明在文明间传播
- **恐惧症** — 生物因创伤发展恐惧（火焰、水、黑暗等），影响行为和战斗力
- **艺术创作** — 生物发展绘画、雕塑、音乐等才能，创作作品影响文化和声望
- **图腾崇拜** — 部落在重要地点建造图腾，为附近生物提供被动增益
- **仪式舞蹈** — 庆典、战争、祈雨等仪式舞蹈，为参与者提供临时增益
- **心理创伤** — 战斗、灾难、失去同伴后产生创伤，影响行为和移动模式
- **迁徙记忆** — 生物记住优质栖息地并代际传承，形成种族迁徙路线
- **决斗系统** — 竞争对手之间发起正式决斗，争夺荣誉、领地、配偶或领导权
- **梦境系统** — 生物在休息时做梦，预言梦、噩梦、怀旧梦等影响情绪
- **收藏系统** — 生物收集宝石、贝壳、骨头等物品，可交易或被盗
- **视觉系统** — 生物视野范围受地形影响，影响探索、战斗和社交
- **觅食系统** — 根据季节和地形采集野生食物，发现新食物来源
- **誓言系统** — 生物发誓忠诚、复仇、守护等，影响行为和战斗加成
- **传承系统** — 伟大事迹在死后留下传承，影响后代和文明文化
- **占卜系统** — 萨满和长老通过星象、骨卜、火焰等方式预测未来事件
- **谣言系统** — 谣言在生物间传播，关于危险、宝藏、背叛等话题逐渐失真
- **驯兽师系统** — 生物专精驯服野兽，建立战骑、驮兽、侦察兽等纽带
- **守夜系统** — 生物轮流守夜保护村庄，提升警觉技能
- **物物交换** — 生物之间用多余资源交换所需物品，公平性影响关系
- **恐惧症系统** — 生物对水、火、黑暗等产生恐惧，影响移动和决策
- **直觉系统** — 高智慧生物预感危险或机遇，提前做出反应
- **绰号系统** — 根据行为和成就获得"勇者""智者""流浪者"等绰号
- **流放系统** — 犯罪或叛变的生物被文明流放，成为流浪者或加入其他文明
- **怨恨系统** — 被攻击或背叛后记仇，寻机报复，仇恨随时间衰减
- **梦游系统** — 部分生物夜间无意识游荡，可能遭遇危险
- **纹身系统** — 通过成就获得部落纹、符文纹、战纹等，作为社会地位象征
- **幽闭恐惧** — 部分生物恐惧封闭空间，靠近山地或密林时恐慌
- **朝圣系统** — 生物前往圣地朝圣，旅途中获得智慧和精神力量
- **梦话系统** — 生物睡眠中说出秘密、预言、忏悔等，可能泄露重要信息
- **预兆信仰** — 生物将自然事件解读为吉凶预兆，影响士气和行为决策
- **双手灵巧** — 部分生物发展双手协调能力，获得战斗和制作加成
- **手工艺系统** — 生物制作珠宝、陶器、武器等手工艺品，提升声望
- **怀乡系统** — 远离家乡的生物产生思乡情绪，可能尝试返回故土
- **摇篮曲系统** — 成年生物唱歌安抚幼崽，减轻压力并增强社会纽带
- **书法系统** — 生物发展书写技能，记录历史、法律和神话
- **发酵系统** — 生物发现酿造技术，酿造果酒、蜂蜜酒等提升士气和贸易
- **腹语术** — 生物发展投声能力，用于欺骗敌人、娱乐同伴和辅助狩猎
- **陶艺系统** — 生物制作陶器用于储存、烹饪和仪式，提升文化价值
- **回声定位** — 生物发展声纳感知，在黑暗中导航、探测隐藏敌人
- **织布系统** — 生物学习纺织技术，编织亚麻、羊毛、丝绸等提供保暖和贸易
- **拟态系统** — 生物模仿其他物种的外观和行为，用于狩猎和防御
- **养蜂系统** — 生物学习养蜂，蜂蜜提供食物、药物和贸易品
- **心灵感应** — 生物发展心灵感应能力，感知危险、无声交流、影响他人
- **玻璃吹制** — 生物学习玻璃工艺，制作花瓶、窗户、透镜等艺术品和工具
- **预知能力** — 生物预感灾难、战斗和机遇，提前做出反应
- **草药学** — 生物学习药用植物知识，采集草药、调制药剂治愈伤病
- **制图术** — 生物学习绘制地图，记录地形、贸易路线和战略位置
- **变形术** — 魔法生物可以变换形态，伪装为其他物种获得能力
- **制皂术** — 生物收集油脂和灰烬制作肥皂，提升卫生和贸易价值
- **赌博** — 生物进行赌博活动，影响财富分配和社会关系
- **角斗士** — 生物在竞技场中战斗获取荣誉和名望
- **蘑菇采集** — 生物采集蘑菇作为食物和药材，需辨别毒性
- **捕猎陷阱** — 生物设置陷阱捕获猎物，发展狩猎技能
- **天文观测** — 生物观测星象预测事件，发展天文学知识

### 文明演化

- **村庄自动扩张** — 建筑升级、城市规划
- **科技树** — 从石器时代到高级文明
- **外交系统** — 联盟、战争、间谍活动、联姻外交、朝贡体系、宣传战、议会投票、人质交换、流放制度、封锁围困、多国联邦、间谍情报、外交仪式、皇室联姻、庇护制度、贸易禁运、继承危机、贸易协定、人口普查、战争赔款、文化交流、约束性誓约、贸易关税、第三方调解、贸易制裁、和平条约、贸易公会、海上封锁、赎金谈判、互不侵犯条约、停战协议
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
- **地下洞穴** — 山地和森林下方自然生成洞穴网络，蕴含资源和危险
- **极光现象** — 极地区域出现北极光/南极光，提升附近生物心情
- **地热系统** — 温泉、间歇泉、喷气孔等地热特征，提供温暖和治愈效果
- **瘴气区域** — 沼泽、战场、污染区产生有毒瘴气，伤害生物并腐蚀地形
- **远古化石** — 山地、沙地中埋藏化石，生物可发现并增加文明知识
- **信号灯塔** — 瞭望塔、灯塔、烽火台等信号设施，链式传递警报和导航
- **板块构造** — 地壳板块漂移、碰撞形成山脉、分离形成裂谷
- **世界回声** — 声音在世界中传播，影响生物感知
- **沙漠绿洲** — 沙漠中自然形成绿洲，吸引生物聚集，可能干涸或扩张
- **石化区域** — 魔法石化区域扩散，困住生物，周期性膨胀收缩
- **海洋漩涡** — 深水区形成漩涡，吸引附近生物和船只，周期性增长收缩
- **珊瑚礁** — 浅水海岸线生长珊瑚礁，吸引海洋生物，可能白化退化
- **沙尘暴** — 沙漠区域形成沙暴，推动生物、改变地形
- **次元裂隙** — 维度裂缝撕裂世界，扭曲地形、吸引或排斥生物
- **流沙陷阱** — 沙漠地形中出现流沙，困住经过的生物，需要救援
- **彗星天象** — 稀有彗星划过天空，带来资源雨、预兆或变异效果
- **日食月食** — 周期性天文现象，引发恐慌、崇拜或力量涌动
- **天坑系统** — 地面塌陷形成天坑，吞噬地形并伤害附近生物
- **彩虹现象** — 雨后出现彩虹，提升附近生物士气
- **沙尘暴系统** — 大规模沙尘暴席卷地形，降低能见度并伤害生物
- **生物荧光** — 水域和洞穴中发光生物群落，脉冲发光吸引并治愈生物
- **永久冻土** — 寒冷区域的冻土层，减缓移动并造成寒冷伤害
- **海啸系统** — 巨浪从海岸线涌入内陆，推动生物并造成破坏
- **泥石流系统** — 暴雨后山地触发泥石流，改变地形并推动生物
- **海藻林系统** — 浅水区生长海藻林，提供食物和庇护
- **地热喷口** — 深海热泉产生热量和矿物，形成独特生态系统
- **盐沼系统** — 干旱地区形成盐沼，提供盐资源
- **海市蜃楼** — 沙漠中出现幻象，引诱生物偏离路线
- **雾带系统** — 沿海地区形成浓雾，降低能见度并减缓移动
- **尘卷风** — 干旱地区形成小型旋风，打散资源并使生物迷失方向
- **红树林** — 热带海岸线生长红树林，保护海岸、孕育海洋生物
- **球状闪电** — 暴风雨中出现罕见球状闪电，不规则移动并惊吓生物
- **水晶洞穴** — 山地中形成水晶洞穴，提供稀有资源和魔法能量
- **海龙卷** — 温暖海面形成水龙卷，破坏沿海区域并驱散海洋生物
- **火山岛** — 海底火山喷发形成新岛屿，冷却后逐渐变得宜居
- **地下河** — 隐藏的地下水系，形成绿洲、供给水井，可通过采矿发现
- **浮空岛** — 魔法浮空陆地，承载稀有资源，在世界上空缓慢漂移
- **旋风系统** — 局部旋转风现象，打散碎片、驱散生物、重塑地貌
- **露水形成** — 夜间温度下降时地表形成露水，滋润植被促进生长
- **沙丘迁移** — 风力推动沙丘缓慢移动，改变沙漠地形
- **潮间带** — 潮汐涨落暴露和淹没海岸区域，形成独特生态
- **冰盖扩张** — 极寒地区形成大面积冰盖，影响气候和地形
- **珊瑚产卵** — 水域中珊瑚周期性产卵繁殖，扩展珊瑚礁
- **深海热液喷口** — 海底热液喷口产生矿物和热量，孕育独特生命

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
├── systems/             # 游戏系统 (698 个)
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

### 698 个 ECS 系统（按类别）

<details>
<summary>点击展开完整系统列表</summary>

**核心模拟** — AISystem, CombatSystem, PopulationSystem, ResourceSystem, EcosystemSystem, MoodSystem

**生物** — CreatureAgingSystem, CreatureEmotionSystem, CreatureMemorySystem, CreaturePersonalitySystem, CreatureSkillSystem, CreatureTamingSystem, CreatureBountySystem, CreatureMutationSystem, CreatureAncestorSystem, CreatureApprenticeSystem, CreatureGuildSystem, CreatureReputationSystem, CreatureHobbySystem, CreatureLanguageSystem, CreatureTradeSkillSystem, CreatureAllianceSystem, CreatureSuperstitionSystem, CreatureAmbitionSystem, CreatureFashionSystem, CreaturePetSystem, CreatureRitualSystem, CreatureDreamSystem, CreatureRivalrySystem, CreatureMentorSystem, CreatureTraumaSystem, CreatureMigrationMemorySystem, CreatureCollectionSystem, CreatureVisionSystem, CreatureForagingSystem, CreatureOathSystem, CreatureLegacySystem, CreatureDivinationSystem, CreatureBeastMasterSystem, CreatureRumorSystem, CreatureNightWatchSystem, CreatureBeekeepingSystem, CreatureTelepathySystem, CreatureGlassblowingSystem, CreaturePremonitionSystem, CreatureHerbalismSystem, CreatureCartographySystem, CreatureShapeshiftingSystem, CreatureRunecraftingSystem, CreatureAstrologySystem, CreatureSummoningSystem, CreatureAlchemySystem, CreatureEnchantingSystem, CreatureBardSystem, CreatureConstellationSystem, CreatureScribeSystem, CreatureMasonrySystem, CreatureOrigamiSystem, CreatureFalconrySystem, CreatureApiarySystem, CreatureCourierSystem, CreatureMosaicSystem, CreatureTattoistSystem, CreatureHeraldSystem, CreaturePuppeteerSystem, CreatureRangerSystem, CreatureRunnerSystem, CreatureJesterSystem, CreatureNomadSystem, CreatureChroniclerSystem, CreatureFirewalkerSystem, CreatureOracleSystem, CreatureBlacksmithSystem, CreatureDowserSystem, CreatureCheeseAgerSystem, CreatureSoapMakerSystem, CreatureGamblerSystem, CreatureGladiatorSystem, CreatureMushroomForagerSystem, CreatureTrapperSystem, CreatureAstronomerSystem, CreatureWeaverSystem, CreatureHerbalistSystem, CreatureSentinelSystem, CreatureBeekeeperSystem, CreatureLamplighterSystem, CreaturePerfumerSystem, CreatureGlazierSystem, CreatureGondolierSystem, CreatureCooperSystem, CreatureChandlerSystem, CreatureTinkerSystem, CreatureFletcherSystem, CreatureWheelwrightSystem, CreatureFalconerSystem, CreatureEngraverSystem, CreatureTannerSystem, CreatureCartographerSystem, CreatureRopeMakerSystem, CreatureVintnerSystem, CreatureShipwrightSystem, CreatureDyerSystem, CreatureLapidarySystem, CreatureLocksmithSystem, CreatureRugmakerSystem, CreatureSaddlerSystem, CreatureBookbinderSystem, CreatureFarrierSystem, CreatureFullerSystem, CreatureSawyerSystem, CreatureGildersSystem, CreatureCoopersSystem, CreatureThatchersSystem, CreatureChandlersSystem, CreatureGlazersSystem, CreaturePlasterersSystem, GeneticsSystem, EvolutionSystem, FlockingSystem, AnimalMigrationSystem, CreatureReedCuttersSystem, CreaturePottersSystem, CreatureRopeMakersSystem, CreatureBellFoundersSystem, CreatureQuarrymenSystem, CreatureFeltersSystem, CreatureLimeburnersSystem, CreatureWheelersSystem, CreatureSieveMakersSystem, CreatureBroomMakersSystem, CreatureCharcoalBurnersSystem, CreatureTinsmithsSystem, CreatureBasketWeaversSystem, CreatureSoapMakersSystem, CreatureGlassblowersSystem, CreatureParchmentMakersSystem, CreatureDyersSystem, CreatureHarnessMakersSystem, CreatureVinegarMakersSystem

**文明** — DiplomacySystem, DiplomaticMarriageSystem, DiplomaticSanctionSystem, DiplomaticEspionageSystem, DiplomaticTributeSystem, DiplomaticPropagandaSystem, DiplomaticCouncilSystem, DiplomaticHostageSystem, DiplomaticExileSystem, DiplomaticMarriageSystem, DiplomaticCeremonySystem, DiplomaticAsylumSystem, DiplomaticEmbargoSystem, DiplomaticSuccessionSystem, DiplomaticTradeAgreementSystem, DiplomaticTradeGuildSystem, DiplomaticNavalBlockadeSystem, DiplomaticHostageExchangeSystem, DiplomaticRansomSystem, DiplomaticWarReparationsSystem, DiplomaticNonAggressionSystem, DiplomaticArmisticSystem, DiplomaticCeasefireSystem, DiplomaticProtectorateSystem, DiplomaticConfederationSystem, DiplomaticExtraditionSystem, DiplomaticAsylumSystem, DiplomaticSovereigntySystem, DiplomaticTribunalSystem, DiplomaticAmnestySystem, DiplomaticArbitrationSystem, DiplomaticPlebisciteSystem, DiplomaticReferendumSystem, DiplomaticRatificationSystem, DiplomaticAdjudicationSystem, DiplomaticMediationSystem, DiplomaticConciliationSystem, DiplomaticArbitrationTreatySystem, DiplomaticNeutralizationSystem, DiplomaticFederationSystem, DiplomaticConfederationDiplomacySystem, DiplomaticNonAggressionDiplomacySystem, DiplomaticSecessionSystem, DiplomaticProtectorateDiplomacySystem, DiplomaticAnnexationSystem, DiplomaticCoexistenceSystem, DiplomaticReunificationSystem, DiplomaticNonInterventionSystem, DiplomaticReconciliationSystem, DiplomaticDisarmamentSystem, CultureSystem, ReligionSystem, ReligionSpreadSystem, TechSystem, TradeEconomySystem, EraSystem, EraTransitionSystem, AllianceSystem, EspionageSystem, LoyaltySystem, ReputationSystem, SeasonFestivalSystem

**军事** — ArmySystem, FormationSystem, SiegeSystem, SiegeWarfareSystem, NavalSystem, NavalCombatSystem, LegendaryBattleSystem, BattleReplaySystem, FortificationRenderer

**经济 & 资源** — ResourceScarcitySystem, ResourceFlowSystem, CaravanSystem, TradeFleetSystem, TradeRouteRenderer, MiningSystem, CropSystem

**自然 & 灾害** — DisasterSystem, DisasterChainSystem, DisasterWarningSystem, WeatherSystem, WeatherDisasterSystem, WeatherControlSystem, WorldWeatherFrontSystem, WorldTidalSystem, WorldMagicStormSystem, WorldFertilitySystem, WorldErosionSystem, WorldCrystalFormationSystem, WorldMigrationRouteSystem, WorldVolcanicSystem, WorldAcousticSystem, WorldTectonicSystem, WorldEchoSystem, WorldOasisSystem, WorldPetrificationSystem, WorldSandstormSystem, WorldRiftSystem, WorldAvalancheSystem, WorldWhirlpoolSystem, WorldAuroraStormSystem, WorldMemorialSystem, WorldTidePoolSystem, WorldMeteorShowerSystem, WorldGlacierSystem, WorldPurificationSystem, WorldVolcanicIslandSystem, WorldUndergroundRiverSystem, WorldFloatingIslandSystem, WorldWhirlwindSystem, WorldGeothermalSystem, WorldCoralReefSystem, WorldGeyserFieldSystem, WorldNorthernLightsSystem, WorldMossGrowthSystem, WorldIrrigationSystem, WorldLighthouseSystem, WorldTidewaterSystem, WorldLabyrinthSystem, WorldTerracingSystem, WorldSundialSystem, WorldAqueductSystem, WorldGeoglyphSystem, WorldHotSpringSystem, WorldObsidianSystem, WorldCoralReefGrowthSystem, WorldMirageSystem, WorldPetrifiedForestSystem, WorldBioluminescenceSystem, WorldStalactiteSystem, WorldQuicksandSystem, WorldFrostbiteSystem, WorldCoralBleachingSystem, WorldAuroraSystem, WorldMagneticFieldSystem, WorldSinkholePrevSystem, WorldDewFormationSystem, WorldSandDuneSystem, WorldTideFlatSystem, WorldIceSheetSystem, WorldCoralSpawningSystem, WorldThermalVentSystem, WorldPeatBogSystem, WorldAtollSystem, WorldCoralNurserySystem, WorldMudVolcanoSystem, WorldFungalNetworkSystem, WorldSaltMarshSystem, WorldFrostHollowSystem, WorldBasaltColumnSystem, WorldMangroveSwampSystem, WorldObsidianFieldSystem, WorldKelpForestSystem, WorldLavaTubeSystem, WorldBioluminescentBaySystem, WorldPumiceFieldSystem, WorldSandstoneArchSystem, WorldFumaroleFieldSystem, WorldCloudForestSystem, WorldTravertineTerraceSystem, WorldBlackSandBeachSystem, WorldIceCaveSystem, WorldTidalLagoonSystem, WorldIceShelfSystem, WorldSeaStackSystem, WorldPermafrostThawSystem, WorldBarrierIslandSystem, WorldVolcanicAshPlainSystem, WorldMudFlatSystem, WorldCoralAtollSystem, WorldGeothermalSpringSystem, WorldSinkholePlainSystem, WorldPeatBogSystem, SeasonSystem, WorldSeasonalDisasterSystem, VolcanoSystem, BloodMoonSystem, PollutionSystem, DiseaseSystem, PlagueMutationSystem, RiverSystem, BiomeEvolutionSystem, WorldPlainsSystem, WorldSpireSystem, WorldGrottoSystem, WorldPinnacleSystem, WorldHoodooSystem, WorldCenoteSystem, WorldButtesSystem, WorldCanyonSystem, WorldArchipelagoSystem, WorldRiftValleySystem, WorldCalderaSystem, WorldEscarpmentSystem, WorldMesaSystem, WorldMoraineSystem, WorldBlowholeSystem, WorldDrumlinSystem, WorldKettleHoleSystem, WorldNunatakSystem

**建筑 & 城市** — BuildingUpgradeSystem, BuildingVarietySystem, CityLayoutSystem, CityPlanningSystem, MonumentSystem, WonderSystem, RuinsSystem

**渲染 & 视觉** — DayNightRenderer, FogOfWarRenderer, FogOfWarEnhanced, LODRenderSystem, RenderCullingSystem, ParticleSystem, UnifiedParticleSystem, WeatherParticleSystem, AmbientParticleSystem, WaterAnimationSystem, SeasonVisualSystem, EraVisualSystem, EvolutionVisualSystem, DiplomacyVisualSystem, PlagueVisualSystem, TerrainDecorationSystem, WorldDecorationSystem, WorldBorderSystem, SpriteRenderer (in game/)

**UI & 工具** — MinimapSystem, MinimapEnhancedSystem, MiniMapModeSystem, MinimapOverlaySystem, HelpOverlaySystem, ChartPanelSystem, EntityInspectorSystem, EntitySearchSystem, EnhancedTooltipSystem, NotificationCenterSystem, WorldDashboardSystem, WorldStatsOverviewSystem, SpeedIndicatorSystem, MapMarkerSystem

**高级特性** — MythologySystem, ProphecySystem, WorldNarratorSystem, CinematicModeSystem, MiniGameSystem, TimeRewindSystem, CustomSpeciesSystem, CreatureLineageSystem, WorldLawSystem, ZoneManagementSystem, HeroLegendSystem, ArtifactSystem, QuestSystem, GodPowerSystem, PortalSystem, ClonePowerSystem, PowerFavoriteSystem, WorldHeatmapSystem, WorldAgeSystem, WorldChronicleSystem, WorldRelicSystem, WorldAnomalySystem, WorldMythicBeastSystem, WorldAncientRuinSystem, WorldNaturalWonderSystem, WorldSacredGroveSystem

**基础设施** — SpatialHashSystem, ObjectPoolSystem, TickBudgetSystem, PerformanceMonitorSystem, AutoSaveSystem, WorldExportSystem, WorldSeedSystem, MapGenSystem, SandboxSettingsSystem, ScreenshotModeSystem, KeybindSystem, CameraAnimationSystem, CameraBookmarkSystem, TutorialSystem, HistoryReplaySystem, WorldEventSystem, WorldEventTimelineSystem, TimelineSystem, EventLog, EventNotificationSystem, StatisticsTracker, SoundSystem, AmbientSoundMixer, MusicSystem, TerraformingSystem, EditorEnhancedSystem, FogOfWarSystem, AchievementSystem, AchievementContentSystem, AchievementPopupSystem, AchievementProgressSystem

</details>

## 代码规模

| 模块 | 文件数 | 代码行数 |
|------|--------|---------|
| systems/ | 698 | ~87,000 |
| game/ | 8 | ~5,800 |
| ui/ | 8 | ~1,300 |
| civilization/ | 2 | ~1,100 |
| utils/ | 4 | ~330 |
| ecs/ | 1 | ~240 |
| entities/ | 1 | ~105 |
| **合计** | **722** | **~99,000** |

## 浏览器兼容性

Chrome / Firefox / Safari 最近 2 个大版本。

## License

Private
