import { World } from './World'
import { Camera } from './Camera'
import { Renderer } from './Renderer'
import { Input } from './Input'
import { Powers } from './Powers'
import { GameUIHelper, GameUIContext } from './GameUISetup'
import { EntityType, TILE_SIZE, TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Toolbar } from '../ui/Toolbar'
import { InfoPanel } from '../ui/InfoPanel'
import { CreaturePanel } from '../ui/CreaturePanel'
import { EventPanel } from '../ui/EventPanel'
import { StatsPanel } from '../ui/StatsPanel'
import { ContextMenu, MenuSection } from '../ui/ContextMenu'
import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent, HeroComponent, VelocityComponent, GeneticsComponent } from '../ecs/Entity'
import { AISystem } from '../systems/AISystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ParticleSystem } from '../systems/ParticleSystem'
import { SoundSystem } from '../systems/SoundSystem'
import { WeatherSystem } from '../systems/WeatherSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { SaveSystem } from './SaveSystem'
import { showSaveLoadPanel } from './SaveLoadPanel'
import { GameInputManager } from './GameInputManager'
import { CreatureFactory } from '../entities/CreatureFactory'
import { CivManager } from '../civilization/CivManager'
import { resetCivIdCounter, CivMemberComponent } from '../civilization/Civilization'
import { AchievementSystem, WorldStats } from '../systems/AchievementSystem'
import { DisasterSystem } from '../systems/DisasterSystem'
import { TimelineSystem } from '../systems/TimelineSystem'
import { TechSystem } from '../systems/TechSystem'
import { MigrationSystem } from '../systems/MigrationSystem'
import { EventLog } from '../systems/EventLog'
import { ArtifactSystem } from '../systems/ArtifactSystem'
import { DiseaseSystem } from '../systems/DiseaseSystem'
import { WorldEventSystem } from '../systems/WorldEventSystem'
import { CaravanSystem } from '../systems/CaravanSystem'
import { DiplomacySystem } from '../systems/DiplomacySystem'
import { CropSystem } from '../systems/CropSystem'
import { NavalSystem } from '../systems/NavalSystem'
import { QuestSystem } from '../systems/QuestSystem'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem'
import { EcosystemSystem } from '../systems/EcosystemSystem'
import { FogOfWarSystem } from '../systems/FogOfWarSystem'
import { ReligionSystem } from '../systems/ReligionSystem'
import { AmbientParticleSystem } from '../systems/AmbientParticleSystem'
import { CityPlanningSystem } from '../systems/CityPlanningSystem'
import { ArmySystem } from '../systems/ArmySystem'
import { EraSystem } from '../systems/EraSystem'
import { TechTreePanel } from '../ui/TechTreePanel'
import { TradeEconomySystem } from '../systems/TradeEconomySystem'
import { HeroLegendSystem } from '../systems/HeroLegendSystem'
import { WonderSystem } from '../systems/WonderSystem'
import { ToastSystem } from '../ui/ToastSystem'
import { TickBudgetSystem } from '../systems/TickBudgetSystem'
import { LoyaltySystem } from '../systems/LoyaltySystem'
import { BiomeEvolutionSystem } from '../systems/BiomeEvolutionSystem'
import { EspionageSystem } from '../systems/EspionageSystem'
import { DayNightRenderer } from '../systems/DayNightRenderer'
import { GodPowerSystem } from '../systems/GodPowerSystem'
import { WorldChronicleSystem, WorldSnapshot } from '../systems/WorldChronicleSystem'
import { CultureSystem } from '../systems/CultureSystem'
import { MusicSystem } from '../systems/MusicSystem'
import { MiningSystem } from '../systems/MiningSystem'
import { DisasterChainSystem } from '../systems/DisasterChainSystem'
import { SeasonSystem } from '../systems/SeasonSystem'
import { AnimalMigrationSystem } from '../systems/AnimalMigrationSystem'
import { VolcanoSystem } from '../systems/VolcanoSystem'
import { RiverSystem } from '../systems/RiverSystem'
import { TradeRouteRenderer, TradeRoute } from '../systems/TradeRouteRenderer'
import { RuinsSystem } from '../systems/RuinsSystem'
import { PlagueVisualSystem } from '../systems/PlagueVisualSystem'
import { WorldDecorationSystem } from '../systems/WorldDecorationSystem'
import { EraVisualSystem } from '../systems/EraVisualSystem'
import { WeatherDisasterSystem } from '../systems/WeatherDisasterSystem'
import { FogOfWarRenderer } from '../systems/FogOfWarRenderer'
import { FortificationRenderer, CityFortification } from '../systems/FortificationRenderer'
import { EvolutionSystem } from '../systems/EvolutionSystem'
import { PopulationSystem } from '../systems/PopulationSystem'
import { AllianceSystem } from '../systems/AllianceSystem'
import { TerraformingSystem } from '../systems/TerraformingSystem'
import { StatisticsTracker } from '../systems/StatisticsTracker'
import { SpatialHashSystem } from '../systems/SpatialHashSystem'
import { ObjectPoolSystem } from '../systems/ObjectPoolSystem'
import { MinimapOverlaySystem } from '../systems/MinimapOverlaySystem'
import { PortalSystem } from '../systems/PortalSystem'
import { WaterAnimationSystem } from '../systems/WaterAnimationSystem'
import { MinimapSystem } from '../systems/MinimapSystem'
import { FormationSystem } from '../systems/FormationSystem'
import { AchievementContentSystem, WorldStats as AchContentWorldStats } from '../systems/AchievementContentSystem'
import { ChartPanelSystem } from '../systems/ChartPanelSystem'
import { ClonePowerSystem } from '../systems/ClonePowerSystem'
import { SiegeWarfareSystem } from '../systems/SiegeWarfareSystem'
import { TutorialSystem } from '../systems/TutorialSystem'
import { RenderCullingSystem } from '../systems/RenderCullingSystem'
import { ReputationSystem } from '../systems/ReputationSystem'
import { SiegeSystem } from '../systems/SiegeSystem'
import { DisasterWarningSystem } from '../systems/DisasterWarningSystem'
import { MoodSystem } from '../systems/MoodSystem'
import { WorldAgeSystem } from '../systems/WorldAgeSystem'
import { HelpOverlaySystem } from '../systems/HelpOverlaySystem'
import { BloodMoonSystem } from '../systems/BloodMoonSystem'
import { CreatureAgingSystem } from '../systems/CreatureAgingSystem'
import { ResourceScarcitySystem } from '../systems/ResourceScarcitySystem'
import { LegendaryBattleSystem } from '../systems/LegendaryBattleSystem'
import { WorldBorderSystem } from '../systems/WorldBorderSystem'
import { EnhancedTooltipSystem } from '../systems/EnhancedTooltipSystem'
import { NavalCombatSystem } from '../systems/NavalCombatSystem'
import { ReligionSpreadSystem } from '../systems/ReligionSpreadSystem'
import { GeneticDisplaySystem } from '../systems/GeneticDisplaySystem'
import { LODRenderSystem } from '../systems/LODRenderSystem'
import { BuildingVarietySystem } from '../systems/BuildingVarietySystem'
import { HistoryReplaySystem } from '../systems/HistoryReplaySystem'
import { SeasonVisualSystem } from '../systems/SeasonVisualSystem'
import { TradeFleetSystem } from '../systems/TradeFleetSystem'
import { WorldDashboardSystem } from '../systems/WorldDashboardSystem'
import { UnifiedParticleSystem } from '../systems/UnifiedParticleSystem'
import { WeatherParticleSystem } from '../systems/WeatherParticleSystem'
import { DiplomacyVisualSystem } from '../systems/DiplomacyVisualSystem'
import { EventNotificationSystem } from '../systems/EventNotificationSystem'
import { EditorEnhancedSystem } from '../systems/EditorEnhancedSystem'
import { FogOfWarEnhanced } from '../systems/FogOfWarEnhanced'
import { MapGenSystem } from '../systems/MapGenSystem'
import { FlockingSystem } from '../systems/FlockingSystem'
import { AutoSaveSystem } from '../systems/AutoSaveSystem'
import { PerformanceMonitorSystem } from '../systems/PerformanceMonitorSystem'
import { WorldSeedSystem } from '../systems/WorldSeedSystem'
import { KeybindSystem } from '../systems/KeybindSystem'
import { WorldExportSystem } from '../systems/WorldExportSystem'
import { BattleReplaySystem } from '../systems/BattleReplaySystem'
import { EvolutionVisualSystem } from '../systems/EvolutionVisualSystem'
import { AchievementPopupSystem } from '../systems/AchievementPopupSystem'
import { MinimapEnhancedSystem } from '../systems/MinimapEnhancedSystem'
import { AmbientSoundMixer } from '../systems/AmbientSoundMixer'
import { ScreenshotModeSystem } from '../systems/ScreenshotModeSystem'
import { EntitySearchSystem } from '../systems/EntitySearchSystem'
import { WorldStatsOverviewSystem } from '../systems/WorldStatsOverviewSystem'
import { NotificationCenterSystem } from '../systems/NotificationCenterSystem'
import { SandboxSettingsSystem } from '../systems/SandboxSettingsSystem'
import { MiniMapModeSystem } from '../systems/MiniMapModeSystem'
import { CameraBookmarkSystem } from '../systems/CameraBookmarkSystem'
import { EntityInspectorSystem } from '../systems/EntityInspectorSystem'
import { SpeedIndicatorSystem } from '../systems/SpeedIndicatorSystem'
import { AchievementProgressSystem } from '../systems/AchievementProgressSystem'
import { CameraAnimationSystem } from '../systems/CameraAnimationSystem'
import { CityLayoutSystem } from '../systems/CityLayoutSystem'
import { CustomSpeciesSystem } from '../systems/CustomSpeciesSystem'
import { EraTransitionSystem } from '../systems/EraTransitionSystem'
import { MapMarkerSystem } from '../systems/MapMarkerSystem'
import { TerrainDecorationSystem } from '../systems/TerrainDecorationSystem'
import { TimeRewindSystem } from '../systems/TimeRewindSystem'
import { WeatherControlSystem } from '../systems/WeatherControlSystem'
import { WorldEventTimelineSystem } from '../systems/WorldEventTimelineSystem'
import { ResourceFlowSystem } from '../systems/ResourceFlowSystem'
import { CreatureEmotionSystem } from '../systems/CreatureEmotionSystem'
import { PowerFavoriteSystem } from '../systems/PowerFavoriteSystem'
import { WorldHeatmapSystem } from '../systems/WorldHeatmapSystem'
import { ZoneManagementSystem } from '../systems/ZoneManagementSystem'
import { CreatureLineageSystem } from '../systems/CreatureLineageSystem'
import { WorldLawSystem } from '../systems/WorldLawSystem'
import { MiniGameSystem } from '../systems/MiniGameSystem'
import { CinematicModeSystem } from '../systems/CinematicModeSystem'
import { CreatureMemorySystem } from '../systems/CreatureMemorySystem'
import { PollutionSystem } from '../systems/PollutionSystem'
import { ProphecySystem } from '../systems/ProphecySystem'
import { CreatureSkillSystem } from '../systems/CreatureSkillSystem'
import { WorldNarratorSystem } from '../systems/WorldNarratorSystem'
import { MythologySystem } from '../systems/MythologySystem'
import { CreatureTamingSystem } from '../systems/CreatureTamingSystem'
import { PlagueMutationSystem } from '../systems/PlagueMutationSystem'
import { MonumentSystem } from '../systems/MonumentSystem'
import { CreaturePersonalitySystem } from '../systems/CreaturePersonalitySystem'
import { TradeNegotiationSystem } from '../systems/TradeNegotiationSystem'
import { CreatureDreamSystem } from '../systems/CreatureDreamSystem'
import { NaturalDisasterRecoverySystem } from '../systems/NaturalDisasterRecoverySystem'
import { CreatureFameSystem } from '../systems/CreatureFameSystem'
import { WorldMigrationWaveSystem } from '../systems/WorldMigrationWaveSystem'
import { CreatureRivalrySystem } from '../systems/CreatureRivalrySystem'
import { WorldCorruptionSystem } from '../systems/WorldCorruptionSystem'
import { CreatureProfessionSystem } from '../systems/CreatureProfessionSystem'
import { DiplomaticSummitSystem } from '../systems/DiplomaticSummitSystem'
import { WorldLeyLineSystem } from '../systems/WorldLeyLineSystem'
import { CreatureBountySystem } from '../systems/CreatureBountySystem'
import { SeasonFestivalSystem } from '../systems/SeasonFestivalSystem'
import { CreatureMutationSystem } from '../systems/CreatureMutationSystem'
import { DiplomaticMarriageSystem } from '../systems/DiplomaticMarriageSystem'
import { WorldRelicSystem } from '../systems/WorldRelicSystem'
import { CreatureAncestorSystem } from '../systems/CreatureAncestorSystem'
import { WorldAnomalySystem } from '../systems/WorldAnomalySystem'
import { CreatureApprenticeSystem } from '../systems/CreatureApprenticeSystem'
import { DiplomaticSanctionSystem } from '../systems/DiplomaticSanctionSystem'
import { WorldMythicBeastSystem } from '../systems/WorldMythicBeastSystem'
import { CreatureGuildSystem } from '../systems/CreatureGuildSystem'
import { WorldSeasonalDisasterSystem } from '../systems/WorldSeasonalDisasterSystem'
import { CreatureReputationSystem } from '../systems/CreatureReputationSystem'
import { DiplomaticEspionageSystem } from '../systems/DiplomaticEspionageSystem'
import { WorldAncientRuinSystem } from '../systems/WorldAncientRuinSystem'
import { CreatureHobbySystem } from '../systems/CreatureHobbySystem'
import { WorldNaturalWonderSystem } from '../systems/WorldNaturalWonderSystem'
import { CreatureLanguageSystem } from '../systems/CreatureLanguageSystem'
import { DiplomaticTributeSystem } from '../systems/DiplomaticTributeSystem'
import { WorldWeatherFrontSystem } from '../systems/WorldWeatherFrontSystem'
import { CreatureTradeSkillSystem } from '../systems/CreatureTradeSkillSystem'
import { WorldSacredGroveSystem } from '../systems/WorldSacredGroveSystem'
import { CreatureAllianceSystem } from '../systems/CreatureAllianceSystem'
import { DiplomaticPropagandaSystem } from '../systems/DiplomaticPropagandaSystem'
import { WorldTidalSystem } from '../systems/WorldTidalSystem'
import { CreatureSuperstitionSystem } from '../systems/CreatureSuperstitionSystem'
import { WorldMagicStormSystem } from '../systems/WorldMagicStormSystem'
import { CreatureAmbitionSystem } from '../systems/CreatureAmbitionSystem'
import { DiplomaticCouncilSystem } from '../systems/DiplomaticCouncilSystem'
import { WorldFertilitySystem } from '../systems/WorldFertilitySystem'
import { CreatureFashionSystem } from '../systems/CreatureFashionSystem'
import { DiplomaticHostageSystem } from '../systems/DiplomaticHostageSystem'
import { WorldErosionSystem } from '../systems/WorldErosionSystem'
import { CreaturePetSystem } from '../systems/CreaturePetSystem'
import { WorldCrystalFormationSystem } from '../systems/WorldCrystalFormationSystem'
import { CreatureRitualSystem } from '../systems/CreatureRitualSystem'
import { DiplomaticExileSystem } from '../systems/DiplomaticExileSystem'
import { WorldMigrationRouteSystem } from '../systems/WorldMigrationRouteSystem'
import { WorldVolcanicSystem } from '../systems/WorldVolcanicSystem'
import { WorldAcousticSystem } from '../systems/WorldAcousticSystem'
import { CreatureNostalgiaSystem } from '../systems/CreatureNostalgiaSystem'
import { WorldUndergroundSystem } from '../systems/WorldUndergroundSystem'
import { DiplomaticBlockadeSystem } from '../systems/DiplomaticBlockadeSystem'
import { CreatureInventionSystem } from '../systems/CreatureInventionSystem'
import { WorldAuroraSystem } from '../systems/WorldAuroraSystem'
import { CreaturePhobiaSystem } from '../systems/CreaturePhobiaSystem'
import { WorldGeothermalSystem } from '../systems/WorldGeothermalSystem'
import { DiplomaticFederationSystem } from '../systems/DiplomaticFederationSystem'
import { CreatureArtSystem } from '../systems/CreatureArtSystem'
import { WorldMiasmaSystem } from '../systems/WorldMiasmaSystem'
import { CreatureTotemSystem } from '../systems/CreatureTotemSystem'
import { WorldFossilSystem } from '../systems/WorldFossilSystem'
import { DiplomaticSpySystem } from '../systems/DiplomaticSpySystem'
import { CreatureDanceSystem } from '../systems/CreatureDanceSystem'
import { WorldBeaconSystem } from '../systems/WorldBeaconSystem'
import { WorldTectonicSystem } from '../systems/WorldTectonicSystem'
import { CreatureMentorSystem } from '../systems/CreatureMentorSystem'
import { WorldEchoSystem } from '../systems/WorldEchoSystem'
import { CreatureTraumaSystem } from '../systems/CreatureTraumaSystem'
import { WorldOasisSystem } from '../systems/WorldOasisSystem'
import { DiplomaticCeremonySystem } from '../systems/DiplomaticCeremonySystem'
import { CreatureMigrationMemorySystem } from '../systems/CreatureMigrationMemorySystem'
import { WorldPetrificationSystem } from '../systems/WorldPetrificationSystem'
import { WorldMaelstromSystem } from '../systems/WorldMaelstromSystem'
import { CreatureRivalryDuelSystem } from '../systems/CreatureRivalryDuelSystem'
import { WorldCoralReefSystem } from '../systems/WorldCoralReefSystem'
import { WorldSandstormSystem } from '../systems/WorldSandstormSystem'
import { CreatureCollectionSystem } from '../systems/CreatureCollectionSystem'
import { WorldRiftSystem } from '../systems/WorldRiftSystem'
import { CreatureVisionSystem } from '../systems/CreatureVisionSystem'
import { WorldAvalancheSystem } from '../systems/WorldAvalancheSystem'
import { DiplomaticAsylumSystem } from '../systems/DiplomaticAsylumSystem'
import { CreatureForagingSystem } from '../systems/CreatureForagingSystem'
import { WorldWhirlpoolSystem } from '../systems/WorldWhirlpoolSystem'
import { CreatureOathSystem } from '../systems/CreatureOathSystem'
import { WorldAuroraStormSystem } from '../systems/WorldAuroraStormSystem'
import { DiplomaticEmbargoSystem } from '../systems/DiplomaticEmbargoSystem'
import { CreatureLegacySystem } from '../systems/CreatureLegacySystem'
import { WorldMemorialSystem } from '../systems/WorldMemorialSystem'
import { WorldTidePoolSystem } from '../systems/WorldTidePoolSystem'
import { CreatureDivinationSystem } from '../systems/CreatureDivinationSystem'
import { DiplomaticSuccessionSystem } from '../systems/DiplomaticSuccessionSystem'
import { WorldMeteorShowerSystem } from '../systems/WorldMeteorShowerSystem'
import { CreatureBeastMasterSystem } from '../systems/CreatureBeastMasterSystem'
import { WorldGlacierSystem } from '../systems/WorldGlacierSystem'
import { CreatureRumorSystem } from '../systems/CreatureRumorSystem'
import { DiplomaticTradeAgreementSystem } from '../systems/DiplomaticTradeAgreementSystem'
import { WorldPurificationSystem } from '../systems/WorldPurificationSystem'
import { CreatureNightWatchSystem } from '../systems/CreatureNightWatchSystem'
import { CreatureBarterSystem } from '../systems/CreatureBarterSystem'
import { WorldGeyserSystem } from '../systems/WorldGeyserSystem'
import { WorldQuicksandSystem } from '../systems/WorldQuicksandSystem'
import { CreatureIntuitionSystem } from '../systems/CreatureIntuitionSystem'
import { WorldCometSystem } from '../systems/WorldCometSystem'
import { CreatureExileSystem } from '../systems/CreatureExileSystem'
import { WorldHotSpringSystem } from '../systems/WorldHotSpringSystem'
import { CreatureNicknameSystem } from '../systems/CreatureNicknameSystem'
import { WorldEclipseSystem } from '../systems/WorldEclipseSystem'
import { CreatureGrudgeSystem } from '../systems/CreatureGrudgeSystem'
import { WorldSinkholeSystem } from '../systems/WorldSinkholeSystem'
import { DiplomaticCensusSystem } from '../systems/DiplomaticCensusSystem'
import { CreatureSleepwalkSystem } from '../systems/CreatureSleepwalkSystem'
import { WorldRainbowSystem } from '../systems/WorldRainbowSystem'
import { CreatureTattooSystem } from '../systems/CreatureTattooSystem'
import { WorldDustStormSystem } from '../systems/WorldDustStormSystem'
import { DiplomaticWarReparationSystem } from '../systems/DiplomaticWarReparationSystem'
import { CreatureClaustrophobiaSystem } from '../systems/CreatureClaustrophobiaSystem'
import { WorldBioluminescenceSystem } from '../systems/WorldBioluminescenceSystem'
import { CreaturePilgrimageSystem } from '../systems/CreaturePilgrimageSystem'
import { WorldPermafrostSystem } from '../systems/WorldPermafrostSystem'
import { DiplomaticCulturalExchangeSystem } from '../systems/DiplomaticCulturalExchangeSystem'
import { CreatureSomniloquySystem } from '../systems/CreatureSomniloquySystem'
import { WorldTidalWaveSystem } from '../systems/WorldTidalWaveSystem'
import { CreatureOmenBeliefSystem } from '../systems/CreatureOmenBeliefSystem'
import { WorldMudslideSystem } from '../systems/WorldMudslideSystem'
import { DiplomaticPledgeSystem } from '../systems/DiplomaticPledgeSystem'
import { CreatureAmbidextritySystem } from '../systems/CreatureAmbidextritySystem'
import { WorldKelpForestSystem } from '../systems/WorldKelpForestSystem'
import { CreatureHandicraftSystem } from '../systems/CreatureHandicraftSystem'
import { WorldGeothermalVentSystem } from '../systems/WorldGeothermalVentSystem'
import { DiplomaticTariffSystem } from '../systems/DiplomaticTariffSystem'
import { CreatureHomesicknessSystem } from '../systems/CreatureHomesicknessSystem'
import { WorldMirageSystem } from '../systems/WorldMirageSystem'
import { CreatureLullabySystem } from '../systems/CreatureLullabySystem'
import { DiplomaticMediationSystem } from '../systems/DiplomaticMediationSystem'
import { CreatureCalligraphySystem } from '../systems/CreatureCalligraphySystem'
import { WorldFogBankSystem } from '../systems/WorldFogBankSystem'
import { CreatureFermentationSystem } from '../systems/CreatureFermentationSystem'
import { CreatureVentriloquismSystem } from '../systems/CreatureVentriloquismSystem'
import { WorldDustDevilSystem } from '../systems/WorldDustDevilSystem'
import { CreaturePotterySystem } from '../systems/CreaturePotterySystem'
import { WorldMangroveSystem } from '../systems/WorldMangroveSystem'
import { DiplomaticPeaceTreatySystem } from '../systems/DiplomaticPeaceTreatySystem'
import { CreatureEcholocationSystem } from '../systems/CreatureEcholocationSystem'
import { WorldBallLightningSystem } from '../systems/WorldBallLightningSystem'
import { CreatureWeavingSystem } from '../systems/CreatureWeavingSystem'
import { WorldCrystalCaveSystem } from '../systems/WorldCrystalCaveSystem'
import { DiplomaticTradeSanctionSystem } from '../systems/DiplomaticTradeSanctionSystem'
import { CreatureMimicrySystem } from '../systems/CreatureMimicrySystem'
import { WorldWaterspoutSystem } from '../systems/WorldWaterspoutSystem'
import { CreatureBeekeepingSystem } from '../systems/CreatureBeekeepingSystem'
import { WorldVolcanicIslandSystem } from '../systems/WorldVolcanicIslandSystem'
import { DiplomaticTradeGuildSystem } from '../systems/DiplomaticTradeGuildSystem'
import { CreatureTelepathySystem } from '../systems/CreatureTelepathySystem'
import { CreatureGlassblowingSystem } from '../systems/CreatureGlassblowingSystem'
import { WorldUndergroundRiverSystem } from '../systems/WorldUndergroundRiverSystem'
import { DiplomaticNavalBlockadeSystem } from '../systems/DiplomaticNavalBlockadeSystem'
import { CreaturePremonitionSystem } from '../systems/CreaturePremonitionSystem'
import { CreatureHerbalismSystem } from '../systems/CreatureHerbalismSystem'
import { WorldFloatingIslandSystem } from '../systems/WorldFloatingIslandSystem'
import { CreatureCartographySystem } from '../systems/CreatureCartographySystem'
import { CreatureShapeshiftingSystem } from '../systems/CreatureShapeshiftingSystem'
import { WorldWhirlwindSystem } from '../systems/WorldWhirlwindSystem'
import { CreatureRunecraftingSystem } from '../systems/CreatureRunecraftingSystem'
import { CreatureAstrologySystem } from '../systems/CreatureAstrologySystem'
import { CreatureSummoningSystem } from '../systems/CreatureSummoningSystem'
import { CreatureAlchemySystem } from '../systems/CreatureAlchemySystem'
import { CreatureEnchantingSystem } from '../systems/CreatureEnchantingSystem'
import { WorldGeyserFieldSystem } from '../systems/WorldGeyserFieldSystem'
import { CreatureBardSystem } from '../systems/CreatureBardSystem'
import { WorldNorthernLightsSystem } from '../systems/WorldNorthernLightsSystem'
import { WorldMossGrowthSystem } from '../systems/WorldMossGrowthSystem'
import { WorldIrrigationSystem } from '../systems/WorldIrrigationSystem'
import { CreatureConstellationSystem } from '../systems/CreatureConstellationSystem'
import { CreatureScribeSystem } from '../systems/CreatureScribeSystem'
import { WorldLighthouseSystem } from '../systems/WorldLighthouseSystem'
import { CreatureMasonrySystem } from '../systems/CreatureMasonrySystem'
import { WorldTidewaterSystem } from '../systems/WorldTidewaterSystem'
import { CreatureOrigamiSystem } from '../systems/CreatureOrigamiSystem'
import { WorldLabyrinthSystem } from '../systems/WorldLabyrinthSystem'
import { CreatureFalconrySystem } from '../systems/CreatureFalconrySystem'
import { CreatureApiarySystem } from '../systems/CreatureApiarySystem'
import { WorldTerracingSystem } from '../systems/WorldTerracingSystem'
import { CreatureCourierSystem } from '../systems/CreatureCourierSystem'
import { CreatureMosaicSystem } from '../systems/CreatureMosaicSystem'
import { WorldSundialSystem } from '../systems/WorldSundialSystem'
import { WorldAqueductSystem } from '../systems/WorldAqueductSystem'
import { CreatureTattoistSystem } from '../systems/CreatureTattoistSystem'
import { WorldGeoglyphSystem } from '../systems/WorldGeoglyphSystem'
import { CreatureHeraldSystem } from '../systems/CreatureHeraldSystem'
import { CreaturePuppeteerSystem } from '../systems/CreaturePuppeteerSystem'
import { WorldObsidianSystem } from '../systems/WorldObsidianSystem'
import { CreatureRangerSystem } from '../systems/CreatureRangerSystem'
import { WorldCoralReefGrowthSystem } from '../systems/WorldCoralReefGrowthSystem'
import { CreatureRunnerSystem } from '../systems/CreatureRunnerSystem'
import { CreatureJesterSystem } from '../systems/CreatureJesterSystem'
import { WorldPetrifiedForestSystem } from '../systems/WorldPetrifiedForestSystem'
import { CreatureNomadSystem } from '../systems/CreatureNomadSystem'
import { WorldStalactiteSystem } from '../systems/WorldStalactiteSystem'
import { CreatureChroniclerSystem } from '../systems/CreatureChroniclerSystem'
import { CreatureFirewalkerSystem } from '../systems/CreatureFirewalkerSystem'
import { DiplomaticHostageExchangeSystem } from '../systems/DiplomaticHostageExchangeSystem'
import { WorldFrostbiteSystem } from '../systems/WorldFrostbiteSystem'
import { CreatureOracleSystem } from '../systems/CreatureOracleSystem'
import { WorldCoralBleachingSystem } from '../systems/WorldCoralBleachingSystem'
import { CreatureBlacksmithSystem } from '../systems/CreatureBlacksmithSystem'
import { CreatureDowserSystem } from '../systems/CreatureDowserSystem'
import { WorldMagneticFieldSystem } from '../systems/WorldMagneticFieldSystem'
import { CreatureCheeseAgerSystem } from '../systems/CreatureCheeseAgerSystem'
import { WorldSinkholePrevSystem } from '../systems/WorldSinkholePrevSystem'
import { DiplomaticRansomSystem } from '../systems/DiplomaticRansomSystem'
import { CreatureSoapMakerSystem } from '../systems/CreatureSoapMakerSystem'
import { WorldDewFormationSystem } from '../systems/WorldDewFormationSystem'
import { CreatureGamblerSystem } from '../systems/CreatureGamblerSystem'
import { WorldSandDuneSystem } from '../systems/WorldSandDuneSystem'
import { DiplomaticWarReparationsSystem } from '../systems/DiplomaticWarReparationsSystem'
import { CreatureGladiatorSystem } from '../systems/CreatureGladiatorSystem'
import { WorldTideFlatSystem } from '../systems/WorldTideFlatSystem'
import { CreatureMushroomForagerSystem } from '../systems/CreatureMushroomForagerSystem'
import { WorldIceSheetSystem } from '../systems/WorldIceSheetSystem'
import { DiplomaticNonAggressionSystem } from '../systems/DiplomaticNonAggressionSystem'
import { CreatureTrapperSystem } from '../systems/CreatureTrapperSystem'
import { WorldCoralSpawningSystem } from '../systems/WorldCoralSpawningSystem'
import { CreatureAstronomerSystem } from '../systems/CreatureAstronomerSystem'
import { WorldThermalVentSystem } from '../systems/WorldThermalVentSystem'
import { DiplomaticArmisticSystem } from '../systems/DiplomaticArmisticSystem'
import { CreatureWeaverSystem } from '../systems/CreatureWeaverSystem'
import { CreatureHerbalistSystem } from '../systems/CreatureHerbalistSystem'
import { CreatureSentinelSystem } from '../systems/CreatureSentinelSystem'
import { WorldPeatBogSystem } from '../systems/WorldPeatBogSystem'
import { CreatureBeekeeperSystem } from '../systems/CreatureBeekeeperSystem'
import { WorldAtollSystem } from '../systems/WorldAtollSystem'
import { CreatureLamplighterSystem } from '../systems/CreatureLamplighterSystem'
import { DiplomaticCeasefireSystem } from '../systems/DiplomaticCeasefireSystem'
import { CreaturePerfumerSystem } from '../systems/CreaturePerfumerSystem'
import { WorldCoralNurserySystem } from '../systems/WorldCoralNurserySystem'
import { CreatureGlazierSystem } from '../systems/CreatureGlazierSystem'
import { WorldMudVolcanoSystem } from '../systems/WorldMudVolcanoSystem'
import { DiplomaticProtectorateSystem } from '../systems/DiplomaticProtectorateSystem'
import { CreatureGondolierSystem } from '../systems/CreatureGondolierSystem'
import { WorldFungalNetworkSystem } from '../systems/WorldFungalNetworkSystem'
import { CreatureCooperSystem } from '../systems/CreatureCooperSystem'
import { WorldSaltMarshSystem } from '../systems/WorldSaltMarshSystem'
import { DiplomaticConfederationSystem } from '../systems/DiplomaticConfederationSystem'
import { CreatureChandlerSystem } from '../systems/CreatureChandlerSystem'
import { WorldFrostHollowSystem } from '../systems/WorldFrostHollowSystem'
import { CreatureTinkerSystem } from '../systems/CreatureTinkerSystem'
import { WorldBasaltColumnSystem } from '../systems/WorldBasaltColumnSystem'
import { CreatureFletcherSystem } from '../systems/CreatureFletcherSystem'
import { WorldMangroveSwampSystem } from '../systems/WorldMangroveSwampSystem'
import { CreatureWheelwrightSystem } from '../systems/CreatureWheelwrightSystem'
import { WorldObsidianFieldSystem } from '../systems/WorldObsidianFieldSystem'
import { CreatureFalconerSystem } from '../systems/CreatureFalconerSystem'
import { CreatureEngraverSystem } from '../systems/CreatureEngraverSystem'
import { WorldLavaTubeSystem } from '../systems/WorldLavaTubeSystem'
import { CreatureTannerSystem } from '../systems/CreatureTannerSystem'
import { WorldBioluminescentBaySystem } from '../systems/WorldBioluminescentBaySystem'
import { CreatureCartographerSystem } from '../systems/CreatureCartographerSystem'
import { WorldPumiceFieldSystem } from '../systems/WorldPumiceFieldSystem'
import { DiplomaticTribunalSystem } from '../systems/DiplomaticTribunalSystem'
import { CreatureRopeMakerSystem } from '../systems/CreatureRopeMakerSystem'
import { WorldSandstoneArchSystem } from '../systems/WorldSandstoneArchSystem'
import { CreatureVintnerSystem } from '../systems/CreatureVintnerSystem'
import { WorldFumaroleFieldSystem } from '../systems/WorldFumaroleFieldSystem'
import { DiplomaticAmnestySystem } from '../systems/DiplomaticAmnestySystem'
import { CreatureShipwrightSystem } from '../systems/CreatureShipwrightSystem'
import { WorldCloudForestSystem } from '../systems/WorldCloudForestSystem'
import { CreatureDyerSystem } from '../systems/CreatureDyerSystem'
import { WorldTravertineTerraceSystem } from '../systems/WorldTravertineTerraceSystem'
import { DiplomaticArbitrationSystem } from '../systems/DiplomaticArbitrationSystem'
import { CreatureLapidarySystem } from '../systems/CreatureLapidarySystem'
import { WorldBlackSandBeachSystem } from '../systems/WorldBlackSandBeachSystem'
import { CreatureLocksmithSystem } from '../systems/CreatureLocksmithSystem'
import { WorldIceCaveSystem } from '../systems/WorldIceCaveSystem'
import { DiplomaticPlebisciteSystem } from '../systems/DiplomaticPlebisciteSystem'
import { CreatureRugmakerSystem } from '../systems/CreatureRugmakerSystem'
import { WorldTidalLagoonSystem } from '../systems/WorldTidalLagoonSystem'
import { CreatureSaddlerSystem } from '../systems/CreatureSaddlerSystem'
import { WorldIceShelfSystem } from '../systems/WorldIceShelfSystem'
import { DiplomaticReferendumSystem } from '../systems/DiplomaticReferendumSystem'
import { CreatureBookbinderSystem } from '../systems/CreatureBookbinderSystem'
import { WorldSeaStackSystem } from '../systems/WorldSeaStackSystem'
import { CreatureFarrierSystem } from '../systems/CreatureFarrierSystem'
import { WorldPermafrostThawSystem } from '../systems/WorldPermafrostThawSystem'
import { DiplomaticRatificationSystem } from '../systems/DiplomaticRatificationSystem'
import { CreatureFullerSystem } from '../systems/CreatureFullerSystem'
import { WorldBarrierIslandSystem } from '../systems/WorldBarrierIslandSystem'
import { CreatureSawyerSystem } from '../systems/CreatureSawyerSystem'
import { WorldVolcanicAshPlainSystem } from '../systems/WorldVolcanicAshPlainSystem'
import { DiplomaticAdjudicationSystem } from '../systems/DiplomaticAdjudicationSystem'
import { CreatureGildersSystem } from '../systems/CreatureGildersSystem'
import { CreatureCoopersSystem } from '../systems/CreatureCoopersSystem'
import { WorldMudFlatSystem } from '../systems/WorldMudFlatSystem'
import { CreatureThatchersSystem } from '../systems/CreatureThatchersSystem'
import { WorldCoralAtollSystem } from '../systems/WorldCoralAtollSystem'
import { CreatureChandlersSystem } from '../systems/CreatureChandlersSystem'
import { WorldGeothermalSpringSystem } from '../systems/WorldGeothermalSpringSystem'
import { DiplomaticConciliationSystem } from '../systems/DiplomaticConciliationSystem'
import { CreatureGlazersSystem } from '../systems/CreatureGlazersSystem'
import { WorldSinkholePlainSystem } from '../systems/WorldSinkholePlainSystem'
import { CreaturePlasterersSystem } from '../systems/CreaturePlasterersSystem'
import { DiplomaticArbitrationTreatySystem } from '../systems/DiplomaticArbitrationTreatySystem'
import { CreatureEngraversSystem } from '../systems/CreatureEngraversSystem'
import { WorldMangroveDeltaSystem } from '../systems/WorldMangroveDeltaSystem'
import { CreatureWheelwrightsSystem } from '../systems/CreatureWheelwrightsSystem'
import { WorldSaltFlatSystem } from '../systems/WorldSaltFlatSystem'
import { DiplomaticExtraditionSystem } from '../systems/DiplomaticExtraditionSystem'
import { CreaturePerfumersSystem } from '../systems/CreaturePerfumersSystem'
import { WorldObsidianFlowSystem } from '../systems/WorldObsidianFlowSystem'
import { CreatureCobblersSystem } from '../systems/CreatureCobblerSystem'
import { WorldTidalMarshSystem } from '../systems/WorldTidalMarshSystem'
import { DiplomaticSovereigntySystem } from '../systems/DiplomaticSovereigntySystem'
import { CreatureAssayersSystem } from '../systems/CreatureAssayersSystem'
import { WorldKarstTowerSystem } from '../systems/WorldKarstTowerSystem'
import { CreatureFletchersSystem } from '../systems/CreatureFletchersSystem'
import { WorldAlluvialFanSystem } from '../systems/WorldAlluvialFanSystem'
import { DiplomaticReparationSystem } from '../systems/DiplomaticReparationSystem'
import { CreatureWainwrightsSystem } from '../systems/CreatureWainwrightsSystem'
import { WorldBayouSystem } from '../systems/WorldBayouSystem'
import { CreatureCuriersSystem } from '../systems/CreatureCuriersSystem'
import { WorldCinderConeSystem } from '../systems/WorldCinderConeSystem'
import { DiplomaticRestitutionSystem } from '../systems/DiplomaticRestitutionSystem'
import { CreatureHornersSystem } from '../systems/CreatureHornersSystem'
import { WorldFjordSystem } from '../systems/WorldFjordSystem'
import { CreatureNailersSystem } from '../systems/CreatureNailersSystem'
import { WorldBadlandsSystem } from '../systems/WorldBadlandsSystem'
import { DiplomaticIndemnitySystem } from '../systems/DiplomaticIndemnitySystem'
import { CreatureReedCuttersSystem } from '../systems/CreatureReedCuttersSystem'
import { WorldMesaSystem } from '../systems/WorldMesaSystem'
import { CreaturePottersSystem } from '../systems/CreaturePottersSystem'
import { DiplomaticAnnexationSystem } from '../systems/DiplomaticAnnexationSystem'
import { CreatureRopeMakersSystem } from '../systems/CreatureRopeMakersSystem'
import { WorldButtesSystem } from '../systems/WorldButtesSystem'
import { CreatureBellFoundersSystem } from '../systems/CreatureBellFoundersSystem'
import { WorldCanyonSystem } from '../systems/WorldCanyonSystem'
import { DiplomaticSecessionSystem } from '../systems/DiplomaticSecessionSystem'
import { CreatureQuarrymenSystem } from '../systems/CreatureQuarrymenSystem'
import { WorldArchipelagoSystem } from '../systems/WorldArchipelagoSystem'
import { CreatureFeltersSystem } from '../systems/CreatureFeltersSystem'
import { WorldRiftValleySystem } from '../systems/WorldRiftValleySystem'
import { CreatureLimeburnersSystem } from '../systems/CreatureLimeburnersSystem'
import { WorldCalderaSystem } from '../systems/WorldCalderaSystem'
import { CreatureWheelersSystem } from '../systems/CreatureWheelersSystem'
import { WorldEscarpmentSystem } from '../systems/WorldEscarpmentSystem'
import { DiplomaticNeutralizationSystem } from '../systems/DiplomaticNeutralizationSystem'
import { CreatureSieveMakersSystem } from '../systems/CreatureSieveMakersSystem'
import { WorldPlainsSystem } from '../systems/WorldPlainsSystem'
import { CreatureBroomMakersSystem } from '../systems/CreatureBroomMakersSystem'
import { WorldSpireSystem } from '../systems/WorldSpireSystem'
import { CreatureCharcoalBurnersSystem } from '../systems/CreatureCharcoalBurnersSystem'
import { WorldGrottoSystem } from '../systems/WorldGrottoSystem'
import { CreatureTinsmithsSystem } from '../systems/CreatureTinsmithsSystem'
import { WorldPinnacleSystem } from '../systems/WorldPinnacleSystem'
import { CreatureBasketWeaversSystem } from '../systems/CreatureBasketWeaversSystem'
import { WorldHoodooSystem } from '../systems/WorldHoodooSystem'
import { CreatureSoapMakersSystem } from '../systems/CreatureSoapMakersSystem'
import { WorldCenoteSystem } from '../systems/WorldCenoteSystem'
import { CreatureGlassblowersSystem } from '../systems/CreatureGlassblowersSystem'
import { WorldMoraineSystem } from '../systems/WorldMoraineSystem'
import { DiplomaticCoexistenceSystem } from '../systems/DiplomaticCoexistenceSystem'
import { CreatureParchmentMakersSystem } from '../systems/CreatureParchmentMakersSystem'
import { WorldBlowholeSystem } from '../systems/WorldBlowholeSystem'
import { DiplomaticReunificationSystem } from '../systems/DiplomaticReunificationSystem'
import { CreatureDyersSystem } from '../systems/CreatureDyersSystem'
import { WorldDrumlinSystem } from '../systems/WorldDrumlinSystem'
import { DiplomaticNonInterventionSystem } from '../systems/DiplomaticNonInterventionSystem'
import { CreatureHarnessMakersSystem } from '../systems/CreatureHarnessMakersSystem'
import { WorldKettleHoleSystem } from '../systems/WorldKettleHoleSystem'
import { DiplomaticReconciliationSystem } from '../systems/DiplomaticReconciliationSystem'
import { CreatureVinegarMakersSystem } from '../systems/CreatureVinegarMakersSystem'
import { WorldNunatakSystem } from '../systems/WorldNunatakSystem'
import { DiplomaticDisarmamentSystem } from '../systems/DiplomaticDisarmamentSystem'
import { WorldCirqueSystem } from '../systems/WorldCirqueSystem'
import { CreatureLaceMakersSystem } from '../systems/CreatureLaceMakersSystem'
import { WorldArroyoSystem } from '../systems/WorldArroyoSystem'
import { CreatureFurriersSystem } from '../systems/CreatureFurriersSystem'
import { WorldCouleeSystem } from '../systems/WorldCouleeSystem'
import { DiplomaticDetenteSystem } from '../systems/DiplomaticDetenteSystem'
import { WorldDeltaSystem } from '../systems/WorldDeltaSystem'
import { DiplomaticRapprochementSystem } from '../systems/DiplomaticRapprochementSystem'
import { CreatureBookbindersSystem } from '../systems/CreatureBookbindersSystem'
import { WorldEstuarySystem } from '../systems/WorldEstuarySystem'
import { CreatureEnamelersSystem } from '../systems/CreatureEnamelersSystem'
import { WorldWadiSystem } from '../systems/WorldWadiSystem'
import { CreatureUpholsterersSystem } from '../systems/CreatureUpholsterersSystem'
import { WorldPeneplainSystem } from '../systems/WorldPeneplainSystem'
import { DiplomaticAppeasementSystem } from '../systems/DiplomaticAppeasementSystem'
import { CreatureCalderersSystem } from '../systems/CreatureCalderersSystem'
import { WorldRavineSystem } from '../systems/WorldRavineSystem'
import { DiplomaticEntenteSystem } from '../systems/DiplomaticEntenteSystem'
import { CreatureScrivenersSystem } from '../systems/CreatureScrivenersSystem'
import { WorldInselbergSystem } from '../systems/WorldInselbergSystem'
import { DiplomaticAccordSystem } from '../systems/DiplomaticAccordSystem'
import { CreatureIlluminatorsSystem } from '../systems/CreatureIlluminatorsSystem'
import { WorldGorgeSystem } from '../systems/WorldGorgeSystem'
import { DiplomaticConcordSystem } from '../systems/DiplomaticConcordSystem'
import { CreatureBellMakersSystem } from '../systems/CreatureBellMakersSystem'
import { WorldPlayaSystem } from '../systems/WorldPlayaSystem'
import { DiplomaticNeutralitySystem } from '../systems/DiplomaticNeutralitySystem'
import { CreatureCombMakersSystem } from '../systems/CreatureCombMakersSystem'
import { WorldPedimentSystem } from '../systems/WorldPedimentSystem'
import { DiplomaticSolidaritySystem } from '../systems/DiplomaticSolidaritySystem'
import { CreatureNailSmithsSystem } from '../systems/CreatureNailSmithsSystem'
import { WorldHogbackSystem } from '../systems/WorldHogbackSystem'
import { DiplomaticReciprocitySystem } from '../systems/DiplomaticReciprocitySystem'
import { CreaturePinMakersSystem } from '../systems/CreaturePinMakersSystem'
import { WorldCuestaSystem } from '../systems/WorldCuestaSystem'
import { DiplomaticBenevolenceSystem } from '../systems/DiplomaticBenevolenceSystem'
import { CreatureThimbleMakersSystem } from '../systems/CreatureThimbleMakersSystem'
import { WorldFlatironSystem } from '../systems/WorldFlatironSystem'
import { DiplomaticClemencySystem } from '../systems/DiplomaticClemencySystem'
import { CreatureAwlMakersSystem } from '../systems/CreatureAwlMakersSystem'
import { WorldTepuiSystem } from '../systems/WorldTepuiSystem'
import { DiplomaticMagnanimitySystem } from '../systems/DiplomaticMagnanimitySystem'
import { CreatureBuckleMakersSystem } from '../systems/CreatureBuckleMakersSystem'
import { WorldYardangSystem } from '../systems/WorldYardangSystem'
import { DiplomaticForbearanceSystem } from '../systems/DiplomaticForbearanceSystem'
import { CreatureClaspMakersSystem } from '../systems/CreatureClaspMakersSystem'
import { WorldVentifactSystem } from '../systems/WorldVentifactSystem'
import { DiplomaticLenitySystem } from '../systems/DiplomaticLenitySystem'
import { CreatureRivetMakersSystem } from '../systems/CreatureRivetMakersSystem'
import { WorldDreikanterSystem } from '../systems/WorldDreikanterSystem'
import { DiplomaticAbsolutionSystem } from '../systems/DiplomaticAbsolutionSystem'
import { CreatureFerruleMakersSystem } from '../systems/CreatureFerruleMakersSystem'
import { WorldDeflationHollowSystem } from '../systems/WorldDeflationHollowSystem'
import { DiplomaticExonerationSystem } from '../systems/DiplomaticExonerationSystem'
import { CreatureGrommetMakersSystem } from '../systems/CreatureGrommetMakersSystem'
import { WorldZeugenSystem } from '../systems/WorldZeugenSystem'
import { DiplomaticReprieveSystem } from '../systems/DiplomaticReprieveSystem'
import { CreatureBobbinMakersSystem } from '../systems/CreatureBobbinMakersSystem'
import { WorldInlierSystem } from '../systems/WorldInlierSystem'
import { DiplomaticDispensationSystem } from '../systems/DiplomaticDispensationSystem'
import { CreatureSpindleMakersSystem } from '../systems/CreatureSpindleMakersSystem'
import { WorldOutlierSystem } from '../systems/WorldOutlierSystem'
import { DiplomaticRemissionSystem } from '../systems/DiplomaticRemissionSystem'
import { CreatureShuttleMakersSystem } from '../systems/CreatureShuttleMakersSystem'
import { WorldTafoniSystem } from '../systems/WorldTafoniSystem'
import { DiplomaticAcquittalSystem } from '../systems/DiplomaticAcquittalSystem'
import { CreatureBobbinLaceMakersSystem } from '../systems/CreatureBobbinLaceMakersSystem'
import { WorldRockPedestalSystem } from '../systems/WorldRockPedestalSystem'
import { DiplomaticImmunitySystem } from '../systems/DiplomaticImmunitySystem'
import { CreatureTattingMakersSystem } from '../systems/CreatureTattingMakersSystem'
import { WorldBalancingRockSystem } from '../systems/WorldBalancingRockSystem'
import { DiplomaticIndulgenceSystem } from '../systems/DiplomaticIndulgenceSystem'
import { CreatureNettingMakersSystem } from '../systems/CreatureNettingMakersSystem'
import { WorldFairyChimneySystem } from '../systems/WorldFairyChimneySystem'
import { DiplomaticCommutationSystem } from '../systems/DiplomaticCommutationSystem'
import { CreatureFringeMakersSystem } from '../systems/CreatureFringeMakersSystem'
import { WorldStoneArchSystem } from '../systems/WorldStoneArchSystem'
import { DiplomaticMitigationSystem } from '../systems/DiplomaticMitigationSystem'
import { CreatureTasselMakersSystem } from '../systems/CreatureTasselMakersSystem'
import { WorldRockBridgeSystem } from '../systems/WorldRockBridgeSystem'
import { DiplomaticCondonationSystem } from '../systems/DiplomaticCondonationSystem'
import { CreatureBraidMakersSystem } from '../systems/CreatureBraidMakersSystem'
import { WorldStoneWindowSystem } from '../systems/WorldStoneWindowSystem'
import { DiplomaticVindicationSystem } from '../systems/DiplomaticVindicationSystem'
import { CreatureMacrameMakersSystem } from '../systems/CreatureMacrameMakersSystem'
import { WorldRockPillarSystem } from '../systems/WorldRockPillarSystem'
import { DiplomaticRehabilitationSystem } from '../systems/DiplomaticRehabilitationSystem'
import { CreatureQuiltingMakersSystem } from '../systems/CreatureQuiltingMakersSystem'
import { CreatureEmbroideryMakersSystem } from '../systems/CreatureEmbroideryMakersSystem'
import { WorldBlowhole2System } from '../systems/WorldBlowhole2System'
import { CreatureAppliqueMakersSystem } from '../systems/CreatureAppliqueMakersSystem'
import { WorldRockShelterSystem } from '../systems/WorldRockShelterSystem'
import { DiplomaticReconciliation2System } from '../systems/DiplomaticReconciliation2System'
import { CreatureSmockingMakersSystem } from '../systems/CreatureSmockingMakersSystem'
import { WorldNaturalTunnelSystem } from '../systems/WorldNaturalTunnelSystem'
import { DiplomaticAtonementSystem } from '../systems/DiplomaticAtonementSystem'
import { CreatureCrochetMakersSystem } from '../systems/CreatureCrochetMakersSystem'
import { WorldRockArch2System } from '../systems/WorldRockArch2System'
import { DiplomaticAbsolution2System } from '../systems/DiplomaticAbsolution2System'
import { CreatureFeltingMakersSystem } from '../systems/CreatureFeltingMakersSystem'
import { WorldSeaCaveSystem } from '../systems/WorldSeaCaveSystem'
import { DiplomaticAmnesty2System } from '../systems/DiplomaticAmnesty2System'
import { CreatureBobbinLace2MakersSystem } from '../systems/CreatureBobbinLace2MakersSystem'
import { WorldKarstSpringSystem } from '../systems/WorldKarstSpringSystem'
import { DiplomaticClemency2System } from '../systems/DiplomaticClemency2System'
import { CreatureWeavingMakersSystem } from '../systems/CreatureWeavingMakersSystem'
import { WorldSinkhole2System } from '../systems/WorldSinkhole2System'
import { DiplomaticPardonSystem } from '../systems/DiplomaticPardonSystem'
import { CreatureDyeingMakersSystem } from '../systems/CreatureDyeingMakersSystem'
import { DiplomaticArbitration2System } from '../systems/DiplomaticArbitration2System'
import { CreatureKnittingMakersSystem } from '../systems/CreatureKnittingMakersSystem'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import { WorldFumaroleSystem } from '../systems/WorldFumaroleSystem'
import { CreatureSpinningMakersSystem } from '../systems/CreatureSpinningMakersSystem'
import { CreatureLoomMakersSystem } from '../systems/CreatureLoomMakersSystem'
import { WorldHotSpring2System } from '../systems/WorldHotSpringSystem2'
import { WorldSolfataraSystem } from '../systems/WorldSolfataraSystem'
import { DiplomaticIntercessionSystem } from '../systems/DiplomaticIntercessionSystem'
import { CreatureNeedleworkMakersSystem } from '../systems/CreatureNeedleworkMakersSystem'
import { WorldMaarSystem } from '../systems/WorldMaaSystem'
import { DiplomaticArbitrementSystem } from '../systems/DiplomaticArbitrementSystem'
import { CreatureWarpingMakersSystem } from '../systems/CreatureWarpingMakersSystem'
import { DiplomaticCompromiseSystem } from '../systems/DiplomaticCompromiseSystem'
import { CreatureBobbinWinderSystem } from '../systems/CreatureBobbinWinderSystem'
import { DiplomaticDetente2System } from '../systems/DiplomaticDetente2System'
import { CreatureCardingMakersSystem } from '../systems/CreatureCardingMakersSystem'
import { WorldLaharSystem } from '../systems/WorldLaharSystem'
import { CreatureFullingMakersSystem } from '../systems/CreatureFullingMakersSystem'
import { WorldPyroclasticFlowSystem } from '../systems/WorldPyroclasticFlowSystem'
import { DiplomaticEntente2System } from '../systems/DiplomaticEntente2System'
import { CreatureTatamiMakersSystem } from '../systems/CreatureTatamiMakersSystem'
import { WorldPhreaticExplosionSystem } from '../systems/WorldPhreaticExplosionSystem'
import { DiplomaticAccommodationSystem } from '../systems/DiplomaticAccommodationSystem'
import { CreatureSilkWeaverSystem } from '../systems/CreatureSilkWeaverSystem'
import { DiplomaticConcordatSystem } from '../systems/DiplomaticConcordatSystem'
import { WorldMudPotSystem } from '../systems/WorldMudPotSystem'
import { CreaturePotterSystem } from '../systems/CreaturePotterSystem'
import { WorldSteamVentSystem } from '../systems/WorldSteamVentSystem'
import { CreatureBasketWeaverSystem } from '../systems/CreatureBasketWeaverSystem'
import { WorldTravertineSystem } from '../systems/WorldTravertineSystem'
import { DiplomaticMutualAidSystem } from '../systems/DiplomaticMutualAidSystem'
import { WorldGeyseriteSystem } from '../systems/WorldGeyseriteSystem'
import { WorldSinterSystem } from '../systems/WorldSinterSystem'
import { CreatureHornworkerSystem } from '../systems/CreatureHornworkerSystem'
import { WorldTufaSystem } from '../systems/WorldTufaSystem'
import { CreatureScabbardMakerSystem } from '../systems/CreatureScabbardMakerSystem'
import { WorldSiliceousSinterSystem } from '../systems/WorldSiliceousSinterSystem'
import { DiplomaticDominionSystem } from '../systems/DiplomaticDominionSystem'
import { CreatureQuiverMakerSystem } from '../systems/CreatureQuiverMakerSystem'
import { WorldHotPoolSystem } from '../systems/WorldHotPoolSystem'
import { DiplomaticCommonwealthSystem } from '../systems/DiplomaticCommonwealthSystem'
import { WorldGeothermalPoolSystem } from '../systems/WorldGeothermalPoolSystem'
import { CreatureStringMakerSystem } from '../systems/CreatureStringMakerSystem'
import { WorldFumarolicFieldSystem } from '../systems/WorldFumarolicFieldSystem'
import { DiplomaticHegemonySystem } from '../systems/DiplomaticHegemonySystem'
import { WorldMineralSpringSystem } from '../systems/WorldMineralSpringSystem'
import { DiplomaticSuzeraintySystem } from '../systems/DiplomaticSuzeraintySystem'
import { CreatureRopeWalkerSystem } from '../systems/CreatureRopeWalkerSystem'
import { WorldThermalSpringSystem } from '../systems/WorldThermalSpringSystem'
import { DiplomaticAutonomySystem } from '../systems/DiplomaticAutonomySystem'
import { CreatureHarnessmakerSystem } from '../systems/CreatureHarnessmakerSystem'
import { WorldSodaSpringSystem } from '../systems/WorldSodaSpringSystem'
import { DiplomaticVassalageSystem } from '../systems/DiplomaticVassalageSystem'
import { WorldArtesianWellSystem } from '../systems/WorldArtesianWellSystem'
import { CreatureBridlemakerSystem } from '../systems/CreatureBridlemakerSystem'
import { WorldChalybeateSpringSystem } from '../systems/WorldChalybeateSpringSystem'
import { DiplomaticImperiumSystem } from '../systems/DiplomaticImperiumSystem'
import { CreatureYokemakerSystem } from '../systems/CreatureYokemakerSystem'
import { WorldSulfurSpringSystem } from '../systems/WorldSulfurSpringSystem'
import { DiplomaticMandateSystem } from '../systems/DiplomaticMandateSystem'
import { CreaturePlowrightSystem } from '../systems/CreaturePlowrightSystem'
import { WorldLithiumSpringSystem } from '../systems/WorldLithiumSpringSystem'
import { DiplomaticRegencySystem } from '../systems/DiplomaticRegencySystem'
import { CreatureAnvilsmithSystem } from '../systems/CreatureAnvilsmithSystem'
import { WorldRadiumSpringSystem } from '../systems/WorldRadiumSpringSystem'
import { DiplomaticStewardshipSystem } from '../systems/DiplomaticStewardshipSystem'
import { CreatureToolsmithSystem } from '../systems/CreatureToolsmithSystem'
import { WorldBorateSpringSystem } from '../systems/WorldBorateSpringSystem'
import { DiplomaticCustodianshipSystem } from '../systems/DiplomaticCustodianshipSystem'
import { CreatureNailsmithSystem } from '../systems/CreatureNailsmithSystem'
import { WorldSeleniumSpringSystem } from '../systems/WorldSeleniumSpringSystem'
import { DiplomaticTrusteeshipSystem } from '../systems/DiplomaticTrusteeshipSystem'
import { WorldMagnesiumSpringSystem } from '../systems/WorldMagnesiumSpringSystem'
import { DiplomaticGuardianshipSystem } from '../systems/DiplomaticGuardianshipSystem'
import { CreatureChainmakerSystem } from '../systems/CreatureChainmakerSystem'
import { WorldPotassiumSpringSystem } from '../systems/WorldPotassiumSpringSystem'
import { DiplomaticPatronageSystem } from '../systems/DiplomaticPatronageSystem'
import { CreatureBellfounderSystem } from '../systems/CreatureBellfounderSystem'
import { WorldStrontiumSpringSystem } from '../systems/WorldStrontiumSpringSystem'
import { DiplomaticStewardshipPactSystem } from '../systems/DiplomaticStewardshipPactSystem'
import { CreatureGirdlerSystem } from '../systems/CreatureGirdlerSystem'
import { WorldBariumSpringSystem } from '../systems/WorldBariumSpringSystem'
import { DiplomaticConservatorshipSystem } from '../systems/DiplomaticConservatorshipSystem'
import { CreaturePewtererSystem } from '../systems/CreaturePewtererSystem'
import { WorldZincSpringSystem } from '../systems/WorldZincSpringSystem'
import { DiplomaticReceivershipSystem } from '../systems/DiplomaticReceivershipSystem'
import { CreatureWiredrawerSystem } from '../systems/CreatureWiredrawerSystem'
import { WorldCopperSpringSystem } from '../systems/WorldCopperSpringSystem'
import { DiplomaticProcuratorshipSystem } from '../systems/DiplomaticProcuratorshipSystem'
import { CreatureGlazierMasterSystem } from '../systems/CreatureGlazierMasterSystem'
import { WorldManganeseSpringSystem } from '../systems/WorldManganeseSpringSystem'
import { DiplomaticPrefectureSystem } from '../systems/DiplomaticPrefectureSystem'
import { CreatureRiveterSystem } from '../systems/CreatureRiveterSystem'
import { WorldTinSpringSystem } from '../systems/WorldTinSpringSystem'
import { DiplomaticVicarageSystem } from '../systems/DiplomaticVicarageSystem'
import { CreatureSmelterSystem } from '../systems/CreatureSmelterSystem'
import { WorldIridiumSpringSystem } from '../systems/WorldIridiumSpringSystem'
import { DiplomaticSeneschalrySystem } from '../systems/DiplomaticSeneschalrySystem'
import { CreaturePuddlerSystem } from '../systems/CreaturePuddlerSystem'
import { WorldOsmiumSpringSystem } from '../systems/WorldOsmiumSpringSystem'
import { DiplomaticChatelaincySystem } from '../systems/DiplomaticChatelaincySystem'
import { CreatureAssayerSystem } from '../systems/CreatureAssayerSystem'
import { WorldRutheniumSpringSystem } from '../systems/WorldRutheniumSpringSystem'
import { DiplomaticCastellanySystem } from '../systems/DiplomaticCastellanySystem'
import { CreatureWelderSystem } from '../systems/CreatureWelderSystem'
import { WorldNiobiumSpringSystem } from '../systems/WorldNiobiumSpringSystem'
import { DiplomaticBailiffrySystem } from '../systems/DiplomaticBailiffrySystem'
import { CreatureRollerSystem } from '../systems/CreatureRollerSystem'
import { WorldTantalumSpringSystem } from '../systems/WorldTantalumSpringSystem'
import { DiplomaticSheriffaltySystem } from '../systems/DiplomaticSheriffaltySytem'
import { CreatureDrawerSystem } from '../systems/CreatureDrawerSystem'
import { WorldHafniumSpringSystem } from '../systems/WorldHafniumSpringSystem'
import { DiplomaticCoronerSystem } from '../systems/DiplomaticCoronerSystem'
import { CreatureSpinnerSystem } from '../systems/CreatureSpinnerSystem'
import { WorldZirconiumSpringSystem } from '../systems/WorldZirconiumSpringSystem'
import { DiplomaticEscheatorSystem } from '../systems/DiplomaticEscheatorSystem'
import { CreatureFurbisherSystem } from '../systems/CreatureFurbisherSystem'
import { WorldIndiumSpringSystem } from '../systems/WorldIndiumSpringSystem'
import { DiplomaticAlmonerSystem } from '../systems/DiplomaticAlmonerSystem'
import { CreatureTinplaterSystem } from '../systems/CreatureTinplaterSystem'
import { WorldGalliumSpringSystem } from '../systems/WorldGalliumSpringSystem'
import { DiplomaticPurveyorSystem } from '../systems/DiplomaticPurveyorSystem'
import { CreatureAnnealerSystem } from '../systems/CreatureAnnealerSystem'
import { WorldGermaniumSpringSystem } from '../systems/WorldGermaniumSpringSystem'
import { DiplomaticHarbingerSystem } from '../systems/DiplomaticHarbingerSystem'
import { CreatureBurnisherSystem } from '../systems/CreatureBurnisherSystem'
import { WorldThalliumSpringSystem } from '../systems/WorldThalliumSpringSystem'
import { DiplomaticVerdererSystem } from '../systems/DiplomaticVerdererSystem'
import { CreatureSwagerSystem } from '../systems/CreatureSwagerSystem'
import { WorldScandiumSpringSystem } from '../systems/WorldScandiumSpringSystem'
import { DiplomaticHaywardSystem } from '../systems/DiplomaticHaywardSystem'
import { CreatureStamperSystem } from '../systems/CreatureStamperSystem'
import { WorldYttriumSpringSystem } from '../systems/WorldYttriumSpringSystem'
import { DiplomaticPannagerSystem } from '../systems/DiplomaticPannagerSystem'
import { CreatureForgerSystem } from '../systems/CreatureForgerSystem'
import { WorldLanthanumSpringSystem } from '../systems/WorldLanthanumSpringSystem'
import { DiplomaticAgisterSystem } from '../systems/DiplomaticAgisterSystem'
import { CreatureHammermanSystem } from '../systems/CreatureHammermanSystem'
import { WorldCeriumSpringSystem } from '../systems/WorldCeriumSpringSystem'
import { DiplomaticWoodwardSystem } from '../systems/DiplomaticWoodwardSystem'
import { CreaturePeenerSystem } from '../systems/CreaturePeenerSystem'
import { WorldPraseodymiumSpringSystem } from '../systems/WorldPraseodymiumSpringSystem'
import { DiplomaticWarrenerSystem } from '../systems/DiplomaticWarrenerSystem'
import { CreaturePlanisherSystem } from '../systems/CreaturePlanisherSystem'
import { WorldNeodymiumSpringSystem } from '../systems/WorldNeodymiumSpringSystem'
import { DiplomaticParkwardSystem } from '../systems/DiplomaticParkwardSystem'
import { CreatureBevellerSystem } from '../systems/CreatureBevellerSystem'
import { WorldSamariumSpringSystem } from '../systems/WorldSamariumSpringSystem'
import { DiplomaticWoodreveSystem } from '../systems/DiplomaticWoodreveSystem'
import { CreatureFlatterSystem } from '../systems/CreatureFlatterSystem'
import { WorldEuropiumSpringSystem } from '../systems/WorldEuropiumSpringSystem'
import { DiplomaticRangerSystem } from '../systems/DiplomaticRangerSystem'
import { CreatureChisellerSystem } from '../systems/CreatureChisellerSystem'
import { WorldGadoliniumSpringSystem } from '../systems/WorldGadoliniumSpringSystem'
import { DiplomaticForestarSystem } from '../systems/DiplomaticForestarSystem'
import { CreatureKnurlerSystem } from '../systems/CreatureKnurlerSystem'
import { WorldTerbiumSpringSystem } from '../systems/WorldTerbiumSpringSystem'
import { DiplomaticWaynwardSystem } from '../systems/DiplomaticWaynwardSystem'
import { CreatureReamerSystem } from '../systems/CreatureReamerSystem'
import { WorldDysprosiumSpringSystem } from '../systems/WorldDysprosiumSpringSystem'
import { DiplomaticMootmanSystem } from '../systems/DiplomaticMootmanSystem'
import { CreatureBroacherSystem } from '../systems/CreatureBroacherSystem'
import { WorldHolmiumSpringSystem } from '../systems/WorldHolmiumSpringSystem'
import { DiplomaticTithingmanSystem } from '../systems/DiplomaticTithingmanSystem'
import { CreatureHonerSystem } from '../systems/CreatureHonerSystem'
import { WorldErbiumSpringSystem } from '../systems/WorldErbiumSpringSystem'
import { DiplomaticHayreveSystem } from '../systems/DiplomaticHayreveSystem'
import { CreatureLapperSystem } from '../systems/CreatureLapperSystem'
import { WorldThuliumSpringSystem } from '../systems/WorldThuliumSpringSystem'
import { DiplomaticPinderSystem } from '../systems/DiplomaticPinderSystem'
import { CreatureBorerSystem } from '../systems/CreatureBorerSystem'
import { WorldYtterbiumSpringSystem } from '../systems/WorldYtterbiumSpringSystem'
import { DiplomaticGrithmanSystem } from '../systems/DiplomaticGrithmanSystem'
import { CreatureCountersinkerSystem } from '../systems/CreatureCountersinkerSystem'
import { WorldLutetiumSpringSystem } from '../systems/WorldLutetiumSpringSystem'
import { DiplomaticBorsholderSystem } from '../systems/DiplomaticBorsholderSystem'
import { CreatureSpotfacerSystem } from '../systems/CreatureSpotfacerSystem'
import { WorldActiniumSpringSystem } from '../systems/WorldActiniumSpringSystem'
import { DiplomaticAletasterSystem } from '../systems/DiplomaticAletasterSystem'
import { CreatureTapperSystem } from '../systems/CreatureTapperSystem'
import { WorldThoriumSpringSystem } from '../systems/WorldThoriumSpringSystem'
import { DiplomaticBreadweigherSystem } from '../systems/DiplomaticBreadweigherSystem'
import { CreatureCoinerSystem } from '../systems/CreatureCoinerSystem'
import { WorldProtactiniumSpringSystem } from '../systems/WorldProtactiniumSpringSystem'
import { DiplomaticMuragersSystem } from '../systems/DiplomaticMuragersSystem'
import { CreatureSwageBlockerSystem } from '../systems/CreatureSwageBlockerSystem'
import { WorldUraniumSpringSystem } from '../systems/WorldUraniumSpringSystem'
import { DiplomaticGarthmanSystem } from '../systems/DiplomaticGarthmanSystem'
import { CreatureDrifterSystem } from '../systems/CreatureDrifterSystem'
import { DiplomaticCrierSystem } from '../systems/DiplomaticCrierSystem'
import { WorldPoloniumSpringSystem } from '../systems/WorldPoloniumSpringSystem'
import { DiplomaticBeadleSystem } from '../systems/DiplomaticBeadleSystem'
import { CreatureUpsetterSystem } from '../systems/CreatureUpsetterSystem'
import { WorldFranciumSpringSystem } from '../systems/WorldFranciumSpringSystem'
import { DiplomaticHerbalistSystem } from '../systems/DiplomaticHerbalistSystem'
import { CreatureSwedgerSystem } from '../systems/CreatureSwedgerSystem'
import { WorldRadonSpringSystem } from '../systems/WorldRadonSpringSystem'
import { DiplomaticLampwardenSystem } from '../systems/DiplomaticLampwardenSystem'
import { CreatureBurnOuterSystem } from '../systems/CreatureBurnOuterSystem'
import { WorldAstatineSpringSystem } from '../systems/WorldAstatineSpringSystem'
import { DiplomaticClavigersSystem } from '../systems/DiplomaticClavigersSystem'
import { CreatureScriberSystem } from '../systems/CreatureScriberSystem'
import { WorldCaesiumSpringSystem } from '../systems/WorldCaesiumSpringSystem'
import { DiplomaticPaviorSystem } from '../systems/DiplomaticPaviorSystem'
import { CreatureStakerSystem } from '../systems/CreatureStakerSystem'
import { WorldRubidiumSpringSystem } from '../systems/WorldRubidiumSpringSystem'
import { DiplomaticWainageSystem } from '../systems/DiplomaticWainageSystem'
import { CreaturePlanisherMasterSystem } from '../systems/CreaturePlanisherMasterSystem'
import { WorldTelluriumSpringSystem } from '../systems/WorldTelluriumSpringSystem'
import { DiplomaticGarbleSystem } from '../systems/DiplomaticGarbleSystem'
import { CreatureNeedlerSystem } from '../systems/CreatureNeedlerSystem'
import { WorldXenonSpringSystem } from '../systems/WorldXenonSpringSystem'
import { DiplomaticTollboothSystem } from '../systems/DiplomaticTollboothSystem'
const _ERA_ORDER = ['stone', 'bronze', 'iron', 'medieval', 'renaissance'] as const
const _EMPTY_ARRAY: never[] = []

