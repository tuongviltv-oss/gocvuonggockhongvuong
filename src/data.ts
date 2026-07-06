/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AngleQuestion } from './types';

export const QUESTIONS: AngleQuestion[] = [
  // ==================== CẤP ĐỘ: DỄ ====================
  {
    id: 'de_1',
    title: 'Thử thách Dễ 1: Góc đỉnh A vuông vắn',
    subtitle: 'Hãy kéo đỉnh thước Ê-ke vào đỉnh A và kiểm tra góc đỉnh A, cạnh AP, AQ nhé:',
    vertexName: 'A',
    side1Name: 'P',
    side2Name: 'Q',
    vertex: { x: 300, y: 280 },
    p1: { x: 300, y: 100 },  // AP thẳng đứng hướng lên (270 độ)
    p2: { x: 550, y: 280 }, // AQ nằm ngang hướng sang phải (0 độ)
    correctType: 'Góc vuông',
    difficulty: 'Dễ',
    explanation: 'Chính xác! Góc đỉnh A; cạnh AP, AQ là GÓC VUÔNG vì hai cạnh AP và AQ hoàn toàn trùng khít với hai cạnh góc vuông của thước ê-ke.',
    rotationGuides: [0, 90, 180, 270]
  },
  {
    id: 'de_2',
    title: 'Thử thách Dễ 2: Góc đỉnh B loe rộng',
    subtitle: 'Dùng thước Ê-ke đo góc đỉnh B, cạnh BG, BH xem hai cạnh này loe rộng hay hẹp hơn thước nhé:',
    vertexName: 'B',
    side1Name: 'G',
    side2Name: 'H',
    vertex: { x: 380, y: 280 },
    p1: { x: 230, y: 130 }, // BG xiên lên trái (225 độ)
    p2: { x: 600, y: 280 }, // BH nằm ngang sang phải (0 độ)
    correctType: 'Góc không vuông',
    difficulty: 'Dễ',
    explanation: 'Đúng rồi! Góc đỉnh B; cạnh BG, BH là GÓC KHÔNG VUÔNG (cụ thể là góc tù). Khi đặt thước trùng cạnh BH, cạnh BG loe rộng ra ngoài thước ê-ke.',
    rotationGuides: [0, 90, 225, 315]
  },
  {
    id: 'de_3',
    title: 'Thử thách Dễ 3: Góc đỉnh C hướng sang trái',
    subtitle: 'Bé đo góc đỉnh C, cạnh CM, CN có một cạnh nằm ngang hướng sang trái:',
    vertexName: 'C',
    side1Name: 'M',
    side2Name: 'N',
    vertex: { x: 450, y: 280 },
    p1: { x: 450, y: 100 },  // CM thẳng đứng hướng lên (270 độ)
    p2: { x: 200, y: 280 },  // CN nằm ngang hướng sang trái (180 độ)
    correctType: 'Góc vuông',
    difficulty: 'Dễ',
    explanation: 'Giỏi quá! Đây là GÓC VUÔNG quay về bên trái. Khi đặt đỉnh ê-ke khớp với C, hai cạnh của góc trùng khít với thước ê-ke.',
    rotationGuides: [90, 180, 270, 0]
  },
  {
    id: 'de_4',
    title: 'Thử thách Dễ 4: Góc nhọn đỉnh D bé nhỏ',
    subtitle: 'Đo góc đỉnh D, cạnh DP, DQ xem góc này có khép hẹp hơn ê-ke không nhé:',
    vertexName: 'D',
    side1Name: 'P',
    side2Name: 'Q',
    vertex: { x: 280, y: 280 },
    p1: { x: 480, y: 140 }, // DP xiên lên phải (325 độ)
    p2: { x: 600, y: 280 }, // DQ nằm ngang hướng sang phải (0 độ)
    correctType: 'Góc không vuông',
    difficulty: 'Dễ',
    explanation: 'Góc đỉnh D; cạnh DP, DQ là GÓC KHÔNG VUÔNG (đây là góc nhọn). Cạnh DP bị khép hụt vào bên trong so với cạnh thẳng đứng của thước ê-ke.',
    rotationGuides: [0, 90, 325, 55]
  },

  // ==================== CẤP ĐỘ: TRUNG BÌNH ====================
  {
    id: 'tb_1',
    title: 'Thử thách Vừa 1: Góc nghiêng đỉnh E',
    subtitle: 'Góc đỉnh E, cạnh EX, EY này bị xoay nghiêng rồi! Hãy xoay thước để đo nhé:',
    vertexName: 'E',
    side1Name: 'X',
    side2Name: 'Y',
    vertex: { x: 380, y: 260 },
    p1: { x: 553, y: 160 }, // EX nghiêng góc -30 độ (330 độ)
    p2: { x: 280, y: 87 },  // EY nghiêng góc -120 độ (240 độ). Hiệu là 90 độ!
    correctType: 'Góc vuông',
    difficulty: 'Trung bình',
    explanation: 'Tuyệt vời! Đây là một GÓC VUÔNG xoay nghiêng. Bé phải xoay thước ê-ke một góc tương ứng để đo chính xác.',
    rotationGuides: [60, 150, 240, 330]
  },
  {
    id: 'tb_2',
    title: 'Thử thách Vừa 2: Góc nhọn nghiêng đỉnh G',
    subtitle: 'Hãy dùng thước kiểm tra góc nghiêng đỉnh G, cạnh GA, GB sau đây:',
    vertexName: 'G',
    side1Name: 'A',
    side2Name: 'B',
    vertex: { x: 380, y: 260 },
    p1: { x: 230, y: 150 }, // GA xiên xiên trái lên (216 độ)
    p2: { x: 530, y: 310 }, // GB xiên xiên phải xuống (18 độ)
    correctType: 'Góc không vuông',
    difficulty: 'Trung bình',
    explanation: 'Đúng rồi! Góc đỉnh G; cạnh GA, GB là GÓC KHÔNG VUÔNG. Khi xoay ê-ke khớp một cạnh, cạnh còn lại không khớp với thước.',
    rotationGuides: [18, 108, 216, 306]
  },
  {
    id: 'tb_3',
    title: 'Thử thách Vừa 3: Góc vuông chúc đầu xuống',
    subtitle: 'Đo góc đỉnh H, cạnh HI, HK mở hướng xuống phía dưới:',
    vertexName: 'H',
    side1Name: 'I',
    side2Name: 'K',
    vertex: { x: 380, y: 150 },
    p1: { x: 380, y: 330 }, // HI thẳng đứng xuống dưới (90 độ)
    p2: { x: 580, y: 150 }, // HK nằm ngang sang phải (0 độ)
    correctType: 'Góc vuông',
    difficulty: 'Trung bình',
    explanation: 'Chính xác! Đây là GÓC VUÔNG mở xuống dưới. Bé xoay thước ê-ke xuống dưới là sẽ thấy khít hoàn toàn!',
    rotationGuides: [0, 90, 180, 270]
  },
  {
    id: 'tb_4',
    title: 'Thử thách Vừa 4: Góc tù nghiêng đỉnh O',
    subtitle: 'Hãy kiểm tra góc đỉnh O, cạnh OP, OQ nghiêng xem loe rộng bao nhiêu nhé:',
    vertexName: 'O',
    side1Name: 'P',
    side2Name: 'Q',
    vertex: { x: 380, y: 220 },
    p1: { x: 230, y: 330 }, // OP hướng góc 143 độ
    p2: { x: 550, y: 120 }, // OQ hướng góc 325 độ
    correctType: 'Góc không vuông',
    difficulty: 'Trung bình',
    explanation: 'Đúng vậy! Góc này có số đo rất rộng (góc tù loe). Góc không vuông này nghiêng nên bé hãy chú ý đặt thước cẩn thận nhé.',
    rotationGuides: [143, 233, 325, 55]
  },

  // ==================== CẤP ĐỘ: KHÓ ====================
  {
    id: 'kho_1',
    title: 'Thử thách Khó 1: Góc siêu suýt soát đỉnh K',
    subtitle: 'Góc đỉnh K, cạnh KM, KN này trông rất giống góc vuông! Bé đo kỹ nhé:',
    vertexName: 'K',
    side1Name: 'M',
    side2Name: 'N',
    vertex: { x: 350, y: 260 },
    p1: { x: 550, y: 260 }, // KM nằm ngang (0 độ)
    p2: { x: 355, y: 80 },  // KN hơi nghiêng một xíu (268 độ thay vì 270) -> Lệch 2 độ!
    correctType: 'Góc không vuông',
    difficulty: 'Khó',
    explanation: 'Bé thật tinh mắt! Góc đỉnh K; cạnh KM, KN KHÔNG VUÔNG (đạt 88 độ, thiếu một chút mới vuông). Nếu không dùng thước ê-ke đo thật kỹ, ta rất dễ bị nhầm lẫn đấy!',
    rotationGuides: [0, 90, 268, 358]
  },
  {
    id: 'kho_2',
    title: 'Thử thách Khó 2: Góc nghiêng lộn ngược đỉnh M',
    subtitle: 'Thử đo góc đỉnh M, cạnh MR, MS xoay chéo cực kỳ hiểm hóc này:',
    vertexName: 'M',
    side1Name: 'R',
    side2Name: 'S',
    vertex: { x: 400, y: 220 },
    p1: { x: 540, y: 320 }, // MR xiên xuống phải (35 độ)
    p2: { x: 280, y: 310 }, // MS xiên xuống trái (143 độ). Chênh lệch 108 độ!
    correctType: 'Góc không vuông',
    difficulty: 'Khó',
    explanation: 'Hoan hô bé! Đây là GÓC KHÔNG VUÔNG loe rộng (góc tù). Khi xoay ê-ke khít cạnh MR, cạnh MS loe ra ngoài xa so với cạnh thước.',
    rotationGuides: [35, 125, 143, 233]
  },
  {
    id: 'kho_3',
    title: 'Thử thách Khó 3: Góc nghiêng vuông đỉnh N',
    subtitle: 'Thước ê-ke phải xoay một góc lạ để đo góc vuông đỉnh N, cạnh NU, NV này:',
    vertexName: 'N',
    side1Name: 'U',
    side2Name: 'V',
    vertex: { x: 380, y: 240 },
    p1: { x: 520, y: 330 }, // NU hướng xiên góc 32 độ
    p2: { x: 290, y: 380 }, // NV hướng xiên góc 122 độ. Đúng góc vuông 90 độ!
    correctType: 'Góc vuông',
    difficulty: 'Khó',
    explanation: 'Cực kỳ xuất sắc! Góc đỉnh N; cạnh NU, NV là GÓC VUÔNG xoay nghiêng 32 độ. Bé đã khéo léo xoay thước trùng khít cả hai cạnh để phát hiện ra!',
    rotationGuides: [32, 122, 212, 302]
  },
  {
    id: 'kho_4',
    title: 'Thử thách Khó 4: Góc gần vuông đỉnh I',
    subtitle: 'Đo góc đỉnh I, cạnh IA, IB, xem góc này khép hẹp hơn góc vuông một tí hay không nhé:',
    vertexName: 'I',
    side1Name: 'A',
    side2Name: 'B',
    vertex: { x: 360, y: 250 },
    p1: { x: 540, y: 250 }, // IA ngang (0 độ)
    p2: { x: 345, y: 80 },  // IB nghiêng hơi hẹp vào trong (275 độ thay vì 270) -> Góc 85 độ!
    correctType: 'Góc không vuông',
    difficulty: 'Khó',
    explanation: 'Quá siêu! Góc đỉnh I; cạnh IA, IB là GÓC KHÔNG VUÔNG (đây là góc nhọn 85 độ). Trông rất giống góc vuông nhưng nó hơi khép nhỏ lại một chút đấy!',
    rotationGuides: [0, 90, 275, 5]
  }
];
