import { CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";

function pct(hadir: number, total: number) {
  if (total === 0) return 0;
  return Math.round((hadir / total) * 100);
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}
    >
      <div className="absolute -right-3 -top-3 opacity-20">
        <Icon size={72} strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon size={18} />
          </span>
          <p className="text-sm font-medium text-white/90">{label}</p>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className={`text-xs mt-1.5 font-medium ${accent}`}>{sub}</p>}
      </div>
    </div>
  );
}

export function ProgressRing({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = pct(value, total);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-100 dark:text-gray-700"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {percent}%
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-2">
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {value} / {total} hadir
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      className: string;
      icon: React.ElementType;
    }
  > = {
    HADIR: {
      label: "Hadir",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
      icon: CheckCircle2,
    },

    TERLAMBAT: {
      label: "Terlambat",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
      icon: AlertCircle,
    },

    IZIN: {
      label: "Izin",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
      icon: AlertCircle,
    },

    SAKIT: {
      label: "Sakit",
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
      icon: AlertCircle,
    },

    ALPHA: {
      label: "Alpha",
      className: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
      icon: AlertCircle,
    },

    BELUM: {
      label: "Belum Hadir",
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      icon: CircleDashed,
    },
  };

  const item = config[status] ?? config.BELUM;
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${item.className}`}
    >
      <Icon size={13} />
      {item.label}
    </span>
  );
}
