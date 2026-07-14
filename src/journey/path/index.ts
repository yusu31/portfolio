// 3Dスクロールジャーニーの経路モジュール(設計書§6 / Phase 5-1で sections.ts から分割)。
// venues: ヴェニュー座標(単一ソース) / curves: カメラ・視線経路 / sections: カード表示区間
export { VENUES } from './venues'
export { CAMERA_PATH, LOOKAT_PATH, PATH_END_OFFSET, PAGES } from './curves'
export { SECTION_RANGES, sectionAt } from './sections'
export type { SectionId, SectionRange } from './sections'
