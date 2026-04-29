/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  Projector, 
  Calendar, 
  CircleDollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  RefreshCcw, 
  Database,
  Printer,
  ChevronRight,
  Target,
  BarChart3,
  Brain
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

enum EACMethod {
  CPI = "CPI", // BAC / CPI (현재 추세 지속)
  BUDGETED = "BUDGETED", // AC + (BAC - EV) (향후 계획대로)
  COMPOSITE = "COMPOSITE", // AC + (BAC - EV) / (CPI * SPI) (복합)
}

interface ProjectData {
  name: string;
  baseDate: string;
  bac: number;
  totalDuration: number;
  elapsedDays: number;
  pv: number;
  ev: number;
  ac: number;
}

// --- Constants ---

const INITIAL_DATA: ProjectData = {
  name: "신도시 복합 커뮤니티 센터 건립공사",
  baseDate: new Date().toISOString().split('T')[0],
  bac: 0,
  totalDuration: 0,
  elapsedDays: 0,
  pv: 0,
  ev: 0,
  ac: 0,
};

const EXAMPLE_DATA: ProjectData = {
  name: "테스트 프로젝트 (예시)",
  baseDate: new Date().toISOString().split('T')[0],
  bac: 100,
  totalDuration: 365,
  elapsedDays: 180,
  pv: 40,
  ev: 35,
  ac: 42,
};

// --- Components ---

