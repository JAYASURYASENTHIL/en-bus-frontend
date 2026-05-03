import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  MapPin, Clock, ArrowUpDown, Navigation, Search,
  Mic, LocateFixed, Home, Star, History, Bell, User,
  Bus, Zap, ChevronRight, X, Trash2, Wind,
  TrendingUp, Clock3, AlertCircle, CheckCircle2
} from "lucide-react";
import axios from "axios";
import "./App.css";

/* ── CONSTANTS ─────────────────────────────── */

const stops = [
  { en: "Erode Bus Stand", ta: "ஈரோடு பேருந்து நிலையம்", lat: 11.3410, lon: 77.7172 },
  { en: "Perundurai",      ta: "பெருந்துறை",               lat: 11.2756, lon: 77.5874 },
  { en: "Bhavani",         ta: "பவானி",                    lat: 11.4450, lon: 77.6820 },
  { en: "Chennimalai",     ta: "சென்னிமலை",                lat: 11.1639, lon: 77.6034 },
  { en: "Ingur",           ta: "இங்கூர்",                   lat: 11.2418, lon: 77.6892 },
  { en: "Thindal",         ta: "திண்டல்",                   lat: 11.3101, lon: 77.6761 },
];

const CARD_GRADS = [
  ["#1e40af","#3b82f6"],
  ["#6d28d9","#8b5cf6"],
  ["#065f46","#10b981"],
  ["#92400e","#f59e0b"],
  ["#9f1239","#f43f5e"],
  ["#0e7490","#06b6d4"],
];

const FILTERS = [
  { id:"all",     icon:"⊞" },
  { id:"now",     icon:"▶" },
  { id:"next30",  icon:"⏱" },
  { id:"morning", icon:"☀" },
  { id:"evening", icon:"🌇" },
  { id:"last",    icon:"🔚" },
];

const TABS = [
  { id:"home",    Icon:Home,    labelEn:"Home",    labelTa:"முகப்பு"   },
  { id:"saved",   Icon:Star,    labelEn:"Saved",   labelTa:"சேமிப்பு"  },
  { id:"recent",  Icon:History, labelEn:"Recent",  labelTa:"தேடல்"     },
  { id:"alerts",  Icon:Bell,    labelEn:"Alerts",  labelTa:"அறிவிப்பு" },
  { id:"profile", Icon:User,    labelEn:"Profile", labelTa:"எனது"      },
];

const i18n = {
  en: {
    title:"En Bus", sub:"Smart Bus Finder",
    from:"From", to:"Where to?",
    search:"Search Buses", searching:"Searching...",
    all:"All", now:"Upcoming", next30:"30 Min",
    morning:"Morning", evening:"Evening", last:"Last Bus",
    nextBus:"Next Bus", govt:"Govt", pvt:"Private",
    arr:"Arr", dep:"Dep", source:"From",
    found:"buses found", myLoc:"Detect Location",
    noResult:"No buses found", tryOther:"Try a different filter or route",
    savedEmpty:"No saved routes", savedSub:"Star a bus to save it here",
    recentEmpty:"No recent searches", recentSub:"Your search history appears here",
    clearAll:"Clear All", remove:"Remove",
    alertsEmpty:"No alerts set", alertsSub:"Set departure reminders here soon",
    profileTitle:"Your Profile", profileSub:"Sign in to sync across devices",
    tapToSearch:"Search a route to get started",
    popularRoutes:"Popular Routes",
  },
  ta: {
    title:"என் பஸ்", sub:"ஸ்மார்ட் பேருந்து தேடல்",
    from:"எங்கிருந்து", to:"எங்கே செல்கிறீர்கள்?",
    search:"தேடு", searching:"தேடுகிறது...",
    all:"அனைத்தும்", now:"வரவிருக்கும்", next30:"30 நிமிடம்",
    morning:"காலை", evening:"மாலை", last:"கடைசி",
    nextBus:"அடுத்த பேருந்து", govt:"அரசு", pvt:"தனியார்",
    arr:"வரு", dep:"புற", source:"இடம்",
    found:"பேருந்துகள்", myLoc:"இடம் கண்டுபிடி",
    noResult:"பேருந்து இல்லை", tryOther:"வேறு வடிகட்டி முயற்சி",
    savedEmpty:"சேமிப்புகள் இல்லை", savedSub:"பேருந்தை ★ அழுத்தி சேமிக்கவும்",
    recentEmpty:"சமீபத்திய தேடல்கள் இல்லை", recentSub:"உங்கள் தேடல் வரலாறு இங்கே",
    clearAll:"அனைத்தையும் நீக்கு", remove:"நீக்கு",
    alertsEmpty:"அறிவிப்புகள் இல்லை", alertsSub:"விரைவில் புறப்பாடு நினைவூட்டல்கள்",
    profileTitle:"உங்கள் சுயவிவரம்", profileSub:"சாதனங்களில் ஒத்திசைக்க உள்நுழையவும்",
    tapToSearch:"தொடங்க ஒரு பாதையை தேடுங்கள்",
    popularRoutes:"பிரபலமான பாதைகள்",
  },
};

