import { ControlTowerState, DataRecord, DataSourceDef, Metric, PeriodKey } from '../models/control-tower.models';

/** תאריך ה"היום" של הדמו – קבוע כדי שהנתונים יהיו דטרמיניסטיים. */
export const DEMO_TODAY = '2026-10-08';

export const SOURCES: Record<string, DataSourceDef> = {
  vouchers: {
    name: 'שוברים במסלקה',
    dateField: 'תאריך יצירה',
    fields: { system: 'מערכת', amount: 'סכום', account: 'מספר חשבון', status: 'סטטוס' }
  },
  discounts: {
    name: 'הנחות',
    dateField: 'תאריך אישור',
    fields: { code: 'קוד פטור', amount: 'סכום הנחה', account: 'מספר חשבון', status: 'סטטוס' }
  },
  accounts: {
    name: 'חשבונות חדשים',
    dateField: 'תאריך פתיחה',
    fields: { usage: 'סוג שימוש', identity: 'קוד זהות', account: 'מספר חשבון' }
  },
  claims: {
    name: 'תביעות פעילות',
    dateField: 'תאריך פתיחה',
    fields: { lawyer: 'עו״ד', amount: 'סכום תביעה', account: 'מספר חשבון' }
  },
  alerts: {
    name: 'התראות',
    dateField: 'תאריך משלוח',
    fields: { system: 'מערכת', amount: 'סכום', account: 'מספר חשבון', candidates: 'מועמדים' }
  },
  holders: {
    name: 'חילופי מחזיקים',
    dateField: 'תאריך ביצוע',
    fields: { system: 'מערכת', account: 'מספר חשבון' }
  },
  assessments: {
    name: 'שינויי שומה',
    dateField: 'תאריך שינוי',
    fields: { type: 'סוג שינוי', amount: 'סכום שינוי', account: 'מספר חשבון' }
  },
  arrangements: {
    name: 'הסדרים',
    dateField: 'תאריך הקמה',
    fields: { type: 'סוג הסדר', amount: 'סכום הסדר', account: 'מספר חשבון' }
  },
  levies: {
    name: 'עיקולים',
    dateField: 'תאריך משלוח',
    fields: { system: 'מערכת', amount: 'סכום', account: 'מספר חשבון' }
  },
  cash: {
    name: 'עסקאות בקופה',
    dateField: 'תאריך עסקה',
    fields: { system: 'מערכת', amount: 'סכום עסקה', account: 'מספר חשבון' }
  },
  cases: {
    name: 'תיקים תפעוליים',
    dateField: 'תאריך עדכון',
    fields: { world: 'עולם', process: 'תהליך', team: 'צוות', worker: 'עובד', status: 'סטטוס', amount: 'סכום' }
  }
};

/** קבוצות ערכים לדמו – לפי סדר מפתחות SOURCES. */
const GROUPS: string[][] = [
  ['גבייה', 'ארנונה', 'אכיפה'],
  ['מגורים', 'לא למגורים'],
  ['100', '200', '300'],
  ['עו״ד 1', 'עו״ד 2', 'עו״ד 3'],
  ['ארנונה', 'חניה', 'אגרות'],
  ['ארנונה', 'גבייה'],
  ['תוספת שטח', 'תיקון סיווג', 'מדידה'],
  ['תשלומים', 'הוראת קבע', 'חד פעמי'],
  ['בנקים', 'צד ג׳', 'רכב'],
  ['פרונטלי', 'מקוון']
];

const pick = (arr: string[], i: number): string => arr[((i % arr.length) + arr.length) % arr.length];

/** בניית רשומות דמו דטרמיניסטיות עבור כל מקור נתונים. */
function buildRows(sourceKey: string, index: number, count = 90): DataRecord[] {
  const keys = Object.keys(SOURCES[sourceKey].fields);
  const groups = GROUPS[index] ?? ['גבייה', 'ארנונה', 'אכיפה'];

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(2026, 9, 8 - (i % 95));
    const row: DataRecord = {
      id: (100000 + i).toString(),
      date: date.toISOString().slice(0, 10),
      amount: Math.round(180 + ((i * 179) % 16000)),
      account: '10' + String(43000 + i),
      status: i % 7 ? 'פעיל' : 'בטיפול'
    };

    keys.forEach((field, j) => {
      if (['amount', 'account', 'status'].includes(field)) return;
      switch (field) {
        case 'candidates': row[field] = (i % 8) + 1; break;
        case 'identity': row[field] = pick(['תושב', 'עסק', 'עמותה'], i); break;
        case 'world': row[field] = pick(['ארנונה', 'גבייה', 'אכיפה'], i); break;
        case 'process': row[field] = pick(['בקרה', 'עיקולים', 'שומה'], i); break;
        case 'team': row[field] = pick(['צוות א׳', 'צוות ב׳', 'צוות ג׳'], i); break;
        case 'worker': row[field] = pick(['עובד 1', 'עובד 2', 'עובד 3'], i); break;
        default: row[field] = pick(groups, i + (j % 2));
      }
    });

    return row;
  });
}