const TooltipIcon = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1 align-middle">
      <Info 
        className="w-4 h-4 text-slate-400 cursor-help hover:text-indigo-600 transition-colors" 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 w-48 p-2 text-xs text-white bg-slate-800 rounded shadow-xl -left-20 bottom-full mb-2 pointer-events-none"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MetricCard = ({ 
  label, 
  value, 
  unit = "", 
  tooltip = "", 
  status = "neutral" 
}: { 
  label: string; 
  value: string | number; 
  unit?: string; 
  tooltip?: string;
  status?: "good" | "warning" | "danger" | "neutral"
}) => {
  const statusColors = {
    good: "text-emerald-600",
    warning: "text-amber-500",
    danger: "text-rose-600",
    neutral: "text-slate-700"
  };

  return (
    <div className="p-4 flex flex-col space-y-1">
      <div className="flex items-center text-sm font-medium text-slate-500">
        {label}
        {tooltip && <TooltipIcon text={tooltip} />}
      </div>
      <div className={cn("text-xl font-bold tracking-tight", statusColors[status])}>
        {value}
        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
};

const Gauge = ({ 
  value, 
  label, 
  min = 0.5, 
  max = 1.5 
}: { 
  value: number; 
  label: string; 
  min?: number; 
  max?: number 
}) => {
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  
  // Angle calculation for SVG semicircular gauge
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const arcLength = circumference / 2;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  let color = "stroke-rose-500";
  if (value >= 1.0) color = "stroke-emerald-500";
  else if (value >= 0.8) color = "stroke-amber-500";

  return (
    <div className="flex flex-col items-center">
      <svg height="80" width="120" className="rotate-0">
        <circle
          className="stroke-slate-100 fill-transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="60"
          cy="60"
          style={{ strokeDasharray: `${arcLength} ${circumference}`, strokeDashoffset: 0, strokeLinecap: "round" }}
        />
        <circle
          className={cn("transition-all duration-1000 ease-out fill-transparent", color)}
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          style={{ strokeDashoffset, strokeLinecap: "round" }}
          r={normalizedRadius}
          cx="60"
          cy="60"
        />
        <text x="60" y="55" textAnchor="middle" className="text-lg font-bold fill-slate-800 tabular-nums">
          {value.toFixed(2)}
        </text>
        <text x="60" y="75" textAnchor="middle" className="text-[10px] uppercase font-bold fill-slate-400 tracking-wider">
          {label}
        </text>
      </svg>
      <div className="flex justify-between w-full px-4 text-[10px] text-slate-400 font-bold">
        <span>{min}</span>
        <span>1.0</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<ProjectData>(INITIAL_DATA);
  const [eacMethod, setEacMethod] = useState<EACMethod>(EACMethod.CPI);

  // --- Calculations ---

  const metrics = useMemo(() => {
    const { pv, ev, ac, bac } = data;
    
    // Performance
    const sv = ev - pv;
    const spi = pv === 0 ? 0 : ev / pv;
    const cv = ev - ac;
    const cpi = ac === 0 ? 0 : ev / ac;

    // Predictions
    let eac = 0;
    if (eacMethod === EACMethod.CPI) {
      eac = cpi === 0 ? bac : bac / cpi;
    } else if (eacMethod === EACMethod.BUDGETED) {
      eac = ac + (bac - ev);
    } else if (eacMethod === EACMethod.COMPOSITE) {
      eac = (cpi * spi) === 0 ? bac : ac + (bac - ev) / (cpi * spi);
    }

    const etc = eac - ac;
    const vac = bac - eac;
    const tcpi = (bac - ac) === 0 ? 0 : (bac - ev) / (bac - ac);

    return { sv, spi, cv, cpi, eac, etc, vac, tcpi };
  }, [data, eacMethod]);

  const diagnosis = useMemo(() => {
    const { spi, cpi } = metrics;
    if (data.bac === 0) return null;

    let status = {
      light: "gray",
      title: "데이터 부족",
      desc: "프로젝트 데이터를 입력하여 진단을 시작하세요.",
      actions: [] as string[]
    };

    if (spi >= 1 && cpi >= 1) {
      status = {
        light: "green",
        title: "🟢 양호 - 예산 및 일정 모두 양호",
        desc: "현재 성과가 계획을 상회하고 있습니다. 리스크 관리 위주의 관리가 권장됩니다.",
        actions: ["현행 효율 유지 및 품질 강화", "잔여 예산 활용 방안 검토", "성공 요인 분석 및 공유"]
      };
    } else if (spi >= 1 && cpi < 1) {
      status = {
        light: "yellow",
        title: "🟡 주의 - 일정 양호, 원가 초과 위험",
        desc: "일정은 준수하고 있으나, 투입 원가가 계획보다 높습니다. 효율성 개선이 시급합니다.",
        actions: ["자재/인력 투입 효율 재검토", "원가 절감형 공법 도입 검토", "불필요한 공정 오버헤드 제거"]
      };
    } else if (spi < 1 && cpi >= 1) {
      status = {
        light: "yellow",
        title: "🟡 주의 - 일정 지연, 원가 양호",
        desc: "예산은 안정적이나, 공정 진행이 계획보다 느립니다. 공정 만회 대책이 필요합니다.",
        actions: ["공정만회 대책 수립 (Catch-up Plan)", "병행 작업 가능 공정 식별", "인적/기계 리소스 추가 투입 검토"]
      };
    } else if (spi < 1 && cpi < 1) {
      status = {
        light: "red",
        title: "🔴 위험 - 일정 지연 및 원가 초과",
        desc: "공정과 원가 모두 통제를 벗어난 상태입니다. 전면적인 프로젝트 재계획이 필요할 수 있습니다.",
        actions: ["크리티컬 패스(CP) 집중 관리", "범위(Scope) 조정 검토", "발주처 협의 및 예산 재편성 논의"]
      };
    }

    return status;
  }, [metrics, data.bac]);

  // S-Curve dummy data generation based on PV/EV/AC
  const chartData = useMemo(() => {
    const points = 10;
    const { pv, ev, ac, elapsedDays, totalDuration } = data;
    
    return Array.from({ length: points + 1 }, (_, i) => {
      const x = i / points;
      const day = Math.round(x * (totalDuration || 100));
      
      // Simplified linear interpolation for visualization
      const currentPv = (pv / (elapsedDays || 1)) * day;
      const currentEv = day <= elapsedDays ? (ev / elapsedDays) * day : null;
      const currentAc = day <= elapsedDays ? (ac / elapsedDays) * day : null;
      
      return {
        name: `Day ${day}`,
        PV: Number(currentPv.toFixed(1)),
        EV: currentEv !== null ? Number(currentEv.toFixed(1)) : undefined,
        AC: currentAc !== null ? Number(currentAc.toFixed(1)) : undefined,
      };
    });
  }, [data]);

  // --- Handlers ---

  const handleInputChange = (field: keyof ProjectData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const loadExample = () => setData(EXAMPLE_DATA);
  const resetData = () => setData(INITIAL_DATA);
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-[#1a237e] text-white py-6 shadow-lg no-print">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Projector className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">건설 프로젝트 EVM 성과분석 대시보드</h1>
              <p className="text-indigo-200 text-sm">통합 성과 분석 및 미래 예측 솔루션</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={loadExample}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
            >
              <Database className="w-4 h-4" /> 예시 데이터
            </button>
            <button 
              onClick={resetData}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
            >
              <RefreshCcw className="w-4 h-4" /> 초기화
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition-all"
            >
              <Printer className="w-4 h-4" /> 인쇄
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8 flex flex-col gap-8">
        
        {/* Main Grid: Inputs and Result Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <section className="lg:col-span-4 flex flex-col gap-6 no-print">
            {/* Basic Info Card */}
            <div className="card">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">프로젝트 기본 정보</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">프로젝트명</label>
                  <input 
                    type="text" 
                    value={data.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">기준일자</label>
                    <input 
                      type="date" 
                      value={data.baseDate}
                      onChange={(e) => handleInputChange('baseDate', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">BAC (총 사업비)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={data.bac || ""}
                        onChange={(e) => handleInputChange('bac', Number(e.target.value))}
                        placeholder="0"
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">억원</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">총 공기 (일)</label>
                    <input 
                      type="number" 
                      value={data.totalDuration || ""}
                      onChange={(e) => handleInputChange('totalDuration', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">경과일수 (일)</label>
                    <input 
                      type="number" 
                      value={data.elapsedDays || ""}
                      onChange={(e) => handleInputChange('elapsedDays', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Data Card */}
            <div className="card">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">성과 데이터</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                      PV (계획가치) <TooltipIcon text="기준일까지 계획된 작업의 예산 가치" />
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={data.pv || ""}
                        onChange={(e) => handleInputChange('pv', Number(e.target.value))}
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">억원</span>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                      EV (획득가치) <TooltipIcon text="실제로 완료된 작업의 예산 가치" />
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={data.ev || ""}
                        onChange={(e) => handleInputChange('ev', Number(e.target.value))}
                        className="w-full pl-3 pr-10 py-2 bg-amber-50/30 border border-amber-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">억원</span>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                      AC (실제원가) <TooltipIcon text="완료된 작업을 위해 실제 지출된 비용" />
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={data.ac || ""}
                        onChange={(e) => handleInputChange('ac', Number(e.target.value))}
                        className="w-full pl-3 pr-10 py-2 bg-rose-50/30 border border-rose-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">억원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Metrics Section */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Metric Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Performance Indicator Card */}
              <div className="card">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-slate-800">성과 지표 (Variance & Index)</h2>
                  </div>
                  <div className="flex gap-2">
                    <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", metrics.spi >= 1 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {metrics.spi >= 1 ? "On Schedule" : "Behind Schedule"}
                    </div>
                    <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", metrics.cpi >= 1 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {metrics.cpi >= 1 ? "Under Budget" : "Over Budget"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="divide-y divide-slate-100 border-r border-slate-100">
                    <MetricCard 
                      label="SV (일정차이)" 
                      value={metrics.sv.toFixed(2)} 
                      unit="억원" 
                      tooltip="EV - PV: 양수면 계획보다 빠른 진행"
                      status={metrics.sv >= 0 ? "good" : "danger"} 
                    />
                    <MetricCard 
                      label="CV (원가차이)" 
                      value={metrics.cv.toFixed(2)} 
                      unit="억원" 
                      tooltip="EV - AC: 양수면 예산보다 낮은 비용"
                      status={metrics.cv >= 0 ? "good" : "danger"} 
                    />
                  </div>
                  <div className="p-4 flex flex-col justify-around items-center">
                    <div className="flex gap-4">
                      <Gauge value={metrics.spi} label="SPI" />
                      <Gauge value={metrics.cpi} label="CPI" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Predictions Card */}
              <div className="card">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-slate-800">예측 및 전망 (Forecasting)</h2>
                  </div>
                  {/* EAC Method Radio Buttons */}
                  <div className="flex bg-slate-200 p-0.5 rounded-lg no-print">
                    <button 
                      onClick={() => setEacMethod(EACMethod.CPI)}
                      className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", eacMethod === EACMethod.CPI ? "bg-white shadow text-indigo-600" : "text-slate-500")}
                    >EAC₁</button>
                    <button 
                      onClick={() => setEacMethod(EACMethod.BUDGETED)}
                      className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", eacMethod === EACMethod.BUDGETED ? "bg-white shadow text-indigo-600" : "text-slate-500")}
                    >EAC₂</button>
                    <button 
                      onClick={() => setEacMethod(EACMethod.COMPOSITE)}
                      className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", eacMethod === EACMethod.COMPOSITE ? "bg-white shadow text-indigo-600" : "text-slate-500")}
                    >EAC₃</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-100">
                  <div className="flex items-center justify-between p-4 bg-indigo-50/30">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-500 flex items-center">
                        EAC (완료시 추정)
                        <TooltipIcon text={
                          eacMethod === EACMethod.CPI ? "현 상태의 효율(CPI)이 완료시까지 지속될 것으로 가정" :
                          eacMethod === EACMethod.BUDGETED ? "남은 작업은 당초 계획된 비용으로 수행될 것으로 가정" :
                          "현재의 일정과 비용 효율(SPI*CPI)을 모두 고려하여 추정"
                        } />
                      </span>
                      <span className="text-2xl font-black text-indigo-900 tracking-tight">
                        {metrics.eac.toFixed(2)} <span className="text-sm font-normal text-slate-400">억원</span>
                      </span>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] uppercase font-bold text-slate-400">{eacMethod} Method</div>
                       <div className="text-xs font-medium text-slate-500 mt-1">BAC 대비 {((metrics.eac/data.bac || 1)*100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-slate-100">
                    <MetricCard 
                      label="ETC (잔여추정)" 
                      value={metrics.etc.toFixed(1)} 
                      unit="억" 
                      tooltip="EAC - AC: 남은 작업을 위한 비용" 
                    />
                    <MetricCard 
                      label="VAC (완료차이)" 
                      value={metrics.vac.toFixed(1)} 
                      unit="억" 
                      tooltip="BAC - EAC: 양수면 예산 내 완료 예상"
                      status={metrics.vac >= 0 ? "good" : "danger"} 
                    />
                    <MetricCard 
                      label="TCPI (달성필요)" 
                      value={metrics.tcpi.toFixed(2)} 
                      tooltip="(BAC-EV)/(BAC-AC): 목표 달성을 위해 유지해야 할 CPI" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* S-Curve Visualization */}
            <div className="card h-full min-h-[400px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-800">S-Curve 분석 (누적 가치 추이)</h2>
                </div>
                <div className="flex gap-4 text-[10px] font-bold">
                  <div className="flex items-center gap-1"><div className="w-3 h-1 bg-indigo-400"></div> PV</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-1 bg-emerald-500"></div> EV</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-1 bg-rose-500"></div> AC</div>
                </div>
              </div>
              <div className="p-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="PV" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPv)" />
                    <Area type="monotone" dataKey="EV" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEv)" />
                    <Area type="monotone" dataKey="AC" stroke="#f43f5e" strokeWidth={3} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </section>
        </div>

        {/* Diagnosis and Footer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-12">
               <div className="card">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-slate-800">프로젝트 상태 진단 및 대응 방안</h2>
                  </div>
                  <div className="p-6">
                    {diagnosis ? (
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-4">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm",
                            diagnosis.light === 'green' ? "bg-emerald-100 text-emerald-700" :
                            diagnosis.light === 'yellow' ? "bg-amber-100 text-amber-700" :
                            diagnosis.light === 'red' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {diagnosis.title}
                          </div>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            {diagnosis.desc}
                          </p>
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">권장 대응 방안 (Recomendations)</h3>
                          <div className="space-y-3">
                            {diagnosis.actions.map((action, idx) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={idx} 
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                              >
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm shrink-0">
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{action}</span>
                                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 font-medium">
                        진단 결과를 확인하려면 프로젝트 데이터를 입력해주세요.
                      </div>
                    )}
                  </div>
               </div>
            </section>
        </div>

      </main>

      {/* Mobile-only print watermark or footer if needed */}
      <footer className="mt-20 border-t border-slate-200 py-8 text-center text-slate-400 text-xs no-print">
        © 2026 EVM 성과분석 대시보드 - Professional Project Management Solution
      </footer>

      {/* Print only info */}
      <div className="hidden print-only p-10 text-center">
        <h1 className="text-3xl font-bold text-[#1a237e] mb-2">{data.name}</h1>
        <p className="text-slate-500">Report Date: {data.baseDate}</p>
      </div>
    </div>
  );
}

