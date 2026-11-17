import type { TripDay, TripItem } from "./trip-data";

export const routeReviewDate = "2026-11-17";
export const routeReviewNotice = "2026-11-17人工查詢Google Maps與業者時刻後的規劃參考；不是即時導航或已訂班次。Google對2027/2/12提示沒有最新時刻表，出發前須再核對。";

// Deliberate one-time plan update, not a recurring recalculation during sync.
export function reviewRouteSchedule(days: TripDay[]): TripDay[] {
 return days.map(day=>{
  let items=day.items.filter(i=>i.id!=="d3-gate-morning").map(i=>({...i}));
  const patch=(id:string,time:string,durationMinutes:number,extra:Partial<TripItem>={})=>{items=items.map(i=>i.id===id?{...i,time,durationMinutes,...extra}:i);};
  const note=(id:string,text:string)=>{items=items.map(i=>i.id===id?{...i,notes:text}:i);};
  if(day.day===1){
   patch("d1-2","10:35–11:35",60);
   patch("d1-3","約 11:50–12:50",60,{verification:"recheck",notes:"11:50是規劃搭車時段，非已選班次；含約45–60分鐘機場巴士車程，入境延誤時順延午餐與彈性購物。"});
   patch("d1-4","13:00–13:30",30);
   patch("d1-5","13:30–14:30",60);
   patch("d1-6","14:45–16:45",120);
   patch("d1-7","16:50–18:00",70);
   patch("d1-8","18:15–19:00",45);
   patch("d1-9","19:00–20:00",60);
   patch("d1-hotel-end","20:20",0);
  }
  if(day.day===3){
   patch("d3-hotel-start","約 07:00",0);
   patch("d3-4","09:30–14:15",285,{notes:"含午餐、拍照與休息，14:15起往巴士站候車。"});
   patch("d3-5","約 14:45–15:35",50,{verification:"recheck",notes:"依濃飛巴士2026/12/1起公告的14:45→15:35班次作參考，預留14:15–14:45回站與候車；2027旅行日適用與座位仍須確認。",source:{label:"濃飛巴士官方時刻表",url:"https://www.nouhibus.co.jp/route_bus/shirakawago"}});
  }
  if(day.day===4){
   patch("d4-hotel-start","約 07:45",0);
   patch("d4-1","07:00–07:45",45);
   const breakfast=items.find(i=>i.id==="d4-1");
   if(breakfast){items=items.filter(i=>i.id!==breakfast.id);items.unshift(breakfast);}
   patch("d4-2","08:00–08:30",30);
   patch("d4-3","08:40–09:10",30);
   patch("d4-4","09:15–09:55",40,{notes:"彈性參觀項目。"});
   patch("d4-5","10:15–10:55",40);
   patch("d4-6","11:00–11:40",40);
   patch("d4-7","11:40–12:30",50);
   patch("d4-8","12:30–12:50",20);
   patch("d4-9","約 13:00–13:40",40,{verification:"recheck",notes:"此區塊包含候車；Google目前可查火車約15–26分鐘，13:17→13:32為現行參考，不是已確認的2027班次。"});
   patch("d4-10","13:40–15:40",120);
   patch("d4-11","15:40–16:10",30,{title:"回車站、確認返程與候車",notes:"Google查2027/2/12的參考為16:10高山本線轉Hida、19:06到名古屋，但頁面警告沒有最新時刻表；不能視為已訂或保證轉乘。"});
   patch("d4-12","約 16:10–19:15",185,{verification:"recheck",notes:routeReviewNotice+" 參考高山本線轉特急Hida，車程約176分鐘，另加9分鐘抵達緩衝；出發時間仍須以實際可訂班次為準。"});
   patch("d4-13","19:40–20:10",30,{title:"GRAND BASE Nagoya Eki Nishi 入住",notes:"名古屋站回飯店留25分鐘，晚餐另留20:10–21:00；可在車站先買好餐點。"});
   if(!items.some(i=>i.id==="d4-evening-meal"))items.push({id:"d4-evening-meal",day:4,order:0,time:"20:10–21:00",durationMinutes:50,title:"簡單晚餐／飯店休息",type:"meal",priority:"core",completed:false,verification:"provisional"});
  }
  if(day.day===5){
   patch("d5-hotel-start","約 07:15",0);
   patch("d5-1","06:45–07:15",30);
   const breakfast=items.find(i=>i.id==="d5-1");
   if(breakfast){items=items.filter(i=>i.id!==breakfast.id);items.unshift(breakfast);}
   patch("d5-2","約 07:40–08:25",45,{notes:"飯店07:15出發，步行至名鐵站留25分鐘。此區塊包含候車與約26–37分鐘鐵路車程；不是已選定班次。"});
   patch("d5-4","08:50–09:20",30);
   patch("d5-3","09:30–10:30",60);
   patch("d5-5","10:40–11:40",60);
   patch("d5-6","11:40–12:40",60);
   patch("d5-7","約 12:40–13:45",65);
   patch("d5-8","13:45–15:25",100);
  }
  if(day.day===6){
   patch("d6-3","10:20–11:20",60,{notes:"Google Maps神宮至庭園步行約26分鐘／1.7公里，含冬季緩衝留35分鐘；不採用含私人或限制道路的替代線。"});
   patch("d6-2","11:30–12:30",60);
   const lunch=items.find(i=>i.id==="d6-2");
   if(lunch){items=items.filter(i=>i.id!==lunch.id);items.splice(items.findIndex(i=>i.id==="d6-3")+1,0,lunch);}
   patch("d6-4","12:30–13:15",45);
   patch("d6-5","13:30–15:30",120);
   patch("d6-6","15:30–16:45",75);
   patch("d6-7","17:00–18:15",75);
   patch("d6-8","18:30–19:15",45);
   patch("d6-9","19:15–19:45",30);
   patch("d6-hotel-end","約 20:25",0);
  }
  if(day.day===8){
   patch("d8-hotel-start","約 08:30",0);
   patch("d8-1","07:30–08:30",60);
   const breakfast=items.find(i=>i.id==="d8-1");
   if(breakfast){items=items.filter(i=>i.id!==breakfast.id);items.unshift(breakfast);}
   patch("d8-2","08:30–08:45",15);
   patch("d8-hotel-walk","約 08:45–09:10",25);
   patch("d8-station-wait","09:10–09:30",20);
   patch("d8-3","約 09:30–10:10",40,{notes:"Google Maps現行名鐵特急約28–36分鐘，此處留40分鐘列車區塊；09:30不是已選班次。抵達車站後另留15分鐘走到航廈。",verification:"recheck"});
   patch("d8-4","10:25–12:05",100);
  }
  // No automatic future-route claims: checked references remain explicitly provisional.
  if(day.day===3)note("d3-hotel-start","07:00出發，含步行與找站留20分鐘；鼓門只保留D2。先辦退房並帶齊行李。");
  return {...day,items:items.map((i,n)=>({...i,order:n+1}))};
 });
}
