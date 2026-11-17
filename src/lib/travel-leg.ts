import type { TripDay, TripItem } from "./trip-data";

export type LegMode = "walk" | "transit" | "drive" | "bike";
export type RouteReference = {
  kind: "official" | "planning";
  checkedAt: string;
  forDate: string;
  endpointKey: string;
  route: string;
  note: string;
  rideMinutes: number;
  bufferMinutes: number;
  sources: { label: string; url: string }[];
};
export type SavedLeg = {
  mode: LegMode;
  minutes: number;
  confirmed?: boolean;
  reference?: RouteReference;
  alternatives?: Partial<Record<LegMode, { minutes: number; confirmed: boolean; reference?: RouteReference }>>;
};

export const routeEndpointKey = (from: TripItem, to: TripItem) => [from.place, to.place].map(place => place ? `${place.id}@${place.latitude.toFixed(6)},${place.longitude.toFixed(6)}` : "unknown").join(">");
export function applicableTravelLeg(leg: SavedLeg | undefined, from: TripItem, to: TripItem): SavedLeg | undefined {
  return leg?.reference && leg.reference.endpointKey !== routeEndpointKey(from, to) ? undefined : leg;
}

// Store each mode independently: toggling back must not discard a checked time.
export function updateTravelLeg(previous: SavedLeg, next: Partial<SavedLeg>, estimate: (mode: LegMode) => number): SavedLeg {
  const alternatives = { ...previous.alternatives, [previous.mode]: { minutes: previous.minutes, confirmed: previous.confirmed === true, ...(previous.reference ? { reference: previous.reference } : {}) } };
  const mode = next.mode ?? previous.mode;
  const cached = alternatives[mode];
  const manual = next.minutes !== undefined;
  const minutes = manual ? Math.max(0, Math.min(1440, Math.round(next.minutes!)))
    : mode === previous.mode ? previous.minutes : cached?.minutes ?? estimate(mode);
  const confirmed = manual || (mode === previous.mode ? previous.confirmed === true : cached?.confirmed === true);
  const reference = manual ? undefined : mode === previous.mode ? previous.reference : cached?.reference;
  alternatives[mode] = { minutes, confirmed, ...(reference ? { reference } : {}) };
  return { mode, minutes, confirmed, alternatives, ...(reference ? { reference } : {}) };
}

