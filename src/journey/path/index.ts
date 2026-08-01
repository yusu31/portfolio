// 3Dスクロールジャーニーの経路モジュール(設計書§6 / Phase 5-1で sections.ts から分割)。
// venues: ヴェニュー座標(単一ソース) / curves: カメラ・視線経路 / sections: カード表示区間
// transit: ヴェニュー間の骨格区間座標(Phase 5-2で追加)
export {
  VENUES,
  VENUE_SCALE,
  COURT_SIZES,
  STRUCTURE_GROUND_LIFT,
  SOCCER_GOAL_GROUP_OFFSET,
  SOCCER_GOAL_POST_Z,
  SOCCER_GOAL_POST_RADIUS,
  SOCCER_GOAL_BOTTOM_Y,
  SOCCER_GOAL_CROSSBAR_Y,
  SOCCER_GOAL_POST_HEIGHT,
  SOCCER_GOAL_CROSSBAR_LENGTH,
  SOCCER_NET_DEPTH_TOP,
  SOCCER_NET_DEPTH_BOTTOM,
  VOLLEY_NET_GROUP_OFFSET,
  VOLLEY_NET_POST_Z,
  VOLLEY_NET_POST_RADIUS,
  VOLLEY_NET_POST_HEIGHT,
  VOLLEY_NET_BAND_Y,
  VOLLEY_NET_BAND_THICKNESS,
  VOLLEY_NET_LENGTH,
  VOLLEY_NET_TOP_Y,
  VOLLEY_NET_HEIGHT,
  VOLLEY_NET_BOTTOM_Y,
  FINISH_GATE_OFFSET_Z,
  FINISH_GATE_POLE_X,
} from './venues'
export { PATH_END_OFFSET, PAGES } from './curves'
export { SECTION_RANGES, sectionAt } from './sections'
export type { SectionId, SectionRange } from './sections'
export { TRANSIT_SPANS } from './transit'
export type { TransitSpan } from './transit'
