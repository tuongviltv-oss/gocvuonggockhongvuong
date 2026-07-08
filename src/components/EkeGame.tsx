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
  History,
  Trophy,
  Users,
  RefreshCw
} from 'lucide-react';
import { QUESTIONS } from '../data';
import { AngleQuestion, AngleType, Point, Difficulty, HistoryItem } from '../types';
import { checkEkePlacement, distance, getVectorAngle, getAngleDifference } from '../utils';
import { sound } from './SoundManager';
import { fetchLeaderboard, LeaderboardEntry, submitLeaderboardScore } from '../lib/firestore';

const formatSecondsShort = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

interface EkeGameProps {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onPlaygroundClick: () => void;
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  studentName: string;
  studentClass: string;
  elapsedSeconds: number;
}

export default function EkeGame({ 
  score, 
  setScore, 
  onPlaygroundClick,
  history,
  addHistoryItem,
  studentName,
  studentClass,
  elapsedSeconds
}: EkeGameProps) {
  // Trạng thái mức độ khó của học sinh (ở Chế độ học tập)
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('Dễ');

  // --- TRẠNG THÁI CHẾ ĐỘ CHƠI MỚI CHUYÊN NGHIỆP ---
  const [gameMode, setGameMode] = useState<'select' | 'practice' | 'adventure'>('select');
  const [advLevel, setAdvLevel] = useState<number | null>(null); // null: màn hình bản đồ đảo, 0-11: chỉ số đảo đang chơi
  const [advUnlocked, setAdvUnlocked] = useState<boolean[]>(() => {
    const saved = localStorage.getItem('eke_adv_unlocked');
    if (saved) return JSON.parse(saved);
    const initial = Array(QUESTIONS.length).fill(false);
    initial[0] = true; // Đảo 1 luôn mở khóa sẵn
    return initial;
  });
  const [advStars, setAdvStars] = useState<number[]>(() => {
    const saved = localStorage.getItem('eke_adv_stars');
    return saved ? JSON.parse(saved) : Array(QUESTIONS.length).fill(0);
  });
  const [advLives, setAdvLives] = useState<number>(3);
  const [advTimeLeft, setAdvTimeLeft] = useState<number>(40);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isLevelVictory, setIsLevelVictory] = useState<boolean>(false);
  const [victoryStars, setVictoryStars] = useState<number>(3);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [companionComment, setCompanionComment] = useState<string>('Chào bé! Hãy kéo thước đo góc để cùng tớ tìm kho báu nhé! 🐼');

  // Lưu tiến trình chơi game của bé vào localStorage
  useEffect(() => {
    localStorage.setItem('eke_adv_unlocked', JSON.stringify(advUnlocked));
  }, [advUnlocked]);

  useEffect(() => {
    localStorage.setItem('eke_adv_stars', JSON.stringify(advStars));
  }, [advStars]);

  // Lọc câu hỏi theo cấp độ đã chọn (chế độ luyện tập)
  const levelQuestions = QUESTIONS.filter(q => q.difficulty === selectedDiff);

  // Chỉ số câu hỏi hiện tại trong cấp độ (chế độ luyện tập)
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Lấy câu hỏi tương ứng dựa trên chế độ hiện tại
  const question = gameMode === 'adventure' && advLevel !== null
    ? QUESTIONS[advLevel]
    : (levelQuestions[currentIdx] || levelQuestions[0]);

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

  // Trạng thái Bảng xếp hạng thực tế từ Firestore
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Hàm tải dữ liệu bảng xếp hạng
  const loadLeaderboardData = async () => {
    setIsLoadingLeaderboard(true);
    setLeaderboardError(null);
    try {
      const data = await fetchLeaderboard();
      setLeaderboardEntries(data);
    } catch (err) {
      console.error("Lỗi tải BXH:", err);
      setLeaderboardError("Không thể tải bảng xếp hạng thực tế.");
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Tải bảng xếp hạng khi tab thay đổi hoặc khi màn hình mở ra
  useEffect(() => {
    if (activeSideTab === 'leaderboard') {
      loadLeaderboardData();
    }
  }, [activeSideTab, score]);

  // Tham chiếu đến phần tử SVG để tính toán tọa độ chính xác
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Reset trạng thái êke và câu trả lời khi thay đổi câu hỏi, chế độ, hoặc thay đổi cấp độ khó
  useEffect(() => {
    resetQuestionState();
  }, [currentIdx, selectedDiff, advLevel, gameMode]);

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

  // Cài đặt ban đầu khi bắt đầu chơi hòn đảo trong game phiêu lưu
  useEffect(() => {
    if (gameMode === 'adventure' && advLevel !== null) {
      setAdvTimeLeft(40);
      setAdvLives(3);
      setIsGameOver(false);
      setIsLevelVictory(false);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
      setIsCorrect(false);
      setMessage('');
      
      const welcomes = [
        'Chào bé! Hãy kéo thước đo xem góc này là góc vuông hay không vuông nhé! 🐼',
        'Góc này trông thật thú vị! Bé hãy đặt đỉnh thước khớp vào đỉnh góc để kiểm tra nhé! 🐼',
        'Cố lên bé ơi! Xoay thước ê-ke trùng với một cạnh của góc để có đáp án nhé! 🌟',
        'Đảo này có một góc rất đặc biệt đấy, bé hãy tinh mắt đặt thước nha! 🐼'
      ];
      setCompanionComment(welcomes[advLevel % welcomes.length]);
    }
  }, [gameMode, advLevel]);

  // Bộ đếm thời gian cho chế độ Trò chơi phiêu lưu
  useEffect(() => {
    if (gameMode !== 'adventure' || advLevel === null || isLevelVictory || isGameOver) return;

    const timer = setInterval(() => {
      setAdvTimeLeft(prev => {
        if (prev <= 1) {
          // Hết giờ! Mất 1 mạng
          sound.playError();
          setAdvLives(lives => {
            const nextLives = lives - 1;
            if (nextLives <= 0) {
              setIsGameOver(true);
              setCompanionComment('Ôi không, hết thời gian và hết tim rồi! Bé hãy chơi lại đảo này nhé! ❤️');
            } else {
              setCompanionComment('Hết 40 giây mất rồi! Tớ tặng bé thêm thời gian đấy, hãy cố lên nhé! 💖');
            }
            return Math.max(0, nextLives);
          });
          return 40; // reset lại bộ đếm cho bé tiếp tục chơi
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameMode, advLevel, isLevelVictory, isGameOver]);

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

  // --- KIỂM TRA ĐÁP ÁN TRONG CHẾ ĐỘ CHƠI GAME ---
  const handleCheckAnswerAdv = () => {
    if (isLevelVictory || isGameOver) return;
    sound.playClick();
    
    if (!selectedAnswer) {
      setCompanionComment('Bé hãy chọn đáp án là "Góc vuông" hay "Góc không vuông" trước nhé! 🐼');
      return;
    }

    const check = checkEkePlacement(ekePos, ekeRot, question.vertex, question.p1, question.p2);

    if (!check.isVertexClose) {
      sound.playError();
      setAdvLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          setIsGameOver(true);
          setCompanionComment('Hết tim rồi! Bé cần đặt đỉnh ê-ke trùng vào đỉnh góc trước nhé. Thử lại đảo này thôi! 🐼');
        } else {
          setCompanionComment('Đặt thước chưa trúng đỉnh góc rồi bé ơi! Kéo đỉnh thước khớp đỉnh góc nhé. (Mất 1 ❤️) 🥺');
        }
        return Math.max(0, nextLives);
      });
      return;
    }

    if (!check.isEdgeAligned) {
      sound.playError();
      setAdvLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          setIsGameOver(true);
          setCompanionComment('Hết tim rồi! Bé hãy đặt thước trùng khít với 1 cạnh của góc nhé. Chơi lại đảo này nào! 🐼');
        } else {
          setCompanionComment('Chưa trùng cạnh góc rồi bé ơi! Quay thước ê-ke trùng khít 1 cạnh của góc nhé. (Mất 1 ❤️) 📐');
        }
        return Math.max(0, nextLives);
      });
      return;
    }

    const isUserCorrect = selectedAnswer === question.correctType;
    if (isUserCorrect) {
      sound.playSuccess();
      sound.playFirework();
      
      // Tính sao
      let stars = 1;
      if (advLives === 3 && advTimeLeft >= 15) stars = 3;
      else if (advLives >= 2) stars = 2;
      
      setVictoryStars(stars);
      
      // Tính điểm thưởng
      const basePts = question.difficulty === 'Dễ' ? 15 : question.difficulty === 'Trung bình' ? 25 : 40;
      const timeBonusVal = Math.floor(advTimeLeft * 0.5);
      const totalEarned = basePts + timeBonusVal;
      
      setPointsEarned(totalEarned);
      setScore(prev => prev + totalEarned);
      
      // Kích hoạt giao diện thắng cuộc
      setIsLevelVictory(true);
      setCompanionComment('Bé quá xuất sắc! Đo góc chuẩn xác và giành chiến thắng rồi! 🎉🏆');
      
      // Cập nhật trạng thái lưu trữ
      setAdvStars(prev => {
        const copy = [...prev];
        copy[advLevel!] = Math.max(copy[advLevel!] || 0, stars);
        return copy;
      });
      
      setAdvUnlocked(prev => {
        const copy = [...prev];
        if (advLevel! + 1 < QUESTIONS.length) {
          copy[advLevel! + 1] = true;
        }
        return copy;
      });

      // Lưu lịch sử
      addHistoryItem({
        questionTitle: `[Chơi Game] Đảo ${advLevel! + 1}: ${question.title}`,
        difficulty: question.difficulty,
        isCorrect: true,
        userAnswer: selectedAnswer,
        correctType: question.correctType
      });
    } else {
      sound.playError();
      setAdvLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          setIsGameOver(true);
          setCompanionComment('Hết tim mất rồi! Đáp án chưa chính xác. Chúng mình chơi lại hòn đảo này nhé! 🐼');
        } else {
          setCompanionComment('Thước đặt đúng rồi nhưng đáp án chưa chuẩn! Bé xem kỹ hai cạnh có khít thước không nha. (Mất 1 ❤️) 🥺');
        }
        return Math.max(0, nextLives);
      });
    }
  };

  // --- GIAO DIỆN CHỌN CHẾ ĐỘ CHƠI ---
  const renderSelectScreen = () => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 text-center select-none w-full h-full max-h-[100vh] overflow-y-auto" id="game-select-screen">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full bg-white/85 backdrop-blur-md rounded-3xl border-4 border-indigo-500 p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto"
        >
          {/* Bong bóng trang trí */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-100 rounded-full opacity-60"></div>
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-100 rounded-full opacity-60"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg border-4 border-white transform rotate-3 mb-3 sm:mb-4 animate-bounce">
              <Compass className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin-slow" />
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-950 tracking-tight leading-tight">
              🎮 BÉ CHỌN CHẾ ĐỘ CHƠI NHÉ! 🎮
            </h2>
            <p className="text-[9px] sm:text-xs font-extrabold text-indigo-500 uppercase tracking-widest mt-0.5 mb-4 sm:mb-6">
              Cùng học đo góc thật giỏi và vui nhộn nha
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
              
              {/* CHẾ ĐỘ LUYỆN TẬP TỰ DO */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-emerald-50/50 hover:bg-emerald-50 border-4 border-emerald-400 p-4 sm:p-5 rounded-2xl shadow-md cursor-pointer flex flex-col justify-between text-left transition-all"
                onClick={() => {
                  sound.playClick();
                  setGameMode('practice');
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl sm:text-3xl">📖</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full">DỄ DÀNG</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-900 mb-1">Học Tập Tự Do</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-relaxed">
                    Bé tự do luyện tập đo góc không giới hạn thời gian. Có gợi ý đo mẫu cực kỳ sinh động và hướng dẫn chi tiết từng câu!
                  </p>
                </div>
                <button className="w-full mt-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <span>Bắt đầu Luyện tập</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>

              {/* CHẾ ĐỘ PHIÊU LƯU ĐẢO KHO BÁU */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-amber-50/50 hover:bg-amber-50 border-4 border-amber-400 p-4 sm:p-5 rounded-2xl shadow-md cursor-pointer flex flex-col justify-between text-left transition-all relative overflow-hidden"
                onClick={() => {
                  sound.playClick();
                  setGameMode('adventure');
                  setAdvLevel(null); // Quay lại bản đồ đảo
                }}
              >
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-200/40 rounded-full"></div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl sm:text-3xl">🏴‍☠️</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Kịch tính</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-amber-900 mb-1">Thử Thách Đảo Kho Báu</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-relaxed">
                    Vượt qua 12 hòn đảo hình học kỳ thú! Mỗi đảo bé có 40 giây để đặt thước và chọn đáp án. Bé có 3 trái tim ❤️ để chinh phục nhé!
                  </p>
                </div>
                <button className="w-full mt-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow cursor-pointer">
                  <span>Chinh phục Đảo Kho Báu</span>
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                </button>
              </motion.div>

            </div>

            {/* Nút tự vẽ góc */}
            <button
              onClick={onPlaygroundClick}
              className="mt-5 px-5 py-1.5 border-2 border-dashed border-indigo-400 hover:border-indigo-600 text-indigo-700 hover:text-indigo-900 font-extrabold text-xs rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Hoặc bé muốn Tự vẽ góc & Đo tự do?</span>
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // --- GIAO DIỆN BẢN ĐỒ ĐẢO KHO BÁU ---
  const renderAdventureMap = () => {
    return (
      <div className="flex-1 flex flex-col justify-start p-2 sm:p-3 relative select-none h-full overflow-y-auto lg:overflow-hidden w-full" id="adventure-map-screen">
        
        {/* Tiêu đề & Nút quay lại */}
        <div className="flex justify-between items-center bg-white/95 p-2 rounded-xl border-2 border-slate-200 shadow-sm flex-shrink-0 mb-2 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('select');
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] sm:text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
          
          <div className="text-center">
            <h2 className="text-xs sm:text-sm md:text-base font-black text-indigo-950 flex items-center gap-1 justify-center">
              <span>🏴‍☠️</span> BẢN ĐỒ ĐẢO KHO BÁU
            </h2>
            <p className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Vượt qua thử thách để tìm rương vàng!</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 flex items-center gap-0.5 text-[10px] sm:text-xs">
            <span className="text-amber-500 font-black">⭐</span>
            <span className="font-mono font-black text-amber-700">
              {advStars.reduce((sum, s) => sum + s, 0)} sao
            </span>
          </div>
        </div>

        {/* Nội dung bản đồ bento bách khoa gấu trúc */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 items-stretch overflow-hidden">
          
          {/* Cột trái: Bản đồ hành trình (8/12 cols) */}
          <div className="lg:col-span-8 bg-gradient-to-b from-sky-250 via-sky-150 to-sky-100 border-4 border-indigo-400 rounded-3xl p-3 sm:p-4 shadow-xl relative flex flex-col justify-center min-h-[280px] lg:min-h-0 lg:flex-grow overflow-hidden">
            {/* Sóng nước trang trí */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:24px_24px]"></div>
            
            {/* Một chiếc tàu cướp biển nhỏ đang bơi */}
            <div className="absolute top-4 left-16 text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: '4s' }}>⛵</div>
            {/* Đảo kho báu rương vàng ở cuối bản đồ */}
            <div className="absolute bottom-4 right-16 text-3xl sm:text-4xl animate-pulse">💎🏴‍☠️</div>

            {/* Path levels */}
            <div className="relative z-10 flex flex-wrap gap-2 sm:gap-2.5 md:gap-3 items-center justify-center max-w-xl mx-auto">
              {QUESTIONS.map((q, idx) => {
                const isUnlocked = advUnlocked[idx];
                const stars = advStars[idx] || 0;
                const isCurrent = isUnlocked && (idx === 0 || !advUnlocked[idx + 1]);

                return (
                  <motion.div
                     key={`map-node-${q.id}`}
                     whileHover={isUnlocked ? { scale: 1.05 } : {}}
                     whileTap={isUnlocked ? { scale: 0.95 } : {}}
                     className={`w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center relative cursor-pointer shadow-md border-4 transition-all ${
                       isUnlocked
                         ? isCurrent
                           ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 border-yellow-500 scale-105 shadow-yellow-200'
                           : 'bg-gradient-to-tr from-indigo-500 to-indigo-400 border-indigo-600 shadow-indigo-100'
                         : 'bg-slate-300/80 border-slate-400 cursor-not-allowed opacity-75'
                     }`}
                     onClick={() => {
                       if (!isUnlocked) {
                         sound.playError();
                         alert('🔒 Hòn đảo này đang bị khóa! Bé hãy vượt qua đảo trước để mở khóa đảo này nhé!');
                         return;
                       }
                       sound.playClick();
                       setAdvLevel(idx);
                     }}
                  >
                    {/* Số hòn đảo */}
                    <span className={`text-xs sm:text-sm font-black leading-none ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>

                    {/* Tên độ khó nhỏ */}
                    <span className={`text-[6.5px] sm:text-[7px] font-black uppercase mt-0.5 leading-none ${
                      !isUnlocked ? 'text-slate-400' : q.difficulty === 'Dễ' ? 'text-emerald-100' : q.difficulty === 'Trung bình' ? 'text-amber-100' : 'text-rose-100'
                    }`}>
                      {q.difficulty}
                    </span>

                    {/* Ngôi sao tích lũy */}
                    {isUnlocked && (
                      <div className="flex gap-0.5 mt-0.5 absolute -bottom-1.5 bg-white px-1 py-0.5 rounded-full border border-slate-150 shadow-xs scale-90 sm:scale-100">
                        {Array.from({ length: 3 }).map((_, sIdx) => (
                          <span key={`node-star-${idx}-${sIdx}`} className={`text-[6px] sm:text-[7px] ${sIdx < stars ? 'text-amber-500 font-bold' : 'text-slate-300'}`}>
                            {sIdx < stars ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Ổ khóa nếu chưa mở */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-slate-900/10 rounded-full flex items-center justify-center">
                        <span className="text-[9px]">🔒</span>
                      </div>
                    )}

                    {/* Chỉ báo hòn đảo hiện tại bé cần chơi */}
                    {isCurrent && (
                      <span className="absolute -top-2.5 bg-red-500 text-white text-[6px] sm:text-[7px] font-black px-1 py-0.5 rounded-full uppercase tracking-wider animate-pulse border border-white leading-none">
                        Chơi!
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Cột phải: Hướng dẫn từ người bạn đồng hành Panda (4/12 cols) */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-200 rounded-3xl p-3 sm:p-4 shadow flex flex-col justify-between items-center text-center">
            
            <div className="flex flex-col items-center">
              <div className="text-4xl sm:text-5xl animate-bounce mb-1.5 mt-1">🐼</div>
              <h3 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5">Gấu Panda Bách Khoa</h3>
              <p className="text-[7.5px] sm:text-[8.5px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Người bạn thông thái</p>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-[10.5px] font-semibold text-indigo-950 relative text-left leading-relaxed">
                {/* Mũi tên hội thoại */}
                <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-4 h-4 bg-indigo-50 border-l border-b border-indigo-100 rotate-45 hidden lg:block"></div>
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-indigo-50 border-t border-l border-indigo-100 rotate-45 lg:hidden"></div>
                
                "Chào bé yêu! Để khám phá được rương vàng cổ xưa, chúng mình phải vượt qua <b>12 Thử thách hòn đảo đo góc</b>. Mỗi đảo bé có 3 ❤️ và 40 giây. Cố gắng đo thật giỏi để rinh 3 sao ⭐ nhé!"
              </div>
            </div>

            <div className="w-full mt-3 bg-slate-50 border border-slate-150 rounded-2xl p-2 sm:p-2.5 text-[9px] sm:text-[10px] font-bold text-slate-600 text-left space-y-1">
              <span className="text-slate-800 font-extrabold block text-[10px] sm:text-[11px] mb-0.5">🎒 Bản đồ đảo rèn luyện:</span>
              <div>🌱 Đảo 1 - 4: Thử thách góc vuông thẳng đứng</div>
              <div>⚡ Đảo 5 - 8: Thử thách góc nghiêng xoay chéo</div>
              <div>🔥 Đảo 9 - 12: Thử thách góc siêu khó lừa mắt</div>
            </div>

          </div>

        </div>
      </div>
    );
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

  if (gameMode === 'select') {
    return renderSelectScreen();
  }

  if (gameMode === 'adventure' && advLevel === null) {
    return renderAdventureMap();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-stretch overflow-hidden" id="eke-game-container">
      
      {/* KHU VỰC LÀM BÀI CHÍNH (BÊN TRÁI - 7/12 COLS - TỐI ƯU CHIỀU CAO) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-slate-200 shadow flex flex-col justify-between overflow-hidden relative" id="interactive-screen">
        
        {/* Tiêu đề góc snap hoặc Header Adventure */}
        {gameMode === 'adventure' ? (
          <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex justify-between items-center text-indigo-950 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setAdvLevel(null);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black flex items-center gap-0.5 text-indigo-700 cursor-pointer shadow-xs active:scale-95"
              >
                🗺️ Bản đồ Đảo
              </button>
              <span className="text-xs font-black text-slate-800">Đảo {advLevel! + 1}: {question.title}</span>
            </div>
            
            {/* Mạng và Thời gian */}
            <div className="flex items-center gap-3">
              {/* Mạng chơi */}
              <div className="flex gap-0.5">
                {Array.from({ length: 3 }).map((_, lIdx) => (
                  <span 
                    key={`heart-${lIdx}`} 
                    className={`text-sm sm:text-base transition-transform duration-300 ${lIdx < advLives ? 'text-rose-500 animate-pulse scale-110' : 'text-slate-300 scale-95 opacity-50'}`}
                  >
                    {lIdx < advLives ? '❤️' : '🤍'}
                  </span>
                ))}
              </div>

              {/* Thời gian */}
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-xs">
                <span className={`text-[10px] font-black font-mono ${advTimeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                  ⏱️ {advTimeLeft}s
                </span>
                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className={`h-full transition-all duration-1000 rounded-full ${advTimeLeft < 15 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${(advTimeLeft / 40) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
        )}

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
        
        {gameMode === 'adventure' ? (
          <>
            {/* COMPANION SPEECH BOX */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-4 shadow-sm flex items-start gap-3 flex-shrink-0" id="adventure-companion-card">
              <div className="text-4xl sm:text-5xl animate-bounce" style={{ animationDuration: '3.5s' }}>🐼</div>
              <div className="flex-1 text-left">
                <h4 className="text-xs font-black text-indigo-900 mb-1">Gấu Panda Bách Khoa</h4>
                <div className="bg-white border border-indigo-100 p-2.5 rounded-xl text-[11px] font-semibold leading-relaxed text-indigo-950 relative">
                  <div className="absolute top-4 -left-1.5 w-3 h-3 bg-white border-l border-b border-indigo-100 rotate-45"></div>
                  {companionComment}
                </div>
              </div>
            </div>

            {/* ADVENTURE QUESTION & ANSWER CHOICES */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow flex flex-col gap-2 flex-shrink-0" id="adventure-question-card">
              <div className="flex justify-between items-center">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase leading-none ${
                  question.difficulty === 'Dễ' ? 'bg-emerald-100 text-emerald-800' : question.difficulty === 'Trung bình' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  Thử thách Đảo {advLevel! + 1}
                </span>
                <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs">
                  <span>Mức độ: {question.difficulty}</span>
                </div>
              </div>

              <h2 className="text-base font-black text-slate-800 leading-tight">
                {question.title}
              </h2>
              <p className="text-xs font-medium text-slate-500 leading-normal">
                {question.subtitle}
              </p>

              {/* CHỌN ĐÁP ÁN (DỄ THƯƠNG CHO HỌC SINH LỚP 3) */}
              <div className="grid grid-cols-2 gap-2 mt-1" id="adventure-answer-choices">
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

              {/* NHÓM NÚT NỘP BÀI ADVENTURE */}
              <div className="flex flex-col gap-2 mt-2" id="adventure-action-buttons">
                <button
                  onClick={handleCheckAnswerAdv}
                  disabled={isAnimating}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-black text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    isAnimating 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-150'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nộp bài & Đo góc! 📐</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={playGuideDemo}
                    disabled={isAnimating}
                    className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Xem gợi ý đo 📖</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      sound.playClick();
                      setEkePos({ x: 110, y: 220 });
                      setEkeRot(0);
                    }}
                    disabled={isAnimating}
                    className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đặt lại thước</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ADVENTURE NAVIGATION CARD */}
            <div className="flex justify-between items-center bg-white p-2.5 rounded-2xl border-2 border-slate-200 shadow-sm flex-shrink-0" id="adventure-navigation-bar">
              <button
                onClick={() => {
                  sound.playClick();
                  setAdvLevel(null);
                }}
                className="py-1.5 px-3 rounded-lg font-bold text-xs flex items-center gap-1 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                🗺️
                <span>Quay về Bản đồ Đảo</span>
              </button>

              <span className="text-slate-500 font-extrabold text-xs font-mono">
                Đảo {advLevel! + 1} / 12
              </span>

              <div className="w-20"></div> {/* Spacer to balance */}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        {/* 5. TIỆN ÍCH PHÍA DƯỚI (BẢNG XẾP HẠNG & LỊCH SỬ) - CỐ ĐỊNH CHIỀU CAO ĐỂ TRÁNH TRÀN TRANG */}
        <div className="flex-1 min-h-[160px] max-h-[220px] flex flex-col bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden" id="dashboard-bottom-panel">
          
          {/* Header với Tab switcher và nút Đổi chế độ */}
          <div className="flex border-b border-slate-200 bg-slate-100/90 text-xs flex-shrink-0 py-2 px-3 items-center justify-between">
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveSideTab('leaderboard');
                }}
                className={`px-3 py-1 rounded-lg font-black text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  activeSideTab === 'leaderboard'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Bảng xếp hạng thực tế 🏆</span>
              </button>
              
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveSideTab('history');
                }}
                className={`px-3 py-1 rounded-lg font-black text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  activeSideTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Lịch sử của bé 🎒</span>
              </button>
            </div>
            
            <div className="flex items-center gap-1.5">
              {activeSideTab === 'leaderboard' && (
                <button
                  onClick={() => {
                    sound.playClick();
                    loadLeaderboardData();
                  }}
                  disabled={isLoadingLeaderboard}
                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-200 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  title="Tải lại bảng xếp hạng thực tế"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLeaderboard ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              )}
              
              <button
                onClick={() => {
                  sound.playClick();
                  setGameMode('select');
                  setAdvLevel(null);
                }}
                className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-800 text-[9px] font-black rounded-lg transition-all cursor-pointer"
              >
                🎮 Đổi chế độ chơi
              </button>
            </div>
          </div>

          {/* Nội dung Tab */}
          <div className="flex-1 overflow-y-auto p-2">
            {activeSideTab === 'leaderboard' ? (
              <div className="flex flex-col gap-1 text-[11px]">
                {isLoadingLeaderboard && leaderboardEntries.length === 0 ? (
                  <div className="text-slate-400 font-bold py-8 text-center text-[10px] flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                    <span>Đang tải bảng xếp hạng thực tế...</span>
                  </div>
                ) : leaderboardError && leaderboardEntries.length === 0 ? (
                  <div className="text-rose-500 font-bold py-6 text-center text-[10px] flex flex-col items-center justify-center gap-1">
                    <span>{leaderboardError}</span>
                    <button 
                      onClick={loadLeaderboardData} 
                      className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-black mt-1 hover:bg-rose-100"
                    >
                      Thử lại 🔁
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-[9px] text-indigo-800 font-bold px-2 py-1 bg-indigo-50/50 rounded-lg flex flex-wrap justify-between items-center mb-1 gap-1">
                      <span>✨ Điểm số thực tế cập nhật tự động khi bé trả lời câu hỏi!</span>
                      <span className="text-indigo-600 font-black">Phiên hiện tại: {studentName} ({studentClass})</span>
                    </div>
                    {leaderboardEntries.map((entry, index) => {
                      const isMe = entry.studentName === studentName && entry.className === studentClass;
                      return (
                        <div 
                          key={entry.id || index} 
                          className={`flex items-center justify-between py-1.5 px-2.5 border rounded-xl shadow-xs transition-all ${
                            isMe 
                              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200/50' 
                              : 'bg-white border-slate-150'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Thứ hạng */}
                            <span className="w-5 text-center font-black text-xs">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </span>
                            
                            {/* Thông tin bé */}
                            <div className="text-left">
                              <span className={`font-extrabold ${isMe ? 'text-amber-950 font-black' : 'text-slate-800'}`}>
                                {entry.studentName} {isMe && <span className="text-[9px] font-black text-amber-600 bg-amber-100/80 px-1 py-0.2 rounded ml-1">Bé của mẹ</span>}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold block leading-none mt-0.5">
                                {entry.className} • {new Date(entry.timestamp).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          {/* Kết quả */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono font-black text-xs text-indigo-700">{entry.score}đ</span>
                              <span className="text-[8px] text-slate-400 block font-bold leading-none mt-0.5">Tổng điểm</span>
                            </div>
                            <div className="text-right border-l border-slate-100 pl-3 min-w-[50px]">
                              <span className="font-mono font-bold text-xs text-slate-600">{formatSecondsShort(entry.elapsedTime)}</span>
                              <span className="text-[8px] text-slate-400 block font-bold leading-none mt-0.5">Thời gian</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-[11px] h-full">
                {history.length === 0 ? (
                  <div className="text-slate-400 font-bold py-8 text-center text-[10px]">
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
              </div>
            )}
          </div>

        </div>

      </div>

      {/* OVERLAY MODAL: CHIẾN THẮNG HÒN ĐẢO (VICTORY) */}
      <AnimatePresence>
        {isLevelVictory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
            id="victory-modal"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl border-4 border-emerald-500 p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Confetti decoration */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-100 rounded-full opacity-40"></div>
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-yellow-100 rounded-full opacity-40"></div>

              <div className="relative z-10">
                <div className="text-6xl mb-4 animate-bounce">🏆🎉</div>
                
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950 leading-tight">
                  CHIẾN THẮNG ĐẢO {advLevel! + 1}!
                </h3>
                <p className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-wider mt-1 mb-6">
                  Đo góc chuẩn từng mi-li-mét luôn
                </p>

                {/* Stars container */}
                <div className="flex justify-center gap-2 mb-6">
                  {Array.from({ length: 3 }).map((_, starIdx) => (
                    <motion.span 
                      key={`victory-star-${starIdx}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + starIdx * 0.15, type: 'spring' }}
                      className={`text-4xl sm:text-5xl ${starIdx < victoryStars ? 'text-amber-400 drop-shadow' : 'text-slate-200'}`}
                    >
                      ★
                    </motion.span>
                  ))}
                </div>

                {/* Points box */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 mb-6 inline-block">
                  <span className="text-[11px] font-bold text-emerald-800 block">Điểm thưởng tích lũy:</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">+{pointsEarned} điểm 🌟</span>
                </div>

                {/* Buttons block */}
                <div className="flex flex-col gap-2">
                  {advLevel! + 1 < QUESTIONS.length ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        setAdvLevel(prev => prev! + 1);
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-md"
                    >
                      <span>Vượt Đảo tiếp theo ({advLevel! + 2})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 p-3 rounded-2xl mb-2">
                      👑 Bé quá tuyệt vời! Đã xuất sắc vượt qua toàn bộ 12 hòn đảo kho báu của trò chơi! 👑
                    </div>
                  )}

                  <button
                    onClick={() => {
                      sound.playClick();
                      setAdvLevel(null); // Return to map
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95"
                  >
                    🗺️ Quay lại Bản đồ Đảo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL: THẤT BẠI (GAME OVER) */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
            id="gameover-modal"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl border-4 border-rose-500 p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2.5s' }}>😢🐼</div>
                
                <h3 className="text-xl sm:text-2xl font-black text-rose-950 leading-tight">
                  CỐ LÊN BÉ ƠI!
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-2 mb-6">
                  Đo góc cần sự tỉ mỉ, chúng mình cùng luyện tập lại để vượt qua đảo này nhé!
                </p>

                {/* Restart & map buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setAdvLevel(advLevel); // reset current level questions
                      setAdvLives(3);
                      setAdvTimeLeft(40);
                      setIsGameOver(false);
                      setIsLevelVictory(false);
                      setSelectedAnswer(null);
                      setIsAnswerChecked(false);
                      setIsCorrect(false);
                      setMessage('');
                    }}
                    className="py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Thử lại Đảo này</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setAdvLevel(null); // Return to map
                    }}
                    className="py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95"
                  >
                    🗺️ Xem Bản đồ
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
