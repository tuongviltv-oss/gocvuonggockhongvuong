/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Award, 
  BookOpen, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Gamepad2, 
  Info,
  Check,
  X,
  User,
  Trophy,
  History,
  LogOut,
  ChevronRight,
  Settings,
  Copy,
  ExternalLink,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import EkeGame from './components/EkeGame';
import Playground from './components/Playground';
import { sound } from './components/SoundManager';
import { StudentProfile, HistoryItem, LeaderboardItem } from './types';

// Danh sách Avatar con vật siêu dễ thương cho bé chọn
const AVATARS = [
  { char: '🐼', name: 'Gấu trúc' },
  { char: '🐱', name: 'Mèo con' },
  { char: '🐶', name: 'Cún con' },
  { char: '🐰', name: 'Thỏ ngọc' },
  { char: '🦁', name: 'Sư tử con' },
  { char: '🐨', name: 'Gấu túi' },
  { char: '🦊', name: 'Cáo đỏ' },
];

const APPS_SCRIPT_CODE = `function doGet(e) {
  createTemplateSheet();
  return HtmlService.createHtmlOutput(
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Kết nối Google Sheets thành công!</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;color:#1e293b;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}card{background:white;padding:32px;border-radius:24px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);max-width:480px;width:100%;text-align:center;border-top:8px solid #4f46e5}h1{color:#0f172a;margin-top:0;font-size:22px}p{line-height:1.6;font-size:14px;color:#64748b}button{background:#4f46e5;color:white;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;margin-top:16px;transition:all 0.2s}button:hover{background:#4338ca}</style></head><body><card><h1>🎉 Cấu hình Google Sheets thành công!</h1><p>Hệ thống đã tự động tạo và định dạng Sheet mẫu mang tên <b>"Tổng hợp kết quả"</b>.</p><p>Thầy Cô / Phụ huynh hãy copy đường link trên thanh địa chỉ trình duyệt này và dán vào ứng dụng để kết nối lưu điểm nhé!</p><button onclick="window.close()">Đóng cửa sổ</button></card></body></html>'
  );
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Tổng hợp kết quả") || ss.insertSheet("Tổng hợp kết quả");
    var data = JSON.parse(e.postData.contents);
    
    setupHeaders(sheet);
    
    var nextRow = sheet.getLastRow() + 1;
    var stt = nextRow - 1;
    
    sheet.appendRow([
      stt,
      data.studentName || "-",
      data.className || "-",
      data.score !== undefined ? data.score : 0,
      data.totalQuestions !== undefined ? data.totalQuestions : 0,
      data.correctCount !== undefined ? data.correctCount : 0,
      data.wrongCount !== undefined ? data.wrongCount : 0,
      data.duration || "-",
      data.wrongQuestionsList || "-",
      data.userAnswers || "-",
      data.correctAnswers || "-",
      data.timestamp || new Date().toLocaleString('vi-VN')
    ]);
    
    formatSheet(sheet);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã lưu kết quả thành công!" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({ 'Access-Control-Allow-Origin': '*' });
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({ 'Access-Control-Allow-Origin': '*' });
  }
}

function createTemplateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Tổng hợp kết quả") || ss.insertSheet("Tổng hợp kết quả");
  setupHeaders(sheet);
  formatSheet(sheet);
}

function setupHeaders(sheet) {
  if (sheet.getLastRow() === 0 || (sheet.getLastRow() === 1 && sheet.getRange(1,1).getValue() === "")) {
    sheet.clear();
    sheet.appendRow([
      "STT",
      "Họ tên",
      "Lớp",
      "Điểm số",
      "Tổng số câu làm",
      "Số câu đúng",
      "Số câu sai",
      "Thời gian làm bài",
      "Danh sách câu trả lời sai",
      "Đáp án học sinh chọn ở từng câu",
      "Đáp án đúng tương ứng",
      "Ngày giờ làm bài"
    ]);
  }
}

function formatSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) return;
  
  var headerRange = sheet.getRange(1, 1, 1, 12);
  headerRange.setFontWeight("bold")
             .setFontSize(11)
             .setBackground("#4f46e5")
             .setFontColor("#ffffff")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  
  sheet.setRowHeight(1, 35);
  
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, 12);
    dataRange.setFontSize(10)
             .setVerticalAlignment("middle");
             
    var centerColumns = [1, 3, 4, 5, 6, 7, 8, 12];
    centerColumns.forEach(function(col) {
      sheet.getRange(2, col, lastRow - 1, 1).setHorizontalAlignment("center");
    });
  }
  
  var colWidths = [50, 160, 80, 80, 110, 100, 100, 150, 250, 250, 250, 160];
  colWidths.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  
  var textRanges = sheet.getRange(1, 9, lastRow, 3);
  textRanges.setWrap(true);
}`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'practice' | 'playground'>('practice');
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    const saved = localStorage.getItem('eke_session_start_time');
    return saved ? parseInt(saved, 10) : Date.now();
  });
  
  // Thông tin học sinh
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem('eke_student_profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Điểm số của học sinh
  const [score, setScore] = useState<number>(() => {
    const saved = localStorage.getItem('eke_game_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Lịch sử làm bài
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('eke_game_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Trạng thái lưu trữ tất cả các tài khoản học sinh đã từng chơi trên máy này
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardItem[]>(() => {
    const saved = localStorage.getItem('eke_leaderboard_players');
    return saved ? JSON.parse(saved) : [];
  });

  // Tự động đồng bộ tài khoản hiện tại vào danh sách xếp hạng của máy
  useEffect(() => {
    if (studentProfile) {
      const key = `${studentProfile.name}_${studentProfile.className}`;
      setLeaderboardPlayers(prev => {
        const existingIdx = prev.findIndex(p => p.id === key || (p.name === studentProfile.name && p.className === studentProfile.className));
        
        const updatedItem: LeaderboardItem = {
          id: key,
          name: studentProfile.name,
          className: studentProfile.className,
          score: score,
          avatar: studentProfile.avatar
        };

        let newPlayers = [...prev];
        if (existingIdx >= 0) {
          if (newPlayers[existingIdx].score === score && newPlayers[existingIdx].avatar === studentProfile.avatar) {
            return prev;
          }
          newPlayers[existingIdx] = updatedItem;
        } else {
          newPlayers.push(updatedItem);
        }
        
        localStorage.setItem('eke_leaderboard_players', JSON.stringify(newPlayers));
        return newPlayers;
      });
    }
  }, [studentProfile, score]);

  // Tắt/bật âm thanh
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Cấu hình Google Sheets / Google Apps Script
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem('eke_apps_script_url') || (import.meta as any).env?.VITE_APPS_SCRIPT_URL || '';
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showTeacherSettingsModal, setShowTeacherSettingsModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Tự động gửi kết quả lên Google Sheets trong nền (silently) khi bấm Hoàn thành
  useEffect(() => {
    if (showCompleteModal && appsScriptUrl && studentProfile && history.length > 0) {
      submitSummaryToSheetsBackground();
    }
  }, [showCompleteModal]);

  const submitSummaryToSheetsBackground = async () => {
    if (!appsScriptUrl || !studentProfile || history.length === 0) return;

    try {
      const elapsedMs = Date.now() - sessionStartTime;
      const durationStr = formatDuration(elapsedMs);

      const totalQs = history.length;
      const correctQs = history.filter(h => h.isCorrect).length;
      const wrongQs = history.filter(h => !h.isCorrect).length;

      const wrongQuestionsList = history
        .filter(h => !h.isCorrect)
        .map(h => h.questionTitle)
        .join(', ') || 'Không có';

      const userAnswers = history
        .map((h, i) => `${i + 1}. ${h.questionTitle} (${h.difficulty}): Bé chọn ${h.userAnswer}`)
        .join('\n');

      const correctAnswers = history
        .map((h, i) => `${i + 1}. ${h.questionTitle}: ${h.correctType}`)
        .join('\n');

      const payload = {
        action: 'submit_summary',
        studentName: studentProfile.name,
        className: studentProfile.className,
        score: score,
        totalQuestions: totalQs,
        correctCount: correctQs,
        wrongCount: wrongQs,
        duration: durationStr,
        wrongQuestionsList: wrongQuestionsList,
        userAnswers: userAnswers,
        correctAnswers: correctAnswers,
        timestamp: new Date().toLocaleString('vi-VN')
      };

      await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      console.log('Tự động đồng bộ báo cáo học tập lên Google Sheets thành công!');
    } catch (err) {
      console.error('Lỗi tự động gửi báo cáo:', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('eke_apps_script_url', appsScriptUrl);
  }, [appsScriptUrl]);

  // Trạng thái đang gửi báo cáo tổng hợp khi bấm nút thủ công
  const [isSubmittingSummary, setIsSubmittingSummary] = useState<boolean>(false);

  // Hàm gửi báo cáo tổng hợp kết quả lên Google Sheets
  const submitSummaryToSheets = async () => {
    if (!appsScriptUrl) {
      alert('⚠️ Thầy Cô hoặc Phụ huynh chưa cấu hình URL Google Sheets. Vui lòng bấm vào nút "Lưu Sheets" ở góc trên để cấu hình trước nhé!');
      return;
    }
    if (!studentProfile) return;

    setIsSubmittingSummary(true);
    setSyncStatus('syncing');
    setSyncMessage('Đang nộp báo cáo tổng hợp...');

    try {
      const elapsedMs = Date.now() - sessionStartTime;
      const durationStr = formatDuration(elapsedMs);

      const totalQs = history.length;
      const correctQs = history.filter(h => h.isCorrect).length;
      const wrongQs = history.filter(h => !h.isCorrect).length;

      const wrongQuestionsList = history
        .filter(h => !h.isCorrect)
        .map(h => h.questionTitle)
        .join(', ') || 'Không có';

      const userAnswers = history
        .map((h, i) => `${i + 1}. ${h.questionTitle} (${h.difficulty}): Bé chọn ${h.userAnswer}`)
        .join('\n');

      const correctAnswers = history
        .map((h, i) => `${i + 1}. ${h.questionTitle}: ${h.correctType}`)
        .join('\n');

      const payload = {
        action: 'submit_summary',
        studentName: studentProfile.name,
        className: studentProfile.className,
        score: score,
        totalQuestions: totalQs,
        correctCount: correctQs,
        wrongCount: wrongQs,
        duration: durationStr,
        wrongQuestionsList: wrongQuestionsList,
        userAnswers: userAnswers,
        correctAnswers: correctAnswers,
        timestamp: new Date().toLocaleString('vi-VN')
      };

      await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });

      setSyncStatus('success');
      setSyncMessage('Đã gửi báo cáo thành công!');
      sound.playSuccess();
      alert('🎉 Chúc mừng bé! Kết quả học tập xuất sắc của bé đã được gửi trực tiếp đến Google Sheets của Thầy Cô/Phụ huynh thành công rồi đấy!');
      setShowCompleteModal(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage('Gửi báo cáo thất bại.');
      alert('❌ Có lỗi xảy ra khi gửi kết quả. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình URL Google Sheets.');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      setIsSubmittingSummary(false);
    }
  };

  // Hàm kiểm tra kết nối thử nghiệm
  const testConnection = async (testUrl: string) => {
    if (!testUrl) {
      alert('Vui lòng nhập URL Apps Script trước!');
      return;
    }
    
    setSyncStatus('syncing');
    setSyncMessage('Đang kết nối thử nghiệm...');
    try {
      const payload = {
        studentName: studentProfile ? studentProfile.name : "Người chơi thử nghiệm",
        className: studentProfile ? studentProfile.className : "Ba 1",
        score: score,
        questionTitle: "Thử nghiệm kết nối hệ thống",
        difficulty: "Hệ thống",
        isCorrect: "Đúng",
        userAnswer: "Góc vuông",
        correctType: "Góc vuông",
        action: 'test',
        timestamp: new Date().toLocaleString('vi-VN')
      };

      await fetch(testUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      setSyncStatus('success');
      setSyncMessage('Kết nối thành công! Đã thêm một dòng thử nghiệm vào Google Sheet.');
      sound.playSuccess();
      setTimeout(() => setSyncStatus('idle'), 5000);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage('Kết nối thất bại. Hãy kiểm tra lại URL hoặc cài đặt quyền truy cập.');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  useEffect(() => {
    localStorage.setItem('eke_session_start_time', sessionStartTime.toString());
  }, [sessionStartTime]);

  // Lưu trữ các trạng thái vào localStorage
  useEffect(() => {
    if (studentProfile) {
      localStorage.setItem('eke_student_profile', JSON.stringify(studentProfile));
    } else {
      localStorage.removeItem('eke_student_profile');
    }
  }, [studentProfile]);

  useEffect(() => {
    localStorage.setItem('eke_game_score', score.toString());
  }, [score]);

  useEffect(() => {
    localStorage.setItem('eke_game_history', JSON.stringify(history));
  }, [history]);

  const handleTabChange = (tab: 'practice' | 'playground') => {
    sound.playClick();
    setActiveTab(tab);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleLogout = () => {
    sound.playClick();
    if (confirm('Bé có muốn đổi tài khoản học sinh khác không?')) {
      setStudentProfile(null);
      setScore(0);
      setHistory([]);
      localStorage.removeItem('eke_student_profile');
      localStorage.removeItem('eke_game_score');
      localStorage.removeItem('eke_game_history');
      localStorage.removeItem('eke_session_start_time');
      setSessionStartTime(Date.now());
    }
  };

  // Hàm thêm lịch sử làm bài
  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newItem: HistoryItem = {
      ...item,
      id: `hist_${Date.now()}`,
      timestamp: timeStr
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20)); // lưu tối đa 20 dòng gần nhất
  };

  // Hàm định dạng thời gian làm bài thành chuỗi dễ đọc
  const formatDuration = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins} phút ${secs} giây`;
    }
    return `${secs} giây`;
  };



  // Tính danh hiệu của học sinh dựa trên điểm số
  const getBadgeTitle = (pts: number): { name: string; color: string; emoji: string } => {
    if (pts >= 120) return { name: 'Thần đồng Hình học 👑', color: 'bg-yellow-500 text-white', emoji: '👑' };
    if (pts >= 80) return { name: 'Bậc thầy Ê-ke 📐', color: 'bg-purple-500 text-white', emoji: '🎓' };
    if (pts >= 50) return { name: 'Dũng sĩ đo góc 💪', color: 'bg-indigo-500 text-white', emoji: '🌟' };
    if (pts >= 20) return { name: 'Nhà toán học nhí ✏️', color: 'bg-emerald-500 text-white', emoji: '🎒' };
    return { name: 'Tập sự đo góc 🌱', color: 'bg-slate-200 text-slate-700', emoji: '🌱' };
  };

  const badge = getBadgeTitle(score);

  // Tạo và sắp xếp bảng xếp hạng (chỉ chứa các tài khoản thật có điểm hoặc người chơi hiện tại)
  const getLeaderboard = (): LeaderboardItem[] => {
    if (!studentProfile) return [];
    
    // Lấy danh sách từ leaderboardPlayers, đánh dấu người chơi hiện tại
    const list = leaderboardPlayers.map(p => {
      const isCurrent = p.name === studentProfile.name && p.className === studentProfile.className;
      return {
        ...p,
        isCurrentUser: isCurrent
      };
    });

    // Lọc: Chỉ lấy những bạn có điểm > 0 HOẶC là người chơi hiện tại
    const activeList = list.filter(p => p.score > 0 || p.isCurrentUser);

    // Sắp xếp theo điểm giảm dần
    return activeList.sort((a, b) => b.score - a.score);
  };

  const leaderboard = getLeaderboard();

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-blue-50 via-indigo-50 to-emerald-50 text-slate-800 font-sans overflow-hidden" id="app-root-container">
      
      <AnimatePresence mode="wait">
        {/* CHƯA ĐĂNG NHẬP: HIỂN THỊ FORM CHÀO MỪNG DỄ THƯƠNG CHO HỌC SINH LỚP 3 */}
        {!studentProfile ? (
          <motion.div
            key="login-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex items-center justify-center p-4 overflow-y-auto"
            id="login-container"
          >
            <div className="bg-white rounded-3xl border-4 border-indigo-400 p-8 shadow-2xl max-w-md w-full relative overflow-hidden my-auto">
              {/* Nút cài đặt cho Thầy Cô ở góc trên bên phải */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowTeacherSettingsModal(true);
                }}
                className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-all cursor-pointer border border-slate-200 z-20"
                title="Cấu hình lưu điểm Google Sheets cho Giáo viên / Phụ huynh"
              >
                <Settings className="w-4 h-4" />
              </button>
              {/* Trang trí góc bong bóng dễ thương */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-100 rounded-full opacity-60"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-100 rounded-full opacity-60"></div>
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2 border-white transform rotate-6 mb-4">
                  <Compass className="w-9 h-9 text-white animate-spin-slow" />
                </div>
                
                <h2 className="text-2xl font-black text-indigo-900 tracking-tight leading-tight">
                  Bé Đo Góc - Thử Tài Ê-ke
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-6">
                  Dành riêng cho Học sinh Lớp 3
                </p>

                {/* Form đăng nhập */}
                <LoginForm onLogin={(name, className, avatar) => {
                  sound.playSuccess();
                  const now = Date.now();
                  setSessionStartTime(now);
                  localStorage.setItem('eke_session_start_time', now.toString());
                  setStudentProfile({ name, className, avatar });
                }} />
              </div>
            </div>
          </motion.div>
        ) : (
          /* ĐÃ ĐĂNG NHẬP: GIAO DIỆN HOÀN CHỈNH KHÔNG CUỘN TRANG */
          <motion.div
            key="game-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* 1. THANH ĐẦU TRANG SIÊU NHỎ GỌN (HEADER) */}
            <header className="bg-white border-b-2 border-slate-200 h-14 sm:h-16 flex-shrink-0 flex items-center justify-between px-4 shadow-sm z-30" id="main-app-header">
              
              {/* Logo & Tên bé */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow border-2 border-white transform rotate-3">
                  <Compass className="w-5 h-5 text-white animate-spin-slow" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-black text-indigo-900 leading-none">
                    BÉ ĐO GÓC LỚP 3
                  </h1>
                  <span className="text-[10px] font-bold text-indigo-500 block mt-0.5 uppercase tracking-wider">
                    Thực hành ê-ke trực quan
                  </span>
                </div>
              </div>

              {/* SWITCHER CHẾ ĐỘ CHƠI (TABS) - GỘP LÊN ĐẦU TRANG ĐỂ TIẾT KIỆM KHÔNG GIAN CHỌN */}
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1" id="header-tab-switcher">
                <button
                  onClick={() => handleTabChange('practice')}
                  className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1 cursor-pointer ${
                    activeTab === 'practice'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  id="header-tab-practice"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Học đo góc</span>
                </button>
                <button
                  onClick={() => handleTabChange('playground')}
                  className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1 cursor-pointer ${
                    activeTab === 'playground'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  id="header-tab-playground"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Tự vẽ góc</span>
                </button>
              </div>

              {/* Thông tin học sinh hoạt động */}
              <div className="flex items-center gap-2">
                {/* Profile thẻ nhỏ */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl py-1 px-2.5 flex items-center gap-1.5 text-xs">
                  <span className="text-base leading-none">{studentProfile.avatar}</span>
                  <div className="text-left">
                    <span className="font-extrabold text-indigo-950 block max-w-[80px] sm:max-w-[120px] truncate leading-none">
                      {studentProfile.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 block leading-none mt-0.5">
                      {studentProfile.className}
                    </span>
                  </div>
                </div>

                {/* Điểm số tích lũy */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl py-1 px-2.5 flex items-center gap-1 text-xs" id="header-score">
                  <Award className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-black text-amber-700 font-mono">{score}đ</span>
                </div>

                {/* Nút Cẩm nang hướng dẫn đo nhanh */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowGuideModal(true);
                  }}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-600 border border-indigo-200 transition-all cursor-pointer"
                  title="Xem cẩm nang đo góc"
                >
                  <BookOpen className="w-4 h-4" />
                </button>

                {/* Nút Hoàn thành buổi học */}
                <button
                  onClick={() => {
                    sound.playClick();
                    if (history.length === 0) {
                      alert('Bé chưa có lịch sử làm bài nào cả. Hãy thử sức trả lời vài câu hỏi trước nhé! 🥰');
                      return;
                    }
                    setShowCompleteModal(true);
                  }}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Hoàn thành buổi học và lưu báo cáo kết quả tổng hợp"
                  id="complete-session-btn"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>Hoàn thành</span>
                </button>

                {/* Nút Cài đặt cho Giáo viên / Phụ huynh */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowTeacherSettingsModal(true);
                  }}
                  className="p-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-600 border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                  title="Cấu hình lưu điểm Google Sheets cho Giáo viên/Phụ huynh"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline text-[10px] font-black">Lưu Sheets</span>
                </button>



                {/* Nút Âm thanh */}
                <button
                  onClick={toggleMute}
                  className="p-2 bg-slate-50 hover:bg-slate-150 rounded-xl text-slate-500 border border-slate-200 transition-all cursor-pointer"
                  title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Đổi tài khoản */}
                <button
                  onClick={handleLogout}
                  className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-500 border border-rose-150 transition-all cursor-pointer"
                  title="Đổi học sinh khác"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </header>

            {/* 2. KHU VỰC KHUNG GIAO DIỆN CHÍNH TRONG 1 MÀN HÌNH (MAIN CONTENT) */}
            <main className="flex-1 overflow-hidden p-3 md:p-4 flex flex-col justify-center max-w-7xl w-full mx-auto" id="main-content-section">
              <div className="flex-1 overflow-hidden">
                {activeTab === 'practice' ? (
                  <EkeGame 
                    score={score} 
                    setScore={setScore} 
                    onPlaygroundClick={() => setActiveTab('playground')}
                    studentProfile={studentProfile}
                    history={history}
                    addHistoryItem={addHistoryItem}
                    leaderboard={leaderboard}
                  />
                ) : (
                  <Playground />
                )}
              </div>
            </main>

          </motion.div>
        )}
      </AnimatePresence>

      {/* CẨM NẠNG HƯỚNG DẪN ĐO GÓC (MODAL POPUP) */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-4 border-indigo-500 p-6 shadow-2xl max-w-xl w-full relative"
              id="guide-modal"
            >
              <button
                onClick={() => {
                  sound.playClick();
                  setShowGuideModal(false);
                }}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-indigo-950">Cẩm nang đo góc bằng thước Ê-ke</h3>
              </div>

              <p className="text-xs text-slate-500 font-semibold mb-5 leading-relaxed">
                Ê-ke là một chiếc thước thần kỳ có một góc vuông ở đỉnh. Để kiểm tra xem một góc có vuông hay không, bé hãy thực hiện đúng 3 bước siêu dễ dàng sau nhé:
              </p>

              {/* Ba bước đo trực quan */}
              <div className="flex flex-col gap-3.5 mb-6">
                
                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-rose-500 text-white font-black flex items-center justify-center flex-shrink-0 text-sm">1</div>
                  <div>
                    <h4 className="font-extrabold text-xs text-rose-800 mb-0.5">Bước 1: Khớp Đỉnh Góc Vuông</h4>
                    <p className="text-[11px] text-rose-700/90 leading-relaxed font-semibold">
                      Bé kéo thước Ê-ke lại gần đỉnh góc cần đo, sao cho <span className="font-black text-rose-800">Đỉnh Góc Vuông</span> của thước trùng khít vào đỉnh góc cần đo.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black flex items-center justify-center flex-shrink-0 text-sm">2</div>
                  <div>
                    <h4 className="font-extrabold text-xs text-amber-800 mb-0.5">Bước 2: Xoay Khớp Cạnh Thứ Nhất</h4>
                    <p className="text-[11px] text-amber-700/90 leading-relaxed font-semibold">
                      Nhấn giữ vào <span className="font-black text-amber-800">tay cầm xoay màu xanh lá</span> để xoay thước Ê-ke sao cho một cạnh góc vuông của thước trùng khít với một cạnh của góc vẽ.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center flex-shrink-0 text-sm">3</div>
                  <div>
                    <h4 className="font-extrabold text-xs text-emerald-800 mb-0.5">Bước 3: Quan sát Cạnh Thứ Hai để đoán kết quả</h4>
                    <p className="text-[11px] text-emerald-700/90 leading-relaxed font-semibold">
                      Nhìn cạnh còn lại của góc vẽ: <br />
                      ➔ Nếu cạnh góc trùng khít với cạnh đứng của Ê-ke: Đó là <span className="font-black text-emerald-800">GÓC VUÔNG</span>! <br />
                      ➔ Nếu cạnh góc loe rộng ra ngoài hoặc khép hẹp vào trong: Đó là <span className="font-black text-emerald-800">GÓC KHÔNG VUÔNG</span>!
                    </p>
                  </div>
                </div>

              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowGuideModal(false);
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs cursor-pointer shadow"
                >
                  Bé đã hiểu rồi! Bắt đầu đo góc thôi 📐
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* BÁO CÁO HOÀN THÀNH BUỔI HỌC (MODAL POPUP DÀNH CHO HỌC SINH) */}
      <AnimatePresence>
        {showCompleteModal && studentProfile && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-4 border-indigo-500 p-6 shadow-2xl max-w-xl w-full relative max-h-[92vh] overflow-y-auto"
              id="complete-session-modal"
            >
              <button
                onClick={() => {
                  sound.playClick();
                  setShowCompleteModal(false);
                }}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-5">
                <span className="text-4xl">👑🏆🎉</span>
                <h3 className="text-xl font-black text-indigo-950 mt-2">Báo Cáo Hoàn Thành Buổi Học</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Tổng hợp thành tích xuất sắc của bé
                </p>
              </div>

              {/* Bảng bento thông tin siêu dễ thương */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                
                {/* Bé */}
                <div className="col-span-2 bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl flex items-center gap-3">
                  <span className="text-4xl leading-none">{studentProfile.avatar}</span>
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 block">Học sinh</span>
                    <h4 className="font-black text-base text-indigo-950 leading-tight">{studentProfile.name}</h4>
                    <p className="text-xs font-extrabold text-indigo-700 mt-0.5">{studentProfile.className}</p>
                  </div>
                </div>

                {/* Điểm */}
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-center flex flex-col justify-center">
                  <span className="text-xl">⭐</span>
                  <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider block mt-1">Tổng điểm</span>
                  <span className="text-2xl font-black text-amber-700 font-mono mt-0.5">{score} điểm</span>
                </div>

                {/* Thời gian */}
                <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl text-center flex flex-col justify-center">
                  <span className="text-xl">⏱️</span>
                  <span className="text-[10px] uppercase font-black text-sky-500 tracking-wider block mt-1">Thời gian làm</span>
                  <span className="text-sm font-black text-sky-700 mt-1">
                    {formatDuration(Date.now() - sessionStartTime)}
                  </span>
                </div>

                {/* Đúng */}
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-center">
                  <span className="text-xl">✅</span>
                  <span className="text-[10px] uppercase font-black text-emerald-600 tracking-wider block mt-1">Số câu đúng</span>
                  <span className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                    {history.filter(h => h.isCorrect).length} câu
                  </span>
                </div>

                {/* Sai */}
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center">
                  <span className="text-xl">❌</span>
                  <span className="text-[10px] uppercase font-black text-rose-500 tracking-wider block mt-1">Số câu sai</span>
                  <span className="text-xl font-black text-rose-700 font-mono mt-0.5">
                    {history.filter(h => !h.isCorrect).length} câu
                  </span>
                </div>

              </div>

              {/* Danh sách câu sai cần ôn tập */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-5 text-left">
                <h4 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                  <span>📋</span> Chi tiết các câu cần ôn luyện:
                </h4>
                {history.filter(h => !h.isCorrect).length === 0 ? (
                  <div className="text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2">
                    <span>🦁</span>
                    <span>Tuyệt vời quá! Bé đã trả lời đúng tất cả các câu thử thách! 10 điểm cho bé!</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {history.filter(h => !h.isCorrect).map((h, i) => (
                      <div key={`err-${i}`} className="bg-white p-2 rounded-xl border border-slate-150 text-[11px] flex justify-between items-center">
                        <div className="text-left">
                          <span className="font-extrabold text-slate-800 block">{h.questionTitle}</span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            Mức độ: {h.difficulty} • Đáp án đúng: {h.correctType}
                          </span>
                        </div>
                        <span className="text-rose-500 font-black text-[10px] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          Bé chọn: {h.userAnswer}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút đóng / Tiếp tục luyện tập */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                <div className="bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-100 p-3.5 rounded-2xl text-center">
                  <p className="text-[11px] font-bold text-indigo-800 leading-relaxed">
                    🌟 Chúc mừng bé đã hoàn thành xuất sắc bài học hôm nay! Bé hãy tiếp tục ôn luyện để nâng cao điểm số và rèn luyện kỹ năng đo góc thật giỏi nhé!
                  </p>
                </div>

                {appsScriptUrl && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      submitSummaryToSheets();
                    }}
                    disabled={isSubmittingSummary}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm cursor-pointer transition-all active:scale-95 shadow-md text-center flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isSubmittingSummary ? 'Đang gửi kết quả...' : 'Gửi thủ công báo cáo lên Google Sheets 📊'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowCompleteModal(false);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm cursor-pointer transition-all active:scale-95 shadow-md text-center"
                >
                  Tiếp tục luyện tập thêm 📐
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KHUNG CẤU HÌNH DÀNH CHO GIÁO VIÊN / PHỤ HUYNH */}
      <AnimatePresence>
        {showTeacherSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-4 border-indigo-500 p-6 shadow-2xl max-w-xl w-full relative"
              id="teacher-settings-modal"
            >
              <button
                onClick={() => {
                  sound.playClick();
                  setShowTeacherSettingsModal(false);
                }}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-indigo-950">Cấu hình Google Sheets cho Thầy Cô / Phụ huynh</h3>
              </div>

              <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                Để theo dõi và thống kê kết quả làm bài của học sinh, Thầy Cô / Phụ huynh hãy cấu hình liên kết với Google Sheets ở đây. Khi học sinh bấm <b>"Hoàn thành"</b> buổi học, kết quả sẽ tự động đồng bộ lên Sheets một cách lặng lẽ trong nền mà không làm phiền bé.
              </p>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left flex flex-col gap-3.5 mb-4">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    🔗 URL Ứng dụng Web (Web App URL):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      id="apps-script-url-input"
                      defaultValue={appsScriptUrl}
                      className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono text-[11px] bg-white placeholder:text-slate-300"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById('apps-script-url-input') as HTMLInputElement)?.value.trim() || '';
                        setAppsScriptUrl(val);
                        sound.playSuccess();
                        alert('✅ Đã lưu URL kết nối thành công!');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap"
                    >
                      Lưu URL
                    </button>
                  </div>
                </div>

                {/* Các nút Chức năng thử nghiệm */}
                {appsScriptUrl && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-600">Đã lưu liên kết</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testConnection(appsScriptUrl)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Gửi thử nghiệm dòng dữ liệu
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bạn chắc chắn muốn ngắt kết nối với Google Sheet này không?')) {
                            setAppsScriptUrl('');
                            const input = document.getElementById('apps-script-url-input') as HTMLInputElement;
                            if (input) input.value = '';
                            sound.playClick();
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[10px] rounded-lg border border-rose-200 transition-all"
                      >
                        Ngắt kết nối
                      </button>
                    </div>
                  </div>
                )}

                {syncStatus !== 'idle' && (
                  <div className={`p-2.5 rounded-xl text-center text-xs font-bold leading-normal ${
                    syncStatus === 'syncing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    syncStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {syncMessage}
                  </div>
                )}
              </div>

              {/* Hướng dẫn Apps Script tích hợp kèm mã */}
              <div className="border-t border-slate-100 pt-4 text-left">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                    <span>📖</span> Hướng dẫn lấy liên kết trong 3 phút:
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                      setCopied(true);
                      sound.playSuccess();
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Đã sao chép code!' : 'Sao chép đoạn mã code.gs'}</span>
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-[180px] overflow-y-auto text-[10.5px] font-semibold text-slate-600 leading-relaxed space-y-2">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Vào <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-bold">Google Sheets <ExternalLink className="w-3 h-3" /></a>, tạo một Trang tính mới tinh.</li>
                    <li>Trên menu, chọn <b>Tiện ích mở rộng (Extensions)</b> ➔ <b>Apps Script</b>.</li>
                    <li>Xóa toàn bộ mã mặc định có sẵn đi, dán đoạn mã <b>code.gs</b> đã sao chép ở trên vào.</li>
                    <li>Bấm nút <b>Triển khai (Deploy)</b> ở góc trên bên phải ➔ chọn <b>Triển khai mới (New deployment)</b>.</li>
                    <li>Nhấp biểu tượng bánh răng ở loại cấu hình ➔ chọn <b>Ứng dụng Web (Web app)</b>:
                      <ul className="list-disc list-inside pl-4 text-slate-500 mt-0.5 space-y-0.5">
                        <li>Mô tả: Nhập <i>Báo cáo đo góc</i></li>
                        <li>Chạy dưới dạng (Execute as): Chọn <b>Tôi (Tài khoản Google của bạn)</b>.</li>
                        <li>Người có quyền truy cập (Who has access): Chọn <b>Ai cũng có quyền truy cập (Anyone)</b>.</li>
                      </ul>
                    </li>
                    <li>Bấm nút <b>Triển khai</b> màu xanh. Hệ thống Google sẽ hiện hộp thoại yêu cầu cấp quyền truy cập, hãy chọn <b>Ủy quyền truy cập (Authorize Access)</b> ➔ Chọn email của bạn ➔ Chọn <b>Advanced</b> ➔ Click vào link <i>Go to ... (unsafe)</i> ➔ Bấm <b>Allow</b>.</li>
                    <li>Sau khi chạy xong, Google sẽ cung cấp <b>"URL ứng dụng web" (Web App URL)</b> có đuôi kết thúc bằng <code>/exec</code>. Hãy sao chép liên kết đó dán vào ô <b>URL Ứng dụng Web</b> ở trên rồi bấm <b>Lưu URL</b> là xong!</li>
                  </ol>

                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200">
                    <span className="font-bold text-[10px] text-slate-400 block mb-1">Đoạn mã code.gs chi tiết:</span>
                    <pre className="bg-slate-950 text-slate-300 p-2.5 rounded-lg text-[8.5px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-normal text-left">
                      {APPS_SCRIPT_CODE}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowTeacherSettingsModal(false);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  Xong, quay lại trò chơi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
}

// COMPONENT NHỎ NHẬP THÔNG TIN PROFILE (LOGIN FORM)
interface LoginFormProps {
  onLogin: (name: string, className: string, avatar: string) => void;
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [name, setName] = useState<string>('');
  const [className, setClassName] = useState<string>('Ba 1');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🐼');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bé hãy viết họ và tên của mình vào nhé!');
      return;
    }
    if (name.trim().length < 2) {
      setError('Họ tên của bé hơi ngắn, bé viết đầy đủ nhé!');
      return;
    }
    onLogin(name.trim(), className, selectedAvatar);
  };

  return (
    <form onSubmit={handleSubmit} className="text-left flex flex-col gap-4">
      {/* 1. Nhập họ tên */}
      <div>
        <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
          ✍️ Viết tên của bé:
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="Ví dụ: Nguyễn Gia Bảo"
          className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-slate-800 font-extrabold focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 text-sm"
          maxLength={30}
        />
      </div>

      {/* 2. Chọn lớp học */}
      <div>
        <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
          🏫 Bé học lớp mấy nào?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['Ba 1', 'Ba 2', 'Ba 3'].map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => {
                sound.playClick();
                setClassName(cls);
              }}
              className={`py-2 px-1 text-xs font-black rounded-xl border-2 text-center transition-all cursor-pointer ${
                className === cls
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Chọn nhân vật đại diện */}
      <div>
        <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1">
          🦁 Chọn con vật bé thích:
        </label>
        <div className="flex flex-wrap gap-1.5 py-1 justify-between">
          {AVATARS.map((avt) => (
            <button
              key={avt.char}
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedAvatar(avt.char);
              }}
              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer border-2 ${
                selectedAvatar === avt.char
                  ? 'bg-amber-50 border-amber-500 scale-110 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
              title={avt.name}
            >
              {avt.char}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs font-bold text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
          ⚠️ {error}
        </p>
      )}

      {/* Nút đăng nhập */}
      <button
        type="submit"
        className="w-full mt-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-100 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
      >
        <span>Bắt đầu học ngay thôi!</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </form>
  );
}


