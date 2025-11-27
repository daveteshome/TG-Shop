// Ethiopian regions and cities data for address forms

export type Region = {
  id: string;
  name: string;
};

export type City = {
  id: string;
  name: string;
};

export const ETHIOPIAN_REGIONS: Region[] = [
  { id: "addis_ababa", name: "Addis Ababa" },
  { id: "dire_dawa", name: "Dire Dawa" },
  { id: "afar", name: "Afar" },
  { id: "amhara", name: "Amhara" },
  { id: "oromia", name: "Oromia" },
  { id: "somali", name: "Somali" },
  { id: "tigray", name: "Tigray" },
  { id: "benishangul_gumuz", name: "Benishangul-Gumuz" },
  { id: "gambela", name: "Gambela Peoples' Region" },
  { id: "harari", name: "Harari Region" },
  { id: "sidama", name: "Sidama" },
  { id: "south_west_ethiopia", name: "South West Ethiopia Peoples' Region" },
  { id: "central_ethiopia", name: "Central Ethiopia Region" },
  { id: "south_ethiopia", name: "South Ethiopia Region" },
];

export const CITIES_BY_REGION: Record<string, City[]> = {
  addis_ababa: [
    { id: "addis_ketema", name: "Addis Ketema" },
    { id: "akaky_kaliti", name: "Akaky Kaliti" },
    { id: "arada", name: "Arada" },
    { id: "bole", name: "Bole" },
    { id: "gullele", name: "Gullele" },
    { id: "kirkos", name: "Kirkos" },
    { id: "kolfe_keranio", name: "Kolfe Keranio" },
    { id: "lideta", name: "Lideta" },
    { id: "nifas_silk_lafto", name: "Nifas Silk-Lafto" },
    { id: "yeka", name: "Yeka" },
    { id: "lemi_kura", name: "Lemi Kura" },
    { id: "other", name: "Other (specify)" },
  ],
  dire_dawa: [
    { id: "dire_dawa", name: "Dire Dawa" },
    { id: "other", name: "Other (specify)" },
  ],
  afar: [
    { id: "semera", name: "Semera" },
    { id: "asayita", name: "Asayita" },
    { id: "awash", name: "Awash" },
    { id: "logiya", name: "Logiya" },
    { id: "dubti", name: "Dubti" },
    { id: "gewane", name: "Gewane" },
    { id: "chifra", name: "Chifra" },
    { id: "abala", name: "Abala" },
    { id: "other", name: "Other (specify)" },
  ],
  amhara: [
    { id: "bahir_dar", name: "Bahir Dar" },
    { id: "gondar", name: "Gondar" },
    { id: "dessie", name: "Dessie" },
    { id: "debre_birhan", name: "Debre Birhan" },
    { id: "debre_markos", name: "Debre Markos" },
    { id: "woldiya", name: "Woldiya" },
    { id: "kombolcha", name: "Kombolcha" },
    { id: "debre_tabor", name: "Debre Tabor" },
    { id: "lalibela", name: "Lalibela" },
    { id: "finote_selam", name: "Finote Selam" },
    { id: "azezo", name: "Azezo" },
    { id: "woreta", name: "Woreta" },
    { id: "other", name: "Other (specify)" },
  ],
  oromia: [
    { id: "adama", name: "Adama (Nazret)" },
    { id: "jimma", name: "Jimma" },
    { id: "bishoftu", name: "Bishoftu (Debre Zeit)" },
    { id: "shashamene", name: "Shashamene" },
    { id: "nekemte", name: "Nekemte" },
    { id: "ambo", name: "Ambo" },
    { id: "asella", name: "Asella" },
    { id: "bale_robe", name: "Bale Robe" },
    { id: "dembi_dollo", name: "Dembi Dollo" },
    { id: "gimbi", name: "Gimbi" },
    { id: "holeta", name: "Holeta" },
    { id: "other", name: "Other (specify)" },
  ],
  somali: [
    { id: "jijiga", name: "Jijiga" },
    { id: "gode", name: "Gode" },
    { id: "degehabur", name: "Degehabur" },
    { id: "kebri_dahar", name: "Kebri Dahar" },
    { id: "kelafo", name: "Kelafo" },
    { id: "werder", name: "Werder" },
    { id: "shinile", name: "Shinile" },
    { id: "filtu", name: "Filtu" },
    { id: "other", name: "Other (specify)" },
  ],
  tigray: [
    { id: "mekelle", name: "Mekelle" },
    { id: "adigrat", name: "Adigrat" },
    { id: "axum", name: "Axum" },
    { id: "shire", name: "Shire" },
    { id: "adwa", name: "Adwa" },
    { id: "wukro", name: "Wukro" },
    { id: "alamata", name: "Alamata" },
    { id: "humera", name: "Humera" },
    { id: "other", name: "Other (specify)" },
  ],
  benishangul_gumuz: [
    { id: "assosa", name: "Assosa" },
    { id: "bambasi", name: "Bambasi" },
    { id: "pawe", name: "Pawe" },
    { id: "dibate", name: "Dibate" },
    { id: "bulen", name: "Bulen" },
    { id: "gilgel_beles", name: "Gilgel Beles" },
    { id: "alimu", name: "Alimu" },
    { id: "other", name: "Other (specify)" },
  ],
  gambela: [
    { id: "gambela", name: "Gambela" },
    { id: "abobo", name: "Abobo" },
    { id: "dima", name: "Dima" },
    { id: "itang", name: "Itang" },
    { id: "pinyudo", name: "Pinyudo" },
    { id: "other", name: "Other (specify)" },
  ],
  harari: [
    { id: "harar", name: "Harar" },
    { id: "other", name: "Other (specify)" },
  ],
  sidama: [
    { id: "hawassa", name: "Hawassa" },
    { id: "yirgalem", name: "Yirgalem" },
    { id: "aleta_wondo", name: "Aleta Wondo" },
    { id: "wondogenet", name: "Wondogenet" },
    { id: "other", name: "Other (specify)" },
  ],
  south_west_ethiopia: [
    { id: "bonga", name: "Bonga" },
    { id: "mizan_teferi", name: "Mizan Teferi" },
    { id: "tepi", name: "Tepi" },
    { id: "tercha", name: "Tercha" },
    { id: "other", name: "Other (specify)" },
  ],
  central_ethiopia: [
    { id: "hosaena", name: "Hosaena" },
    { id: "welkite", name: "Welkite" },
    { id: "butajira", name: "Butajira" },
    { id: "durame", name: "Durame" },
    { id: "worabe", name: "Worabe" },
    { id: "other", name: "Other (specify)" },
  ],
  south_ethiopia: [
    { id: "wolaita_sodo", name: "Wolaita Sodo" },
    { id: "arba_minch", name: "Arba Minch" },
    { id: "dilla", name: "Dilla" },
    { id: "sawla", name: "Sawla" },
    { id: "karati", name: "Karati" },
    { id: "jinka", name: "Jinka" },
    { id: "wondo_genet", name: "Wondo Genet" },
    { id: "konso", name: "Konso" },
    { id: "other", name: "Other (specify)" },
  ],
};

// Helper function to get region name by ID
export function getRegionName(regionId: string): string {
  return ETHIOPIAN_REGIONS.find(r => r.id === regionId)?.name || regionId;
}

// Helper function to get city name by region and city ID
export function getCityName(regionId: string, cityId: string): string {
  const cities = CITIES_BY_REGION[regionId] || [];
  return cities.find(c => c.id === cityId)?.name || cityId;
}

// Helper function to get cities for a region
export function getCitiesForRegion(regionId: string): City[] {
  return CITIES_BY_REGION[regionId] || [];
}