export const RECORDS: Record<string, DataRecord[]> = Object.fromEntries(
  Object.keys(SOURCES).map((key, index) => [key, buildRows(key, index)])
);

/** מזהי מקורות שיש להם שדה סכום, לשימוש בחישוב SUM. */
export const SUM_FIELDS: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCES).map(([key, src]) => [
    key,
    Object.fromEntries(Object.entries(src.fields).filter(([k]) => k === 'amount' || k === 'candidates'))
  ])
);

/** כרטיסי הנתונים ההתחלתיים של לוח הבקרה. */
const SEED: Array<[string, string, Metric['calc'], string, string]> = [
  ['שוברים שנוצרו במסלקה', 'vouchers', 'count', 'system', '🧾'],
  ['סכום שוברים במסלקה', 'vouchers', 'sum', 'system', '₪'],
  ['הנחות שנוצרו', 'discounts', 'count', 'code', '🏷'],
  ['חשבונות חדשים', 'accounts', 'count', 'usage', '⌂'],
  ['תביעות פעילות חדשות', 'claims', 'count', 'lawyer', '⚖'],
  ['התראות שנשלחו', 'alerts', 'count', 'system', '◉'],
  ['חילופי מחזיקים', 'holders', 'count', 'system', '↔'],
  ['שינויי שומה', 'assessments', 'count', 'type', '▤'],
  ['הסדרים שהוקמו', 'arrangements', 'count', 'type', '☷'],
  ['עיקולים שנשלחו', 'levies', 'count', 'system', '⊞'],
  ['עסקאות בקופה', 'cash', 'count', 'system', '▣'],
  ['סכום הנחות', 'discounts', 'sum', 'code', '₪']
];

export function createSeedMetrics(): Metric[] {
  return SEED.map(([name, source, calc, group, icon], i) => ({
    id: 'm' + i,
    name,
    source,
    calc,
    sumField: 'amount',
    group,
    detailFields: Object.keys(SOURCES[source].fields).slice(0, 3),
    icon,
    active: true,
    range: 'all'
  }));
}

/** מצב התחלתי מלא של מערכת הבקרה. */
export function createDefaultState(): ControlTowerState {
  const sourceKeys = Object.keys(SOURCES);
  return {
    metrics: createSeedMetrics(),
    cols: 3,
    period: 'all',
    tasks: [
      { id: 1, title: 'משימה 1', owner: 'צוות א׳', status: 'פתוחה', priority: 'גבוהה' },
      { id: 2, title: 'משימה 2', owner: 'צוות ב׳', status: 'בטיפול', priority: 'בינונית' }
    ],
    alertRules: [
      { id: 'a1', metric: 'm8', operator: 'gt', threshold: 65, enabled: true },
      { id: 'a2', metric: 'm9', operator: 'gt', threshold: 75, enabled: true }
    ],
    targets: { m0: 100, m8: 120, m9: 95 },
    reports: [
      { id: 'r1', name: 'דוח 1', frequency: 'יומי', metrics: ['m0', 'm2', 'm8', 'm9'], active: true },
      { id: 'r2', name: 'דוח 2', frequency: 'שבועי', metrics: ['m0', 'm1', 'm4', 'm9'], active: true }
    ],
    dataHealth: Object.fromEntries(
      sourceKeys.map((k, i) => [k, { last: i % 5 === 0 ? '2026-10-06 21:30' : '2026-10-08 08:15', status: i % 5 === 0 ? 'stale' : 'ok' }])
    )
  };
}

/** מספר הימים לאחור לפי מסנן התקופה. */
export function periodDays(period: PeriodKey): number {
  switch (period) {
    case 'week': return 7;
    case 'month': return 30;
    case 'quarter': return 90;
    default: return Number.POSITIVE_INFINITY;
  }
}
