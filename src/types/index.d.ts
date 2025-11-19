
interface questions {
  [key: string]: string | number;
}

export type formData = {
  [key: string]: questions;
};

export type formScore = {
  [key: string]: number;
  totalScore: number;
}