/* ── HELPERS ───────────────────────────────── */

const haversine = (lat1,lon1,lat2,lon2) => {
  const p=0.017453292519943295,a=0.5-Math.cos((lat2-lat1)*p)/2+Math.cos(lat1*p)*Math.cos(lat2*p)*(1-Math.cos((lon2-lon1)*p))/2;
  return 12742*Math.asin(Math.sqrt(a));
};

const toHHMM = () => {
  const n=new Date();
  return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
};

const toTotalMins = () => { const n=new Date(); return n.getHours()*60+n.getMinutes(); };

const fmtTime = (t) => {
  if(!t) return "--";
  const [h,m]=t.split(":").map(Number);
  const ampm=h>=12?"PM":"AM", hh=h%12||12;
  return `${hh}:${String(m).padStart(2,"0")} ${ampm}`;
};

const busCountdown = (bus, lang) => {
  const [h,m]=bus.departureTime.split(":").map(Number);
  const diff=h*60+m-toTotalMins();
  if(diff<0)   return { label:lang==="ta"?"சென்றது":"Departed", state:"gone" };
  if(diff===0) return { label:lang==="ta"?"இப்போது":"Now!",     state:"now"  };
  if(diff<60)  return { label:`${diff}m`,                        state:"soon" };
  return         { label:`${Math.floor(diff/60)}h ${diff%60}m`,  state:"later"};
};

const LS_SAVED  = "enbus_saved_v2";
const LS_RECENT = "enbus_recent_v2";
const LS_LANG   = "enbus_lang";

const loadLS = (key, fallback) => {
  try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; }
};
const saveLS = (key, val) => {
  try { localStorage.setItem(key,JSON.stringify(val)); } catch {}
};

