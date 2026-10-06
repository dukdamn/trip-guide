#!/usr/bin/env node
// 여행 MD → trip.json 변환기 (+ 스키마 검증)
// 사용: node tools/md2json.mjs trips/danang-2026.md [-o out.json] [--resolve]
//   --resolve  maps.app.goo.gl 같은 짧은 구글맵 링크를 열어서 좌표·이름을 채운다 (네트워크 필요)
// 브라우저 빌더에서도 parseTripMd()를 그대로 import해서 쓴다.

import yaml from 'js-yaml';
import { COUNTRIES, countryCode, flagEmoji } from './countries.mjs';

// ── 별칭 테이블 (ko / en / ja) ───────────────────────────────
const SECTION = {
  flights:   ['항공', '항공편', 'flights', '航空', 'フライト'],
  stays:     ['숙소', 'stays', 'hotels', 'ホテル', '宿泊'],
  places:    ['장소', '맛집·놀거리', '맛집', 'places', 'スポット', 'グルメ・遊び'],
  dishes:    ['먹어볼 것', 'dishes', '食べたいもの'],
  budget:    ['예산', 'budget', '予算'],
  tips:      ['팁', '메모', 'tips', 'notes', 'コツ', 'メモ'],
  checklist: ['준비물', 'checklist', 'packing', '持ち物'],
};
const DAY_RE = /^(?:day\s*(\d+)|(\d+)\s*일차|(\d+)\s*日目)\s*(.*)$/i;

const PLACE_TYPE = {
  do:    ['놀거리', '관광', '구경', 'do', 'see', '遊び', '観光', '遊び・観光'],
  food:  ['맛집', '식당', 'food', 'eat', 'グルメ', 'レストラン'],
  cafe:  ['카페', 'cafe', 'カフェ'],
  night: ['밤', '술', '술집', '바', '펍', '클럽', 'night', 'bar', '夜遊び', 'バー'],
  shop:  ['쇼핑', '시장', 'shop', '買い物'],
  care:  ['스파', '마사지', '이발', 'care', 'spa', 'スパ', 'スパ・理容'],
};
const DIR = { out: ['가는 편', '가는편', '출국', 'out', '往路'], in: ['오는 편', '오는편', '귀국', 'in', '復路'] };
// 시간을 모를 때 쓰는 시간대
const SLOT = {
  dawn:      ['새벽', 'dawn', '早朝'],
  morning:   ['아침', '오전', 'morning', '朝', '午前'],
  noon:      ['점심', '낮', 'noon', 'lunch', '昼'],
  afternoon: ['오후', 'afternoon', '午後'],
  evening:   ['저녁', 'evening', 'dinner', '夕方'],
  night:     ['밤', 'night', '夜'],
};
const BASIS = { perPerson: ['1인', '인당', 'per person', 'pp', '1人'], group: ['전체', '공동', '총', 'group', 'total', '全体'] };
const TAGS = { booked: ['예약', 'booked', '予約'], option: ['옵션', 'option', 'オプション'], tbd: ['미정', 'tbd', '未定'], free: ['자유', 'free', '自由'] };

const findKey = (table, word) => {
  const w = String(word ?? '').trim().toLowerCase();
  return Object.keys(table).find(k => table[k].some(a => a.toLowerCase() === w));
};
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const splitSegs = (s) => s.split(/\s+\|\s+/).map(x => x.trim()).filter(Boolean);

// ── 링크 ────────────────────────────────────────────────────
export const isGoogleMapsUrl = (u) => {
  try {
    const x = new URL(u);
    if (x.hostname === 'maps.app.goo.gl') return true;
    if (x.hostname === 'goo.gl') return x.pathname.startsWith('/maps');
    return /(^|\.)google\.[a-z.]+$/.test(x.hostname) && (x.pathname.startsWith('/maps') || x.hostname.startsWith('maps.'));
  } catch { return false; }
};
export const isShortMapsUrl = (u) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(u);

