/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point } from './types';

/**
 * Tính khoảng cách giữa hai điểm
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Tính góc xoay của tia nối từ p1 đến p2 (từ 0 đến 360 độ)
 */
export function getVectorAngle(p1: Point, p2: Point): number {
  let angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Chuẩn hóa góc về khoảng [0, 360)
 */
export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

/**
 * Tính hiệu số góc nhỏ nhất giữa 2 góc (0 đến 180 độ)
 */
export function getAngleDifference(a1: number, a2: number): number {
  const norm1 = normalizeAngle(a1);
  const norm2 = normalizeAngle(a2);
  let diff = Math.abs(norm1 - norm2);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Tính số đo góc giữa 3 điểm (đơn vị: độ, từ 0 đến 180)
 */
export function calculateAngle(vertex: Point, p1: Point, p2: Point): number {
  const angle1 = getVectorAngle(vertex, p1);
  const angle2 = getVectorAngle(vertex, p2);
  return getAngleDifference(angle1, angle2);
}

/**
 * Kết quả kiểm tra cách đặt thước ê-ke
 */
export interface EkeCheckResult {
  isVertexClose: boolean;     // Đỉnh ở đủ gần để snap (khoảng cách <= 25px)
  isVertexSnapped: boolean;   // Đỉnh đã hít hoàn toàn (khoảng cách <= 5px)
  isEdgeAligned: boolean;     // Có ít nhất 1 cạnh trùng khít (lệch góc <= 6 độ)
  isPerfectPlacement: boolean;// Đặt thước cực kỳ chuẩn xác (đỉnh và cạnh đều khớp)
  snappedPosition: Point;     // Tọa độ đỉnh sau khi hít vào vertex
  snappedRotation: number;    // Góc xoay sau khi hít vào cạnh
  alignedEdgeIndex: number;   // Cạnh nào của ê-ke trùng khớp (0: cạnh ngang, 1: cạnh dọc)
  alignedRayIndex: number;    // Trùng với tia nào của góc cần đo (1: tia vertex-p1, 2: tia vertex-p2)
}

/**
 * Kiểm tra xem ê-ke có được đặt đúng hay không
 * ekePos: Tọa độ đỉnh góc vuông của thước ê-ke
 * ekeRot: Góc xoay hiện tại của thước ê-ke (độ)
 * vertex, p1, p2: Thông tin góc cần đo
 */
export function checkEkePlacement(
  ekePos: Point,
  ekeRot: number,
  vertex: Point,
  p1: Point,
  p2: Point
): EkeCheckResult {
  const vertexDist = distance(ekePos, vertex);
  const isVertexClose = vertexDist <= 25;
  const isVertexSnapped = vertexDist <= 5;
  
  // Các tia của góc vẽ
  const ray1Angle = getVectorAngle(vertex, p1);
  const ray2Angle = getVectorAngle(vertex, p2);
  
  // Ê-ke có 2 cạnh góc vuông xuất phát từ đỉnh (0,0):
  // - Cạnh ngang (Right edge): góc xoay cục bộ là 0 độ -> góc tuyệt đối = ekeRot
  // - Cạnh dọc (Up edge): góc xoay cục bộ là -90 độ (hoặc 270) -> góc tuyệt đối = ekeRot - 90
  const ekeRightAngle = normalizeAngle(ekeRot);
  const ekeUpAngle = normalizeAngle(ekeRot - 90);
  
  // Tính độ lệch của các khả năng trùng khít:
  // 1. Cạnh ngang của ê-ke trùng với tia 1
  const diffHorizontalRay1 = getAngleDifference(ekeRightAngle, ray1Angle);
  // 2. Cạnh ngang của ê-ke trùng với tia 2
  const diffHorizontalRay2 = getAngleDifference(ekeRightAngle, ray2Angle);
  // 3. Cạnh dọc của ê-ke trùng với tia 1
  const diffVerticalRay1 = getAngleDifference(ekeUpAngle, ray1Angle);
  // 4. Cạnh dọc của ê-ke trùng với tia 2
  const diffVerticalRay2 = getAngleDifference(ekeUpAngle, ray2Angle);
  
  // Ngưỡng hít góc là 6 độ
  const angleThreshold = 6.0;
  
  let isEdgeAligned = false;
  let snappedRotation = ekeRot;
  let alignedEdgeIndex = -1; // 0: ngang, 1: dọc
  let alignedRayIndex = -1;  // 1: tia 1, 2: tia 2
  
  const diffs = [
    { diff: diffHorizontalRay1, edge: 0, ray: 1, targetRot: ray1Angle },
    { diff: diffHorizontalRay2, edge: 0, ray: 2, targetRot: ray2Angle },
    { diff: diffVerticalRay1, edge: 1, ray: 1, targetRot: ray1Angle + 90 },
    { diff: diffVerticalRay2, edge: 1, ray: 2, targetRot: ray2Angle + 90 }
  ];
  
  // Tìm trường hợp lệch ít nhất
  diffs.sort((a, b) => a.diff - b.diff);
  const bestMatch = diffs[0];
  
  if (bestMatch.diff <= angleThreshold) {
    isEdgeAligned = true;
    alignedEdgeIndex = bestMatch.edge;
    alignedRayIndex = bestMatch.ray;
    snappedRotation = normalizeAngle(bestMatch.targetRot);
  }
  
  const isPerfectPlacement = isVertexClose && isEdgeAligned;
  
  return {
    isVertexClose,
    isVertexSnapped,
    isEdgeAligned,
    isPerfectPlacement,
    snappedPosition: isVertexClose ? { ...vertex } : { ...ekePos },
    snappedRotation: isEdgeAligned ? snappedRotation : ekeRot,
    alignedEdgeIndex,
    alignedRayIndex
  };
}
