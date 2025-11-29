import React, { useState, useEffect } from 'react';
import { Destination, TravelCategory, TravelParams, TravelResponse, TravelRecommendation, TravelMode, AccommodationType, FoodTags, PriceLevel } from '../types';
import { searchTravelInfo } from '../services/geminiService';
interface Props { initialDestination: Destination; }
const TravelGuide: React.FC<Props> = ({ initialDestination }) => {
  const [mode, setMode] = useState<TravelMode>(TravelMode.INSPIRATION);
  const [baseLocation, setBaseLocation] = useState<string | null>(null);
  const [baseName, setBaseName] = useState<string | null>(null);
  const [params, setParams] = useState<TravelParams>({ mode: TravelMode.INSPIRATION, destination: initialDestination, accomType: AccommodationType.BUDGET_HOTEL, priceLevel: PriceLevel.ANY, category: TravelCategory.FOOD, foodTag: '不限', keyword: '' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TravelResponse | null>(null);
  const [mapQuery, setMapQuery] = useState<string>(initialDestination.split('(')[0]);

  useEffect(() => { setParams(p => ({ ...p, destination: initialDestination })); setMapQuery(initialDestination.split('(')[0]); }, [initialDestination]);
  const handleSearch = async () => {
    setLoading(true);
    const searchParams = { ...params, mode: mode, centerLocation: mode === TravelMode.EXPLORE && baseLocation ? baseLocation : undefined };
    try {
      const result = await searchTravelInfo(searchParams);
      setData(result);
      if (result.mapCenter) setMapQuery(result.mapCenter);
      else if (result.recommendations.length > 0) setMapQuery(result.recommendations[0].location);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleSetBase = (rec: TravelRecommendation) => { setBaseLocation(rec.location); setBaseName(rec.name); setMode(TravelMode.EXPLORE); setMapQuery(rec.location); setData(null); setParams(p => ({...p, category: TravelCategory.FOOD, foodTag: '不限', keyword: ''})); };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 pt-4 animate-fade-in-up">
      {baseName && mode === TravelMode.EXPLORE && (
        <div className="bg-indigo-600 text-white p-3 rounded-xl mb-4 flex justify-between items-center">
            <div><p className="text-xs text-indigo-200">目前據點</p><p className="font-bold">{baseName}</p></div>
            <button onClick={() => { setBaseLocation(null); setBaseName(null); setMode(TravelMode.ACCOMMODATION); }} className="text-xs bg-white/20 px-3 py-1.5 rounded-lg">更換</button>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-md p-5 mb-6 border border-gray-100">
        <div className="flex p-1 bg-gray-100 rounded-xl mb-5">
            <button onClick={() => setMode(TravelMode.INSPIRATION)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === TravelMode.INSPIRATION ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>找靈感</button>
            <button onClick={() => setMode(TravelMode.ACCOMMODATION)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === TravelMode.ACCOMMODATION ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>找住宿</button>
            <button onClick={() => setMode(TravelMode.EXPLORE)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === TravelMode.EXPLORE ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>搜周邊</button>
        </div>
        {mode === TravelMode.ACCOMMODATION && (
            <div className="flex flex-col gap-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {Object.values(AccommodationType).map(type => (
                        <button key={type} onClick={() => setParams({...params, accomType: type})} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border ${params.accomType === type ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-200'}`}>{type}</button>
                    ))}
                </div>
                <select value={params.priceLevel} onChange={(e) => setParams({...params, priceLevel: e.target.value as PriceLevel})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold"><option value="不限預算">不限預算</option>{Object.values(PriceLevel).filter(x=>x!=='不限預算').map(l=><option key={l} value={l}>{l}</option>)}</select>
                <input type="text" placeholder="關鍵字 (例如: 親子友善)" value={params.keyword} onChange={(e) => setParams({...params, keyword: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" />
            </div>
        )}
        {mode === TravelMode.EXPLORE && (
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setParams({...params, category: TravelCategory.FOOD})} className={`py-3 rounded-xl border font-bold text-sm ${params.category === TravelCategory.FOOD ? 'bg-orange-50 border-orange-400 text-orange-600' : 'bg-white'}`}>美食</button>
                     <button onClick={() => setParams({...params, category: TravelCategory.SPOT})} className={`py-3 rounded-xl border font-bold text-sm ${params.category === TravelCategory.SPOT ? 'bg-purple-50 border-purple-400 text-purple-600' : 'bg-white'}`}>景點</button>
                </div>
                {params.category === TravelCategory.FOOD && (<div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{FoodTags.map(tag => (<button key={tag} onClick={() => setParams({...params, foodTag: tag})} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border ${params.foodTag === tag ? 'bg-orange-500 text-white' : 'bg-white'}`}>{tag.split('(')[0]}</button>))}</div>)}
                <input type="text" placeholder="想找什麼?" value={params.keyword} onChange={(e) => setParams({...params, keyword: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" />
            </div>
        )}
        <button onClick={handleSearch} disabled={loading} className={`w-full mt-4 py-3 rounded-xl font-bold text-white shadow-lg ${mode === TravelMode.ACCOMMODATION ? 'bg-blue-600' : mode === TravelMode.EXPLORE ? 'bg-green-600' : 'bg-purple-600'}`}>{loading ? '搜尋中...' : '開始搜尋'}</button>
      </div>
      <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-100 mb-6 h-64 md:h-80 relative group">
         <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`} allowFullScreen loading="lazy"></iframe>
      </div>
      <div className="space-y-4">
        {data?.recommendations.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div><h3 className="text-lg font-bold text-gray-800" onClick={() => setMapQuery(item.location)}>{item.name}</h3><span className="text-yellow-500 text-xs font-bold"><i className="fa-solid fa-star mr-1"></i>{item.rating}</span></div>
                    {item.priceLevel && <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{item.priceLevel}</span>}
                </div>
                <p className="text-gray-600 text-sm">{item.description}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                     <button onClick={() => setMapQuery(item.location)} className="bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold">看地圖</button>
                     {mode === TravelMode.ACCOMMODATION ? (<button onClick={() => handleSetBase(item)} className="bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold">設為據點</button>) : (<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} target="_blank" className="bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold text-center">導航去</a>)}
                </div>
            </div>
        ))}
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};
export default TravelGuide;