// 구글맵 링크에서 좌표·장소명 추출 (짧은 링크는 url만 보관)
export function parseMapsUrl(url) {
  const p = { url };
  let u; try { u = new URL(url); } catch { return p; }
  // 1순위: 장소 핀 좌표(!3d..!4d..), 2순위: 지도 중심(@lat,lng)
  let m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const qp = u.searchParams.get('query') || u.searchParams.get('q');
  const qCoord = qp && qp.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (!m && qCoord) m = qCoord;
  if (m) { p.lat = +(+m[1]).toFixed(6); p.lng = +(+m[2]).toFixed(6); }
  const pm = u.pathname.match(/\/maps\/place\/([^/]+)/);
  if (pm) p.q = decodeURIComponent(pm[1].replace(/\+/g, ' '));
  else if (qp && !qCoord) p.q = qp;
  return p;
}

// "@검색어 (lat, lng)" — 고급 사용자용
function parseAtPlace(seg) {
  const m = seg.match(/^@\s*(.+?)(?:\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\))?$/);
  if (!m) return null;
  return clean({ q: m[1].trim(), lat: m[2] !== undefined ? +m[2] : undefined, lng: m[3] !== undefined ? +m[3] : undefined });
}

// ── 금액: "58만", "300k", "2만원", "¥1,200", "$25" ─────────────
const CUR_MARK = [
  [/^(₩)|(원|KRW)$/i, 'KRW'], [/^(¥|￥)|(円|엔|JPY)$/i, 'JPY'], [/^(\$|US\$)|(달러|USD)$/i, 'USD'],
  [/^(€)|(유로|EUR)$/i, 'EUR'], [/^(₫)|(동|VND)$/i, 'VND'], [/^(฿)|(바트|THB)$/i, 'THB'],
];
export function parseAmount(raw) {
  let s = String(raw ?? '').replace(/[,\s]/g, '');
  let currency;
  for (const [re, cur] of CUR_MARK) if (re.test(s)) { currency = cur; s = s.replace(re, ''); break; }
  let mult = 1;
  const unit = s.match(/(억|만|천|k|m)$/i);
  if (unit) { mult = { '억': 1e8, '만': 1e4, '천': 1e3, k: 1e3, m: 1e6 }[unit[1].toLowerCase()] ?? 1; s = s.slice(0, -1); }
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return { amount: Math.round(n * mult), currency };
}

// 세그먼트를 접두어로 분류
function classify(segs) {
  const out = { desc: [] };
  for (const s of segs) {
    if (/^https?:\/\//.test(s)) {
      if (isGoogleMapsUrl(s)) out.place = parseMapsUrl(s);
      else out.link = s;                              // 블로그·인스타·예약 페이지 등
    }
    else if (s.startsWith('→')) out.transit = s.slice(1).trim();
    else if (s.startsWith('@')) out.place = parseAtPlace(s);
    else if (s.startsWith('💰')) out.price = s.replace(/^💰\s*/, '');
    else if (s.startsWith('💡')) out.note = s.replace(/^💡\s*/, '');
    else if (s.startsWith('⛔')) out.status = s.replace(/^⛔\s*/, '');
    else if (/^📅\s*(day\s*)?\d+/i.test(s)) out.plan = +s.match(/\d+/)[0];
    else out.desc.push(s);
  }
  out.desc = out.desc.join(' · ') || undefined;
  return out;
}

