import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, TrendingUp, Home, Coins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calculators")({
  component: CalculatorsPage,
});

type Tab = "sip" | "emi" | "ci";

const TABS: { id: Tab; label: string; Icon: typeof TrendingUp }[] = [
  { id: "sip", label: "SIP", Icon: TrendingUp },
  { id: "emi", label: "EMI", Icon: Home },
  { id: "ci", label: "Compound", Icon: Coins },
];

function fmt(n: number) {
  if (!isFinite(n)) return "—";
  return "₹" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function CalculatorsPage() {
  const [tab, setTab] = useState<Tab>("sip");
  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-28 animate-fade-up">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Calculator className="h-5 w-5 text-violet" /> Calculators
        </h1>
        <p className="text-[12px] text-muted-foreground">Plan SIPs, loans, and growth in seconds.</p>
      </div>
      <div className="mb-5 flex gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold ${
              tab === id ? "gradient-brand text-white shadow-lg shadow-primary/30" : "glass text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      {tab === "sip" && <SIP />}
      {tab === "emi" && <EMI />}
      {tab === "ci" && <CI />}
    </main>
  );
}

function Field({ label, value, set, unit }: { label: string; value: number; set: (n: number) => void; unit?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="text-[12px] font-semibold tabular-nums">{value}{unit ?? ""}</span>
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => set(parseFloat(e.target.value) || 0)}
        className="w-full rounded-xl glass px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

function SIP() {
  const [m, setM] = useState(10000);
  const [r, setR] = useState(12);
  const [y, setY] = useState(10);
  const { invested, future, gain } = useMemo(() => {
    const n = y * 12;
    const i = r / 100 / 12;
    const future = i === 0 ? m * n : m * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const invested = m * n;
    return { invested, future, gain: future - invested };
  }, [m, r, y]);
  return (
    <div className="space-y-4">
      <div className="space-y-3 market-card p-4">
        <Field label="Monthly investment" value={m} set={setM} />
        <Field label="Expected return (annual %)" value={r} set={setR} unit="%" />
        <Field label="Period" value={y} set={setY} unit=" yr" />
      </div>
      <div className="market-card p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Future value</p>
        <p className="text-3xl font-bold tracking-tight">{fmt(future)}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div><span className="text-muted-foreground">Invested: </span><span className="font-semibold">{fmt(invested)}</span></div>
          <div><span className="text-muted-foreground">Gain: </span><span className="font-semibold text-green-400">{fmt(gain)}</span></div>
        </div>
      </div>
    </div>
  );
}

function EMI() {
  const [p, setP] = useState(2500000);
  const [r, setR] = useState(9);
  const [y, setY] = useState(20);
  const { emi, total, interest } = useMemo(() => {
    const n = y * 12;
    const i = r / 100 / 12;
    const emi = i === 0 ? p / n : (p * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    const total = emi * n;
    return { emi, total, interest: total - p };
  }, [p, r, y]);
  return (
    <div className="space-y-4">
      <div className="space-y-3 market-card p-4">
        <Field label="Loan amount" value={p} set={setP} />
        <Field label="Interest rate (annual %)" value={r} set={setR} unit="%" />
        <Field label="Tenure" value={y} set={setY} unit=" yr" />
      </div>
      <div className="market-card p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Monthly EMI</p>
        <p className="text-3xl font-bold tracking-tight">{fmt(emi)}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div><span className="text-muted-foreground">Total interest: </span><span className="font-semibold text-red-400">{fmt(interest)}</span></div>
          <div><span className="text-muted-foreground">Total payable: </span><span className="font-semibold">{fmt(total)}</span></div>
        </div>
      </div>
    </div>
  );
}

function CI() {
  const [p, setP] = useState(100000);
  const [r, setR] = useState(8);
  const [y, setY] = useState(10);
  const [n, setN] = useState(4);
  const { future, interest } = useMemo(() => {
    const future = p * Math.pow(1 + r / 100 / n, n * y);
    return { future, interest: future - p };
  }, [p, r, y, n]);
  return (
    <div className="space-y-4">
      <div className="space-y-3 market-card p-4">
        <Field label="Principal" value={p} set={setP} />
        <Field label="Rate (annual %)" value={r} set={setR} unit="%" />
        <Field label="Years" value={y} set={setY} unit=" yr" />
        <Field label="Compounds per year" value={n} set={setN} />
      </div>
      <div className="market-card p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Future value</p>
        <p className="text-3xl font-bold tracking-tight">{fmt(future)}</p>
        <p className="mt-1 text-[12px]"><span className="text-muted-foreground">Interest earned: </span><span className="font-semibold text-green-400">{fmt(interest)}</span></p>
      </div>
    </div>
  );
}
