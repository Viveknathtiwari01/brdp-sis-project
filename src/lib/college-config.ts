export const COLLEGE_CONFIG = {
  BRDP: {
    name: "Sri Bhupram Dharmeshwar Prasad Mahavidyalaya",
    logoPath: "/logo.png",
    address: "Village Mohiuddinpur Sahroi, Post: Sitapur, Block: Ailiya, District: Sitapur, Uttar Pradesh - 261001",
  },
  RAK: {
    name: "Ram Autar Kalyani Devi Mahavidyalaya",
    logoPath: "/Ram_autar-modified.png",
    address: "Village - Bhinaini, Biswan, District: Sitapur, Uttar Pradesh - 261001",
  },
} as const;

export type CollegeCode = keyof typeof COLLEGE_CONFIG;
