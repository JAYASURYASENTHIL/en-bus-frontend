import React, {
  useEffect,
  useState,
  useMemo
} from "react";
// ADD THIS AT TOP OF App.js under React import

import {
  MapPin,
  Clock3,
  ArrowUpDown,
  Navigation,
  Search,
  Mic,
  LocateFixed,
  Home,
  Star,
  History,
  Bell,
  User
} from "lucide-react";
import axios from "axios";
import "./App.css";
const stops = [
    {
      en: "Erode Bus Stand",
      ta: "ஈரோடு பேருந்து நிலையம்",
      lat: 11.3410,
      lon: 77.7172
    },
    {
      en: "Perundurai",
      ta: "பெருந்துறை",
      lat: 11.2756,
      lon: 77.5874
    },
    {
      en: "Bhavani",
      ta: "பவானி",
      lat: 11.4450,
      lon: 77.6820
    },
    {
      en: "Chennimalai",
      ta: "சென்னிமலை",
      lat: 11.1639,
      lon: 77.6034
    },
    {
      en: "Ingur",
      ta: "இங்கூர்",
      lat: 11.2418,
      lon: 77.6892
    },
    {
      en: "Thindal",
      ta: "திண்டல்",
      lat: 11.3101,
      lon: 77.6761
    }
  ];

