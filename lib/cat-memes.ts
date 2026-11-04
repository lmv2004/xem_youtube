export type CatDanceMeme = {
  id: string;
  name: string;
  gifUrl: string;
  description: string;
};

export const CAT_DANCE_MEMES: CatDanceMeme[] = [
  {
    id: "GK7dGndK4kyOozR9Xk",
    name: "Mèo Disco Neon",
    gifUrl: "https://media.giphy.com/media/GK7dGndK4kyOozR9Xk/giphy.gif",
    description: "Nhảy disco cực cháy dưới ánh đèn neon",
  },
  {
    id: "zSGgvMVt1eyOP6xFkL",
    name: "Mèo Hiphop Swag",
    gifUrl: "https://media.giphy.com/media/zSGgvMVt1eyOP6xFkL/giphy.gif",
    description: "Phong cách đường phố siêu chất",
  },
  {
    id: "125E8v90blHqtr4HrB",
    name: "Mèo Quẩy Tưng Bừng",
    gifUrl: "https://media.giphy.com/media/125E8v90blHqtr4HrB/giphy.gif",
    description: "Quẩy hết mình bất chấp mọi giai điệu",
  },
  {
    id: "VFan3BwgJDo3HFmW61",
    name: "Mèo Idol K-pop",
    gifUrl: "https://media.giphy.com/media/VFan3BwgJDo3HFmW61/giphy.gif",
    description: "Vũ đạo thần tượng đều tăm tắp",
  },
  {
    id: "3UkqVq3F50bVCi9URl",
    name: "Mèo Lắc Hông Cực Dính",
    gifUrl: "https://media.giphy.com/media/3UkqVq3F50bVCi9URl/giphy.gif",
    description: "Điệu nhảy lắc hông gây nghiện",
  },
  {
    id: "xUd1OEXqJjAywiWD66",
    name: "Mèo Vũ Đạo TikTok",
    gifUrl: "https://media.giphy.com/media/xUd1OEXqJjAywiWD66/giphy.gif",
    description: "Bắt trend cực nhanh theo từng nhịp bass",
  },
  {
    id: "7xqRFGrGcC1UgZ6jUk",
    name: "Mèo Nhún Nhảy Bốc Lửa",
    gifUrl: "https://media.giphy.com/media/7xqRFGrGcC1UgZ6jUk/giphy.gif",
    description: "Đầy năng lượng và nhiệt huyết",
  },
  {
    id: "pXyeelfRAtvCheDeY5",
    name: "Mèo Thủy Thủ Tinh Nghịch",
    gifUrl: "https://media.giphy.com/media/pXyeelfRAtvCheDeY5/giphy.gif",
    description: "Điệu nhảy thủy thủ vui nhộn",
  },
  {
    id: "93mS3A87wfmOySC29W",
    name: "Mèo Vũ Công Viral",
    gifUrl: "https://media.giphy.com/media/93mS3A87wfmOySC29W/giphy.gif",
    description: "Chiếm trọn spotlight sân khấu",
  },
  {
    id: "9n0CvokbUMaWhFuCkp",
    name: "Mèo Meme Tấu Hài",
    gifUrl: "https://media.giphy.com/media/9n0CvokbUMaWhFuCkp/giphy.gif",
    description: "Điệu nhảy hài hước làm bừng sáng phòng",
  },
  {
    id: "sg3JambRg9UlX3fq5G",
    name: "Mèo Con Dễ Thương",
    gifUrl: "https://media.giphy.com/media/sg3JambRg9UlX3fq5G/giphy.gif",
    description: "Đốn tim người xem với từng động tác",
  },
  {
    id: "8pYMOn1sEb43EloTf8",
    name: "Mèo Synthwave Retro",
    gifUrl: "https://media.giphy.com/media/8pYMOn1sEb43EloTf8/giphy.gif",
    description: "Vũ điệu thập niên 80 hoài niệm",
  },
];

export function getRandomCatMeme(excludeIds: string[] = []): CatDanceMeme {
  const pool = CAT_DANCE_MEMES.filter((c) => !excludeIds.includes(c.id));
  const candidates = pool.length > 0 ? pool : CAT_DANCE_MEMES;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}
