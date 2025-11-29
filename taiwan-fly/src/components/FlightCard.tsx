import React from 'react';
import { FlightOption, Destination, DepartureLocation } from '../types';
interface FlightCardProps { flight: FlightOption; destination: Destination; departure: DepartureLocation; }
const FlightCard: React.FC<FlightCardProps> = ({ flight, destination, departure }) => {
  const getAirportCode = (str: string) => { const match = str.match(/\(([^)]+)\)/); return match ? match[1].split('/')[0].toLowerCase() : 'tpe'; };
  const formatSkyscannerDate = (dateStr?: string) => dateStr ? dateStr.replace(/-/g, '').slice(2) : '';
  const getBookingLink = () => {
    const origin = getAirportCode(departure); const dest = getAirportCode(destination);
    const outD = formatSkyscannerDate(flight.outboundDate); const inD = formatSkyscannerDate(flight.returnDate);
    if (outD && inD) return `https://www.skyscanner.com.tw/transport/flights/${origin}/${dest}/${outD}/${inD}`;
    return `https://www.skyscanner.com.tw/transport/flights/${origin}/${dest}`;
  };
  const isCheapest = flight.tags.some(t => t.includes('最低') || t.includes('Cheapest'));
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col h-full relative group">
      {isCheapest && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">最低價格</div>}
      <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-3"><h3 className="font-bold text-gray-800 text-lg">{flight.airline}</h3></div>
        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">直飛</span>
      </div>
      <div className="p-5 flex-grow">
        <div className="mb-5"><p className="text-2xl font-extrabold text-blue-600">{flight.price}</p></div>
        <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center text-gray-700"><span className="text-sm font-medium">{flight.dates}</span></div>
            <div className="flex items-center text-gray-700"><span className="text-sm">{flight.duration}</span></div>
            <div className="text-xs text-gray-500">{flight.notes}</div>
        </div>
      </div>
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <a href={getBookingLink()} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">查看機票 <i className="fa-solid fa-arrow-up-right-from-square"></i></a>
      </div>
    </div>
  );
};
export default FlightCard;
