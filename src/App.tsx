import React, { useState, useEffect } from 'react';
import { Destination, DepartureLocation, SearchParams, FlightResponse, CabinClass, Airline, SearchHistoryItem } from './types';
import { searchFlights } from './services/geminiService';
import LoadingState from './components/LoadingState';
import FlightCard from './components/FlightCard';
import TravelGuide from './components/TravelGuide';

const getNext12Months = () => {
  const months = []; const date = new Date();
  for (let i = 0; i < 12; i++) { const current = new Date(date.getFullYear(), date.getMonth() + i, 1); months.push({ label: `${current.getFullYear()}年 ${current.getMonth() + 1}月`, value: `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}` }); }
  return months;
};
const getHours = () => Array.from({ length: 25 }, (_, i) => ({ label: `${i.toString().padStart(2, '0')}:00`, value: i }));

const App: React.FC = () => {
  const monthOptions = getNext12Months(); const hours = getHours();
  const [currentView, setCurrentView] = useState<'flights' | 'guide'>('flights');
  const [params, setParams] = useState<SearchParams>({ departure: DepartureLocation.KHH, destination: Destination.OSAKA, startMonth: monthOptions[0].value, minDays: 3, maxDays: 7, hasLuggage: false, outboundTime: { start: 6, end: 12 }, returnTime: { start: 16, end: 23 }, cabinClass: CabinClass.ECONOMY, airline: Airline.ALL });
  const [loading, setLoading] = useState(false); const [results, setResults] = useState<FlightResponse | null>(null);
  const [error, setError] = useState<string | null>(null); const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => { const saved = localStorage.getItem('flightSearchHistory'); if (saved) setHistory(JSON.parse(saved)); }, []);
  const saveToHistory = (newParams: SearchParams) => { const newItem = { id: Date.now(), timestamp: Date.now(), params: newParams, label: `${newParams.departure.split(' ')[0]} -> ${newParams.destination.split(' ')[0]} (${newParams.minDays}-${newParams.maxDays}天)` }; const updated = [newItem, ...history.filter(h => !(h.params.destination === newParams.destination && h.params.departure === newParams.departure))].slice(0, 5); setHistory(updated); localStorage.setItem('flightSearchHistory', JSON.stringify(updated)); };
  
  const handleSearch = async () => {
    if (params.minDays < 1) return setError("天數錯誤"); setLoading(true); setError(null); setResults(null); saveToHistory(params);
    try { const data = await searchFlights(params); setResults(data); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  const adjustDays = (type: 'min' | 'max', delta: number) => { setParams(prev => { const val = type === 'min' ? prev.minDays + delta : prev.maxDays + delta; if (val < 1 || val > 30) return prev; return type === 'min' ? { ...prev, minDays: val, maxDays: Math.max(val, prev.maxDays) } : { ...prev, maxDays: val, minDays: Math.min(val, prev.minDays) }; }); };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50"><div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between"><div className="flex items-center gap-2 text-blue-600 font-bold text-xl"><i className="fa-solid fa-plane-up"></i> TaiwanFly</div><div className="flex gap-2"><button onClick={() => setCurrentView('flights')} className={`px-3 py-1 rounded-full text-xs font-bold ${currentView === 'flights' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>機票</button><button onClick={() => setCurrentView('guide')} className={`px-3 py-1 rounded-full text-xs font-bold ${currentView === 'guide' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>旅遊</button></div></div></header>
      <main className="flex-grow">
        {currentView === 'flights' && (
            <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 animate-fade-in-up">
                <div className="bg-white rounded-3xl shadow-lg p-6 mb-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">規劃您的日韓之旅</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative"><select className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={params.departure} onChange={(e) => setParams({...params, departure: e.target.value as DepartureLocation})}><option value={DepartureLocation.KHH}>高雄小港</option><option value={DepartureLocation.TPE}>桃園國際</option><option value={DepartureLocation.TSA}>台北松山</option><option value={DepartureLocation.RMQ}>台中清泉崗</option></select><i className="fa-solid fa-plane-departure absolute left-4 top-3.5 text-blue-500"></i></div>
                    <div className="relative"><select className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={params.destination} onChange={(e) => setParams({...params, destination: e.target.value as Destination})}><optgroup label="🇯🇵 日本"><option value={Destination.OSAKA}>大阪</option><option value={Destination.TOKYO}>東京</option><option value={Destination.FUKUOKA}>福岡</option><option value={Destination.OKINAWA}>沖繩</option><option value={Destination.SAPPORO}>札幌</option><option value={Destination.NAGOYA}>名古屋</option><option value={Destination.KUMAMOTO}>熊本</option><option value={Destination.SENDAI}>仙台</option><option value={Destination.HAKODATE}>函館</option><option value={Destination.HIROSHIMA}>廣島</option></optgroup><optgroup label="🇰🇷 韓國"><option value={Destination.SEOUL}>首爾</option><option value={Destination.BUSAN}>釜山</option><option value={Destination.JEJU}>濟州島</option></optgroup></select><i className="fa-solid fa-location-dot absolute left-4 top-3.5 text-blue-500"></i></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="relative"><select className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={params.startMonth} onChange={(e) => setParams({...params, startMonth: e.target.value})}>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label} 起</option>)}</select><i className="fa-regular fa-calendar-days absolute left-4 top-3.5 text-blue-500"></i></div>
                    <div className="flex items-center gap-2 h-[50px]"><div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-1 overflow-hidden h-full"><button onClick={() => adjustDays('min', -1)} className="w-8 h-full"><i className="fa-solid fa-minus"></i></button><input readOnly className="w-full bg-transparent text-center font-bold" value={params.minDays} /><button onClick={() => adjustDays('min', 1)} className="w-8 h-full"><i className="fa-solid fa-plus"></i></button></div><span className="font-bold">-</span><div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-1 overflow-hidden h-full"><button onClick={() => adjustDays('max', -1)} className="w-8 h-full"><i className="fa-solid fa-minus"></i></button><input readOnly className="w-full bg-transparent text-center font-bold" value={params.maxDays} /><button onClick={() => adjustDays('max', 1)} className="w-8 h-full"><i className="fa-solid fa-plus"></i></button></div></div>
                    <button onClick={() => setParams({...params, hasLuggage: !params.hasLuggage})} className={`w-full py-3 rounded-xl border font-bold ${params.hasLuggage ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>{params.hasLuggage ? '含託運' : '僅手提'}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative"><select className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={params.airline} onChange={(e) => setParams({...params, airline: e.target.value as Airline})}><option value={Airline.ALL}>不限航空</option><option value={Airline.IT}>台灣虎航</option><option value={Airline.BR}>長榮</option><option value={Airline.CI}>華航</option><option value={Airline.JX}>星宇</option><option value={Airline.MM}>樂桃</option><option value={Airline.TR}>酷航</option><option value={Airline.KE}>大韓</option><option value={Airline.CX}>國泰</option></select><i className="fa-solid fa-plane absolute left-4 top-3.5 text-blue-500"></i></div>
                    <div className="relative"><select className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={params.cabinClass} onChange={(e) => setParams({...params, cabinClass: e.target.value as CabinClass})}><option value={CabinClass.ECONOMY}>經濟艙</option><option value={CabinClass.BUSINESS}>商務艙</option><option value={CabinClass.MIXED}>去經濟/回商務</option></select><i className="fa-solid fa-couch absolute left-4 top-3.5 text-blue-500"></i></div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-3"><i className="fa-regular fa-clock text-blue-500"></i> 自訂時段</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="flex gap-2 items-center"><span className="text-xs w-10">去程</span><select value={params.outboundTime.start} onChange={(e) => setParams({...params, outboundTime: {...params.outboundTime, start: +e.target.value}})} className="w-full rounded-lg py-2 pl-3 border">{hours.map(h=><option key={h.value} value={h.value}>{h.label}</option>)}</select><span>-</span><select value={params.outboundTime.end} onChange={(e) => setParams({...params, outboundTime: {...params.outboundTime, end: +e.target.value}})} className="w-full rounded-lg py-2 pl-3 border">{hours.map(h=><option key={h.value} value={h.value}>{h.label}</option>)}</select></div><div className="flex gap-2 items-center"><span className="text-xs w-10">回程</span><select value={params.returnTime.start} onChange={(e) => setParams({...params, returnTime: {...params.returnTime, start: +e.target.value}})} className="w-full rounded-lg py-2 pl-3 border">{hours.map(h=><option key={h.value} value={h.value}>{h.label}</option>)}</select><span>-</span><select value={params.returnTime.end} onChange={(e) => setParams({...params, returnTime: {...params.returnTime, end: +e.target.value}})} className="w-full rounded-lg py-2 pl-3 border">{hours.map(h=><option key={h.value} value={h.value}>{h.label}</option>)}</select></div></div>
                </div>
                <button onClick={handleSearch} disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>{loading ? 'AI 比價中...' : '搜尋航班'}</button>
                {history.length > 0 && (<div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar"><span className="text-xs font-bold text-gray-400 whitespace-nowrap pt-1">最近:</span>{history.map(item => (<button key={item.id} onClick={() => setParams(item.params)} className="text-xs bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap border">{item.label}</button>))}</div>)}
                </div>
                {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl mb-6">{error}</div>}
                {loading && <LoadingState />}
                {!loading && results && (
                <div className="animate-fade-in-up">
                    <h3 className="text-xl font-bold mb-4">搜尋結果</h3>
                    {results.summary && <div className="bg-indigo-50 p-5 rounded-2xl mb-6 text-sm text-indigo-900 border border-indigo-100">{results.summary}</div>}
                    {results.flights.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{results.flights.map(f => <FlightCard key={f.id} flight={f} destination={params.destination} departure={params.departure} />)}</div>) : (<div className="text-center py-12 bg-white rounded-3xl border border-dashed text-gray-500">找不到航班，請放寬條件。</div>)}
                </div>
                )}
            </div>
        )}
        {currentView === 'guide' && <TravelGuide initialDestination={params.destination} />}
      </main>
      <nav className="fixed bottom-0 w-full bg-white border-t h-16 flex justify-around pb-2 shadow-lg z-40"><button onClick={() => setCurrentView('flights')} className={`flex-1 flex flex-col items-center justify-center ${currentView==='flights'?'text-blue-600':'text-gray-400'}`}><i className="fa-solid fa-plane"></i><span className="text-xs font-bold">搜機票</span></button><button onClick={() => setCurrentView('guide')} className={`flex-1 flex flex-col items-center justify-center ${currentView==='guide'?'text-blue-600':'text-gray-400'}`}><i className="fa-solid fa-map-location-dot"></i><span className="text-xs font-bold">旅遊嚮導</span></button></nav>
    </div>
  );
};
export default App;
