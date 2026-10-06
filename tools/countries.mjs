// 국가 기본 정보 (국가 팩이 없어도 어느 나라든 동작하게 하는 최소 테이블)
// code: ISO 3166-1 alpha-2 소문자 / currency: ISO 4217
// 여기 없는 나라는 MD에 `currency: XXX`만 적어주면 된다.

export const COUNTRIES = {
  // 동아시아
  jp: { currency: 'JPY', ko: '일본', ja: '日本', en: 'Japan' },
  kr: { currency: 'KRW', ko: '한국', ja: '韓国', en: 'South Korea' },
  cn: { currency: 'CNY', ko: '중국', ja: '中国', en: 'China' },
  tw: { currency: 'TWD', ko: '대만', ja: '台湾', en: 'Taiwan' },
  hk: { currency: 'HKD', ko: '홍콩', ja: '香港', en: 'Hong Kong' },
  mo: { currency: 'MOP', ko: '마카오', ja: 'マカオ', en: 'Macau' },
  mn: { currency: 'MNT', ko: '몽골', ja: 'モンゴル', en: 'Mongolia' },
  // 동남아
  vn: { currency: 'VND', ko: '베트남', ja: 'ベトナム', en: 'Vietnam' },
  th: { currency: 'THB', ko: '태국', ja: 'タイ', en: 'Thailand' },
  ph: { currency: 'PHP', ko: '필리핀', ja: 'フィリピン', en: 'Philippines' },
  sg: { currency: 'SGD', ko: '싱가포르', ja: 'シンガポール', en: 'Singapore' },
  my: { currency: 'MYR', ko: '말레이시아', ja: 'マレーシア', en: 'Malaysia' },
  id: { currency: 'IDR', ko: '인도네시아', ja: 'インドネシア', en: 'Indonesia' },
  kh: { currency: 'KHR', ko: '캄보디아', ja: 'カンボジア', en: 'Cambodia' },
  la: { currency: 'LAK', ko: '라오스', ja: 'ラオス', en: 'Laos' },
  mm: { currency: 'MMK', ko: '미얀마', ja: 'ミャンマー', en: 'Myanmar' },
  // 남아시아·중동
  in: { currency: 'INR', ko: '인도', ja: 'インド', en: 'India' },
  np: { currency: 'NPR', ko: '네팔', ja: 'ネパール', en: 'Nepal' },
  lk: { currency: 'LKR', ko: '스리랑카', ja: 'スリランカ', en: 'Sri Lanka' },
  mv: { currency: 'MVR', ko: '몰디브', ja: 'モルディブ', en: 'Maldives' },
  ae: { currency: 'AED', ko: '아랍에미리트', ja: 'アラブ首長国連邦', en: 'UAE' },
  tr: { currency: 'TRY', ko: '튀르키예', ja: 'トルコ', en: 'Türkiye' },
  il: { currency: 'ILS', ko: '이스라엘', ja: 'イスラエル', en: 'Israel' },
  jo: { currency: 'JOD', ko: '요르단', ja: 'ヨルダン', en: 'Jordan' },
  eg: { currency: 'EGP', ko: '이집트', ja: 'エジプト', en: 'Egypt' },
  // 유럽 (유로)
  fr: { currency: 'EUR', ko: '프랑스', ja: 'フランス', en: 'France' },
  de: { currency: 'EUR', ko: '독일', ja: 'ドイツ', en: 'Germany' },
  it: { currency: 'EUR', ko: '이탈리아', ja: 'イタリア', en: 'Italy' },
  es: { currency: 'EUR', ko: '스페인', ja: 'スペイン', en: 'Spain' },
  pt: { currency: 'EUR', ko: '포르투갈', ja: 'ポルトガル', en: 'Portugal' },
  nl: { currency: 'EUR', ko: '네덜란드', ja: 'オランダ', en: 'Netherlands' },
  be: { currency: 'EUR', ko: '벨기에', ja: 'ベルギー', en: 'Belgium' },
  at: { currency: 'EUR', ko: '오스트리아', ja: 'オーストリア', en: 'Austria' },
  gr: { currency: 'EUR', ko: '그리스', ja: 'ギリシャ', en: 'Greece' },
  ie: { currency: 'EUR', ko: '아일랜드', ja: 'アイルランド', en: 'Ireland' },
  fi: { currency: 'EUR', ko: '핀란드', ja: 'フィンランド', en: 'Finland' },
  hr: { currency: 'EUR', ko: '크로아티아', ja: 'クロアチア', en: 'Croatia' },
  // 유럽 (기타 통화)
  gb: { currency: 'GBP', ko: '영국', ja: 'イギリス', en: 'United Kingdom' },
  ch: { currency: 'CHF', ko: '스위스', ja: 'スイス', en: 'Switzerland' },
  cz: { currency: 'CZK', ko: '체코', ja: 'チェコ', en: 'Czechia' },
  hu: { currency: 'HUF', ko: '헝가리', ja: 'ハンガリー', en: 'Hungary' },
  pl: { currency: 'PLN', ko: '폴란드', ja: 'ポーランド', en: 'Poland' },
  dk: { currency: 'DKK', ko: '덴마크', ja: 'デンマーク', en: 'Denmark' },
  se: { currency: 'SEK', ko: '스웨덴', ja: 'スウェーデン', en: 'Sweden' },
  no: { currency: 'NOK', ko: '노르웨이', ja: 'ノルウェー', en: 'Norway' },
  is: { currency: 'ISK', ko: '아이슬란드', ja: 'アイスランド', en: 'Iceland' },
  // 아메리카·오세아니아
  us: { currency: 'USD', ko: '미국', ja: 'アメリカ', en: 'United States' },
  gu: { currency: 'USD', ko: '괌', ja: 'グアム', en: 'Guam' },
  mp: { currency: 'USD', ko: '사이판', ja: 'サイパン', en: 'Saipan' },
  ca: { currency: 'CAD', ko: '캐나다', ja: 'カナダ', en: 'Canada' },
  mx: { currency: 'MXN', ko: '멕시코', ja: 'メキシコ', en: 'Mexico' },
  br: { currency: 'BRL', ko: '브라질', ja: 'ブラジル', en: 'Brazil' },
  pe: { currency: 'PEN', ko: '페루', ja: 'ペルー', en: 'Peru' },
  au: { currency: 'AUD', ko: '호주', ja: 'オーストラリア', en: 'Australia' },
  nz: { currency: 'NZD', ko: '뉴질랜드', ja: 'ニュージーランド', en: 'New Zealand' },
  // 아프리카
  ma: { currency: 'MAD', ko: '모로코', ja: 'モロッコ', en: 'Morocco' },
  za: { currency: 'ZAR', ko: '남아프리카공화국', ja: '南アフリカ', en: 'South Africa' },
};

// "일본" / "日本" / "Japan" / "jp" → "jp"
export function countryCode(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (COUNTRIES[s]) return s;
  for (const [code, c] of Object.entries(COUNTRIES)) {
    if ([c.ko, c.ja, c.en].some(n => n.toLowerCase() === s)) return code;
  }
  return null;
}

// "jp" → 🇯🇵
export const flagEmoji = (code) =>
  code.toUpperCase().replace(/./g, ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65));