export class Game {

  private uiHelper!: GameUIHelper

  // Batch system interfaces for data-driven tick dispatch
  private _batch11A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch11B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch11C!: { update(tickRate: number, em: any, civManager: any, tick: number): void }[]
  private _batch11D!: { update(tickRate: number, world: any, tick: number): void }[]
  private _batch11E!: { update(tickRate: number, civManager: any, tick: number): void }[]
  private _batch41A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch41B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch41C!: { update(tickRate: number, em: any, civManager: any, tick: number): void }[]
  private _batch41D!: { update(tickRate: number, world: any, tick: number): void }[]
  private _batch41E!: { update(tickRate: number, civManager: any, tick: number): void }[]
  private _batch21A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch21B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch21C!: { update(tickRate: number, em: any, civManager: any, tick: number): void }[]
  private _batch36A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch36B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch36F!: { update(tickRate: number, world: any, em: any, civManager: any, tick: number): void }[]
  private _batch51A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch51B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch6A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch6B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch26A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch26B!: { update(tickRate: number, em: any, tick: number): void }[]
  private _batch46A!: { update(tickRate: number, world: any, em: any, tick: number): void }[]
  private _batch46B!: { update(tickRate: number, em: any, tick: number): void }[]

  private world: World
  private camera: Camera
  private renderer: Renderer
  private input: Input
  private powers: Powers
  private toolbar: Toolbar
  private infoPanel: InfoPanel
  private creaturePanel: CreaturePanel
  private statsPanel: StatsPanel
  private techTreePanel: TechTreePanel
  private contextMenu: ContextMenu
  private inputManager!: GameInputManager

