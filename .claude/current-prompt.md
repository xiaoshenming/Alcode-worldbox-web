仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代17完成。核心工作：大批量扩展World*系统测试覆盖，突破3000测试里程碑！从2730个测试增长到3029个测试（+299个），测试文件从402增到462个（+60个文件）。本轮新增60个测试文件，分5批commit推送：batch1(+103)WorldWaterspout/WorldLahar/WorldPyroclasticFlow/WorldHotSpring/WorldCenote/WorldMirage/WorldGeyserField/WorldCrystalCave/WorldQuicksand/WorldFumarole/WorldBlowhole/WorldFjord/WorldDelta/WorldCanyon/WorldStalactite/WorldGeothermal/WorldIceCave/WorldUnderground/WorldVolcanicIsland/WorldMangrove；batch2(+77)WorldRiftValley/WorldGorge/WorldHoodoo/WorldMesa/WorldSpire/WorldPinnacle/WorldEscarpment/WorldLavaTube/WorldRockBridge/WorldSandDune/WorldSaltFlat/WorldPeatBog/WorldMossGrowth/WorldFossil/WorldGeoglyph/WorldSacredGrove；batch3(+56)WorldNaturalWonder/WorldNaturalTunnel/WorldUndergroundRiver/WorldArchipelago/WorldAtoll/WorldBarrierIsland/WorldMudFlat/WorldMudPot/WorldMudVolcano/WorldObsidian/WorldCrystalFormation/WorldBalancingRock；batch4(+41)WorldAncientRuin/WorldMemorial/WorldSundial/WorldAqueduct/WorldLabyrinth/WorldNorthernLights/WorldBallLightning/WorldFrostbite；batch5(+22)WorldFrostHollow/WorldDewFormation/WorldFogBank/WorldSeasonalDisaster。TypeScript零错误，构建正常，所有commits推送成功。
🎯 AI 自定优先级：[
  "1. 继续探索未测试的World*系统（WorldWeatherFront/WorldMaelstrom/WorldAcoustic/WorldMagneticField等还有很多）",
  "2. 探索Spring系列系统（WorldActiniumSpring/WorldAluminumSpring等100+化学元素泉系统）",
  "3. 当前3029个测试，继续向3500+冲刺",
  "4. Game.ts仍有4045行（超标8倍）：loop(1038行)是最大候选，但依赖太多系统，风险高",
  "5. WorldEventSystem(813行)、WeatherDisasterSystem(741行) 超出质量门禁 500 行"
]
💡 AI 积累经验：[
  "非空断言(!)是最常见的崩溃源 — 已在迭代26彻底清零",
  "子代理并行修复大批量文件极常高效：3组并行代理可在几分钟内修复100+文件",
  "manualChunks按文件名前缀分组是最安全的代码分割方案 — 不改源码，只改vite配置",
  "Iterable<T>替代T[]可消除spread分配，但需检查消费端是否用了.length/.includes等数组方法",
  "getAllEntities()返回Array.from()快照 — removeEntity-during-iteration是安全的",
  "queue.shift()在BFS中是O(n²)陷阱 — 用索引指针head++替代",
  "Camera.getVisibleBounds()等热路径方法应返回缓存对象而非每次new — 每帧调用4次累积显著GC压力",
  "渲染路径中的闭包/对象字面量/getBoundingClientRect()都是隐性GC源 — 预分配+脏标记是标准修复模式",
  "数据驱动批量调度：703个系统调用按签名分类为6种类型(A-F)，用数组+for循环替代逐个调用，净减1147行",
  "预分配缓冲区模式：_xxxBuf数组只增长不收缩，_xxx.length=0重置视图，避免每次new对象",
  "IIFE闭包在tick路径中是隐性GC源 — 改为外部循环+持久化Set/变量",
  "find()/filter()/slice()链在嵌套循环中产生O(N²)闭包+数组 — 手动for循环+早退出是标准替代",
  "渲染管线不适合简单的数据驱动替换 — render调用间穿插条件逻辑和特殊参数，z-order顺序重要",
  "A*寻路用二叉堆替代线性数组是最高收益的算法优化 — pop从O(n)降到O(logn)，Map查重替代find()从O(n)降到O(1)",
  "SpatialHash字符串键(cx+','+cy)每次insert/query都产生GC — 改为数值编码cy*100000+cx零分配",
  "per-tick生物位置缓存模式：在系统update开头一次性收集所有生物位置到平坦数组，后续countSpeciesInArea直接遍历缓存而非反复getComponent",
  "4个独立系统的性能修复可以完美并行 — 4个opus子代理同时工作，总耗时等于最慢的一个",
  "接口注入模式：提取模块时定义只包含所需字段的接口(如GameInputContext)，Game通过`this as unknown as Interface`传入，避免循环依赖",
  "3个并行子代理可成功修改同一文件的不同区域 — 只要各自负责的方法边界清晰，提取可以并行完成",
  "vite循环chunk警告是rollup内部模块分配的结果，不影响构建成功和应用运行，可以作为提示接受",
  "Vitest在vite.config.ts中添加test.environment='node'配置即可支持纯逻辑测试，无需额外配置文件",
  "【重要安全规则】严禁用Write工具创建src/__tests__/目录内的文件！Write工具会将__转义为\\_\\_导致创建错误目录，必须用Bash cat heredoc方式创建测试文件",
  "Creature系列系统的测试模式极其统一：直接push到(sys as any).xxx数组/Map注入数据 + 验证getter返回内部引用或过滤结果",
  "批量创建测试文件时用Bash cat heredoc并行执行效率最高 — 单轮可创建12-24个测试文件",
  "【关键经验】测试前必须先用grep确认接口字段！不同系统同名方法字段可能完全不同",
  "有些系统没有skillMap/getSkill方法——用grep先确认再写测试",
  "【重要】tsc --noEmit是必须步骤！每批创建后必须运行tsc验证，防止接口字段遗漏",
  "ResourceScarcitySystem的ResourceStock字段是capacity/consumptionRate/productionRate，不是max/production/consumption",
  "for循环中的(sys as any).xxx.push()前面不能有分号——分号会让push成为独立语句而非循环体",
  "WorldCorruptionSystem用Float32Array存储腐败度，直接array[index] = value注入数据",
  "WorldFertilitySystem需要先调用init(w, h, tiles)才能使用getFertility/getAverageFertility",
  "WorldAgeSystem初始（tick=0）epoch是PRIMORDIAL，displayName='太初'，getDisasterFrequencyModifier()返回2.0>1",
  "WorldNarratorSystem的addNarrative是公共API，无需手动注入entries数组，通过addNarrative写入数据更自然",
  "WorldCoralReefSystem.getReefAt用近似匹配（±2格）而非精确匹配——测试时相邻坐标也应返回结果",
  "WorldUndergroundSystem有getCaves()/getDiscoveredCaves()/getTotalDiscovered()三个getter，比单一getter更丰富",
  "WorldMemorialSystem.getByType(type)按类型过滤——比直接返回所有的系统多一层过滤逻辑",
  "WorldWeatherFrontSystem有getFronts()/getCollisions()/getFrontAt()三个getter——FrontCollision是frontA/frontB碰撞对",
  "每轮可以批量创建60+个测试文件，单轮净增300个测试是可行的",
  "网络断连时先commit本地，待网络恢复后批量push——git会自动合并推送"
]

迭代轮次: 18/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-02-27T19:21:59+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
