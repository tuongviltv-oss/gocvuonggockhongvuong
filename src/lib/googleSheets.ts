import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { HistoryItem } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets and Drive access
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;

// Persistent cache within the current session to handle page reloads gracefully
try {
  const savedToken = sessionStorage.getItem('google_sheets_access_token');
  if (savedToken) {
    cachedAccessToken = savedToken;
  }
} catch (e) {
  console.error('Lỗi đọc token từ sessionStorage:', e);
}

/**
 * Initializes the auth listener to monitor Google account changes
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!user) {
        cachedAccessToken = null;
        sessionStorage.removeItem('google_sheets_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Initiates the Google Sign-In popup with requested Google Sheets scopes
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được mã truy cập (Access Token) từ Google Auth. Vui lòng thử lại!');
    }
    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('google_sheets_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google:', error);
    throw error;
  }
};

/**
 * Signs the user out of the application and clears tokens
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('google_sheets_access_token');
};

/**
 * Retrieves the current Google Sheets Access Token
 */
export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface ExportReportData {
  studentName: string;
  className: string;
  score: number;
  badgeName: string;
  elapsedTimeStr: string;
  history: HistoryItem[];
}

/**
 * Creates a beautifully styled learning report directly in the user's Google Sheets
 */
export const createAndExportToGoogleSheets = async (
  accessToken: string,
  data: ExportReportData
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const currentDateStr = new Date().toLocaleDateString('vi-VN');
  const spreadsheetTitle = `Báo cáo học tập Ê-ke hình học - ${data.studentName || 'Học sinh'} - ${currentDateStr}`;

  // 1. Create a brand new Google Spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: spreadsheetTitle
      }
    })
  });

  if (!createResponse.ok) {
    const err = await createResponse.json();
    throw new Error(err.error?.message || 'Không thể khởi tạo bảng tính mới trên tài khoản Google.');
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Prepare visual matrix cells
  const values = [
    [`BÁO CÁO THÀNH TÍCH LUYỆN TẬP ĐO GÓC VỚI Ê-KE`],
    [],
    [`Tên học sinh:`, data.studentName || 'Bé chưa đặt tên'],
    [`Lớp học:`, data.className || 'Bé chưa đặt lớp'],
    [`Tổng điểm thực tế:`, `${data.score} điểm`],
    [`Danh hiệu đạt được:`, data.badgeName],
    [`Thời gian học thực tế:`, data.elapsedTimeStr],
    [`Ngày hoàn thành:`, new Date().toLocaleString('vi-VN')],
    [],
    [`Lịch sử rèn luyện chi tiết thực tế của bé:`],
    [`Thời gian`, `Hòn đảo / Câu hỏi toán học`, `Độ khó`, `Kết quả`, `Lựa chọn của bé`, `Đáp án đúng chuẩn`]
  ];

  if (data.history.length === 0) {
    values.push([`Bé chưa lưu lịch sử làm bài nào trong phiên này.`]);
  } else {
    data.history.forEach((item) => {
      values.push([
        item.timestamp,
        item.questionTitle,
        item.difficulty,
        item.isCorrect ? 'Đúng (Đạt điểm) ✅' : 'Chưa đúng ❌',
        item.userAnswer,
        item.correctType
      ]);
    });
  }

  // 3. Push and write data values
  const writeResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values
      })
    }
  );

  if (!writeResponse.ok) {
    const err = await writeResponse.json();
    throw new Error(err.error?.message || 'Lỗi khi đồng bộ dữ liệu cột vào bảng tính.');
  }

  // 4. Style formatting via batchUpdate to make the output look gorgeous
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          // Merge Title row A1:F1
          {
            mergeCells: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 6
              },
              mergeType: 'MERGE_ALL'
            }
          },
          // Format title to be bold, white on deep indigo, centered
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 6
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.18, green: 0.24, blue: 0.35 },
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    fontSize: 15,
                    bold: true
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          },
          // Format labels in Col A (A3:A8) to be bold
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 2,
                endRowIndex: 8,
                startColumnIndex: 0,
                endColumnIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true, fontSize: 10 }
                }
              },
              fields: 'userEnteredFormat(textFormat)'
            }
          },
          // Format Table Header for Detail List (Row 11) to be emerald green
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 10,
                endRowIndex: 11,
                startColumnIndex: 0,
                endColumnIndex: 6
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.96, blue: 0.93 },
                  textFormat: {
                    bold: true,
                    fontSize: 10,
                    foregroundColor: { red: 0.05, green: 0.35, blue: 0.15 }
                  },
                  horizontalAlignment: 'LEFT'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }
        ]
      })
    });
  } catch (err) {
    console.warn('Lỗi định dạng giao diện Google Sheets (không ảnh hưởng dữ liệu):', err);
  }

  return { spreadsheetId, spreadsheetUrl };
};
