import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud, CloudRain, Sun, CloudSnow, CloudLightning, CloudDrizzle, CloudFog,
  Wind, Droplets, Eye, Gauge, Sunrise, Sunset, Moon, MapPin, Loader2, Layers,
  Search as SearchIcon, X,
} from "lucide-react";
import { INDIA_STATES, searchIndia, nearestIndianCity, type FlatCity } from "@/lib/india-locations";

export const Route = createFileRoute("/_authenticated/weather")({
  component: WeatherPage,
});

// ---------------- Locations ----------------
type City = { name: string; lat: number; lon: number };
type State = { name: string; cities: City[] };
type Country = { name: string; states: State[] };

const LOCATIONS: Country[] = [
  {
    name: "India",
    states: [
      { name: "Tamil Nadu", cities: [
        { name: "Salem", lat: 11.6643, lon: 78.146 },
        { name: "Chennai", lat: 13.0827, lon: 80.2707 },
        { name: "Coimbatore", lat: 11.0168, lon: 76.9558 },
        { name: "Madurai", lat: 9.9252, lon: 78.1198 },
      ]},
      { name: "Karnataka", cities: [
        { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
        { name: "Mysuru", lat: 12.2958, lon: 76.6394 },
        { name: "Mangaluru", lat: 12.9141, lon: 74.856 },
      ]},
      { name: "Kerala", cities: [
        { name: "Kochi", lat: 9.9312, lon: 76.2673 },
        { name: "Thiruvananthapuram", lat: 8.5241, lon: 76.9366 },
        { name: "Kozhikode", lat: 11.2588, lon: 75.7804 },
      ]},
      { name: "Maharashtra", cities: [
        { name: "Mumbai", lat: 19.076, lon: 72.8777 },
        { name: "Pune", lat: 18.5204, lon: 73.8567 },
        { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
      ]},
      { name: "Delhi", cities: [{ name: "New Delhi", lat: 28.6139, lon: 77.209 }] },
      { name: "West Bengal", cities: [{ name: "Kolkata", lat: 22.5726, lon: 88.3639 }] },
      { name: "Telangana", cities: [{ name: "Hyderabad", lat: 17.385, lon: 78.4867 }] },
    ],
  },
  {
    name: "United States",
    states: [
      { name: "California", cities: [
        { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
        { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
      ]},
      { name: "New York", cities: [{ name: "New York City", lat: 40.7128, lon: -74.006 }] },
    ],
  },
  {
    name: "United Kingdom",
    states: [{ name: "England", cities: [{ name: "London", lat: 51.5074, lon: -0.1278 }] }],
  },
  {
    name: "Japan",
    states: [{ name: "Tokyo", cities: [{ name: "Tokyo", lat: 35.6762, lon: 139.6503 }] }],
  },
  {
    name: "United Arab Emirates",
    states: [{ name: "Dubai", cities: [{ name: "Dubai", lat: 25.2048, lon: 55.2708 }] }],
  },
];

// ---------------- Weather code → icon/label ----------------
function codeInfo(code: number): { label: string; Icon: typeof Sun } {
  if (code === 0) return { label: "Clear sky", Icon: Sun };
  if ([1, 2].includes(code)) return { label: "Partly cloudy", Icon: Cloud };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if ([45, 48].includes(code)) return { label: "Fog", Icon: CloudFog };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", Icon: CloudDrizzle };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain", Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", Icon: CloudSnow };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Cloudy", Icon: Cloud };
}

function aqiColor(aqi: number): { label: string; cls: string } {
  if (aqi <= 50) return { label: "Good", cls: "text-emerald-400 bg-emerald-400/10" };
  if (aqi <= 100) return { label: "Moderate", cls: "text-yellow-300 bg-yellow-300/10" };
  if (aqi <= 150) return { label: "Unhealthy (SG)", cls: "text-orange-400 bg-orange-400/10" };
  if (aqi <= 200) return { label: "Unhealthy", cls: "text-red-400 bg-red-400/10" };
  if (aqi <= 300) return { label: "Very Unhealthy", cls: "text-purple-400 bg-purple-400/10" };
  return { label: "Hazardous", cls: "text-rose-500 bg-rose-500/10" };
}

function moonPhase(date = new Date()): string {
  // Simple algorithm — Conway's
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  let r = y % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + (m < 3 ? m + 2 : m) + d;
  if (m < 3) r += 2;
  r -= y < 2000 ? 4 : 8.3;
  r = Math.floor(r + 0.5) % 30;
  const phase = (r + 30) % 30;
  if (phase < 2) return "🌑 New Moon";
  if (phase < 7) return "🌒 Waxing Crescent";
  if (phase < 9) return "🌓 First Quarter";
  if (phase < 14) return "🌔 Waxing Gibbous";
  if (phase < 16) return "🌕 Full Moon";
  if (phase < 21) return "🌖 Waning Gibbous";
  if (phase < 23) return "🌗 Last Quarter";
  return "🌘 Waning Crescent";
}

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    pressure_msl: number;
    surface_pressure: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    visibility: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
};

type AirData = {
  current: { us_aqi: number; pm2_5: number; pm10: number; ozone: number };
};

// ---------------- Component ----------------
function WeatherPage() {
  const [countryIdx, setCountryIdx] = useState(0);
  const [stateIdx, setStateIdx] = useState(0);
  const [cityIdx, setCityIdx] = useState(0);
  const [layer, setLayer] = useState<"satellite" | "clouds" | "rain" | "temp" | "wind">("clouds");
  const [data, setData] = useState<WeatherData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const country = LOCATIONS[countryIdx];
  const state = country.states[stateIdx] ?? country.states[0];
  const city = state.cities[cityIdx] ?? state.cities[0];

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setErr(null);
      try {
        const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,surface_pressure&hourly=temperature_2m,precipitation_probability,wind_speed_10m,visibility,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;
        const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm2_5,pm10,ozone&timezone=auto`;
        const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
        const w = (await wRes.json()) as WeatherData;
        const a = (await aRes.json()) as AirData;
        if (!cancelled) {
          setData(w);
          setAir(a);
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message || "Failed to load weather");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchAll();
    return () => { cancelled = true; };
  }, [city.lat, city.lon]);

  const next24 = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const idx = data.hourly.time.findIndex((t) => new Date(t).getTime() >= now.getTime());
    const start = Math.max(0, idx);
    return data.hourly.time.slice(start, start + 24).map((t, i) => ({
      time: t,
      temp: data.hourly.temperature_2m[start + i],
      pop: data.hourly.precipitation_probability[start + i] ?? 0,
      wind: data.hourly.wind_speed_10m[start + i] ?? 0,
    }));
  }, [data]);

  const currentInfo = data ? codeInfo(data.current.weather_code) : null;
  const CurrentIcon = currentInfo?.Icon ?? Cloud;

  // Windy embed map URL by layer
  const windyOverlay = layer === "satellite" ? "satellite" : layer === "rain" ? "rain" : layer === "temp" ? "temp" : layer === "wind" ? "wind" : "clouds";
  const mapSrc = `https://embed.windy.com/embed2.html?lat=${city.lat}&lon=${city.lon}&detailLat=${city.lat}&detailLon=${city.lon}&width=650&height=450&zoom=5&level=surface&overlay=${windyOverlay}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <main className="relative mx-auto max-w-md px-4 pb-32 pt-6 animate-fade-up">
      {/* Floating cloud decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-10 left-10 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl gradient-brand p-2"><Cloud className="h-4 w-4 text-white" /></div>
          <h1 className="text-xl font-bold tracking-tight">Weather</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs">
          <MapPin className="h-3 w-3 text-violet-400" />
          <span className="truncate max-w-[140px]">{city.name}</span>
        </div>
      </header>

      {/* Location selectors */}
      <section className="mb-5 grid grid-cols-3 gap-2">
        <Select label="Country" value={countryIdx} onChange={(v) => { setCountryIdx(v); setStateIdx(0); setCityIdx(0); }}
          options={LOCATIONS.map((c, i) => ({ value: i, label: c.name }))} />
        <Select label="State" value={stateIdx} onChange={(v) => { setStateIdx(v); setCityIdx(0); }}
          options={country.states.map((s, i) => ({ value: i, label: s.name }))} />
        <Select label="City" value={cityIdx} onChange={setCityIdx}
          options={state.cities.map((c, i) => ({ value: i, label: c.name }))} />
      </section>

      {loading && (
        <div className="rounded-3xl glass p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-400" />
          <p className="mt-3 text-sm text-muted-foreground">Loading weather…</p>
        </div>
      )}
      {err && <div className="rounded-2xl glass p-4 text-sm text-rose-300">{err}</div>}

      {data && currentInfo && (
        <>
          {/* HERO */}
          <section className="mb-5 relative overflow-hidden rounded-3xl glass-strong p-6 animate-card-enter">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/10" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{city.name}, {state.name}</div>
                  <div className="text-[11px] text-muted-foreground">{country.name}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-6xl font-extralight tracking-tighter gradient-text">
                      {Math.round(data.current.temperature_2m)}°
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium">{currentInfo.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Feels like {Math.round(data.current.apparent_temperature)}°
                  </div>
                </div>
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-2xl animate-pulse" />
                  <CurrentIcon className="relative h-24 w-24 text-violet-300 drop-shadow-[0_0_30px_rgba(167,139,250,0.5)]" strokeWidth={1.2} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Metric Icon={Droplets} label="Humidity" value={`${data.current.relative_humidity_2m}%`} />
                <Metric Icon={Wind} label="Wind" value={`${Math.round(data.current.wind_speed_10m)} km/h`} />
                <Metric Icon={Sun} label="UV" value={`${Math.round(data.hourly.uv_index?.[0] ?? 0)}`} />
                <Metric Icon={Gauge} label="Pressure" value={`${Math.round(data.current.pressure_msl)} hPa`} />
                <Metric Icon={Eye} label="Visibility" value={`${Math.round((data.hourly.visibility?.[0] ?? 0) / 1000)} km`} />
                <Metric Icon={Cloud} label="Code" value={`${data.current.weather_code}`} />
              </div>
            </div>
          </section>

          {/* MAP */}
          <section className="mb-5 rounded-3xl glass-strong p-3 overflow-hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Layers className="h-3.5 w-3.5 text-violet-400" />
                Live Map
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {(["satellite", "clouds", "rain", "temp", "wind"] as const).map((l) => (
                  <button key={l} onClick={() => setLayer(l)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition ${
                      layer === l ? "gradient-brand text-white" : "glass text-muted-foreground hover:text-foreground"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/5">
              <iframe key={layer + city.name} src={mapSrc} className="h-64 w-full" loading="lazy" title="Weather map" />
            </div>
          </section>

          {/* HOURLY */}
          <section className="mb-5">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next 24 hours</h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-none rounded-2xl glass p-3">
              {next24.map((h, i) => (
                <div key={i} className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-white/5 px-3 py-2 min-w-[64px]">
                  <span className="text-[10px] text-muted-foreground">
                    {i === 0 ? "Now" : new Date(h.time).toLocaleTimeString([], { hour: "numeric" })}
                  </span>
                  <span className="text-sm font-semibold">{Math.round(h.temp)}°</span>
                  <span className="text-[10px] text-blue-300">{h.pop}%</span>
                  <span className="text-[10px] text-muted-foreground">{Math.round(h.wind)}km/h</span>
                </div>
              ))}
            </div>
          </section>

          {/* DAILY FORECAST */}
          <section className="mb-5 rounded-3xl glass p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">7-day forecast</h2>
            <div className="space-y-1.5">
              {data.daily.time.map((day, i) => {
                const info = codeInfo(data.daily.weather_code[i]);
                const Icon = info.Icon;
                const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(day).toLocaleDateString([], { weekday: "short" });
                return (
                  <div key={day} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5">
                    <span className="w-16 text-sm font-medium">{label}</span>
                    <Icon className="h-5 w-5 text-violet-300" strokeWidth={1.5} />
                    <span className="flex-1 text-xs text-blue-300">💧 {data.daily.precipitation_probability_max[i] ?? 0}%</span>
                    <span className="text-xs text-muted-foreground">{Math.round(data.daily.temperature_2m_min[i])}°</span>
                    <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-400/40 via-violet-400/60 to-orange-400/60" />
                    <span className="w-7 text-right text-sm font-semibold">{Math.round(data.daily.temperature_2m_max[i])}°</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AIR QUALITY */}
          {air?.current && (
            <section className="mb-5 rounded-3xl glass p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Air Quality</h2>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{Math.round(air.current.us_aqi)}</div>
                  <div className="text-xs text-muted-foreground">US AQI</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${aqiColor(air.current.us_aqi).cls}`}>
                  {aqiColor(air.current.us_aqi).label}
                </span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 via-orange-400 to-rose-500"
                  style={{ width: `${Math.min(100, (air.current.us_aqi / 300) * 100)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="PM2.5" value={`${air.current.pm2_5?.toFixed(1) ?? "—"}`} />
                <Metric label="PM10" value={`${air.current.pm10?.toFixed(1) ?? "—"}`} />
                <Metric label="Ozone" value={`${air.current.ozone?.toFixed(0) ?? "—"}`} />
              </div>
            </section>
          )}

          {/* SUN & MOON */}
          <section className="mb-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl glass p-3 text-center">
              <Sunrise className="mx-auto mb-1 h-5 w-5 text-orange-300" />
              <div className="text-[10px] uppercase text-muted-foreground">Sunrise</div>
              <div className="text-sm font-semibold">
                {new Date(data.daily.sunrise[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
            <div className="rounded-2xl glass p-3 text-center">
              <Sunset className="mx-auto mb-1 h-5 w-5 text-pink-300" />
              <div className="text-[10px] uppercase text-muted-foreground">Sunset</div>
              <div className="text-sm font-semibold">
                {new Date(data.daily.sunset[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
            <div className="rounded-2xl glass p-3 text-center">
              <Moon className="mx-auto mb-1 h-5 w-5 text-violet-300" />
              <div className="text-[10px] uppercase text-muted-foreground">Moon</div>
              <div className="text-[11px] font-semibold">{moonPhase()}</div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ Icon, label, value }: { Icon?: typeof Sun; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2">
      {Icon && <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-violet-300" />}
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Select<T extends number>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value) as T)}
        className="rounded-xl glass px-2 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-violet-400">
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
        ))}
      </select>
    </label>
  );
}
