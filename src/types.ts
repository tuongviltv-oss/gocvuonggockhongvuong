/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type AngleType = 'Góc vuông' | 'Góc không vuông';

export type Difficulty = 'Dễ' | 'Trung bình' | 'Khó';

export interface StudentProfile {
  name: string;
  className: string;
  avatar: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  questionTitle: string;
  difficulty: Difficulty;
  isCorrect: boolean;
  userAnswer: AngleType;
  correctType: AngleType;
}

export interface LeaderboardItem {
  id: string;
  name: string;
  className: string;
  score: number;
  avatar: string;
  isCurrentUser?: boolean;
}


export interface AngleQuestion {
  id: string;
  title: string;
  subtitle: string;
  vertexName: string; // Tên đỉnh, ví dụ: 'C'
  side1Name: string;  // Tên điểm cạnh 1, ví dụ: 'I'
  side2Name: string;  // Tên điểm cạnh 2, ví dụ: 'K'
  
  // Tọa độ các điểm trên canvas (mặc định canvas kích thước 800 x 420)
  vertex: Point;
  p1: Point; // Điểm thuộc cạnh 1
  p2: Point; // Điểm thuộc cạnh 2
  
  correctType: AngleType;
  explanation: string;
  difficulty: Difficulty;
  
  // Góc chuẩn của các tia để tính toán và tự động đo mẫu
  // angle1, angle2 tính bằng độ từ 0 đến 360
  // rotationGuide là mảng các góc xoay lý tưởng của ê-ke (đỉnh góc vuông trùng vertex)
  // để khớp một cạnh góc vuông của ê-ke với một cạnh của góc vẽ.
  rotationGuides: number[]; 
}
