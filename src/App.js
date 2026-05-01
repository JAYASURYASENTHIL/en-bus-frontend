import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

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
  }, [to,stops]);

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

  return (
    <div className="app">

      <div className="hero">

        <div className="heroTop">

          <div>
            <h1>
              🚌 {t.title}
            </h1>

            <p>
              {t.subtitle}
            </p>
          </div>

          <select
            value={lang}
            onChange={(e) =>
              setLang(
                e.target.value
              )
            }
          >
            <option value="ta">
              தமிழ்
            </option>

            <option value="en">
              English
            </option>
          </select>

        </div>

      </div>

      <div className="searchCard">

        <input
          value={translatePlace(
            from
          )}
          onChange={(e) =>
            setFrom(
              toEnglish(
                e.target.value
              )
            )
          }
          placeholder={t.from}
        />

        <button
          className="swap"
          onClick={
            reverseRoute
          }
        >
          ↕
        </button>

        <input
          value={to}
          onChange={(e) =>
            setTo(
              e.target.value
            )
          }
          placeholder={t.to}
          onKeyDown={(e) =>
            e.key ===
              "Enter" &&
            searchBus()
          }
        />

        {suggestions.length >
          0 && (
          <div className="suggestions">
            {suggestions.map(
              (
                s,
                i
              ) => (
                <div
                  key={
                    i
                  }
                  onClick={() => {
                    setTo(
                      lang ===
                        "ta"
                        ? s.ta
                        : s.en
                    );
                    setSuggestions(
                      []
                    );
                  }}
                >
                  {lang ===
                  "ta"
                    ? s.ta
                    : s.en}
                </div>
              )
            )}
          </div>
        )}

        <div className="actionRow">

          <button
            className="mainBtn"
            onClick={
              searchBus
            }
          >
            {loading
              ? t.searching
              : t.search}
          </button>

          <button
            className="mini purple"
            onClick={
              startVoice
            }
          >
            {isListening
              ? "■"
              : "🎤"}
          </button>

          <button
            className="mini teal"
            onClick={
              useMyLocation
            }
          >
            {locating
              ? "..."
              : "📍"}
          </button>

        </div>

      </div>

      <div className="filters">

        {[
          "all",
          "now",
          "next30",
          "morning",
          "evening",
          "last"
        ].map(
          (
            item
          ) => (
            <button
              key={
                item
              }
              className={
                filter ===
                item
                  ? "activeFilter"
                  : ""
              }
              onClick={() =>
                setFilter(
                  item
                )
              }
            >
              {
                t[
                  item
                ]
              }
            </button>
          )
        )}

      </div>

      {nextBus && (
        <div className="next">
          {t.nextBus}:{" "}
          {
            nextBus.displayTag
          }{" "}
          •{" "}
          {
            nextBus.departureTime
          }{" "}
          (
          {countdown()}
          )
        </div>
      )}

      <div className="count">
        {
          filteredBuses.length
        }{" "}
        {t.found}
      </div>

      {filteredBuses.map(
        (
          bus,
          i
        ) => (
          <div
            className={`busCard ${
              nextBus &&
              bus._id ===
                nextBus._id
                ? "highlight"
                : ""
            }`}
            key={i}
          >
            <div className="leftTag">
              {
                bus.displayTag
              }
            </div>

            <div className="mid">

              <div className="dest">
                {translatePlace(
                  bus.destination
                )}
              </div>

              <div className="detail">
                {t.arr}:{" "}
                {bus.arrivalTime ||
                  "--"}{" "}
                • {t.dep}:{" "}
                {
                  bus.departureTime
                }
              </div>

              <div className="detail">
                {t.source}:{" "}
                {translatePlace(
                  bus.source
                )}
              </div>

            </div>

            <div
              className={
                bus.operatorType ===
                "government"
                  ? "badge green"
                  : "badge gold"
              }
            >
              {bus.operatorType ===
              "government"
                ? t.govt
                : t.pvt}
            </div>

          </div>
        )
      )}

    </div>
  );
}