  em: EntityManager
  private aiSystem: AISystem
  private combatSystem: CombatSystem
  particles: ParticleSystem
  private audio: SoundSystem
  creatureFactory: CreatureFactory
  civManager: CivManager
  private weather: WeatherSystem
  private resources: ResourceSystem
  private achievements: AchievementSystem
  private disasterSystem: DisasterSystem
  private timeline: TimelineSystem
  private techSystem: TechSystem
  private migrationSystem!: MigrationSystem
  private artifactSystem: ArtifactSystem
  private diseaseSystem: DiseaseSystem
  private worldEventSystem: WorldEventSystem
  private caravanSystem: CaravanSystem
  private diplomacySystem: DiplomacySystem
  private cropSystem: CropSystem
  private navalSystem: NavalSystem
  private questSystem: QuestSystem
  private buildingUpgradeSystem: BuildingUpgradeSystem
  private ecosystemSystem: EcosystemSystem
  private fogOfWarSystem: FogOfWarSystem
  private religionSystem: ReligionSystem
  private ambientParticles: AmbientParticleSystem
  private cityPlanningSystem: CityPlanningSystem
  private armySystem: ArmySystem
  private eraSystem: EraSystem
  private tradeEconomySystem: TradeEconomySystem
  private heroLegendSystem: HeroLegendSystem
  private wonderSystem: WonderSystem
  private toastSystem: ToastSystem
  private loyaltySystem: LoyaltySystem
  private biomeEvolution: BiomeEvolutionSystem
  private espionageSystem: EspionageSystem
  private dayNightRenderer: DayNightRenderer
  private godPowerSystem: GodPowerSystem
  private worldChronicle: WorldChronicleSystem
  private cultureSystem: CultureSystem
  private musicSystem!: MusicSystem
  private miningSystem: MiningSystem
  private disasterChainSystem: DisasterChainSystem
  private seasonSystem: SeasonSystem
  private animalMigration: AnimalMigrationSystem
  private volcanoSystem!: VolcanoSystem
  private riverSystem: RiverSystem
  private tradeRouteRenderer: TradeRouteRenderer
  private ruinsSystem: RuinsSystem
  private plagueVisual: PlagueVisualSystem
  private worldDecorations: WorldDecorationSystem
  private eraVisual: EraVisualSystem
  private weatherDisaster: WeatherDisasterSystem
  private fogOfWar: FogOfWarRenderer
  private fortificationRenderer: FortificationRenderer
  private evolutionSystem: EvolutionSystem
  private populationSystem: PopulationSystem
  private allianceSystem: AllianceSystem
  private terraformingSystem: TerraformingSystem
  private statisticsTracker: StatisticsTracker
  private spatialHash: SpatialHashSystem
  private objectPool: ObjectPoolSystem
  private minimapOverlay: MinimapOverlaySystem
  private portalSystem: PortalSystem
  private waterAnimation: WaterAnimationSystem
  private minimapSystem: MinimapSystem
  private formationSystem: FormationSystem
  private achievementContent: AchievementContentSystem
  private chartPanel: ChartPanelSystem
  private clonePower: ClonePowerSystem
  private siegeWarfare: SiegeWarfareSystem
  private tutorial: TutorialSystem
  private renderCulling: RenderCullingSystem
  private reputationSystem: ReputationSystem
  private siegeSystem: SiegeSystem
  private disasterWarning: DisasterWarningSystem
  private moodSystem: MoodSystem
  private worldAge: WorldAgeSystem
  private helpOverlay: HelpOverlaySystem
  private bloodMoon: BloodMoonSystem
  private creatureAging: CreatureAgingSystem
  private resourceScarcity: ResourceScarcitySystem
  private legendaryBattle: LegendaryBattleSystem
  private worldBorder: WorldBorderSystem
  private enhancedTooltip: EnhancedTooltipSystem
  private navalCombat: NavalCombatSystem
  private religionSpread: ReligionSpreadSystem
  private lodRender: LODRenderSystem
  private buildingVariety: BuildingVarietySystem
  private historyReplay: HistoryReplaySystem
  private seasonVisual: SeasonVisualSystem
  private tradeFleet: TradeFleetSystem
  private worldDashboard: WorldDashboardSystem
  private unifiedParticles: UnifiedParticleSystem
  private weatherParticles: WeatherParticleSystem
  private diplomacyVisual: DiplomacyVisualSystem
  private eventNotification: EventNotificationSystem
  private editorEnhanced: EditorEnhancedSystem
  private fogEnhanced: FogOfWarEnhanced
  private battleReplay: BattleReplaySystem
  private evolutionVisual: EvolutionVisualSystem
  private achievementPopup: AchievementPopupSystem
  private minimapEnhanced: MinimapEnhancedSystem
  private ambientSound: AmbientSoundMixer
  private mapGen!: MapGenSystem
  private flocking!: FlockingSystem
  private autoSave!: AutoSaveSystem
  private perfMonitor!: PerformanceMonitorSystem
  private worldSeed!: WorldSeedSystem
  private keybindSystem!: KeybindSystem
  private worldExport!: WorldExportSystem
  private screenshotMode!: ScreenshotModeSystem
  private entitySearch!: EntitySearchSystem
  private worldStatsOverview!: WorldStatsOverviewSystem
  private notificationCenter!: NotificationCenterSystem
  private sandboxSettings!: SandboxSettingsSystem
  private minimapMode!: MiniMapModeSystem
  private cameraBookmarks!: CameraBookmarkSystem
  private entityInspector!: EntityInspectorSystem
  private speedIndicator!: SpeedIndicatorSystem
  private achievementProgress!: AchievementProgressSystem
  private cameraAnimation!: CameraAnimationSystem
  private cityLayout!: CityLayoutSystem
  private customSpecies!: CustomSpeciesSystem
  private eraTransition!: EraTransitionSystem
  private mapMarker!: MapMarkerSystem
  private terrainDecoration!: TerrainDecorationSystem
  private timeRewind!: TimeRewindSystem
  private weatherControl!: WeatherControlSystem
  private worldEventTimeline!: WorldEventTimelineSystem
  private resourceFlow!: ResourceFlowSystem
  private creatureEmotion!: CreatureEmotionSystem
  private powerFavorite!: PowerFavoriteSystem
  private worldHeatmap!: WorldHeatmapSystem
  private zoneManagement!: ZoneManagementSystem
  private creatureLineage!: CreatureLineageSystem
  private worldLaw!: WorldLawSystem
  private miniGame!: MiniGameSystem
  private cinematicMode!: CinematicModeSystem
  private creatureMemory!: CreatureMemorySystem
  private pollution!: PollutionSystem
  private prophecy!: ProphecySystem
  private creatureSkill!: CreatureSkillSystem
  private worldNarrator!: WorldNarratorSystem
  private mythology!: MythologySystem
  private creatureTaming!: CreatureTamingSystem
  private plagueMutation!: PlagueMutationSystem
  private monument!: MonumentSystem
  private creaturePersonality!: CreaturePersonalitySystem
  private tradeNegotiation!: TradeNegotiationSystem
  private creatureDream!: CreatureDreamSystem
  private disasterRecovery!: NaturalDisasterRecoverySystem
  private creatureFame!: CreatureFameSystem
  private migrationWave!: WorldMigrationWaveSystem
  private creatureRivalry!: CreatureRivalrySystem
  private worldCorruption!: WorldCorruptionSystem
  private creatureProfession!: CreatureProfessionSystem
  private diplomaticSummit!: DiplomaticSummitSystem
  private worldLeyLine!: WorldLeyLineSystem
  private creatureBounty!: CreatureBountySystem
  private seasonFestival!: SeasonFestivalSystem
  private creatureMutation!: CreatureMutationSystem
  private diplomaticMarriage!: DiplomaticMarriageSystem
  private worldRelic!: WorldRelicSystem
  private creatureAncestor!: CreatureAncestorSystem
  private worldAnomaly!: WorldAnomalySystem
  private creatureApprentice!: CreatureApprenticeSystem
  private diplomaticSanction!: DiplomaticSanctionSystem
  private worldMythicBeast!: WorldMythicBeastSystem
  private creatureGuild!: CreatureGuildSystem
  private worldSeasonalDisaster!: WorldSeasonalDisasterSystem
  private creatureReputation!: CreatureReputationSystem
  private diplomaticEspionage!: DiplomaticEspionageSystem
  private worldAncientRuin!: WorldAncientRuinSystem
  private creatureHobby!: CreatureHobbySystem
  private worldNaturalWonder!: WorldNaturalWonderSystem
  private creatureLanguage!: CreatureLanguageSystem
  private diplomaticTribute!: DiplomaticTributeSystem
  private worldWeatherFront!: WorldWeatherFrontSystem
  private creatureTradeSkill!: CreatureTradeSkillSystem
  private worldSacredGrove!: WorldSacredGroveSystem
  private creatureAlliance!: CreatureAllianceSystem
  private diplomaticPropaganda!: DiplomaticPropagandaSystem
  private worldTidal!: WorldTidalSystem
  private creatureSuperstition!: CreatureSuperstitionSystem
  private worldMagicStorm!: WorldMagicStormSystem
  private creatureAmbition!: CreatureAmbitionSystem
  private diplomaticCouncil!: DiplomaticCouncilSystem
  private worldFertility!: WorldFertilitySystem
  private creatureFashion!: CreatureFashionSystem
  private diplomaticHostage!: DiplomaticHostageSystem
  private worldErosion!: WorldErosionSystem
  private creaturePet!: CreaturePetSystem
  private worldCrystalFormation!: WorldCrystalFormationSystem
  private creatureRitual!: CreatureRitualSystem
  private diplomaticExile!: DiplomaticExileSystem
  private worldMigrationRoute!: WorldMigrationRouteSystem
  private worldVolcanic!: WorldVolcanicSystem
  private worldAcoustic!: WorldAcousticSystem
  private creatureNostalgia!: CreatureNostalgiaSystem
  private worldUnderground!: WorldUndergroundSystem
  private diplomaticBlockade!: DiplomaticBlockadeSystem
  private creatureInvention!: CreatureInventionSystem
  private worldAurora!: WorldAuroraSystem
  private creaturePhobia!: CreaturePhobiaSystem
  private worldGeothermal!: WorldGeothermalSystem
  private diplomaticFederation!: DiplomaticFederationSystem
  private creatureArt!: CreatureArtSystem
  private worldMiasma!: WorldMiasmaSystem
  private creatureTotem!: CreatureTotemSystem
  private worldFossil!: WorldFossilSystem
  private diplomaticSpy!: DiplomaticSpySystem
  private creatureDance!: CreatureDanceSystem
  private worldBeacon!: WorldBeaconSystem
  private worldTectonic!: WorldTectonicSystem
  private creatureMentor!: CreatureMentorSystem
  private worldEcho!: WorldEchoSystem
  private creatureTrauma!: CreatureTraumaSystem
  private worldOasis!: WorldOasisSystem
  private diplomaticCeremony!: DiplomaticCeremonySystem
  private creatureMigrationMemory!: CreatureMigrationMemorySystem
  private worldPetrification!: WorldPetrificationSystem
  private worldMaelstrom!: WorldMaelstromSystem
  private creatureRivalryDuel!: CreatureRivalryDuelSystem
  private worldCoralReef!: WorldCoralReefSystem
  private worldSandstorm!: WorldSandstormSystem
  private creatureCollection!: CreatureCollectionSystem
  private worldRift!: WorldRiftSystem
  private creatureVision!: CreatureVisionSystem
  private worldAvalanche!: WorldAvalancheSystem
  private diplomaticAsylum!: DiplomaticAsylumSystem
  private creatureForaging!: CreatureForagingSystem
  private worldWhirlpool!: WorldWhirlpoolSystem
  private creatureOath!: CreatureOathSystem
  private worldAuroraStorm!: WorldAuroraStormSystem
  private diplomaticEmbargo!: DiplomaticEmbargoSystem
  private creatureLegacy!: CreatureLegacySystem
  private worldMemorial!: WorldMemorialSystem
  private worldTidePool!: WorldTidePoolSystem
  private creatureDivination!: CreatureDivinationSystem
  private diplomaticSuccession!: DiplomaticSuccessionSystem
  private worldMeteorShower!: WorldMeteorShowerSystem
  private creatureBeastMaster!: CreatureBeastMasterSystem
  private worldGlacier!: WorldGlacierSystem
  private creatureRumor!: CreatureRumorSystem
  private diplomaticTradeAgreement!: DiplomaticTradeAgreementSystem
  private worldPurification!: WorldPurificationSystem
  private creatureNightWatch!: CreatureNightWatchSystem
  private creatureBarter!: CreatureBarterSystem
  private worldGeyser!: WorldGeyserSystem
  private worldQuicksand!: WorldQuicksandSystem
  private creatureIntuition!: CreatureIntuitionSystem
  private worldComet!: WorldCometSystem
  private creatureExile!: CreatureExileSystem
  private worldHotSpring!: WorldHotSpringSystem
  private creatureNickname!: CreatureNicknameSystem
  private worldEclipse!: WorldEclipseSystem
  private creatureGrudge!: CreatureGrudgeSystem
  private worldSinkhole!: WorldSinkholeSystem
  private diplomaticCensus!: DiplomaticCensusSystem
  private creatureSleepwalk!: CreatureSleepwalkSystem
  private worldRainbow!: WorldRainbowSystem
  private creatureTattoo!: CreatureTattooSystem
  private worldDustStorm!: WorldDustStormSystem
  private diplomaticWarReparation!: DiplomaticWarReparationSystem
  private creatureClaustrophobia!: CreatureClaustrophobiaSystem
  private worldBioluminescence!: WorldBioluminescenceSystem
  private creaturePilgrimage!: CreaturePilgrimageSystem
  private worldPermafrost!: WorldPermafrostSystem
  private diplomaticCulturalExchange!: DiplomaticCulturalExchangeSystem
  private creatureSomniloquy!: CreatureSomniloquySystem
  private worldTidalWave!: WorldTidalWaveSystem
  private creatureOmenBelief!: CreatureOmenBeliefSystem
  private worldMudslide!: WorldMudslideSystem
  private diplomaticPledge!: DiplomaticPledgeSystem
  private creatureAmbidextrity!: CreatureAmbidextritySystem
  private worldKelpForest!: WorldKelpForestSystem
  private creatureHandicraft!: CreatureHandicraftSystem
  private worldGeothermalVent!: WorldGeothermalVentSystem
  private diplomaticTariff!: DiplomaticTariffSystem
  private creatureHomesickness!: CreatureHomesicknessSystem
  private worldMirage!: WorldMirageSystem
  private creatureLullaby!: CreatureLullabySystem
  private diplomaticMediation!: DiplomaticMediationSystem
  private creatureCalligraphy!: CreatureCalligraphySystem
  private worldFogBank!: WorldFogBankSystem
  private creatureFermentation!: CreatureFermentationSystem
  private creatureVentriloquism!: CreatureVentriloquismSystem
  private worldDustDevil!: WorldDustDevilSystem
  private creaturePottery!: CreaturePotterySystem
  private worldMangrove!: WorldMangroveSystem
  private diplomaticPeaceTreaty!: DiplomaticPeaceTreatySystem
  private creatureEcholocation!: CreatureEcholocationSystem
  private worldBallLightning!: WorldBallLightningSystem
  private creatureWeaving!: CreatureWeavingSystem
  private worldCrystalCave!: WorldCrystalCaveSystem
  private diplomaticTradeSanction!: DiplomaticTradeSanctionSystem
  private creatureMimicry!: CreatureMimicrySystem
  private worldWaterspout!: WorldWaterspoutSystem
  private creatureBeekeeping!: CreatureBeekeepingSystem
  private worldVolcanicIsland!: WorldVolcanicIslandSystem
  private diplomaticTradeGuild!: DiplomaticTradeGuildSystem
  private creatureTelepathy!: CreatureTelepathySystem
  private creatureGlassblowing!: CreatureGlassblowingSystem
  private worldUndergroundRiver!: WorldUndergroundRiverSystem
  private diplomaticNavalBlockade!: DiplomaticNavalBlockadeSystem
  private creaturePremonition!: CreaturePremonitionSystem
  private creatureHerbalism!: CreatureHerbalismSystem
  private worldFloatingIsland!: WorldFloatingIslandSystem
  private creatureCartography!: CreatureCartographySystem
  private creatureShapeshifting!: CreatureShapeshiftingSystem
  private worldWhirlwind!: WorldWhirlwindSystem
  private creatureRunecrafting!: CreatureRunecraftingSystem
  private creatureAstrology!: CreatureAstrologySystem
  private creatureSummoning!: CreatureSummoningSystem
  private creatureAlchemy!: CreatureAlchemySystem
  private creatureEnchanting!: CreatureEnchantingSystem
  private worldGeyserField!: WorldGeyserFieldSystem
  private creatureBard!: CreatureBardSystem
  private worldNorthernLights!: WorldNorthernLightsSystem
  private worldMossGrowth!: WorldMossGrowthSystem
  private worldIrrigation!: WorldIrrigationSystem
  private creatureConstellation!: CreatureConstellationSystem
  private creatureScribe!: CreatureScribeSystem
  private worldLighthouse!: WorldLighthouseSystem
  private creatureMasonry!: CreatureMasonrySystem
  private worldTidewater!: WorldTidewaterSystem
  private creatureOrigami!: CreatureOrigamiSystem
  private worldLabyrinth!: WorldLabyrinthSystem
  private creatureFalconry!: CreatureFalconrySystem
  private creatureApiary!: CreatureApiarySystem
  private worldTerracing!: WorldTerracingSystem
  private creatureCourier!: CreatureCourierSystem
  private creatureMosaic!: CreatureMosaicSystem
  private worldSundial!: WorldSundialSystem
  private worldAqueduct!: WorldAqueductSystem
  private creatureTattoist!: CreatureTattoistSystem
  private worldGeoglyph!: WorldGeoglyphSystem
  private creatureHerald!: CreatureHeraldSystem
  private creaturePuppeteer!: CreaturePuppeteerSystem
  private worldObsidian!: WorldObsidianSystem
  private creatureRanger!: CreatureRangerSystem
  private worldCoralReefGrowth!: WorldCoralReefGrowthSystem
  private creatureRunner!: CreatureRunnerSystem
  private creatureJester!: CreatureJesterSystem
  private worldPetrifiedForest!: WorldPetrifiedForestSystem
  private creatureNomad!: CreatureNomadSystem
  private worldStalactite!: WorldStalactiteSystem
  private creatureChronicler!: CreatureChroniclerSystem
  private creatureFirewalker!: CreatureFirewalkerSystem
  private diplomaticHostageExchange!: DiplomaticHostageExchangeSystem
  private worldFrostbite!: WorldFrostbiteSystem
  private creatureOracle!: CreatureOracleSystem
  private worldCoralBleaching!: WorldCoralBleachingSystem
  private creatureBlacksmith!: CreatureBlacksmithSystem
  private creatureDowser!: CreatureDowserSystem
  private worldMagneticField!: WorldMagneticFieldSystem
  private creatureCheeseAger!: CreatureCheeseAgerSystem
  private worldSinkholePrev!: WorldSinkholePrevSystem
  private diplomaticRansom!: DiplomaticRansomSystem
  private creatureSoapMaker!: CreatureSoapMakerSystem
  private worldDewFormation!: WorldDewFormationSystem
  private creatureGambler!: CreatureGamblerSystem
  private worldSandDune!: WorldSandDuneSystem
  private diplomaticWarReparations!: DiplomaticWarReparationsSystem
  private creatureGladiator!: CreatureGladiatorSystem
  private worldTideFlat!: WorldTideFlatSystem
  private creatureMushroomForager!: CreatureMushroomForagerSystem
  private worldIceSheet!: WorldIceSheetSystem
  private diplomaticNonAggression!: DiplomaticNonAggressionSystem
  private creatureTrapper!: CreatureTrapperSystem
  private worldCoralSpawning!: WorldCoralSpawningSystem
  private creatureAstronomer!: CreatureAstronomerSystem
  private worldThermalVent!: WorldThermalVentSystem
  private diplomaticArmistic!: DiplomaticArmisticSystem
  private creatureWeaver!: CreatureWeaverSystem
  private creatureHerbalist!: CreatureHerbalistSystem
  private creatureSentinel!: CreatureSentinelSystem
  private worldPeatBog!: WorldPeatBogSystem
  private creatureBeekeeper!: CreatureBeekeeperSystem
  private worldAtoll!: WorldAtollSystem
  private creatureLamplighter!: CreatureLamplighterSystem
  private diplomaticCeasefire!: DiplomaticCeasefireSystem
  private creaturePerfumer!: CreaturePerfumerSystem
  private worldCoralNursery!: WorldCoralNurserySystem
  private creatureGlazier!: CreatureGlazierSystem
  private worldMudVolcano!: WorldMudVolcanoSystem
  private diplomaticProtectorate!: DiplomaticProtectorateSystem
  private creatureGondolier!: CreatureGondolierSystem
  private worldFungalNetwork!: WorldFungalNetworkSystem
  private creatureCooper!: CreatureCooperSystem
  private worldSaltMarsh!: WorldSaltMarshSystem
  private diplomaticConfederation!: DiplomaticConfederationSystem
  private creatureChandler!: CreatureChandlerSystem
  private worldFrostHollow!: WorldFrostHollowSystem
  private creatureTinker!: CreatureTinkerSystem
  private worldBasaltColumn!: WorldBasaltColumnSystem
  private creatureFletcher!: CreatureFletcherSystem
  private worldMangroveSwamp!: WorldMangroveSwampSystem
  private creatureWheelwright!: CreatureWheelwrightSystem
  private worldObsidianField!: WorldObsidianFieldSystem
  private creatureFalconer!: CreatureFalconerSystem
  private creatureEngraver!: CreatureEngraverSystem
  private worldLavaTube!: WorldLavaTubeSystem
  private creatureTanner!: CreatureTannerSystem
  private worldBioluminescentBay!: WorldBioluminescentBaySystem
  private creatureCartographer!: CreatureCartographerSystem
  private worldPumiceField!: WorldPumiceFieldSystem
  private diplomaticTribunal!: DiplomaticTribunalSystem
  private creatureRopeMaker!: CreatureRopeMakerSystem
  private worldSandstoneArch!: WorldSandstoneArchSystem
  private creatureVintner!: CreatureVintnerSystem
  private worldFumaroleField!: WorldFumaroleFieldSystem
  private diplomaticAmnesty!: DiplomaticAmnestySystem
  private creatureShipwright!: CreatureShipwrightSystem
  private worldCloudForest!: WorldCloudForestSystem
  private creatureDyer!: CreatureDyerSystem
  private worldTravertineTerrace!: WorldTravertineTerraceSystem
  private diplomaticArbitration!: DiplomaticArbitrationSystem
  private creatureLapidary!: CreatureLapidarySystem
  private worldBlackSandBeach!: WorldBlackSandBeachSystem
  private creatureLocksmith!: CreatureLocksmithSystem
  private worldIceCave!: WorldIceCaveSystem
  private diplomaticPlebiscite!: DiplomaticPlebisciteSystem
  private creatureRugmaker!: CreatureRugmakerSystem
  private worldTidalLagoon!: WorldTidalLagoonSystem
  private creatureSaddler!: CreatureSaddlerSystem
  private worldIceShelf!: WorldIceShelfSystem
  private diplomaticReferendum!: DiplomaticReferendumSystem
  private creatureBookbinder!: CreatureBookbinderSystem
  private worldSeaStack!: WorldSeaStackSystem
  private creatureFarrier!: CreatureFarrierSystem
  private worldPermafrostThaw!: WorldPermafrostThawSystem
  private diplomaticRatification!: DiplomaticRatificationSystem
  private creatureFuller!: CreatureFullerSystem
  private worldBarrierIsland!: WorldBarrierIslandSystem
  private creatureSawyer!: CreatureSawyerSystem
  private worldVolcanicAshPlain!: WorldVolcanicAshPlainSystem
  private diplomaticAdjudication!: DiplomaticAdjudicationSystem
  private creatureGilders!: CreatureGildersSystem
  private creatureCoopers!: CreatureCoopersSystem
  private worldMudFlat!: WorldMudFlatSystem
  private creatureThatchers!: CreatureThatchersSystem
  private worldCoralAtoll!: WorldCoralAtollSystem
  private creatureChandlers!: CreatureChandlersSystem
  private worldGeothermalSpring!: WorldGeothermalSpringSystem
  private diplomaticConciliation!: DiplomaticConciliationSystem
  private creatureGlazers!: CreatureGlazersSystem
  private worldSinkholePlain!: WorldSinkholePlainSystem
  private creaturePlasterers!: CreaturePlasterersSystem
  private diplomaticArbitrationTreaty!: DiplomaticArbitrationTreatySystem
  private creatureEngravers!: CreatureEngraversSystem
  private worldMangroveDelta!: WorldMangroveDeltaSystem
  private creatureWheelwrights!: CreatureWheelwrightsSystem
  private worldSaltFlat!: WorldSaltFlatSystem
  private diplomaticExtradition!: DiplomaticExtraditionSystem
  private creaturePerfumers!: CreaturePerfumersSystem
  private worldObsidianFlow!: WorldObsidianFlowSystem
  private creatureCobblers!: CreatureCobblersSystem
  private worldTidalMarsh!: WorldTidalMarshSystem
  private diplomaticSovereignty!: DiplomaticSovereigntySystem
  private creatureAssayers!: CreatureAssayersSystem
  private worldKarstTower!: WorldKarstTowerSystem
  private creatureFletchers!: CreatureFletchersSystem
  private worldAlluvialFan!: WorldAlluvialFanSystem
  private diplomaticReparation!: DiplomaticReparationSystem
  private creatureWainwrights!: CreatureWainwrightsSystem
  private worldBayou!: WorldBayouSystem
  private creatureCuriers!: CreatureCuriersSystem
  private worldCinderCone!: WorldCinderConeSystem
  private diplomaticRestitution!: DiplomaticRestitutionSystem
  private creatureHorners!: CreatureHornersSystem
  private worldFjord!: WorldFjordSystem
  private creatureNailers!: CreatureNailersSystem
  private worldBadlands!: WorldBadlandsSystem
  private diplomaticIndemnity!: DiplomaticIndemnitySystem
  private creatureReedCutters!: CreatureReedCuttersSystem
  private worldMesa!: WorldMesaSystem
  private creaturePotters!: CreaturePottersSystem
  private diplomaticAnnexation!: DiplomaticAnnexationSystem
  private creatureRopeMakers!: CreatureRopeMakersSystem
  private worldButtes!: WorldButtesSystem
  private creatureBellFounders!: CreatureBellFoundersSystem
  private worldCanyon!: WorldCanyonSystem
  private diplomaticSecession!: DiplomaticSecessionSystem
  private creatureQuarrymen!: CreatureQuarrymenSystem
  private worldArchipelago!: WorldArchipelagoSystem
  private creatureFelters!: CreatureFeltersSystem
  private worldRiftValley!: WorldRiftValleySystem
  private creatureLimeburners!: CreatureLimeburnersSystem
  private worldCaldera!: WorldCalderaSystem
  private creatureWheelers!: CreatureWheelersSystem
  private worldEscarpment!: WorldEscarpmentSystem
  private diplomaticNeutralization!: DiplomaticNeutralizationSystem
  private creatureSieveMakers!: CreatureSieveMakersSystem
  private worldPlains!: WorldPlainsSystem
  private creatureBroomMakers!: CreatureBroomMakersSystem
  private worldSpire!: WorldSpireSystem
  private creatureCharcoalBurners!: CreatureCharcoalBurnersSystem
  private worldGrotto!: WorldGrottoSystem
  private creatureTinsmiths!: CreatureTinsmithsSystem
  private worldPinnacle!: WorldPinnacleSystem
  private creatureBasketWeavers!: CreatureBasketWeaversSystem
  private worldHoodoo!: WorldHoodooSystem
  private creatureSoapMakers!: CreatureSoapMakersSystem
  private worldCenote!: WorldCenoteSystem
  private creatureGlassblowers!: CreatureGlassblowersSystem
  private worldMoraine!: WorldMoraineSystem
  private diplomaticCoexistence!: DiplomaticCoexistenceSystem
  private creatureParchmentMakers!: CreatureParchmentMakersSystem
  private worldBlowhole!: WorldBlowholeSystem
  private diplomaticReunification!: DiplomaticReunificationSystem
  private creatureDyers!: CreatureDyersSystem
  private worldDrumlin!: WorldDrumlinSystem
  private diplomaticNonIntervention!: DiplomaticNonInterventionSystem
  private creatureHarnessMakers!: CreatureHarnessMakersSystem
  private worldKettleHole!: WorldKettleHoleSystem
  private diplomaticReconciliation!: DiplomaticReconciliationSystem
  private creatureVinegarMakers!: CreatureVinegarMakersSystem
  private worldNunatak!: WorldNunatakSystem
  private diplomaticDisarmament!: DiplomaticDisarmamentSystem
  private worldCirque!: WorldCirqueSystem
  private creatureLaceMakers!: CreatureLaceMakersSystem
  private worldArroyo!: WorldArroyoSystem
  private creatureFurriers!: CreatureFurriersSystem
  private worldCoulee!: WorldCouleeSystem
  private diplomaticDetente!: DiplomaticDetenteSystem
  private worldDelta!: WorldDeltaSystem
  private diplomaticRapprochement!: DiplomaticRapprochementSystem
  private creatureBookbinders!: CreatureBookbindersSystem
  private worldEstuary!: WorldEstuarySystem
  private creatureEnamelers!: CreatureEnamelersSystem
  private worldWadi!: WorldWadiSystem
  private creatureUpholsterers!: CreatureUpholsterersSystem
  private worldPeneplain!: WorldPeneplainSystem
  private diplomaticAppeasement!: DiplomaticAppeasementSystem
  private creatureCalderers!: CreatureCalderersSystem
  private worldRavine!: WorldRavineSystem
  private diplomaticEntente!: DiplomaticEntenteSystem
  private creatureScriveners!: CreatureScrivenersSystem
  private worldInselberg!: WorldInselbergSystem
  private diplomaticAccord!: DiplomaticAccordSystem
  private creatureIlluminators!: CreatureIlluminatorsSystem
  private worldGorge!: WorldGorgeSystem
  private diplomaticConcord!: DiplomaticConcordSystem
  private creatureBellMakers!: CreatureBellMakersSystem
  private worldPlaya!: WorldPlayaSystem
  private diplomaticNeutrality!: DiplomaticNeutralitySystem
  private creatureCombMakers!: CreatureCombMakersSystem
  private worldPediment!: WorldPedimentSystem
  private diplomaticSolidarity!: DiplomaticSolidaritySystem
  private creatureNailSmiths!: CreatureNailSmithsSystem
  private worldHogback!: WorldHogbackSystem
  private diplomaticReciprocity!: DiplomaticReciprocitySystem
  private creaturePinMakers!: CreaturePinMakersSystem
  private worldCuesta!: WorldCuestaSystem
  private diplomaticBenevolence!: DiplomaticBenevolenceSystem
  private creatureThimbleMakers!: CreatureThimbleMakersSystem
  private worldFlatiron!: WorldFlatironSystem
  private diplomaticClemency!: DiplomaticClemencySystem
  private creatureAwlMakers!: CreatureAwlMakersSystem
  private worldTepui!: WorldTepuiSystem
  private diplomaticMagnanimity!: DiplomaticMagnanimitySystem
  private creatureBuckleMakers!: CreatureBuckleMakersSystem
  private worldYardang!: WorldYardangSystem
  private diplomaticForbearance!: DiplomaticForbearanceSystem
  private creatureClaspMakers!: CreatureClaspMakersSystem
  private worldVentifact!: WorldVentifactSystem
  private diplomaticLenity!: DiplomaticLenitySystem
  private creatureRivetMakers!: CreatureRivetMakersSystem
  private worldDreikanter!: WorldDreikanterSystem
  private diplomaticAbsolution!: DiplomaticAbsolutionSystem
  private creatureFerruleMakers!: CreatureFerruleMakersSystem
  private worldDeflationHollow!: WorldDeflationHollowSystem
  private diplomaticExoneration!: DiplomaticExonerationSystem
  private creatureGrommetMakers!: CreatureGrommetMakersSystem
  private worldZeugen!: WorldZeugenSystem
  private diplomaticReprieve!: DiplomaticReprieveSystem
  private creatureBobbinMakers!: CreatureBobbinMakersSystem
  private worldInlier!: WorldInlierSystem
  private diplomaticDispensation!: DiplomaticDispensationSystem
  private creatureSpindleMakers!: CreatureSpindleMakersSystem
  private worldOutlier!: WorldOutlierSystem
  private diplomaticRemission!: DiplomaticRemissionSystem
  private creatureShuttleMakers!: CreatureShuttleMakersSystem
  private worldTafoni!: WorldTafoniSystem
  private diplomaticAcquittal!: DiplomaticAcquittalSystem
  private creatureBobbinLaceMakers!: CreatureBobbinLaceMakersSystem
  private worldRockPedestal!: WorldRockPedestalSystem
  private diplomaticImmunity!: DiplomaticImmunitySystem
  private creatureTattingMakers!: CreatureTattingMakersSystem
  private worldBalancingRock!: WorldBalancingRockSystem
  private diplomaticIndulgence!: DiplomaticIndulgenceSystem
  private creatureNettingMakers!: CreatureNettingMakersSystem
  private worldFairyChimney!: WorldFairyChimneySystem
  private diplomaticCommutation!: DiplomaticCommutationSystem
  private creatureFringeMakers!: CreatureFringeMakersSystem
  private worldStoneArch!: WorldStoneArchSystem
  private diplomaticMitigation!: DiplomaticMitigationSystem
  private creatureTasselMakers!: CreatureTasselMakersSystem
  private worldRockBridge!: WorldRockBridgeSystem
  private diplomaticCondonation!: DiplomaticCondonationSystem
  private creatureBraidMakers!: CreatureBraidMakersSystem
  private worldStoneWindow!: WorldStoneWindowSystem
  private diplomaticVindication!: DiplomaticVindicationSystem
  private creatureMacrameMakers!: CreatureMacrameMakersSystem
  private worldRockPillar!: WorldRockPillarSystem
  private diplomaticRehabilitation!: DiplomaticRehabilitationSystem
  private creatureQuiltingMakers!: CreatureQuiltingMakersSystem
  private creatureEmbroideryMakers!: CreatureEmbroideryMakersSystem
  private worldBlowhole2!: WorldBlowhole2System
  private creatureAppliqueMakers!: CreatureAppliqueMakersSystem
  private worldRockShelter!: WorldRockShelterSystem
  private diplomaticReconciliation2!: DiplomaticReconciliation2System
  private creatureSmockingMakers!: CreatureSmockingMakersSystem
  private worldNaturalTunnel!: WorldNaturalTunnelSystem
  private diplomaticAtonement!: DiplomaticAtonementSystem
  private creatureCrochetMakers!: CreatureCrochetMakersSystem
  private worldRockArch2!: WorldRockArch2System
  private diplomaticAbsolution2!: DiplomaticAbsolution2System
  private creatureFeltingMakers!: CreatureFeltingMakersSystem
  private worldSeaCave!: WorldSeaCaveSystem
  private diplomaticAmnesty2!: DiplomaticAmnesty2System
  private creatureBobbinLace2Makers!: CreatureBobbinLace2MakersSystem
  private worldKarstSpring!: WorldKarstSpringSystem
  private diplomaticClemency2!: DiplomaticClemency2System
  private creatureWeavingMakers!: CreatureWeavingMakersSystem
  private worldSinkhole2!: WorldSinkhole2System
  private diplomaticPardon!: DiplomaticPardonSystem
  private creatureDyeingMakers!: CreatureDyeingMakersSystem
  private diplomaticArbitration2!: DiplomaticArbitration2System
  private creatureKnittingMakers!: CreatureKnittingMakersSystem
  private creatureFeltingMakers2!: CreatureFeltingMakers2System
  private worldFumarole!: WorldFumaroleSystem
  private creatureSpinningMakers!: CreatureSpinningMakersSystem
  private creatureLoomMakers!: CreatureLoomMakersSystem
  private worldHotSpring2!: WorldHotSpring2System
  private worldSolfatara!: WorldSolfataraSystem
  private diplomaticIntercession!: DiplomaticIntercessionSystem
  private creatureNeedleworkMakers!: CreatureNeedleworkMakersSystem
  private worldMaar!: WorldMaarSystem
  private diplomaticArbitrement!: DiplomaticArbitrementSystem
  private creatureWarpingMakers!: CreatureWarpingMakersSystem
  private diplomaticCompromise!: DiplomaticCompromiseSystem
  private creatureBobbinWinder!: CreatureBobbinWinderSystem
  private diplomaticDetente2!: DiplomaticDetente2System
  private creatureCardingMakers!: CreatureCardingMakersSystem
  private worldLahar!: WorldLaharSystem
  private creatureFullingMakers!: CreatureFullingMakersSystem
  private worldPyroclasticFlow!: WorldPyroclasticFlowSystem
  private diplomaticEntente2!: DiplomaticEntente2System
  private creatureTatamiMakers!: CreatureTatamiMakersSystem
  private worldPhreaticExplosion!: WorldPhreaticExplosionSystem
  private diplomaticAccommodation!: DiplomaticAccommodationSystem
  private creatureSilkWeaver!: CreatureSilkWeaverSystem
  private diplomaticConcordat!: DiplomaticConcordatSystem
  private worldMudPot!: WorldMudPotSystem
  private creaturePotter!: CreaturePotterSystem
  private worldSteamVent!: WorldSteamVentSystem
  private creatureBasketWeaver!: CreatureBasketWeaverSystem
  private worldTravertine!: WorldTravertineSystem
  private diplomaticMutualAid!: DiplomaticMutualAidSystem
  private worldGeyserite!: WorldGeyseriteSystem
  private worldSinter!: WorldSinterSystem
  private creatureHornworker!: CreatureHornworkerSystem
  private worldTufa!: WorldTufaSystem
  private creatureScabbardMaker!: CreatureScabbardMakerSystem
  private worldSiliceousSinter!: WorldSiliceousSinterSystem
  private diplomaticDominion!: DiplomaticDominionSystem
  private creatureQuiverMaker!: CreatureQuiverMakerSystem
  private worldHotPool!: WorldHotPoolSystem
  private diplomaticCommonwealth!: DiplomaticCommonwealthSystem
  private worldGeothermalPool!: WorldGeothermalPoolSystem
  private creatureStringMaker!: CreatureStringMakerSystem
  private worldFumarolicField!: WorldFumarolicFieldSystem
  private diplomaticHegemony!: DiplomaticHegemonySystem
  private worldMineralSpring!: WorldMineralSpringSystem
  private diplomaticSuzerainty!: DiplomaticSuzeraintySystem
  private creatureRopeWalker!: CreatureRopeWalkerSystem
  private worldThermalSpring!: WorldThermalSpringSystem
  private diplomaticAutonomy!: DiplomaticAutonomySystem
  private creatureHarnessmaker!: CreatureHarnessmakerSystem
  private worldSodaSpring!: WorldSodaSpringSystem
  private diplomaticVassalage!: DiplomaticVassalageSystem
  private worldArtesianWell!: WorldArtesianWellSystem
  private creatureBridlemaker!: CreatureBridlemakerSystem
  private worldChalybeateSpring!: WorldChalybeateSpringSystem
  private diplomaticImperium!: DiplomaticImperiumSystem
  private creatureYokemaker!: CreatureYokemakerSystem
  private worldSulfurSpring!: WorldSulfurSpringSystem
  private diplomaticMandate!: DiplomaticMandateSystem
  private creaturePlowright!: CreaturePlowrightSystem
  private worldLithiumSpring!: WorldLithiumSpringSystem
  private diplomaticRegency!: DiplomaticRegencySystem
  private creatureAnvilsmith!: CreatureAnvilsmithSystem
  private worldRadiumSpring!: WorldRadiumSpringSystem
  private diplomaticStewardship!: DiplomaticStewardshipSystem
  private creatureToolsmith!: CreatureToolsmithSystem
  private worldBorateSpring!: WorldBorateSpringSystem
  private diplomaticCustodianship!: DiplomaticCustodianshipSystem
  private creatureNailsmith!: CreatureNailsmithSystem
  private worldSeleniumSpring!: WorldSeleniumSpringSystem
  private diplomaticTrusteeship!: DiplomaticTrusteeshipSystem
  private worldMagnesiumSpring!: WorldMagnesiumSpringSystem
  private diplomaticGuardianship!: DiplomaticGuardianshipSystem
  private creatureChainmaker!: CreatureChainmakerSystem
  private worldPotassiumSpring!: WorldPotassiumSpringSystem
  private diplomaticPatronage!: DiplomaticPatronageSystem
  private creatureBellfounder!: CreatureBellfounderSystem
  private worldStrontiumSpring!: WorldStrontiumSpringSystem
  private diplomaticStewardshipPact!: DiplomaticStewardshipPactSystem
  private creatureGirdler!: CreatureGirdlerSystem
  private worldBariumSpring!: WorldBariumSpringSystem
  private diplomaticConservatorship!: DiplomaticConservatorshipSystem
  private creaturePewterer!: CreaturePewtererSystem
  private worldZincSpring!: WorldZincSpringSystem
  private diplomaticReceivership!: DiplomaticReceivershipSystem
  private creatureWiredrawer!: CreatureWiredrawerSystem
  private worldCopperSpring!: WorldCopperSpringSystem
  private diplomaticProcuratorship!: DiplomaticProcuratorshipSystem
  private creatureGlazierMaster!: CreatureGlazierMasterSystem
  private worldManganeseSpring!: WorldManganeseSpringSystem
  private diplomaticPrefecture!: DiplomaticPrefectureSystem
  private creatureRiveter!: CreatureRiveterSystem
  private worldTinSpring!: WorldTinSpringSystem
  private diplomaticVicarage!: DiplomaticVicarageSystem
  private creatureSmelter!: CreatureSmelterSystem
  private worldIridiumSpring!: WorldIridiumSpringSystem
  private diplomaticSeneschalry!: DiplomaticSeneschalrySystem
  private creaturePuddler!: CreaturePuddlerSystem
  private worldOsmiumSpring!: WorldOsmiumSpringSystem
  private diplomaticChatelaincy!: DiplomaticChatelaincySystem
  private creatureAssayer!: CreatureAssayerSystem
  private worldRutheniumSpring!: WorldRutheniumSpringSystem
  private diplomaticCastellany!: DiplomaticCastellanySystem
  private creatureWelder!: CreatureWelderSystem
  private worldNiobiumSpring!: WorldNiobiumSpringSystem
  private diplomaticBailiffry!: DiplomaticBailiffrySystem
  private creatureRoller!: CreatureRollerSystem
  private worldTantalumSpring!: WorldTantalumSpringSystem
  private diplomaticSheriffalty!: DiplomaticSheriffaltySystem
  private creatureDrawer!: CreatureDrawerSystem
  private worldHafniumSpring!: WorldHafniumSpringSystem
  private diplomaticCoroner!: DiplomaticCoronerSystem
  private creatureSpinner!: CreatureSpinnerSystem
  private worldZirconiumSpring!: WorldZirconiumSpringSystem
  private diplomaticEscheator!: DiplomaticEscheatorSystem
  private creatureFurbisher!: CreatureFurbisherSystem
  private worldIndiumSpring!: WorldIndiumSpringSystem
  private diplomaticAlmoner!: DiplomaticAlmonerSystem
  private creatureTinplater!: CreatureTinplaterSystem
  private worldGalliumSpring!: WorldGalliumSpringSystem
  private diplomaticPurveyor!: DiplomaticPurveyorSystem
  private creatureAnnealer!: CreatureAnnealerSystem
  private worldGermaniumSpring!: WorldGermaniumSpringSystem
  private diplomaticHarbinger!: DiplomaticHarbingerSystem
  private creatureBurnisher!: CreatureBurnisherSystem
  private worldThalliumSpring!: WorldThalliumSpringSystem
  private diplomaticVerderer!: DiplomaticVerdererSystem
  private creatureSwager!: CreatureSwagerSystem
  private worldScandiumSpring!: WorldScandiumSpringSystem
  private diplomaticHayward!: DiplomaticHaywardSystem
  private creatureStamper!: CreatureStamperSystem
  private worldYttriumSpring!: WorldYttriumSpringSystem
  private diplomaticPannager!: DiplomaticPannagerSystem
  private creatureForger!: CreatureForgerSystem
  private worldLanthanumSpring!: WorldLanthanumSpringSystem
  private diplomaticAgister!: DiplomaticAgisterSystem
  private creatureHammerman!: CreatureHammermanSystem
  private worldCeriumSpring!: WorldCeriumSpringSystem
  private diplomaticWoodward!: DiplomaticWoodwardSystem
  private creaturePeener!: CreaturePeenerSystem
  private worldPraseodymiumSpring!: WorldPraseodymiumSpringSystem
  private diplomaticWarrener!: DiplomaticWarrenerSystem
  private creaturePlanisher!: CreaturePlanisherSystem
  private worldNeodymiumSpring!: WorldNeodymiumSpringSystem
  private diplomaticParkward!: DiplomaticParkwardSystem
  private creatureBeveller!: CreatureBevellerSystem
  private worldSamariumSpring!: WorldSamariumSpringSystem
  private diplomaticWoodreve!: DiplomaticWoodreveSystem
  private creatureFlatter!: CreatureFlatterSystem
  private worldEuropiumSpring!: WorldEuropiumSpringSystem
  private diplomaticRanger!: DiplomaticRangerSystem
  private creatureChiseller!: CreatureChisellerSystem
  private worldGadoliniumSpring!: WorldGadoliniumSpringSystem
  private diplomaticForestar!: DiplomaticForestarSystem
  private creatureKnurler!: CreatureKnurlerSystem
  private worldTerbiumSpring!: WorldTerbiumSpringSystem
  private diplomaticWaynward!: DiplomaticWaynwardSystem
  private creatureReamer!: CreatureReamerSystem
  private worldDysprosiumSpring!: WorldDysprosiumSpringSystem
  private diplomaticMootman!: DiplomaticMootmanSystem
  private creatureBroacher!: CreatureBroacherSystem
  private worldHolmiumSpring!: WorldHolmiumSpringSystem
  private diplomaticTithingman!: DiplomaticTithingmanSystem
  private creatureHoner!: CreatureHonerSystem
  private worldErbiumSpring!: WorldErbiumSpringSystem
  private diplomaticHayreve!: DiplomaticHayreveSystem
  private creatureLapper!: CreatureLapperSystem
  private worldThuliumSpring!: WorldThuliumSpringSystem
  private diplomaticPinder!: DiplomaticPinderSystem
  private creatureBorer!: CreatureBorerSystem
  private worldYtterbiumSpring!: WorldYtterbiumSpringSystem
  private diplomaticGrithman!: DiplomaticGrithmanSystem
  private creatureCountersinker!: CreatureCountersinkerSystem
  private worldLutetiumSpring!: WorldLutetiumSpringSystem
  private diplomaticBorsholder!: DiplomaticBorsholderSystem
  private creatureSpotfacer!: CreatureSpotfacerSystem
  private worldActiniumSpring!: WorldActiniumSpringSystem
  private diplomaticAletaster!: DiplomaticAletasterSystem
  private creatureTapper!: CreatureTapperSystem
  private worldThoriumSpring!: WorldThoriumSpringSystem
  private diplomaticBreadweigher!: DiplomaticBreadweigherSystem
  private creatureCoiner!: CreatureCoinerSystem
  private worldProtactiniumSpring!: WorldProtactiniumSpringSystem
  private diplomaticMuragers!: DiplomaticMuragersSystem
  private creatureSwageBlocker!: CreatureSwageBlockerSystem
  private worldUraniumSpring!: WorldUraniumSpringSystem
  private diplomaticGarthman!: DiplomaticGarthmanSystem
  private creatureDrifter!: CreatureDrifterSystem
  private diplomaticCrier!: DiplomaticCrierSystem
  private worldPoloniumSpring!: WorldPoloniumSpringSystem
  private diplomaticBeadle!: DiplomaticBeadleSystem
  private creatureUpsetter!: CreatureUpsetterSystem
  private worldFranciumSpring!: WorldFranciumSpringSystem
  private diplomaticHerbalist!: DiplomaticHerbalistSystem
  private creatureSwedger!: CreatureSwedgerSystem
  private worldRadonSpring!: WorldRadonSpringSystem
  private diplomaticLampwarden!: DiplomaticLampwardenSystem
  private creatureBurnOuter!: CreatureBurnOuterSystem
  private worldAstatineSpring!: WorldAstatineSpringSystem
  private diplomaticClavigers!: DiplomaticClavigersSystem
  private creatureScriber!: CreatureScriberSystem
  private worldCaesiumSpring!: WorldCaesiumSpringSystem
  private diplomaticPavior!: DiplomaticPaviorSystem
  private creatureStaker!: CreatureStakerSystem
  private worldRubidiumSpring!: WorldRubidiumSpringSystem
  private diplomaticWainage!: DiplomaticWainageSystem
  private creaturePlanisherMaster!: CreaturePlanisherMasterSystem
  private worldTelluriumSpring!: WorldTelluriumSpringSystem
  private diplomaticGarble!: DiplomaticGarbleSystem
  private creatureNeedler!: CreatureNeedlerSystem
  private worldXenonSpring!: WorldXenonSpringSystem
  private diplomaticTollbooth!: DiplomaticTollboothSystem
  private canvas: HTMLCanvasElement
  private minimapCanvas: HTMLCanvasElement
  private speed: number = 1
  private lastTime: number = 0
  private accumulator: number = 0
  private readonly tickRate: number = 1000 / 60
  private fps: number = 0
  private frameCount: number = 0
  private fpsTime: number = 0

