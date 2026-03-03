仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代154（循环61/100）。本轮主要成就：修复18个测试文件的TypeScript类型错误（98处），批量扩展200+个测试文件从20-30个测试至40-50+个测试，修复97个失败测试。测试从37044增至44244（+7200）。所有861个测试文件均通过，无任何<20测试的文件，78个文件<35测试。
🎯 AI 自定优先级：[
  "1. 继续扩展剩余78个<35测试的文件至50+测试",
  "2. 检查代码优化机会（性能/类型/逻辑）",
  "3. tsc+vitest验证保持全绿（当前44244/44244）",
  "4. 检查还有没有其他可以优化的系统"
]
💡 AI 积累经验：[
  "非空断言(!)是最常见的崩溃点",
  "子代理并行修复大批量文件极高效：4个并行代理可在几分钟内修复160+文件",
  "manualChunks按文件名前缀分组是最安全的代码分割方案",
  "【迭代100新增-最重要】非空断言扫描必须同时用两种正则：① [^a-zA-Z]!\\. 匹配 x!.y 形式；② \\)!(?=[.\\[;,\\)\\s]|$) 匹配 func()! 形式",
  "【迭代121新增】测试路径规范：src/__tests__/目录内的测试文件import路径是'../systems/'（单级上溯）",
  "【迭代130新增】Flaky测试根本原因：cleanup/state测试中未mock Math.random，spawn逻辑有小概率触发",
  "【迭代131新增】TileType枚举正确值：DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5",
  "【迭代135新增】spawn后立即update的off-by-one陷阱：同一次update()内先spawn再update所有记录，字段立即偏移",
  "【迭代144新增】hasAdjacentTile：getTile必须返回number，不能返回{type: tileType}对象",
  "【迭代150新增】Tidal系列FORM_CHANCE方向分裂：Lagoon/Marsh用random<FC；TidalWave用random>FC——每个系统必须独立验证",
  "【迭代151新增】WorldTufaSystem cleanup用age>=97（相对年龄，另一个按age的系统），width=0时使用200 fallback",
  "【迭代152新增】WorldWeatherFrontSystem cleanup条件是严格小于：x<-20（非x<=-20），age>=maxAge才删除",
  "【迭代153新增】cleanup测试中若系统有recruit/spawn逻辑，必须在beforeEach中mock Math.random为0.99以禁止随机招募——否则有小概率导致测试不稳定",
  "【迭代153新增】DOM依赖的系统（使用document.createElement/window.addEventListener）需在测试文件顶部添加// @vitest-environment happy-dom（非jsdom，项目用happy-dom）才能实例化",
  "【迭代153新增】并行Agent大批量扩展测试极其高效：单轮30批次×3文件=90+个系统测试文件扩展，+5000+测试",
  "【迭代154新增】for循环分号错误是最常见的生成器bug：for(...) ;(sys导致ReferenceError: i is not defined，必须用for(...) {有花括号",
  "【迭代154新增】duration类字段在spawn后立即被自增，初始值断言不能用toBe(0)，应用toBeGreaterThanOrEqual(0)或toBeLessThanOrEqual(2)",
  "【迭代154新增】describe块提前关闭（多余的})）会导致后续describe块无法访问外层变量，需要检查括号匹配",
  "【迭代154新增】mock对象缺少方法时测试会失败，需要根据源码调用补全所有必要方法（如hasComponent/getEntitiesWithComponent）"
]

迭代轮次: 70/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-03-03T11:08:56+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