// ── 메인 파서 ────────────────────────────────────────────────
export function parseTripMd(src, { packs = {} } = {}) {
  const errors = [], warnings = [];
  src = src.replace(/\r\n/g, '\n');
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fm) return { trip: null, errors: ['맨 위에 --- 로 감싼 설정 부분이 없어요.'], warnings };
  let f;
  try { f = yaml.load(fm[1]) || {}; } catch (e) { return { trip: null, errors: ['설정 부분 문법 오류: ' + e.message], warnings }; }
  const d = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? undefined : String(v).trim());

  // 날짜: start/end 또는 dates: "2026-09-24 ~ 2026-09-27"
  let start = d(f.start), end = d(f.end);
  if (f.dates && (!start || !end)) [start, end] = String(f.dates).split(/\s*~\s*/).map(d);

  // 나라: 코드·한글·일본어·영어 이름 모두 허용
  const code = countryCode(f.country);
  if (!code) errors.push(`나라를 알 수 없어요: "${f.country ?? ''}" → 예: 일본, 태국, jp, th`);
  const pack = code ? packs[code] : undefined;
  const currency = (f.currency ? String(f.currency).toUpperCase() : null) ?? pack?.currency?.code ?? COUNTRIES[code]?.currency;
  if (code && !currency) errors.push(`이 나라의 통화를 몰라요. 설정에 currency: (예: EUR) 를 적어주세요`);
  const home = String(f.home_currency ?? 'KRW').toUpperCase();
  const rateVal = f.rate ?? (currency === home ? 1 : pack?.currency?.rates?.[home]);
  if (currency && !rateVal) warnings.push(`환율이 없어요 (${currency}→${home}). 설정에 rate: 를 적거나, 빌더에서 자동 조회하세요.`);

  const trip = {
    schemaVersion: '1.1',
    meta: clean({
      id: f.id, title: f.title, badge: f.badge,
      emoji: f.emoji ?? (code ? flagEmoji(code) : undefined),
      startDate: start, endDate: end, people: f.people ?? 1,
      country: code ?? String(f.country ?? ''), currency, homeCurrency: home,
      cities: f.cities, lang: f.lang ?? 'ko',
      rate: rateVal ? clean({ value: +rateVal, asOf: d(f.rate_as_of) ?? (f.rate ? undefined : pack?.asOf) }) : undefined,
    }),
    flights: [], stays: [], days: [], places: [], dishes: [],
    budget: { basis: 'perPerson', items: [] }, tips: [], checklist: [],
  };

  let section = null, day = null, area = null, group = null;
  const offset = fm[0].split('\n').length - 1;

  src.slice(fm[0].length).split('\n').forEach((raw, i) => {
    const ln = i + 1 + offset;
    const line = raw.trim();
    if (!line || line.startsWith('<!--') || line.startsWith('>') || /^#\s/.test(line)) return;

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const title = h2[1].trim();
      const dm = title.match(DAY_RE);
      if (dm) {
        const [, a, b, c, rest] = dm;
        const parts = rest.replace(/^\s*[·\-–:]\s*/, '').split(/\s+·\s+/).filter(Boolean);  // 'A · B' 로 구분, '시내·밤'은 한 덩어리
        const date = parts.find(p => /^\d{4}-\d{2}-\d{2}$/.test(p));
        const others = parts.filter(p => p !== date);
        day = clean({ day: +(a ?? b ?? c), date, label: others[0], city: others[1], items: [] });
        trip.days.push(day); section = 'day'; return;
      }
      const base = title.replace(/\s*\(.*\)$/, '');
      section = findKey(SECTION, base) ?? null;
      if (!section) warnings.push(`${ln}행: 모르는 섹션 "## ${title}" 은 건너뛰었어요`);
      if (section === 'budget') trip.budget.basis = /전체|공동|group|total|全体/i.test(title) ? 'group' : 'perPerson';
      area = null; group = null; return;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      if (section === 'places') area = h3[1].trim();
      if (section === 'checklist') { group = { group: h3[1].trim(), items: [] }; trip.checklist.push(group); }
      return;
    }

    const li = line.match(/^(?:[-*]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.+)$/);
    if (!li) return;
    const body = li[1];
    const segs = splitSegs(body);

    switch (section) {
      case 'day': {
        // "09:00 제목 #태그" / "오후: 제목" / "제목"
        const slotWords = Object.values(SLOT).flat().join('|');
        const m = segs[0].match(new RegExp(`^(?:(\\d{1,2}:\\d{2})\\s+|(${slotWords})\\s*:\\s*)?(.+?)(?:\\s+#(\\S+))?$`, 'i'));
        const c = classify(segs.slice(1));
        let tag;
        if (m[4]) { tag = findKey(TAGS, m[4]); if (!tag) warnings.push(`${ln}행: 모르는 태그 #${m[4]} (예약·옵션·미정·자유)`); }
        day.items.push(clean({
          time: m[1] ? m[1].padStart(5, '0') : undefined,
          slot: m[2] ? findKey(SLOT, m[2]) : undefined,
          title: m[3], tag, desc: c.desc, transit: c.transit, place: c.place, link: c.link,
        }));
        break;
      }
      case 'flights': {
        const [dirW, date, route, time, ...rest] = segs;
        const dir = findKey(DIR, dirW);
        if (!dir) { errors.push(`${ln}행: 항공은 "가는 편" 또는 "오는 편"으로 시작해 주세요`); return; }
        const c = classify(rest);
        trip.flights.push(clean({ dir, date, route, time, note: c.desc, link: c.link }));
        break;
      }
      case 'stays': {
        const [name, range, ...rest] = segs;
        const [checkIn, checkOut] = (range ?? '').split(/\s*~\s*/);
        const c = classify(rest);
        trip.stays.push(clean({ name, checkIn, checkOut, note: c.desc, place: c.place, link: c.link }));
        break;
      }
      case 'places': {
        const m = segs[0].match(/^(?:\[(.+?)\]\s*)?(.+)$/);
        const type = m[1] ? findKey(PLACE_TYPE, m[1]) : 'do';
        if (m[1] && !type) warnings.push(`${ln}행: 모르는 종류 [${m[1]}] → 놀거리로 넣었어요`);
        const c = classify(segs.slice(1));
        trip.places.push(clean({ type: type ?? 'do', area, name: m[2], desc: c.desc, price: c.price, note: c.note, status: c.status, plan: c.plan, place: c.place, link: c.link }));
        break;
      }
      case 'dishes': {
        const c = classify(segs.slice(1));
        trip.dishes.push(clean({ name: segs[0], desc: c.desc, place: c.place }));
        break;
      }
      case 'budget': {
        // "분류 | 항목 | 금액 [| 1인/전체]"
        const [cat, name, amt, basisW] = segs;
        const a = parseAmount(amt);
        if (!a) { errors.push(`${ln}행: 예산 금액을 못 읽었어요 → "${amt ?? ''}" (예: 58만, 580000, 2만원)`); return; }
        const basis = basisW ? findKey(BASIS, basisW) : undefined;
        if (basisW && !basis) warnings.push(`${ln}행: "${basisW}" → 1인 또는 전체로 적어주세요`);
        trip.budget.items.push(clean({ cat, name, amount: a.amount, currency: a.currency && a.currency !== currency ? a.currency : undefined, basis }));
        break;
      }
      case 'tips': trip.tips.push(body); break;
      case 'checklist': {
        if (!group) { group = { group: '기본', items: [] }; trip.checklist.push(group); }
        group.items.push(body);
        break;
      }
    }
  });

  // 검사: 날짜 범위, 필수값
  if (!trip.meta.title) errors.push('설정에 title: (여행 제목)이 필요해요');
  if (!start || !end) errors.push('설정에 start:, end: (또는 dates: 시작 ~ 끝)이 필요해요');
  if (!trip.days.length) errors.push('"## Day 1" 같은 일정이 하나도 없어요');
  trip.days.forEach(dy => {
    if (!dy.date && start) { const t = new Date(start); t.setDate(t.getDate() + (dy.day - (trip.days[0].day))); dy.date = t.toISOString().slice(0, 10); }
  });
  const shortLinks = [...trip.days.flatMap(x => x.items), ...trip.places, ...trip.stays].filter(x => x.place?.url && x.place.lat === undefined && isShortMapsUrl(x.place.url)).length;
  if (shortLinks) warnings.push(`짧은 구글맵 링크 ${shortLinks}개는 좌표가 없어 지도에 핀이 안 찍혀요 (링크 버튼은 정상). --resolve 로 채울 수 있어요.`);

  for (const k of ['flights', 'stays', 'places', 'dishes', 'tips', 'checklist']) if (!trip[k].length) delete trip[k];
  if (!trip.budget.items.length) delete trip.budget;
  return { trip, errors, warnings };
}

