/* =========================================================
   ZERO//CHESS — Zenless Zone Zero inspired auto battler
   Data: traits, agents, enemies, waves
   ========================================================= */

const COLS = 7;
const ROWS = 8;

const COST_COLORS = {
  1: '#9aa4b2',
  2: '#57e389',
  3: '#4cb8ff',
  4: '#c77dff',
  5: '#ffd23f'
};

const COST_NAMES = { 1: '일반', 2: '정예', 3: '특수', 4: 'S급', 5: '초월' };

const FACTIONS = {
  hares: {
    name: '교활한 토끼들',
    short: '토끼',
    icon: '🐰',
    color: '#ff5da2',
    tiers: [2, 4],
    bonuses: [
      { atkPct: 0.12 },
      { atkPct: 0.30, spdPct: 0.15 }
    ],
    lines: ['공격력 +12%', '공격력 +30% · 공격속도 +15%']
  },
  victoria: {
    name: '빅토리아 하우스키핑',
    short: '빅토리아',
    icon: '🫖',
    color: '#a9c7ff',
    tiers: [2, 4],
    bonuses: [
      { shield: 250 },
      { shield: 600, dr: 0.15 }
    ],
    lines: ['전투 시작 보호막 250', '보호막 600 · 받는 피해 -15%']
  },
  belobog: {
    name: '벨로보그 중공업',
    short: '벨로보그',
    icon: '🔧',
    color: '#ff9d4d',
    tiers: [2, 4],
    bonuses: [
      { hp: 180 },
      { hp: 450, armor: 20 }
    ],
    lines: ['체력 +180', '체력 +450 · 방어력 +20']
  },
  calydon: {
    name: '칼리돈의 아들들',
    short: '칼리돈',
    icon: '🏍️',
    color: '#ff6b4a',
    tiers: [2, 4],
    bonuses: [
      { spdPct: 0.15 },
      { spdPct: 0.35, lifesteal: 0.02 }
    ],
    lines: ['공격속도 +15%', '공격속도 +35% · 공격 시 체력 2% 회복']
  },
  section6: {
    name: '제6과',
    short: '제6과',
    icon: '🌸',
    color: '#6ff2e0',
    tiers: [2, 3],
    bonuses: [
      { atkPct: 0.20, mana: 15 },
      { atkPct: 0.45, mana: 40 }
    ],
    lines: ['공격력 +20% · 시작 마나 +15', '공격력 +45% · 시작 마나 +40']
  },
  obol: {
    name: '오볼 분대',
    short: '오볼',
    icon: '🎖️',
    color: '#ffd66b',
    tiers: [2, 3],
    bonuses: [
      { armor: 15, dr: 0.05 },
      { armor: 35, dr: 0.15 }
    ],
    lines: ['방어력 +15 · 피해 감소 5%', '방어력 +35 · 피해 감소 15%']
  },
  public: {
    name: '공안',
    short: '공안',
    icon: '🚨',
    color: '#5f9dff',
    tiers: [2, 4],
    bonuses: [
      { atkPct: 0.12, mana: 10 },
      { atkPct: 0.28, mana: 25 }
    ],
    lines: ['공격력 +12% · 시작 마나 +10', '공격력 +28% · 시작 마나 +25']
  }
};

const ROLES = {
  attack: {
    name: '돌격', icon: '⚔️', color: '#ff6262',
    tiers: [2, 4], bonuses: [{ atkPct: 0.10 }, { atkPct: 0.25 }],
    lines: ['공격력 +10%', '공격력 +25%']
  },
  stun: {
    name: '강타', icon: '💥', color: '#ffb84d',
    tiers: [2, 4], bonuses: [{ spdPct: 0.10 }, { spdPct: 0.25 }],
    lines: ['공격속도 +10%', '공격속도 +25%']
  },
  anomaly: {
    name: '이상', icon: '☄️', color: '#c77dff',
    tiers: [2, 4], bonuses: [{ abilityPct: 0.20 }, { abilityPct: 0.50 }],
    lines: ['스킬 피해 +20%', '스킬 피해 +50%']
  },
  support: {
    name: '지원', icon: '✚', color: '#57e389',
    tiers: [2, 4], bonuses: [{ mana: 10 }, { mana: 25, healPct: 0.4 }],
    lines: ['아군 시작 마나 +10', '아군 시작 마나 +25 · 회복량 +40%']
  },
  defense: {
    name: '방어', icon: '🛡️', color: '#7fa8ff',
    tiers: [2, 4], bonuses: [{ armor: 20 }, { armor: 50 }],
    lines: ['방어력 +20', '방어력 +50']
  }
};

