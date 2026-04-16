export const COLLEGE_CONFIG = {
  BRDP: {
    name: "Sri Bhupram Dharmeshwar Prasad Mahavidyalaya",
    logoPath: "/logo.png",
  },
  RAK: {
    name: "Ram Autar Kalyani Devi Mahavidyalaya",
    logoPath: "/Ram_autar-modified.png",
  },
} as const;

export type CollegeCode = keyof typeof COLLEGE_CONFIG;
