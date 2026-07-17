"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RekapItem {
  id: string;
  mingguKe: number;
  tahunAjaran: string;
  semester: string;
  tanggalMulai: string;
  tanggalAkhir: string;

  subuhS: number;
  subuhI: number;
  subuhA: number;
  dzuhurS: number;
  dzuhurI: number;
  dzuhurA: number;
  asarS: number;
  asarI: number;
  asarA: number;
  magribS: number;
  magribI: number;
  magribA: number;
  isyaS: number;
  isyaI: number;
  isyaA: number;

  btaS: number;
  btaI: number;
  btaA: number;
  kbmS: number;
  kbmI: number;
  kbmA: number;
  ekskulS: number;
  ekskulI: number;
  ekskulA: number;
  vokasionalS: number;
  vokasionalI: number;
  vokasionalA: number;
  piketS: number;
  piketI: number;
  piketA: number;
  lain: number;

  apnMingguIni: number;
  appMingguIni: number;
  sisaApMingguIni: number;
  sisaApMingguLalu: number;
  apnTotal: number;
  appTotal: number;
  sisaApTotal: number;

  pembimbingan?: string | null;
  keterangan?: string | null;
}

function formatTanggal(tanggal: string) {
  return new Date(tanggal).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function RingBadge({
  value,
  max = 50,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>

      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 min-w-8 text-right">
        {value}
      </span>
    </div>
  );
}

function DetailItem({
  label,
  s,
  i,
  a,
}: {
  label: string;
  s: number;
  i: number;
  a: number;
}) {
  const total = s + i + a;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {label}
        </p>

        <span className="text-xs font-bold text-gray-500">Total {total}</span>
      </div>

      <div className="flex gap-2 mt-3 text-xs">
        <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 font-semibold">
          S: {s}
        </span>

        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-semibold">
          I: {i}
        </span>

        <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
          A: {a}
        </span>
      </div>
    </div>
  );
}

export default function PelanggaranOrtuPage() {
  const [data, setData] = useState<RekapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch("/api/ortu/pelanggaran");
      const json = await res.json();

      setData(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        Memuat data pelanggaran...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Rekap Pelanggaran
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Rekap pelanggaran dan pembimbingan siswa per minggu.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
          Belum ada data rekap pelanggaran.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const isOpen = openId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                >
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Minggu ke-{item.mingguKe} • {item.semester} •{" "}
                      {item.tahunAjaran}
                    </p>

                    <h2 className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatTanggal(item.tanggalMulai)} -{" "}
                      {formatTanggal(item.tanggalAkhir)}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Sisa APN Total</p>
                      <p className="text-2xl font-black text-rose-600">
                        {item.sisaApTotal}
                      </p>
                    </div>

                    {isOpen ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-5 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid sm:grid-cols-3 gap-3 mb-5">
                      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                        <p className="text-xs font-semibold text-rose-600 uppercase">
                          Sisa APN Total
                        </p>

                        <h2 className="text-3xl font-black text-rose-700 mt-1">
                          {item.sisaApTotal}
                        </h2>
                      </div>

                      <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4">
                        <p className="text-xs font-semibold text-indigo-600 uppercase">
                          APN Total
                        </p>

                        <h2 className="text-3xl font-black text-indigo-700 mt-1">
                          {item.apnTotal}
                        </h2>
                      </div>

                      <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                        <p className="text-xs font-semibold text-green-600 uppercase">
                          APP Total
                        </p>

                        <h2 className="text-3xl font-black text-green-700 mt-1">
                          {item.appTotal}
                        </h2>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5 mb-6">
                      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Jumlah Minggu Ini
                        </p>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              APN Minggu Ini
                            </p>
                            <RingBadge
                              value={item.apnMingguIni}
                              max={50}
                              color="bg-rose-400"
                            />
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              APP Minggu Ini
                            </p>
                            <RingBadge
                              value={item.appMingguIni}
                              max={50}
                              color="bg-green-400"
                            />
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Sisa APN Minggu Ini
                            </p>
                            <RingBadge
                              value={item.sisaApMingguIni}
                              max={50}
                              color="bg-amber-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Akumulasi
                        </p>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Sisa APN Minggu Lalu
                            </p>
                            <RingBadge
                              value={item.sisaApMingguLalu}
                              max={50}
                              color="bg-gray-400"
                            />
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Total APN
                            </p>
                            <RingBadge
                              value={item.apnTotal}
                              max={100}
                              color="bg-rose-400"
                            />
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Total APP
                            </p>
                            <RingBadge
                              value={item.appTotal}
                              max={100}
                              color="bg-green-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Detail Pelanggaran Mingguan
                      </h3>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <DetailItem
                          label="Subuh"
                          s={item.subuhS}
                          i={item.subuhI}
                          a={item.subuhA}
                        />
                        <DetailItem
                          label="Dzuhur"
                          s={item.dzuhurS}
                          i={item.dzuhurI}
                          a={item.dzuhurA}
                        />
                        <DetailItem
                          label="Asar"
                          s={item.asarS}
                          i={item.asarI}
                          a={item.asarA}
                        />
                        <DetailItem
                          label="Magrib"
                          s={item.magribS}
                          i={item.magribI}
                          a={item.magribA}
                        />
                        <DetailItem
                          label="Isya"
                          s={item.isyaS}
                          i={item.isyaI}
                          a={item.isyaA}
                        />
                        <DetailItem
                          label="BTA/Kitab"
                          s={item.btaS}
                          i={item.btaI}
                          a={item.btaA}
                        />
                        <DetailItem
                          label="KBM"
                          s={item.kbmS}
                          i={item.kbmI}
                          a={item.kbmA}
                        />
                        <DetailItem
                          label="Ekskul"
                          s={item.ekskulS}
                          i={item.ekskulI}
                          a={item.ekskulA}
                        />
                        <DetailItem
                          label="Vokasional"
                          s={item.vokasionalS}
                          i={item.vokasionalI}
                          a={item.vokasionalA}
                        />
                        <DetailItem
                          label="Piket"
                          s={item.piketS}
                          i={item.piketI}
                          a={item.piketA}
                        />
                      </div>

                      <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Lain-lain
                        </p>

                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                          {item.lain}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
                        <p className="text-xs text-gray-400 mb-1">
                          Pembimbingan
                        </p>

                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.pembimbingan || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
                        <p className="text-xs text-gray-400 mb-1">Keterangan</p>

                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.keterangan || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
