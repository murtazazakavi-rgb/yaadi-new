'use server';

import { getSession } from '@/lib/session';

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Access denied: Authentication required.');
  }
  return session;
}

/**
 * Parses conversational text into structured contact and event fields using Google Gemini API.
 */
export async function parseVoiceContact(transcript: string): Promise<{
  success: boolean;
  data?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    notes?: string;
    bornAfterMaghrib?: boolean;
    events: Array<{
      eventType: 'birthday_gregorian' | 'birthday_hijri' | 'anniversary' | 'death_gregorian' | 'death_hijri';
      gDay?: number;
      gMonth?: number;
      gYear?: number;
      hDay?: number;
      hMonth?: number;
      hYear?: number;
    }>;
  };
  error?: string;
}> {
  try {
    await requireAuth();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY environment variable is not configured. Please add it to your .env.local file.',
      };
    }

    if (!transcript || !transcript.trim()) {
      return {
        success: false,
        error: 'Transcript is empty.',
      };
    }

    const systemInstruction = `
You are a precise parsing assistant for a contact calendar app. Your task is to parse conversational voice transcriptions into structured JSON contact card records.

Understand the fields:
- firstName: First name (required, string).
- middleName: Middle name (optional, string).
- lastName: Last name (required, string). If not spoken, infer or use an empty string.
- phoneNumber: Phone number (optional, string).
- email: Email address (optional, string).
- notes: Any extra conversational comments or context (optional, string).
- bornAfterMaghrib: Set to true if the text mentions the person was born after sunset, after maghrib, or at night. (optional, boolean).
- events: An array of events associated with this contact.
  Event types are:
  - 'birthday_gregorian': Gregorian birthday.
  - 'birthday_hijri': Hijri birthday (Waras).
  - 'anniversary': Gregorian wedding anniversary.
  - 'death_gregorian': Gregorian death date.
  - 'death_hijri': Hijri death date (Wafaat).

For dates:
- Gregorian dates must be parsed into: gDay (1-31), gMonth (1-12), and gYear (4-digit integer, optional).
- Hijri dates must be parsed into: hDay (1-30), hMonth (1-12), and hYear (4-digit integer, e.g. 1370-1450, optional).
- CRITICAL Hijri Month Name Mapping to Integers:
  1. Muharram = 1
  2. Safar = 2
  3. Rabi' al-awwal / Rabi 1 = 3
  4. Rabi' al-thani / Rabi 2 / Rabi al-akhir = 4
  5. Jumada al-awwal / Jumada 1 = 5
  6. Jumada al-thani / Jumada 2 / Jumada al-akhir = 6
  7. Rajab = 7
  8. Sha'ban = 8
  9. Ramadan = 9
  10. Shawwal = 10
  11. Dhu al-Qadah / Dhu al-Qa'da = 11
  12. Dhu al-Hijjah / Dhu al-Hijja = 12

Example 1: "I want to add a contact named Murtaza Juzer Zakavi born on 21st November 1988, Hijri birthday is 22 Safar 1371"
Result:
{
  "firstName": "Murtaza",
  "middleName": "Juzer",
  "lastName": "Zakavi",
  "events": [
    { "eventType": "birthday_gregorian", "gDay": 21, "gMonth": 11, "gYear": 1988 },
    { "eventType": "birthday_hijri", "hDay": 22, "hMonth": 2, "hYear": 1371 }
  ]
}

Example 2: "add my uncle Ali Asghar phone 98255 12345 passed away on 10 Ramadan 1445"
Result:
{
  "firstName": "Ali",
  "middleName": "Asghar",
  "lastName": "",
  "phoneNumber": "9825512345",
  "events": [
    { "eventType": "death_hijri", "hDay": 10, "hMonth": 9, "hYear": 1445 }
  ]
}

Output strictly valid JSON matching the schema. Do not output any markup other than JSON.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `System Instructions:\n${systemInstruction}\n\nVoice Transcript to Parse:\n"${transcript}"` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!parsedText) {
      throw new Error('No parsing result returned from Gemini API.');
    }

    const data = JSON.parse(parsedText.trim());

    // Basic structural validation
    if (!data.firstName) {
      data.firstName = 'Spoken';
    }
    if (!data.lastName) {
      data.lastName = 'Contact';
    }
    if (!data.events) {
      data.events = [];
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('Error parsing voice contact:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while parsing the speech.',
    };
  }
}
