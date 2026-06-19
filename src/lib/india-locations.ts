// Comprehensive India locations: 28 states + 8 union territories, with major cities/districts.
// Coordinates approximate (city center). Used by the Weather page.

export type IndiaCity = { name: string; lat: number; lon: number; aliases?: string[] };
export type IndiaState = { name: string; cities: IndiaCity[] };

export const INDIA_STATES: IndiaState[] = [
  { name: "Andhra Pradesh", cities: [
    { name: "Visakhapatnam", lat: 17.6868, lon: 83.2185 },
    { name: "Vijayawada", lat: 16.5062, lon: 80.6480 },
    { name: "Guntur", lat: 16.3067, lon: 80.4365 },
    { name: "Nellore", lat: 14.4426, lon: 79.9865 },
    { name: "Kurnool", lat: 15.8281, lon: 78.0373 },
    { name: "Tirupati", lat: 13.6288, lon: 79.4192 },
    { name: "Rajahmundry", lat: 17.0005, lon: 81.8040 },
    { name: "Kakinada", lat: 16.9891, lon: 82.2475 },
    { name: "Anantapur", lat: 14.6819, lon: 77.6006 },
    { name: "Kadapa", lat: 14.4673, lon: 78.8242 },
    { name: "Amaravati", lat: 16.5417, lon: 80.5150 },
  ]},
  { name: "Arunachal Pradesh", cities: [
    { name: "Itanagar", lat: 27.0844, lon: 93.6053 },
    { name: "Naharlagun", lat: 27.1044, lon: 93.6953 },
    { name: "Pasighat", lat: 28.0667, lon: 95.3333 },
    { name: "Tawang", lat: 27.5860, lon: 91.8594 },
    { name: "Ziro", lat: 27.6300, lon: 93.8300 },
  ]},
  { name: "Assam", cities: [
    { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
    { name: "Dibrugarh", lat: 27.4728, lon: 94.9120 },
    { name: "Silchar", lat: 24.8333, lon: 92.7789 },
    { name: "Jorhat", lat: 26.7509, lon: 94.2037 },
    { name: "Nagaon", lat: 26.3500, lon: 92.6833 },
    { name: "Tezpur", lat: 26.6528, lon: 92.7926 },
    { name: "Tinsukia", lat: 27.4922, lon: 95.3468 },
    { name: "Dispur", lat: 26.1433, lon: 91.7898 },
  ]},
  { name: "Bihar", cities: [
    { name: "Patna", lat: 25.5941, lon: 85.1376 },
    { name: "Gaya", lat: 24.7914, lon: 85.0002 },
    { name: "Bhagalpur", lat: 25.2425, lon: 86.9842 },
    { name: "Muzaffarpur", lat: 26.1209, lon: 85.3647 },
    { name: "Darbhanga", lat: 26.1542, lon: 85.8918 },
    { name: "Bihar Sharif", lat: 25.1979, lon: 85.5238 },
    { name: "Purnia", lat: 25.7771, lon: 87.4753 },
    { name: "Ara", lat: 25.5560, lon: 84.6630 },
    { name: "Begusarai", lat: 25.4182, lon: 86.1272 },
    { name: "Katihar", lat: 25.5333, lon: 87.5833 },
  ]},
  { name: "Chhattisgarh", cities: [
    { name: "Raipur", lat: 21.2514, lon: 81.6296 },
    { name: "Bhilai", lat: 21.1938, lon: 81.3509 },
    { name: "Bilaspur", lat: 22.0797, lon: 82.1409 },
    { name: "Korba", lat: 22.3458, lon: 82.6963 },
    { name: "Durg", lat: 21.1900, lon: 81.2849 },
    { name: "Raigarh", lat: 21.8974, lon: 83.3950 },
    { name: "Jagdalpur", lat: 19.0822, lon: 82.0347 },
    { name: "Ambikapur", lat: 23.1206, lon: 83.1956 },
  ]},
  { name: "Goa", cities: [
    { name: "Panaji", lat: 15.4909, lon: 73.8278, aliases: ["Panjim"] },
    { name: "Margao", lat: 15.2832, lon: 73.9862 },
    { name: "Vasco da Gama", lat: 15.3950, lon: 73.8157 },
    { name: "Mapusa", lat: 15.5910, lon: 73.8094 },
    { name: "Ponda", lat: 15.4027, lon: 74.0078 },
  ]},
  { name: "Gujarat", cities: [
    { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
    { name: "Surat", lat: 21.1702, lon: 72.8311 },
    { name: "Vadodara", lat: 22.3072, lon: 73.1812 },
    { name: "Rajkot", lat: 22.3039, lon: 70.8022 },
    { name: "Bhavnagar", lat: 21.7645, lon: 72.1519 },
    { name: "Jamnagar", lat: 22.4707, lon: 70.0577 },
    { name: "Gandhinagar", lat: 23.2156, lon: 72.6369 },
    { name: "Junagadh", lat: 21.5222, lon: 70.4579 },
    { name: "Anand", lat: 22.5645, lon: 72.9289 },
    { name: "Bhuj", lat: 23.2420, lon: 69.6669 },
    { name: "Dwarka", lat: 22.2394, lon: 68.9678 },
  ]},
  { name: "Haryana", cities: [
    { name: "Gurugram", lat: 28.4595, lon: 77.0266, aliases: ["Gurgaon"] },
    { name: "Faridabad", lat: 28.4089, lon: 77.3178 },
    { name: "Panipat", lat: 29.3909, lon: 76.9635 },
    { name: "Ambala", lat: 30.3782, lon: 76.7767 },
    { name: "Karnal", lat: 29.6857, lon: 76.9905 },
    { name: "Hisar", lat: 29.1492, lon: 75.7217 },
    { name: "Rohtak", lat: 28.8955, lon: 76.6066 },
    { name: "Chandigarh (HR)", lat: 30.7333, lon: 76.7794 },
    { name: "Sonipat", lat: 28.9931, lon: 77.0151 },
  ]},
  { name: "Himachal Pradesh", cities: [
    { name: "Shimla", lat: 31.1048, lon: 77.1734 },
    { name: "Manali", lat: 32.2396, lon: 77.1887 },
    { name: "Dharamshala", lat: 32.2190, lon: 76.3234 },
    { name: "Kullu", lat: 31.9578, lon: 77.1095 },
    { name: "Solan", lat: 30.9045, lon: 77.0967 },
    { name: "Mandi", lat: 31.7080, lon: 76.9319 },
    { name: "Hamirpur", lat: 31.6862, lon: 76.5213 },
    { name: "Bilaspur (HP)", lat: 31.3340, lon: 76.7615 },
    { name: "Kasauli", lat: 30.9000, lon: 76.9650 },
  ]},
  { name: "Jharkhand", cities: [
    { name: "Ranchi", lat: 23.3441, lon: 85.3096 },
    { name: "Jamshedpur", lat: 22.8046, lon: 86.2029 },
    { name: "Dhanbad", lat: 23.7957, lon: 86.4304 },
    { name: "Bokaro", lat: 23.6693, lon: 86.1511 },
    { name: "Hazaribagh", lat: 23.9966, lon: 85.3616 },
    { name: "Deoghar", lat: 24.4824, lon: 86.6968 },
    { name: "Giridih", lat: 24.1854, lon: 86.3110 },
  ]},
  { name: "Karnataka", cities: [
    { name: "Bengaluru", lat: 12.9716, lon: 77.5946, aliases: ["Bangalore"] },
    { name: "Mysuru", lat: 12.2958, lon: 76.6394, aliases: ["Mysore"] },
    { name: "Mangaluru", lat: 12.9141, lon: 74.8560, aliases: ["Mangalore"] },
    { name: "Hubli", lat: 15.3647, lon: 75.1240 },
    { name: "Belagavi", lat: 15.8497, lon: 74.4977, aliases: ["Belgaum"] },
    { name: "Shivamogga", lat: 13.9299, lon: 75.5681, aliases: ["Shimoga"] },
    { name: "Davangere", lat: 14.4644, lon: 75.9218 },
    { name: "Ballari", lat: 15.1394, lon: 76.9214, aliases: ["Bellary"] },
    { name: "Tumakuru", lat: 13.3409, lon: 77.1010, aliases: ["Tumkur"] },
    { name: "Udupi", lat: 13.3409, lon: 74.7421 },
    { name: "Hassan", lat: 13.0033, lon: 76.1004 },
    { name: "Bidar", lat: 17.9133, lon: 77.5301 },
    { name: "Kalaburagi", lat: 17.3297, lon: 76.8343, aliases: ["Gulbarga"] },
  ]},
  { name: "Kerala", cities: [
    { name: "Thiruvananthapuram", lat: 8.5241, lon: 76.9366, aliases: ["Trivandrum"] },
    { name: "Kochi", lat: 9.9312, lon: 76.2673, aliases: ["Cochin", "Ernakulam"] },
    { name: "Kozhikode", lat: 11.2588, lon: 75.7804, aliases: ["Calicut"] },
    { name: "Thrissur", lat: 10.5276, lon: 76.2144 },
    { name: "Kannur", lat: 11.8745, lon: 75.3704 },
    { name: "Kollam", lat: 8.8932, lon: 76.6141 },
    { name: "Alappuzha", lat: 9.4981, lon: 76.3388, aliases: ["Alleppey"] },
    { name: "Palakkad", lat: 10.7867, lon: 76.6548 },
    { name: "Kottayam", lat: 9.5916, lon: 76.5222 },
    { name: "Malappuram", lat: 11.0510, lon: 76.0711 },
    { name: "Munnar", lat: 10.0889, lon: 77.0595 },
  ]},
  { name: "Madhya Pradesh", cities: [
    { name: "Bhopal", lat: 23.2599, lon: 77.4126 },
    { name: "Indore", lat: 22.7196, lon: 75.8577 },
    { name: "Jabalpur", lat: 23.1815, lon: 79.9864 },
    { name: "Gwalior", lat: 26.2183, lon: 78.1828 },
    { name: "Ujjain", lat: 23.1765, lon: 75.7885 },
    { name: "Sagar", lat: 23.8388, lon: 78.7378 },
    { name: "Dewas", lat: 22.9676, lon: 76.0534 },
    { name: "Satna", lat: 24.5667, lon: 80.8167 },
    { name: "Ratlam", lat: 23.3315, lon: 75.0367 },
    { name: "Rewa", lat: 24.5374, lon: 81.3043 },
    { name: "Khajuraho", lat: 24.8318, lon: 79.9199 },
  ]},
  { name: "Maharashtra", cities: [
    { name: "Mumbai", lat: 19.0760, lon: 72.8777, aliases: ["Bombay"] },
    { name: "Pune", lat: 18.5204, lon: 73.8567 },
    { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
    { name: "Nashik", lat: 19.9975, lon: 73.7898 },
    { name: "Aurangabad", lat: 19.8762, lon: 75.3433, aliases: ["Chhatrapati Sambhaji Nagar"] },
    { name: "Solapur", lat: 17.6599, lon: 75.9064 },
    { name: "Thane", lat: 19.2183, lon: 72.9781 },
    { name: "Navi Mumbai", lat: 19.0330, lon: 73.0297 },
    { name: "Kolhapur", lat: 16.7050, lon: 74.2433 },
    { name: "Amravati", lat: 20.9374, lon: 77.7796 },
    { name: "Akola", lat: 20.7059, lon: 77.0219 },
    { name: "Sangli", lat: 16.8524, lon: 74.5815 },
    { name: "Latur", lat: 18.4088, lon: 76.5604 },
  ]},
  { name: "Manipur", cities: [
    { name: "Imphal", lat: 24.8170, lon: 93.9368 },
    { name: "Thoubal", lat: 24.6385, lon: 93.9970 },
    { name: "Bishnupur", lat: 24.6307, lon: 93.7700 },
    { name: "Churachandpur", lat: 24.3340, lon: 93.6840 },
    { name: "Ukhrul", lat: 25.0900, lon: 94.3650 },
  ]},
  { name: "Meghalaya", cities: [
    { name: "Shillong", lat: 25.5788, lon: 91.8933 },
    { name: "Tura", lat: 25.5142, lon: 90.2026 },
    { name: "Jowai", lat: 25.4500, lon: 92.2000 },
    { name: "Cherrapunji", lat: 25.2700, lon: 91.7320, aliases: ["Sohra"] },
    { name: "Nongstoin", lat: 25.5167, lon: 91.2667 },
  ]},
  { name: "Mizoram", cities: [
    { name: "Aizawl", lat: 23.7271, lon: 92.7176 },
    { name: "Lunglei", lat: 22.8800, lon: 92.7300 },
    { name: "Champhai", lat: 23.4500, lon: 93.3200 },
    { name: "Serchhip", lat: 23.3000, lon: 92.8500 },
  ]},
  { name: "Nagaland", cities: [
    { name: "Kohima", lat: 25.6701, lon: 94.1077 },
    { name: "Dimapur", lat: 25.9091, lon: 93.7266 },
    { name: "Mokokchung", lat: 26.3220, lon: 94.5159 },
    { name: "Tuensang", lat: 26.2772, lon: 94.8290 },
    { name: "Wokha", lat: 26.1000, lon: 94.2667 },
  ]},
  { name: "Odisha", cities: [
    { name: "Bhubaneswar", lat: 20.2961, lon: 85.8245 },
    { name: "Cuttack", lat: 20.4625, lon: 85.8830 },
    { name: "Rourkela", lat: 22.2604, lon: 84.8536 },
    { name: "Berhampur", lat: 19.3149, lon: 84.7941 },
    { name: "Sambalpur", lat: 21.4669, lon: 83.9756 },
    { name: "Puri", lat: 19.8135, lon: 85.8312 },
    { name: "Balasore", lat: 21.4942, lon: 86.9335 },
    { name: "Angul", lat: 20.8400, lon: 85.1010 },
  ]},
  { name: "Punjab", cities: [
    { name: "Ludhiana", lat: 30.9010, lon: 75.8573 },
    { name: "Amritsar", lat: 31.6340, lon: 74.8723 },
    { name: "Jalandhar", lat: 31.3260, lon: 75.5762 },
    { name: "Patiala", lat: 30.3398, lon: 76.3869 },
    { name: "Bathinda", lat: 30.2110, lon: 74.9455 },
    { name: "Mohali", lat: 30.7046, lon: 76.7179 },
    { name: "Pathankot", lat: 32.2746, lon: 75.6521 },
    { name: "Hoshiarpur", lat: 31.5344, lon: 75.9119 },
    { name: "Moga", lat: 30.8138, lon: 75.1735 },
  ]},
  { name: "Rajasthan", cities: [
    { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
    { name: "Jodhpur", lat: 26.2389, lon: 73.0243 },
    { name: "Udaipur", lat: 24.5854, lon: 73.7125 },
    { name: "Kota", lat: 25.2138, lon: 75.8648 },
    { name: "Ajmer", lat: 26.4499, lon: 74.6399 },
    { name: "Bikaner", lat: 28.0229, lon: 73.3119 },
    { name: "Bhilwara", lat: 25.3463, lon: 74.6364 },
    { name: "Alwar", lat: 27.5530, lon: 76.6346 },
    { name: "Sikar", lat: 27.6094, lon: 75.1399 },
    { name: "Pushkar", lat: 26.4892, lon: 74.5511 },
    { name: "Mount Abu", lat: 24.5926, lon: 72.7156 },
    { name: "Jaisalmer", lat: 26.9157, lon: 70.9083 },
  ]},
  { name: "Sikkim", cities: [
    { name: "Gangtok", lat: 27.3389, lon: 88.6065 },
    { name: "Namchi", lat: 27.1672, lon: 88.3637 },
    { name: "Gyalshing", lat: 27.2833, lon: 88.2667 },
    { name: "Mangan", lat: 27.5083, lon: 88.5333 },
    { name: "Pelling", lat: 27.3167, lon: 88.2391 },
  ]},
  { name: "Tamil Nadu", cities: [
    { name: "Chennai", lat: 13.0827, lon: 80.2707, aliases: ["Madras"] },
    { name: "Coimbatore", lat: 11.0168, lon: 76.9558 },
    { name: "Salem", lat: 11.6643, lon: 78.1460 },
    { name: "Madurai", lat: 9.9252, lon: 78.1198 },
    { name: "Trichy", lat: 10.7905, lon: 78.7047, aliases: ["Tiruchirappalli"] },
    { name: "Erode", lat: 11.3410, lon: 77.7172 },
    { name: "Namakkal", lat: 11.2189, lon: 78.1674 },
    { name: "Tiruppur", lat: 11.1085, lon: 77.3411 },
    { name: "Vellore", lat: 12.9165, lon: 79.1325 },
    { name: "Thoothukudi", lat: 8.7642, lon: 78.1348, aliases: ["Tuticorin"] },
    { name: "Tirunelveli", lat: 8.7139, lon: 77.7567 },
    { name: "Thanjavur", lat: 10.7867, lon: 79.1378 },
    { name: "Karur", lat: 10.9601, lon: 78.0766 },
    { name: "Kanchipuram", lat: 12.8342, lon: 79.7036 },
    { name: "Dharmapuri", lat: 12.1357, lon: 78.1583 },
    { name: "Krishnagiri", lat: 12.5266, lon: 78.2150 },
    { name: "Nagapattinam", lat: 10.7656, lon: 79.8424 },
    { name: "Cuddalore", lat: 11.7480, lon: 79.7714 },
    { name: "Dindigul", lat: 10.3673, lon: 77.9803 },
    { name: "Sivakasi", lat: 9.4533, lon: 77.7991 },
    { name: "Virudhunagar", lat: 9.5681, lon: 77.9624 },
    { name: "Nilgiris", lat: 11.4916, lon: 76.7337, aliases: ["Ooty", "Udhagamandalam"] },
    { name: "Kanyakumari", lat: 8.0883, lon: 77.5385 },
    { name: "Hosur", lat: 12.7409, lon: 77.8253 },
  ]},
  { name: "Telangana", cities: [
    { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
    { name: "Warangal", lat: 17.9689, lon: 79.5941 },
    { name: "Nizamabad", lat: 18.6725, lon: 78.0941 },
    { name: "Karimnagar", lat: 18.4386, lon: 79.1288 },
    { name: "Khammam", lat: 17.2473, lon: 80.1514 },
    { name: "Mahbubnagar", lat: 16.7488, lon: 77.9866 },
    { name: "Secunderabad", lat: 17.4399, lon: 78.4983 },
    { name: "Adilabad", lat: 19.6667, lon: 78.5333 },
  ]},
  { name: "Tripura", cities: [
    { name: "Agartala", lat: 23.8315, lon: 91.2868 },
    { name: "Udaipur (TR)", lat: 23.5333, lon: 91.4833 },
    { name: "Dharmanagar", lat: 24.3667, lon: 92.1667 },
    { name: "Kailashahar", lat: 24.3333, lon: 92.0000 },
    { name: "Ambassa", lat: 23.9333, lon: 91.8500 },
  ]},
  { name: "Uttar Pradesh", cities: [
    { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
    { name: "Kanpur", lat: 26.4499, lon: 80.3319 },
    { name: "Agra", lat: 27.1767, lon: 78.0081 },
    { name: "Varanasi", lat: 25.3176, lon: 82.9739, aliases: ["Banaras", "Kashi"] },
    { name: "Prayagraj", lat: 25.4358, lon: 81.8463, aliases: ["Allahabad"] },
    { name: "Meerut", lat: 28.9845, lon: 77.7064 },
    { name: "Ghaziabad", lat: 28.6692, lon: 77.4538 },
    { name: "Noida", lat: 28.5355, lon: 77.3910 },
    { name: "Bareilly", lat: 28.3670, lon: 79.4304 },
    { name: "Aligarh", lat: 27.8974, lon: 78.0880 },
    { name: "Moradabad", lat: 28.8386, lon: 78.7733 },
    { name: "Saharanpur", lat: 29.9680, lon: 77.5552 },
    { name: "Gorakhpur", lat: 26.7606, lon: 83.3732 },
    { name: "Ayodhya", lat: 26.7922, lon: 82.1998 },
    { name: "Mathura", lat: 27.4924, lon: 77.6737 },
    { name: "Jhansi", lat: 25.4484, lon: 78.5685 },
    { name: "Firozabad", lat: 27.1591, lon: 78.3957 },
  ]},
  { name: "Uttarakhand", cities: [
    { name: "Dehradun", lat: 30.3165, lon: 78.0322 },
    { name: "Haridwar", lat: 29.9457, lon: 78.1642 },
    { name: "Rishikesh", lat: 30.0869, lon: 78.2676 },
    { name: "Nainital", lat: 29.3919, lon: 79.4542 },
    { name: "Mussoorie", lat: 30.4598, lon: 78.0664 },
    { name: "Roorkee", lat: 29.8543, lon: 77.8880 },
    { name: "Haldwani", lat: 29.2183, lon: 79.5130 },
    { name: "Almora", lat: 29.5971, lon: 79.6593 },
    { name: "Joshimath", lat: 30.5550, lon: 79.5667 },
  ]},
  { name: "West Bengal", cities: [
    { name: "Kolkata", lat: 22.5726, lon: 88.3639, aliases: ["Calcutta"] },
    { name: "Howrah", lat: 22.5958, lon: 88.2636 },
    { name: "Durgapur", lat: 23.5204, lon: 87.3119 },
    { name: "Asansol", lat: 23.6739, lon: 86.9524 },
    { name: "Siliguri", lat: 26.7271, lon: 88.3953 },
    { name: "Darjeeling", lat: 27.0360, lon: 88.2627 },
    { name: "Malda", lat: 25.0096, lon: 88.1414 },
    { name: "Kharagpur", lat: 22.3460, lon: 87.2320 },
    { name: "Bardhaman", lat: 23.2324, lon: 87.8615 },
    { name: "Haldia", lat: 22.0667, lon: 88.0698 },
  ]},
  // ---------- Union Territories ----------
  { name: "Delhi (UT)", cities: [
    { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Delhi", lat: 28.7041, lon: 77.1025 },
    { name: "Dwarka", lat: 28.5921, lon: 77.0460 },
    { name: "Rohini", lat: 28.7495, lon: 77.0565 },
    { name: "Saket", lat: 28.5245, lon: 77.2066 },
  ]},
  { name: "Puducherry (UT)", cities: [
    { name: "Puducherry", lat: 11.9416, lon: 79.8083, aliases: ["Pondicherry"] },
    { name: "Karaikal", lat: 10.9254, lon: 79.8380 },
    { name: "Mahe", lat: 11.7011, lon: 75.5365 },
    { name: "Yanam", lat: 16.7333, lon: 82.2167 },
  ]},
  { name: "Jammu and Kashmir (UT)", cities: [
    { name: "Srinagar", lat: 34.0837, lon: 74.7973 },
    { name: "Jammu", lat: 32.7266, lon: 74.8570 },
    { name: "Anantnag", lat: 33.7311, lon: 75.1487 },
    { name: "Baramulla", lat: 34.2090, lon: 74.3436 },
    { name: "Udhampur", lat: 32.9255, lon: 75.1416 },
    { name: "Gulmarg", lat: 34.0484, lon: 74.3805 },
    { name: "Pahalgam", lat: 34.0151, lon: 75.3318 },
    { name: "Sonmarg", lat: 34.3030, lon: 75.2900 },
  ]},
  { name: "Ladakh (UT)", cities: [
    { name: "Leh", lat: 34.1526, lon: 77.5771 },
    { name: "Kargil", lat: 34.5539, lon: 76.1349 },
    { name: "Nubra", lat: 34.6731, lon: 77.5613 },
    { name: "Diskit", lat: 34.5475, lon: 77.5604 },
    { name: "Pangong", lat: 33.7506, lon: 78.6478 },
  ]},
  { name: "Chandigarh (UT)", cities: [
    { name: "Chandigarh", lat: 30.7333, lon: 76.7794 },
  ]},
  { name: "Lakshadweep (UT)", cities: [
    { name: "Kavaratti", lat: 10.5667, lon: 72.6417 },
    { name: "Agatti", lat: 10.8500, lon: 72.2000 },
    { name: "Minicoy", lat: 8.2833, lon: 73.0500 },
    { name: "Andrott", lat: 10.8167, lon: 73.6833 },
  ]},
  { name: "Andaman and Nicobar Islands (UT)", cities: [
    { name: "Port Blair", lat: 11.6234, lon: 92.7265 },
    { name: "Havelock", lat: 12.0270, lon: 92.9810, aliases: ["Swaraj Dweep"] },
    { name: "Diglipur", lat: 13.2667, lon: 93.0167 },
    { name: "Car Nicobar", lat: 9.1500, lon: 92.8000 },
  ]},
  { name: "Dadra and Nagar Haveli and Daman and Diu (UT)", cities: [
    { name: "Daman", lat: 20.3974, lon: 72.8328 },
    { name: "Diu", lat: 20.7144, lon: 70.9874 },
    { name: "Silvassa", lat: 20.2738, lon: 73.0140 },
  ]},
];

export type FlatCity = { state: string; city: string; lat: number; lon: number };

export const ALL_INDIA_CITIES: FlatCity[] = INDIA_STATES.flatMap((s) =>
  s.cities.flatMap((c) => {
    const base = { state: s.name, city: c.name, lat: c.lat, lon: c.lon };
    const aliasEntries = (c.aliases ?? []).map((a) => ({ ...base, city: a }));
    return [base, ...aliasEntries];
  }),
);

// Haversine distance in km
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function searchIndia(query: string, limit = 12): FlatCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ item: FlatCity; score: number }> = [];
  for (const c of ALL_INDIA_CITIES) {
    const city = c.city.toLowerCase();
    const state = c.state.toLowerCase();
    let score = 0;
    if (city === q) score = 100;
    else if (city.startsWith(q)) score = 80;
    else if (city.includes(q)) score = 60;
    else if (state === q) score = 50;
    else if (state.startsWith(q)) score = 40;
    else if (state.includes(q)) score = 25;
    if (score > 0) scored.push({ item: c, score: score - Math.abs(city.length - q.length) * 0.1 });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

export function nearestIndianCity(lat: number, lon: number): FlatCity {
  let best = ALL_INDIA_CITIES[0];
  let bestD = Infinity;
  for (const c of ALL_INDIA_CITIES) {
    const d = distanceKm({ lat, lon }, { lat: c.lat, lon: c.lon });
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
