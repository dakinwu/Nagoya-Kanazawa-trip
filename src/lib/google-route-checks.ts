// Manually read from Google Maps UI on 2026-11-17. Not API output or live data.
// Except the explicitly dated D4 query, transit results use current departure references.
// Google warns that the 2027-02-12 region timetable is not up to date.
export const googleRouteChecks = [
 { from:"Hotel Torifito Kanazawa",to:"Omicho Market",mode:"walking",minutes:12,detail:"800公尺；冬季另加緩衝" },
 { from:"Hotel Torifito Kanazawa",to:"Kanazawa Forus",mode:"walking",minutes:7,detail:"500公尺；另計上樓" },
 { from:"Omicho Market",to:"Higashi Chaya District",mode:"walking",minutes:13,detail:"950公尺" },
 { from:"Takayama Station",to:"Hida Furukawa Station",mode:"transit",minutes:26,detail:"現行Hida約15分鐘／普通約26分鐘，不含等車" },
 { from:"Hida Furukawa Station",to:"Nagoya Station",mode:"transit",minutes:176,detail:"2027/2/12 16:10→19:06，高山本線轉Hida；Google警告沒有最新時刻表，未訂位" },
 { from:"Meitetsu Nagoya Station",to:"Inuyama Station",mode:"transit",minutes:37,detail:"現行特急26分鐘／一般約36–37分鐘" },
 { from:"Inuyama Station",to:"Sanko Inari Shrine",mode:"walking",minutes:18,detail:"1.3公里；規劃25分鐘" },
 { from:"GRAND BASE Nagoya Eki Nishi",to:"Atsuta Jingu",mode:"transit",minutes:39,detail:"現行多方案30–39分鐘，規劃45分鐘" },
 { from:"Atsuta Jingu",to:"Shirotori Garden",mode:"walking",minutes:26,detail:"1.7公里國道1號；不採私人道路替代線，規劃35分鐘" },
 { from:"Shirotori Garden",to:"Pokemon Center Nagoya",mode:"transit",minutes:24,detail:"步行轉名城線再步行；含候車等規劃45分鐘" },
 { from:"Meitetsu Nagoya Station",to:"Central Japan International Airport Station",mode:"transit",minutes:36,detail:"現行特急約28–36分鐘；不含飯店、候車與航廈步行" },
].map(check=>({...check,checkedAt:"2026-11-17",url:`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(check.from)}&destination=${encodeURIComponent(check.to)}&travelmode=${check.mode}`}));