/* ---------------------------------------------------------
   Agents — 28 playable characters
   hp / atk are 1★ base values. Star multiplier: 1 / 1.8 / 3.2
   --------------------------------------------------------- */
const CHARS = [
  // ============ COST 1 ============
  {
    id: 'anby', name: '앤비', en: 'ANBY', cost: 1, faction: 'hares', role: 'stun',
    range: 1, hp: 600, atk: 46, armor: 20, atkSpd: 0.75, mana: 80,
    c1: '#b8fbff', c2: '#2360d8',
    ability: { name: '전격 참격', type: 'strike', power: 220, stun: 1.0, desc: '대상에게 220의 피해를 주고 1초간 기절시킵니다.' }
  },
  {
    id: 'nicole', name: '니콜', en: 'NICOLE', cost: 1, faction: 'hares', role: 'support',
    range: 2, hp: 560, atk: 40, armor: 15, atkSpd: 0.7, mana: 70,
    c1: '#ffb3e6', c2: '#c0247d',
    ability: { name: '에너지 필드', type: 'shieldAll', power: 130, desc: '모든 아군에게 130의 보호막을 부여합니다.' }
  },
  {
    id: 'billy', name: '빌리', en: 'BILLY', cost: 1, faction: 'hares', role: 'attack',
    range: 3, hp: 550, atk: 44, armor: 12, atkSpd: 0.8, mana: 80,
    c1: '#ff8a8a', c2: '#8a0f2d',
    ability: { name: '무차별 사격', type: 'chain', power: 120, targets: 3, desc: '가까운 적 3명에게 각각 120의 피해를 줍니다.' }
  },
  {
    id: 'corin', name: '코린', en: 'CORIN', cost: 1, faction: 'victoria', role: 'attack',
    range: 1, hp: 620, atk: 50, armor: 18, atkSpd: 0.75, mana: 80,
    c1: '#d9c8ff', c2: '#5b2a86',
    ability: { name: '전기톱 난무', type: 'aoeSelf', power: 180, radius: 1, desc: '주변 적에게 180의 피해를 줍니다.' }
  },
  {
    id: 'ben', name: '벤', en: 'BEN', cost: 1, faction: 'belobog', role: 'defense',
    range: 1, hp: 760, atk: 38, armor: 35, atkSpd: 0.6, mana: 90,
    c1: '#ffcf8a', c2: '#8a3f12',
    ability: { name: '강철 방벽', type: 'shieldSelf', power: 380, desc: '자신에게 380의 보호막을 부여합니다.' }
  },
  {
    id: 'lucy', name: '루시', en: 'LUCY', cost: 1, faction: 'calydon', role: 'support',
    range: 2, hp: 560, atk: 42, armor: 15, atkSpd: 0.7, mana: 70,
    c1: '#ffd1a8', c2: '#c2410c',
    ability: { name: '응원단장', type: 'buffAtk', power: 0.18, duration: 6, desc: '6초간 모든 아군의 공격력을 18% 높입니다.' }
  },
  {
    id: 'soukaku', name: '소우카쿠', en: 'SOUKAKU', cost: 1, faction: 'section6', role: 'support',
    range: 1, hp: 650, atk: 45, armor: 20, atkSpd: 0.7, mana: 70,
    c1: '#a8dcff', c2: '#1d5fa8',
    ability: { name: '카모이타치', type: 'heal', power: 300, desc: '체력이 가장 낮은 아군을 300 회복시킵니다.' }
  },
  {
    id: 'seth', name: '세스', en: 'SETH', cost: 1, faction: 'public', role: 'defense',
    range: 1, hp: 680, atk: 40, armor: 30, atkSpd: 0.65, mana: 80,
    c1: '#9fc8ff', c2: '#1e3a8a',
    ability: { name: '전격 방패', type: 'shieldAll', power: 90, desc: '모든 아군에게 90의 보호막을 부여합니다.' }
  },

  // ============ COST 2 ============
  {
    id: 'nekomata', name: '네코마타', en: 'NEKOMATA', cost: 2, faction: 'hares', role: 'attack',
    range: 1, hp: 680, atk: 58, armor: 18, atkSpd: 0.9, mana: 80,
    c1: '#ffb56b', c2: '#a83a00',
    ability: { name: '고양이의 춤', type: 'execute', power: 260, bonus: 1.8, desc: '대상에게 260의 피해. 체력이 50% 이하면 1.8배.' }
  },
  {
    id: 'koleda', name: '콜레다', en: 'KOLEDA', cost: 2, faction: 'belobog', role: 'stun',
    range: 1, hp: 760, atk: 55, armor: 30, atkSpd: 0.65, mana: 85,
    c1: '#ffb27a', c2: '#9a1b1b',
    ability: { name: '해머 강타', type: 'aoe', power: 200, radius: 1, stun: 1.2, desc: '대상 주변에 200의 피해를 주고 1.2초 기절시킵니다.' }
  },
  {
    id: 'anton', name: '안톤', en: 'ANTON', cost: 2, faction: 'belobog', role: 'attack',
    range: 1, hp: 700, atk: 62, armor: 18, atkSpd: 0.8, mana: 80,
    c1: '#ffe27a', c2: '#9a6700',
    ability: { name: '드릴 러시', type: 'strike', power: 340, desc: '대상에게 340의 피해를 줍니다.' }
  },
  {
    id: 'piper', name: '파이퍼', en: 'PIPER', cost: 2, faction: 'calydon', role: 'anomaly',
    range: 1, hp: 680, atk: 55, armor: 20, atkSpd: 0.75, mana: 80,
    c1: '#ffc2e2', c2: '#9d174d',
    ability: { name: '소용돌이', type: 'aoeSelf', power: 160, radius: 1, desc: '주변 적에게 160의 피해를 줍니다.' }
  },
  {
    id: 'qingyi', name: '칭이', en: 'QINGYI', cost: 2, faction: 'public', role: 'stun',
    range: 1, hp: 720, atk: 52, armor: 28, atkSpd: 0.7, mana: 80,
    c1: '#a8fff4', c2: '#0f766e',
    ability: { name: '경직 타격', type: 'strike', power: 170, stun: 2.0, desc: '대상에게 170의 피해를 주고 2초간 기절시킵니다.' }
  },
  {
    id: 'ellen', name: '엘렌', en: 'ELLEN', cost: 2, faction: 'victoria', role: 'attack',
    range: 1, hp: 700, atk: 64, armor: 16, atkSpd: 0.85, mana: 80,
    c1: '#b7e6ff', c2: '#1e4d8f',
    ability: { name: '상어 이빨', type: 'strike', power: 300, desc: '대상에게 300의 피해를 줍니다.' }
  },
  {
    id: 'harumasa', name: '하루마사', en: 'HARUMASA', cost: 2, faction: 'section6', role: 'attack',
    range: 3, hp: 620, atk: 55, armor: 15, atkSpd: 0.8, mana: 75,
    c1: '#9db4ff', c2: '#1e1b6b',
    ability: { name: '번개 화살', type: 'chain', power: 150, targets: 3, desc: '가까운 적 3명에게 각각 150의 피해를 줍니다.' }
  },

  // ============ COST 3 ============
  {
    id: 'lycaon', name: '라이카온', en: 'LYCAON', cost: 3, faction: 'victoria', role: 'defense',
    range: 1, hp: 900, atk: 62, armor: 40, atkSpd: 0.65, mana: 85,
    c1: '#e8f4ff', c2: '#334155',
    ability: { name: '빙결 강타', type: 'aoe', power: 210, radius: 1, stun: 1.0, desc: '대상 주변에 210의 피해를 주고 1초 기절시킵니다.' }
  },
  {
    id: 'rina', name: '리나', en: 'RINA', cost: 3, faction: 'victoria', role: 'anomaly',
    range: 3, hp: 720, atk: 72, armor: 20, atkSpd: 0.75, mana: 85,
    c1: '#d8b4fe', c2: '#581c87',
    ability: { name: '유령의 춤', type: 'chain', power: 210, targets: 4, desc: '가까운 적 4명에게 각각 210의 피해를 줍니다.' }
  },
  {
    id: 'grace', name: '그레이스', en: 'GRACE', cost: 3, faction: 'belobog', role: 'anomaly',
    range: 3, hp: 740, atk: 70, armor: 20, atkSpd: 0.8, mana: 85,
    c1: '#a7f3d0', c2: '#115e59',
    ability: { name: '감전', type: 'aoe', power: 270, radius: 1, desc: '대상 주변 적에게 270의 피해를 줍니다.' }
  },
  {
    id: 'burnice', name: '버니스', en: 'BURNICE', cost: 3, faction: 'calydon', role: 'anomaly',
    range: 3, hp: 760, atk: 74, armor: 22, atkSpd: 0.75, mana: 85,
    c1: '#ffb08a', c2: '#b91c1c',
    ability: { name: '화염 방사', type: 'aoe', power: 310, radius: 1, desc: '대상 주변 적에게 310의 피해를 줍니다.' }
  },
  {
    id: 'zhuyuan', name: '주원', en: 'ZHU YUAN', cost: 3, faction: 'public', role: 'attack',
    range: 4, hp: 700, atk: 80, armor: 20, atkSpd: 0.8, mana: 85,
    c1: '#9ecbff', c2: '#1d4ed8',
    ability: { name: '에테르 집중포화', type: 'strike', power: 400, desc: '대상에게 400의 피해를 줍니다.' }
  },
  {
    id: 'trigger', name: '트리거', en: 'TRIGGER', cost: 3, faction: 'obol', role: 'attack',
    range: 3, hp: 680, atk: 78, armor: 18, atkSpd: 0.85, mana: 80,
    c1: '#c4b5fd', c2: '#4c1d95',
    ability: { name: '저격', type: 'execute', power: 340, bonus: 1.7, desc: '대상에게 340의 피해. 체력이 50% 이하면 1.7배.' }
  },

  // ============ COST 4 ============
  {
    id: 'caesar', name: '카이사르', en: 'CAESAR', cost: 4, faction: 'calydon', role: 'defense',
    range: 1, hp: 1100, atk: 70, armor: 45, atkSpd: 0.6, mana: 90,
    c1: '#ffe9a8', c2: '#a16207',
    ability: { name: '킹의 방패', type: 'shieldAll', power: 280, desc: '모든 아군에게 280의 보호막을 부여합니다.' }
  },
  {
    id: 'yanagi', name: '야나기', en: 'YANAGI', cost: 4, faction: 'section6', role: 'anomaly',
    range: 1, hp: 950, atk: 90, armor: 30, atkSpd: 0.8, mana: 85,
    c1: '#d8b4fe', c2: '#6d28d9',
    ability: { name: '뇌전 참', type: 'aoe', power: 330, radius: 1, stun: 1.0, desc: '대상 주변에 330의 피해를 주고 1초 기절시킵니다.' }
  },
  {
    id: 'soldier11', name: '솔저 11', en: 'SOLDIER 11', cost: 4, faction: 'obol', role: 'attack',
    range: 1, hp: 900, atk: 95, armor: 25, atkSpd: 0.85, mana: 80,
    c1: '#ffb3b3', c2: '#991b1b',
    ability: { name: '화염 참격', type: 'strike', power: 440, desc: '대상에게 440의 피해를 줍니다.' }
  },
  {
    id: 'janedoe', name: '제인 도', en: 'JANE DOE', cost: 4, faction: 'public', role: 'anomaly',
    range: 1, hp: 900, atk: 88, armor: 25, atkSpd: 0.9, mana: 80,
    c1: '#ff9ed2', c2: '#831843',
    ability: { name: '질투의 칼날', type: 'execute', power: 380, bonus: 1.7, desc: '대상에게 380의 피해. 체력이 50% 이하면 1.7배.' }
  },

  // ============ COST 5 ============
  {
    id: 'miyabi', name: '미야비', en: 'MIYABI', cost: 5, faction: 'section6', role: 'attack',
    range: 1, hp: 1200, atk: 110, armor: 35, atkSpd: 0.85, mana: 90,
    c1: '#bff7ff', c2: '#0e7490',
    ability: { name: '무명의 일도', type: 'aoe', power: 420, radius: 2, stun: 0.6, desc: '대상 주변 넓은 범위에 420의 피해를 주고 0.6초 기절시킵니다.' }
  },
  {
    id: 'lighter', name: '라이터', en: 'LIGHTER', cost: 5, faction: 'calydon', role: 'stun',
    range: 1, hp: 1150, atk: 100, armor: 40, atkSpd: 0.7, mana: 90,
    c1: '#ffe0b3', c2: '#7f1d1d',
    ability: { name: '파이널 블로우', type: 'strike', power: 520, stun: 2.0, desc: '대상에게 520의 피해를 주고 2초간 기절시킵니다.' }
  },
  {
    id: 'orphie', name: '오르피', en: 'ORPHIE', cost: 5, faction: 'obol', role: 'support',
    range: 3, hp: 950, atk: 80, armor: 30, atkSpd: 0.8, mana: 85,
    c1: '#e9d5ff', c2: '#5b21b6',
    ability: { name: '오볼의 의지', type: 'healAll', power: 260, shield: 120, desc: '모든 아군을 260 회복시키고 120의 보호막을 부여합니다.' }
  }
];

