import React, { useState, useEffect } from 'react';
import { Destination, TravelCategory, TravelParams, TravelResponse, TravelRecommendation, TravelMode, AccommodationType, FoodTags, PriceLevel } from '../types';
import { searchTravelInfo } from '../services/geminiService';

interface TravelGuideProps {
  initialDestination: Destination;
}

const TravelGuide: React.FC<TravelGuideProps> = ({ initialDestination }) => {
  // Mode: 'inspiration', 'accommodation', 'explore'
  const [mode, setMode] = useState<TravelMode>(TravelMode.INSPIRATION);
  
  // Base location (User selected hotel)
  const [baseLocation, setBaseLocation] = useState<string | null>(null);
  const [baseName, setBaseName] = useState<string | null>(null);

  const [params, setParams] = useState<TravelParams>({
    mode: TravelMode.INSPIRATION,
    destination: initialDestination,
    accomType: AccommodationType.BUDGET_HOTEL,
    priceLevel: PriceLevel.ANY,
    category: TravelCategory.FOOD,
    foodTag: '不限',
    keyword: ''
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TravelResponse | null>(null);
  const [mapQuery, setMapQuery] = useState<string>(initialDestination.split('(')[0]);

  // Reset when destination changes externally
  useEffect(() => {
    setParams(p => ({ ...p, destination: initialDestination }));
    setMapQuery(initialDestination.split('(')[0]);
  }, [initialDestination]);

  const handleSearch = async () => {
    setLoading(true);
    // Prepare params based on current mode
    const searchParams: TravelParams = {
        ...params,
        mode: mode,
        centerLocation: mode === TravelMode.EXPLORE && baseLocation ? baseLocation : undefined
    };

    try {
      const result = await searchTravelInfo(searchParams);
      setData(result);
      if (result.mapCenter) {
        setMapQuery(result.mapCenter);
      } else if (result.recommendations.length > 0) {
        setMapQuery(result.recommendations[0].location);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Set a hotel as the base for exploration
  const handleSetBase = (rec: TravelRecommendation) => {
      setBaseLocation(rec.location);
      setBaseName(rec.name);
      setMode(TravelMode.EXPLORE);
      setMapQuery(rec.location);
      setData(null); // Clear previous hotel list to show blank state for explore
      setParams(p => ({...p, category: TravelCategory.FOOD, foodTag: '不限', keyword: ''}));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 pt-4 animate-fade-in-up">
      
      {/* 1. Base Location Indicator (If Set) */}
      {baseName && mode === TravelMode.EXPLORE && (
        <div className="bg-indigo-600 text-white p-3 rounded-xl shadow-md mb-4 flex justify-between items-center animate-fade-in-up">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <i className="fa-solid fa-bed"></i>
                </div>
                <div>
                    <p className="text-xs text-indigo-200 uppercase font-bold">目前據點 (以此為中心)</p>
                    <p className="font-bold truncate max-w-[200px] sm:max-w-md">{baseName}</p>
                </div>
            </div>
            <button 
                onClick={() => {
                    setBaseLocation(null);
                    setBaseName(null);
                    setMode(TravelMode.ACCOMMODATION);
                }}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
                更換
            </button>
        </div>
      )}

      {/* 2. Control Panel */}
      <div className="bg-white rounded-3xl shadow-md p-5 mb-6 border border-gray-100">
        
        {/* Mode Switcher Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-5">
            <button 
                onClick={() => setMode(TravelMode.INSPIRATION)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === TravelMode.INSPIRATION ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
            >
                <i className="fa-solid fa-lightbulb mr-2"></i> 找靈感
            </button>
            <button 
                onClick={() => setMode(TravelMode.ACCOMMODATION)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === TravelMode.ACCOMMODATION ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                <i className="fa-solid fa-hotel mr-2"></i> 找住宿
            </button>
            <button 
                onClick={() => setMode(TravelMode.EXPLORE)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === TravelMode.EXPLORE ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
                <i className="fa-solid fa-utensils mr-2"></i> 搜周邊
            </button>
        </div>

        {/* --- MODE A: INSPIRATION --- */}
        {mode === TravelMode.INSPIRATION && (
            <div className="flex flex-col gap-4 animate-fade-in-up text-center py-2">
                <i className="fa-solid fa-compass text-4xl text-purple-200 mb-2"></i>
                <p className="text-gray-600 text-sm font-medium">不知道去哪裡玩？<br/>讓 AI 為您整理 {params.destination.split('(')[0]} 的必去景點與必吃美食懶人包。</p>
            </div>
        )}

        {/* --- MODE B: ACCOMMODATION CONTROLS --- */}
        {mode === TravelMode.ACCOMMODATION && (
            <div className="flex flex-col gap-4 animate-fade-in-up">
                {/* Accommodation Type (Scrollable) */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {Object.values(AccommodationType).map(type => (
                        <button
                            key={type}
                            onClick={() => setParams({...params, accomType: type})}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                                params.accomType === type 
                                ? 'bg-blue-50 border-blue-500 text-blue-600' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {/* Icons for specific types */}
                            {type.includes('地鐵') && <i className="fa-solid fa-train-subway mr-1"></i>}
                            {type.includes('機場') && <i className="fa-solid fa-plane-arrival mr-1"></i>}
                            {type.includes('溫泉') && <i className="fa-solid fa-hot-tub-person mr-1"></i>}
                            {type}
                        </button>
                    ))}
                </div>

                {/* Price Level Filter */}
                <div className="relative">
                     <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">預算範圍</label>
                     <select
                        value={params.priceLevel}
                        onChange={(e) => setParams({...params, priceLevel: e.target.value as PriceLevel})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                     >
                        {Object.values(PriceLevel).map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                     </select>
                     <i className="fa-solid fa-chevron-down absolute right-4 bottom-3.5 text-gray-400 text-xs pointer-events-none"></i>
                </div>
                
                {/* Keyword Input */}
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-gray-400"></i>
                    <input 
                        type="text" 
                        placeholder="其他需求? (例如: 有浴缸、親子友善)" 
                        value={params.keyword}
                        onChange={(e) => setParams({...params, keyword: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        )}

        {/* --- MODE C: EXPLORE CONTROLS --- */}
        {mode === TravelMode.EXPLORE && (
            <div className="flex flex-col gap-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-2">
                     <button
                        onClick={() => setParams({...params, category: TravelCategory.FOOD})}
                        className={`py-3 px-2 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                            params.category === TravelCategory.FOOD
                            ? 'bg-orange-50 border-orange-400 text-orange-600'
                            : 'bg-white border-gray-200 text-gray-500'
                        }`}
                     >
                        <i className="fa-solid fa-utensils"></i> 美食
                     </button>
                     <button
                        onClick={() => setParams({...params, category: TravelCategory.SPOT})}
                        className={`py-3 px-2 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                            params.category === TravelCategory.SPOT
                            ? 'bg-purple-50 border-purple-400 text-purple-600'
                            : 'bg-white border-gray-200 text-gray-500'
                        }`}
                     >
                        <i className="fa-solid fa-camera"></i> 景點
                     </button>
                </div>

                {params.category === TravelCategory.FOOD && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {FoodTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setParams({...params, foodTag: tag})}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-sm ${
                                    params.foodTag === tag 
                                    ? 'bg-orange-500 border-orange-600 text-white' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {tag.split('(')[0]}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-gray-400"></i>
                    <input 
                        type="text" 
                        placeholder={!baseLocation ? "請先設定住宿據點，或直接搜尋..." : `在 ${baseName} 附近找什麼?`}
                        value={params.keyword}
                        onChange={(e) => setParams({...params, keyword: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
            </div>
        )}

        {/* SEARCH BUTTON */}
        <button 
            onClick={handleSearch}
            disabled={loading}
            className={`w-full mt-4 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                mode === TravelMode.ACCOMMODATION ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700' : 
                mode === TravelMode.EXPLORE ? 'bg-green-600 shadow-green-200 hover:bg-green-700' :
                'bg-purple-600 shadow-purple-200 hover:bg-purple-700'
            }`}
        >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 
             mode === TravelMode.INSPIRATION ? <><i className="fa-solid fa-wand-magic-sparkles"></i> 生成懶人包</> :
             <><i className="fa-solid fa-location-arrow"></i> 開始搜尋</>
            }
        </button>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-100 mb-6 h-64 md:h-80 relative group">
         <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
        ></iframe>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {loading ? (
             <div className="flex flex-col items-center justify-center py-12 opacity-70">
                <i className={`fa-solid ${mode === TravelMode.ACCOMMODATION ? 'fa-hotel text-blue-300' : mode === TravelMode.EXPLORE ? 'fa-utensils text-green-300' : 'fa-compass text-purple-300'} fa-bounce text-4xl mb-4`}></i>
                <p className="text-gray-500 font-medium">
                    {mode === TravelMode.INSPIRATION ? 'AI 正在搜集網路熱門情報...' : 'AI 正在搜尋最佳推薦...'}
                </p>
             </div>
        ) : (
            <>
                {data && data.recommendations.length === 0 && (
                     <div className="text-center py-8 text-gray-400">
                        <p>尚無搜尋結果，請嘗試其他關鍵字</p>
                     </div>
                )}
                
                {data?.recommendations.map((item: TravelRecommendation) => (
                    <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setMapQuery(item.location)}>
                                    {item.name} <i className="fa-solid fa-map-pin text-xs text-gray-400 ml-1"></i>
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                                        item.category.includes('Food') || item.category.includes('美食')
                                        ? 'bg-orange-100 text-orange-700' 
                                        : item.category.includes('Spot') || item.category.includes('景點')
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {item.category}
                                    </span>
                                    <span className="text-yellow-500 text-xs font-bold">
                                        <i className="fa-solid fa-star mr-1"></i>{item.rating}
                                    </span>
                                </div>
                            </div>
                            {item.priceLevel && (
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{item.priceLevel}</span>
                                </div>
                            )}
                        </div>
                        
                        <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                             {item.tags.map(tag => (
                                 <span key={tag} className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100">
                                     #{tag}
                                 </span>
                             ))}
                        </div>

                        {item.subway && (
                            <div className="flex items-center text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                <i className="fa-solid fa-train-subway w-5 text-center text-blue-500 mr-2"></i>
                                {item.subway}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-2">
                             <button 
                                onClick={() => setMapQuery(item.location)}
                                className="bg-gray-100 text-gray-600 hover:bg-gray-200 py-2.5 rounded-xl text-sm font-bold transition-colors"
                             >
                                <i className="fa-solid fa-map-location-dot mr-1"></i> 看地圖
                             </button>
                             
                             {/* Logic for Different Modes */}
                             {mode === TravelMode.ACCOMMODATION ? (
                                 <button 
                                    onClick={() => handleSetBase(item)}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 py-2.5 rounded-xl text-sm font-bold shadow-indigo-200 shadow-md transition-all active:scale-95"
                                 >
                                    <i className="fa-solid fa-anchor mr-1"></i> 設為據點搜周邊
                                 </button>
                             ) : (
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-green-600 text-white hover:bg-green-700 py-2.5 rounded-xl text-sm font-bold shadow-green-200 shadow-md text-center flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-location-arrow mr-1"></i> 導航去
                                </a>
                             )}
                        </div>
                    </div>
                ))}
            </>
        )}
      </div>
      
      <style>{`
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

export default TravelGuide;