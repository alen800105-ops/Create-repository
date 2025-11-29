import { GoogleGenAI } from "@google/genai";
import { SearchParams, FlightResponse, DepartureLocation, CabinClass, Airline, TravelParams, TravelResponse, TravelMode, AccommodationType, PriceLevel, Destination } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini Client
// Using gemini-2.5-flash for higher rate limits (1500 RPD)
const ai = new GoogleGenAI({ apiKey });

// --- Flight Search Function ---
export const searchFlights = async (params: SearchParams): Promise<FlightResponse> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  // Baggage logic
  const baggageText = params.hasLuggage 
    ? "價格必須包含「20kg託運行李」(Prices MUST include checked baggage)" 
    : "價格僅需包含「手提行李」(Prices should be Basic Fare/Carry-on only)";

  // Format time ranges
  const formatTime = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
  const outboundRange = `${formatTime(params.outboundTime.start)} 至 ${formatTime(params.outboundTime.end)}`;
  const returnRange = `${formatTime(params.returnTime.start)} 至 ${formatTime(params.returnTime.end)}`;

  const timeText = `【嚴格時間限制】：
    1. 去程航班(Outbound) 起飛時間必須在 ${outboundRange} 之間。
    2. 回程航班(Inbound) 起飛時間必須在 ${returnRange} 之間。
    請過濾掉不符合上述起飛時間的航班。`;

  // Dynamic airport instructions
  let airlineInstruction = "";

  const isKorea = [Destination.SEOUL, Destination.BUSAN, Destination.JEJU].includes(params.destination);

  if (params.airline !== Airline.ALL) {
    airlineInstruction = `【嚴格航空公司限制】: 只搜尋並顯示「${params.airline}」的航班。如果該航空公司在該航線無直飛航班，請直接回傳空陣列並在 summary 說明。`;
  } else {
    // Default smart logic
    if (isKorea) {
       airlineInstruction = "【韓國航線專用】優先搜尋：大韓航空(KE)、韓亞航空(OZ)、台灣虎航(IT)、華航(CI)、長榮(BR)、德威(TW)、濟州航空(7C)、釜山航空(BX)、真航空(LJ)。";
    } else if (params.departure === DepartureLocation.KHH) {
      airlineInstruction = "專注於高雄出發的航空：台灣虎航 (Tigerair)、樂桃 (Peach)、華航 (China Airlines)、長榮 (EVA Air)、國泰 (Cathay)、AirAsia、巴澤 (Batik)、德威(T'way)、濟州航空。嚴格排除桃園(TPE)出發的航班。";
    } else if (params.departure === DepartureLocation.RMQ) {
      airlineInstruction = "專注於台中出發的航空：華信航空 (Mandarin Airlines)、台灣虎航 (Tigerair)、越捷航空 (Thai Vietjet)。嚴格排除桃園(TPE)與高雄(KHH)出發的航班。";
    } else if (params.departure === DepartureLocation.TSA) {
      airlineInstruction = "專注於松山出發的航空 (飛羽田/金浦專用)：華航、長榮、日航 (JAL)、全日空 (ANA)、德威(T'way)。";
    } else {
      airlineInstruction = "包含所有桃園出發的航空：星宇 (Starlux)、長榮、華航、國泰、樂桃 (Peach)、酷航 (Scoot)、捷星 (Jetstar)、泰越捷 (Vietjet)、巴澤 (Batik)、AirAsia、大韓(KE)、韓亞(OZ) 等。";
    }
  }

  // Cabin Class Instruction
  let cabinInstruction = "";
  if (params.cabinClass === CabinClass.BUSINESS) {
    cabinInstruction = "【艙等要求】：全程搜尋「商務艙 (Business Class)」價格。";
  } else if (params.cabinClass === CabinClass.MIXED) {
    cabinInstruction = "【特殊艙等要求】：去程搜尋「經濟艙 (Economy)」，回程搜尋「商務艙 (Business)」。請計算這種混搭行程的總價。";
  } else {
    cabinInstruction = "【艙等要求】：全程搜尋「經濟艙 (Economy)」價格。";
  }

  const prompt = `
    角色設定: 你是台灣最專業的機票比價專家。
    
    任務: 搜尋從「${params.departure}」飛往「${params.destination}」的最便宜**「直飛 (Direct/Non-stop)」**來回機票。
    
    重要規則: 
    1. **嚴格禁止轉機**: 絕對不要提供需要轉機 (Transfer/Layover) 的航班。只尋找直飛航班。
    2. 如果該航線沒有直飛，或指定航空公司不飛此航線，請在 JSON 的 summary 欄位誠實說明，並回傳空陣列。

    搜尋條件:
    1. **出發機場**: ${params.departure}。
    2. **航空公司**: ${airlineInstruction}
    3. **起始月份**: ${params.startMonth} (請從這個月份開始，往後搜尋 3 個月內的價格)。
    4. **旅遊天數**: 必須介於 ${params.minDays} 天 到 ${params.maxDays} 天之間。
    5. **行李要求**: ${baggageText}。
    6. **時段要求**: ${timeText}。
    7. **艙等要求**: ${cabinInstruction}。
    
    搜尋策略:
    1. 使用 Google Search 查找該時段從該機場出發的真實票價。
    2. **嚴格過濾**: 符合出發地、直飛、天數、時段、航空公司、艙等限制。
    3. 找出 4-5 個不同日期的最佳直飛選擇。
    
    輸出格式:
    你必須輸出一組 JSON 物件，並將其包裹在 \`\`\`json ... \`\`\` 程式碼區塊中。
    JSON 結構如下 (key 必須是英文，value 請用繁體中文):
    {
      "summary": "一句簡短的市場行情分析。如果有混搭艙等，請特別說明。(例如: '星宇航空去程經濟回程商務組合約 $25,000')",
      "flights": [
        {
          "airline": "航空公司名稱",
          "price": "金額 (例如: NT$8,500)",
          "dates": "顯示用的日期區間 (例如: 5/12 - 5/16)",
          "outboundDate": "去程日期 (格式: YYYY-MM-DD，例如: 2024-05-12)",
          "returnDate": "回程日期 (格式: YYYY-MM-DD，例如: 2024-05-16)",
          "duration": "飛行時間 (例如: 3小時 20分)",
          "type": "直飛",
          "tags": ["最低價", "混搭艙等", "早去晚回"],
          "notes": "備註 (例如: 去程經濟 / 回程商務 / 含行李)"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsedData = JSON.parse(jsonMatch[1]);
        return {
          flights: parsedData.flights.map((f: any, index: number) => ({ ...f, id: `flight-${index}` })),
          summary: parsedData.summary || "已為您找到最佳航班。"
        };
      } catch (e) {
        console.error("JSON Parsing Error", e);
        throw new Error("無法解析航班資料格式，請稍後再試。");
      }
    } else {
        console.warn("No JSON code block found", text);
        return {
            flights: [],
            summary: "搜尋結果格式異常，請重試。"
        };
    }

  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    if (error.status === 429) {
        throw new Error("今日搜尋次數已達上限 (1500次)，請明日再試。");
    }
    throw error;
  }
};

// --- Travel Guide Function ---
export const searchTravelInfo = async (params: TravelParams): Promise<TravelResponse> => {
    if (!apiKey) {
      throw new Error("API Key is missing.");
    }

    const city = params.destination.split('(')[0].trim(); // Extract "Osaka" from "Osaka (KIX)"
    let prompt = "";

    // MODE A: Inspiration (New)
    if (params.mode === TravelMode.INSPIRATION) {
      prompt = `
        角色設定: 你是 ${city} 的資深旅遊部落客。
        任務: 請為第一次去 ${city} 的自由行旅客，整理一份「必去景點」與「必吃美食」的懶人包 (Inspiration Guide)。
        
        搜尋策略:
        1. 搜尋網路上 ${city} 近期最熱門、討論度最高的 5 個景點與 5 個美食體驗。
        2. 不需要考慮使用者的特定關鍵字，直接提供「經典必訪」。

        輸出格式 (JSON):
        {
          "mapCenter": "${city}",
          "recommendations": [
            {
              "name": "地點名稱 (繁中 + 外文)",
              "category": "景點 (或 美食)",
              "description": "簡短的一句話亮點介紹 (例如: 大阪地標，必拍跑跑人)",
              "location": "搜尋用名稱",
              "subway": "最近車站",
              "priceLevel": "預估消費",
              "rating": "4.8",
              "tags": ["必去", "打卡熱點", "經典"]
            }
            // 請提供總共約 8-10 個項目
          ]
        }
      `;
    }
    // MODE B: Accommodation Search
    else if (params.mode === TravelMode.ACCOMMODATION) {
      const type = params.accomType || AccommodationType.BUDGET_HOTEL;
      const priceConstraint = params.priceLevel && params.priceLevel !== PriceLevel.ANY 
        ? `【嚴格預算限制】: 每晚價格必須在 ${params.priceLevel}。` 
        : "";
      
      let specificConstraint = "";
      if (type === AccommodationType.NEAR_SUBWAY) {
          specificConstraint = "重點要求：必須距離主要地鐵站步行 5 分鐘內。請在 subway 欄位註明「幾號出口步行幾分」。";
      } else if (type === AccommodationType.NEAR_AIRPORT) {
          specificConstraint = "重點要求：必須提供免費機場接駁車，或位於機場快線車站旁。請在 description 說明接駁資訊。";
      } else if (type === AccommodationType.RESORT) {
          specificConstraint = "重點要求：必須有大浴場、溫泉或度假設施。";
      }

      prompt = `
        角色設定: 你是 ${city} 當地的訂房達人。
        
        任務: 請推薦 5-6 間位於 ${city} 的「${type}」。
        使用者偏好關鍵字: "${params.keyword || '乾淨好評'}"
        ${priceConstraint}
        ${specificConstraint}
        
        要求:
        1. 專注於尋找 CP 值高、真實評價好的選項。
        2. 必須提供價格範圍 (每晚大約多少台幣)。
        3. 提供訂房平台的建議 (如 Booking, Agoda, Airbnb)。

        輸出格式 (JSON):
        {
          "mapCenter": "${city} Station",
          "recommendations": [
            {
              "name": "住宿名稱 (繁中 + 外文)",
              "category": "${type}",
              "description": "特色介紹 (離地鐵幾分鐘、房間大小、周邊便利性)",
              "location": "完整地址或精確地圖搜尋名稱",
              "subway": "最近的車站與出口",
              "priceLevel": "預估價格 (例如: NT$1500~2000/晚)",
              "rating": "評分 (例如: 4.8)",
              "tags": ["近地鐵", "有浴缸", "機場接駁"],
              "bookingPlatform": "建議訂房平台 (Agoda/Airbnb)"
            }
          ]
        }
      `;
    } 
    // MODE C: Explore Nearby (Food/Spots)
    else {
      const center = params.centerLocation || `${city} Station`;
      const category = params.category || "Food";
      const foodTag = params.foodTag && params.foodTag !== '不限' ? `特定類型: ${params.foodTag}` : "";
      
      prompt = `
        角色設定: 你是 ${city} 的在地嚮導。
        
        任務: 請以「${center}」為中心點，推薦附近的 5-6 個「${category}」。
        ${foodTag ? `請只尋找「${foodTag}」類型的店家。` : ''}
        使用者關鍵字: "${params.keyword || '熱門推薦'}"
        
        要求:
        1. **地點限制**: 推薦的地點必須距離「${center}」步行或短程地鐵可達。不要推薦太遠的地方。
        2. 如果是美食，請包含人均消費。
        3. 必須提供經緯度或適合 Google Maps 搜尋的精確地點名稱。

        輸出格式 (JSON):
        {
          "mapCenter": "${center}",
          "recommendations": [
            {
              "name": "地點名稱 (繁中 + 日文/原文)",
              "category": "${category}",
              "description": "簡短介紹 (必吃餐點、特色、營業時間)",
              "location": "地址或搜尋用名稱",
              "subway": "交通方式 (步行時間)",
              "priceLevel": "消費 (例如: NT$300-500/人)",
              "rating": "評分 (例如: 4.5)",
              "tags": ["排隊名店", "宵夜", "在地人推薦"]
            }
          ]
        }
      `;
    }
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
  
      const text = response.text || "";
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsedData = JSON.parse(jsonMatch[1]);
          return {
            recommendations: parsedData.recommendations.map((r: any, index: number) => ({ ...r, id: `rec-${index}` })),
            mapCenter: parsedData.mapCenter
          };
        } catch (e) {
            console.error(e);
            throw new Error("資料解析失敗");
        }
      }
      return { recommendations: [], mapCenter: city };

    } catch (error: any) {
        console.error("Travel Search Error:", error);
        throw error;
    }
  };