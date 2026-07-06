/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  RotateCcw, 
  RotateCw, 
  Compass, 
  RefreshCw, 
  Sparkles, 
  Info,
  Pencil,
  Check,
  Undo
} from 'lucide-react';
import { Point } from '../types';
import { checkEkePlacement, distance, getVectorAngle, getAngleDifference, calculateAngle } from '../utils';
import { sound } from './SoundManager';

export default function Playground() {
  // 3 điểm định hình cho góc do học sinh tự vẽ:
  // pB là đỉnh góc, pA và pC là các đầu mút
  const [pB, setPB] = useState<Point>({ x: 380, y: 250 }); // Đỉnh góc
  const [pA, setPA] = useState<Point>({ x: 200, y: 150 }); // Đầu mút 1
  const [pC, setPC] = useState<Point>({ x: 580, y: 250 }); // Đầu mút 2

  // Thước ê-ke tự do
  const [ekePos, setEkePos] = useState<Point>({ x: 120, y: 310 });
  const [ekeRot, setEkeRot] = useState<number>(0);

  // Trạng thái kéo thả điểm hình học
  const [activePoint, setActivePoint] = useState<'A' | 'B' | 'C' | null>(null);

  // Trạng thái kéo thả thước ê-ke
  const [isDraggingEke, setIsDraggingEke] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Trạng thái xoay thước ê-ke
  const [isRotatingEke, setIsRotatingEke] = useState<boolean>(false);
  const [initialRotAngle, setInitialRotAngle] = useState<number>(0);
  const [initialEkeRot, setInitialEkeRot] = useState<number>(0);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Tính số đo góc hiện tại do học sinh tạo ra
  const currentAngle = calculateAngle(pB, pA, pC);

  // Phân loại góc tự vẽ
  const getAngleTypeLabel = (deg: number): { label: string; color: string; desc: string } => {
    if (deg >= 88 && deg <= 92) {
      return { 
        label: 'Góc vuông', 
        color: 'text-rose-500 bg-rose-50 border-rose-200', 
        desc: 'Hai cạnh tạo thành một góc vuông chính xác 90°. Bé hãy thử dùng ê-ke để đo kiểm tra nhé!' 
      };
    } else if (deg < 88) {
      return { 
        label: 'Góc nhọn', 
        color: 'text-sky-500 bg-sky-50 border-sky-200', 
        desc: 'Số đo góc nhỏ hơn 90°. Hai cạnh của góc hẹp hơn hai cạnh của thước ê-ke.' 
      };
    } else if (deg > 92 && deg < 178) {
      return { 
        label: 'Góc tù', 
        color: 'text-amber-500 bg-amber-50 border-amber-200', 
        desc: 'Số đo góc lớn hơn 90°. Hai cạnh của góc mở rộng ra bên ngoài thước ê-ke.' 
      };
    } else {
      return { 
        label: 'Góc bẹt', 
        color: 'text-purple-500 bg-purple-50 border-purple-200', 
        desc: 'Số đo góc bằng 180°, tạo thành một đường thẳng tắp.' 
      };
    }
  };

  const angleTypeInfo = getAngleTypeLabel(currentAngle);

  // Kiểm tra cách đặt thước êke với góc tự vẽ
  const ekeCheck = checkEkePlacement(ekePos, ekeRot, pB, pA, pC);

  // Tự động hít (snap) êke vào đỉnh và cạnh của góc vẽ tự do
  useEffect(() => {
    if (activePoint || isDraggingEke || isRotatingEke) return;

    let updated = false;
    let newPos = { ...ekePos };
    let newRot = ekeRot;

    // Hít đỉnh
    if (ekeCheck.isVertexClose && !ekeCheck.isVertexSnapped) {
      newPos = { ...pB };
      updated = true;
    }

    // Hít góc xoay
    if (ekeCheck.isVertexClose && ekeCheck.isEdgeAligned && Math.abs(ekeRot - ekeCheck.snappedRotation) > 0.1) {
      newRot = ekeCheck.snappedRotation;
      updated = true;
    }

    if (updated) {
      setEkePos(newPos);
      setEkeRot(newRot);
      sound.playSnap();
    }
  }, [activePoint, isDraggingEke, isRotatingEke, ekePos, ekeRot, pB, pA, pC]);

  // Đổi tọa độ chuột/touch màn hình sang tọa độ SVG
  const getSVGCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 800;
    const y = ((clientY - rect.top) / rect.height) * 420;
    
    return { x, y };
  };

  // --- KÉO THẢ ĐIỂM HÌNH HỌC ---
  const handlePointDragStart = (point: 'A' | 'B' | 'C') => {
    sound.playClick();
    setActivePoint(point);
  };

  // --- KÉO THẢ THƯỚC (DRAG) ---
  const handleEkeDragStart = (e: React.MouseEvent<SVGPathElement> | React.TouchEvent<SVGPathElement>) => {
    e.preventDefault();
    sound.playClick();
    const coords = getSVGCoords(e);
    setDragOffset({
      x: coords.x - ekePos.x,
      y: coords.y - ekePos.y
    });
    setIsDraggingEke(true);
  };

  // --- XOAY THƯỚC (ROTATE) ---
  const handleEkeRotateStart = (e: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    sound.playClick();
    const coords = getSVGCoords(e);
    const angle = getVectorAngle(ekePos, coords);
    setInitialRotAngle(angle);
    setInitialEkeRot(ekeRot);
    setIsRotatingEke(true);
  };

  // --- MOVE CHUNG ---
  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const coords = getSVGCoords(e);

    // Xử lý kéo điểm hình học
    if (activePoint) {
      const targetX = Math.max(20, Math.min(780, coords.x));
      const targetY = Math.max(20, Math.min(400, coords.y));
      
      if (activePoint === 'A') setPA({ x: targetX, y: targetY });
      else if (activePoint === 'B') setPB({ x: targetX, y: targetY });
      else if (activePoint === 'C') setPC({ x: targetX, y: targetY });
    }
    // Xử lý kéo thước êke
    else if (isDraggingEke) {
      let targetX = coords.x - dragOffset.x;
      let targetY = coords.y - dragOffset.y;
      
      targetX = Math.max(10, Math.min(790, targetX));
      targetY = Math.max(10, Math.min(410, targetY));
      
      setEkePos({ x: targetX, y: targetY });
    }
    // Xử lý xoay thước
    else if (isRotatingEke) {
      const currentAngle = getVectorAngle(ekePos, coords);
      const angleDiff = currentAngle - initialRotAngle;
      let nextRot = (initialEkeRot + angleDiff) % 360;
      if (nextRot < 0) nextRot += 360;
      setEkeRot(nextRot);
    }
  };

  const handlePointerEnd = () => {
    setActivePoint(null);
    setIsDraggingEke(false);
    setIsRotatingEke(false);
  };

  // Xoay mịn bằng tay
  const rotateManual = (direction: 'cw' | 'ccw', step: number = 5) => {
    sound.playClick();
    let change = direction === 'cw' ? step : -step;
    let nextRot = (ekeRot + change) % 360;
    if (nextRot < 0) nextRot += 360;
    setEkeRot(nextRot);
  };

  // Thiết lập nhanh góc vuông mẫu cho học sinh tập đo
  const generatePerfectRightAngle = () => {
    sound.playClick();
    sound.playSuccess();
    setPB({ x: 380, y: 260 });
    setPA({ x: 380, y: 80 });  // thẳng đứng hướng lên
    setPC({ x: 620, y: 260 }); // nằm ngang sang phải
  };

  // Thiết lập góc nhọn mẫu
  const generateAcuteAngle = () => {
    sound.playClick();
    setPB({ x: 380, y: 260 });
    setPA({ x: 230, y: 140 }); // xiên lên trái
    setPC({ x: 600, y: 260 }); // nằm ngang sang phải
  };

  // Đặt lại toàn bộ bảng vẽ tự do
  const resetAll = () => {
    sound.playClick();
    setPB({ x: 380, y: 250 });
    setPA({ x: 200, y: 150 });
    setPC({ x: 580, y: 250 });
    setEkePos({ x: 120, y: 310 });
    setEkeRot(0);
  };

  // Tính tọa độ tay cầm xoay
  const rad = (ekeRot * Math.PI) / 180;
  const localHandle = { x: 70, y: -105 };
  const globalHandle = {
    x: ekePos.x + localHandle.x * Math.cos(rad) - localHandle.y * Math.sin(rad),
    y: ekePos.y + localHandle.x * Math.sin(rad) + localHandle.y * Math.cos(rad)
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-stretch overflow-hidden" id="playground-container">
      
      {/* KHUNG VẼ TỰ DO (LEFT SIDE - 7/12 COLS) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-indigo-200 shadow flex flex-col justify-between overflow-hidden relative" id="playground-screen">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex justify-between items-center text-slate-700">
          <div className="flex items-center gap-1.5">
            <Pencil className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span className="text-xs font-black text-indigo-900">Xưởng vẽ & Đo góc tự do</span>
          </div>
          <div className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
            Kéo thả 3 điểm A, B (đỏ), C để tạo góc
          </div>
        </div>

        {/* Khung vẽ SVG */}
        <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] select-none flex items-center justify-center min-h-[220px]">
          <svg
            ref={svgRef}
            viewBox="0 0 800 420"
            className="w-full h-auto max-h-[350px] cursor-default"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerEnd}
            id="playground-svg-canvas"
          >
            {/* Vẽ hai cạnh của góc từ đỉnh B bằng nét chì gỗ graphite */}
            <line
              x1={pB.x}
              y1={pB.y}
              x2={pA.x}
              y2={pA.y}
              stroke="#475569"
              strokeWidth="4"
              strokeLinecap="round"
              id="pencil-line-ba"
            />
            <line
              x1={pB.x}
              y1={pB.y}
              x2={pC.x}
              y2={pC.y}
              stroke="#475569"
              strokeWidth="4"
              strokeLinecap="round"
              id="pencil-line-bc"
            />

            {/* Vẽ kí hiệu cung tròn góc bằng nét chì mảnh (không có ký hiệu góc vuông tự động) */}
            {(() => {
              const r1 = getVectorAngle(pB, pA);
              const r2 = getVectorAngle(pB, pC);
              const startAngle = Math.min(r1, r2);
              const endAngle = Math.max(r1, r2);
              const radius = 28;
              
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              const x1 = pB.x + radius * Math.cos(startRad);
              const y1 = pB.y + radius * Math.sin(startRad);
              const x2 = pB.x + radius * Math.cos(endRad);
              const y2 = pB.y + radius * Math.sin(endRad);
              
              const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
              
              return (
                <path
                  d={`M ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                />
              );
            })()}

            {/* Hiển thị bút chì khi đang vẽ (kéo thả các đầu mút) */}
            {activePoint && (() => {
              const activeCoords = activePoint === 'A' ? pA : activePoint === 'B' ? pB : pC;
              return (
                <g 
                  transform={`translate(${activeCoords.x}, ${activeCoords.y}) rotate(-30) translate(-5, -45)`} 
                  pointerEvents="none"
                  id="drawing-pencil-tool"
                >
                  {/* Tẩy màu hồng */}
                  <rect x="0" y="0" width="10" height="6" fill="#f43f5e" rx="1.5" />
                  {/* Vòng kim loại bạc */}
                  <rect x="0" y="6" width="10" height="4" fill="#cbd5e1" />
                  {/* Thân bút chì màu vàng */}
                  <rect x="0" y="10" width="10" height="25" fill="#f59e0b" />
                  {/* Phần gỗ vát nhọn */}
                  <polygon points="0,35 10,35 5,45" fill="#fed7aa" />
                  {/* Ngòi chì màu đậm */}
                  <polygon points="3.5,38 6.5,38 5,45" fill="#475569" />
                </g>
              );
            })()}

            {/* HIỂN THỊ BA ĐIỂM ĐẦU MÚT ĐỂ KÉO THẢ */}
            {/* Điểm A */}
            <g
              transform={`translate(${pA.x}, ${pA.y})`}
              onPointerDown={() => handlePointDragStart('A')}
              className="cursor-pointer group"
            >
              <circle cx="0" cy="0" r="12" fill="rgba(99, 102, 241, 0.2)" className="group-hover:scale-125 transition-transform" />
              <circle cx="0" cy="0" r="6" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="-14" textAnchor="middle" fill="#4f46e5" fontWeight="900" fontSize="16" className="font-sans">
                A
              </text>
            </g>

            {/* Điểm B (Đỉnh góc) */}
            <g
              transform={`translate(${pB.x}, ${pB.y})`}
              onPointerDown={() => handlePointDragStart('B')}
              className="cursor-pointer group"
            >
              <circle cx="0" cy="0" r="14" fill="rgba(239, 68, 68, 0.2)" className="group-hover:scale-125 transition-transform" />
              <circle cx="0" cy="0" r="8" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="24" textAnchor="middle" fill="#dc2626" fontWeight="900" fontSize="16" className="font-sans">
                B (Đỉnh)
              </text>
            </g>

            {/* Điểm C */}
            <g
              transform={`translate(${pC.x}, ${pC.y})`}
              onPointerDown={() => handlePointDragStart('C')}
              className="cursor-pointer group"
            >
              <circle cx="0" cy="0" r="12" fill="rgba(99, 102, 241, 0.2)" className="group-hover:scale-125 transition-transform" />
              <circle cx="0" cy="0" r="6" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="-14" textAnchor="middle" fill="#4f46e5" fontWeight="900" fontSize="16" className="font-sans">
                C
              </text>
            </g>

            {/* THƯỚC Ê-KE */}
            <g transform={`translate(${ekePos.x}, ${ekePos.y}) rotate(${ekeRot})`}>
              <path
                d="M 0,0 L 140,0 L 0,-210 Z M 22,-22 L 22,-150 L 95,-22 Z"
                fillRule="evenodd"
                fill={ekeCheck.isPerfectPlacement ? "rgba(16, 185, 129, 0.28)" : "rgba(245, 158, 11, 0.22)"}
                stroke={ekeCheck.isPerfectPlacement ? "#10b981" : "#d97706"}
                strokeWidth="3.5"
                strokeLinejoin="round"
                className="cursor-move filter drop-shadow-md hover:fill-opacity-30 transition-colors"
                onPointerDown={handleEkeDragStart}
                onTouchStart={handleEkeDragStart}
              />

              <circle cx="5" cy="-5" r="2.5" fill="#ef4444" />

              {/* VẠCH CHIA */}
              {Array.from({ length: 9 }).map((_, i) => {
                const x = i * 15;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`play-h-tick-${i}`}>
                    <line x1={x} y1="0" x2={x} y2={isMajor ? 8 : 4} stroke="#1e293b" strokeWidth={isMajor ? 1.2 : 0.8} />
                    {isMajor && i > 0 && (
                      <text x={x} y="16" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#475569" className="font-mono">
                        {i / 2}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* VẠCH CHIA DỌC */}
              {Array.from({ length: 13 }).map((_, i) => {
                const y = -i * 15;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`play-v-tick-${i}`}>
                    <line x1="0" y1={y} x2={isMajor ? -8 : -4} y2={y} stroke="#1e293b" strokeWidth={isMajor ? 1.2 : 0.8} />
                    {isMajor && i > 0 && (
                      <text x="-14" y={y + 3} fontSize="8" fontWeight="bold" textAnchor="middle" fill="#475569" className="font-mono">
                        {i / 2}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* TAY CẦM XOAY Ê-KE */}
            <line
              x1={ekePos.x}
              y1={ekePos.y}
              x2={globalHandle.x}
              y2={globalHandle.y}
              stroke={isRotatingEke ? "#10b981" : "#94a3b8"}
              strokeWidth="1.2"
              strokeDasharray="2,2"
            />
            <g
              transform={`translate(${globalHandle.x}, ${globalHandle.y})`}
              onPointerDown={handleEkeRotateStart}
              onTouchStart={handleEkeRotateStart}
              className="cursor-pointer group"
            >
              <circle cx="0" cy="0" r="15" fill="rgba(16, 185, 129, 0.15)" className="scale-100 group-hover:scale-125 transition-transform" />
              <circle cx="0" cy="0" r="10" fill={isRotatingEke ? "#10b981" : "#059669"} stroke="#ffffff" strokeWidth="2" />
              <path d="M -4,0 A 4,4 0 1,1 0,4 L -2,2" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        {/* BẢNG ĐIỀU KHIỂN ÊKE XOAY (DƯỚI TRANG TRÍ SIÊU GỌN) */}
        <div className="bg-slate-50 border-t border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                sound.playClick();
                setEkePos({ ...pB });
              }}
              className="py-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Khớp thước vào đỉnh B</span>
            </button>
            <button
              onClick={resetAll}
              className="py-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Làm mới bảng</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 pl-1">Xoay thước:</span>
            <button
              onClick={() => rotateManual('ccw', 5)}
              className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-black text-slate-700 w-8 text-center font-mono">
              {Math.round(ekeRot)}°
            </span>
            <button
              onClick={() => rotateManual('cw', 5)}
              className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* BẢNG ĐO GÓC & CHỈ SỐ (RIGHT SIDE - 5/12 COLS - KHÍT) */}
      <div className="lg:col-span-5 flex flex-col gap-3 h-full overflow-y-auto pr-1 text-left">
        
        {/* KHÔNG HIỂN THỊ THÔNG TIN GÓC VẼ SẴN - BÉ TỰ ĐO ĐỂ KHÁM PHÁ */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Pencil className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-black text-slate-800">Xưởng tập vẽ góc tự do ✏️</h2>
          </div>

          <p className="text-slate-600 text-xs font-semibold leading-relaxed">
            Bé hãy tự cầm chiếc <span className="text-amber-500 font-extrabold">bút chì</span> kéo các điểm 
            <span className="text-indigo-600 font-extrabold"> A</span>, 
            <span className="text-red-500 font-extrabold"> B (Đỉnh)</span>, và 
            <span className="text-indigo-600 font-extrabold"> C</span> để tạo thành các góc khác nhau nhé!
          </p>

          <p className="text-slate-500 text-[11px] font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            💡 <span className="font-bold text-slate-700">Thử thách dành cho bé:</span> Sau khi vẽ xong, bé hãy di chuyển và xoay thước ê-ke để kiểm tra xem góc mình vừa vẽ là góc vuông hay không vuông nhé!
          </p>

          {/* ĐẶT MẪU ĐỂ LUYỆN ĐO */}
          <div className="border-t border-slate-100 pt-3 mt-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tạo nhanh góc mẫu để luyện tập:</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={generatePerfectRightAngle}
                className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-rose-500" />
                <span>Góc vuông mẫu</span>
              </button>
              <button
                onClick={generateAcuteAngle}
                className="py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span>Góc nhọn mẫu</span>
              </button>
            </div>
          </div>
        </div>

        {/* HƯỚNG DẪN KHI ĐO KHỚP THÀNH CÔNG */}
        {ekeCheck.isVertexSnapped && ekeCheck.isEdgeAligned ? (
          <div className="p-3.5 rounded-2xl border bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg">🎓</span>
              <div className="text-xs">
                <h4 className="font-black text-emerald-950 mb-0.5">Đặt Ê-ke hoàn hảo!</h4>
                <p className="font-semibold leading-relaxed text-[11px] text-emerald-800">
                  Đỉnh thước trùng khít với đỉnh B và cạnh thước đã trùng khít với cạnh{' '}
                  {ekeCheck.alignedRayIndex === 1 ? 'BA' : 'BC'}. <br />
                  {currentAngle >= 88 && currentAngle <= 92 ? (
                    <span className="font-black text-rose-600 block mt-1">
                      ➔ Cạnh còn lại của góc cũng ôm khít Ê-ke. Bé đã vẽ thành công một GÓC VUÔNG!
                    </span>
                  ) : (
                    <span className="font-black text-indigo-700 block mt-1">
                      ➔ Cạnh còn lại bị lệch khỏi Ê-ke. Đây là một GÓC KHÔNG VUÔNG!
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5">
            <h3 className="text-xs font-black text-indigo-950 mb-1 flex items-center gap-1">
              <span>💡</span>
              <span>Cùng tập đo tự do:</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed text-left">
              Bé hãy kéo thước Ê-ke lại gần điểm <span className="text-red-500 font-extrabold">B (Đỉnh)</span> để thước tự hít khớp. Sau đó xoay sao cho một cạnh của thước trùng với cạnh BA hoặc BC nhé!
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