export default function App() {
  const API =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  const [lang, setLang] = useState("ta");
  const [from, setFrom] = useState("Erode Bus Stand");
  const [to, setTo] = useState("");
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [suggestions, setSuggestions] = useState([]);
  const [locating, setLocating] = useState(false);

  const [isListening, setIsListening] =
    useState(false);

  const [recognitionObj, setRecognitionObj] =
    useState(null);

  const text = {
    en: {
      title: "En Bus",
      subtitle: "Smart Bus Finder",
      from: "From",
      to: "Destination",
      search: "Search",
      searching: "Searching...",
      all: "ALL",
      now: "UPCOMING",
      next30: "30 MIN",
      morning: "MORNING",
      evening: "EVENING",
      last: "LAST",
      nextBus: "Next Bus",
      govt: "Govt",
      pvt: "Pvt",
      arr: "Arr",
      dep: "Dep",
      source: "From",
      found: "buses found",
      myLoc: "My Location"
    },

    ta: {
      title: "என் பஸ்",
      subtitle: "ஸ்மார்ட் பேருந்து தேடல்",
      from: "எங்கிருந்து",
      to: "செல்லும் இடம்",
      search: "தேடு",
      searching: "தேடுகிறது...",
      all: "அனைத்தும்",
      now: "வரவிருக்கும்",
      next30: "30 நிமிடம்",
      morning: "காலை",
      evening: "மாலை",
      last: "கடைசி",
      nextBus: "அடுத்த பேருந்து",
      govt: "அரசு",
      pvt: "தனி",
      arr: "வரு",
      dep: "புற",
      source: "இடம்",
      found: "பேருந்துகள்",
      myLoc: "என் இடம்"
    }
  };

  const t = text[lang];

  

  const translatePlace = (name) => {
    const found = stops.find(
      (s) =>
        s.en.toLowerCase() ===
          String(name).toLowerCase() ||
        s.ta === name
    );

    if (!found) return name;

    return lang === "ta"
      ? found.ta
      : found.en;
  };

  const toEnglish = (name) => {
    const found = stops.find(
      (s) =>
        s.en.toLowerCase() ===
          String(name).toLowerCase() ||
        s.ta === name
    );

    return found ? found.en : name;
  };

  useEffect(() => {
    if (!to.trim()) {
      setSuggestions([]);
      return;
    }

    const q = to.toLowerCase();

    const list = stops.filter(
      (s) =>
        s.en.toLowerCase().includes(q) ||
        s.ta.includes(to)
    );

    setSuggestions(list.slice(0, 6));
  }, [to]);

  const searchBus = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/api/buses/search?destination=${toEnglish(
          to.trim()
        )}`
      );

      const sorted = [...res.data].sort(
        (a, b) =>
          a.departureTime.localeCompare(
            b.departureTime
          )
      );

      setBuses(sorted);
      setFilter("all");
    } catch {
      alert("Server Error");
    } finally {
      setLoading(false);
    }
  };

  const reverseRoute = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const distance = (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {
    const p = 0.017453292519943295;
    const a =
      0.5 -
      Math.cos((lat2 - lat1) * p) / 2 +
      Math.cos(lat1 * p) *
        Math.cos(lat2 * p) *
        (1 -
          Math.cos((lon2 - lon1) * p)) /
        2;

    return (
      12742 *
      Math.asin(Math.sqrt(a))
    );
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Location unsupported");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        let nearest = stops[0];
        let min = Infinity;

        stops.forEach((stop) => {
          const d = distance(
            lat,
            lon,
            stop.lat,
            stop.lon
          );

          if (d < min) {
            min = d;
            nearest = stop;
          }
        });

        setFrom(nearest.en);
        setLocating(false);
      },
      () => {
        alert("Location failed");
        setLocating(false);
      }
    );
  };

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice unsupported");
      return;
    }

    if (isListening && recognitionObj) {
      recognitionObj.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();

    rec.lang =
      lang === "ta"
        ? "ta-IN"
        : "en-IN";

    rec.onresult = (e) => {
      let speech =
        e.results[0][0].transcript.trim();

      const q =
        speech.toLowerCase();

      if (
        q.includes("perun") ||
        q.includes("pirun")
      ) speech = "Perundurai";

      else if (
        q.includes("ingur") ||
        q.includes("ingoor")
      ) speech = "Ingur";

      else if (
        q.includes("bhavani") ||
        q.includes("pavani")
      ) speech = "Bhavani";

      else if (
        q.includes("chenni") ||
        q.includes("malai")
      ) speech = "Chennimalai";

      else if (
        q.includes("thindal")
      ) speech = "Thindal";

      setTo(speech);
    };

    rec.onend = () =>
      setIsListening(false);

    rec.start();

    setRecognitionObj(rec);
    setIsListening(true);
  };

  const filteredBuses = useMemo(() => {
    if (!buses.length) return [];

    const now = new Date();

    const current =
      String(now.getHours()).padStart(
        2,
        "0"
      ) +
      ":" +
      String(
        now.getMinutes()
      ).padStart(2, "0");

    if (filter === "now")
      return buses.filter(
        (b) =>
          b.departureTime >= current
      );

    if (filter === "next30") {
      const mins =
        now.getHours() * 60 +
        now.getMinutes();

      return buses.filter((b) => {
        const [h, m] =
          b.departureTime
            .split(":")
            .map(Number);

        const dep =
          h * 60 + m;

        return (
          dep >= mins &&
          dep <= mins + 30
        );
      });
    }

    if (filter === "morning")
      return buses.filter(
        (b) =>
          b.departureTime <
          "12:00"
      );

    if (filter === "evening")
      return buses.filter(
        (b) =>
          b.departureTime >=
          "16:00"
      );

    if (filter === "last")
      return buses.length
        ? [buses[buses.length - 1]]
        : [];

    return buses;
  }, [buses, filter]);

  const nextBus = useMemo(() => {
    if (!buses.length) return null;

    const now = new Date();

    const current =
      String(now.getHours()).padStart(
        2,
        "0"
      ) +
      ":" +
      String(
        now.getMinutes()
      ).padStart(2, "0");

    return (
      buses.find(
        (b) =>
          b.departureTime >= current
      ) || buses[0]
    );
  }, [buses]);

  const countdown = () => {
    if (!nextBus) return "";

    const now = new Date();

    const minsNow =
      now.getHours() * 60 +
      now.getMinutes();

    const [h, m] =
      nextBus.departureTime
        .split(":")
        .map(Number);

    const dep =
      h * 60 + m;

    let diff =
      dep - minsNow;

    if (diff < 0)
      diff += 1440;

    return `${diff} min`;
  };

//   return (
//     <div className="app">

//       <div className="hero">

//         <div className="heroTop">

//           <div>
//             <h1>
//               🚌 {t.title}
//             </h1>

//             <p>
//               {t.subtitle}
//             </p>
//           </div>

//           <select
//             value={lang}
//             onChange={(e) =>
//               setLang(
//                 e.target.value
//               )
//             }
//           >
//             <option value="ta">
//               தமிழ்
//             </option>

//             <option value="en">
//               English
//             </option>
//           </select>

//         </div>

//       </div>

//       <div className="searchCard">

//         <input
//           value={translatePlace(
//             from
//           )}
//           onChange={(e) =>
//             setFrom(
//               toEnglish(
//                 e.target.value
//               )
//             )
//           }
//           placeholder={t.from}
//         />

//         <button
//           className="swap"
//           onClick={
//             reverseRoute
//           }
//         >
//           ↕
//         </button>

//         <input
//           value={to}
//           onChange={(e) =>
//             setTo(
//               e.target.value
//             )
//           }
//           placeholder={t.to}
//           onKeyDown={(e) =>
//             e.key ===
//               "Enter" &&
//             searchBus()
//           }
//         />

//         {suggestions.length >
//           0 && (
//           <div className="suggestions">
//             {suggestions.map(
//               (
//                 s,
//                 i
//               ) => (
//                 <div
//                   key={
//                     i
//                   }
//                   onClick={() => {
//                     setTo(
//                       lang ===
//                         "ta"
//                         ? s.ta
//                         : s.en
//                     );
//                     setSuggestions(
//                       []
//                     );
//                   }}
//                 >
//                   {lang ===
//                   "ta"
//                     ? s.ta
//                     : s.en}
//                 </div>
//               )
//             )}
//           </div>
//         )}

//         <div className="actionRow">

//           <button
//             className="mainBtn"
//             onClick={
//               searchBus
//             }
//           >
//             {loading
//               ? t.searching
//               : t.search}
//           </button>

//           <button
//             className="mini purple"
//             onClick={
//               startVoice
//             }
//           >
//             {isListening
//               ? "■"
//               : "🎤"}
//           </button>

//           <button
//             className="mini teal"
//             onClick={
//               useMyLocation
//             }
//           >
//             {locating
//               ? "..."
//               : "📍"}
//           </button>

//         </div>

//       </div>

//       <div className="filters">

//         {[
//           "all",
//           "now",
//           "next30",
//           "morning",
//           "evening",
//           "last"
//         ].map(
//           (
//             item
//           ) => (
//             <button
//               key={
//                 item
//               }
//               className={
//                 filter ===
//                 item
//                   ? "activeFilter"
//                   : ""
//               }
//               onClick={() =>
//                 setFilter(
//                   item
//                 )
//               }
//             >
//               {
//                 t[
//                   item
//                 ]
//               }
//             </button>
//           )
//         )}

//       </div>

//       {nextBus && (
//         <div className="next">
//           {t.nextBus}:{" "}
//           {
//             nextBus.displayTag
//           }{" "}
//           •{" "}
//           {
//             nextBus.departureTime
//           }{" "}
//           (
//           {countdown()}
//           )
//         </div>
//       )}

//       <div className="count">
//         {
//           filteredBuses.length
//         }{" "}
//         {t.found}
//       </div>

//       {filteredBuses.map(
//         (
//           bus,
//           i
//         ) => (
//           <div
//             className={`busCard ${
//               nextBus &&
//               bus._id ===
//                 nextBus._id
//                 ? "highlight"
//                 : ""
//             }`}
//             key={i}
//           >
//             <div className="leftTag">
//               {
//                 bus.displayTag
//               }
//             </div>

//             <div className="mid">

//               <div className="dest">
//                 {translatePlace(
//                   bus.destination
//                 )}
//               </div>

//               <div className="detail">
//                 {t.arr}:{" "}
//                 {bus.arrivalTime ||
//                   "--"}{" "}
//                 • {t.dep}:{" "}
//                 {
//                   bus.departureTime
//                 }
//               </div>

//               <div className="detail">
//                 {t.source}:{" "}
//                 {translatePlace(
//                   bus.source
//                 )}
//               </div>

//             </div>

//             <div
//               className={
//                 bus.operatorType ===
//                 "government"
//                   ? "badge green"
//                   : "badge gold"
//               }
//             >
//               {bus.operatorType ===
//               "government"
//                 ? t.govt
//                 : t.pvt}
//             </div>

//           </div>
//         )
//       )}
//       {/* ADD THIS AT VERY BOTTOM of your App.js JSX, just before final closing </div> */}

// <div className="bottom-nav">
//   <button className="nav-item active">
//     <span>⌂</span>
//     <small>{lang === "ta" ? "முகப்பு" : "Home"}</small>
//   </button>

//   <button className="nav-item">
//     <span>★</span>
//     <small>{lang === "ta" ? "பிடித்தவை" : "Saved"}</small>
//   </button>

//   <button className="nav-item">
//     <span>🕘</span>
//     <small>{lang === "ta" ? "தேடல்கள்" : "Recent"}</small>
//   </button>

//   <button className="nav-item">
//     <span>🔔</span>
//     <small>{lang === "ta" ? "அறிவிப்புகள்" : "Alerts"}</small>
//   </button>

//   <button className="nav-item">
//     <span>◯</span>
//     <small>{lang === "ta" ? "எனது" : "Profile"}</small>
//   </button>
// </div>

//     </div>
//   );
// }
/* REPLACE ONLY YOUR return (...) BLOCK WITH THIS */

// return (

//   <div className="app shell">

//     {/* HERO */}
//     <header className="heroV3">

//       <div className="heroTopBar">

//         <div className="brandZone">

//           <div className="brandSquare">
//             <Bus size={28} />
//           </div>

//           <div>
//             <h1>{t.title}</h1>
//             <p>{t.subtitle}</p>
//           </div>

//         </div>

//         <select
//           className="langSelectV3"
//           value={lang}
//           onChange={(e) =>
//             setLang(e.target.value)
//           }
//         >
//           <option value="ta">
//             தமிழ்
//           </option>
//           <option value="en">
//             English
//           </option>
//         </select>

//       </div>

//       <div className="heroStats">

//         <div className="heroChip">
//           <MapPin size={14} />
//           <span>
//             {translatePlace(from)}
//           </span>
//         </div>

//         <div className="heroChip">
//           <Clock3 size={14} />
//           <span>
//             {new Date().toLocaleTimeString(
//               [],
//               {
//                 hour: "2-digit",
//                 minute:
//                   "2-digit"
//               }
//             )}
//           </span>
//         </div>

//         <div className="heroChip live">
//           <span className="pulse"></span>
//           <span>Live</span>
//         </div>

//       </div>

//     </header>

//     {/* SEARCH MODULE */}
//     <section className="searchModule">

//       <div className="fieldCard">

//         <div className="fieldRow">
//           <MapPin size={18} />
//           <input
//             value={translatePlace(from)}
//             onChange={(e) =>
//               setFrom(
//                 toEnglish(
//                   e.target.value
//                 )
//               )
//             }
//             placeholder={t.from}
//           />
//         </div>

//         <button
//           className="swapCenter"
//           onClick={reverseRoute}
//         >
//           <ArrowUpDown size={18} />
//         </button>

//         <div className="fieldRow">
//           <Navigation size={18} />
//           <input
//             value={to}
//             onChange={(e) =>
//               setTo(
//                 e.target.value
//               )
//             }
//             placeholder={t.to}
//             onKeyDown={(e) =>
//               e.key ===
//                 "Enter" &&
//               searchBus()
//             }
//           />
//         </div>

//         {suggestions.length >
//           0 && (
//           <div className="smartSuggest">
//             {suggestions.map(
//               (
//                 s,
//                 i
//               ) => (
//                 <div
//                   key={i}
//                   className="smartRow"
//                   onClick={() => {
//                     setTo(
//                       lang ===
//                         "ta"
//                         ? s.ta
//                         : s.en
//                     );
//                     setSuggestions(
//                       []
//                     );
//                   }}
//                 >
//                   <Search size={15} />
//                   <span>
//                     {lang ===
//                     "ta"
//                       ? s.ta
//                       : s.en}
//                   </span>
//                 </div>
//               )
//             )}
//           </div>
//         )}

//         <div className="actionGrid">

//           <button
//             className="ctaMain"
//             onClick={searchBus}
//           >
//             <Search size={18} />
//             <span>
//               {loading
//                 ? t.searching
//                 : t.search}
//             </span>
//           </button>

//           <button
//             className={`squareBtn ${
//               isListening
//                 ? "recording"
//                 : ""
//             }`}
//             onClick={startVoice}
//           >
//             <Mic size={18} />
//           </button>

//           <button
//             className="squareBtn"
//             onClick={
//               useMyLocation
//             }
//           >
//             {locating
//               ? "..."
//               : (
//                 <LocateFixed size={18} />
//               )}
//           </button>

//         </div>

//       </div>

//     </section>

//     {/* FILTERS */}
//     <section className="filterRail">

//       {[
//         "all",
//         "now",
//         "next30",
//         "morning",
//         "evening",
//         "last"
//       ].map(
//         (
//           item
//         ) => (
//           <button
//             key={item}
//             className={
//               filter ===
//               item
//                 ? "railChip active"
//                 : "railChip"
//             }
//             onClick={() =>
//               setFilter(
//                 item
//               )
//             }
//           >
//             {t[item]}
//           </button>
//         )
//       )}

//     </section>

//     {/* NEXT BUS */}
//     {nextBus && (
//       <section className="nextBanner">

//         <div className="nextInfo">
//           <Clock3 size={18} />
//           <div>
//             <small>
//               {t.nextBus}
//             </small>
//             <strong>
//               {
//                 nextBus.displayTag
//               } •{" "}
//               {
//                 nextBus.departureTime
//               }
//             </strong>
//           </div>
//         </div>

//         <div className="etaBadge">
//           {countdown()}
//         </div>

//       </section>
//     )}

//     <div className="foundLine">
//       {
//         filteredBuses.length
//       }{" "}
//       {t.found}
//     </div>

//     {/* RESULTS */}
//     <section className="stackCards">

//       {filteredBuses.map(
//         (
//           bus,
//           i
//         ) => (
//           <div
//             key={i}
//             className={`routeCard ${
//               nextBus &&
//               bus._id ===
//                 nextBus._id
//                 ? "topPick"
//                 : ""
//             }`}
//           >

//             <div className="routeCode">
//               {
//                 bus.displayTag
//               }
//             </div>

//             <div className="routeMain">

//               <h3>
//                 {translatePlace(
//                   bus.destination
//                 )}
//               </h3>

//               <p>
//                 {t.arr}:{" "}
//                 {bus.arrivalTime ||
//                   "--"}{" "}
//                 • {t.dep}:{" "}
//                 {
//                   bus.departureTime
//                 }
//               </p>

//               <p>
//                 {translatePlace(
//                   bus.source
//                 )}
//               </p>

//             </div>

//             <div className="routeSide">

//               <div
//                 className={
//                   bus.operatorType ===
//                   "government"
//                     ? "miniTag govt"
//                     : "miniTag pvt"
//                 }
//               >
//                 {bus.operatorType ===
//                 "government"
//                   ? t.govt
//                   : t.pvt}
//               </div>

//               <div className="timeMini">
//                 {nextBus &&
//                 bus._id ===
//                   nextBus._id
//                   ? countdown()
//                   : "--"}
//               </div>

//             </div>

//           </div>
//         )
//       )}

//     </section>

//     {/* DOCK */}
//     <nav className="dockV2">

//       <button className="dockBtn active">
//         <Home size={18} />
//         <span>
//           {lang === "ta"
//             ? "முகப்பு"
//             : "Home"}
//         </span>
//       </button>

//       <button className="dockBtn">
//         <Star size={18} />
//         <span>
//           {lang === "ta"
//             ? "சேமிப்பு"
//             : "Saved"}
//         </span>
//       </button>

//       <button className="dockBtn">
//         <History size={18} />
//         <span>
//           {lang === "ta"
//             ? "தேடல்"
//             : "Recent"}
//         </span>
//       </button>

//       <button className="dockBtn">
//         <Bell size={18} />
//         <span>
//           {lang === "ta"
//             ? "அறிவிப்பு"
//             : "Alerts"}
//         </span>
//       </button>

//       <button className="dockBtn">
//         <User size={18} />
//         <span>
//           {lang === "ta"
//             ? "எனது"
//             : "Profile"}
//         </span>
//       </button>

//     </nav>

//   </div>
// )};
/* REPLACE ONLY YOUR return (...) BLOCK IN App.js WITH THIS */

return (
  <div className="tos-app">

    <header className="tos-hero">

      <div className="tos-nav">

        <div className="tos-brand">

          <div className="tos-logo"></div>

          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>

        </div>

        <select
          className="tos-lang"
          value={lang}
          onChange={(e) =>
            setLang(e.target.value)
          }
        >
          <option value="ta">தமிழ்</option>
          <option value="en">English</option>
        </select>

      </div>

      <div className="tos-strip">

        <div className="tos-pill">
          <MapPin size={14}/>
          {translatePlace(from)}
        </div>

        <div className="tos-pill">
          <Clock3 size={14}/>
          {new Date().toLocaleTimeString([],{
            hour:"2-digit",
            minute:"2-digit"
          })}
        </div>

        <div className="tos-pill live">
          <span className="live-dot"></span>
          Live
        </div>

      </div>

    </header>

    <section className="tos-search">

      <div className="tos-card">

        <div className="tos-input">
          <MapPin size={18}/>
          <input
            value={translatePlace(from)}
            onChange={(e)=>
              setFrom(
                toEnglish(e.target.value)
              )
            }
            placeholder={t.from}
          />
        </div>

        <button
          className="tos-swap"
          onClick={reverseRoute}
        >
          <ArrowUpDown size={18}/>
        </button>

        <div className="tos-input">
          <Navigation size={18}/>
          <input
            value={to}
            onChange={(e)=>
              setTo(e.target.value)
            }
            placeholder={t.to}
            onKeyDown={(e)=>
              e.key==="Enter" &&
              searchBus()
            }
          />
        </div>

        {suggestions.length > 0 && (
          <div className="tos-suggest">
            {suggestions.map((s,i)=>(
              <div
                key={i}
                className="tos-suggest-row"
                onClick={()=>{
                  setTo(
                    lang==="ta"
                    ? s.ta
                    : s.en
                  );
                  setSuggestions([]);
                }}
              >
                <Search size={15}/>
                <span>
                  {lang==="ta" ? s.ta : s.en}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="tos-actions">

          <button
            className="tos-searchbtn"
            onClick={searchBus}
          >
            <Search size={18}/>
            {loading ? t.searching : t.search}
          </button>

          <button
            className="tos-mini"
            onClick={startVoice}
          >
            <Mic size={18}/>
          </button>

          <button
            className="tos-mini"
            onClick={useMyLocation}
          >
            <LocateFixed size={18}/>
          </button>

        </div>

      </div>

    </section>

    <section className="tos-filters">

      {[
        "all",
        "now",
        "next30",
        "morning",
        "evening",
        "last"
      ].map((item)=>(
        <button
          key={item}
          className={
            filter===item
            ? "tos-chip active"
            : "tos-chip"
          }
          onClick={()=>
            setFilter(item)
          }
        >
          {t[item]}
        </button>
      ))}

    </section>

    {nextBus && (
      <section className="tos-banner">

        <div>
          <small>{t.nextBus}</small>
          <strong>
            {nextBus.displayTag} • {nextBus.departureTime}
          </strong>
        </div>

        <div className="tos-eta">
          {countdown()}
        </div>

      </section>
    )}

    <div className="tos-count">
      {filteredBuses.length} {t.found}
    </div>

    <section className="tos-results">

      {filteredBuses.map((bus,i)=>(
        <div
          key={i}
          className="tos-route"
        >

          <div className="tos-code">
            {bus.displayTag}
          </div>

          <div className="tos-mid">

            <h3>
              {translatePlace(bus.destination)}
            </h3>

            <p>
              {t.arr}: {bus.arrivalTime || "--"} • {t.dep}: {bus.departureTime}
            </p>

            <p>
              {translatePlace(bus.source)}
            </p>

          </div>

          <div className="tos-side">

            <div className={
              bus.operatorType==="government"
              ? "tag govt"
              : "tag pvt"
            }>
              {bus.operatorType==="government" ? t.govt : t.pvt}
            </div>

            <div className="mini-eta">
              {countdown()}
            </div>

          </div>

        </div>
      ))}

    </section>

    <nav className="tos-dock">

      <button className="dock-item active">
        <Home size={18}/>
        <span>Home</span>
      </button>

      <button className="dock-item">
        <Star size={18}/>
        <span>Saved</span>
      </button>

      <button className="dock-item">
        <History size={18}/>
        <span>Recent</span>
      </button>

      <button className="dock-item">
        <Bell size={18}/>
        <span>Alerts</span>
      </button>

      <button className="dock-item">
        <User size={18}/>
        <span>Profile</span>
      </button>

    </nav>

  </div>
)};