type Plan = { mode: "walk" | "transit"; ride: number; buffer: number; route: string; kind?: "official"; note?: string; sources?: RouteReference["sources"] };
const source = (label: string, url: string) => ({ label, url });
const airport = source("小松機場官方交通", "https://www.komatsuairport.jp/access/bus.html");
const bus = source("北陸鐵道官方路線與時刻", "https://www.hokutetsu.co.jp/highway-bus/takayama/");
const nouhi = source("濃飛巴士官方交通", "https://www.nouhibus.co.jp/highwaybus/kanazawa/");
const hida = source("飛驒市官方交通", "https://www.hida-kankou.jp/features/132");
const inuyama = source("犬山官方交通", "https://inuyama.gr.jp/access/");
const subway = source("名古屋市交通局路線資訊", "https://www.kotsu.city.nagoya.jp/rp/subway/");
const plans: Record<string, Plan> = {
  "komatsu-airport>kanazawa-station": { mode: "transit", ride: 40, buffer: 15, kind: "official", route: "小松機場 → 金澤站西口：機場巴士", sources: [airport], note: "官方約40分鐘；另外暫留候車15分鐘，2027班次未選。" },
  "dormy-kanazawa>pokemon-kanazawa": { mode: "walk", ride: 5, buffer: 5, route: "飯店步行至FORUS，再上5樓", sources: [source("寶可夢中心官方位置", "https://shop.pokemon.co.jp/ja/shop/pokemoncenter-kanazawa/")], note: "步行與上樓各暫留5分鐘，不是道路導航測量。" },
  "pokemon-kanazawa>kanazawa-forus": { mode: "walk", ride: 0, buffer: 5, route: "FORUS館內移動", note: "同一棟商場，暫留5分鐘換樓層。" },
  "omicho>higashi-chaya": { mode: "walk", ride: 15, buffer: 5, kind: "official", route: "近江町市場 → 尾張町 → 東茶屋街", sources: [source("金澤官方步行路線", "https://www.kanazawa-kankoukyoukai.or.jp/modelCourse/detail_32.html")], note: "官方直走約15分鐘；另外暫留5分鐘冬季緩衝。" },
  "korinbo>dormy-kanazawa": { mode: "transit", ride: 15, buffer: 15, route: "香林坊 → 金澤站方向公車 → 飯店", sources: [source("金澤官方公車路線圖", "https://www.kanazawa-kankoukyoukai.or.jp/lsc/upfile/pamphlet/0000/0109/109_1_file.pdf")], note: "30分鐘為公車、候車與步行的規劃值，非已選班次。" },
  "kanazawa-west-bus>shirakawago": { mode: "transit", ride: 75, buffer: 0, kind: "official", route: "金澤站西口 → 白川鄉：預約制高速巴士", sources: [bus], note: "候車已另列在前一項，不重複加計。現行車程約75分鐘；2027班次與雪況待查。" },
  "shirakawago>takayama-station": { mode: "transit", ride: 50, buffer: 20, kind: "official", route: "白川鄉巴士站 → 高山濃飛巴士中心 → 高山站", sources: [nouhi], note: "官方車程約50分鐘；另暫留20分鐘走回巴士站、候車與下車。不能據此保證14:30有班次。" },
  "takayama-station>hida-furukawa": { mode: "transit", ride: 15, buffer: 30, kind: "official", route: "JR高山本線：高山 → 飛驒古川", sources: [hida], note: "官方交通概覽約15分鐘，普通列車可能較久；另留30分鐘候車與進站，班次未選。" },
  "hida-furukawa>nagoya-station": { mode: "transit", ride: 160, buffer: 30, kind: "official", route: "飛驒古川 → 名古屋：特急ひだ；必要時高山轉乘", sources: [hida], note: "官方交通概覽約2小時40分鐘；再留30分鐘進站與轉乘。晚間班次可能需要更久，不能保證17:40出發。" },
  "komeda>inuyama-station": { mode: "transit", ride: 30, buffer: 25, kind: "official", route: "咖啡店 → 名鐵名古屋站 → 犬山站", sources: [inuyama], note: "官方特急約25分鐘，暫按30分鐘；另留25分鐘步行、購票候車。Komeda分店仍待選定。" },
  "inuyama-castle>nagoya-station": { mode: "transit", ride: 30, buffer: 35, route: "犬山城步行回犬山站 → 名鐵名古屋站", sources: [inuyama], note: "以官方名古屋至犬山約25分鐘為參考，反向暫留30分鐘，另留35分鐘走回車站與候車。" },
  "grand-base-nagoya>atsuta": { mode: "transit", ride: 7, buffer: 38, kind: "official", route: "飯店 → 名鐵名古屋站 → 神宮前站 → 熱田神宮", sources: [source("名鐵官方熱田交通", "https://www.meitetsu.co.jp/pr/emotion/area/14_atsuta/")], note: "名鐵車程官方約7分鐘；總共暫排45分鐘，包含飯店至車站、候車與神宮入口步行。" },
  "shirotori>sakae": { mode: "transit", ride: 20, buffer: 20, route: "白鳥庭園 → 熱田神宮西站 → 名城線矢場町／榮", sources: [source("白鳥庭園官方交通", "https://www.shirotori-garden.jp/access/access-22047/index.html"), subway], note: "庭園至車站官方步行約10分鐘；其餘車程、候車及步行為規劃暫估，合計40分鐘。" },
  "oasis>grand-base-nagoya": { mode: "transit", ride: 10, buffer: 30, route: "Oasis 21 → 榮站 → 東山線名古屋站 → 飯店", sources: [source("Oasis 21官方交通", "https://www.sakaepark.co.jp/access/"), subway], note: "Oasis 21與榮站相連。總40分鐘為規劃值，含候車與返回飯店步行；晚間餐飲及自由活動地點未定。" },
  "grand-base-nagoya>nagoya-castle": { mode: "transit", ride: 20, buffer: 25, route: "飯店 → 名古屋站 → 櫻通線久屋大通轉名城線 → 名古屋城站", sources: [source("名古屋城官方交通問答", "https://www.nagoyajo.city.nagoya.jp/info/faq/")], note: "官方從名古屋站搭地下鐵約20分鐘；另留25分鐘飯店步行、候車與入園前移動。" },
  "yanagibashi>nagoya-castle": { mode: "transit", ride: 20, buffer: 25, route: "柳橋市場 → 名古屋站方向 → 地下鐵名古屋城站", sources: [source("名古屋城官方交通", "https://www.nagoyajo.city.nagoya.jp/access/")], note: "市區銜接暫排45分鐘；中間若回飯店，需另算繞行時間。" },
  "nagoya-castle>osu": { mode: "transit", ride: 15, buffer: 20, route: "名古屋城站 → 名城線上前津站 → 大須商店街", sources: [subway], note: "35分鐘為車程、出入車站與候車的規劃暫估，非當日班次查詢結果。" },
  "urban-quar>grand-base-nagoya": { mode: "transit", ride: 20, buffer: 25, route: "溫泉 → 上前津站 → 鶴舞線伏見轉東山線 → 名古屋站 → 飯店", sources: [source("Urban Quar官方交通", "https://p-castle.co.jp/urban_quar/access/"), subway], note: "官方至上前津站步行9分鐘；總45分鐘為步行、候車與轉乘暫估，深夜需再查末班車。" },
  "meitetsu-nagoya>centrair": { mode: "transit", ride: 28, buffer: 7, kind: "official", route: "名鐵名古屋站 → 中部國際機場：μ-SKY", sources: [source("名鐵官方班次查詢", "https://trainbus.meitetsu.co.jp/meitetsu-transfer/pc/transfer/TransferSearch?basis=1&day=16&dnvName=%E4%B8%AD%E9%83%A8%E5%9B%BD%E9%9A%9B%E7%A9%BA%E6%B8%AF&goal=00009406&hour=11&method=0&minute=31&month=2026%2F11&orvName=%E5%90%8D%E9%89%84%E5%90%8D%E5%8F%A4%E5%B1%8B&sort=2&start=00004372&unuse=&wspeed=standard")], note: "現行μ-SKY參考車程28分鐘，暫排35分鐘；候車15分鐘已另列。這不是2027已訂班次，改搭其他列車可能較久。" },
};

