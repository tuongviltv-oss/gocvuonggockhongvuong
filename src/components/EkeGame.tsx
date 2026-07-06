/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  RotateCw, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  Play, 
  Navigation, 
  Compass, 
  Info,
  Check,
  X,
  Trophy,
  History
} from 'lucide-react';
import { QUESTIONS } from '../data';
import { AngleQuestion, AngleType, Point, Difficulty, HistoryItem, LeaderboardItem } from '../types';
import { checkEkePlacement, distance, getVectorAngle, getAngleDifference } from '../utils';
import { sound } from './SoundManager';

interface EkeGameProps {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onPlaygroundClick: () => void;
  studentProfile: { name: string; className: string; avatar: string };
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  leaderboard: LeaderboardItem[];
}

export default function EkeGame({ 
  score, 
  setScore, 
  onPlaygroundClick,
  studentProfile,
  history,
  addHistoryItem,
  leaderboard
}: EkeGameProps) {
  // Trạng thái mức độ khó của học sinh
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('Dễ');

  // Lọc câu hỏi theo cấp độ đã chọn
  const levelQuestions = QUESTIONS.filter(q => q.difficulty === selectedDiff);

  // Chỉ số câu hỏi hiện tại trong cấp độ
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const question = levelQuestions[currentIdx] || levelQuestions[0];

  // Trạng thái của thước ê-ke
  const [ekePos, setEkePos] = useState<Point>({ x: 120, y: 310 });
  const [ekeRot, setEkeRot] = useState<number>(0); // góc xoay bằng độ

  // Trạng thái kéo thả (Drag)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Trạng thái xoay thước (Rotate)
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [initialRotAngle, setInitialRotAngle] = useState<number>(0);
  const [initialEkeRot, setInitialEkeRot] = useState<number>(0);

  // Lựa chọn đáp án của học sinh
  const [selectedAnswer, setSelectedAnswer] = useState<AngleType | null>(null);
  
  // Trạng thái phản hồi và kết quả
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  
  // Chuỗi trả lời đúng liên tiếp (Streak)
  const [streak, setStreak] = useState<number>(0);

  // Trạng thái tự động làm mẫu (Demo Guide)
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Thử điều hướng tab widget ở bên dưới (Bảng xếp hạng vs Lịch sử)
  const [activeSideTab, setActiveSideTab] = useState<'leaderboard' | 'history'>('leaderboard');

  // Tham chiếu đến phần tử SVG để tính toán tọa độ chính xác
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Reset trạng thái êke và câu trả lời khi thay đổi câu hỏi hoặc thay đổi cấp độ khó
  useEffect(() => {
    resetQuestionState();
  }, [currentIdx, selectedDiff]);

  const resetQuestionState = () => {
    // Đặt thước ở vị trí ban đầu bên trái
    setEkePos({ x: 110, y: 220 });
    setEkeRot(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setMessage('');
    setIsAnimating(false);
  };

  // Tính toán kết quả kiểm tra vị trí đặt thước hiện tại
  const ekeCheck = checkEkePlacement(ekePos, ekeRot, question.vertex, question.p1, question.p2);

  // Tự động "hít" (snap) khi ê-ke đến đủ gần đỉnh hoặc góc trùng khớp
  useEffect(() => {
    if (isDragging || isRotating || isAnimating) return;

    let updated = false;
    let newPos = { ...ekePos };
    let newRot = ekeRot;

    // 1. Hít đỉnh
    if (ekeCheck.isVertexClose && !ekeCheck.isVertexSnapped) {
      newPos = { ...question.vertex };
      updated = true;
    }

    // 2. Hít góc xoay (chỉ khi đỉnh đã khớp hoặc rất gần đỉnh)
    if (ekeCheck.isVertexClose && ekeCheck.isEdgeAligned && Math.abs(ekeRot - ekeCheck.snappedRotation) > 0.1) {
      newRot = ekeCheck.snappedRotation;
      updated = true;
    }

    if (updated) {
      setEkePos(newPos);
      setEkeRot(newRot);
      sound.playSnap();
    }
  }, [isDragging, isRotating, ekePos, ekeRot, question, isAnimating]);

  // Chuyển đổi tọa độ chuột/touch trên màn hình thành tọa độ cục bộ trong SVG
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

  // --- SỰ KIỆN KÉO THẢ THƯỚC (DRAG) ---
  const handleDragStart = (e: React.MouseEvent<SVGPathElement> | React.TouchEvent<SVGPathElement>) => {
    if (isAnimating) return;
    e.preventDefault();
    sound.playClick();
    const coords = getSVGCoords(e);
    
    setDragOffset({
      x: coords.x - ekePos.x,
      y: coords.y - ekePos.y
    });
    setIsDragging(true);
  };

  // --- SỰ KIỆN XOAY THƯỚC (ROTATE) ---
  const handleRotateStart = (e: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>) => {
    if (isAnimating) return;
    e.preventDefault();
    e.stopPropagation();
    sound.playClick();
    const coords = getSVGCoords(e);
    
    const angle = getVectorAngle(ekePos, coords);
    setInitialRotAngle(angle);
    setInitialEkeRot(ekeRot);
    setIsRotating(true);
  };

  // --- SỰ KIỆN MOVE CHUNG ---
  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (isAnimating) return;
    if (isDragging) {
      const coords = getSVGCoords(e);
      let targetX = coords.x - dragOffset.x;
      let targetY = coords.y - dragOffset.y;
      
      targetX = Math.max(10, Math.min(790, targetX));
      targetY = Math.max(10, Math.min(410, targetY));
      
      setEkePos({ x: targetX, y: targetY });
    } else if (isRotating) {
      const coords = getSVGCoords(e);
      const currentAngle = getVectorAngle(ekePos, coords);
      const angleDiff = currentAngle - initialRotAngle;
      
      let nextRot = (initialEkeRot + angleDiff) % 360;
      if (nextRot < 0) nextRot += 360;
      
      setEkeRot(nextRot);
    }
  };

  const handlePointerEnd = () => {
    setIsDragging(false);
    setIsRotating(false);
  };

  // Xoay thước mịn bằng nút bấm
  const rotateManual = (direction: 'cw' | 'ccw', step: number = 5) => {
    if (isAnimating) return;
    sound.playClick();
    let change = direction === 'cw' ? step : -step;
    let nextRot = (ekeRot + change) % 360;
    if (nextRot < 0) nextRot += 360;
    setEkeRot(nextRot);
  };

  const setQuickRotation = (deg: number) => {
    if (isAnimating) return;
    sound.playClick();
    setEkeRot(deg);
  };

  const snapToVertexQuick = () => {
    if (isAnimating) return;
    sound.playClick();
    setEkePos({ ...question.vertex });
  };

  // --- TỰ ĐỘNG CHẠY HƯỚNG DẪN ĐO ---
  const playGuideDemo = () => {
    if (isAnimating) return;
    sound.playClick();
    setIsAnimating(true);
    setShowExplanation(false);

    const startX = ekePos.x;
    const startY = ekePos.y;
    const startR = ekeRot;

    const endX = question.vertex.x;
    const endY = question.vertex.y;
    
    let endR = question.rotationGuides[0];
    let minDiff = getAngleDifference(startR, endR);
    for (let i = 1; i < question.rotationGuides.length; i++) {
      const diff = getAngleDifference(startR, question.rotationGuides[i]);
      if (diff < minDiff) {
        minDiff = diff;
        endR = question.rotationGuides[i];
      }
    }

    let adjustedStartR = startR;
    if (endR - startR > 180) {
      adjustedStartR += 360;
    } else if (startR - endR > 180) {
      adjustedStartR -= 360;
    }

    const duration = 1000; // 1 giây cho mượt mà nhanh hơn
    const startTime = performance.now();

    const animateStep = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const curX = startX + (endX - startX) * ease;
      const curY = startY + (endY - startY) * ease;
      const curR = adjustedStartR + (endR - adjustedStartR) * ease;

      setEkePos({ x: curX, y: curY });
      setEkeRot((curR + 360) % 360);

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      } else {
        setIsAnimating(false);
        sound.playSnap();
      }
    };

    requestAnimationFrame(animateStep);
  };

  // --- KIỂM TRA ĐÁP ÁN ---
  const handleCheckAnswer = () => {
    sound.playClick();
    
    if (!selectedAnswer) {
      setMessage('Bé hãy chọn xem đây là "Góc vuông" hay "Góc không vuông" trước nhé!');
      return;
    }

    const check = checkEkePlacement(ekePos, ekeRot, question.vertex, question.p1, question.p2);

    if (!check.isVertexClose) {
      setIsCorrect(false);
      setIsAnswerChecked(true);
      setMessage('Đặt thước chưa đúng đỉnh rồi bé ơi! Kéo đỉnh ê-ke trùng vào đỉnh ' + question.vertexName + ' nhé.');
      sound.playError();
      
      // Ghi lịch sử thất bại do chưa đúng vị trí
      addHistoryItem({
        questionTitle: question.title,
        difficulty: selectedDiff,
        isCorrect: false,
        userAnswer: selectedAnswer,
        correctType: question.correctType
      });
      return;
    }

    if (!check.isEdgeAligned) {
      setIsCorrect(false);
      setIsAnswerChecked(true);
      setMessage('Chưa khớp cạnh góc rồi bé ơi! Hãy giữ tay cầm màu xanh lá và xoay thước trùng khít 1 cạnh của góc nhé.');
      sound.playError();

      // Ghi lịch sử thất bại do chưa khít cạnh
      addHistoryItem({
        questionTitle: question.title,
        difficulty: selectedDiff,
        isCorrect: false,
        userAnswer: selectedAnswer,
        correctType: question.correctType
      });
      return;
    }

    const isUserCorrect = selectedAnswer === question.correctType;
    setIsCorrect(isUserCorrect);
    setIsAnswerChecked(true);
    
    if (isUserCorrect) {
      setScore(prev => prev + 10);
      setStreak(prev => prev + 1);
      setShowExplanation(true);
      setMessage('Bé chọn chính xác rồi! Bé giỏi quá! 🎉 +10 điểm');
      sound.playSuccess();
    } else {
      setMessage('Đặt thước đúng rồi nhưng đáp án chưa chính xác. Bé xem hai cạnh của góc có ôm sát thước ê-ke không nhé!');
      sound.playError();
      setStreak(0);
    }

    // GHI LỊCH SỬ LÀM BÀI
    addHistoryItem({
      questionTitle: question.title,
      difficulty: selectedDiff,
      isCorrect: isUserCorrect,
      userAnswer: selectedAnswer,
      correctType: question.correctType
    });
  };

  const showAnswerDirectly = () => {
    sound.playClick();
    const idealRot = question.rotationGuides[0];
    setEkePos({ ...question.vertex });
    setEkeRot(idealRot);
    setSelectedAnswer(question.correctType);
    setIsCorrect(true);
    setIsAnswerChecked(true);
    setShowExplanation(true);
    setMessage('Đây là cách đặt thước và đáp án chuẩn. Bé xem để học tập nhé!');
    sound.playSuccess();
  };

  const handleNextQuestion = () => {
    sound.playClick();
    if (currentIdx < levelQuestions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      sound.playSuccess();
      sound.playFirework();
      alert(`🎉 Tuyệt vời! Bé đã xuất sắc vượt qua toàn bộ thử thách mức độ ${selectedDiff}! Hãy chọn mức độ khó hơn để thử tài nhé!`);
    }
  };

  const handlePrevQuestion = () => {
    sound.playClick();
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    sound.playClick();
    setSelectedDiff(diff);
    setCurrentIdx(0);
  };

  // Tính tọa độ tay cầm xoay của êke
  const rad = (ekeRot * Math.PI) / 180;
  const localHandle = { x: 70, y: -105 };
  const globalHandle = {
    x: ekePos.x + localHandle.x * Math.cos(rad) - localHandle.y * Math.sin(rad),
    y: ekePos.y + localHandle.x * Math.sin(rad) + localHandle.y * Math.cos(rad)
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-stretch overflow-hidden" id="eke-game-container">
      
      {/* KHU VỰC LÀM BÀI CHÍNH (BÊN TRÁI - 7/12 COLS - TỐI ƯU CHIỀU CAO) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-slate-200 shadow flex flex-col justify-between overflow-hidden relative" id="interactive-screen">
        
        {/* Tiêu đề góc snap */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center text-slate-700 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-indigo-500 animate-spin-slow" />
            <span className="text-xs font-black text-slate-800">Khung thực hành vẽ & đo góc</span>
          </div>
          <div className="flex items-center gap-1.5">
            {ekeCheck.isVertexSnapped ? (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Đã khớp đỉnh {question.vertexName}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">Chưa khớp đỉnh</span>
            )}
            {ekeCheck.isEdgeAligned ? (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Khớp cạnh
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">Chưa khớp cạnh</span>
            )}
          </div>
        </div>

        {/* Khung vẽ SVG chính */}
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
            id="geometry-svg-canvas"
          >
            {/* VẼ GÓC BÀI TẬP */}
            <line
              x1={question.vertex.x}
              y1={question.vertex.y}
              x2={question.p1.x}
              y2={question.p1.y}
              stroke="#ea580c"
              strokeWidth="5"
              strokeLinecap="round"
              id="angle-ray-1"
            />
            <line
              x1={question.vertex.x}
              y1={question.vertex.y}
              x2={question.p2.x}
              y2={question.p2.y}
              stroke="#ea580c"
              strokeWidth="5"
              strokeLinecap="round"
              id="angle-ray-2"
            />

            {/* Kí hiệu góc vuông màu đỏ */}
            {isCorrect && question.correctType === 'Góc vuông' && (
              <g id="right-angle-symbol">
                {(() => {
                  const r1 = getVectorAngle(question.vertex, question.p1);
                  const r2 = getVectorAngle(question.vertex, question.p2);
                  const baseRad = (r2 * Math.PI) / 180;
                  const perpRad = (r1 * Math.PI) / 180;
                  const size = 26;

                  const pA = {
                    x: question.vertex.x + size * Math.cos(baseRad),
                    y: question.vertex.y + size * Math.sin(baseRad)
                  };
                  const pB = {
                    x: question.vertex.x + size * Math.cos(perpRad),
                    y: question.vertex.y + size * Math.sin(perpRad)
                  };
                  const pC = {
                    x: pA.x + size * Math.cos(perpRad),
                    y: pA.y + size * Math.sin(perpRad)
                  };

                  return (
                    <path
                      d={`M ${pA.x},${pA.y} L ${pC.x},${pC.y} L ${pB.x},${pB.y}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })()}
                <text
                  x={question.vertex.x + 22}
                  y={question.vertex.y - 25}
                  fill="#ef4444"
                  fontWeight="900"
                  fontSize="15"
                  className="font-sans"
                >
                  Góc vuông
                </text>
              </g>
            )}

            {/* Kí hiệu góc không vuông */}
            {isCorrect && question.correctType === 'Góc không vuông' && (
              <g id="non-right-angle-symbol">
                {(() => {
                  const r1 = getVectorAngle(question.vertex, question.p1);
                  const r2 = getVectorAngle(question.vertex, question.p2);
                  const startAngle = Math.min(r1, r2);
                  const endAngle = Math.max(r1, r2);
                  const radius = 32;
                  
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  
                  const x1 = question.vertex.x + radius * Math.cos(startRad);
                  const y1 = question.vertex.y + radius * Math.sin(startRad);
                  const x2 = question.vertex.x + radius * Math.cos(endRad);
                  const y2 = question.vertex.y + radius * Math.sin(endRad);
                  
                  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
                  
                  return (
                    <path
                      d={`M ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                    />
                  );
                })()}
                <text
                  x={question.vertex.x + 22}
                  y={question.vertex.y - 25}
                  fill="#3b82f6"
                  fontWeight="900"
                  fontSize="14"
                >
                  Không vuông
                </text>
              </g>
            )}

            {/* Đỉnh và tên nhãn */}
            <circle cx={question.vertex.x} cy={question.vertex.y} r="7" fill="#1e293b" />
            <text
              x={question.vertex.x}
              y={question.vertex.y + 24}
              textAnchor="middle"
              fill="#15803d"
              fontWeight="900"
              fontSize="20"
              className="font-sans filter drop-shadow-sm select-none"
            >
              {question.vertexName}
            </text>

            <circle cx={question.p1.x} cy={question.p1.y} r="5" fill="#1e293b" />
            <text
              x={question.p1.x - 12}
              y={question.p1.y - 10}
              textAnchor="middle"
              fill="#15803d"
              fontWeight="900"
              fontSize="20"
              className="font-sans select-none"
            >
              {question.side1Name}
            </text>

            <circle cx={question.p2.x} cy={question.p2.y} r="5" fill="#1e293b" />
            <text
              x={question.p2.x + 12}
              y={question.p2.y - 10}
              textAnchor="middle"
              fill="#15803d"
              fontWeight="900"
              fontSize="20"
              className="font-sans select-none"
            >
              {question.side2Name}
            </text>

            {/* THƯỚC Ê-KE */}
            <g
              transform={`translate(${ekePos.x}, ${ekePos.y}) rotate(${ekeRot})`}
              id="eke-ruler-group"
            >
              {ekeCheck.isVertexClose && !ekeCheck.isVertexSnapped && (
                <circle
                  cx="0"
                  cy="0"
                  r="12"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                  className="animate-ping"
                />
              )}

              <path
                d="M 0,0 L 140,0 L 0,-210 Z M 22,-22 L 22,-150 L 95,-22 Z"
                fillRule="evenodd"
                fill={ekeCheck.isPerfectPlacement ? "rgba(16, 185, 129, 0.28)" : "rgba(245, 158, 11, 0.22)"}
                stroke={ekeCheck.isPerfectPlacement ? "#10b981" : "#d97706"}
                strokeWidth="3.5"
                strokeLinejoin="round"
                className="cursor-move filter drop-shadow-md hover:fill-opacity-30 transition-colors"
                onPointerDown={handleDragStart}
                onTouchStart={handleDragStart}
                id="eke-body-path"
              />

              <circle cx="5" cy="-5" r="2.5" fill="#ef4444" />

              {/* VẠCH CHIA CENTIMET */}
              {Array.from({ length: 9 }).map((_, i) => {
                const x = i * 15;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`h-tick-${i}`}>
                    <line x1={x} y1="0" x2={x} y2={isMajor ? 8 : 4} stroke="#1e293b" strokeWidth={isMajor ? 1.2 : 0.8} />
                    {isMajor && i > 0 && (
                      <text x={x} y="16" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#475569" className="font-mono">
                        {i / 2}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* VẠCH CHIA CẠNH DỌC */}
              {Array.from({ length: 13 }).map((_, i) => {
                const y = -i * 15;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`v-tick-${i}`}>
                    <line x1="0" y1={y} x2={isMajor ? -8 : -4} y2={y} stroke="#1e293b" strokeWidth={isMajor ? 1.2 : 0.8} />
                    {isMajor && i > 0 && (
                      <text x="-14" y={y + 3} fontSize="8" fontWeight="bold" textAnchor="middle" fill="#475569" className="font-mono">
                        {i / 2}
                      </text>
                    )}
                  </g>
                );
              })}

              <text
                x="35"
                textAnchor="middle"
                y="-50"
                fontSize="10"
                fontWeight="900"
                fill={ekeCheck.isPerfectPlacement ? "#10b981" : "#d97706"}
                className="font-sans select-none tracking-wider opacity-85"
                transform="rotate(-56)"
              >
                Ê-KE
              </text>
            </g>

            {/* TAY CẦM XOAY NỔI */}
            <line
              x1={ekePos.x}
              y1={ekePos.y}
              x2={globalHandle.x}
              y2={globalHandle.y}
              stroke={isRotating ? "#10b981" : "#94a3b8"}
              strokeWidth="1.2"
              strokeDasharray="2,2"
              id="rotation-handle-line"
            />
            <g
              transform={`translate(${globalHandle.x}, ${globalHandle.y})`}
              onPointerDown={handleRotateStart}
              onTouchStart={handleRotateStart}
              className="cursor-pointer group"
              id="rotation-handle-group"
            >
              <circle cx="0" cy="0" r="15" fill="rgba(16, 185, 129, 0.15)" className="scale-100 group-hover:scale-125 transition-transform" />
              <circle cx="0" cy="0" r="10" fill={isRotating ? "#10b981" : "#059669"} stroke="#ffffff" strokeWidth="2" className="shadow" />
              <path d="M -4,0 A 4,4 0 1,1 0,4 L -2,2" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* PHÁO HOA ĂN MỪNG */}
            {isCorrect && (
              <g id="sparkle-effects">
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 360) / 12;
                  const rad = (angle * Math.PI) / 180;
                  const dist = 80;
                  const destX = question.vertex.x + dist * Math.cos(rad);
                  const destY = question.vertex.y + dist * Math.sin(rad);
                  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];
                  const randomColor = colors[i % colors.length];

                  return (
                    <motion.circle
                      key={`confetti-${i}`}
                      cx={question.vertex.x}
                      cy={question.vertex.y}
                      r="4"
                      fill={randomColor}
                      animate={{
                        cx: [question.vertex.x, destX],
                        cy: [question.vertex.y, destY],
                        opacity: [1, 0],
                        scale: [1, 1.3, 0]
                      }}
                      transition={{
                        duration: 1.0,
                        ease: 'easeOut',
                        repeat: Infinity,
                        repeatDelay: 0.4
                      }}
                    />
                  );
                })}
              </g>
            )}
          </svg>

          {/* NHÃN GỢI Ý ĐẶT THƯỚC */}
          {!ekeCheck.isVertexClose && !isDragging && !isAnswerChecked && (
            <div className="absolute left-4 bottom-4 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
              <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>Kéo đỉnh góc vuông màu đỏ của thước vào đỉnh góc cần đo!</span>
            </div>
          )}
        </div>

        {/* CÔNG CỤ ĐIỀU KHIỂN ÊKE NHANH (NẰM NGANG SIÊU COMPACT) */}
        <div className="bg-slate-50 border-t border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0" id="eke-quick-controls">
          
          <div className="flex gap-1.5">
            <button
              onClick={snapToVertexQuick}
              className="py-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3 h-3 text-indigo-500" />
              <span>Khớp đỉnh {question.vertexName}</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setEkePos({ x: 110, y: 220 });
                setEkeRot(0);
              }}
              className="py-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Đặt lại thước</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 pl-1">Xoay ê-ke:</span>
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
          
          <div className="flex gap-1">
            {[0, 90, 180, 270].map(deg => (
              <button
                key={`quick-rot-${deg}`}
                onClick={() => setQuickRotation(deg)}
                className={`px-1.5 py-0.5 text-[9px] font-black rounded border transition-all cursor-pointer ${
                  ekeRot === deg 
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* BẢNG ĐIỀU KHIỂN, KẾT QUẢ, HƯỚNG DẪN (BÊN PHẢI - 5/12 COLS - KHÍT KHÔNG CUỘN) */}
      <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto pr-1 gap-2.5 pb-1" id="control-board">
        
        {/* 1. CHỌN MỨC ĐỘ KHÓ (EASY, MEDIUM, HARD TABS) */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl border-2 border-slate-200 flex-shrink-0" id="difficulty-switcher">
          {(['Dễ', 'Trung bình', 'Khó'] as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => handleDifficultyChange(diff)}
              className={`py-1.5 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedDiff === diff
                  ? diff === 'Dễ'
                    ? 'bg-emerald-500 text-white shadow'
                    : diff === 'Trung bình'
                      ? 'bg-amber-500 text-white shadow'
                      : 'bg-rose-500 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>{diff === 'Dễ' ? '🌱' : diff === 'Trung bình' ? '⚡' : '🔥'}</span>
              <span>{diff}</span>
            </button>
          ))}
        </div>

        {/* 2. THÔNG TIN CÂU HỎI VÀ ĐÁP ÁN */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow flex flex-col gap-2 flex-shrink-0" id="question-card">
          <div className="flex justify-between items-center">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase leading-none ${
              selectedDiff === 'Dễ' ? 'bg-emerald-100 text-emerald-800' : selectedDiff === 'Trung bình' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              Thử thách {currentIdx + 1} / {levelQuestions.length}
            </span>
            <div className="flex items-center gap-1 text-rose-500 font-extrabold text-xs">
              <Sparkles className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Chuỗi: {streak}</span>
            </div>
          </div>

          <h2 className="text-base font-black text-slate-800 leading-tight" id="question-title">
            {question.title}
          </h2>
          <p className="text-xs font-medium text-slate-500 leading-normal" id="question-subtitle">
            {question.subtitle}
          </p>

          {/* CHỌN ĐÁP ÁN (DỄ THƯƠNG CHO HỌC SINH LỚP 3) */}
          <div className="grid grid-cols-2 gap-2 mt-1" id="answer-choices">
            <button
              onClick={() => {
                if (isAnswerChecked && isCorrect) return;
                sound.playClick();
                setSelectedAnswer('Góc vuông');
              }}
              className={`p-2.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedAnswer === 'Góc vuông'
                  ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="text-rose-500 text-sm font-black">∟</span>
              <span>Góc vuông</span>
            </button>

            <button
              onClick={() => {
                if (isAnswerChecked && isCorrect) return;
                sound.playClick();
                setSelectedAnswer('Góc không vuông');
              }}
              className={`p-2.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedAnswer === 'Góc không vuông'
                  ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="text-sky-500 text-sm font-black">∠</span>
              <span>Góc không vuông</span>
            </button>
          </div>

          {/* NHÓM NÚT NỘP BÀI / GIẢI ĐÁP */}
          <div className="flex flex-col gap-2 mt-2" id="action-buttons">
            <button
              onClick={handleCheckAnswer}
              disabled={isAnimating}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-black text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                isAnimating 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-150'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kiểm tra kết quả</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={playGuideDemo}
                disabled={isAnimating}
                className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hướng dẫn đo</span>
              </button>
              
              <button
                onClick={showAnswerDirectly}
                disabled={isAnimating}
                className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 text-amber-500" />
                <span>Xem đáp án</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. LỜI GIẢI CHI TIẾT KHI ĐÚNG / SAI */}
        <AnimatePresence mode="wait">
          {isAnswerChecked && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`p-3 rounded-2xl border-2 shadow-sm flex-shrink-0 ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
              id="feedback-panel"
            >
              <div className="flex items-start gap-2 text-xs">
                <span className="text-lg leading-none">{isCorrect ? '🦁' : '🦊'}</span>
                <div className="flex-1 text-left">
                  <h4 className="font-black text-xs mb-0.5 text-slate-800">
                    {isCorrect ? 'Tuyệt vời bé ơi!' : 'Bé chú ý nhé:'}
                  </h4>
                  <p className="font-bold text-[11px] leading-normal">{message}</p>
                  
                  {showExplanation && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 text-[10px] leading-relaxed text-emerald-800 font-semibold bg-emerald-100/20 p-2 rounded-lg">
                      <span className="font-black block text-emerald-900 mb-0.5">💡 Cùng ôn bài lớp 3:</span>
                      {question.explanation}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. ĐIỀU HƯỚNG CÂU HỎI */}
        <div className="flex justify-between items-center bg-white p-2.5 rounded-2xl border-2 border-slate-200 shadow-sm flex-shrink-0" id="question-navigation">
          <button
            onClick={handlePrevQuestion}
            disabled={currentIdx === 0}
            className={`py-1.5 px-3 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
              currentIdx === 0
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Câu trước</span>
          </button>

          <span className="text-slate-500 font-extrabold text-xs font-mono">
            {currentIdx + 1} / {levelQuestions.length}
          </span>

          <button
            onClick={handleNextQuestion}
            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span>{currentIdx === levelQuestions.length - 1 ? 'Xong rồi!' : 'Câu tiếp'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. TIỆN ÍCH PHÍA DƯỚI (BẢNG XẾP HẠNG THI ĐUA VS LỊCH SỬ) - CỐ ĐỊNH CHIỀU CAO ĐỂ TRÁNH TRÀN TRANG */}
        <div className="flex-1 min-h-[140px] max-h-[190px] flex flex-col bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden" id="leaderboard-history-tabs">
          
          {/* Thanh lựa chọn Tab */}
          <div className="flex border-b border-slate-200 bg-slate-100/80 text-xs flex-shrink-0">
            <button
              onClick={() => {
                sound.playClick();
                setActiveSideTab('leaderboard');
              }}
              className={`flex-1 py-1.5 font-black flex items-center justify-center gap-1 border-r border-slate-200 cursor-pointer ${
                activeSideTab === 'leaderboard'
                  ? 'bg-white text-indigo-700 font-black border-t-2 border-t-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Bảng thi đua 🏆</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveSideTab('history');
              }}
              className={`flex-1 py-1.5 font-black flex items-center justify-center gap-1 cursor-pointer ${
                activeSideTab === 'history'
                  ? 'bg-white text-indigo-700 font-black border-t-2 border-t-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Lịch sử của bé 🎒</span>
            </button>
          </div>

          {/* Nội dung của Tab */}
          <div className="flex-1 overflow-y-auto p-2">
            <AnimatePresence mode="wait">
              {activeSideTab === 'leaderboard' ? (
                <motion.div
                  key="tab-leaderboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-1.5"
                >
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-5 px-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <span className="text-xl block mb-1">🏅</span>
                      <p className="text-[10px] font-bold text-slate-500 leading-normal">
                        Chưa có bạn nào ghi điểm trên máy này! <br />
                        Bé hãy tích cực trả lời để được ghi tên lên bảng vàng nhé! 🥰
                      </p>
                    </div>
                  ) : (
                    leaderboard.map((player, idx) => (
                      <div 
                        key={player.id} 
                        className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl border text-[11px] ${
                          player.isCurrentUser 
                            ? 'bg-amber-100/80 border-amber-400 font-black shadow-sm' 
                            : 'bg-white border-slate-150 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Hạng */}
                          <span className={`w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center ${
                            idx === 0 
                              ? 'bg-yellow-400 text-yellow-950' 
                              : idx === 1 
                                ? 'bg-slate-300 text-slate-800' 
                                : idx === 2 
                                  ? 'bg-amber-600 text-white' 
                                  : 'bg-slate-100 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                          
                          {/* Avatar */}
                          <span>{player.avatar}</span>
                          
                          {/* Tên */}
                          <span className="truncate max-w-[120px] font-extrabold">
                            {player.isCurrentUser ? `${player.name} (Bé)` : player.name}
                          </span>
                          
                          {/* Lớp */}
                          <span className="text-[9px] text-slate-400 font-bold">{player.className}</span>
                        </div>

                        {/* Điểm */}
                        <span className="font-mono font-black text-indigo-600 text-[11px]">
                          {player.score} điểm
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-1 text-[11px] h-full"
                >
                  {history.length === 0 ? (
                    <div className="text-slate-400 font-bold py-6 text-center text-[10px]">
                      Bé chưa có lịch sử làm bài. <br /> Cùng thử tài đo góc để lưu lịch sử nhé! 📝
                    </div>
                  ) : (
                    history.map((hist) => (
                      <div 
                        key={hist.id} 
                        className="flex items-center justify-between py-1.5 px-2 border border-slate-150 rounded-xl bg-white shadow-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          {hist.isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          )}
                          <div className="text-left">
                            <span className="font-extrabold text-slate-800 line-clamp-1">
                              {hist.questionTitle}
                            </span>
                            <span className="text-[8px] text-slate-400 block font-bold leading-none mt-0.5">
                              {hist.timestamp} • Đáp án: {hist.userAnswer}
                            </span>
                          </div>
                        </div>

                        {/* Mức độ */}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded leading-none ${
                          hist.difficulty === 'Dễ' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : hist.difficulty === 'Trung bình' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {hist.difficulty}
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
