// ボールリレー後半(fall〜rest)のビート間で共有するイージング関数。
export const easeInCubic = (t: number) => t * t * t
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