  // GC optimization: reusable buffers for hot render path
  private _politicalData: { color: string; territory: Set<number> }[] = []
  private _politicalSets: Set<number>[] = []
  private _musicState = { isNight: false, atWar: false, disasterActive: false, isEpic: false, isRaining: false }
  private _fogCivId: number | undefined = undefined
  private _fogCallback = (x: number, y: number): 0 | 1 | 2 => {
    if (this._fogCivId === undefined) return 2
    const alpha = this.fogOfWarSystem.getFogAlpha(this._fogCivId, x, y)
    return (alpha > 0.6 ? 0 : alpha > 0.2 ? 1 : 2) as 0 | 1 | 2
  }
  private _minimapRect = { left: 0, top: 0 }
  private _minimapRectDirty = true
  private _minimapOverlayData = {
    political: this._politicalData, population: [] as never[], military: [] as never[], resources: [] as never[],
    worldWidth: 0, worldHeight: 0
  }
  private _clonePositions: { x: number; y: number; generation: number }[] = []

  // Pre-allocated buffers for GC-free tick paths
  private _ambientSoundParams = { isNight: false, season: 'spring' as string, weather: 'clear' as string, nearestBattleDist: 999, nearestCityDist: 999, cameraZoom: 1 }
  private _fogUnits: { x: number; y: number; visionRange: number }[] = []
  private _fogUnitsBuf: { x: number; y: number; visionRange: number }[] = []
  private _cloneEntities: { id: number; isClone: boolean; health: number; maxHealth: number; age: number }[] = []
  private _cloneEntitiesBuf: { id: number; isClone: boolean; health: number; maxHealth: number; age: number }[] = []
  private _achSpeciesSet = new Set<string>()
  private _achStats: AchContentWorldStats = { totalCreatures: 0, speciesSet: new Set<string>(), maxCityPop: 0, filledTilePercent: 0, hasIsland: false, totalKills: 0, extinctSpecies: _EMPTY_ARRAY as unknown as string[], scorchedTiles: 0, disastersLast60Ticks: 0, nukeUsed: false, civsMet: 0, activeTradeRoutes: 0, maxEra: 'stone', peaceTicks: 0, maxTerritoryPercent: 0, totalCombats: 0, shipCount: 0, citiesCaptured: 0, maxHeroLevel: 0, maxArmySize: 0, volcanoEruptions: 0, waterTilesCreatedAtOnce: 0, diseasedCivs: 0, evolutionEvents: 0, coexistSpecies: 0, coexistTicks: 0, totalTicks: 0, exploredPercent: 0, totalCivs: 0, totalWars: 0, clonedCreatures: 0, portalPairs: 0 }
  private _civValuesBuf: any[] = []
  private _cultureCivBuf: { id: number; neighbors: number[]; tradePartners: number[]; population: number }[] = []
  private _miningCivRace = new Map<number, string>()
  private _miningCivBuf: { id: number; cities: { x: number; y: number }[]; techLevel: number; race: string }[] = []
  private _siegeSoldiersBuf: number[] = []

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement

    this.world = new World()
    this.camera = new Camera(window.innerWidth, window.innerHeight)
    this.renderer = new Renderer(this.canvas, this.minimapCanvas)
    this.input = new Input(this.canvas, this.camera)