const CHARS_BY_ID = Object.fromEntries(CHARS.map(c => [c.id, c]));

/* ---------------------------------------------------------
   Enemies
   --------------------------------------------------------- */
const ENEMY_TYPES = {
  grunt: {
    name: '에테리얼', glyph: 'E', hp: 420, atk: 34, armor: 10, atkSpd: 0.7, range: 1, mana: 100,
    c1: '#b58cff', c2: '#3b1a78',
    ability: { name: '에테리얼 강타', type: 'strike', power: 130 }
  },
  gunner: {
    name: '에테리얼 사수', glyph: 'G', hp: 340, atk: 31, armor: 5, atkSpd: 0.8, range: 3, mana: 100,
    c1: '#e0aaff', c2: '#5b1a8f',
    ability: { name: '오염탄', type: 'chain', power: 110, targets: 2 }
  },
  brute: {
    name: '중장 에테리얼', glyph: 'B', hp: 850, atk: 44, armor: 30, atkSpd: 0.6, range: 1, mana: 100,
    c1: '#9b7bff', c2: '#2e1065',
    ability: { name: '분쇄', type: 'aoeSelf', power: 140, radius: 1 }
  },
  wraith: {
    name: '환영', glyph: 'W', hp: 410, atk: 44, armor: 8, atkSpd: 0.8, range: 2, mana: 90,
    c1: '#5eead4', c2: '#134e4a',
    ability: { name: '공허의 속삭임', type: 'chain', power: 140, targets: 3 }
  },
  elite: {
    name: '정예 에테리얼', glyph: 'X', hp: 950, atk: 58, armor: 22, atkSpd: 0.75, range: 1, mana: 90,
    c1: '#ff9ecb', c2: '#7f1d1d',
    ability: { name: '파멸의 일격', type: 'execute', power: 300, bonus: 1.5 }
  },
  boss: {
    name: '아홉번째 손', glyph: '☠', hp: 2000, atk: 68, armor: 28, atkSpd: 0.65, range: 2, mana: 100, boss: true,
    c1: '#ff5c93', c2: '#450a0a',
    ability: { name: '재앙의 손아귀', type: 'aoe', power: 280, radius: 1, stun: 0.6 }
  }
};

