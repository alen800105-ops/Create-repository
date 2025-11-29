import React, { useState, useEffect } from 'react';
import { Destination, DepartureLocation, SearchParams, FlightResponse, CabinClass, Airline, SearchHistoryItem } from './types';
import { searchFlights } from './services/geminiService';
import LoadingState from './components/LoadingState';
import FlightCard from './components/FlightCard';
import TravelGuide from './components/TravelGuide';

// Generate next 12 months for selection
const getNext12Months = () => {
  const months = [];
  const date = new Date();
  
  for (let i = 0; i < 12; i++) {
    const current = new Date(date.getFullYear(), date.getMonth() + i, 1);
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const label = `${year}年 ${month}月`;
    const value = `${year}-${month.toString().padStart(2, '0')}`;
    months.push({ label, value });
  }
  return months;
};

// Generate hours 0-24
const getHours = () => {
    return Array.from({ length: 25 }, (_, i) => ({
        label: `${i.toString().padStart(2, '0')}:00`,
        value: i
    }));
};

const App: React.FC = () => {
  const monthOptions = getNext12Months();
  const hours = getHours();

  // View State: 'flights' or 'guide'
  const [currentView, setCurrentView] = useState<'flights' | 'guide'>('flights');

  const [params, setParams] = useState<SearchParams>({
    departure: DepartureLocation.KHH,
    destination: Destination.OSAKA,
    startMonth: monthOptions[0].value, // Default to current month
    minDays: 3,
    maxDays: 7,
    hasLuggage: false,
    outboundTime: { start: 6, end: 12 }, 
    returnTime: { start: 16, end: 23 },   
    cabinClass: CabinClass.ECONOMY,
    airline: Airline.ALL
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<FlightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load History from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('flightSearchHistory');
    if (saved) {
        try {
            setHistory(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load history");
        }
    }
  }, []);

  const saveToHistory = (newParams: SearchParams) => {
    const newItem: SearchHistoryItem = {
        id: Date.now(),
        timestamp: Date.now(),
        params: newParams,
        label: `${newParams.departure.split(' ')[0]} -> ${newParams.destination.split(' ')[0]} (${newParams.minDays}-${newParams.maxDays}天)`
    };
    
    const updatedHistory = [newItem, ...history.filter(h => 
        // Remove duplicates if same destination and departure
        !(h.params.destination === newParams.destination && h.params.departure === newParams.departure && h.params.minDays === newParams.minDays)
    )].slice(0, 5); // Keep last 5

    setHistory(updatedHistory);
    localStorage.setItem('flightSearchHistory', JSON.stringify(updatedHistory));
  };

  const loadHistoryItem = (item: SearchHistoryItem) => {
      setParams(item.params);
  };

  const handleSearch = async () => {
    if (params.minDays < 1) {
      setError("旅遊天數最少需要 1 天");
      return;
    }
    if (params.maxDays < params.minDays) {
      setError("最大天數不能小於最小天數");
      return;
    }
    if (params.outboundTime.start >= params.outboundTime.end) {
        setError("去程時段設定有誤：開始時間必須早於結束時間");
        return;
    }
    if (params.returnTime.start >= params.returnTime.end) {
        setError("回程時段設定有誤：開始時間必須早於結束時間");
        return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    
    // Save history
    saveToHistory(params);

    try {
      const data = await searchFlights(params);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "搜尋失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const adjustDays = (type: 'min' | 'max', delta: number) => {
    setParams(prev => {
      const newValue = type === 'min' ? prev.minDays + delta : prev.maxDays + delta;
      
      if (newValue < 1 || newValue > 30) return prev;

      if (type === 'min') {
        if (newValue > prev.maxDays) return { ...prev, minDays: newValue, maxDays: newValue };
        return { ...prev, minDays: newValue };
      } else {
        if (newValue < prev.minDays) return { ...prev, maxDays: newValue, minDays: newValue };
        return { ...prev, maxDays: newValue };
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 cursor-pointer" onClick={() => setCurrentView('flights')}>
            <i className="fa-solid fa-plane-up text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">TaiwanFly</h1>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => setCurrentView('flights')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${currentView === 'flights' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
             >
                機票
             </button>
             <button 
                onClick={() => setCurrentView('guide')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${currentView === 'guide' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
             >
                旅遊
             </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        
        {/* VIEW: FLIGHT SEARCH */}
        {currentView === 'flights' && (
            <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 animate-fade-in-up">
                {/* Search Controls */}
                <div className="bg-white rounded-3xl shadow-lg p-6 mb-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">規劃您的日韓之旅</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Departure Select */}
                    <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">出發機場</label>
                    <div className="relative">
                        <i className="fa-solid fa-plane-departure absolute left-4 top-3.5 text-blue-500"></i>
                        <select 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        value={params.departure}
                        onChange={(e) => setParams({...params, departure: e.target.value as DepartureLocation})}
                        >
                        <option value={DepartureLocation.KHH}>高雄小港 (KHH)</option>
                        <option value={DepartureLocation.TPE}>桃園國際 (TPE)</option>
                        <option value={DepartureLocation.TSA}>台北松山 (TSA)</option>
                        <option value={DepartureLocation.RMQ}>台中清泉崗 (RMQ)</option>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                    </div>

                    {/* Destination Select */}
                    <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">目的地</label>
                    <div className="relative">
                        <i className="fa-solid fa-location-dot absolute left-4 top-3.5 text-blue-500"></i>
                        <select 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        value={params.destination}
                        onChange={(e) => setParams({...params, destination: e.target.value as Destination})}
                        >
                        <optgroup label="🇯🇵 日本 (Japan)">
                            <option value={Destination.OSAKA}>大阪 (KIX)</option>
                            <option value={Destination.TOKYO}>東京 (成田/羽田)</option>
                            <option value={Destination.FUKUOKA}>福岡 (FUK)</option>
                            <option value={Destination.OKINAWA}>沖繩 (OKA)</option>
                            <option value={Destination.SAPPORO}>北海道札幌 (CTS)</option>
                            <option value={Destination.NAGOYA}>名古屋 (NGO)</option>
                            <option value={Destination.KUMAMOTO}>熊本 (KMJ)</option>
                            <option value={Destination.SENDAI}>仙台 (SDJ)</option>
                            <option value={Destination.HAKODATE}>函館 (HKD)</option>
                            <option value={Destination.HIROSHIMA}>廣島 (HIJ)</option>
                        </optgroup>
                        <optgroup label="🇰🇷 韓國 (Korea)">
                            <option value={Destination.SEOUL}>首爾 (ICN/GMP)</option>
                            <option value={Destination.BUSAN}>釜山 (PUS)</option>
                            <option value={Destination.JEJU}>濟州島 (CJU)</option>
                        </optgroup>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* Start Month Select */}
                    <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">出發月份 (3個月內)</label>
                    <div className="relative">
                        <i className="fa-regular fa-calendar-days absolute left-4 top-3.5 text-blue-500"></i>
                        <select 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        value={params.startMonth}
                        onChange={(e) => setParams({...params, startMonth: e.target.value})}
                        >
                        {monthOptions.map((m) => (
                            <option key={m.value} value={m.value}>{m.label} 起</option>
                        ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                    </div>

                    {/* Duration Input */}
                    <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">旅遊天數 (天)</label>
                    <div className="flex items-center gap-2 h-[50px]">
                        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-1 overflow-hidden h-full">
                            <button 
                                onClick={() => adjustDays('min', -1)}
                                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                            >
                                <i className="fa-solid fa-minus text-xs"></i>
                            </button>
                            <input 
                                readOnly
                                className="w-full bg-transparent text-center font-bold text-gray-700 outline-none"
                                value={params.minDays}
                            />
                            <button 
                                onClick={() => adjustDays('min', 1)}
                                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                            >
                                <i className="fa-solid fa-plus text-xs"></i>
                            </button>
                        </div>

                        <span className="text-gray-300 font-bold">-</span>

                        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-1 overflow-hidden h-full">
                            <button 
                                onClick={() => adjustDays('max', -1)}
                                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                            >
                                <i className="fa-solid fa-minus text-xs"></i>
                            </button>
                            <input 
                                readOnly
                                className="w-full bg-transparent text-center font-bold text-gray-700 outline-none"
                                value={params.maxDays}
                            />
                            <button 
                                onClick={() => adjustDays('max', 1)}
                                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                            >
                                <i className="fa-solid fa-plus text-xs"></i>
                            </button>
                        </div>
                    </div>
                    </div>

                    {/* Baggage Toggle */}
                    <div className="relative group">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">行李需求</label>
                        <button 
                        onClick={() => setParams({...params, hasLuggage: !params.hasLuggage})}
                        className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all h-[50px] ${
                            params.hasLuggage 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-inner' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                        >
                        {params.hasLuggage ? (
                            <>
                            <i className="fa-solid fa-suitcase-rolling"></i> 含託運
                            </>
                        ) : (
                            <>
                            <i className="fa-solid fa-suitcase"></i> 僅手提
                            </>
                        )}
                        </button>
                    </div>
                    
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Airline Select */}
                    <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">指定航空公司</label>
                    <div className="relative">
                        <i className="fa-solid fa-plane absolute left-4 top-3.5 text-blue-500"></i>
                        <select 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        value={params.airline}
                        onChange={(e) => setParams({...params, airline: e.target.value as Airline})}
                        >
                        <option value={Airline.ALL}>不限 (智慧比價)</option>
                        <optgroup label="台灣籍航空">
                            <option value={Airline.IT}>台灣虎航 (Tigerair)</option>
                            <option value={Airline.CI}>中華航空 (China Airlines)</option>
                            <option value={Airline.BR}>長榮航空 (EVA Air)</option>
                            <option value={Airline.JX}>星宇航空 (Starlux)</option>
                            <option value={Airline.AE}>華信航空 (Mandarin)</option>
                        </optgroup>
                        <optgroup label="韓籍航空 (Korea)">
                            <option value={Airline.KE}>大韓航空 (Korean Air)</option>
                            <option value={Airline.OZ}>韓亞航空 (Asiana)</option>
                            <option value={Airline['7C']}>濟州航空 (Jeju Air)</option>
                            <option value={Airline.TW}>德威航空 (T'way)</option>
                            <option value={Airline.LJ}>真航空 (Jin Air)</option>
                            <option value={Airline.BX}>釜山航空 (Air Busan)</option>
                        </optgroup>
                        <optgroup label="廉價航空 (LCC)">
                            <option value={Airline.MM}>樂桃航空 (Peach)</option>
                            <option value={Airline.TR}>酷航 (Scoot)</option>
                            <option value={Airline.GK}>捷星航空 (Jetstar)</option>
                            <option value={Airline.OD}>巴澤航空 (Batik Air)</option>
                            <option value={Airline.VZ}>泰越捷 (Thai Vietjet)</option>
                            <option value={Airline.AK}>亞洲航空 (AirAsia)</option>
                        </optgroup>
                        <optgroup label="其他外籍航空">
                            <option value={Airline.CX}>國泰航空 (Cathay Pacific)</option>
                            <option value={Airline.JL}>日本航空 (JAL)</option>
                            <option value={Airline.NH}>全日空 (ANA)</option>
                        </optgroup>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                    </div>

                    {/* Cabin Class Select */}
                    <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">艙等選擇</label>
                    <div className="relative">
                        <i className="fa-solid fa-couch absolute left-4 top-3.5 text-blue-500"></i>
                        <select 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        value={params.cabinClass}
                        onChange={(e) => setParams({...params, cabinClass: e.target.value as CabinClass})}
                        >
                        <option value={CabinClass.ECONOMY}>全程經濟艙 (Economy)</option>
                        <option value={CabinClass.BUSINESS}>全程商務艙 (Business)</option>
                        <option value={CabinClass.MIXED}>混搭 (去程經濟/回程商務)</option>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-regular fa-clock text-blue-500"></i> 自訂航班起飛時段
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">去程 出發時間 ({params.departure.split(' ')[0]})</label>
                            <div className="flex items-center gap-2">
                                <div className="relative w-full">
                                    <select 
                                        value={params.outboundTime.start}
                                        onChange={(e) => setParams({...params, outboundTime: {...params.outboundTime, start: Number(e.target.value)}})}
                                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                    >
                                        {hours.map(h => <option key={`out-start-${h.value}`} value={h.value}>{h.label}</option>)}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
                                </div>
                                <span className="text-gray-400 text-sm">至</span>
                                <div className="relative w-full">
                                    <select 
                                        value={params.outboundTime.end}
                                        onChange={(e) => setParams({...params, outboundTime: {...params.outboundTime, end: Number(e.target.value)}})}
                                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                    >
                                        {hours.map(h => <option key={`out-end-${h.value}`} value={h.value}>{h.label}</option>)}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">回程 出發時間 ({params.destination.split(' ')[0]})</label>
                            <div className="flex items-center gap-2">
                                <div className="relative w-full">
                                    <select 
                                        value={params.returnTime.start}
                                        onChange={(e) => setParams({...params, returnTime: {...params.returnTime, start: Number(e.target.value)}})}
                                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                    >
                                        {hours.map(h => <option key={`ret-start-${h.value}`} value={h.value}>{h.label}</option>)}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
                                </div>
                                <span className="text-gray-400 text-sm">至</span>
                                <div className="relative w-full">
                                    <select 
                                        value={params.returnTime.end}
                                        onChange={(e) => setParams({...params, returnTime: {...params.returnTime, end: Number(e.target.value)}})}
                                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                    >
                                        {hours.map(h => <option key={`ret-end-${h.value}`} value={h.value}>{h.label}</option>)}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition-transform active:scale-[0.98] flex items-center justify-center gap-2 ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
                    }`}
                >
                    {loading ? (
                        <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> AI 比價中...
                        </>
                    ) : (
                        <>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        搜尋 {params.destination.split(' ')[0]} 航班
                        </>
                    )}
                </button>
                
                {/* Search History Chips */}
                {history.length > 0 && (
                    <div className="mt-4 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 whitespace-nowrap mr-1">最近搜尋:</span>
                            {history.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => loadHistoryItem(item)}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap border border-gray-200"
                                >
                                    <i className="fa-solid fa-clock-rotate-left mr-1 text-gray-400"></i>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                </div>

                {/* Results Section */}
                {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl mb-6 flex items-start gap-3 animate-fade-in-up">
                    <i className="fa-solid fa-triangle-exclamation mt-1"></i>
                    <div>
                    <p className="font-bold">搜尋條件有誤</p>
                    <p className="text-sm">{error}</p>
                    </div>
                </div>
                )}

                {loading && <LoadingState />}

                {!loading && results && (
                <div className="animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl font-bold text-gray-800">搜尋結果</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium shadow-sm">
                        <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
                        AI 智慧推薦
                    </span>
                    </div>
                    
                    {results.summary && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 text-indigo-900 p-5 rounded-2xl mb-6 text-sm flex gap-3 shadow-sm">
                        <div className="bg-white p-2 rounded-full h-8 w-8 flex items-center justify-center shadow-sm shrink-0">
                            <i className="fa-solid fa-robot text-indigo-500"></i>
                        </div>
                        <p className="leading-relaxed font-medium mt-1">{results.summary}</p>
                    </div>
                    )}

                    {results.flights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.flights.map((flight) => (
                        <FlightCard 
                            key={flight.id} 
                            flight={flight} 
                            destination={params.destination}
                            departure={params.departure}
                        />
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-gray-200 border-dashed">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-plane-slash text-3xl text-gray-400"></i>
                        </div>
                        <p className="font-bold text-lg text-gray-700">找不到符合條件的航班</p>
                        <p className="text-sm mt-2 text-gray-500">可能是該航空公司無此航線，或時段/艙等條件太嚴格。</p>
                        <button onClick={() => setParams({...params, airline: Airline.ALL})} className="mt-4 text-blue-600 underline text-sm">
                            清除航空公司篩選再試試？
                        </button>
                    </div>
                    )}
                </div>
                )}
            </div>
        )}

        {/* VIEW: TRAVEL GUIDE */}
        {currentView === 'guide' && (
            <TravelGuide initialDestination={params.destination} />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-md mx-auto flex justify-around h-16">
            <button 
                onClick={() => setCurrentView('flights')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentView === 'flights' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <i className={`fa-solid fa-plane text-xl ${currentView === 'flights' ? 'animate-bounce-subtle' : ''}`}></i>
                <span className="text-[10px] font-bold">搜機票</span>
            </button>
            <button 
                onClick={() => setCurrentView('guide')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 ${currentView === 'guide' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <i className={`fa-solid fa-map-location-dot text-xl ${currentView === 'guide' ? 'animate-bounce-subtle' : ''}`}></i>
                <span className="text-[10px] font-bold">旅遊嚮導</span>
            </button>
        </div>
      </nav>
      
      <style>{`
        .pb-safe {
            padding-bottom: env(safe-area-inset-bottom, 20px);
        }
        .animate-bounce-subtle {
            animation: bounceSubtle 0.5s infinite alternate;
        }
        @keyframes bounceSubtle {
            from { transform: translateY(0); }
            to { transform: translateY(-2px); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;