    this.em = new EntityManager()
    this.creatureFactory = new CreatureFactory(this.em)
    this.civManager = new CivManager(this.em, this.world)
    this.particles = new ParticleSystem()
    this.audio = new SoundSystem()
    this.spatialHash = new SpatialHashSystem(16)
    this.aiSystem = new AISystem(this.em, this.world, this.particles, this.creatureFactory, this.spatialHash)
    this.combatSystem = new CombatSystem(this.em, this.civManager, this.particles, this.audio, this.spatialHash)
    this.weather = new WeatherSystem(this.world, this.particles, this.em)
    this.resources = new ResourceSystem(this.world, this.em, this.civManager, this.particles)
    this.achievements = new AchievementSystem()
    this.disasterSystem = new DisasterSystem(this.world, this.particles, this.em)
    this.timeline = new TimelineSystem()
    this.techSystem = new TechSystem()
    this.migrationSystem = new MigrationSystem()
    this.artifactSystem = new ArtifactSystem()
    this.diseaseSystem = new DiseaseSystem()
    this.worldEventSystem = new WorldEventSystem()
    this.caravanSystem = new CaravanSystem()
    this.diplomacySystem = new DiplomacySystem()
    this.cropSystem = new CropSystem()
    this.navalSystem = new NavalSystem()
    this.questSystem = new QuestSystem()
    this.buildingUpgradeSystem = new BuildingUpgradeSystem()
    this.ecosystemSystem = new EcosystemSystem()
    this.fogOfWarSystem = new FogOfWarSystem()
    this.religionSystem = new ReligionSystem()
    this.ambientParticles = new AmbientParticleSystem()
    this.cityPlanningSystem = new CityPlanningSystem()
    this.armySystem = new ArmySystem()
    this.eraSystem = new EraSystem()
    this.tradeEconomySystem = new TradeEconomySystem()
    this.heroLegendSystem = new HeroLegendSystem()
    this.wonderSystem = new WonderSystem()
    this.toastSystem = new ToastSystem()
    new TickBudgetSystem()
    this.loyaltySystem = new LoyaltySystem()
    this.biomeEvolution = new BiomeEvolutionSystem()
    this.espionageSystem = new EspionageSystem()
    this.dayNightRenderer = new DayNightRenderer()
    this.godPowerSystem = new GodPowerSystem()
    this.worldChronicle = new WorldChronicleSystem()
    this.cultureSystem = new CultureSystem()
    this.musicSystem = new MusicSystem()
    this.miningSystem = new MiningSystem()
    this.miningSystem.generateOreMap(this.world.tiles)
    this.disasterChainSystem = new DisasterChainSystem()
    this.disasterChainSystem.setCallbacks({
      triggerEarthquake: (x, y, mag) => {
        const r = Math.ceil(mag * 0.8)
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            if (Math.random() < 0.15) this.world.setTile(tx, ty, TileType.MOUNTAIN)
          }
        }
        this.particles.spawnExplosion(x, y)
      },
      triggerTsunami: (x, y, mag) => {
        const r = Math.ceil(mag * 1.5)
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            const tile = this.world.getTile(tx, ty)
            if (tile === TileType.SAND || tile === TileType.GRASS) {
              if (Math.random() < 0.3) this.world.setTile(tx, ty, TileType.SHALLOW_WATER)
            }
          }
        }
        this.particles.spawnRain(x, y)
      },
      triggerWildfire: (x, y, _mag) => {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            if (this.world.getTile(tx, ty) === TileType.FOREST && Math.random() < 0.2) {
              this.world.setTile(tx, ty, TileType.SAND)
            }
          }
        }
      },
      triggerDesertification: (x, y, radius) => {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            const tile = this.world.getTile(tx, ty)
            if ((tile === TileType.GRASS || tile === TileType.FOREST) && Math.random() < 0.15) {
              this.world.setTile(tx, ty, TileType.SAND)
            }
          }
        }
      },
      triggerDiseaseOutbreak: (x, y, _mag) => {
        const creatures = this.em.getEntitiesWithComponents('position', 'creature', 'needs')
        for (const id of creatures) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')
          if (!pos) continue
          if (Math.abs(pos.x - x) < 8 && Math.abs(pos.y - y) < 8) {
            if (Math.random() < 0.3 && !this.em.getComponent(id, 'disease')) {
              this.em.addComponent(id, { type: 'disease', diseaseType: 'fever', severity: 3, duration: 0, contagious: true, immune: false, immuneUntil: 0 })
            }
          }
        }
      },
      triggerBuildingDamage: (x, y, radius, severity) => {
        const buildings = this.em.getEntitiesWithComponents('position', 'building')
        for (const id of buildings) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')
          if (!pos) continue
          if (Math.abs(pos.x - x) <= radius && Math.abs(pos.y - y) <= radius) {
            if (Math.random() < severity) this.em.removeEntity(id)
          }
        }
      },
      triggerCooling: (_mag) => { /* temperature handled internally */ },
      triggerCropFailure: (x, y, radius, severity) => {
        const crops = this.em.getEntitiesWithComponents('position', 'crop')
        for (const id of crops) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')
          if (!pos) continue
          if (Math.abs(pos.x - x) <= radius && Math.abs(pos.y - y) <= radius) {
            if (Math.random() < severity) this.em.removeEntity(id)
          }
        }
      },
      setTileAt: (x, y, stage) => {
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return
        const current = this.world.getTile(x, y)
        if (stage === 1 && current === TileType.LAVA) this.world.setTile(x, y, TileType.MOUNTAIN)
        else if (stage === 3 && current === TileType.MOUNTAIN) this.world.setTile(x, y, TileType.GRASS)
      },
      isWaterNear: (x, y, radius) => {
        for (let dy = -radius; dy <= radius; dy += 3) {
          for (let dx = -radius; dx <= radius; dx += 3) {
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            const t = this.world.getTile(tx, ty)
            if (t === TileType.DEEP_WATER || t === TileType.SHALLOW_WATER) return true
          }
        }
        return false
      },
      countForestTiles: () => {
        let count = 0
        for (let y = 0; y < WORLD_HEIGHT; y += 4) {
          for (let x = 0; x < WORLD_WIDTH; x += 4) {
            if (this.world.getTile(x, y) === TileType.FOREST) count++
          }
        }
        return count * 16
      },
      countTotalLand: () => {
        let count = 0
        for (let y = 0; y < WORLD_HEIGHT; y += 4) {
          for (let x = 0; x < WORLD_WIDTH; x += 4) {
            const t = this.world.getTile(x, y)
            if (t !== TileType.DEEP_WATER && t !== TileType.SHALLOW_WATER && t !== null) count++
          }
        }
        return count * 16
      },
      getSpeciesCounts: () => {
        const counts = new Map<string, number>()
        const creatures = this.em.getEntitiesWithComponents('creature')
        for (const id of creatures) {
          const c = this.em.getComponent<CreatureComponent>(id, 'creature')
          if (!c) continue
          counts.set(c.species, (counts.get(c.species) || 0) + 1)
        }
        return counts
      },
      countWarZones: () => {
        let wars = 0
        for (const [, civ] of this.civManager.civilizations) {
          if (civ.diplomaticStance === 'aggressive') wars++
        }
        return Math.floor(wars / 2)
      },
    })
    this.seasonSystem = new SeasonSystem()
    this.animalMigration = new AnimalMigrationSystem()
    this.volcanoSystem = new VolcanoSystem()
    this.volcanoSystem.autoPlaceVolcanoes(this.world)
    this.riverSystem = new RiverSystem()
    this.riverSystem.generateRivers(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.tradeRouteRenderer = new TradeRouteRenderer()
    this.ruinsSystem = new RuinsSystem()
    this.plagueVisual = new PlagueVisualSystem()
    this.worldDecorations = new WorldDecorationSystem()
    this.worldDecorations.generate(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.eraVisual = new EraVisualSystem()
    this.weatherDisaster = new WeatherDisasterSystem()
    this.fogOfWar = new FogOfWarRenderer()
    this.fortificationRenderer = new FortificationRenderer()
    this.evolutionSystem = new EvolutionSystem()
    this.populationSystem = new PopulationSystem()
    this.allianceSystem = new AllianceSystem()
    this.terraformingSystem = new TerraformingSystem()
    this.statisticsTracker = new StatisticsTracker()
    this.objectPool = new ObjectPoolSystem()
    this.minimapOverlay = new MinimapOverlaySystem()
    this.portalSystem = new PortalSystem()
    this.waterAnimation = new WaterAnimationSystem()
    this.minimapSystem = new MinimapSystem(this.world.width, this.world.height)
    this.formationSystem = new FormationSystem()
    this.achievementContent = new AchievementContentSystem()
    this.chartPanel = new ChartPanelSystem()
    this.clonePower = new ClonePowerSystem()
    this.siegeWarfare = new SiegeWarfareSystem()
    this.tutorial = new TutorialSystem()
    this.renderCulling = new RenderCullingSystem()
    this.reputationSystem = new ReputationSystem()
    this.siegeSystem = new SiegeSystem()
    this.disasterWarning = new DisasterWarningSystem()
    this.moodSystem = new MoodSystem()
    this.worldAge = new WorldAgeSystem()
    this.helpOverlay = new HelpOverlaySystem()
    this.bloodMoon = new BloodMoonSystem()
    this.creatureAging = new CreatureAgingSystem()
    this.resourceScarcity = new ResourceScarcitySystem()
    this.legendaryBattle = new LegendaryBattleSystem()
    this.worldBorder = new WorldBorderSystem()
    this.enhancedTooltip = new EnhancedTooltipSystem()
    this.navalCombat = new NavalCombatSystem()
    this.religionSpread = new ReligionSpreadSystem()
    new GeneticDisplaySystem()
    this.lodRender = new LODRenderSystem()
    this.buildingVariety = new BuildingVarietySystem()
    this.historyReplay = new HistoryReplaySystem()
    this.seasonVisual = new SeasonVisualSystem()
    this.tradeFleet = new TradeFleetSystem()
    this.worldDashboard = new WorldDashboardSystem()
    this.unifiedParticles = new UnifiedParticleSystem()
    this.weatherParticles = new WeatherParticleSystem()
    this.diplomacyVisual = new DiplomacyVisualSystem()
    this.eventNotification = new EventNotificationSystem()
    this.editorEnhanced = new EditorEnhancedSystem()
    this.fogEnhanced = new FogOfWarEnhanced()
    this.battleReplay = new BattleReplaySystem()
    this.evolutionVisual = new EvolutionVisualSystem()
    this.achievementPopup = new AchievementPopupSystem()
    this.minimapEnhanced = new MinimapEnhancedSystem()
    this.ambientSound = new AmbientSoundMixer()
    this.mapGen = new MapGenSystem()
    this.flocking = new FlockingSystem()
    this.autoSave = new AutoSaveSystem()
    this.perfMonitor = new PerformanceMonitorSystem()
    this.worldSeed = new WorldSeedSystem()
    this.keybindSystem = new KeybindSystem()
    this.worldExport = new WorldExportSystem()
    this.screenshotMode = new ScreenshotModeSystem()
    this.entitySearch = new EntitySearchSystem()
    this.worldStatsOverview = new WorldStatsOverviewSystem()
    this.notificationCenter = new NotificationCenterSystem()
    this.sandboxSettings = new SandboxSettingsSystem()
    this.minimapMode = new MiniMapModeSystem()
    this.cameraBookmarks = new CameraBookmarkSystem()
    this.entityInspector = new EntityInspectorSystem()
    this.speedIndicator = new SpeedIndicatorSystem()
    this.achievementProgress = new AchievementProgressSystem()
    this.cameraAnimation = new CameraAnimationSystem()
    this.cityLayout = new CityLayoutSystem()
    this.customSpecies = new CustomSpeciesSystem()
    this.eraTransition = new EraTransitionSystem()
    this.mapMarker = new MapMarkerSystem()
    this.terrainDecoration = new TerrainDecorationSystem()
    this.timeRewind = new TimeRewindSystem()
    this.weatherControl = new WeatherControlSystem()
    this.worldEventTimeline = new WorldEventTimelineSystem()
    this.resourceFlow = new ResourceFlowSystem()
    this.creatureEmotion = new CreatureEmotionSystem()
    this.powerFavorite = new PowerFavoriteSystem()
    this.worldHeatmap = new WorldHeatmapSystem()
    this.zoneManagement = new ZoneManagementSystem()
    this.creatureLineage = new CreatureLineageSystem()
    this.worldLaw = new WorldLawSystem()
    this.miniGame = new MiniGameSystem()
    this.cinematicMode = new CinematicModeSystem()
    this.creatureMemory = new CreatureMemorySystem()
    this.pollution = new PollutionSystem()
    this.prophecy = new ProphecySystem()
    this.creatureSkill = new CreatureSkillSystem()
    this.worldNarrator = new WorldNarratorSystem()
    this.mythology = new MythologySystem()
    this.creatureTaming = new CreatureTamingSystem()
    this.plagueMutation = new PlagueMutationSystem()
    this.monument = new MonumentSystem()
    this.creaturePersonality = new CreaturePersonalitySystem()
    this.tradeNegotiation = new TradeNegotiationSystem()
    this.creatureDream = new CreatureDreamSystem()
    this.disasterRecovery = new NaturalDisasterRecoverySystem()
    this.creatureFame = new CreatureFameSystem()
    this.migrationWave = new WorldMigrationWaveSystem()
    this.creatureRivalry = new CreatureRivalrySystem()
    this.worldCorruption = new WorldCorruptionSystem()
    this.creatureProfession = new CreatureProfessionSystem()
    this.diplomaticSummit = new DiplomaticSummitSystem()
    this.worldLeyLine = new WorldLeyLineSystem()
    this.creatureBounty = new CreatureBountySystem()
    this.seasonFestival = new SeasonFestivalSystem()
    this.creatureMutation = new CreatureMutationSystem()
    this.diplomaticMarriage = new DiplomaticMarriageSystem()
    this.worldRelic = new WorldRelicSystem()
    this.creatureAncestor = new CreatureAncestorSystem()
    this.worldAnomaly = new WorldAnomalySystem()
    this.creatureApprentice = new CreatureApprenticeSystem()
    this.diplomaticSanction = new DiplomaticSanctionSystem()
    this.worldMythicBeast = new WorldMythicBeastSystem()
    this.creatureGuild = new CreatureGuildSystem()
    this.worldSeasonalDisaster = new WorldSeasonalDisasterSystem()
    this.creatureReputation = new CreatureReputationSystem()
    this.diplomaticEspionage = new DiplomaticEspionageSystem()
    this.worldAncientRuin = new WorldAncientRuinSystem()
    this.creatureHobby = new CreatureHobbySystem()
    this.worldNaturalWonder = new WorldNaturalWonderSystem()
    this.creatureLanguage = new CreatureLanguageSystem()
    this.diplomaticTribute = new DiplomaticTributeSystem()
    this.worldWeatherFront = new WorldWeatherFrontSystem()
    this.worldWeatherFront.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.creatureTradeSkill = new CreatureTradeSkillSystem()
    this.worldSacredGrove = new WorldSacredGroveSystem()
    this.creatureAlliance = new CreatureAllianceSystem()
    this.diplomaticPropaganda = new DiplomaticPropagandaSystem()
    this.worldTidal = new WorldTidalSystem()
    this.worldTidal.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.creatureSuperstition = new CreatureSuperstitionSystem()
    this.worldMagicStorm = new WorldMagicStormSystem()
    this.worldMagicStorm.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.creatureAmbition = new CreatureAmbitionSystem()
    this.diplomaticCouncil = new DiplomaticCouncilSystem()
    this.worldFertility = new WorldFertilitySystem()
    this.creatureFashion = new CreatureFashionSystem()
    this.diplomaticHostage = new DiplomaticHostageSystem()
    this.worldErosion = new WorldErosionSystem()
    this.worldErosion.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.creaturePet = new CreaturePetSystem()
    this.worldCrystalFormation = new WorldCrystalFormationSystem()
    this.creatureRitual = new CreatureRitualSystem()
    this.diplomaticExile = new DiplomaticExileSystem()
    this.worldMigrationRoute = new WorldMigrationRouteSystem()
    this.worldMigrationRoute.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.worldVolcanic = new WorldVolcanicSystem()
    this.worldVolcanic.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.worldAcoustic = new WorldAcousticSystem()
    this.worldAcoustic.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.creatureNostalgia = new CreatureNostalgiaSystem()
    this.worldUnderground = new WorldUndergroundSystem()
    this.diplomaticBlockade = new DiplomaticBlockadeSystem()
    this.creatureInvention = new CreatureInventionSystem()
    this.worldAurora = new WorldAuroraSystem()
    this.creaturePhobia = new CreaturePhobiaSystem()
    this.worldGeothermal = new WorldGeothermalSystem()
    this.diplomaticFederation = new DiplomaticFederationSystem()
    this.creatureArt = new CreatureArtSystem()
    this.worldMiasma = new WorldMiasmaSystem()
    this.creatureTotem = new CreatureTotemSystem()
    this.worldFossil = new WorldFossilSystem()
    this.diplomaticSpy = new DiplomaticSpySystem()
    this.creatureDance = new CreatureDanceSystem()
    this.worldBeacon = new WorldBeaconSystem()
    this.worldTectonic = new WorldTectonicSystem()
    this.creatureMentor = new CreatureMentorSystem()
    this.worldEcho = new WorldEchoSystem()
    this.creatureTrauma = new CreatureTraumaSystem()
    this.worldOasis = new WorldOasisSystem()
    this.diplomaticCeremony = new DiplomaticCeremonySystem()
    this.creatureMigrationMemory = new CreatureMigrationMemorySystem()
    this.worldPetrification = new WorldPetrificationSystem()
    this.worldMaelstrom = new WorldMaelstromSystem()
    this.creatureRivalryDuel = new CreatureRivalryDuelSystem()
    this.worldCoralReef = new WorldCoralReefSystem()
    this.worldSandstorm = new WorldSandstormSystem()
    this.creatureCollection = new CreatureCollectionSystem()
    this.worldRift = new WorldRiftSystem()
    this.creatureVision = new CreatureVisionSystem()
    this.worldAvalanche = new WorldAvalancheSystem()
    this.diplomaticAsylum = new DiplomaticAsylumSystem()
    this.creatureForaging = new CreatureForagingSystem()
    this.worldWhirlpool = new WorldWhirlpoolSystem()
    this.creatureOath = new CreatureOathSystem()
    this.worldAuroraStorm = new WorldAuroraStormSystem()
    this.diplomaticEmbargo = new DiplomaticEmbargoSystem()
    this.creatureLegacy = new CreatureLegacySystem()
    this.worldMemorial = new WorldMemorialSystem()
    this.worldTidePool = new WorldTidePoolSystem()
    this.creatureDivination = new CreatureDivinationSystem()
    this.diplomaticSuccession = new DiplomaticSuccessionSystem()
    this.worldMeteorShower = new WorldMeteorShowerSystem()
    this.creatureBeastMaster = new CreatureBeastMasterSystem()
    this.worldGlacier = new WorldGlacierSystem()
    this.creatureRumor = new CreatureRumorSystem()
    this.diplomaticTradeAgreement = new DiplomaticTradeAgreementSystem()
    this.worldPurification = new WorldPurificationSystem()
    this.creatureNightWatch = new CreatureNightWatchSystem()
    this.creatureBarter = new CreatureBarterSystem()
    this.worldGeyser = new WorldGeyserSystem()
    this.worldQuicksand = new WorldQuicksandSystem()
    this.creatureIntuition = new CreatureIntuitionSystem()
    this.worldComet = new WorldCometSystem()
    this.creatureExile = new CreatureExileSystem()
    this.worldHotSpring = new WorldHotSpringSystem()
    this.creatureNickname = new CreatureNicknameSystem()
    this.worldEclipse = new WorldEclipseSystem()
    this.creatureGrudge = new CreatureGrudgeSystem()
    this.worldSinkhole = new WorldSinkholeSystem()
    this.diplomaticCensus = new DiplomaticCensusSystem()
    this.creatureSleepwalk = new CreatureSleepwalkSystem()
    this.worldRainbow = new WorldRainbowSystem()
    this.creatureTattoo = new CreatureTattooSystem()
    this.worldDustStorm = new WorldDustStormSystem()
    this.diplomaticWarReparation = new DiplomaticWarReparationSystem()
    this.creatureClaustrophobia = new CreatureClaustrophobiaSystem()
    this.worldBioluminescence = new WorldBioluminescenceSystem()
    this.creaturePilgrimage = new CreaturePilgrimageSystem()
    this.worldPermafrost = new WorldPermafrostSystem()
    this.diplomaticCulturalExchange = new DiplomaticCulturalExchangeSystem()
    this.creatureSomniloquy = new CreatureSomniloquySystem()
    this.worldTidalWave = new WorldTidalWaveSystem()
    this.creatureOmenBelief = new CreatureOmenBeliefSystem()
    this.worldMudslide = new WorldMudslideSystem()
    this.diplomaticPledge = new DiplomaticPledgeSystem()
    this.creatureAmbidextrity = new CreatureAmbidextritySystem()
    this.worldKelpForest = new WorldKelpForestSystem()
    this.creatureHandicraft = new CreatureHandicraftSystem()
    this.worldGeothermalVent = new WorldGeothermalVentSystem()
    this.diplomaticTariff = new DiplomaticTariffSystem()
    this.creatureHomesickness = new CreatureHomesicknessSystem()
    this.worldMirage = new WorldMirageSystem()
    this.creatureLullaby = new CreatureLullabySystem()
    this.diplomaticMediation = new DiplomaticMediationSystem()
    this.creatureCalligraphy = new CreatureCalligraphySystem()
    this.worldFogBank = new WorldFogBankSystem()
    this.creatureFermentation = new CreatureFermentationSystem()
    this.creatureVentriloquism = new CreatureVentriloquismSystem()
    this.worldDustDevil = new WorldDustDevilSystem()
    this.creaturePottery = new CreaturePotterySystem()
    this.worldMangrove = new WorldMangroveSystem()
    this.diplomaticPeaceTreaty = new DiplomaticPeaceTreatySystem()
    this.creatureEcholocation = new CreatureEcholocationSystem()
    this.worldBallLightning = new WorldBallLightningSystem()
    this.creatureWeaving = new CreatureWeavingSystem()
    this.worldCrystalCave = new WorldCrystalCaveSystem()
    this.diplomaticTradeSanction = new DiplomaticTradeSanctionSystem()
    this.creatureMimicry = new CreatureMimicrySystem()
    this.worldWaterspout = new WorldWaterspoutSystem()
    this.creatureBeekeeping = new CreatureBeekeepingSystem()
    this.worldVolcanicIsland = new WorldVolcanicIslandSystem()
    this.diplomaticTradeGuild = new DiplomaticTradeGuildSystem()
    this.creatureTelepathy = new CreatureTelepathySystem()
    this.creatureGlassblowing = new CreatureGlassblowingSystem()
    this.worldUndergroundRiver = new WorldUndergroundRiverSystem()
    this.diplomaticNavalBlockade = new DiplomaticNavalBlockadeSystem()
    this.creaturePremonition = new CreaturePremonitionSystem()
    this.creatureHerbalism = new CreatureHerbalismSystem()
    this.worldFloatingIsland = new WorldFloatingIslandSystem()
    this.creatureCartography = new CreatureCartographySystem()
    this.creatureShapeshifting = new CreatureShapeshiftingSystem()
    this.worldWhirlwind = new WorldWhirlwindSystem()
    this.creatureRunecrafting = new CreatureRunecraftingSystem()
    this.creatureAstrology = new CreatureAstrologySystem()
    this.creatureSummoning = new CreatureSummoningSystem()
    this.creatureAlchemy = new CreatureAlchemySystem()
    this.creatureEnchanting = new CreatureEnchantingSystem()
    this.worldGeyserField = new WorldGeyserFieldSystem()
    this.creatureBard = new CreatureBardSystem()
    this.worldNorthernLights = new WorldNorthernLightsSystem()
    this.worldMossGrowth = new WorldMossGrowthSystem()
    this.worldIrrigation = new WorldIrrigationSystem()
    this.creatureConstellation = new CreatureConstellationSystem()
    this.creatureScribe = new CreatureScribeSystem()
    this.worldLighthouse = new WorldLighthouseSystem()
    this.creatureMasonry = new CreatureMasonrySystem()
    this.worldTidewater = new WorldTidewaterSystem()
    this.creatureOrigami = new CreatureOrigamiSystem()
    this.worldLabyrinth = new WorldLabyrinthSystem()
    this.creatureFalconry = new CreatureFalconrySystem()
    this.creatureApiary = new CreatureApiarySystem()
    this.worldTerracing = new WorldTerracingSystem()
    this.creatureCourier = new CreatureCourierSystem()
    this.creatureMosaic = new CreatureMosaicSystem()
    this.worldSundial = new WorldSundialSystem()
    this.worldAqueduct = new WorldAqueductSystem()
    this.creatureTattoist = new CreatureTattoistSystem()
    this.worldGeoglyph = new WorldGeoglyphSystem()
    this.creatureHerald = new CreatureHeraldSystem()
    this.creaturePuppeteer = new CreaturePuppeteerSystem()
    this.worldObsidian = new WorldObsidianSystem()
    this.creatureRanger = new CreatureRangerSystem()
    this.worldCoralReefGrowth = new WorldCoralReefGrowthSystem()
    this.creatureRunner = new CreatureRunnerSystem()
    this.creatureJester = new CreatureJesterSystem()
    this.worldPetrifiedForest = new WorldPetrifiedForestSystem()
    this.creatureNomad = new CreatureNomadSystem()
    this.worldStalactite = new WorldStalactiteSystem()
    this.creatureChronicler = new CreatureChroniclerSystem()
    this.creatureFirewalker = new CreatureFirewalkerSystem()
    this.diplomaticHostageExchange = new DiplomaticHostageExchangeSystem()
    this.worldFrostbite = new WorldFrostbiteSystem()
    this.creatureOracle = new CreatureOracleSystem()
    this.worldCoralBleaching = new WorldCoralBleachingSystem()
    this.creatureBlacksmith = new CreatureBlacksmithSystem()
    this.creatureDowser = new CreatureDowserSystem()
    this.worldMagneticField = new WorldMagneticFieldSystem()
    this.creatureCheeseAger = new CreatureCheeseAgerSystem()
    this.worldSinkholePrev = new WorldSinkholePrevSystem()
    this.diplomaticRansom = new DiplomaticRansomSystem()
    this.creatureSoapMaker = new CreatureSoapMakerSystem()
    this.worldDewFormation = new WorldDewFormationSystem()
    this.creatureGambler = new CreatureGamblerSystem()
    this.worldSandDune = new WorldSandDuneSystem()
    this.diplomaticWarReparations = new DiplomaticWarReparationsSystem()
    this.creatureGladiator = new CreatureGladiatorSystem()
    this.worldTideFlat = new WorldTideFlatSystem()
    this.creatureMushroomForager = new CreatureMushroomForagerSystem()
    this.worldIceSheet = new WorldIceSheetSystem()
    this.diplomaticNonAggression = new DiplomaticNonAggressionSystem()
    this.creatureTrapper = new CreatureTrapperSystem()
    this.worldCoralSpawning = new WorldCoralSpawningSystem()
    this.creatureAstronomer = new CreatureAstronomerSystem()
    this.worldThermalVent = new WorldThermalVentSystem()
    this.diplomaticArmistic = new DiplomaticArmisticSystem()
    this.creatureWeaver = new CreatureWeaverSystem()
    this.creatureHerbalist = new CreatureHerbalistSystem()
    this.creatureSentinel = new CreatureSentinelSystem()
    this.worldPeatBog = new WorldPeatBogSystem()
    this.creatureBeekeeper = new CreatureBeekeeperSystem()
    this.worldAtoll = new WorldAtollSystem()
    this.creatureLamplighter = new CreatureLamplighterSystem()
    this.diplomaticCeasefire = new DiplomaticCeasefireSystem()
    this.creaturePerfumer = new CreaturePerfumerSystem()
    this.worldCoralNursery = new WorldCoralNurserySystem()
    this.creatureGlazier = new CreatureGlazierSystem()
    this.worldMudVolcano = new WorldMudVolcanoSystem()
    this.diplomaticProtectorate = new DiplomaticProtectorateSystem()
    this.creatureGondolier = new CreatureGondolierSystem()
    this.worldFungalNetwork = new WorldFungalNetworkSystem()
    this.creatureCooper = new CreatureCooperSystem()
    this.worldSaltMarsh = new WorldSaltMarshSystem()
    this.diplomaticConfederation = new DiplomaticConfederationSystem()
    this.creatureChandler = new CreatureChandlerSystem()
    this.worldFrostHollow = new WorldFrostHollowSystem()
    this.creatureTinker = new CreatureTinkerSystem()
    this.worldBasaltColumn = new WorldBasaltColumnSystem()
    this.creatureFletcher = new CreatureFletcherSystem()
    this.worldMangroveSwamp = new WorldMangroveSwampSystem()
    this.creatureWheelwright = new CreatureWheelwrightSystem()
    this.worldObsidianField = new WorldObsidianFieldSystem()
    this.creatureFalconer = new CreatureFalconerSystem()
    this.creatureEngraver = new CreatureEngraverSystem()
    this.worldLavaTube = new WorldLavaTubeSystem()
    this.creatureTanner = new CreatureTannerSystem()
    this.worldBioluminescentBay = new WorldBioluminescentBaySystem()
    this.creatureCartographer = new CreatureCartographerSystem()
    this.worldPumiceField = new WorldPumiceFieldSystem()
    this.diplomaticTribunal = new DiplomaticTribunalSystem()
    this.creatureRopeMaker = new CreatureRopeMakerSystem()
    this.worldSandstoneArch = new WorldSandstoneArchSystem()
    this.creatureVintner = new CreatureVintnerSystem()
    this.worldFumaroleField = new WorldFumaroleFieldSystem()
    this.diplomaticAmnesty = new DiplomaticAmnestySystem()
    this.creatureShipwright = new CreatureShipwrightSystem()
    this.worldCloudForest = new WorldCloudForestSystem()
    this.creatureDyer = new CreatureDyerSystem()
    this.worldTravertineTerrace = new WorldTravertineTerraceSystem()
    this.diplomaticArbitration = new DiplomaticArbitrationSystem()
    this.creatureLapidary = new CreatureLapidarySystem()
    this.worldBlackSandBeach = new WorldBlackSandBeachSystem()
    this.creatureLocksmith = new CreatureLocksmithSystem()
    this.worldIceCave = new WorldIceCaveSystem()
    this.diplomaticPlebiscite = new DiplomaticPlebisciteSystem()
    this.creatureRugmaker = new CreatureRugmakerSystem()
    this.worldTidalLagoon = new WorldTidalLagoonSystem()
    this.creatureSaddler = new CreatureSaddlerSystem()
    this.worldIceShelf = new WorldIceShelfSystem()
    this.diplomaticReferendum = new DiplomaticReferendumSystem()
    this.creatureBookbinder = new CreatureBookbinderSystem()
    this.worldSeaStack = new WorldSeaStackSystem()
    this.creatureFarrier = new CreatureFarrierSystem()
    this.worldPermafrostThaw = new WorldPermafrostThawSystem()
    this.diplomaticRatification = new DiplomaticRatificationSystem()
    this.creatureFuller = new CreatureFullerSystem()
    this.worldBarrierIsland = new WorldBarrierIslandSystem()
    this.creatureSawyer = new CreatureSawyerSystem()
    this.worldVolcanicAshPlain = new WorldVolcanicAshPlainSystem()
    this.diplomaticAdjudication = new DiplomaticAdjudicationSystem()
    this.creatureGilders = new CreatureGildersSystem()
    this.creatureCoopers = new CreatureCoopersSystem()
    this.worldMudFlat = new WorldMudFlatSystem()
    this.creatureThatchers = new CreatureThatchersSystem()
    this.worldCoralAtoll = new WorldCoralAtollSystem()
    this.creatureChandlers = new CreatureChandlersSystem()
    this.worldGeothermalSpring = new WorldGeothermalSpringSystem()
    this.diplomaticConciliation = new DiplomaticConciliationSystem()
    this.creatureGlazers = new CreatureGlazersSystem()
    this.worldSinkholePlain = new WorldSinkholePlainSystem()
    this.creaturePlasterers = new CreaturePlasterersSystem()
    this.diplomaticArbitrationTreaty = new DiplomaticArbitrationTreatySystem()
    this.creatureEngravers = new CreatureEngraversSystem()
    this.worldMangroveDelta = new WorldMangroveDeltaSystem()
    this.creatureWheelwrights = new CreatureWheelwrightsSystem()
    this.worldSaltFlat = new WorldSaltFlatSystem()
    this.diplomaticExtradition = new DiplomaticExtraditionSystem()
    this.creaturePerfumers = new CreaturePerfumersSystem()
    this.worldObsidianFlow = new WorldObsidianFlowSystem()
    this.creatureCobblers = new CreatureCobblersSystem()
    this.worldTidalMarsh = new WorldTidalMarshSystem()
    this.diplomaticSovereignty = new DiplomaticSovereigntySystem()
    this.creatureAssayers = new CreatureAssayersSystem()
    this.worldKarstTower = new WorldKarstTowerSystem()
    this.creatureFletchers = new CreatureFletchersSystem()
    this.worldAlluvialFan = new WorldAlluvialFanSystem()
    this.diplomaticReparation = new DiplomaticReparationSystem()
    this.creatureWainwrights = new CreatureWainwrightsSystem()
    this.worldBayou = new WorldBayouSystem()
    this.creatureCuriers = new CreatureCuriersSystem()
    this.worldCinderCone = new WorldCinderConeSystem()
    this.diplomaticRestitution = new DiplomaticRestitutionSystem()
    this.creatureHorners = new CreatureHornersSystem()
    this.worldFjord = new WorldFjordSystem()
    this.creatureNailers = new CreatureNailersSystem()
    this.worldBadlands = new WorldBadlandsSystem()
    this.diplomaticIndemnity = new DiplomaticIndemnitySystem()
    this.creatureReedCutters = new CreatureReedCuttersSystem()
    this.worldMesa = new WorldMesaSystem()
    this.creaturePotters = new CreaturePottersSystem()
    this.diplomaticAnnexation = new DiplomaticAnnexationSystem()
    this.creatureRopeMakers = new CreatureRopeMakersSystem()
    this.worldButtes = new WorldButtesSystem()
    this.creatureBellFounders = new CreatureBellFoundersSystem()
    this.worldCanyon = new WorldCanyonSystem()
    this.diplomaticSecession = new DiplomaticSecessionSystem()
    this.creatureQuarrymen = new CreatureQuarrymenSystem()
    this.worldArchipelago = new WorldArchipelagoSystem()
    this.creatureFelters = new CreatureFeltersSystem()
    this.worldRiftValley = new WorldRiftValleySystem()
    this.creatureLimeburners = new CreatureLimeburnersSystem()
    this.worldCaldera = new WorldCalderaSystem()
    this.creatureWheelers = new CreatureWheelersSystem()
    this.worldEscarpment = new WorldEscarpmentSystem()
    this.diplomaticNeutralization = new DiplomaticNeutralizationSystem()
    this.creatureSieveMakers = new CreatureSieveMakersSystem()
    this.worldPlains = new WorldPlainsSystem()
    this.creatureBroomMakers = new CreatureBroomMakersSystem()
    this.worldSpire = new WorldSpireSystem()
    this.creatureCharcoalBurners = new CreatureCharcoalBurnersSystem()
    this.worldGrotto = new WorldGrottoSystem()
    this.creatureTinsmiths = new CreatureTinsmithsSystem()
    this.worldPinnacle = new WorldPinnacleSystem()
    this.creatureBasketWeavers = new CreatureBasketWeaversSystem()
    this.worldHoodoo = new WorldHoodooSystem()
    this.creatureSoapMakers = new CreatureSoapMakersSystem()
    this.worldCenote = new WorldCenoteSystem()
    this.creatureGlassblowers = new CreatureGlassblowersSystem()
    this.worldMoraine = new WorldMoraineSystem()
    this.diplomaticCoexistence = new DiplomaticCoexistenceSystem()
    this.creatureParchmentMakers = new CreatureParchmentMakersSystem()
    this.worldBlowhole = new WorldBlowholeSystem()
    this.diplomaticReunification = new DiplomaticReunificationSystem()
    this.creatureDyers = new CreatureDyersSystem()
    this.worldDrumlin = new WorldDrumlinSystem()
    this.diplomaticNonIntervention = new DiplomaticNonInterventionSystem()
    this.creatureHarnessMakers = new CreatureHarnessMakersSystem()
    this.worldKettleHole = new WorldKettleHoleSystem()
    this.diplomaticReconciliation = new DiplomaticReconciliationSystem()
    this.creatureVinegarMakers = new CreatureVinegarMakersSystem()
    this.worldNunatak = new WorldNunatakSystem()
    this.diplomaticDisarmament = new DiplomaticDisarmamentSystem()
    this.worldCirque = new WorldCirqueSystem()
    this.creatureLaceMakers = new CreatureLaceMakersSystem()
    this.worldArroyo = new WorldArroyoSystem()
    this.creatureFurriers = new CreatureFurriersSystem()
    this.worldCoulee = new WorldCouleeSystem()
    this.diplomaticDetente = new DiplomaticDetenteSystem()
    this.worldDelta = new WorldDeltaSystem()
    this.diplomaticRapprochement = new DiplomaticRapprochementSystem()
    this.creatureBookbinders = new CreatureBookbindersSystem()
    this.worldEstuary = new WorldEstuarySystem()
    this.creatureEnamelers = new CreatureEnamelersSystem()
    this.worldWadi = new WorldWadiSystem()
    this.creatureUpholsterers = new CreatureUpholsterersSystem()
    this.worldPeneplain = new WorldPeneplainSystem()
    this.diplomaticAppeasement = new DiplomaticAppeasementSystem()
    this.creatureCalderers = new CreatureCalderersSystem()
    this.worldRavine = new WorldRavineSystem()
    this.diplomaticEntente = new DiplomaticEntenteSystem()
    this.creatureScriveners = new CreatureScrivenersSystem()
    this.worldInselberg = new WorldInselbergSystem()
    this.diplomaticAccord = new DiplomaticAccordSystem()
    this.creatureIlluminators = new CreatureIlluminatorsSystem()
    this.worldGorge = new WorldGorgeSystem()
    this.diplomaticConcord = new DiplomaticConcordSystem()
    this.creatureBellMakers = new CreatureBellMakersSystem()
    this.worldPlaya = new WorldPlayaSystem()
    this.diplomaticNeutrality = new DiplomaticNeutralitySystem()
    this.creatureCombMakers = new CreatureCombMakersSystem()
    this.worldPediment = new WorldPedimentSystem()
    this.diplomaticSolidarity = new DiplomaticSolidaritySystem()
    this.creatureNailSmiths = new CreatureNailSmithsSystem()
    this.worldHogback = new WorldHogbackSystem()
    this.diplomaticReciprocity = new DiplomaticReciprocitySystem()
    this.creaturePinMakers = new CreaturePinMakersSystem()
    this.worldCuesta = new WorldCuestaSystem()
    this.diplomaticBenevolence = new DiplomaticBenevolenceSystem()
    this.creatureThimbleMakers = new CreatureThimbleMakersSystem()
    this.worldFlatiron = new WorldFlatironSystem()
    this.diplomaticClemency = new DiplomaticClemencySystem()
    this.creatureAwlMakers = new CreatureAwlMakersSystem()
    this.worldTepui = new WorldTepuiSystem()
    this.diplomaticMagnanimity = new DiplomaticMagnanimitySystem()
    this.creatureBuckleMakers = new CreatureBuckleMakersSystem()
    this.worldYardang = new WorldYardangSystem()
    this.diplomaticForbearance = new DiplomaticForbearanceSystem()
    this.creatureClaspMakers = new CreatureClaspMakersSystem()
    this.worldVentifact = new WorldVentifactSystem()
    this.diplomaticLenity = new DiplomaticLenitySystem()
    this.creatureRivetMakers = new CreatureRivetMakersSystem()
    this.worldDreikanter = new WorldDreikanterSystem()
    this.diplomaticAbsolution = new DiplomaticAbsolutionSystem()
    this.creatureFerruleMakers = new CreatureFerruleMakersSystem()
    this.worldDeflationHollow = new WorldDeflationHollowSystem()
    this.diplomaticExoneration = new DiplomaticExonerationSystem()
    this.creatureGrommetMakers = new CreatureGrommetMakersSystem()
    this.worldZeugen = new WorldZeugenSystem()
    this.diplomaticReprieve = new DiplomaticReprieveSystem()
    this.creatureBobbinMakers = new CreatureBobbinMakersSystem()
    this.worldInlier = new WorldInlierSystem()
    this.diplomaticDispensation = new DiplomaticDispensationSystem()
    this.creatureSpindleMakers = new CreatureSpindleMakersSystem()
    this.worldOutlier = new WorldOutlierSystem()
    this.diplomaticRemission = new DiplomaticRemissionSystem()
    this.creatureShuttleMakers = new CreatureShuttleMakersSystem()
    this.worldTafoni = new WorldTafoniSystem()
    this.diplomaticAcquittal = new DiplomaticAcquittalSystem()
    this.creatureBobbinLaceMakers = new CreatureBobbinLaceMakersSystem()
    this.worldRockPedestal = new WorldRockPedestalSystem()
    this.diplomaticImmunity = new DiplomaticImmunitySystem()
    this.creatureTattingMakers = new CreatureTattingMakersSystem()
    this.worldBalancingRock = new WorldBalancingRockSystem()
    this.diplomaticIndulgence = new DiplomaticIndulgenceSystem()
    this.creatureNettingMakers = new CreatureNettingMakersSystem()
    this.worldFairyChimney = new WorldFairyChimneySystem()
    this.diplomaticCommutation = new DiplomaticCommutationSystem()
    this.creatureFringeMakers = new CreatureFringeMakersSystem()
    this.worldStoneArch = new WorldStoneArchSystem()
    this.diplomaticMitigation = new DiplomaticMitigationSystem()
    this.creatureTasselMakers = new CreatureTasselMakersSystem()
    this.worldRockBridge = new WorldRockBridgeSystem()
    this.diplomaticCondonation = new DiplomaticCondonationSystem()
    this.creatureBraidMakers = new CreatureBraidMakersSystem()
    this.worldStoneWindow = new WorldStoneWindowSystem()
    this.diplomaticVindication = new DiplomaticVindicationSystem()
    this.creatureMacrameMakers = new CreatureMacrameMakersSystem()
    this.worldRockPillar = new WorldRockPillarSystem()
    this.diplomaticRehabilitation = new DiplomaticRehabilitationSystem()
    this.creatureQuiltingMakers = new CreatureQuiltingMakersSystem()
    this.creatureEmbroideryMakers = new CreatureEmbroideryMakersSystem()
    this.worldBlowhole2 = new WorldBlowhole2System()
    this.creatureAppliqueMakers = new CreatureAppliqueMakersSystem()
    this.worldRockShelter = new WorldRockShelterSystem()
    this.diplomaticReconciliation2 = new DiplomaticReconciliation2System()
    this.creatureSmockingMakers = new CreatureSmockingMakersSystem()
    this.worldNaturalTunnel = new WorldNaturalTunnelSystem()
    this.diplomaticAtonement = new DiplomaticAtonementSystem()
    this.creatureCrochetMakers = new CreatureCrochetMakersSystem()
    this.worldRockArch2 = new WorldRockArch2System()
    this.diplomaticAbsolution2 = new DiplomaticAbsolution2System()
    this.creatureFeltingMakers = new CreatureFeltingMakersSystem()
    this.worldSeaCave = new WorldSeaCaveSystem()
    this.diplomaticAmnesty2 = new DiplomaticAmnesty2System()
    this.creatureBobbinLace2Makers = new CreatureBobbinLace2MakersSystem()
    this.worldKarstSpring = new WorldKarstSpringSystem()
    this.diplomaticClemency2 = new DiplomaticClemency2System()
    this.creatureWeavingMakers = new CreatureWeavingMakersSystem()
    this.worldSinkhole2 = new WorldSinkhole2System()
    this.diplomaticPardon = new DiplomaticPardonSystem()
    this.creatureDyeingMakers = new CreatureDyeingMakersSystem()
    this.diplomaticArbitration2 = new DiplomaticArbitration2System()
    this.creatureKnittingMakers = new CreatureKnittingMakersSystem()
    this.creatureFeltingMakers2 = new CreatureFeltingMakers2System()
    this.worldFumarole = new WorldFumaroleSystem()
    this.creatureSpinningMakers = new CreatureSpinningMakersSystem()
    this.creatureLoomMakers = new CreatureLoomMakersSystem()
    this.worldHotSpring2 = new WorldHotSpring2System()
    this.worldSolfatara = new WorldSolfataraSystem()
    this.diplomaticIntercession = new DiplomaticIntercessionSystem()
    this.creatureNeedleworkMakers = new CreatureNeedleworkMakersSystem()
    this.worldMaar = new WorldMaarSystem()
    this.diplomaticArbitrement = new DiplomaticArbitrementSystem()
    this.creatureWarpingMakers = new CreatureWarpingMakersSystem()
    this.diplomaticCompromise = new DiplomaticCompromiseSystem()
    this.creatureBobbinWinder = new CreatureBobbinWinderSystem()
    this.diplomaticDetente2 = new DiplomaticDetente2System()
    this.creatureCardingMakers = new CreatureCardingMakersSystem()
    this.worldLahar = new WorldLaharSystem()
    this.creatureFullingMakers = new CreatureFullingMakersSystem()
    this.worldPyroclasticFlow = new WorldPyroclasticFlowSystem()
    this.diplomaticEntente2 = new DiplomaticEntente2System()
    this.creatureTatamiMakers = new CreatureTatamiMakersSystem()
    this.worldPhreaticExplosion = new WorldPhreaticExplosionSystem()
    this.diplomaticAccommodation = new DiplomaticAccommodationSystem()
    this.creatureSilkWeaver = new CreatureSilkWeaverSystem()
    this.diplomaticConcordat = new DiplomaticConcordatSystem()
    this.worldMudPot = new WorldMudPotSystem()
    this.creaturePotter = new CreaturePotterSystem()
    this.worldSteamVent = new WorldSteamVentSystem()
    this.creatureBasketWeaver = new CreatureBasketWeaverSystem()
    this.worldTravertine = new WorldTravertineSystem()
    this.diplomaticMutualAid = new DiplomaticMutualAidSystem()
    this.worldGeyserite = new WorldGeyseriteSystem()
    this.worldSinter = new WorldSinterSystem()
    this.creatureHornworker = new CreatureHornworkerSystem()
    this.worldTufa = new WorldTufaSystem()
    this.creatureScabbardMaker = new CreatureScabbardMakerSystem()
    this.worldSiliceousSinter = new WorldSiliceousSinterSystem()
    this.diplomaticDominion = new DiplomaticDominionSystem()
    this.creatureQuiverMaker = new CreatureQuiverMakerSystem()
    this.worldHotPool = new WorldHotPoolSystem()
    this.diplomaticCommonwealth = new DiplomaticCommonwealthSystem()
    this.worldGeothermalPool = new WorldGeothermalPoolSystem()
    this.creatureStringMaker = new CreatureStringMakerSystem()
    this.worldFumarolicField = new WorldFumarolicFieldSystem()
    this.diplomaticHegemony = new DiplomaticHegemonySystem()
    this.worldMineralSpring = new WorldMineralSpringSystem()
    this.diplomaticSuzerainty = new DiplomaticSuzeraintySystem()
    this.creatureRopeWalker = new CreatureRopeWalkerSystem()
    this.worldThermalSpring = new WorldThermalSpringSystem()
    this.diplomaticAutonomy = new DiplomaticAutonomySystem()
    this.creatureHarnessmaker = new CreatureHarnessmakerSystem()
    this.worldSodaSpring = new WorldSodaSpringSystem()
    this.diplomaticVassalage = new DiplomaticVassalageSystem()
    this.worldArtesianWell = new WorldArtesianWellSystem()
    this.creatureBridlemaker = new CreatureBridlemakerSystem()
    this.worldChalybeateSpring = new WorldChalybeateSpringSystem()
    this.diplomaticImperium = new DiplomaticImperiumSystem()
    this.creatureYokemaker = new CreatureYokemakerSystem()
    this.worldSulfurSpring = new WorldSulfurSpringSystem()
    this.diplomaticMandate = new DiplomaticMandateSystem()
    this.creaturePlowright = new CreaturePlowrightSystem()
    this.worldLithiumSpring = new WorldLithiumSpringSystem()
    this.diplomaticRegency = new DiplomaticRegencySystem()
    this.creatureAnvilsmith = new CreatureAnvilsmithSystem()
    this.worldRadiumSpring = new WorldRadiumSpringSystem()
    this.diplomaticStewardship = new DiplomaticStewardshipSystem()
    this.creatureToolsmith = new CreatureToolsmithSystem()
    this.worldBorateSpring = new WorldBorateSpringSystem()
    this.diplomaticCustodianship = new DiplomaticCustodianshipSystem()
    this.creatureNailsmith = new CreatureNailsmithSystem()
    this.worldSeleniumSpring = new WorldSeleniumSpringSystem()
    this.diplomaticTrusteeship = new DiplomaticTrusteeshipSystem()
    this.worldMagnesiumSpring = new WorldMagnesiumSpringSystem()
    this.diplomaticGuardianship = new DiplomaticGuardianshipSystem()
    this.creatureChainmaker = new CreatureChainmakerSystem()
    this.worldPotassiumSpring = new WorldPotassiumSpringSystem()
    this.diplomaticPatronage = new DiplomaticPatronageSystem()
    this.creatureBellfounder = new CreatureBellfounderSystem()
    this.worldStrontiumSpring = new WorldStrontiumSpringSystem()
    this.diplomaticStewardshipPact = new DiplomaticStewardshipPactSystem()
    this.creatureGirdler = new CreatureGirdlerSystem()
    this.worldBariumSpring = new WorldBariumSpringSystem()
    this.diplomaticConservatorship = new DiplomaticConservatorshipSystem()
    this.creaturePewterer = new CreaturePewtererSystem()
    this.worldZincSpring = new WorldZincSpringSystem()
    this.diplomaticReceivership = new DiplomaticReceivershipSystem()
    this.creatureWiredrawer = new CreatureWiredrawerSystem()
    this.worldCopperSpring = new WorldCopperSpringSystem()
    this.diplomaticProcuratorship = new DiplomaticProcuratorshipSystem()
    this.creatureGlazierMaster = new CreatureGlazierMasterSystem()
    this.worldManganeseSpring = new WorldManganeseSpringSystem()
    this.diplomaticPrefecture = new DiplomaticPrefectureSystem()
    this.creatureRiveter = new CreatureRiveterSystem()
    this.worldTinSpring = new WorldTinSpringSystem()
    this.diplomaticVicarage = new DiplomaticVicarageSystem()
    this.creatureSmelter = new CreatureSmelterSystem()
    this.worldIridiumSpring = new WorldIridiumSpringSystem()
    this.diplomaticSeneschalry = new DiplomaticSeneschalrySystem()
    this.creaturePuddler = new CreaturePuddlerSystem()
    this.worldOsmiumSpring = new WorldOsmiumSpringSystem()
    this.diplomaticChatelaincy = new DiplomaticChatelaincySystem()
    this.creatureAssayer = new CreatureAssayerSystem()
    this.worldRutheniumSpring = new WorldRutheniumSpringSystem()
    this.diplomaticCastellany = new DiplomaticCastellanySystem()
    this.creatureWelder = new CreatureWelderSystem()
    this.worldNiobiumSpring = new WorldNiobiumSpringSystem()
    this.diplomaticBailiffry = new DiplomaticBailiffrySystem()
    this.creatureRoller = new CreatureRollerSystem()
    this.worldTantalumSpring = new WorldTantalumSpringSystem()
    this.diplomaticSheriffalty = new DiplomaticSheriffaltySystem()
    this.creatureDrawer = new CreatureDrawerSystem()
    this.worldHafniumSpring = new WorldHafniumSpringSystem()
    this.diplomaticCoroner = new DiplomaticCoronerSystem()
    this.creatureSpinner = new CreatureSpinnerSystem()
    this.worldZirconiumSpring = new WorldZirconiumSpringSystem()
    this.diplomaticEscheator = new DiplomaticEscheatorSystem()
    this.creatureFurbisher = new CreatureFurbisherSystem()
    this.worldIndiumSpring = new WorldIndiumSpringSystem()
    this.diplomaticAlmoner = new DiplomaticAlmonerSystem()
    this.creatureTinplater = new CreatureTinplaterSystem()
    this.worldGalliumSpring = new WorldGalliumSpringSystem()
    this.diplomaticPurveyor = new DiplomaticPurveyorSystem()
    this.creatureAnnealer = new CreatureAnnealerSystem()
    this.worldGermaniumSpring = new WorldGermaniumSpringSystem()
    this.diplomaticHarbinger = new DiplomaticHarbingerSystem()
    this.creatureBurnisher = new CreatureBurnisherSystem()
    this.worldThalliumSpring = new WorldThalliumSpringSystem()
    this.diplomaticVerderer = new DiplomaticVerdererSystem()
    this.creatureSwager = new CreatureSwagerSystem()
    this.worldScandiumSpring = new WorldScandiumSpringSystem()
    this.diplomaticHayward = new DiplomaticHaywardSystem()
    this.creatureStamper = new CreatureStamperSystem()
    this.worldYttriumSpring = new WorldYttriumSpringSystem()
    this.diplomaticPannager = new DiplomaticPannagerSystem()
    this.creatureForger = new CreatureForgerSystem()
    this.worldLanthanumSpring = new WorldLanthanumSpringSystem()
    this.diplomaticAgister = new DiplomaticAgisterSystem()
    this.creatureHammerman = new CreatureHammermanSystem()
    this.worldCeriumSpring = new WorldCeriumSpringSystem()
    this.diplomaticWoodward = new DiplomaticWoodwardSystem()
    this.creaturePeener = new CreaturePeenerSystem()
    this.worldPraseodymiumSpring = new WorldPraseodymiumSpringSystem()
    this.diplomaticWarrener = new DiplomaticWarrenerSystem()
    this.creaturePlanisher = new CreaturePlanisherSystem()
    this.worldNeodymiumSpring = new WorldNeodymiumSpringSystem()
    this.diplomaticParkward = new DiplomaticParkwardSystem()
    this.creatureBeveller = new CreatureBevellerSystem()
    this.worldSamariumSpring = new WorldSamariumSpringSystem()
    this.diplomaticWoodreve = new DiplomaticWoodreveSystem()
    this.creatureFlatter = new CreatureFlatterSystem()
    this.worldEuropiumSpring = new WorldEuropiumSpringSystem()
    this.diplomaticRanger = new DiplomaticRangerSystem()
    this.creatureChiseller = new CreatureChisellerSystem()
    this.worldGadoliniumSpring = new WorldGadoliniumSpringSystem()
    this.diplomaticForestar = new DiplomaticForestarSystem()
    this.creatureKnurler = new CreatureKnurlerSystem()
    this.worldTerbiumSpring = new WorldTerbiumSpringSystem()
    this.diplomaticWaynward = new DiplomaticWaynwardSystem()
    this.creatureReamer = new CreatureReamerSystem()
    this.worldDysprosiumSpring = new WorldDysprosiumSpringSystem()
    this.diplomaticMootman = new DiplomaticMootmanSystem()
    this.creatureBroacher = new CreatureBroacherSystem()
    this.worldHolmiumSpring = new WorldHolmiumSpringSystem()
    this.diplomaticTithingman = new DiplomaticTithingmanSystem()
    this.creatureHoner = new CreatureHonerSystem()
    this.worldErbiumSpring = new WorldErbiumSpringSystem()
    this.diplomaticHayreve = new DiplomaticHayreveSystem()
    this.creatureLapper = new CreatureLapperSystem()
    this.worldThuliumSpring = new WorldThuliumSpringSystem()
    this.diplomaticPinder = new DiplomaticPinderSystem()
    this.creatureBorer = new CreatureBorerSystem()
    this.worldYtterbiumSpring = new WorldYtterbiumSpringSystem()
    this.diplomaticGrithman = new DiplomaticGrithmanSystem()
    this.creatureCountersinker = new CreatureCountersinkerSystem()
    this.worldLutetiumSpring = new WorldLutetiumSpringSystem()
    this.diplomaticBorsholder = new DiplomaticBorsholderSystem()
    this.creatureSpotfacer = new CreatureSpotfacerSystem()
    this.worldActiniumSpring = new WorldActiniumSpringSystem()
    this.diplomaticAletaster = new DiplomaticAletasterSystem()
    this.creatureTapper = new CreatureTapperSystem()
    this.worldThoriumSpring = new WorldThoriumSpringSystem()
    this.diplomaticBreadweigher = new DiplomaticBreadweigherSystem()
    this.creatureCoiner = new CreatureCoinerSystem()
    this.worldProtactiniumSpring = new WorldProtactiniumSpringSystem()
    this.diplomaticMuragers = new DiplomaticMuragersSystem()
    this.creatureSwageBlocker = new CreatureSwageBlockerSystem()
    this.worldUraniumSpring = new WorldUraniumSpringSystem()
    this.diplomaticGarthman = new DiplomaticGarthmanSystem()
    this.creatureDrifter = new CreatureDrifterSystem()
    this.diplomaticCrier = new DiplomaticCrierSystem()
    this.worldPoloniumSpring = new WorldPoloniumSpringSystem()
    this.diplomaticBeadle = new DiplomaticBeadleSystem()
    this.creatureUpsetter = new CreatureUpsetterSystem()
    this.worldFranciumSpring = new WorldFranciumSpringSystem()
    this.diplomaticHerbalist = new DiplomaticHerbalistSystem()
    this.creatureSwedger = new CreatureSwedgerSystem()
    this.worldRadonSpring = new WorldRadonSpringSystem()
    this.diplomaticLampwarden = new DiplomaticLampwardenSystem()
    this.creatureBurnOuter = new CreatureBurnOuterSystem()
    this.worldAstatineSpring = new WorldAstatineSpringSystem()
    this.diplomaticClavigers = new DiplomaticClavigersSystem()
    this.creatureScriber = new CreatureScriberSystem()
    this.worldCaesiumSpring = new WorldCaesiumSpringSystem()
    this.diplomaticPavior = new DiplomaticPaviorSystem()
    this.creatureStaker = new CreatureStakerSystem()
    this.worldRubidiumSpring = new WorldRubidiumSpringSystem()
    this.diplomaticWainage = new DiplomaticWainageSystem()
    this.creaturePlanisherMaster = new CreaturePlanisherMasterSystem()
    this.worldTelluriumSpring = new WorldTelluriumSpringSystem()
    this.diplomaticGarble = new DiplomaticGarbleSystem()
    this.creatureNeedler = new CreatureNeedlerSystem()
    this.worldXenonSpring = new WorldXenonSpringSystem()
    this.diplomaticTollbooth = new DiplomaticTollboothSystem()
    this.renderCulling.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.toastSystem.setupEventListeners()
    this.uiHelper = new GameUIHelper(this as unknown as GameUIContext)
    this.uiHelper.setupAchievementTracking()
    this.uiHelper.setupParticleEventHooks()
    this.uiHelper.setupSoundEventHooks()
    this.aiSystem.setResourceSystem(this.resources)
    this.aiSystem.setCivManager(this.civManager)
    this.combatSystem.setArtifactSystem(this.artifactSystem)

    this.powers = new Powers(this.world, this.em, this.creatureFactory, this.civManager, this.particles, this.audio)
    this.toolbar = new Toolbar('toolbar', this.powers)
    this.infoPanel = new InfoPanel('worldInfo', this.world, this.em, this.civManager)
    this.creaturePanel = new CreaturePanel('creaturePanel', this.em, this.civManager)
    new EventPanel('eventPanel')
    this.statsPanel = new StatsPanel('statsPanel', this.em, this.civManager)
    this.techTreePanel = new TechTreePanel('techTreePanel', this.civManager)
    this.contextMenu = new ContextMenu('contextMenu')

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    this.inputManager = new GameInputManager({
      get speed() { return self.speed },
      set speed(v: number) { self.speed = v },
      world: this.world,
      camera: this.camera,
      renderer: this.renderer,
      input: this.input,
      powers: this.powers,
      toolbar: this.toolbar,
      creaturePanel: this.creaturePanel,
      statsPanel: this.statsPanel,
      techTreePanel: this.techTreePanel,
      contextMenu: this.contextMenu,
      em: this.em,
      creatureFactory: this.creatureFactory,
      audio: this.audio,
      musicSystem: this.musicSystem,
      helpOverlay: this.helpOverlay,
      notificationCenter: this.notificationCenter,
      sandboxSettings: this.sandboxSettings,
      screenshotMode: this.screenshotMode,
      cameraBookmarks: this.cameraBookmarks,
      entityInspector: this.entityInspector,
      minimapMode: this.minimapMode,
      historyReplay: this.historyReplay,
      creatureMemory: this.creatureMemory,
      pollution: this.pollution,
      prophecy: this.prophecy,
      creatureSkill: this.creatureSkill,
      worldNarrator: this.worldNarrator,
      mythology: this.mythology,
      creatureTaming: this.creatureTaming,
      plagueMutation: this.plagueMutation,
      monument: this.monument,
      creaturePersonality: this.creaturePersonality,
      showSaveLoadPanel: (mode) => this.showSaveLoadPanel(mode),
      resetWorld: () => this.resetWorld(),
    })
    this.inputManager.setupAll()
    this.uiHelper.setupResize()
    this.uiHelper.setupToolbarButtons()
    this.uiHelper.setupTooltip()
    this.uiHelper.setupMuteButton()
    this.uiHelper.setupMinimapClick()
    this.uiHelper.setupMinimapModeBtn()
    this.renderer.resize(window.innerWidth, window.innerHeight)
    // === Batch system registration (data-driven tick dispatch) ===
    this._batch11A = [this.worldCorruption, this.diplomaticTribute]
    this._batch11B = [this.creatureDream, this.creatureFame, this.creatureRivalry, this.creatureProfession, this.worldLeyLine, this.creatureApprentice, this.creatureGuild, this.creatureReputation, this.creatureHobby, this.creatureTradeSkill, this.creatureAlliance, this.diplomaticPropaganda, this.creatureSuperstition, this.creatureAmbition, this.diplomaticCouncil, this.creaturePet]
    this._batch11C = [this.tradeNegotiation, this.creatureBounty, this.diplomaticMarriage, this.creatureAncestor, this.diplomaticHostage]
    this._batch11D = [this.worldSacredGrove, this.worldTidal, this.worldErosion]
    this._batch11E = [this.diplomaticSummit, this.diplomaticSanction]
    this._batch41A = [this.worldAurora, this.worldGeothermal, this.diplomaticFederation, this.worldPetrification, this.worldMaelstrom, this.worldCoralReef, this.worldSandstorm, this.worldRift, this.creatureVision, this.worldAvalanche, this.diplomaticAsylum, this.creatureForaging, this.worldWhirlpool, this.worldAuroraStorm]
    this._batch41B = [this.creatureRitual, this.worldAcoustic, this.creatureNostalgia, this.creaturePhobia, this.creatureArt, this.creatureDance, this.creatureMentor, this.creatureTrauma, this.creatureMigrationMemory, this.creatureRivalryDuel, this.creatureCollection, this.creatureOath, this.creatureLegacy]
    this._batch41C = [this.diplomaticExile, this.diplomaticBlockade, this.creatureInvention, this.diplomaticEmbargo]
    this._batch41D = [this.worldCrystalFormation, this.worldVolcanic, this.worldUnderground, this.worldMiasma, this.worldFossil, this.worldBeacon, this.worldTectonic, this.worldEcho, this.worldOasis]
    this._batch41E = [this.diplomaticSpy, this.diplomaticCeremony]
    this._batch21A = [this.worldMemorial, this.worldTidePool, this.worldMeteorShower, this.worldGlacier, this.worldPurification, this.worldGeyser, this.worldQuicksand, this.worldComet, this.worldHotSpring, this.worldEclipse, this.worldSinkhole, this.worldRainbow, this.worldDustStorm, this.worldBioluminescence, this.worldPermafrost, this.worldTidalWave, this.worldMudslide, this.worldKelpForest, this.worldGeothermalVent, this.worldMirage, this.diplomaticMediation, this.worldFogBank, this.worldDustDevil, this.worldMangrove, this.worldBallLightning, this.worldCrystalCave, this.worldWaterspout, this.worldVolcanicIsland, this.worldUndergroundRiver, this.worldFloatingIsland]
    this._batch21B = [this.creatureDivination, this.diplomaticSuccession, this.creatureBeastMaster, this.creatureRumor, this.diplomaticTradeAgreement, this.creatureNightWatch, this.creatureBarter, this.creatureIntuition, this.creatureExile, this.creatureNickname, this.creatureGrudge, this.creatureSleepwalk, this.creatureTattoo, this.creatureSomniloquy, this.creatureOmenBelief, this.creatureAmbidextrity, this.creatureHandicraft, this.creatureHomesickness, this.creatureLullaby, this.creatureCalligraphy, this.creatureFermentation, this.creatureVentriloquism, this.creaturePottery, this.creatureEcholocation, this.creatureWeaving, this.creatureMimicry, this.creatureBeekeeping, this.creatureTelepathy, this.creatureGlassblowing, this.creaturePremonition, this.creatureHerbalism, this.creatureCartography, this.creatureShapeshifting]
    this._batch21C = [this.diplomaticCensus, this.diplomaticWarReparation, this.diplomaticCulturalExchange, this.diplomaticPledge, this.diplomaticTariff, this.diplomaticPeaceTreaty, this.diplomaticTradeSanction, this.diplomaticTradeGuild, this.diplomaticNavalBlockade]
    this._batch36A = [this.worldWhirlwind, this.worldGeyserField, this.worldNorthernLights, this.worldMossGrowth, this.worldIrrigation, this.worldLighthouse, this.worldTidewater, this.worldLabyrinth, this.worldTerracing, this.worldSundial, this.worldAqueduct, this.worldGeoglyph, this.worldObsidian, this.worldCoralReefGrowth, this.worldPetrifiedForest, this.worldStalactite, this.worldFrostbite, this.worldCoralBleaching, this.worldMagneticField, this.worldSinkholePrev, this.diplomaticRansom, this.worldDewFormation, this.worldSandDune, this.worldTideFlat, this.worldIceSheet, this.diplomaticNonAggression, this.worldCoralSpawning, this.worldThermalVent, this.worldPeatBog, this.worldAtoll, this.diplomaticCeasefire, this.worldCoralNursery]
    this._batch36B = [this.creatureRunecrafting, this.creatureAstrology, this.creatureSummoning, this.creatureAlchemy, this.creatureEnchanting, this.creatureBard, this.creatureConstellation, this.creatureScribe, this.creatureMasonry, this.creatureOrigami, this.creatureFalconry, this.creatureApiary, this.creatureCourier, this.creatureMosaic, this.creatureTattoist, this.creatureHerald, this.creaturePuppeteer, this.creatureRanger, this.creatureRunner, this.creatureJester, this.creatureNomad, this.creatureChronicler, this.creatureFirewalker, this.creatureOracle, this.creatureBlacksmith, this.creatureDowser, this.creatureCheeseAger, this.creatureSoapMaker, this.creatureGambler, this.creatureGladiator, this.creatureMushroomForager, this.creatureTrapper, this.creatureAstronomer, this.creatureWeaver, this.creatureHerbalist, this.creatureSentinel, this.creatureBeekeeper, this.creatureLamplighter, this.creaturePerfumer]
    this._batch36F = [this.diplomaticHostageExchange, this.diplomaticWarReparations, this.diplomaticArmistic]
    this._batch51A = [this.worldMudVolcano, this.diplomaticProtectorate, this.worldFungalNetwork, this.worldSaltMarsh, this.diplomaticConfederation, this.worldFrostHollow, this.worldBasaltColumn, this.worldMangroveSwamp, this.worldObsidianField, this.worldLavaTube, this.worldBioluminescentBay, this.worldPumiceField, this.diplomaticTribunal, this.worldSandstoneArch, this.worldFumaroleField, this.diplomaticAmnesty, this.worldCloudForest, this.worldTravertineTerrace, this.diplomaticArbitration, this.worldBlackSandBeach, this.worldIceCave, this.diplomaticPlebiscite, this.worldTidalLagoon, this.worldIceShelf, this.diplomaticReferendum, this.worldSeaStack, this.worldPermafrostThaw, this.diplomaticRatification, this.worldBarrierIsland, this.worldVolcanicAshPlain, this.diplomaticAdjudication, this.worldMudFlat, this.worldCoralAtoll, this.worldGeothermalSpring, this.diplomaticConciliation, this.worldSinkholePlain, this.diplomaticArbitrationTreaty, this.worldMangroveDelta, this.worldSaltFlat, this.diplomaticExtradition, this.worldObsidianFlow, this.worldTidalMarsh]
    this._batch51B = [this.creatureGlazier, this.creatureGondolier, this.creatureCooper, this.creatureChandler, this.creatureTinker, this.creatureFletcher, this.creatureWheelwright, this.creatureFalconer, this.creatureEngraver, this.creatureTanner, this.creatureCartographer, this.creatureRopeMaker, this.creatureVintner, this.creatureShipwright, this.creatureDyer, this.creatureLapidary, this.creatureLocksmith, this.creatureRugmaker, this.creatureSaddler, this.creatureBookbinder, this.creatureFarrier, this.creatureFuller, this.creatureSawyer, this.creatureGilders, this.creatureCoopers, this.creatureThatchers, this.creatureChandlers, this.creatureGlazers, this.creaturePlasterers, this.creatureEngravers, this.creatureWheelwrights, this.creaturePerfumers, this.creatureCobblers]
    this._batch6A = [this.diplomaticSovereignty, this.worldKarstTower, this.worldAlluvialFan, this.diplomaticReparation, this.worldBayou, this.worldCinderCone, this.diplomaticRestitution, this.worldFjord, this.worldBadlands, this.diplomaticIndemnity, this.worldMesa, this.diplomaticAnnexation, this.worldButtes, this.worldCanyon, this.diplomaticSecession, this.worldArchipelago, this.worldRiftValley, this.worldCaldera, this.worldEscarpment, this.diplomaticNeutralization, this.worldPlains, this.worldSpire, this.worldGrotto, this.worldPinnacle, this.worldHoodoo, this.worldCenote, this.worldMoraine, this.diplomaticCoexistence, this.worldBlowhole, this.diplomaticReunification, this.worldDrumlin, this.diplomaticNonIntervention, this.worldKettleHole, this.diplomaticReconciliation, this.worldNunatak, this.diplomaticDisarmament, this.worldCirque, this.worldArroyo, this.worldCoulee, this.diplomaticDetente, this.worldDelta, this.diplomaticRapprochement, this.worldEstuary, this.worldWadi, this.worldPeneplain, this.diplomaticAppeasement, this.worldRavine, this.diplomaticEntente, this.worldInselberg, this.diplomaticAccord, this.worldGorge, this.diplomaticConcord, this.worldPlaya, this.diplomaticNeutrality, this.worldPediment, this.diplomaticSolidarity, this.worldHogback, this.diplomaticReciprocity, this.worldCuesta, this.diplomaticBenevolence, this.worldFlatiron, this.diplomaticClemency, this.worldTepui, this.diplomaticMagnanimity]
    this._batch6B = [this.creatureAssayers, this.creatureFletchers, this.creatureWainwrights, this.creatureCuriers, this.creatureHorners, this.creatureNailers, this.creatureReedCutters, this.creaturePotters, this.creatureRopeMakers, this.creatureBellFounders, this.creatureQuarrymen, this.creatureFelters, this.creatureLimeburners, this.creatureWheelers, this.creatureSieveMakers, this.creatureBroomMakers, this.creatureCharcoalBurners, this.creatureTinsmiths, this.creatureBasketWeavers, this.creatureSoapMakers, this.creatureGlassblowers, this.creatureParchmentMakers, this.creatureDyers, this.creatureHarnessMakers, this.creatureVinegarMakers, this.creatureLaceMakers, this.creatureFurriers, this.creatureBookbinders, this.creatureEnamelers, this.creatureUpholsterers, this.creatureCalderers, this.creatureScriveners, this.creatureIlluminators, this.creatureBellMakers, this.creatureCombMakers, this.creatureNailSmiths, this.creaturePinMakers, this.creatureThimbleMakers, this.creatureAwlMakers, this.creatureBuckleMakers]
    this._batch26A = [this.worldYardang, this.diplomaticForbearance, this.worldVentifact, this.diplomaticLenity, this.worldDreikanter, this.diplomaticAbsolution, this.worldDeflationHollow, this.diplomaticExoneration, this.worldZeugen, this.diplomaticReprieve, this.worldInlier, this.diplomaticDispensation, this.worldOutlier, this.diplomaticRemission, this.worldTafoni, this.diplomaticAcquittal, this.worldRockPedestal, this.diplomaticImmunity, this.worldBalancingRock, this.diplomaticIndulgence, this.worldFairyChimney, this.diplomaticCommutation, this.worldStoneArch, this.diplomaticMitigation, this.worldRockBridge, this.diplomaticCondonation, this.worldStoneWindow, this.diplomaticVindication, this.worldRockPillar, this.diplomaticRehabilitation, this.worldBlowhole2, this.worldRockShelter, this.diplomaticReconciliation2, this.worldNaturalTunnel, this.diplomaticAtonement, this.worldRockArch2, this.diplomaticAbsolution2, this.worldSeaCave, this.diplomaticAmnesty2, this.worldKarstSpring, this.diplomaticClemency2, this.worldSinkhole2, this.diplomaticPardon, this.diplomaticArbitration2, this.worldFumarole, this.worldHotSpring2, this.worldSolfatara, this.diplomaticIntercession, this.worldMaar, this.diplomaticArbitrement, this.diplomaticCompromise, this.diplomaticDetente2, this.worldLahar, this.worldPyroclasticFlow, this.diplomaticEntente2, this.worldPhreaticExplosion, this.diplomaticAccommodation, this.diplomaticConcordat, this.worldMudPot, this.worldSteamVent, this.worldTravertine, this.diplomaticMutualAid, this.worldGeyserite, this.worldSinter, this.worldTufa]
    this._batch26B = [this.creatureClaspMakers, this.creatureRivetMakers, this.creatureFerruleMakers, this.creatureGrommetMakers, this.creatureBobbinMakers, this.creatureSpindleMakers, this.creatureShuttleMakers, this.creatureBobbinLaceMakers, this.creatureTattingMakers, this.creatureNettingMakers, this.creatureFringeMakers, this.creatureTasselMakers, this.creatureBraidMakers, this.creatureMacrameMakers, this.creatureQuiltingMakers, this.creatureEmbroideryMakers, this.creatureAppliqueMakers, this.creatureSmockingMakers, this.creatureCrochetMakers, this.creatureFeltingMakers, this.creatureBobbinLace2Makers, this.creatureWeavingMakers, this.creatureDyeingMakers, this.creatureKnittingMakers, this.creatureFeltingMakers2, this.creatureSpinningMakers, this.creatureLoomMakers, this.creatureNeedleworkMakers, this.creatureWarpingMakers, this.creatureBobbinWinder, this.creatureCardingMakers, this.creatureFullingMakers, this.creatureTatamiMakers, this.creatureSilkWeaver, this.creaturePotter, this.creatureBasketWeaver, this.creatureHornworker, this.creatureScabbardMaker]
    this._batch46A = [this.worldSiliceousSinter, this.diplomaticDominion, this.worldHotPool, this.diplomaticCommonwealth, this.worldGeothermalPool, this.worldFumarolicField, this.diplomaticHegemony, this.worldMineralSpring, this.diplomaticSuzerainty, this.worldThermalSpring, this.diplomaticAutonomy, this.worldSodaSpring, this.diplomaticVassalage, this.worldArtesianWell, this.worldChalybeateSpring, this.diplomaticImperium, this.worldSulfurSpring, this.diplomaticMandate, this.worldLithiumSpring, this.diplomaticRegency, this.worldRadiumSpring, this.diplomaticStewardship, this.worldBorateSpring, this.diplomaticCustodianship, this.worldSeleniumSpring, this.diplomaticTrusteeship, this.worldMagnesiumSpring, this.diplomaticGuardianship, this.worldPotassiumSpring, this.diplomaticPatronage, this.worldStrontiumSpring, this.diplomaticStewardshipPact, this.worldBariumSpring, this.diplomaticConservatorship, this.worldZincSpring, this.diplomaticReceivership, this.worldCopperSpring, this.diplomaticProcuratorship, this.worldManganeseSpring, this.diplomaticPrefecture, this.worldTinSpring, this.diplomaticVicarage, this.worldIridiumSpring, this.diplomaticSeneschalry, this.worldOsmiumSpring, this.diplomaticChatelaincy, this.worldRutheniumSpring, this.diplomaticCastellany, this.worldNiobiumSpring, this.diplomaticBailiffry, this.worldTantalumSpring, this.diplomaticSheriffalty, this.worldHafniumSpring, this.diplomaticCoroner, this.worldZirconiumSpring, this.diplomaticEscheator, this.worldIndiumSpring, this.diplomaticAlmoner, this.worldGalliumSpring, this.diplomaticPurveyor, this.worldGermaniumSpring, this.diplomaticHarbinger, this.worldThalliumSpring, this.diplomaticVerderer, this.worldScandiumSpring, this.diplomaticHayward, this.worldYttriumSpring, this.diplomaticPannager, this.worldLanthanumSpring, this.diplomaticAgister, this.worldCeriumSpring, this.diplomaticWoodward, this.worldPraseodymiumSpring, this.diplomaticWarrener, this.worldNeodymiumSpring, this.diplomaticParkward, this.worldSamariumSpring, this.diplomaticWoodreve, this.worldEuropiumSpring, this.diplomaticRanger, this.worldGadoliniumSpring, this.diplomaticForestar, this.worldTerbiumSpring, this.diplomaticWaynward, this.worldDysprosiumSpring, this.diplomaticMootman, this.worldHolmiumSpring, this.diplomaticTithingman, this.worldErbiumSpring, this.diplomaticHayreve, this.worldThuliumSpring, this.diplomaticPinder, this.worldYtterbiumSpring, this.diplomaticGrithman, this.worldLutetiumSpring, this.diplomaticBorsholder, this.worldActiniumSpring, this.diplomaticAletaster, this.worldThoriumSpring, this.diplomaticBreadweigher, this.worldProtactiniumSpring, this.diplomaticMuragers, this.worldUraniumSpring, this.diplomaticGarthman, this.diplomaticCrier, this.worldPoloniumSpring, this.diplomaticBeadle, this.worldFranciumSpring, this.diplomaticHerbalist, this.worldRadonSpring, this.diplomaticLampwarden, this.worldAstatineSpring, this.diplomaticClavigers, this.worldCaesiumSpring, this.diplomaticPavior, this.worldRubidiumSpring, this.diplomaticWainage, this.worldTelluriumSpring, this.diplomaticGarble, this.worldXenonSpring, this.diplomaticTollbooth]
    this._batch46B = [this.creatureQuiverMaker, this.creatureStringMaker, this.creatureRopeWalker, this.creatureHarnessmaker, this.creatureBridlemaker, this.creatureYokemaker, this.creaturePlowright, this.creatureAnvilsmith, this.creatureToolsmith, this.creatureNailsmith, this.creatureChainmaker, this.creatureBellfounder, this.creatureGirdler, this.creaturePewterer, this.creatureWiredrawer, this.creatureGlazierMaster, this.creatureRiveter, this.creatureSmelter, this.creaturePuddler, this.creatureAssayer, this.creatureWelder, this.creatureRoller, this.creatureDrawer, this.creatureSpinner, this.creatureFurbisher, this.creatureTinplater, this.creatureAnnealer, this.creatureBurnisher, this.creatureSwager, this.creatureStamper, this.creatureForger, this.creatureHammerman, this.creaturePeener, this.creaturePlanisher, this.creatureBeveller, this.creatureFlatter, this.creatureChiseller, this.creatureKnurler, this.creatureReamer, this.creatureBroacher, this.creatureHoner, this.creatureLapper, this.creatureBorer, this.creatureCountersinker, this.creatureSpotfacer, this.creatureTapper, this.creatureCoiner, this.creatureSwageBlocker, this.creatureDrifter, this.creatureUpsetter, this.creatureSwedger, this.creatureBurnOuter, this.creatureScriber, this.creatureStaker, this.creaturePlanisherMaster, this.creatureNeedler]
  }

  private resetWorld(): void {
    // Clear all entities
    for (const id of this.em.getAllEntities()) {
      this.em.removeEntity(id)
    }

    // Reset civilization ID counter and names
    resetCivIdCounter()

    // Reset civilization manager
    this.civManager = new CivManager(this.em, this.world)
    this.spatialHash = new SpatialHashSystem(16)
    this.aiSystem = new AISystem(this.em, this.world, this.particles, this.creatureFactory, this.spatialHash)
    this.combatSystem = new CombatSystem(this.em, this.civManager, this.particles, this.audio, this.spatialHash)
    this.weather = new WeatherSystem(this.world, this.particles, this.em)
    this.resources = new ResourceSystem(this.world, this.em, this.civManager, this.particles)
    this.disasterSystem = new DisasterSystem(this.world, this.particles, this.em)
    this.timeline = new TimelineSystem()
    this.techSystem = new TechSystem()
    this.migrationSystem = new MigrationSystem()
    this.artifactSystem = new ArtifactSystem()
    this.diseaseSystem = new DiseaseSystem()
    this.worldEventSystem = new WorldEventSystem()
    this.caravanSystem = new CaravanSystem()
    this.diplomacySystem = new DiplomacySystem()
    this.cropSystem = new CropSystem()
    this.navalSystem = new NavalSystem()
    this.questSystem = new QuestSystem()
    this.buildingUpgradeSystem = new BuildingUpgradeSystem()
    this.ecosystemSystem = new EcosystemSystem()
    this.fogOfWarSystem = new FogOfWarSystem()
    this.religionSystem = new ReligionSystem()
    this.ambientParticles = new AmbientParticleSystem()
    this.cityPlanningSystem = new CityPlanningSystem()
    this.armySystem = new ArmySystem()
    this.eraSystem = new EraSystem()
    this.tradeEconomySystem = new TradeEconomySystem()
    this.heroLegendSystem = new HeroLegendSystem()
    this.wonderSystem = new WonderSystem()
    this.loyaltySystem = new LoyaltySystem()
    this.biomeEvolution = new BiomeEvolutionSystem()
    this.espionageSystem = new EspionageSystem()
    this.godPowerSystem = new GodPowerSystem()
    this.musicSystem.dispose()
    this.musicSystem = new MusicSystem()
    this.miningSystem = new MiningSystem()
    this.aiSystem.setResourceSystem(this.resources)
    this.aiSystem.setCivManager(this.civManager)
    this.combatSystem.setArtifactSystem(this.artifactSystem)
    this.powers = new Powers(this.world, this.em, this.creatureFactory, this.civManager, this.particles, this.audio)
    this.toolbar = new Toolbar('toolbar', this.powers)
    this.infoPanel = new InfoPanel('worldInfo', this.world, this.em, this.civManager)
    this.creaturePanel = new CreaturePanel('creaturePanel', this.em, this.civManager)
    this.statsPanel = new StatsPanel('statsPanel', this.em, this.civManager)
    this.techTreePanel = new TechTreePanel('techTreePanel', this.civManager)

    // Generate new world
    this.world.generate()
    this.miningSystem.generateOreMap(this.world.tiles)
    this.riverSystem = new RiverSystem()
    this.riverSystem.generateRivers(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.tradeRouteRenderer = new TradeRouteRenderer()
    this.ruinsSystem = new RuinsSystem()
    this.plagueVisual = new PlagueVisualSystem()
    this.worldDecorations = new WorldDecorationSystem()
    this.worldDecorations.generate(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.eraVisual = new EraVisualSystem()
    this.weatherDisaster = new WeatherDisasterSystem()
    this.fogOfWar = new FogOfWarRenderer()
    this.fortificationRenderer = new FortificationRenderer()
    this.evolutionSystem = new EvolutionSystem()
    this.populationSystem = new PopulationSystem()
    this.allianceSystem = new AllianceSystem()
    this.terraformingSystem = new TerraformingSystem()
    this.statisticsTracker = new StatisticsTracker()
    this.achievementContent = new AchievementContentSystem()
    this.chartPanel = new ChartPanelSystem()
    this.clonePower = new ClonePowerSystem()
    this.siegeWarfare = new SiegeWarfareSystem()
    this.tutorial = new TutorialSystem()
    this.renderCulling = new RenderCullingSystem()
    this.reputationSystem = new ReputationSystem()
    this.siegeSystem = new SiegeSystem()
    this.disasterWarning = new DisasterWarningSystem()
    this.moodSystem = new MoodSystem()
    this.worldAge = new WorldAgeSystem()
    this.bloodMoon = new BloodMoonSystem()
    this.creatureAging = new CreatureAgingSystem()
    this.resourceScarcity = new ResourceScarcitySystem()
    this.legendaryBattle = new LegendaryBattleSystem()
    this.worldBorder = new WorldBorderSystem()
    this.renderCulling.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
  }

  start(): void {
    this.lastTime = performance.now()
    this.loop()
  }

  private loop = (): void => {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now

    // FPS tracking
    this.frameCount++
    this.fpsTime += delta
    if (this.fpsTime >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / this.fpsTime)
      this.frameCount = 0
      this.fpsTime -= 1000
    }

    if (this.speed > 0) {
      this.accumulator += delta * this.speed
      // Cap max ticks per frame to prevent spiral of death at high entity counts
      const maxTicksPerFrame = 1
      let ticksThisFrame = 0
      while (this.accumulator >= this.tickRate && ticksThisFrame < maxTicksPerFrame) {
        ticksThisFrame++
        const tick = this.world.tick

        // === EVERY TICK: Core systems (AI, combat, world, civ) ===
        this.world.update()
        this.spatialHash.rebuild(this.em)
        this.aiSystem.update()
        // Combat runs every 2 ticks to reduce load at high entity counts
        if (tick % 2 === 0) this.combatSystem.update(tick)
        this.civManager.update()

        // === EVERY 5 TICKS (offset 0): Medium-importance systems (group A) ===
        if (tick % 5 === 0) {
        this.migrationSystem.update(this.em, this.world, this.civManager, this.particles)
        this.weather.update()
        this.resources.update()
        this.disasterSystem.update()
        this.timeline.update(tick)
        this.artifactSystem.update(this.em, this.world, this.particles, tick)
        this.artifactSystem.spawnClaimParticles(this.em, this.particles, tick)
        this.diseaseSystem.update(this.em, this.world, this.civManager, this.particles)
        }

        // === EVERY 5 TICKS (offset 1): Medium-importance systems (group B) ===
        if (tick % 5 === 1) {
        this.worldEventSystem.update(this.em, this.world, this.civManager, this.particles, this.timeline)
        this.caravanSystem.update(this.civManager, this.em, this.world, this.particles)
        this.cropSystem.update(this.world, this.civManager, this.em, this.particles)
        this.navalSystem.update(this.em, this.world, this.civManager, this.particles, tick)
        this.questSystem.update(this.em, this.world, this.civManager, this.particles, tick)
        this.ecosystemSystem.update(this.em, this.world, this.civManager, this.particles, tick)
        this.fogOfWarSystem.update(this.em, this.world, this.civManager, this.particles, tick)
        this.armySystem.update(this.em, this.civManager, this.world, this.particles, tick)
        this.populationSystem.update(this.em, this.world, this.civManager, this.particles, tick)
        }

        // === EVERY 10 TICKS (offset 0): Civilization progression (group A) ===
        if (tick % 10 === 0) {
        this.techSystem.update(this.civManager)
        this.religionSystem.update(this.civManager, this.em, this.world, this.particles, tick)
        this.eraSystem.update(this.civManager, this.em, this.particles, tick, this.timeline)
        this.heroLegendSystem.update(this.em, this.civManager, this.world, this.particles, tick)
        this.wonderSystem.update(this.civManager, this.em, this.world, this.particles, tick)
        this.tradeEconomySystem.update(this.civManager, this.em, this.world, this.particles, tick)
        // Culture system - cultural spread, trait adoption, language diffusion
        {
          let ci = 0
          for (const c of this.civManager.civilizations.values()) {
            // Grow or reuse culture civ buffer
            if (ci >= this._cultureCivBuf.length) {
              this._cultureCivBuf.push({ id: 0, neighbors: [], tradePartners: [], population: 0 })
            }
            const entry = this._cultureCivBuf[ci]
            entry.id = c.id; entry.population = c.population
            entry.neighbors.length = 0; entry.tradePartners.length = 0
            for (const [otherId, rel] of c.relations) {
              if (rel > -20) entry.neighbors.push(otherId)
              if (rel > 10) entry.tradePartners.push(otherId)
            }
            ci++
          }
          this._cultureCivBuf.length = ci
          this.cultureSystem.update(tick, this._cultureCivBuf)
        }
        } // end tick % 10 === 0

        // === EVERY 10 TICKS (offset 1): Civilization progression (group B) ===
        if (tick % 10 === 1) {
        this.loyaltySystem.update(this.civManager, this.em, this.world, this.particles, tick)
        this.biomeEvolution.update(this.world, this.civManager, this.em, this.particles, tick)
        this.espionageSystem.update(this.civManager, this.em, this.world, this.particles, tick)
        this.godPowerSystem.update(this.world, this.em, this.civManager, this.particles, tick)
        // Mining system - build civData from civilizations
        {
          // Reuse civRace map
          this._miningCivRace.clear()
          const allMembers = this.em.getEntitiesWithComponents('creature', 'civMember')
          for (const mid of allMembers) {
            const cm = this.em.getComponent<CivMemberComponent>(mid, 'civMember')
            if (!cm || this._miningCivRace.has(cm.civId)) continue
            const cc = this.em.getComponent<CreatureComponent>(mid, 'creature')
            if (cc) this._miningCivRace.set(cm.civId, cc.species)
          }
          let mi = 0
          for (const c of this.civManager.civilizations.values()) {
            if (mi >= this._miningCivBuf.length) {
              this._miningCivBuf.push({ id: 0, cities: [], techLevel: 0, race: 'human' })
            }
            const entry = this._miningCivBuf[mi]
            entry.id = c.id; entry.techLevel = c.techLevel
            entry.race = this._miningCivRace.get(c.id) ?? 'human'
            entry.cities.length = 0
            for (const bid of c.buildings) {
              const pos = this.em.getComponent<PositionComponent>(bid, 'position')
              if (pos) entry.cities.push({ x: Math.floor(pos.x), y: Math.floor(pos.y) })
            }
            mi++
          }
          this._miningCivBuf.length = mi
          this.miningSystem.update(tick, this._miningCivBuf)
        }
        this.allianceSystem.update(this.civManager, this.em, this.world, this.particles, tick)
        this.evolutionSystem.update(this.em, this.world, tick)
        this.terraformingSystem.update(this.world, this.particles, tick)
        } // end tick % 10 === 1

        // === EVERY 5 TICKS (offset 2): Secondary medium systems ===
        if (tick % 5 === 2) {
        this.disasterChainSystem.update(tick)
        this.seasonSystem.update(tick)
        this.animalMigration.update(tick, this.em, this.world, this.seasonSystem.getCurrentSeason())
        this.volcanoSystem.update(tick, this.world, this.particles)
        this.ruinsSystem.update(tick)
        this.plagueVisual.update()
        // Weather disaster linkage - use actual weather and season
        {
          const season = this.seasonSystem.getCurrentSeason()
          const w = this.weather.currentWeather
          const weatherForDisaster: 'clear' | 'rain' | 'storm' | 'snow' =
            w === 'rain' ? 'rain' : w === 'storm' || w === 'tornado' ? 'storm' : w === 'snow' ? 'snow' : 'clear'
          this.weatherDisaster.update(this.world, this.em, this.civManager, this.particles, tick, season, weatherForDisaster)
        }
        // Era visual sync - track most advanced civ
        {
          let maxEra: 'stone' | 'bronze' | 'iron' | 'medieval' | 'renaissance' = 'stone'
          const eraOrder = _ERA_ORDER
          for (const [civId] of this.civManager.civilizations) {
            const era = this.eraSystem.getEra(civId)
            if (eraOrder.indexOf(era) > eraOrder.indexOf(maxEra)) maxEra = era
          }
          this.eraVisual.setEra(maxEra)
        }
        this.eraVisual.update()
        this.fogOfWar.update()
        this.fortificationRenderer.update()
        }

        // === EVERY 60 TICKS: Statistics and decorative systems ===
        if (tick % 60 === 0) {
        this.statisticsTracker.update(tick, this.civManager, this.em)
        }
        // Object pool maintenance
        this.objectPool.update(this.tickRate / 1000)

        // === EVERY 5 TICKS (offset 3): Portal, water, formation ===
        if (tick % 5 === 3) {
        this.portalSystem.update(this.em, tick)
        this.waterAnimation.update(tick, this.world)
        this.formationSystem.update(this.em, this.world, tick)
        }

        // Enhanced minimap update
        if (tick % 30 === 0) {
          this.minimapSystem.update(this.world, this.civManager, this.em, tick)
        }

        // === EVERY 30 TICKS: Achievement content check ===
        if (tick % 30 === 5) {
        {
          // Reuse speciesSet - clear and refill
          this._achSpeciesSet.clear()
          for (const id of this.em.getEntitiesWithComponents('creature')) {
            const c = this.em.getComponent<CreatureComponent>(id, 'creature')
            if (c) this._achSpeciesSet.add(c.species)
          }
          let _achMaxPop = 0
          for (const c of this.civManager.civilizations.values()) { if (c.population > _achMaxPop) _achMaxPop = c.population }
          // Reuse achStats object
          const as = this._achStats
          as.totalCreatures = this.em.getEntitiesWithComponents('creature').length
          as.speciesSet = this._achSpeciesSet
          as.maxCityPop = _achMaxPop
          as.civsMet = this.civManager.civilizations.size
          as.totalTicks = tick
          as.totalCivs = this.civManager.civilizations.size
          as.clonedCreatures = this.clonePower.getCloneCount()
          as.portalPairs = this.portalSystem.getPortals().length / 2
          this.achievementContent.check(as)
        }
        }
        // Chart panel - record data point every 60 ticks
        if (tick % 60 === 0) {
          let totalTerritory = 0
          let totalTech = 0
          let warCount = 0
          for (const [, civ] of this.civManager.civilizations) {
            totalTerritory += civ.territory.size
            totalTech += civ.techLevel
            for (const [, rel] of civ.relations) { if (rel < -30) warCount++ }
          }
          const civCount = this.civManager.civilizations.size
          this.chartPanel.addDataPoint(tick, {
            population: this.em.getEntitiesWithComponents('creature').length,
            civCount,
            warCount: Math.floor(warCount / 2),
            avgTechLevel: civCount > 0 ? totalTech / civCount : 0,
            totalTerritory,
          })
        }
        // === EVERY 10 TICKS (offset 5): Clone, siege, mood, combat-adjacent ===
        if (tick % 10 === 5) {
        // Clone power - degradation updates
        {
          this._cloneEntities.length = 0
          for (const id of this.em.getEntitiesWithComponents('creature', 'position')) {
            const c = this.em.getComponent<CreatureComponent>(id, 'creature')
            if (!c) continue
            const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
            // Reuse or grow buffer
            if (this._cloneEntities.length < this._cloneEntitiesBuf.length) {
              const e = this._cloneEntitiesBuf[this._cloneEntities.length]
              e.id = id; e.isClone = this.clonePower.getGeneration(id) > 0
              e.health = needs?.health ?? 100; e.maxHealth = 100; e.age = c.age
              this._cloneEntities.push(e)
            } else {
              const e = { id, isClone: this.clonePower.getGeneration(id) > 0, health: needs?.health ?? 100, maxHealth: 100, age: c.age }
              this._cloneEntitiesBuf.push(e)
              this._cloneEntities.push(e)
            }
          }
          const events = this.clonePower.update(tick, this._cloneEntities)
          for (const ev of events) {
            const needs = this.em.getComponent<NeedsComponent>(ev.id, 'needs')
            if (needs && ev.type === 'health_loss') needs.health = Math.max(0, needs.health - ev.amount)
          }
        }
        this.siegeWarfare.update(tick)
        this.reputationSystem.update(tick, this.civManager, this.em)
        this.siegeSystem.update(tick, this.em, this.civManager, this.world)
        this.disasterWarning.update(tick)
        this.moodSystem.update(tick, this.em, this.world, this.civManager, this.weather.currentWeather, this.spatialHash)
        this.worldAge.update(tick, this.world)
        this.bloodMoon.update(tick)
        this.creatureAging.update(tick, this.em, this.spatialHash)
        this.resourceScarcity.update(tick, this.civManager, this.em, this.world)
        this.legendaryBattle.update(tick, this.em, this.civManager)
        this.worldBorder.update(tick)
        this.navalCombat.update(tick, this.em, this.civManager)
        this.religionSpread.update(tick, this.em, this.civManager)
        this.lodRender.update(this.camera)
        this.buildingVariety.update(tick, this.em)
        } // end tick % 10 offset 5

        // === EVERY 60 TICKS: History replay snapshot ===
        if (tick % 60 === 10) {
        const civSnap: { id: number; name: string; pop: number; color: string }[] = []
        for (const [id, c] of this.civManager.civilizations) {
          civSnap.push({ id, name: c.name, pop: c.population, color: c.color })
        }
        this.historyReplay.recordSnapshot(
          tick,
          this.em.getEntitiesWithComponent('creature').length,
          this.civManager.civilizations.size,
          0, _EMPTY_ARRAY, // wars and events simplified
          civSnap
        )
        }
        // === EVERY 5 TICKS (offset 4): Visual/particle systems ===
        if (tick % 5 === 4) {
        this.flocking.update(tick, this.em)
        this.seasonVisual.update(tick, this.seasonSystem.getCurrentSeason(), this.seasonSystem.getTransitionProgress(), !this.world.isDay())
        this.tradeFleet.update(tick)
        this.unifiedParticles.update(tick)
        this.weatherParticles.setWeather(this.weather.currentWeather === 'rain' ? 'rain' : this.weather.currentWeather === 'storm' || this.weather.currentWeather === 'tornado' ? 'storm' : this.weather.currentWeather === 'snow' ? 'snow' : 'clear')
        this.weatherParticles.update(tick, 0.5, 0)
        this.diplomacyVisual.update(tick)
        this.eventNotification.update(tick, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height, this.camera.zoom)
        this.battleReplay.update(tick)
        this.evolutionVisual.update(tick)
        this.achievementPopup.update(tick)
        this.minimapEnhanced.update(tick)
        this._ambientSoundParams.isNight = !this.world.isDay()
        this._ambientSoundParams.season = this.seasonSystem.getCurrentSeason()
        this._ambientSoundParams.weather = this.weather.currentWeather ?? 'clear'
        this._ambientSoundParams.cameraZoom = this.camera.zoom
        this.ambientSound.update(tick, this._ambientSoundParams)
        }

        // Diplomacy visual - update civ relation data
        if (tick % 120 === 0) {
          const civData: { id: number; name: string; color: string; capitalX: number; capitalY: number; relations: Map<number, number> }[] = []
          for (const [id, c] of this.civManager.civilizations) {
            const pos = c.buildings.length > 0 ? this.em.getComponent<PositionComponent>(c.buildings[0], 'position') : null
            civData.push({ id, name: c.name, color: c.color, capitalX: pos?.x ?? 0, capitalY: pos?.y ?? 0, relations: c.relations })
          }
          this.diplomacyVisual.updateCivData(civData)
        }

        // Enhanced fog of war
        if (tick % 30 === 0) {
          this._fogUnits.length = 0
          for (const id of this.em.getEntitiesWithComponents('creature', 'position')) {
            const pos = this.em.getComponent<PositionComponent>(id, 'position')
            if (!pos) continue
            // Reuse or grow buffer
            if (this._fogUnits.length < this._fogUnitsBuf.length) {
              const u = this._fogUnitsBuf[this._fogUnits.length]
              u.x = Math.floor(pos.x); u.y = Math.floor(pos.y); u.visionRange = 8
              this._fogUnits.push(u)
            } else {
              const u = { x: Math.floor(pos.x), y: Math.floor(pos.y), visionRange: 8 }
              this._fogUnitsBuf.push(u)
              this._fogUnits.push(u)
            }
          }
          this.fogEnhanced.updateVision(tick, this._fogUnits, _EMPTY_ARRAY)
        }

        // World dashboard - population sampling
        if (tick % 60 === 0) {
          const pops: Record<string, number> = {}
          for (const id of this.em.getEntitiesWithComponents('creature')) {
            const c = this.em.getComponent<CreatureComponent>(id, 'creature')
            if (c) pops[c.species] = (pops[c.species] ?? 0) + 1
          }
          this.worldDashboard.addPopulationSample(tick, pops)
        }
        // Tutorial system - check step conditions
        this.tutorial.update()
        // Build fortification data from civilizations
        if (tick % 120 === 0) {
          const forts: CityFortification[] = []
          for (const [civId, civ] of this.civManager.civilizations) {
            if (civ.buildings.length === 0) continue
            const pos = this.em.getComponent<PositionComponent>(civ.buildings[0], 'position')
            if (!pos) continue
            const era = this.eraSystem.getEra(civId)
            const level = era === 'stone' ? 'wooden' as const : era === 'bronze' || era === 'iron' ? 'stone' as const : 'castle' as const
            let hasWar = false; for (const r of civ.relations.values()) { if (r < -30) { hasWar = true; break } }
            forts.push({
              cityId: civ.buildings[0], civId, centerX: Math.floor(pos.x), centerY: Math.floor(pos.y),
              radius: Math.min(8, 3 + Math.floor(civ.territory.size / 50)),
              level, health: 100, maxHealth: 100,
              towerCount: Math.min(4, 1 + Math.floor(civ.techLevel / 2)),
              hasMoat: era === 'iron' || era === 'medieval' || era === 'renaissance',
              isUnderAttack: hasWar, color: civ.color
            })
          }
          this.fortificationRenderer.updateFortifications(forts)
          // Siege-formation linkage: auto-trigger sieges when civs are at war
          for (const [civId, civ] of this.civManager.civilizations) {
            for (const [otherId, rel] of civ.relations) {
              if (rel < -50 && !this.siegeWarfare.getSiegeAt(0, 0)) {
                const other = this.civManager.civilizations.get(otherId)
                if (other && other.buildings.length > 0 && civ.population > 5) {
                  const targetPos = this.em.getComponent<PositionComponent>(other.buildings[0], 'position')
                  if (targetPos) {
                    let _hasSiege = false
                    const _sieges = this.siegeWarfare.getActiveSieges()
                    for (let si = 0; si < _sieges.length; si++) {
                      if (_sieges[si].attackerCivId === civId && _sieges[si].defenderCivId === otherId) { _hasSiege = true; break }
                    }
                    if (!_hasSiege) {
                      this.siegeWarfare.startSiege(civId, otherId, Math.floor(targetPos.x), Math.floor(targetPos.y), Math.min(20, civ.population))
                      // Auto-form army into wedge formation for siege
                      this._siegeSoldiersBuf.length = 0
                      const _allSoldiers = this.em.getEntitiesWithComponents('position', 'creature', 'civMember')
                      for (let si = 0; si < _allSoldiers.length && this._siegeSoldiersBuf.length < 12; si++) {
                        const cm = this.em.getComponent<CivMemberComponent>(_allSoldiers[si], 'civMember')
                        if (cm?.civId === civId) this._siegeSoldiersBuf.push(_allSoldiers[si])
                      }
                      const soldiers = this._siegeSoldiersBuf
                      if (soldiers.length >= 3 && !this.formationSystem.getFormationForEntity(soldiers[0])) {
                        this.formationSystem.createFormation(civId, 'wedge', soldiers)
                      }
                    }
                  }
                }
              }
            }
          }
        }
        // Update trade route visualization from caravan data
        if (tick % 120 === 0) {
          const routes: TradeRoute[] = []
          for (const [, civ] of this.civManager.civilizations) {
            for (const [otherId, rel] of civ.relations) {
              if (rel > 10) {
                const other = this.civManager.civilizations.get(otherId)
                if (other && civ.buildings.length > 0 && other.buildings.length > 0) {
                  const p1 = this.em.getComponent<PositionComponent>(civ.buildings[0], 'position')
                  const p2 = this.em.getComponent<PositionComponent>(other.buildings[0], 'position')
                  if (p1 && p2) {
                    routes.push({ fromX: Math.floor(p1.x), fromY: Math.floor(p1.y), toX: Math.floor(p2.x), toY: Math.floor(p2.y), volume: Math.min(100, rel), active: true })
                  }
                }
              }
            }
          }
          this.tradeRouteRenderer.setRoutes(routes)
        }
        // === EVERY 60 TICKS: World chronicle, diplomacy, building upgrades ===
        if (tick % 60 === 20) {
        {
          const civs: { id: number; name: string; population: number; cities: number }[] = []
          let totalPop = 0, totalCities = 0
          for (const c of this.civManager.civilizations.values()) {
            civs.push({ id: c.id, name: c.name, population: c.population, cities: c.buildings.length })
            totalPop += c.population
            totalCities += c.buildings.length
          }
          const snapshot: WorldSnapshot = {
            totalPopulation: totalPop,
            totalCities,
            activeWars: 0,
            civilizations: civs,
            era: this.timeline.getCurrentEra().name,
          }
          this.worldChronicle.update(tick, snapshot)
        }
        this.diplomacySystem.update(this.civManager, this.world, this.em)
        this.buildingUpgradeSystem.update(this.em, this.civManager, tick)
        this.cityPlanningSystem.update(this.civManager, this.em, this.world, this.particles, tick)
        }
        // AutoSave system (replaces old tick-based autosave)
        this.autoSave.update(tick, this.world, this.em, this.civManager, this.resources)
        // Notification center fade-out
        this.notificationCenter.update(tick)
        // World stats overview sampling (v1.68)
        if (tick % 30 === 15) {
        this.worldStatsOverview.update(tick, this.em, this.civManager)
        }
        // Screenshot mode state (v1.66)
        this.screenshotMode.update()

        if (tick % 60 === 11) {
          for (let i = 0; i < this._batch11A.length; i++) this._batch11A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch11B.length; i++) this._batch11B[i].update(this.tickRate, this.em, tick)
          for (let i = 0; i < this._batch11C.length; i++) this._batch11C[i].update(this.tickRate, this.em, this.civManager, tick)
          for (let i = 0; i < this._batch11D.length; i++) this._batch11D[i].update(this.tickRate, this.world, tick)
          for (let i = 0; i < this._batch11E.length; i++) this._batch11E[i].update(this.tickRate, this.civManager, tick)
          this.creatureMemory.update(tick)
          this.pollution.update(this.world.tiles)
          this.prophecy.update(tick, this.civManager.civilizations.size)
          this.creatureSkill.update()
          this.worldNarrator.update()
          this.mythology.update(tick, this.civManager.civilizations.keys())
          this.creatureTaming.update(tick)
          this.plagueMutation.update(tick)
          this.monument.update(tick)
          this.creaturePersonality.update(tick)
          this.disasterRecovery.update(this.tickRate, this.world, this.em, this.civManager)
          this.migrationWave.update(this.tickRate, this.em, this.world, this.civManager)
          this.seasonFestival.update(this.tickRate, this.civManager, this.seasonSystem, tick)
          this.creatureMutation.update(this.tickRate, this.em, this.world)
          this.worldRelic.update(this.tickRate, this.em, this.world)
          this.worldAnomaly.update(this.tickRate, this.em, this.world)
          this.worldMythicBeast.update(this.tickRate, this.em, this.world)
          this.worldSeasonalDisaster.update(this.tickRate, this.em, this.world)
          this._civValuesBuf.length = 0
          for (const c of this.civManager.civilizations.values()) this._civValuesBuf.push(c)
          this.diplomaticEspionage.update(this.tickRate, this.em, this._civValuesBuf, tick)
          this.worldAncientRuin.update(this.tickRate, this.em, this.world)
          this.worldNaturalWonder.update(this.tickRate, this.em, this.world)
          this.creatureLanguage.update(this.tickRate, this.civManager.civilizations.keys(), tick)
          this.worldWeatherFront.update(this.tickRate, tick)
          this.worldMagicStorm.update(this.tickRate, tick)
          this.worldFertility.update(this.tickRate, this.world.tiles, tick)
          this.creatureFashion.update(this.tickRate, this.civManager.civilizations.keys(), tick)
        }

        if (tick % 60 === 41) {
          for (let i = 0; i < this._batch41A.length; i++) this._batch41A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch41B.length; i++) this._batch41B[i].update(this.tickRate, this.em, tick)
          for (let i = 0; i < this._batch41C.length; i++) this._batch41C[i].update(this.tickRate, this.em, this.civManager, tick)
          for (let i = 0; i < this._batch41D.length; i++) this._batch41D[i].update(this.tickRate, this.world, tick)
          for (let i = 0; i < this._batch41E.length; i++) this._batch41E[i].update(this.tickRate, this.civManager, tick)
          this.worldMigrationRoute.update(this.tickRate, tick)
          this.creatureTotem.update(this.tickRate, this.em, this.world, tick)
        }

        if (tick % 60 === 21) {
          for (let i = 0; i < this._batch21A.length; i++) this._batch21A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch21B.length; i++) this._batch21B[i].update(this.tickRate, this.em, tick)
          for (let i = 0; i < this._batch21C.length; i++) this._batch21C[i].update(this.tickRate, this.em, this.civManager, tick)
          this.creatureClaustrophobia.update(this.tickRate, this.em, this.world, tick)
          this.creaturePilgrimage.update(this.tickRate, this.em, this.world, tick)
        }

        if (tick % 60 === 36) {
          for (let i = 0; i < this._batch36A.length; i++) this._batch36A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch36B.length; i++) this._batch36B[i].update(this.tickRate, this.em, tick)
          for (let i = 0; i < this._batch36F.length; i++) this._batch36F[i].update(this.tickRate, this.world, this.em, this.civManager, tick)
        }

        if (tick % 60 === 51) {
          for (let i = 0; i < this._batch51A.length; i++) this._batch51A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch51B.length; i++) this._batch51B[i].update(this.tickRate, this.em, tick)
        }

        if (tick % 60 === 6) {
          for (let i = 0; i < this._batch6A.length; i++) this._batch6A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch6B.length; i++) this._batch6B[i].update(this.tickRate, this.em, tick)
        }

        if (tick % 60 === 26) {
          for (let i = 0; i < this._batch26A.length; i++) this._batch26A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch26B.length; i++) this._batch26B[i].update(this.tickRate, this.em, tick)
        }

        if (tick % 60 === 46) {
          for (let i = 0; i < this._batch46A.length; i++) this._batch46A[i].update(this.tickRate, this.world, this.em, tick)
          for (let i = 0; i < this._batch46B.length; i++) this._batch46B[i].update(this.tickRate, this.em, tick)
        }


        // === EVERY TICK: Visual effects and particles (must run every tick) ===
        this.uiHelper.updateVisualEffects()
        this.particles.update()
        this.accumulator -= this.tickRate
      }
      // Drain excess accumulator to prevent spiral of death
      if (ticksThisFrame >= maxTicksPerFrame) {
        this.accumulator = 0
      }
    }

    // Update render culling viewport
    this.renderCulling.setViewport(this.camera.x, this.camera.y, window.innerWidth, window.innerHeight, this.camera.zoom)

    this.renderer.render(this.world, this.camera, this.em, this.civManager, this.particles, this.weather.fogAlpha, this.resources, this.caravanSystem, this.cropSystem)

    const ctx = this.canvas.getContext('2d')!
    const bounds = this.camera.getVisibleBounds()

    // Water animation overlay (waves, reflections, foam)
    this.waterAnimation.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY, this.world, this.world.dayNightCycle)

    // World decorations (flowers, rocks, etc.)
    this.worldDecorations.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)

    // Trade route overlay
    this.tradeRouteRenderer.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)
    // Ambient particles (viewport-based)
    const vpX = this.camera.x / TILE_SIZE
    const vpY = this.camera.y / TILE_SIZE
    const vpW = window.innerWidth / (TILE_SIZE * this.camera.zoom)
    const vpH = window.innerHeight / (TILE_SIZE * this.camera.zoom)
    this.ambientParticles.update(this.world, this.particles, this.world.tick, vpX, vpY, vpW, vpH)
    // Dynamic music & ambient sound
    let hasWar = false
    for (const [, c] of this.civManager.civilizations) {
      for (const [, rel] of c.relations) {
        if (rel < -50) { hasWar = true; break }
      }
      if (hasWar) break
    }
    this._musicState.isNight = !this.world.isDay()
    this._musicState.atWar = hasWar
    this._musicState.disasterActive = this.disasterSystem.getActiveDisasters().length > 0
    this._musicState.isEpic = this.wonderSystem.getActiveWonders().length > 0
    this._musicState.isRaining = this.weather.currentWeather === 'rain' || this.weather.currentWeather === 'storm'
    this.musicSystem.update(this._musicState)
    this.renderer.renderBrushOutline(this.camera, this.input.mouseX, this.input.mouseY, this.powers.getBrushSize())

    // Minimap + overlay: throttle to every 3 frames to reduce GC and draw cost
    if (this.world.tick % 3 === 0) {
      this.renderer.renderMinimap(this.world, this.camera, this.em, this.civManager)

      // Minimap overlay (political/population/military modes) - reuse buffers
      {
        const mCtx = this.minimapCanvas.getContext('2d')
        if (mCtx) {
          // Reset reusable arrays
          let setIdx = 0
          for (const [, c] of this.civManager.civilizations) {
            // Reuse or create Set and data object
            if (setIdx >= this._politicalSets.length) {
              this._politicalSets.push(new Set<number>())
              this._politicalData.push({ color: '', territory: this._politicalSets[setIdx] })
            }
            const numSet = this._politicalSets[setIdx]
            numSet.clear()
            for (const t of c.territory) {
              numSet.add(typeof t === 'string' ? parseInt(t, 10) : t as number)
            }
            this._politicalData[setIdx].color = c.color
            this._politicalData[setIdx].territory = numSet
            setIdx++
          }
          this._politicalData.length = setIdx
          this._minimapOverlayData.political = this._politicalData
          this._minimapOverlayData.worldWidth = WORLD_WIDTH
          this._minimapOverlayData.worldHeight = WORLD_HEIGHT
          this.minimapOverlay.render(mCtx, this.minimapCanvas.width, this.minimapCanvas.height, this._minimapOverlayData)
        }
      }
    }

    // Minimap mode button (v1.67)
    {
      if (this._minimapRectDirty) {
        const mRect = this.minimapCanvas.getBoundingClientRect()
        this._minimapRect.left = mRect.left
        this._minimapRect.top = mRect.top
        this._minimapRectDirty = false
      }
      this.minimapMode.renderModeButton(ctx, this._minimapRect.left, this._minimapRect.top)
    }

    // World event overlays and banners

    // Day/night lighting overlay
    this.dayNightRenderer.render(ctx, this.canvas.width, this.canvas.height, this.world.dayNightCycle, this.world.isDay())

    // Plague visual overlay
    this.plagueVisual.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Weather disaster overlay
    this.weatherDisaster.renderOverlay(ctx, this.canvas.width, this.canvas.height, this.world.tick)

    // Era visual overlay & indicator
    this.eraVisual.renderOverlay(ctx, this.canvas.width, this.canvas.height)
    this.eraVisual.renderEraIndicator(ctx, this.canvas.width - 160, 10)

    // Fog of war overlay - connect to actual FogOfWarSystem
    {
      const bounds = this.camera.getVisibleBounds()
      this._fogCivId = this.civManager.civilizations.keys().next().value
      this.fogOfWar.render(ctx, this.camera.x, this.camera.y, this.camera.zoom,
        bounds.startX, bounds.startY, bounds.endX, bounds.endY,
        this._fogCallback)
    }

    // Fortification rendering
    this.fortificationRenderer.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)

    // Terraforming visual effects overlay
    this.terraformingSystem.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Portal visual effects
    this.portalSystem.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    this.worldEventSystem.renderScreenOverlay(ctx, this.canvas.width, this.canvas.height)
    this.worldEventSystem.renderEventBanner(ctx, this.canvas.width)
    this.worldEventSystem.renderActiveIndicators(ctx, this.canvas.width)

    // Toast notifications
    this.toastSystem.update()
    this.toastSystem.render(ctx, this.canvas.width)

    // Chart panel overlay
    if (this.chartPanel.isVisible) {
      this.chartPanel.render(ctx, this.canvas.width - 420, 60, 400, 250)
    }

    // Clone power visual effects - reuse buffer to avoid GC
    {
      this._clonePositions.length = 0
      for (const id of this.em.getEntitiesWithComponents('position', 'creature')) {
        const gen = this.clonePower.getGeneration(id)
        if (gen > 0) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')
          if (!pos) continue
          this._clonePositions.push({ x: pos.x, y: pos.y, generation: gen })
        }
      }
      if (this._clonePositions.length > 0) {
        this.clonePower.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, this._clonePositions)
      }
    }

    // Formation overlay
    this.formationSystem.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Siege warfare visual effects
    this.siegeWarfare.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // World age epoch color overlay
    {
      const overlay = this.worldAge.getColorOverlay()
      if (overlay.a > 0) {
        ctx.fillStyle = `rgba(${overlay.r},${overlay.g},${overlay.b},${overlay.a})`
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      }
    }

    // Disaster warning visual effects - screen shake and darkening
    {
      const effects = this.disasterWarning.getVisualEffects()
      for (const effect of effects) {
        if (effect.kind === 'SkyDarken') {
          ctx.fillStyle = `rgba(0,0,0,${effect.intensity * 0.4})`
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        }
      }
    }

    // Blood moon overlay and moon rendering
    if (this.bloodMoon.isActive()) {
      this.bloodMoon.render(ctx, this.canvas.width, this.canvas.height, this.world.tick)
    }

    // World border edge effects
    {
      const bounds = this.camera.getVisibleBounds()
      this.worldBorder.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)
    }

    // Religion spread visualization
    this.religionSpread.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)
    this.religionSpread.renderTemples(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.em)

    // River rendering with flow animation
    this.mapGen.renderRivers(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.world.tick)

    // Naval combat effects
    this.navalCombat.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Building variety rendering
    this.buildingVariety.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.em)

    // History replay timeline (if active)
    this.historyReplay.render(ctx, this.canvas.width, this.canvas.height)

    // Season visual overlay and particles
    this.seasonVisual.render(ctx, this.canvas.width, this.canvas.height, this.seasonSystem.getCurrentSeason(), this.seasonSystem.getTransitionProgress(), !this.world.isDay())
    this.seasonVisual.renderSeasonIndicator(ctx, this.canvas.width - 100, 10, this.seasonSystem.getCurrentSeason(), this.seasonSystem.getSeasonProgress())

    // Trade fleet - ships and routes on water
    this.tradeFleet.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)


    // Weather particle effects overlay
    this.weatherParticles.render(ctx, this.canvas.width, this.canvas.height)

    // Diplomacy visual - relation lines and event bubbles
    this.diplomacyVisual.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)
    this.diplomacyVisual.renderPanel(ctx, this.canvas.width, this.canvas.height)

    // Event notification - edge indicators and ticker
    this.eventNotification.render(ctx, this.canvas.width, this.canvas.height)

    // Editor enhanced - brush preview and grid
    this.editorEnhanced.renderGrid(ctx, this.camera.x, this.camera.y, this.camera.zoom, 0, 0, this.canvas.width, this.canvas.height)

    // Enhanced fog of war
    if (this.fogEnhanced.isEnabled()) {
      const bounds = this.camera.getVisibleBounds()
      this.fogEnhanced.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)
    }

    // Battle replay overlay
    if (this.battleReplay.isReplaying()) {
      this.battleReplay.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)
      this.battleReplay.renderControls(ctx, this.canvas.width, this.canvas.height)
      this.battleReplay.renderStats(ctx, this.canvas.width, this.canvas.height)
    }

    // Evolution visual panel
    this.evolutionVisual.render(ctx, this.canvas.width, this.canvas.height)

    // Achievement popup and progress
    this.achievementPopup.render(ctx, this.canvas.width, this.canvas.height)

    // Minimap enhanced overlay - throttle to every 5 frames
    if (this.world.tick % 5 === 0) {
      this.minimapEnhanced.render(ctx, this.canvas.width - 160, this.canvas.height - 160, 150, 150, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height)
    }

    // Ambient sound volume indicator
    this.ambientSound.renderVolumeIndicator(ctx, 10, this.canvas.height - 80)
    // Unified particle system
    this.unifiedParticles.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // World dashboard overlay
    this.worldDashboard.render(ctx, this.canvas.width, this.canvas.height)

    // Tutorial overlay (rendered last for top-most visibility)
    if (this.tutorial.isActive()) {
      this.tutorial.render(ctx, this.canvas.width, this.canvas.height)
    }

    if (this.world.tick % 30 === 0) {
      this.infoPanel.update(this.fps)
      this.statsPanel.update(this.world.tick)
      this.achievements.updateStats(this.uiHelper.gatherWorldStats())
      this.uiHelper.updateAchievementsButton()
      if (this.techTreePanel.isVisible()) {
        this.techTreePanel.render()
      }
    }

    // Achievement notifications
    this.achievements.updateNotifications()
    this.achievements.renderNotifications(ctx, this.canvas.width)

    // Real-time creature panel update when selected
    if (this.creaturePanel.getSelected()) {
      this.creaturePanel.update()
      this.uiHelper.renderSelectedHighlight()
    }

    this.uiHelper.updateDayNightIndicator()

    // Performance monitor update + render (v1.62)
    this.perfMonitor.update(
      this.accumulator > 0 ? this.tickRate / 1000 : 1 / 60,
      this.em.getEntityCount(),
      this.world.tick,
      this.speed
    )
    this.perfMonitor.render(ctx)

    // AutoSave indicator (v1.61)
    this.autoSave.render(ctx)

    // World seed display (v1.63)
    this.worldSeed.render(ctx, this.canvas.width)

    // Keybind panel overlay (v1.64)
    this.keybindSystem.render(ctx, this.canvas.width, this.canvas.height)

    // World export progress overlay (v1.65)
    this.worldExport.render(ctx, this.canvas.width, this.canvas.height)

    // World stats overview (v1.68)
    this.worldStatsOverview.render(ctx, this.canvas.width, this.canvas.height)

    this.entitySearch.render(ctx, this.canvas.width, this.canvas.height)

    // Notification center (v1.69)
    this.notificationCenter.render(ctx, this.canvas.width, this.canvas.height)

    // Sandbox settings panel (v1.70)
    this.sandboxSettings.render(ctx, this.canvas.width, this.canvas.height)

    // Camera bookmarks toast/panel (v1.68)
    this.cameraBookmarks.update()
    this.cameraBookmarks.render(ctx, this.canvas.width, this.canvas.height)

    // Entity inspector panel (v1.69)
    this.entityInspector.render(ctx, this.canvas.width, this.canvas.height)

    // Speed indicator HUD (v1.70)
    this.speedIndicator.update(this.speed)
    this.speedIndicator.render(ctx, this.canvas.width, this.canvas.height, this.speed)

    // Achievement progress tracker (v1.76)
    this.achievementProgress.render(ctx, this.canvas.width, this.canvas.height)

    // Camera animation system (v1.76)
    this.cameraAnimation.update(
      this.world.tick, this.camera.x, this.camera.y, this.camera.zoom
    )
    this.cameraAnimation.render(ctx, this.canvas.width, this.canvas.height)

    // City layout system (v1.77)
    this.cityLayout.update(this.world.tick)
    this.cityLayout.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Era transition system (v1.77)
    this.eraTransition.update(this.world.tick)
    this.eraTransition.render(ctx, this.canvas.width, this.canvas.height)

    // Terrain decoration system (v1.78)
    this.terrainDecoration.update(this.world.tick)
    {
      const startTX = Math.floor(this.camera.x / TILE_SIZE)
      const startTY = Math.floor(this.camera.y / TILE_SIZE)
      const endTX = Math.ceil((this.camera.x + this.canvas.width / this.camera.zoom) / TILE_SIZE)
      const endTY = Math.ceil((this.camera.y + this.canvas.height / this.camera.zoom) / TILE_SIZE)
      this.terrainDecoration.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, startTX, startTY, endTX, endTY)
    }

    // Map marker system (v1.78)
    this.mapMarker.update(this.world.tick)
    this.mapMarker.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Time rewind system (v1.79)
    const popCount = this.em.getEntityCount()
    const civCount = this.civManager.civilizations.size
    this.timeRewind.update(this.world.tick, popCount, civCount)
    this.timeRewind.render(ctx, this.canvas.width, this.canvas.height)

    // Weather control panel (v1.79)
    this.weatherControl.update(this.world.tick)
    this.weatherControl.render(ctx, this.canvas.width, this.canvas.height)

    // Custom species creator (v1.80)
    this.customSpecies.render(ctx, this.canvas.width, this.canvas.height)

    // World event timeline (v1.81)
    this.worldEventTimeline.update(this.world.tick)
    this.worldEventTimeline.render(ctx, this.canvas.width, this.canvas.height)

    // Resource flow visualization (v1.82)
    this.resourceFlow.update(this.world.tick)
    this.resourceFlow.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Creature emotion bubbles (v1.83)
    this.creatureEmotion.update(this.world.tick)

    // Power favorite bar (v1.84)
    this.powerFavorite.render(ctx, this.canvas.width, this.canvas.height)

    // World heatmap overlay (v1.85)
    this.worldHeatmap.update(this.world.tick)
    this.worldHeatmap.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.canvas.width, this.canvas.height)

    // Zone management overlay (v1.86)
    this.zoneManagement.update(this.world.tick)
    this.zoneManagement.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.canvas.width, this.canvas.height)

    // Creature lineage panel (v1.87)
    this.creatureLineage.render(ctx, this.canvas.width, this.canvas.height)

    // World law panel (v1.88)
    this.worldLaw.render(ctx, this.canvas.width, this.canvas.height)

    // Mini game events (v1.89)
    this.miniGame.update(this.world.tick)
    this.miniGame.render(ctx, this.canvas.width, this.canvas.height)

    // Cinematic mode (v1.90)
    this.cinematicMode.render(ctx, this.canvas.width, this.canvas.height)

    // Pollution overlay (v1.92)
    this.pollution.renderOverlay(ctx, this.camera.x, this.camera.y, this.camera.zoom, TILE_SIZE)

    // Creature memory panel (v1.91)
    this.creatureMemory.render(ctx)

    // Prophecy panel (v1.93)
    this.prophecy.render(ctx, this.world.tick)

    // Creature skill panel (v1.94)
    this.creatureSkill.render(ctx)

    // World narrator panel (v1.95)
    this.worldNarrator.render(ctx)

    // Mythology panel (v1.96)
    this.mythology.render(ctx)

    // Creature taming panel (v1.97)
    this.creatureTaming.render(ctx)

    // Plague mutation panel (v1.98)
    this.plagueMutation.render(ctx)

    // Monument panel (v1.99)
    this.monument.render(ctx)

    // Monument world icons (v1.99)
    this.monument.renderWorld(ctx, this.camera.x, this.camera.y, this.camera.zoom, TILE_SIZE)

    // Creature personality panel (v2.00)
    this.creaturePersonality.render(ctx)


    // World corruption overlay (v2.07)
    this.worldCorruption.renderOverlay(ctx, this.camera.x, this.camera.y, this.camera.zoom, TILE_SIZE)

    // Creature profession panel (v2.08)
    this.creatureProfession.render(ctx)

    // Diplomatic summit notification (v2.09)
    this.diplomaticSummit.render(ctx)

    // World ley lines (v2.10)
    this.worldLeyLine.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Creature bounty board (v2.11)
    this.creatureBounty.render(ctx)

    // Season festival notifications (v2.12)
    this.seasonFestival.render(ctx)

    // Creature mutation notifications (v2.13)
    this.creatureMutation.render(ctx)


    // World relics (v2.15)
    this.worldRelic.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Creature ancestor spirits (v2.16)
    this.creatureAncestor.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // World anomalies (v2.17)
    this.worldAnomaly.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Creature apprentice links (v2.18)
    this.creatureApprentice.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.em)

    // Diplomatic sanctions panel (v2.19)
    this.diplomaticSanction.render(ctx)

    // World mythic beasts (v2.20)
    this.worldMythicBeast.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Creature guilds (v2.21)
    this.creatureGuild.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // World seasonal disasters (v2.22)
    this.worldSeasonalDisaster.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Creature reputation (v2.23)
    this.creatureReputation.render(ctx, this.em, this.camera.x, this.camera.y, this.camera.zoom)

    // Diplomatic espionage (v2.24)
    this.diplomaticEspionage.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // World ancient ruins (v2.25)
    this.worldAncientRuin.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Screenshot mode toast (v1.66)
    this.screenshotMode.update()
    this.screenshotMode.render(ctx, this.canvas.width, this.canvas.height)

    // Screenshot capture (after all rendering, before rAF)
    if (this.screenshotMode.isActive()) {
      this.screenshotMode.captureAndDownload(this.canvas)
    }

    requestAnimationFrame(this.loop)
  }

  private showSaveLoadPanel(mode: 'save' | 'load'): void {
    showSaveLoadPanel(mode, {
      world: this.world,
      em: this.em,
      civManager: this.civManager,
      resources: this.resources
    })
  }
}