/* Each wave: units = [type, col, row] */
const WAVES = [
  { stage: '1-1', name: '에테리얼 정찰대', units: [['grunt', 2, 3], ['grunt', 4, 3]] },
  { stage: '1-2', name: '에테리얼 무리', units: [['grunt', 1, 3], ['grunt', 3, 2], ['grunt', 5, 3]] },
  { stage: '1-3', name: '중장 에테리얼', units: [['brute', 3, 3], ['grunt', 1, 3], ['gunner', 3, 0]] },
  {
    stage: '1-4', name: '보스 · 아홉번째 손', boss: true,
    units: [['boss', 3, 2], ['grunt', 1, 3], ['grunt', 5, 3]]
  },
  { stage: '2-1', name: '환영 부대', units: [['gunner', 1, 1], ['gunner', 5, 1], ['grunt', 2, 3], ['grunt', 4, 3]] },
  { stage: '2-2', name: '맹독의 둥지', units: [['brute', 2, 3], ['brute', 4, 3], ['wraith', 2, 1], ['wraith', 4, 1]] },
  {
    stage: '2-3', name: '강화 에테리얼',
    units: [['grunt', 1, 3], ['grunt', 3, 3], ['grunt', 5, 3], ['brute', 2, 2], ['gunner', 1, 0], ['wraith', 5, 1]]
  },
  {
    stage: '2-4', name: '보스 · 데드엔드 부처', boss: true,
    units: [['boss', 3, 2], ['brute', 1, 3], ['brute', 5, 3], ['gunner', 2, 0], ['gunner', 4, 0]]
  },
  {
    stage: '3-1', name: '공허의 물결',
    units: [['grunt', 1, 3], ['grunt', 3, 3], ['grunt', 5, 3], ['wraith', 0, 2], ['wraith', 6, 2], ['gunner', 3, 0]]
  },
  {
    stage: '3-2', name: '쌍둥이 환영', boss: true,
    units: [['boss', 2, 2], ['boss', 4, 2], ['gunner', 1, 0], ['gunner', 5, 0], ['elite', 3, 3]]
  },
  {
    stage: '3-3', name: '에테리얼 군단',
    units: [['elite', 1, 3], ['elite', 5, 3], ['brute', 3, 2], ['wraith', 1, 1], ['wraith', 5, 1], ['gunner', 0, 0], ['gunner', 6, 0], ['grunt', 3, 1]]
  },
  {
    stage: '3-4', name: '최종 보스 · 제로 에테리얼', boss: true, final: true,
    units: [['boss', 3, 2], ['elite', 1, 3], ['elite', 5, 3], ['wraith', 1, 1], ['wraith', 5, 1]]
  }
];

const SHOP_ODDS = {
  1: [1, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0],
  3: [0.75, 0.25, 0, 0, 0],
  4: [0.55, 0.30, 0.15, 0, 0],
  5: [0.45, 0.33, 0.20, 0.02, 0],
  6: [0.30, 0.40, 0.25, 0.05, 0],
  7: [0.19, 0.35, 0.35, 0.10, 0.01],
  8: [0.15, 0.25, 0.35, 0.22, 0.03]
};

const XP_TO_NEXT = { 1: 2, 2: 2, 3: 6, 4: 10, 5: 20, 6: 36, 7: 56, 8: 0 };

const MAX_LEVEL = 8;
const BENCH_SIZE = 8;
const START_HP = 100;
const START_GOLD = 6;
const START_LEVEL = 3;
const PREP_TIME = 35;

/* Agent artwork (local assets, fan project — see assets/agents/CREDITS.md) */
CHARS.forEach(c => {
  c.img = `assets/agents/full/${c.id}.webp`;
  c.icon = `assets/agents/icon/${c.id}.webp`;
});
