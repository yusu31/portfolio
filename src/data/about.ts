export interface AboutPoint {
  id: string
  label: string
  title: string
  body: string
  tags: string[]
  hotspotX: string
  hotspotY: string
}

export const ABOUT_POINTS: AboutPoint[] = [
  {
    id: 'background',
    label: 'Background',
    title: 'バックグラウンド',
    body: '10年間、体育教師として生徒の成長を設計してきた。テクノロジーが教育を変える瞬間を目撃し、エンジニアへ転身。深夜に初めてHTMLを書いた日から、教えることと作ることをコードでつないできた。',
    tags: ['10年間の教員経験', 'キャリアチェンジ', '2024年〜'],
    hotspotX: '25%',
    hotspotY: '38%',
  },
  {
    id: 'style',
    label: 'Work Style',
    title: '仕事スタイル',
    body: '設計が9割。ユーザーが迷わない、1機能に特化したプロダクトを信条とする。チームの中で動き、ドリブルもパスも使い分ける。問題はコードで解くより先に言葉で解く。',
    tags: ['設計重視', 'チームプレー', '言語化力'],
    hotspotX: '60%',
    hotspotY: '32%',
  },
  {
    id: 'seeking',
    label: 'Looking For',
    title: '求める環境',
    body: 'プロダクトを一緒に育てる自社開発の環境。エンジニアとしての成長と、社会への価値提供を同時に追える場所。副業・スタートアップへの参加にも積極的。',
    tags: ['自社開発', 'スタートアップ', '副業歓迎'],
    hotspotX: '45%',
    hotspotY: '62%',
  },
]
