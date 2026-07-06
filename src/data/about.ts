export interface AboutDetail {
  marker: string
  heading: string
  text: string
}

export interface AboutPoint {
  id: string
  label: string
  title: string
  body: string
  details: AboutDetail[]
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
    details: [
      { marker: '10YRS', heading: '体育教師', text: '生徒の成長を設計する10年間。伝え方と組み立てが仕事の核だった' },
      { marker: '転機', heading: 'テクノロジーとの出会い', text: '教育を変える瞬間を目撃。深夜に初めてのHTMLを書いた' },
      { marker: 'NOW', heading: 'エンジニア', text: '教えることと作ることを、コードでつなぐ側へ' },
    ],
    tags: ['10年間の教員経験', 'キャリアチェンジ', '2024年〜'],
    hotspotX: '25%',
    hotspotY: '38%',
  },
  {
    id: 'style',
    label: 'Work Style',
    title: '仕事スタイル',
    body: '設計が9割。ユーザーが迷わない、1機能に特化したプロダクトを信条とする。チームの中で動き、ドリブルもパスも使い分ける。問題はコードで解くより先に言葉で解く。',
    details: [
      { marker: '01', heading: '設計が9割', text: '作り始める前に、迷わない導線を描き切る' },
      { marker: '02', heading: '1機能に特化', text: 'ユーザーが迷わないプロダクトを信条にする' },
      { marker: '03', heading: '言葉で先に解く', text: 'コードを書く前に、問題を言語化する' },
      { marker: '04', heading: 'チームで動く', text: 'ドリブルもパスも、状況で使い分ける' },
    ],
    tags: ['設計重視', 'チームプレー', '言語化力'],
    hotspotX: '60%',
    hotspotY: '32%',
  },
  {
    id: 'seeking',
    label: 'Looking For',
    title: '求める環境',
    body: 'プロダクトを一緒に育てる自社開発の環境。エンジニアとしての成長と、社会への価値提供を同時に追える場所。副業・スタートアップへの参加にも積極的。',
    details: [
      { marker: '✓', heading: '自社開発', text: 'プロダクトを一緒に育てる環境' },
      { marker: '✓', heading: '成長 × 価値提供', text: 'エンジニアとしての成長と社会への価値を同時に追う' },
      { marker: '✓', heading: '副業・スタートアップ', text: '新しい挑戦への参加に積極的' },
    ],
    tags: ['自社開発', 'スタートアップ', '副業歓迎'],
    hotspotX: '45%',
    hotspotY: '62%',
  },
]
