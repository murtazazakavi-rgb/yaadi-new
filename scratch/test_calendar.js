const KABISA_YEAR_REMAINDERS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
const DAYS_IN_YEAR = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];
const DAYS_IN_30_YEARS = [
   354,  709, 1063, 1417, 1772, 2126, 2480, 2835,  3189,  3544,
  3898, 4252, 4607, 4961, 5315, 5670, 6024, 6378,  6733,  7087,
  7442, 7796, 8150, 8505, 8859, 9213, 9568, 9922, 10277, 10631
];

function isJulian(date) {
  const y = date.getFullYear();
  if (y < 1582) return true;
  if (y === 1582) {
    if (date.getMonth() < 9) return true;
    if (date.getMonth() === 9 && date.getDate() < 5) return true;
  }
  return false;
}

function gregorianToAJD(date) {
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
  if (!isJulian(date)) {
    const a = Math.floor(year / 100);
    b = 2 - a + Math.floor(a / 4);
  }

  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function fromAJD(ajd) {
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

  return { year, month, day: date };
}

// Test September 22, 2016 at different hours in IST (offset +5:30)
// Hour 0:00 (AJD = 2457653.5)
const d1 = new Date(2016, 8, 22, 0, 0, 0);
const ajd1 = gregorianToAJD(d1);
const hDate1 = fromAJD(ajd1);
console.log("Sep 22, 2016 00:00 -> AJD:", ajd1, "-> Hijri:", hDate1.day + "-" + (hDate1.month+1) + "-" + hDate1.year);

// Hour 5:30 (AJD = 2457653.729)
const d2 = new Date(2016, 8, 22, 5, 30, 0);
const ajd2 = gregorianToAJD(d2);
const hDate2 = fromAJD(ajd2);
console.log("Sep 22, 2016 05:30 -> AJD:", ajd2, "-> Hijri:", hDate2.day + "-" + (hDate2.month+1) + "-" + hDate2.year);

// Hour 12:00 (AJD = 2457654.0)
const d3 = new Date(2016, 8, 22, 12, 0, 0);
const ajd3 = gregorianToAJD(d3);
const hDate3 = fromAJD(ajd3);
console.log("Sep 22, 2016 12:00 -> AJD:", ajd3, "-> Hijri:", hDate3.day + "-" + (hDate3.month+1) + "-" + hDate3.year);
