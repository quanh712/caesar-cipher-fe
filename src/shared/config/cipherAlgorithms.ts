export const cipherAlgorithms = [
  {
    value: "caesar",
    name: "Caesar",
    description: "Dịch vòng bảng chữ cái",
    status: "Khả dụng",
    available: true,
  },
  {
    value: "vigenere",
    name: "Vigenère",
    description: "Mã hóa với khóa dạng từ",
    status: "Khả dụng",
    available: true,
  },
  {
    value: "playfair",
    name: "Playfair",
    description: "Mã hóa theo cặp ký tự",
    status: "Khả dụng",
    available: true,
  },
  {
    value: "affine",
    name: "Affine",
    description: "Biến đổi với cặp khóa a, b",
    status: "Khả dụng",
    available: true,
  },
  {
    value: "columnar",
    name: "Hệ mã hàng",
    description: "Hoán vị cột",
    status: "Khả dụng",
    available: true,
  },
] as const;

export type CipherAlgorithm = (typeof cipherAlgorithms)[number]["value"];
