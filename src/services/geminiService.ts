import { GoogleGenAI } from "@google/genai";
import { SearchParams, FlightResponse, DepartureLocation, CabinClass, Airline, TravelParams, TravelResponse, TravelMode, AccommodationType, PriceLevel, Destination } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const searchFlights = async (params: SearchParams): Promise<FlightResponse> => {
  if (!apiKey) throw new Error("API Key is missing. Please set process.env.API_KEY.");
  const baggageText = params.hasLuggage 
    ? "價格必須包含「20kg託運行李」(Prices MUST include checked baggage)" 
    : "價格僅需包含「手提行李」(Prices should be Basic Fare/Carry-on only)";
  const formatTime = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
  const outboundRange = `${formatTime(params.outboundTime.start)} 至 ${formatTime(params.outboundTime.end)}`;
  const returnRange = `${formatTime(params.returnTime.start)} 至 ${formatTime(params.returnTime.end)}`;
  const timeText = `【嚴格時間限制】：1. 去程航班起飛時間 ${outboundRange}。2. 回程航班起飛時間 ${returnRange}。`;
  
  let airlineInstruction = "";
  const isKorea = [Destination.SEOUL, Destination.BUSAN, Destination.JEJU].includes(params.destination);
  if (params.airline !== Airline.ALL) {
    airlineInstruction = `【嚴格航空公司限制】: 只搜尋並顯示「${params.airline}」的航班。`;
  } else {
    if (isKorea) {
       airlineInstruction = "【韓國航線專用】優先搜尋：大韓航空(KE)、韓亞航空(OZ)、台灣虎航(IT)、華航(CI)、長榮(BR)、德威(TW)、濟州航空(7C)、釜山航空(BX)、真航空(LJ)。";
    } else if (params.departure === DepartureLocation.KHH) {
      airlineInstruction = "專注於高雄出發的航空：台灣虎航、樂桃、華航、長榮、國泰、AirAsia、巴澤、德威、濟州航空。嚴格排除桃園出發。";
    } else if (params.departure === DepartureLocation.RMQ) {
      airlineInstruction = "專注於台中出發的航空：華信航空、台灣虎航、越捷航空。";
    } else if (params.departure === DepartureLocation.TSA) {
      airlineInstruction = "專注於松山出發的航空：華航、長榮、日航、全日空、德威。";
    } else {
      airlineInstruction = "包含所有桃園出發的航空：星宇、長榮、華航、國泰、樂桃、酷航、捷星、泰越捷、巴澤、AirAsia等。";
    }
  }

  let cabinInstruction = "";
  if (params.cabinClass === CabinClass.BUSINESS) cabinInstruction = "【艙等要求】：全程商務艙。";
  else if (params.cabinClass === CabinClass.MIXED) cabinInstruction = "【特殊艙等要求】：去程經濟艙，回程商務艙。";
  else cabinInstruction = "【艙等要求】：全程經濟艙。";

  const prompt = `
    角色設定: 你是台灣最專業的機票比價專家。
    任務: 搜尋從「${params.departure}」飛往「${params.destination}」的最便宜**「直飛 (Direct/Non-stop)」**來回機票。
    重要規則: 1. 嚴格禁止轉機。 2. 若無直飛請誠實回傳空陣列。
    搜尋條件: 1. 出發機場: ${params.departure}。 2. 航空公司: ${airlineInstruction} 3. 起始月份: ${params.startMonth} (往後3個月)。 4. 天數: ${params.minDays}-${params.maxDays}天。 5. ${baggageText}。 6. ${timeText}。 7. ${cabinInstruction}。
    輸出格式 (JSON):
    {
      "summary": "簡短市場行情分析",
      "flights": [{
          "airline": "航空公司", "price": "金額", "dates": "顯示日期",
          "outboundDate": "YYYY-MM-DD", "returnDate": "YYYY-MM-DD",
          "duration": "飛行時間", "type": "直飛", "tags": ["最低價"], "notes": "備註"
      }]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
        const parsedData = JSON.parse(jsonMatch[1]);
        return { flights: parsedData.flights.map((f, index) => ({ ...f, id: `flight-${index}` })), summary: parsedData.summary || "找到最佳航班。" };
    } else { return { flights: [], summary: "搜尋格式異常。" }; }
  } catch (error) { throw error; }
};

export const searchTravelInfo = async (params: TravelParams): Promise<TravelResponse> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const city = params.destination.split('(')[0].trim();
    let prompt = "";

    if (params.mode === TravelMode.INSPIRATION) {
      prompt = `角色設定: ${city} 旅遊部落客。任務: 整理「必去景點」與「必吃美食」懶人包。輸出 JSON: { "mapCenter": "${city}", "recommendations": [{ "name": "...", "category": "...", "description": "...", "location": "...", "subway": "...", "priceLevel": "...", "rating": "...", "tags": [] }] }`;
    } else if (params.mode === TravelMode.ACCOMMODATION) {
      const type = params.accomType || AccommodationType.BUDGET_HOTEL;
      const priceConstraint = params.priceLevel && params.priceLevel !== PriceLevel.ANY ? `嚴格預算: 每晚 ${params.priceLevel}` : "";
      let specific = "";
      if (type === AccommodationType.NEAR_SUBWAY) specific = "要求: 離地鐵5分鐘內。";
      else if (type === AccommodationType.NEAR_AIRPORT) specific = "要求: 有機場接駁。";
      else if (type === AccommodationType.RESORT) specific = "要求: 有溫泉/設施。";
      prompt = `角色: ${city} 訂房達人。任務: 推薦5-6間「${type}」。關鍵字: "${params.keyword||'好評'}". ${priceConstraint} ${specific} 輸出 JSON: { "mapCenter": "${city} Station", "recommendations": [{ "name": "...", "category": "${type}", "description": "...", "location": "...", "subway": "...", "priceLevel": "...", "rating": "...", "tags": [], "bookingPlatform": "Agoda" }] }`;
    } else {
      const center = params.centerLocation || `${city} Station`;
      const cat = params.category || "Food";
      const tag = params.foodTag && params.foodTag !== '不限' ? `類型: ${params.foodTag}` : "";
      prompt = `角色: ${city} 在地嚮導。任務: 以「${center}」為中心推薦5-6個「${cat}」。${tag} 關鍵字: "${params.keyword||'推薦'}". 輸出 JSON: { "mapCenter": "${center}", "recommendations": [{ "name": "...", "category": "${cat}", "description": "...", "location": "...", "subway": "...", "priceLevel": "...", "rating": "...", "tags": [] }] }`;
    }
  
    try {
      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
      const text = response.text || "";
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
          const parsedData = JSON.parse(jsonMatch[1]);
          return { recommendations: parsedData.recommendations.map((r, i) => ({ ...r, id: `rec-${i}` })), mapCenter: parsedData.mapCenter };
      }
      return { recommendations: [], mapCenter: city };
    } catch (error) { throw error; }
};
