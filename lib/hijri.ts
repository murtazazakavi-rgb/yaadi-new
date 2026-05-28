// Hijri year remainders for determining Kabisa years
const KABISA_YEAR_REMAINDERS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];

// number of days in a Hijri year per month (cumulative)
const DAYS_IN_YEAR = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];

// number of days in 30-years per Hijri year (cumulative)
const DAYS_IN_30_YEARS = [
   354,  709, 1063, 1417, 1772, 2126, 2480, 2835,  3189,  3544,
  3898, 4252, 4607, 4961, 5315, 5670, 6024, 6378,  6733,  7087,
  7442, 7796, 8150, 8505, 8859, 9213, 9568, 9922, 10277, 10631
];

export const HIJRI_MONTH_NAMES = [
  "Moharram al-Haraam",
  "Safar al-Muzaffar",
  "Rabi al-Awwal",
  "Rabi al-Aakhar",
  "Jumada al-Ula",
  "Jumada al-Ukhra",
  "Rajab al-Asab",
  "Shabaan al-Karim",
  "Ramadaan al-Moazzam",
  "Shawwal al-Mukarram",
  "Zilqadah al-Haraam",
  "Zilhaj al-Haraam"
];

export class HijriDate {
  year: number;
  month: number; // 0-indexed: 0 = Moharram, 11 = Zilhaj
  day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  static isJulian(date: Date): boolean {
    const y = date.getFullYear();
    if (y < 1582) {
      return true;
    } else if (y === 1582) {
      if (date.getMonth() < 9) {
        return true;
      } else if (date.getMonth() === 9) {
        if (date.getDate() < 5) {
          return true;
        }
      }
    }
    return false;
  }

  static gregorianToAJD(date: Date): number {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate()
        + date.getHours() / 24
        + date.getMinutes() / 1440
        + date.getSeconds() / 86400
        + date.getMilliseconds() / 86400000;

    if (month < 3) {
      year--;
      month += 12;
    }

    let b = 0;
    if (!HijriDate.isJulian(date)) {
      const a = Math.floor(year / 100);
      b = 2 - a + Math.floor(a / 4);
    }

    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
  }

  static ajdToGregorian(ajd: number): Date {
    const z = Math.floor(ajd + 0.5);
    const f = ajd + 0.5 - z;
    let a = z;

    if (z >= 2299161) {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(0.25 * alpha);
    }

    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);

    const dayWithFraction = b - d - Math.floor(30.6001 * e) + f;
    const day = Math.floor(dayWithFraction);
    
    const hrsRaw = (dayWithFraction - day) * 24;
    const hrs = Math.floor(hrsRaw);
    
    const minRaw = (hrsRaw - hrs) * 60;
    const min = Math.floor(minRaw);
    
    const secRaw = (minRaw - min) * 60;
    const sec = Math.floor(secRaw);
    
    const msc = Math.round((secRaw - sec) * 1000);

    const month = (e < 14) ? (e - 2) : (e - 14);
    const year = (month < 2) ? (c - 4715) : (c - 4716);

    return new Date(year, month, day, hrs, min, sec, msc);
  }

  static isKabisa(year: number): boolean {
    const remainder = year % 30;
    return KABISA_YEAR_REMAINDERS.includes(remainder);
  }

  static daysInMonth(year: number, month: number): number {
    return ((month === 11) && HijriDate.isKabisa(year)) || (month % 2 === 0) ? 30 : 29;
  }

  dayOfYear(): number {
    return (this.month === 0) ? this.day : (DAYS_IN_YEAR[this.month - 1] + this.day);
  }

  static fromAJD(ajd: number): HijriDate {
    let left = Math.floor(ajd - 1948083.5);
    const y30 = Math.floor(left / 10631.0);
    left -= y30 * 10631;

    let i = 0;
    while (left > DAYS_IN_30_YEARS[i]) {
      i += 1;
    }

    const year = Math.round(y30 * 30.0 + i);
    if (i > 0) {
      left -= DAYS_IN_30_YEARS[i - 1];
    }

    i = 0;
    while (left > DAYS_IN_YEAR[i]) {
      i += 1;
    }

    const month = Math.round(i);
    const date = (i > 0) ? Math.round(left - DAYS_IN_YEAR[i - 1]) : Math.round(left);

    return new HijriDate(year, month, date);
  }

  toAJD(): number {
    const y30 = Math.floor(this.year / 30.0);
    let ajd = 1948083.5 + y30 * 10631 + this.dayOfYear();
    if (this.year % 30 !== 0) {
      ajd += DAYS_IN_30_YEARS[this.year - y30 * 30 - 1];
    }
    return ajd;
  }

  static fromGregorian(date: Date): HijriDate {
    return HijriDate.fromAJD(HijriDate.gregorianToAJD(date));
  }

  toGregorian(): Date {
    return HijriDate.ajdToGregorian(this.toAJD());
  }
}

/**
 * Calculates the next upcoming occurrence of a Gregorian event (e.g. Birthday, Anniversary).
 * Returns the Date, remaining days, and the ordinal index (e.g., 28th anniversary/birthday).
 */
export function getNextGregorianEvent(
  month: number, // 1-indexed (1-12)
  day: number,
  birthYear?: number // optional
): { date: Date; daysRemaining: number; ordinal: number } {
  const today = new Date();
  // Clear time for today
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  let targetYear = currentYear;

  // month - 1 since JS Date months are 0-indexed
  const eventThisYear = new Date(currentYear, month - 1, day);
  eventThisYear.setHours(0, 0, 0, 0);

  if (eventThisYear < today) {
    targetYear = currentYear + 1;
  }

  const nextEventDate = new Date(targetYear, month - 1, day);
  nextEventDate.setHours(0, 0, 0, 0);

  const diffTime = nextEventDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let ordinal = 0;
  if (birthYear) {
    ordinal = targetYear - birthYear;
  }

  return { date: nextEventDate, daysRemaining, ordinal };
}

/**
 * Calculates the next upcoming occurrence of a Hijri event (e.g. Waras, Wafaat).
 * Returns the Gregorian Date of the next occurrence, remaining days, and the ordinal index.
 */
export function getNextHijriEvent(
  hMonth: number, // 0-indexed (0-11)
  hDay: number,
  birthHYear?: number // optional
): { date: Date; daysRemaining: number; ordinal: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentHijri = HijriDate.fromGregorian(today);
  let targetHYear = currentHijri.year;

  // Check if event has passed in the current Hijri year
  const eventThisHYear = new HijriDate(targetHYear, hMonth, hDay);
  const eventThisHYearGreg = eventThisHYear.toGregorian();
  eventThisHYearGreg.setHours(0, 0, 0, 0);

  if (eventThisHYearGreg < today) {
    targetHYear = currentHijri.year + 1;
  }

  const nextHEvent = new HijriDate(targetHYear, hMonth, hDay);
  const nextEventDate = nextHEvent.toGregorian();
  nextEventDate.setHours(0, 0, 0, 0);

  const diffTime = nextEventDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let ordinal = 0;
  if (birthHYear) {
    ordinal = targetHYear - birthHYear;
  }

  return { date: nextEventDate, daysRemaining, ordinal };
}
