export const mealPeriods = ["早餐", "午餐", "晚餐", "宵夜"] as const;
export type MealPeriod = (typeof mealPeriods)[number];

export type FoodPlace = {
  id: string;
  name: string;
  city: "名古屋" | "金澤" | "其他";
  category: MealPeriod;
  rating: number | null;
  reviews: string | null;
  address: string;
  googleMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  source: "imported" | "custom";
  canDelete?: boolean;
};

export const importedFoodPlaces: FoodPlace[] = [
  {
    id: "food-taiga",
    name: "Taiga（中華そば 大河）",
    city: "名古屋",
    category: "早餐",
    rating: 4.2,
    reviews: "1,167",
    address: "4 Chome-15-2, Nakamura Ward, Nagoya, Aichi 450-0002 日本",
    googleMapsUrl: "https://www.google.com/maps/place/Taiga/@35.1700753,136.8884357,17z/data=!4m6!3m5!1s0x600376deaaf9b03b:0xba89f04192903613!8m2!3d35.1700753!4d136.8884357!16s%2Fg%2F11c3v0yly4",
    latitude: 35.1700753,
    longitude: 136.8884357,
    notes: null,
    source: "imported",
  },
  {
    id: "food-maguroya-yanagibashi",
    name: "まぐろや柳橋",
    city: "名古屋",
    category: "早餐",
    rating: 4.1,
    reviews: "566",
    address: "4 Chome-15-2 Meieki, Nakamura Ward, Nagoya, Aichi 450-0002 日本",
    googleMapsUrl: "https://www.google.com/maps/place/%E3%81%BE%E3%81%90%E3%82%8D%E3%82%84%E6%9F%B3%E6%A9%8B/@35.1699921,136.8884893,17z/data=!4m6!3m5!1s0x600376d9538e24e3:0x3ec554fe43647f40!8m2!3d35.1699921!4d136.8884893!16s%2Fg%2F12qg3fyy6",
    latitude: 35.1699921,
    longitude: 136.8884893,
    notes: null,
    source: "imported",
  },
  {
    id: "food-yanagibashi-market",
    name: "柳橋中央市場",
    city: "名古屋",
    category: "早餐",
    rating: 4.0,
    reviews: "1,881",
    address: "4 Chome-15-2 Meieki, Nakamura Ward, Nagoya, Aichi 450-0002 日本",
    googleMapsUrl: "https://www.google.com/maps/place/%E6%9F%B3%E6%A9%8B%E4%B8%AD%E5%A4%AE%E5%B8%82%E5%A0%B4/@35.1699909,136.8880404,17z/data=!4m6!3m5!1s0x600376deaaf9b03b:0xc1a310228281cab2!8m2!3d35.1699909!4d136.8880404!16s%2Fg%2F11g6nkbymm",
    latitude: 35.1699909,
    longitude: 136.8880404,
    notes: null,
    source: "imported",
  },
  {
    id: "food-yahataya",
    name: "味噌串燒＆串炸 八幡屋 本店",
    city: "名古屋",
    category: "晚餐",
    rating: 4.4,
    reviews: "743",
    address: "2 Chome-18-7 Meieki, Nishi Ward, Nagoya, Aichi 451-0045 日本",
    googleMapsUrl: "https://www.google.com/maps/place/%E5%91%B3%E5%99%8C%E4%B8%B2%E7%87%92%26%E4%B8%B2%E7%82%B8+%E5%85%AB%E5%B9%A1%E5%B1%8B+%E6%9C%AC%E5%BA%97/@35.1765014,136.8807777,17z/data=!4m6!3m5!1s0x600376ebcc33cdc5:0x3cc76bff44da4aa8!8m2!3d35.1765014!4d136.8807777!16s%2Fg%2F1ttdycq3",
    latitude: 35.1765014,
    longitude: 136.8807777,
    notes: null,
    source: "imported",
  },
  {
    id: "food-shibafukuya",
    name: "Shibafukuya",
    city: "名古屋",
    category: "午餐",
    rating: 4.5,
    reviews: "1,226",
    address: "1 Chome-23-10 Nagono, Nishi Ward, Nagoya, Aichi 451-0042 日本",
    googleMapsUrl: "https://www.google.com/maps/place/Shibafukuya/@35.1751295,136.8915193,17z/data=!4m6!3m5!1s0x600376dac24c160d:0x8e2453a2a4b68b12!8m2!3d35.1751295!4d136.8915193!16s%2Fg%2F11gfjr8b_5",
    latitude: 35.1751295,
    longitude: 136.8915193,
    notes: null,
    source: "imported",
  },
  {
    id: "food-ushiaburi-meieki",
    name: "特選和牛 牛炙 名駅店",
    city: "名古屋",
    category: "晚餐",
    rating: 4.6,
    reviews: "758",
    address: "4 Chome-16-13 Meieki, Nakamura Ward, Nagoya, Aichi 450-0002 日本",
    googleMapsUrl: "https://www.google.com/maps/place/Kanzenkoshitsu+TokusenwagyuUshiaburi+Meieki/@35.1703652,136.8884295,17z/data=!4m6!3m5!1s0x600376dbfe3777ed:0x98aa8a37fd6d1984!8m2!3d35.1703652!4d136.8884295!16s%2Fg%2F11c0rtq70b",
    latitude: 35.1703652,
    longitude: 136.8884295,
    notes: null,
    source: "imported",
  },
  {
    id: "food-jin-nagoya",
    name: "Japanese Yakiniku JIN NAGOYA",
    city: "名古屋",
    category: "晚餐",
    rating: 4.8,
    reviews: "584",
    address: "Aichi, Nagoya, Naka Ward, Sakae, 1 Chome-7-13 伏見パークビル 2F",
    googleMapsUrl: "https://www.google.com/maps/place/Japanese+Yakiniku+JIN+NAGOYA/@35.1673312,136.8958839,17z/data=!4m6!3m5!1s0x600377447c592d4b:0xcaa8c9bbedd4ea4b!8m2!3d35.1673312!4d136.8958839!16s%2Fg%2F11rjw3yq3p",
    latitude: 35.1673312,
    longitude: 136.8958839,
    notes: null,
    source: "imported",
  },
  {
    id: "food-kuchihatcho-sakae",
    name: "口八町 栄住吉店",
    city: "名古屋",
    category: "宵夜",
    rating: 3.4,
    reviews: "44",
    address: "Aichi, Nagoya, Naka Ward, Sakae, 3 Chome-1-14 大喜ビル 2F",
    googleMapsUrl: "https://www.google.com/maps/place/Sumibiyakidainingukuchihatcho+Sakaesumiyoshiten/@35.1680176,136.9031596,17z/data=!4m6!3m5!1s0x600371dbc7041be5:0xd500cac1885b0ad4!8m2!3d35.1680176!4d136.9031596!16s%2Fg%2F11lh2wnc2m",
    latitude: 35.1680176,
    longitude: 136.9031596,
    notes: null,
    source: "imported",
  },
  {
    id: "food-ponta-sushi",
    name: "廻る寿し ぽん太",
    city: "金澤",
    category: "午餐",
    rating: 4.2,
    reviews: "1,077",
    address: "Ishikawa, Kanazawa, Sainen, 4 Chome-15-1 水産仲卸センター",
    googleMapsUrl: "https://www.google.com/maps/place/%E5%BB%BB%E3%82%8B%E5%AF%BF%E3%81%97+%E3%81%BD%E3%82%93%E5%A4%AA/@36.5869826,136.6335001,17z/data=!4m6!3m5!1s0x5ff8334ba227d691:0xaa4115b4cb5426f6!8m2!3d36.5869826!4d136.6335001!16s%2Fg%2F1tf79z0f",
    latitude: 36.5869826,
    longitude: 136.6335001,
    notes: null,
    source: "imported",
  },
];