/* ════════════════════════════════════════════ */
export default function App() {
/* ════════════════════════════════════════════ */

  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* state */
  const [lang,      setLang]      = useState(() => loadLS(LS_LANG,"ta"));
  const [from,      setFrom]      = useState("Erode Bus Stand");
  const [to,        setTo]        = useState("");
  const [buses,     setBuses]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState("all");
  const [suggestions,setSuggestions] = useState([]);
  const [isListening,setIsListening] = useState(false);
  const [recObj,    setRecObj]    = useState(null);
  const [locating,  setLocating]  = useState(false);
  const [tick,      setTick]      = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [toast,     setToast]     = useState(null); // {msg, type}
  const [searchDone,setSearchDone]= useState(false);
  const [clockStr,  setClockStr]  = useState("");
  const [fromFocus, setFromFocus] = useState(false);
  const [toFocus,   setToFocus]   = useState(false);

  /* persistent state */
  const [saved,     setSaved]     = useState(() => loadLS(LS_SAVED, []));
  const [recent,    setRecent]    = useState(() => loadLS(LS_RECENT, []));

  const t = i18n[lang];
  const toInputRef = useRef(null);

  /* persist on change */
  useEffect(() => saveLS(LS_SAVED, saved),  [saved]);
  useEffect(() => saveLS(LS_RECENT, recent), [recent]);
  useEffect(() => saveLS(LS_LANG, lang),     [lang]);

  /* clock */
  useEffect(() => {
    const tick = () => {
      const n=new Date();
      setClockStr(n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    };
    tick();
    const id=setInterval(tick,1000);
    return ()=>clearInterval(id);
  },[]);

  /* countdown refresh every 30s */
  useEffect(() => {
    const id=setInterval(()=>setTick(x=>x+1),30000);
    return ()=>clearInterval(id);
  },[]);

  /* toast */
  const showToast = useCallback((msg, type="info") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),2600);
  },[]);

  /* translate */
  const translatePlace = useCallback((name) => {
    const s=stops.find(s=>s.en.toLowerCase()===String(name).toLowerCase()||s.ta===name);
    return s ? (lang==="ta"?s.ta:s.en) : name;
  },[lang]);

  const toEnglish = useCallback((name) => {
    const s=stops.find(s=>s.en.toLowerCase()===String(name).toLowerCase()||s.ta===name);
    return s?s.en:name;
  },[]);

  /* suggestions */
  useEffect(() => {
    if(!to.trim()){setSuggestions([]);return;}
    const q=to.toLowerCase();
    setSuggestions(stops.filter(s=>s.en.toLowerCase().includes(q)||s.ta.includes(to)).slice(0,6));
  },[to]);

  /* search */
  const searchBus = useCallback(async (destOverride) => {
    const dest = destOverride || to.trim();
    if(!dest){ showToast(lang==="ta"?"இடம் உள்ளிடு":"Enter destination","warn"); return; }
    try {
      setLoading(true);
      setSuggestions([]);
      const res = await axios.get(`${API}/api/buses/search?destination=${toEnglish(dest)}`);
      const sorted=[...res.data].sort((a,b)=>a.departureTime.localeCompare(b.departureTime));
      setBuses(sorted);
      setFilter("all");
      setSearchDone(true);
      setActiveTab("home");

      /* save to recent */
      const entry = {
        from: toEnglish(from),
        to: toEnglish(dest),
        displayFrom: translatePlace(from),
        displayTo: lang==="ta"
          ? (stops.find(s=>s.en.toLowerCase()===toEnglish(dest).toLowerCase())?.ta || dest)
          : toEnglish(dest),
        ts: Date.now(),
        count: sorted.length,
      };
      setRecent(prev => {
        const key=entry.from+"|"+entry.to;
        const filtered=prev.filter(r=>r.from+"|"+r.to!==key);
        return [entry,...filtered].slice(0,10);
      });
    } catch {
      showToast(lang==="ta"?"இணைப்பு பிழை":"Connection error","error");
    } finally {
      setLoading(false);
    }
  },[to, from, lang, API, toEnglish, translatePlace, showToast]);

  /* reverse */
  const reverseRoute = () => { const tmp=from; setFrom(to); setTo(tmp); };

  /* geolocation */
  const useMyLocation = () => {
    if(!navigator.geolocation){showToast("Location unsupported","warn");return;}
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const {latitude:lat,longitude:lon}=pos.coords;
        let nearest=stops[0],min=Infinity;
        stops.forEach(s=>{const d=haversine(lat,lon,s.lat,s.lon);if(d<min){min=d;nearest=s;}});
        setFrom(nearest.en);
        setLocating(false);
        showToast(lang==="ta"?`${nearest.ta} கண்டறியப்பட்டது`:`Located: ${nearest.en}`,"success");
      },
      ()=>{setLocating(false);showToast("Location denied","warn");}
    );
  };

  /* voice */
  const startVoice = () => {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){showToast("Voice not supported","warn");return;}
    if(isListening&&recObj){recObj.stop();setIsListening(false);return;}
    const rec=new SR();
    rec.lang=lang==="ta"?"ta-IN":"en-IN";
    rec.onresult=e=>{
      let s=e.results[0][0].transcript.trim();
      const q=s.toLowerCase();
      if(q.includes("perun")||q.includes("pirun")) s="Perundurai";
      else if(q.includes("ingur")||q.includes("ingoor")) s="Ingur";
      else if(q.includes("bhavani")||q.includes("pavani")) s="Bhavani";
      else if(q.includes("chenni")||q.includes("malai")) s="Chennimalai";
      else if(q.includes("thindal")) s="Thindal";
      setTo(s);
      showToast(`"${s}"`, "success");
    };
    rec.onerror=()=>{setIsListening(false);showToast("Voice error","warn");};
    rec.onend=()=>setIsListening(false);
    rec.start();
    setRecObj(rec);
    setIsListening(true);
  };

  /* save/unsave */
  const toggleSave = useCallback((bus) => {
    const key=bus._id||`${bus.displayTag}_${bus.departureTime}`;
    setSaved(prev=>{
      const exists=prev.find(r=>(r._id||`${r.displayTag}_${r.departureTime}`)===key);
      if(exists){
        showToast(lang==="ta"?"நீக்கப்பட்டது":"Removed from saved","info");
        return prev.filter(r=>(r._id||`${r.displayTag}_${r.departureTime}`)!==key);
      }
      showToast(lang==="ta"?"சேமிக்கப்பட்டது":"Saved route","success");
      return [bus,...prev];
    });
  },[lang, showToast]);

  const isSaved = useCallback((bus) => {
    const key=bus._id||`${bus.displayTag}_${bus.departureTime}`;
    return saved.some(r=>(r._id||`${r.displayTag}_${r.departureTime}`)===key);
  },[saved]);

  /* filter */
  const filteredBuses = useMemo(()=>{
    if(!buses.length) return [];
    const cur=toHHMM(), mins=toTotalMins();
    switch(filter){
      case"now":    return buses.filter(b=>b.departureTime>=cur);
      case"next30": return buses.filter(b=>{ const [h,m]=b.departureTime.split(":").map(Number); const d=h*60+m; return d>=mins&&d<=mins+30; });
      case"morning":return buses.filter(b=>b.departureTime<"12:00");
      case"evening":return buses.filter(b=>b.departureTime>="16:00");
      case"last":   return buses.length?[buses[buses.length-1]]:[];
      default:      return buses;
    }
  // eslint-disable-next-line
  },[buses,filter,tick]);

  const nextBus = useMemo(()=>{
    if(!buses.length) return null;
    const cur=toHHMM();
    return buses.find(b=>b.departureTime>=cur)||buses[0];
  // eslint-disable-next-line
  },[buses,tick]);

  /* ── BUS CARD ─────────────────────────────── */
  const BusCard = useCallback(({bus,i,showSave=true})=>{
    const cd=busCountdown(bus,lang);
    const isNext=nextBus&&(bus._id||`${bus.displayTag}_${bus.departureTime}`)===(nextBus._id||`${nextBus.displayTag}_${nextBus.departureTime}`);
    const [g1,g2]=CARD_GRADS[i%CARD_GRADS.length];
    return (
      <div className={`eb-card${isNext?" eb-card--next":""}`} style={{"--g1":g1,"--g2":g2,"--delay":`${i*0.05}s`}}>
        {isNext&&<div className="eb-next-tag"><Zap size={9}/>Next</div>}
        <div className="eb-card-badge" style={{background:`linear-gradient(145deg,${g1},${g2})`}}>
          {bus.displayTag}
        </div>
        <div className="eb-card-body">
          <div className="eb-card-dest">{translatePlace(bus.destination)}</div>
          <div className="eb-card-meta">
            <span><Clock3 size={11}/>{t.dep} <b>{fmtTime(bus.departureTime)}</b></span>
            {bus.arrivalTime&&<span>{t.arr} {fmtTime(bus.arrivalTime)}</span>}
          </div>
          <div className="eb-card-from">
            <MapPin size={10}/>{translatePlace(bus.source)}
          </div>
        </div>
        <div className="eb-card-right">
          <span className={`eb-op-tag ${bus.operatorType==="government"?"govt":"pvt"}`}>
            {bus.operatorType==="government"?t.govt:t.pvt}
          </span>
          <span className={`eb-cd eb-cd--${cd.state}`}>{cd.label}</span>
          {showSave&&(
            <button className={`eb-star${isSaved(bus)?" active":""}`} onClick={()=>toggleSave(bus)} aria-label="Save">
              <Star size={13} fill={isSaved(bus)?"currentColor":"none"}/>
            </button>
          )}
        </div>
      </div>
    );
  // eslint-disable-next-line
  },[lang,tick,nextBus,translatePlace,isSaved,toggleSave,t]);

  /* ── TABS ─────────────────────────────────── */

  const HomeTab = () => (
    <>
      {/* filters */}
      <div className="eb-filters">
        {FILTERS.map(({id})=>(
          <button key={id} className={`eb-chip${filter===id?" active":""}`} onClick={()=>setFilter(id)}>
            {t[id]}
          </button>
        ))}
      </div>

      {/* next bus banner */}
      {nextBus&&(
        <div className="eb-banner">
          <div className="eb-banner-l">
            <div className="eb-banner-icon"><Zap size={14}/></div>
            <div>
              <div className="eb-banner-label">{t.nextBus}</div>
              <div className="eb-banner-val">{nextBus.displayTag} · {fmtTime(nextBus.departureTime)}</div>
            </div>
          </div>
          <div className={`eb-eta eb-eta--${busCountdown(nextBus,lang).state}`}>
            {busCountdown(nextBus,lang).label}
          </div>
        </div>
      )}

      {/* count */}
      {searchDone&&(
        <div className="eb-count-row">
          <Bus size={13}/>
          <span>{filteredBuses.length} {t.found}</span>
        </div>
      )}

      {/* results or landing */}
      {!searchDone ? (
        <div className="eb-landing">
          <div className="eb-landing-icon"><Bus size={36} strokeWidth={1.2}/></div>
          <p>{t.tapToSearch}</p>
          <div className="eb-popular-label">{t.popularRoutes}</div>
          <div className="eb-popular-grid">
            {stops.filter(s=>s.en!==from).slice(0,4).map((s,i)=>(
              <button key={i} className="eb-popular-btn" onClick={()=>{
                setTo(lang==="ta"?s.ta:s.en);
                setTimeout(()=>searchBus(s.en),50);
              }}>
                <MapPin size={12}/>{lang==="ta"?s.ta:s.en}
              </button>
            ))}
          </div>
        </div>
      ) : filteredBuses.length===0 ? (
        <div className="eb-empty"><Wind size={36} strokeWidth={1.2}/><p>{t.noResult}</p><span>{t.tryOther}</span></div>
      ) : (
        <div className="eb-list">
          {filteredBuses.map((bus,i)=><BusCard key={i} bus={bus} i={i}/>)}
        </div>
      )}
    </>
  );

  const SavedTab = () => (
    <div className="eb-tab-content">
      {saved.length===0 ? (
        <div className="eb-empty"><Star size={36} strokeWidth={1.2}/><p>{t.savedEmpty}</p><span>{t.savedSub}</span></div>
      ) : (
        <>
          <div className="eb-tab-header">
            <span>{saved.length} {lang==="ta"?"சேமிக்கப்பட்டவை":"saved"}</span>
            <button className="eb-text-btn" onClick={()=>{setSaved([]);showToast(lang==="ta"?"அனைத்தும் நீக்கப்பட்டது":"Cleared","info");}}>
              <Trash2 size={13}/>{t.clearAll}
            </button>
          </div>
          <div className="eb-list">
            {saved.map((bus,i)=><BusCard key={i} bus={bus} i={i}/>)}
          </div>
        </>
      )}
    </div>
  );

  const RecentTab = () => (
    <div className="eb-tab-content">
      {recent.length===0 ? (
        <div className="eb-empty"><History size={36} strokeWidth={1.2}/><p>{t.recentEmpty}</p><span>{t.recentSub}</span></div>
      ) : (
        <>
          <div className="eb-tab-header">
            <span>{recent.length} {lang==="ta"?"தேடல்கள்":"searches"}</span>
            <button className="eb-text-btn" onClick={()=>{setRecent([]);showToast(lang==="ta"?"நீக்கப்பட்டது":"Cleared","info");}}>
              <Trash2 size={13}/>{t.clearAll}
            </button>
          </div>
          <div className="eb-recent-list">
            {recent.map((r,i)=>(
              <div key={i} className="eb-recent-card" onClick={()=>{
                setFrom(r.from); setTo(r.displayTo||r.to); setActiveTab("home");
                setTimeout(()=>searchBus(r.to),80);
              }}>
                <div className="eb-recent-icon"><TrendingUp size={14}/></div>
                <div className="eb-recent-body">
                  <div className="eb-recent-route">
                    <span>{lang==="ta"?(stops.find(s=>s.en===r.from)?.ta||r.from):r.from}</span>
                    <ChevronRight size={12}/>
                    <span>{r.displayTo||r.to}</span>
                  </div>
                  <div className="eb-recent-meta">
                    {r.count} {t.found} · {new Date(r.ts).toLocaleDateString(lang==="ta"?"ta-IN":"en-IN",{day:"numeric",month:"short"})}
                  </div>
                </div>
                <button className="eb-recent-del" onClick={e=>{
                  e.stopPropagation();
                  setRecent(prev=>prev.filter((_,j)=>j!==i));
                }}>
                  <X size={13}/>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const AlertsTab = () => (
    <div className="eb-tab-content">
      <div className="eb-empty">
        <Bell size={36} strokeWidth={1.2}/>
        <p>{t.alertsEmpty}</p>
        <span>{t.alertsSub}</span>
        <div className="eb-coming-soon">Coming Soon</div>
      </div>
    </div>
  );

  const ProfileTab = () => (
    <div className="eb-tab-content">
      <div className="eb-profile">
        <div className="eb-profile-avatar"><User size={32}/></div>
        <h2>{t.profileTitle}</h2>
        <p>{t.profileSub}</p>
        <div className="eb-profile-stats">
          <div className="eb-stat"><b>{saved.length}</b><span>{lang==="ta"?"சேமிப்பு":"Saved"}</span></div>
          <div className="eb-stat-div"/>
          <div className="eb-stat"><b>{recent.length}</b><span>{lang==="ta"?"தேடல்":"Searches"}</span></div>
        </div>
        <button className="eb-signin-btn">
          {lang==="ta"?"உள்நுழை / பதிவு":"Sign In / Register"}
        </button>
      </div>
    </div>
  );

  const TAB_VIEWS = { home:<HomeTab/>, saved:<SavedTab/>, recent:<RecentTab/>, alerts:<AlertsTab/>, profile:<ProfileTab/> };

  /* ── RENDER ──────────────────────────────── */
  return (
    <div className="eb-app">

      {/* TOAST */}
      {toast&&(
        <div className={`eb-toast eb-toast--${toast.type}`}>
          {toast.type==="success"&&<CheckCircle2 size={14}/>}
          {toast.type==="error"&&<AlertCircle size={14}/>}
          {toast.type==="warn"&&<AlertCircle size={14}/>}
          {toast.msg}
        </div>
      )}

      {/* HERO */}
      <header className="eb-hero">
        <div className="eb-hero-top">
          <div className="eb-brand">
            <div className="eb-logo"><Bus size={20}/></div>
            <div className="eb-brand-text">
              <h1>{t.title}</h1>
              <p>{t.sub}</p>
            </div>
          </div>
          <select className="eb-lang" value={lang} onChange={e=>setLang(e.target.value)}>
            <option value="ta">தமிழ்</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="eb-hero-meta">
          <div className="eb-hpill"><MapPin size={12}/>{translatePlace(from)}</div>
          <div className="eb-hpill"><Clock size={12}/>{clockStr}</div>
          <div className="eb-hpill eb-hpill--live"><span className="eb-live-dot"/>Live</div>
        </div>
      </header>

      {/* SEARCH */}
      <section className="eb-search">
        <div className="eb-search-card">

          <div className={`eb-field${fromFocus?" eb-field--focus":""}`}>
            <MapPin size={16} className="eb-field-icon eb-field-icon--from"/>
            <input
              value={translatePlace(from)}
              onChange={e=>setFrom(toEnglish(e.target.value))}
              placeholder={t.from}
              onFocus={()=>setFromFocus(true)}
              onBlur={()=>setFromFocus(false)}
            />
          </div>

          <div className="eb-swap-row">
            <div className="eb-divider"/>
            <button className="eb-swap" onClick={reverseRoute} title="Swap">
              <ArrowUpDown size={15}/>
            </button>
            <div className="eb-divider"/>
          </div>

          <div className={`eb-field${toFocus?" eb-field--focus":""}`}>
            <Navigation size={16} className="eb-field-icon eb-field-icon--to"/>
            <input
              ref={toInputRef}
              value={to}
              onChange={e=>setTo(e.target.value)}
              placeholder={t.to}
              onFocus={()=>setToFocus(true)}
              onBlur={()=>setTimeout(()=>setToFocus(false),150)}
              onKeyDown={e=>e.key==="Enter"&&searchBus()}
            />
            {to&&(
              <button className="eb-clear" onClick={()=>{setTo("");setSuggestions([]);toInputRef.current?.focus();}}>
                <X size={14}/>
              </button>
            )}
          </div>

          {/* suggestions */}
          {suggestions.length>0&&(
            <div className="eb-suggest">
              {suggestions.map((s,i)=>(
                <div key={i} className="eb-suggest-item" onMouseDown={()=>{setTo(lang==="ta"?s.ta:s.en);setSuggestions([]);}}>
                  <MapPin size={12} className="eb-suggest-icon"/>
                  <span>{lang==="ta"?s.ta:s.en}</span>
                  <ChevronRight size={12} className="eb-suggest-arrow"/>
                </div>
              ))}
            </div>
          )}

          {/* action row */}
          <div className="eb-actions">
            <button className="eb-search-btn" onClick={()=>searchBus()} disabled={loading}>
              {loading?<><span className="eb-spin"/>{t.searching}</>:<><Search size={16}/>{t.search}</>}
            </button>
            <button className={`eb-icon-btn${isListening?" eb-icon-btn--rec":""}`} onClick={startVoice} title="Voice">
              <Mic size={16}/>
            </button>
            <button className={`eb-icon-btn${locating?" eb-icon-btn--loc":""}`} onClick={useMyLocation} title={t.myLoc}>
              <LocateFixed size={16}/>
            </button>
          </div>

        </div>
      </section>

      {/* TAB CONTENT */}
      <div className="eb-content">
        {TAB_VIEWS[activeTab]}
      </div>

      {/* DOCK */}
      <nav className="eb-dock">
        {TABS.map(({id,Icon,labelEn,labelTa})=>(
          <button key={id} className={`eb-dock-btn${activeTab===id?" active":""}`} onClick={()=>setActiveTab(id)}>
            <div className="eb-dock-icon-wrap">
              <Icon size={18}/>
              {id==="saved"&&saved.length>0&&<span className="eb-badge">{saved.length>9?"9+":saved.length}</span>}
              {id==="recent"&&recent.length>0&&<span className="eb-badge">{recent.length>9?"9+":recent.length}</span>}
            </div>
            <span>{lang==="ta"?labelTa:labelEn}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
