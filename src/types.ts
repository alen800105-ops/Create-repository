export enum Destination {
  OSAKA = 'Osaka (KIX)',
  TOKYO = 'Tokyo (NRT/HND)',
  FUKUOKA = 'Fukuoka (FUK)',
  OKINAWA = 'Okinawa (OKA)',
  SAPPORO = 'Sapporo (CTS)',
  NAGOYA = 'Nagoya (NGO)',
  KUMAMOTO = 'Kumamoto (KMJ)',
  SENDAI = 'Sendai (SDJ)',
  HAKODATE = 'Hakodate (HKD)',
  HIROSHIMA = 'Hiroshima (HIJ)',
  SEOUL = 'Seoul (ICN/GMP)',
  BUSAN = 'Busan (PUS)',
  JEJU = 'Jeju (CJU)'
}
export enum DepartureLocation {
  TPE = 'Taoyuan (TPE)',
  TSA = 'Taipei Songshan (TSA)',
  RMQ = 'Taichung (RMQ)',
  KHH = 'Kaohsiung (KHH)'
}
export enum CabinClass {
  ECONOMY = 'Economy (全程經濟)',
  BUSINESS = 'Business (全程商務)',
  MIXED = 'Mixed (去程經濟/回程商務)'
}
export enum Airline {
  ALL = 'All (所有航空公司)',
  CI = 'China Airlines (中華航空)',
  BR = 'EVA Air (長榮航空)',
  JX = 'Starlux (星宇航空)',
  IT = 'Tigerair Taiwan (台灣虎航)',
  AE = 'Mandarin Airlines (華信航空)',
  MM = 'Peach Aviation (樂桃航空)',
  TR = 'Scoot (酷航)',
  GK = 'Jetstar (捷星航空)',
  OD = 'Batik Air (巴澤航空)',
  VZ = 'Thai Vietjet (泰越捷航空)',
  AK = 'AirAsia (亞洲航空)',
  KE = 'Korean Air (大韓航空)',
  OZ = 'Asiana Airlines (韓亞航空)',
  '7C' = 'Jeju Air (濟州航空)',
  TW = 'T\'way Air (德威航空)',
  LJ = 'Jin Air (真航空)',
  BX = 'Air Busan (釜山航空)',
  CX = 'Cathay Pacific (國泰航空)',
  JL = 'Japan Airlines (日航)',
  NH = 'All Nippon Airways (全日空)'
}
export interface FlightOption {
  id: string;
  airline: string;
  price: string;
  dates: string;
  outboundDate?: string;
  returnDate?: string;
  duration: string;
  type: 'Direct' | 'Transfer';
  tags: string[];
  notes: string;
}
export interface TimeRange {
  start: number;
  end: number;
}
export interface SearchParams {
  departure: DepartureLocation;
  destination: Destination;
  startMonth: string;
  minDays: number;
  maxDays: number;
  hasLuggage: boolean;
  outboundTime: TimeRange;
  returnTime: TimeRange;
  cabinClass: CabinClass;
  airline: Airline;
}
export interface FlightResponse {
  flights: FlightOption[];
  summary: string;
}
export enum TravelMode {
  ACCOMMODATION = 'accommodation',
  EXPLORE = 'explore',
  INSPIRATION = 'inspiration'
}
export enum TravelCategory {
  FOOD = '美食 (Food)',
  SPOT = '景點 (Attractions)',
  SHOPPING = '購物 (Shopping)'
}
export enum AccommodationType {
  BUDGET_HOTEL = '平價商旅',
  HOMESTAY = '特色民宿/Airbnb',
  NEAR_SUBWAY = '近地鐵站 (交通便利)',
  NEAR_AIRPORT = '近機場 (早晚班機)',
  RESORT = '溫泉/度假飯店',
  CAPSULE = '膠囊旅館',
  LUXURY = '高級飯店'
}
export enum PriceLevel {
  ANY = '不限預算',
  LOW = '經濟 ($2000以下/晚)',
  MID = '舒適 ($2000-$4000/晚)',
  HIGH = '豪華 ($4000以上/晚)'
}
export const FoodTags = [
  '不限', '燒肉 (Yakiniku)', '火鍋/壽喜燒 (Hotpot)', '拉麵 (Ramen)', '壽司/海鮮 (Sushi)', '居酒屋 (Izakaya)', '甜點/咖啡 (Cafe)', '街頭小吃 (Street Food)'
];
export interface TravelRecommendation {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  subway: string;
  priceLevel: string;
  rating: string;
  tags: string[];
  bookingPlatform?: string;
}
export interface TravelParams {
  mode: TravelMode;
  destination: Destination;
  accomType?: AccommodationType;
  priceLevel?: PriceLevel;
  category?: TravelCategory;
  foodTag?: string;
  centerLocation?: string;
  keyword?: string;
}
export interface TravelResponse {
  recommendations: TravelRecommendation[];
  mapCenter: string;
}
export interface SearchHistoryItem {
    id: number;
    timestamp: number;
    params: SearchParams;
    label: string;
}
