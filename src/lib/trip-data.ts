export type Priority = "core" | "flexible" | "cut";
export type ItemType = "place" | "meal" | "lodging" | "transport" | "airport_station" | "reservation" | "buffer" | "rest" | "note";
export type TravelMode = "walk" | "transit" | "drive" | "bike";

export interface Place {
  id: string; name: string; latitude: number; longitude: number; address?: string;
  city?: string; category?: string; googleMapsUrl?: string; verification?: "confirmed" | "provisional" | "recheck";
}

export interface TripItem {
  checkpoint?: { time: string; title: string; notes: string };
  source?: { label: string; url: string };
  durationMinutes?: number;
  id: string; day: number; order: number; time: string; title: string; priority: Priority; type: ItemType;
  place?: Place; notes?: string; completed: boolean; reservation?: "required" | "pending" | "booked" | "not_required";
  verification?: "confirmed" | "provisional" | "recheck"; estimatedCost?: number; travelMode?: TravelMode;
}

export interface TripDay {
  day: number; date: string; shortDate: string; area: string; title: string; warning?: string; items: TripItem[];
}

const mapUrl = (name: string, lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=&center=${lat},${lng}`;
const p = (id: string, name: string, latitude: number, longitude: number, city: string, category: string, verification: Place["verification"] = "confirmed"): Place => ({
  id, name, latitude, longitude, city, category, verification, googleMapsUrl: mapUrl(name, latitude, longitude),
});
const item = (day: number, order: number, time: string, priority: Priority, title: string, type: ItemType, place?: Place, verification: TripItem["verification"] = "confirmed", notes?: string): TripItem => ({
  id: `d${day}-${order}`, day, order, time, priority, title, type, place, verification, notes, completed: false,
});

export const placeCatalog: Place[] = [
  p("komatsu-airport", "小松機場", 36.3937, 136.4077, "小松", "機場"),
  p("kanazawa-station", "金澤站", 36.5781, 136.6483, "金澤", "車站"),
  {
    ...p("torifito-kanazawa", "Hotel Torifito Kanazawa", 36.5754667, 136.6495685, "金澤", "住宿"),
    googleMapsUrl: "https://www.google.com/maps?cid=7248822591702183339",
    address: "〒920-0853 石川縣金澤市本町2-12-1",
  },
  { ...p("pokemon-kanazawa", "Pokémon Center KANAZAWA（金澤 FORUS 5F）", 36.5791483, 136.6497543, "金澤", "購物"), address: "石川縣金澤市堀川新町3-1 金澤 FORUS 5樓" },
  p("kanazawa-forus", "金澤 FORUS", 36.5791483, 136.6497543, "金澤", "購物"),
  p("kanazawa-west-bus", "金澤站西口 4 號候車處", 36.57857895, 136.64649505, "金澤", "車站", "provisional"),
  { ...p("meitetsu-nagoya", "名鐵名古屋站", 35.1691, 136.8843, "名古屋", "車站", "provisional"), address: "名古屋市中村區名站一丁目2番1號" },
  p("omicho", "近江町市場", 36.5715, 136.6565, "金澤", "市場"),
  p("higashi-chaya", "東茶屋街", 36.5727, 136.6660, "金澤", "街區"),
  p("kenrokuen", "兼六園", 36.5622, 136.6625, "金澤", "景點"),
  p("kanazawa-castle", "金澤城公園", 36.5652, 136.6598, "金澤", "景點"),
  p("korinbo", "香林坊", 36.5613, 136.6532, "金澤", "商圈"),
  p("shirakawago", "白川鄉・荻町", 36.2576, 136.9061, "白川鄉", "世界遺產"),
  p("takayama-station", "高山站", 36.1407, 137.2516, "高山", "車站"),
  {
    ...p("gift-takayama", "Hotel and Spa Gift TAKAYAMA", 36.142123, 137.2534112, "高山", "住宿"),
    googleMapsUrl: "https://www.google.com/maps?cid=3464098115762712560",
    address: "〒506-0025 岐阜縣高山市天滿町6丁目22",
  },
  p("sanmachi", "三町老街", 36.1421, 137.2600, "高山", "街區"),
  p("miyagawa", "宮川朝市", 36.1466, 137.2573, "高山", "市場"),
  p("sakurayama", "櫻山八幡宮", 36.1491, 137.2613, "高山", "神社"),
  p("yatai", "高山祭屋台會館", 36.1493, 137.2616, "高山", "博物館"),
  p("takayama-jinya", "高山陣屋", 36.1407, 137.2590, "高山", "史蹟"),
  p("hida-furukawa", "飛驒古川站", 36.2368, 137.1890, "飛驒古川", "車站"),
  p("nagoya-station", "名古屋站", 35.1709, 136.8815, "名古屋", "車站"),
  {
    ...p("grand-base-nagoya", "GRAND BASE Nagoya Eki Nishi", 35.167864165561234, 136.87348401560254, "名古屋", "住宿"),
    googleMapsUrl: "https://www.google.com/maps?cid=3684223953583778525",
    address: "〒453-0016 愛知縣名古屋市中村區竹橋町22-10",
  },
  p("komeda", "Komeda's Coffee", 35.1706, 136.8853, "名古屋", "餐飲", "provisional"),
  p("inuyama-station", "犬山站", 35.3805, 136.9450, "犬山", "車站"),
  p("inuyama-town", "犬山城下町", 35.3862, 136.9394, "犬山", "街區"),
  p("sanko", "三光稻荷神社・針綱神社", 35.3880, 136.9382, "犬山", "神社"),
  p("inuyama-castle", "國寶犬山城", 35.3884, 136.9392, "犬山", "城郭"),
  p("atsuta", "熱田神宮", 35.1276, 136.9084, "名古屋", "神社"),
  p("shirotori", "白鳥庭園", 35.1262, 136.8998, "名古屋", "庭園"),
  p("pokemon-nagoya", "Pokémon Center NAGOYA", 35.1631, 136.9082, "名古屋", "購物", "recheck"),
  p("sakae", "榮商圈", 35.1681, 136.9066, "名古屋", "商圈"),
  p("oasis", "Oasis 21＋MIRAI TOWER", 35.1707, 136.9084, "名古屋", "夜景"),
  p("yanagibashi", "柳橋中央市場", 35.1690, 136.8880, "名古屋", "市場", "recheck"),
  p("nagoya-castle", "名古屋城", 35.1856, 136.8990, "名古屋", "城郭"),
  p("osu", "大須商店街", 35.1590, 136.9026, "名古屋", "商圈"),
  p("urban-quar", "天然溫泉 Urban Quar", 35.1499, 136.9138, "名古屋", "溫泉", "recheck"),
  p("centrair", "中部國際機場 NGO", 34.8584, 136.8054, "常滑", "機場"),
  p("cafe-kanazawa", "FUMUROYA CAFE 香林坊", 36.5610, 136.6545, "金澤", "咖啡"),
  p("cafe-takayama", "CENTER4 HAMBURGERS", 36.1428, 137.2583, "高山", "餐飲"),
];
const q = (id: string) => placeCatalog.find((x) => x.id === id)!;

export const initialDays: TripDay[] = [
  { day: 1, date: "2027-02-09", shortDate: "2/09", area: "小松・金澤", title: "小松機場 → 金澤 → Pokémon Center", items: [
    item(1,1,"10:35","core","抵達小松機場","airport_station",q("komatsu-airport")),
    item(1,2,"10:35–11:20","core","入境＋領行李","buffer"),
    item(1,3,"約 11:30–12:15","core","小松機場 → 金澤站","transport",q("kanazawa-station"),"recheck","2027 機場巴士時刻待確認"),
    item(1,4,"12:15–12:45","core","金澤站 → Hotel Torifito 寄放行李","transport",q("torifito-kanazawa")),
    item(1,5,"12:45–13:45","flexible","金澤站周邊午餐","meal"),
    item(1,6,"14:00–16:00","core","Pokémon Center KANAZAWA","place",q("pokemon-kanazawa")),
    item(1,7,"16:00–18:00","flexible","金澤 FORUS＋金澤站周邊購物","place",q("kanazawa-forus")),
    item(1,8,"18:00–19:00","core","Hotel Torifito Kanazawa 入住＋休息","lodging",q("torifito-kanazawa")),
    item(1,9,"19:00 之後","flexible","金澤站周邊晚餐","meal"),
  ]},
  { day: 2, date: "2027-02-10", shortDate: "2/10", area: "金澤", title: "市場・茶屋街・兼六園・Animate", items: [
    item(2,1,"08:30–10:00","core","近江町市場","place",q("omicho")), item(2,2,"10:15–12:00","core","東茶屋街＋主計町","place",q("higashi-chaya")),
    item(2,3,"12:00–13:00","core","午餐／咖啡完整休息","rest"), item(2,4,"13:15–15:45","core","兼六園＋金澤城公園","place",q("kenrokuen"),"confirmed","同一行程區塊含兩個相鄰景點"),
    item(2,5,"16:00–18:00","flexible","香林坊・竪町／BELSEL","place",q("korinbo")), item(2,6,"18:15 之後","flexible","香林坊／片町晚餐","meal"),
  ]},
  { day: 3, date: "2027-02-11", shortDate: "2/11", area: "白川鄉・高山", title: "金澤 → 白川鄉 → 高山", warning: "建國紀念日｜人潮與交通需預留緩衝", items: [
    item(3,1,"07:20–07:40","core","抵達金澤站西口","airport_station",q("kanazawa-station")), item(3,2,"約 08:00–08:40","core","金澤 → 白川鄉","transport",q("shirakawago"),"recheck","2027 高速巴士時刻待確認"),
    item(3,3,"約 09:30–10:00","core","抵達白川鄉","airport_station",q("shirakawago"),"provisional"), item(3,4,"10:00–14:30","core","白川鄉・荻町","place",q("shirakawago"),"recheck","2027 冬季活動細節待確認"),
    item(3,5,"約 15:00–16:00","core","白川鄉 → 高山","transport",q("takayama-station"),"recheck"), item(3,6,"16:00–16:30","core","Hotel and Spa Gift TAKAYAMA 入住","lodging",q("gift-takayama")),
    item(3,7,"17:00–18:00","cut","三町老街・雪夜散步","place",q("sanmachi")), item(3,8,"18:00–19:30","core","飛驒牛晚餐","meal"),
    item(3,9,"19:30–20:30","cut","高山市區自由散步","place",q("sanmachi")), item(3,10,"20:30 之後","core","回飯店泡湯休息","rest"),
  ]},
  { day: 4, date: "2027-02-12", shortDate: "2/12", area: "高山・飛驒古川", title: "高山 → 飛驒古川巡禮 → 名古屋", warning: "大件行李建議宅配至名古屋，避免帶進飛驒古川", items: [
    item(4,1,"07:30–08:15","core","早餐＋大件行李處理","note"), item(4,2,"08:20–09:00","flexible","宮川朝市","place",q("miyagawa")),
    item(4,3,"09:05–09:45","core","櫻山八幡宮","place",q("sakurayama")), item(4,4,"09:45–10:25","cut","高山祭屋台會館","place",q("yatai")),
    item(4,5,"10:35–11:20","core","三町老街・白天正式逛","place",q("sanmachi")), item(4,6,"11:25–12:05","core","高山陣屋","place",q("takayama-jinya")),
    item(4,7,"12:10–13:00","core","午餐","meal"), item(4,8,"13:00–13:20","core","取隨身行李 → 高山站","transport",q("takayama-station")),
    item(4,9,"約 13:30","core","JR 高山 → 飛驒古川","transport",q("hida-furukawa"),"recheck"), item(4,10,"約 14:00–17:00","core","飛驒古川《你的名字。》巡禮","place",q("hida-furukawa"),"provisional","先以飛驒古川站為群組錨點，可再拆成子地點"),
    item(4,11,"16:15 前後","core","返名古屋交通最終判斷點","reservation",undefined,"recheck"), item(4,12,"約 17:00–20:00","core","飛驒古川／高山 → 名古屋","transport",q("nagoya-station"),"recheck"),
    item(4,13,"約 20:00","core","GRAND BASE Nagoya Eki Nishi 入住＋簡單晚餐","lodging",q("grand-base-nagoya")),
  ]},
  { day: 5, date: "2027-02-13", shortDate: "2/13", area: "犬山・名古屋", title: "犬山城＋城下町 → 名古屋自由下午", items: [
    item(5,1,"07:30–08:15","flexible","Komeda Morning","meal",q("komeda"),"provisional"), item(5,2,"08:30 左右","core","名鐵名古屋 → 犬山","transport",q("inuyama-station"),"recheck"),
    item(5,3,"09:30–11:00","core","犬山城下町","place",q("inuyama-town")), item(5,4,"11:00–11:30","flexible","三光稻荷神社＋針綱神社","place",q("sanko")),
    item(5,5,"11:30–13:00","core","國寶犬山城","place",q("inuyama-castle")), item(5,6,"13:00–14:00","core","午餐","meal"),
    item(5,7,"14:00–15:00","core","返回名古屋","transport",q("nagoya-station")), item(5,8,"15:00 之後","flexible","名古屋自由下午","note"),
    item(5,9,"18:30–20:00","core","晚餐","meal"), item(5,10,"20:00 之後","cut","自由夜間活動","rest"),
  ]},
  { day: 6, date: "2027-02-14", shortDate: "2/14", area: "名古屋・榮", title: "熱田神宮 → 白鳥庭園 → Pokémon Center", warning: "週日｜Pokémon Center 入場整理券規則待確認", items: [
    item(6,1,"09:00–10:45","core","熱田神宮","place",q("atsuta")), item(6,2,"11:00–12:00","core","午餐","meal"),
    item(6,3,"12:15–13:45","flexible","白鳥庭園","place",q("shirotori")), item(6,4,"13:45–14:30","core","移動至矢場町／榮","transport",q("sakae")),
    item(6,5,"14:30–16:30","core","Pokémon Center NAGOYA","place",q("pokemon-nagoya"),"recheck"), item(6,6,"16:30–18:00","flexible","名古屋 PARCO／榮商圈","place",q("sakae")),
    item(6,7,"18:00–19:15","core","榮晚餐","meal"), item(6,8,"19:30–21:00","flexible","Oasis 21＋MIRAI TOWER","place",q("oasis")), item(6,9,"21:00 之後","cut","榮夜間自由活動","rest"),
  ]},
  { day: 7, date: "2027-02-15", shortDate: "2/15", area: "名古屋", title: "柳橋中央市場 → 名古屋城 → 大須 → 泡湯", items: [
    item(7,1,"07:30–08:30","flexible","柳橋中央市場","place",q("yanagibashi"),"recheck"), item(7,2,"08:30–09:15","core","回飯店／移動／稍作休息","rest"),
    item(7,3,"09:30–11:45","core","名古屋城","place",q("nagoya-castle")), item(7,4,"12:00–13:15","core","午餐＋坐著休息","rest"),
    item(7,5,"13:30–17:00","core","大須商店街","place",q("osu")), item(7,6,"17:00–18:30","flexible","自由時間／整理戰利品","rest"),
    item(7,7,"18:30–20:00","core","晚餐","meal"), item(7,8,"20:15–22:00","flexible","天然溫泉 Urban Quar","place",q("urban-quar"),"recheck"),
  ]},
  { day: 8, date: "2027-02-16", shortDate: "2/16", area: "名古屋・常滑", title: "名古屋 → 中部國際機場 → 台灣", items: [
    item(8,1,"08:00–09:00","core","早餐＋整理","rest"), item(8,2,"09:00–09:20","core","GRAND BASE Nagoya Eki Nishi 退房","lodging",q("grand-base-nagoya")),
    item(8,3,"約 09:30–10:00","core","名古屋 → 中部國際機場","transport",q("centrair"),"recheck"), item(8,4,"10:30–12:00","core","報到、托運、安檢、伴手禮","buffer"), item(8,5,"13:15","core","返台","transport",q("centrair")),
  ]},
];

export const hotelOptions = [
  { id: "torifito-kanazawa", name: "Hotel Torifito Kanazawa", dayLabel: "D1–D2", days: [1, 2], place: q("torifito-kanazawa") },
  { id: "gift-takayama", name: "Hotel and Spa Gift TAKAYAMA", dayLabel: "D3", days: [3], place: q("gift-takayama") },
  { id: "grand-base-nagoya", name: "GRAND BASE Nagoya Eki Nishi", dayLabel: "D4–D7", days: [4, 5, 6, 7], place: q("grand-base-nagoya") },
];

export const budgetCategories = ["交通", "門票", "餐飲", "其他固定", "購物"] as const;

export function hotelsForDay(day: number, overview = false) {
  return hotelOptions.filter(hotel => overview || hotel.days.includes(day) || hotel.days.includes(day - 1))
    .map(hotel => ({ hotel, current: hotel.days.includes(day), label: hotel.days.includes(day) ? "當晚住宿" : hotel.days.includes(day - 1) ? "前晚住宿／今日出發" : "其他日期住宿" }));
}