const walkingMinutes = (from: TripItem, to: TripItem) => {
  const a = from.place!, b = to.place!, rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  const km = 12742 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return km < .03 ? 0 : Math.max(5, Math.ceil(km * 1.35 / 3.5 * 60 / 5) * 5);
};

// Bounded one-time import: no route service is called when a visitor opens/reloads the site.
export function cacheRouteReferences<T extends { days: TripDay[]; travelLegs: Record<string, SavedLeg> }>(state: T): T {
  const travelLegs = { ...state.travelLegs };
  for (const day of state.days) {
    let previous: TripItem | undefined;
    let unmapped = false;
    for (const item of day.items) {
      if (!item.place) { unmapped = true; continue; }
      if (previous) {
        const key = `${previous.id}>${item.id}`;
        const old = applicableTravelLeg(travelLegs[key], previous, item);
        if (!old?.confirmed && !old?.reference) {
          const pair = `${previous.place!.id}>${item.place.id}`;
          const walking = walkingMinutes(previous, item);
          const plan: Plan | undefined = plans[pair] ?? (walking <= 40 ? { mode: "walk", ride: walking, buffer: 0, route: walking ? "近距離優先步行（未查實際道路）" : "同一地點，無需另計移動", note: walking ? "依目前座標加入繞行係數1.35、冬季步速3.5公里/小時，再取5分鐘整數。非Google Maps步行導航；橋梁、入口或積雪可能增加時間。" : "若中間安排外出用餐，仍需另外定位與計時。" } : undefined);
          if (plan) travelLegs[key] = { mode: plan.mode, minutes: plan.ride + plan.buffer, confirmed: false, reference: {
            kind: plan.kind ?? "planning", checkedAt: "2026-11-16", forDate: day.date, endpointKey: routeEndpointKey(previous, item), route: plan.route,
            note: `${plan.note ?? "規劃暫估，非即時路線。"}${unmapped ? " 中間有未定位項目：只計已知兩點，餐廳／休息地點確定後需重查。" : ""}`,
            rideMinutes: plan.ride, bufferMinutes: plan.buffer, sources: plan.sources ?? [],
          } };
        }
      }
      previous = item; unmapped = false;
    }
  }
  return { ...state, travelLegs };
}
