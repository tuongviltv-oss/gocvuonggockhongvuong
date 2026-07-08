import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App if not already done
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export interface LeaderboardEntry {
  id?: string;
  studentName: string;
  className: string;
  score: number;
  elapsedTime: number;
  timestamp: string;
}

// Danh sách dữ liệu mẫu chất lượng cao để hiển thị nếu chưa có dữ liệu thực trong DB
export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { studentName: 'Bé Nguyễn Minh Anh', className: 'Lớp 3A1', score: 120, elapsedTime: 135, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { studentName: 'Bé Trần Nam Khánh', className: 'Lớp 3B', score: 110, elapsedTime: 142, timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
  { studentName: 'Bé Phạm Lê Vy', className: 'Lớp 3A2', score: 105, elapsedTime: 155, timestamp: new Date(Date.now() - 3600000 * 12).toISOString() },
  { studentName: 'Bé Hoàng Gia Bảo', className: 'Lớp 3C', score: 95, elapsedTime: 168, timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
  { studentName: 'Bé Lê Thảo Chi', className: 'Lớp 3A1', score: 90, elapsedTime: 180, timestamp: new Date(Date.now() - 3600000 * 30).toISOString() },
  { studentName: 'Bé Vũ Đức Duy', className: 'Lớp 3D', score: 85, elapsedTime: 195, timestamp: new Date(Date.now() - 3600000 * 48).toISOString() }
];

/**
 * Submits a new score entry to Firestore leaderboard
 */
export const submitLeaderboardScore = async (
  studentName: string,
  className: string,
  score: number,
  elapsedTime: number,
  customDocId?: string
): Promise<string> => {
  try {
    const cleanName = studentName.trim() || 'Bé Học Sinh';
    const cleanClass = className.trim() || 'Lớp 3';
    
    // Sử dụng customDocId nếu có, nếu không sinh mới mã định danh tài liệu hợp lệ
    const cleanId = customDocId || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const docRef = doc(db, 'leaderboard', cleanId);
    
    await setDoc(docRef, {
      studentName: cleanName,
      className: cleanClass,
      score: Number(score),
      elapsedTime: Number(elapsedTime),
      timestamp: new Date().toISOString()
    });
    console.log('Submitted score successfully to Firestore with ID:', cleanId);
    return cleanId;
  } catch (error) {
    console.error('Error submitting score to Firestore:', error);
    throw error;
  }
};

/**
 * Retrieves the top leaderboard entries, sorting in-memory to prevent composite index errors
 */
export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    // Chỉ orderBy một trường để tránh lỗi yêu cầu tạo composite index trong Firestore
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(100)
    );
    const querySnapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        studentName: data.studentName || 'Bé Học Sinh',
        className: data.className || 'Lớp 3',
        score: Number(data.score) || 0,
        elapsedTime: Number(data.elapsedTime) || 0,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });

    // Nếu không có dữ liệu nào trong DB, trả về danh sách mẫu
    if (entries.length === 0) {
      return [...DEFAULT_LEADERBOARD];
    }

    // Sắp xếp nâng cao bằng JavaScript: điểm cao trước, thời gian ít hơn trước
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.elapsedTime - b.elapsedTime;
    });

    // Trả về top 20
    return entries.slice(0, 20);
  } catch (error) {
    console.error('Error fetching leaderboard, falling back to default:', error);
    // Trả về dữ liệu mẫu nếu có lỗi mạng hoặc phân quyền
    return [...DEFAULT_LEADERBOARD];
  }
};
