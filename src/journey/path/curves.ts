// スクロール終端の静止オフセットと、仮想ページ数(スクロール長)の定義。
// カメラ位置・視線経路(CAMERA_PATH/LOOKAT_PATH)は、チェイスカム化(PR-2)で全廃した:
// 独立経路+focusWeight部分ブレンド方式は「カメラがボールと無関係に動き、ボールが置き去りになる」
// 不満の根本原因だったため、camera.ts(poseJourneyCamera)がgetBallFrame(u)から
// 位置・視線を直接導出する方式に一本化した(設計書§2)。

/**
 * カメラが経路上で停止するoffset上限(終端静止)。
 * チェイスカム化後もこの値自体は不変: ボール(REST_END=この値)が最終静止点(CONTACT_REST)へ
 * 到達するタイミングとカメラの終端静止を一致させる基準点として、beats.tsのREST_ENDが直接参照する
 */
export const PATH_END_OFFSET = 0.9933

/**
 * ScrollControlsの仮想ページ数(スクロールの長さ)。
 * Phase 5-5でスクロール速度パリティ round(253.5 / (199.7/21)) = 27 を初期値に採用
 * (距離は結果指標というユーザー方針。通しスクロールQAで±2の調整余地あり)
 */
export const PAGES = 27