// 짧은 링크 → 실제 URL로 풀어서 좌표·이름 채우기 (Node·서버 전용. 브라우저는 CORS로 불가)
export async function resolveShortLinks(trip) {
  const targets = [...trip.days.flatMap(x => x.items), ...(trip.places ?? []), ...(trip.stays ?? [])]
    .filter(x => x.place?.url && x.place.lat === undefined && isShortMapsUrl(x.place.url));
  let ok = 0;
  for (const t of targets) {
    try {
      let url = t.place.url;
      for (let hop = 0; hop < 5; hop++) {
        const res = await fetch(url, { redirect: 'manual' });
        const loc = res.headers.get('location');
        if (!loc) break;
        url = new URL(loc, url).href;
      }
      const p = parseMapsUrl(url);
      if (p.lat !== undefined) { Object.assign(t.place, { lat: p.lat, lng: p.lng, q: t.place.q ?? p.q }); ok++; }
    } catch { /* 네트워크 실패는 무시 */ }
  }
  return { total: targets.length, ok };
}

// ── CLI ─────────────────────────────────────────────────────
const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const fs = await import('fs');
  const path = await import('path');
  const { default: Ajv } = await import('ajv/dist/2020.js');
  const { default: addFormats } = await import('ajv-formats');

  const args = process.argv.slice(2);
  const input = args.find(a => !a.startsWith('-') && args[args.indexOf(a) - 1] !== '-o');
  const outPath = args.includes('-o') ? args[args.indexOf('-o') + 1] : null;
  if (!input) { console.error('사용법: node tools/md2json.mjs <trip.md> [-o out.json] [--resolve]'); process.exit(1); }

  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const packs = {};
  for (const f of fs.readdirSync(path.join(root, 'packs')).filter(f => f.endsWith('.json')))
    packs[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(root, 'packs', f), 'utf8'));

  const { trip, errors, warnings } = parseTripMd(fs.readFileSync(input, 'utf8'), { packs });
  if (trip && args.includes('--resolve')) {
    const r = await resolveShortLinks(trip);
    console.error(`🔗 짧은 링크 ${r.total}개 중 ${r.ok}개 좌표 채움`);
  }
  if (trip) {
    const ajv = new Ajv({ allErrors: true }); addFormats(ajv);
    const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(root, 'schema/trip.schema.json'), 'utf8')));
    if (!errors.length && !validate(trip)) for (const e of validate.errors) errors.push(`스키마: ${e.instancePath || '/'} ${e.message}`);
    if (/^[a-z]{2}$/.test(trip.meta.country) && !packs[trip.meta.country]) warnings.push(`국가 팩(packs/${trip.meta.country}.json)이 없어요 → 회화·현지 팁 없이 기본 화면으로 만들어져요`);
  }
  for (const w of warnings) console.error('⚠️  ' + w);
  if (errors.length) { console.error('❌ 오류 ' + errors.length + '건\n' + errors.map(e => '  - ' + e).join('\n')); process.exit(2); }
  const json = JSON.stringify(trip, null, 2);
  if (outPath) fs.writeFileSync(outPath, json + '\n'); else console.log(json);
  const items = trip.days.reduce((s, x) => s + x.items.length, 0);
  console.error(`✅ ${trip.meta.title} (${trip.meta.country}/${trip.meta.currency}): ${trip.days.length}일 · 일정 ${items}개 · 장소 ${trip.places?.length ?? 0}곳 · 예산 ${trip.budget?.items.length ?? 0}항목`);
}
