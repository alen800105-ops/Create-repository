import React from 'react';
import { FlightOption, Destination, DepartureLocation } from '../types';

interface FlightCardProps {
  flight: FlightOption;
  destination: Destination;
  departure: DepartureLocation;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, destination, departure }) => {
  
  // Helper to extract Airport Code (e.g. "Osaka (KIX)" -> "kix")
  const getAirportCode = (str: string): string => {
    const match = str.match(/\(([^)]+)\)/);
    return match ? match[1].split('/')[0].toLowerCase() : 'tpe'; // split for NRT/HND case
  };

  // Helper to format date YYYY-MM-DD to YYMMDD (Skyscanner format)
  const formatSkyscannerDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    // Remove dashes and take last 6 chars (2024-05-12 -> 240512)
    const cleanDate = dateStr.replace(/-/g, '');
    return cleanDate.slice(2); 
  };

  const getBookingLink = () => {
    const originCode = getAirportCode(departure);
    const destCode = getAirportCode(destination);
    
    const outbound = formatSkyscannerDate(flight.outboundDate);
    const inbound = formatSkyscannerDate(flight.returnDate);

    // If we have specific dates from AI, build deep link
    if (outbound && inbound) {
        return `https://www.skyscanner.com.tw/transport/flights/${originCode}/${destCode}/${outbound}/${inbound}`;
    }

    // Fallback if no dates found (general route search)
    return `https://www.skyscanner.com.tw/transport/flights/${originCode}/${destCode}`;
  };

  // Check for keywords in tags to style "Lowest Price" specially
  const isCheapest = flight.tags.some(t => t.includes('最低') || t.includes('Cheapest') || t.includes('超值'));

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col h-full relative group">
      
      {/* Cheapest Badge (Absolute) */}
      {isCheapest && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
          <i className="fa-solid fa-thumbs-up mr-1"></i> 最低價格
        </div>
      )}

      {/* Header / Airline Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <h3 className="font-bold text-gray-800 text-lg">{flight.airline}</h3>
        </div>
        <div className="flex gap-2">
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">
                直飛
            </span>
        </div>
      </div>

      {/* Body Info */}
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-end mb-5">
          <div>
             <p className="text-xs text-gray-400 font-medium mb-1">預估票價</p>
             <p className="text-2xl font-extrabold text-blue-600 tracking-tight">{flight.price}</p>
          </div>
        </div>

        <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center text-gray-700">
                <i className="fa-regular fa-calendar-check w-6 text-center text-blue-400"></i>
                <div className="flex flex-col ml-2">
                    <span className="text-sm font-medium">{flight.dates}</span>
                    {flight.outboundDate && (
                        <span className="text-xs text-gray-400">
                            {flight.outboundDate} 出發
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center text-gray-700">
                <i className="fa-regular fa-clock w-6 text-center text-blue-400"></i>
                <span className="text-sm ml-2">{flight.duration}</span>
            </div>
            <div className="flex items-start text-gray-600">
                <i className="fa-solid fa-circle-info w-6 text-center text-blue-400 mt-1 text-xs"></i>
                <span className="text-xs ml-2 text-gray-500 leading-tight">{flight.notes}</span>
            </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
            {flight.tags.filter(t => !t.includes('最低') && !t.includes('Cheapest')).map(tag => (
                <span key={tag} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md shadow-sm">
                    {tag}
                </span>
            ))}
        </div>
      </div>

      {/* Footer / Action */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <a 
          href={getBookingLink()} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-blue-200 shadow-lg active:scale-95 flex items-center justify-center gap-2 group-hover:bg-blue-700"
        >
          查看機票 <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
        </a>
      </div>
    </div>
  );
};

export default FlightCard;