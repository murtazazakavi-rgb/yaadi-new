'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Access denied: Authentication required.');
  }
  return session;
}

function generateRandomToken(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  // Avoid using crypto to run everywhere safely
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a public Care Card sharing link/token for a contact.
 */
export async function generateCareCardLink(contactId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // 1. Verify that the contact belongs to the tenant
  const contactCheck = await query(
    'SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2',
    [contactId, tenantId]
  );
  if (contactCheck.rows.length === 0) {
    throw new Error('Contact not found or access denied.');
  }

  // 2. Check if a care card token already exists
  const existingCheck = await query(
    'SELECT token FROM care_cards WHERE contact_id = $1',
    [contactId]
  );

  if (existingCheck.rows.length > 0) {
    return { success: true, token: existingCheck.rows[0].token };
  }

  // 3. Generate a unique token
  let token = '';
  let unique = false;
  let attempts = 0;
  while (!unique && attempts < 10) {
    token = generateRandomToken();
    const tokenCheck = await query('SELECT id FROM care_cards WHERE token = $1', [token]);
    if (tokenCheck.rows.length === 0) {
      unique = true;
    }
    attempts++;
  }

  if (!unique) {
    throw new Error('Failed to generate a unique token. Please try again.');
  }

  // 4. Create the care card record
  await query(
    `INSERT INTO care_cards (contact_id, token, status) VALUES ($1, $2, 'not_started')`,
    [contactId, token]
  );

  revalidatePath('/contacts');
  return { success: true, token };
}

/**
 * Fetches Care Card data using a public token (no auth required).
 */
export async function getCareCardByToken(token: string) {
  if (!token) {
    throw new Error('Token is required.');
  }

  const res = await query(
    `SELECT cc.*, 
            c.first_name, c.middle_name, c.last_name,
            t.display_name as owner_name
     FROM care_cards cc
     JOIN contacts c ON cc.contact_id = c.id
     JOIN tenants t ON c.tenant_id = t.id
     WHERE cc.token = $1`,
    [token]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return res.rows[0];
}

/**
 * Fetches Care Card details for the contact owner.
 */
export async function getCareCardByContactId(contactId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify access (either owns the contact or has access to it)
  const contactCheck = await query(
    `SELECT c.id FROM contacts c
     WHERE c.id = $1 
       AND (
         c.tenant_id = $2 
         OR c.id IN (
           SELECT sc.contact_id FROM shared_contacts sc
           JOIN tenant_connections tc ON sc.connection_id = tc.id
           WHERE tc.status = 'accepted' AND (tc.requester_id = $2 OR tc.receiver_id = $2)
         )
       )`,
    [contactId, tenantId]
  );

  if (contactCheck.rows.length === 0) {
    throw new Error('Access denied: You do not have visibility for this contact.');
  }

  const res = await query(
    `SELECT * FROM care_cards WHERE contact_id = $1`,
    [contactId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return res.rows[0];
}

/**
 * Saves responses submitted via public form link.
 */
export async function saveCareCardResponses(
  token: string, 
  data: {
    level: 1 | 2;
    responses: any;
    clientIp?: string;
  }
) {
  const { level, responses, clientIp } = data;

  // 1. Fetch Care Card
  const ccCheck = await query(
    'SELECT contact_id, status, know_me_better_status FROM care_cards WHERE token = $1',
    [token]
  );
  if (ccCheck.rows.length === 0) {
    throw new Error('Care Card not found.');
  }
  const cc = ccCheck.rows[0];
  const contactId = cc.contact_id;

  // 2. Perform Save
  if (level === 1) {
    const {
      appreciation_style,
      support_style,
      communication_preference,
      gift_preference,
      social_style,
      memory_priorities,
      interests,
      favourites,
      current_focus,
      dua_requests,
      small_joy
    } = responses;

    await query(
      `UPDATE care_cards 
       SET appreciation_style = $1,
           support_style = $2,
           communication_preference = $3,
           gift_preference = $4,
           social_style = $5,
           memory_priorities = $6,
           interests = $7,
           favourites = $8,
           current_focus = $9,
           dua_requests = $10,
           small_joy = $11,
           status = 'complete',
           updated_at = CURRENT_TIMESTAMP
       WHERE token = $12`,
      [
        appreciation_style || null,
        support_style || null,
        communication_preference || null,
        gift_preference || null,
        social_style || null,
        memory_priorities || [],
        interests || [],
        favourites || {},
        current_focus || [],
        dua_requests || [],
        small_joy || null,
        token
      ]
    );
  } else if (level === 2) {
    const {
      matters_most,
      energy_sources,
      energy_drains,
      support_preferences,
      hidden_traits,
      friendship_manual,
      life_season,
      dreams,
      care_expression,
      shared_moments
    } = responses;

    await query(
      `UPDATE care_cards 
       SET matters_most = $1,
           energy_sources = $2,
           energy_drains = $3,
           support_preferences = $4,
           hidden_traits = $5,
           friendship_manual = $6,
           life_season = $7,
           dreams = $8,
           care_expression = $9,
           shared_moments = $10,
           know_me_better_status = 'complete',
           updated_at = CURRENT_TIMESTAMP
       WHERE token = $11`,
      [
        matters_most || [],
        energy_sources || [],
        energy_drains || [],
        support_preferences || [],
        hidden_traits || [],
        friendship_manual || [],
        life_season || [],
        dreams || [],
        care_expression || [],
        shared_moments || [],
        token
      ]
    );
  }

  // 3. Log History
  await query(
    `INSERT INTO care_card_history (contact_id, responses, submitted_by_ip) VALUES ($1, $2, $3)`,
    [contactId, JSON.stringify(responses), clientIp || 'anonymous']
  );

  // 4. Trigger AI insights update in the background/inline
  try {
    await generateAndSaveAiInsights(contactId);
  } catch (err) {
    console.error("Background AI insights generation failed:", err);
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Saves privacy visibility settings for a care card.
 */
export async function savePrivacySettings(contactId: string, privacySettings: any) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const contactCheck = await query(
    'SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2',
    [contactId, tenantId]
  );
  if (contactCheck.rows.length === 0) {
    throw new Error('Contact not found or access denied.');
  }

  await query(
    'UPDATE care_cards SET privacy_settings = $1 WHERE contact_id = $2',
    [JSON.stringify(privacySettings), contactId]
  );

  revalidatePath('/contacts');
  return { success: true };
}

/**
 * Generates and saves AI Relationship Insights for a contact.
 */
export async function generateAndSaveAiInsights(contactId: string) {
  const ccRes = await query(
    `SELECT cc.*, c.first_name, c.last_name FROM care_cards cc 
     JOIN contacts c ON cc.contact_id = c.id 
     WHERE cc.contact_id = $1`,
    [contactId]
  );

  if (ccRes.rows.length === 0) {
    return;
  }

  const cc = ccRes.rows[0];
  const name = cc.first_name;

  let insights = '';

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const systemInstruction = `
You are a warm relationship coach and family remembrance assistant for Yaadi.
Your goal is to analyze a person's Care Card and Know Me Better profile data and write 3-4 bullet points of relationship intelligence summaries.
The insights must feel:
- Warm
- Empathetic
- High EQ
- Actionable and thoughtful

Structure the response as a simple list of bullet points, for example:
- This person values thoughtful gestures more than frequent communication.
- When stressed, listening is more helpful than giving advice.
- Business and family are currently their biggest priorities.

Ensure each point starts with a bullet dash (-). Keep them concise and specific.
`;

      const prompt = `
Analyze the following relationship profile for "${name}":

CARE CARD (LEVEL 1):
- Appreciation style (Make my day): "${cc.appreciation_style}"
- Support style (When life gets stressful): "${cc.support_style}"
- Communication preference (Best way to reach me): "${cc.communication_preference}"
- Gift preference (Gift cheat code): "${cc.gift_preference}"
- Social battery: "${cc.social_style}"
- Things to remember about them: ${JSON.stringify(cc.memory_priorities)}
- Interests: ${JSON.stringify(cc.interests)}
- Current Season Focus: ${JSON.stringify(cc.current_focus)}
- Dua Requests: ${JSON.stringify(cc.dua_requests)}
- Small Joy (brings a smile): "${cc.small_joy}"

KNOW ME BETTER (LEVEL 2):
- Matters most values (ranked): ${JSON.stringify(cc.matters_most)}
- Energy sources: ${JSON.stringify(cc.energy_sources)}
- Energy drains: ${JSON.stringify(cc.energy_drains)}
- How they support when struggling: ${JSON.stringify(cc.support_preferences)}
- Friendship manual expectations: ${JSON.stringify(cc.friendship_manual)}
- Dreams: ${JSON.stringify(cc.dreams)}
- Hidden traits they wish people knew: ${JSON.stringify(cc.hidden_traits)}
- Natural expression of care for others: ${JSON.stringify(cc.care_expression)}
- Simple shared moments they enjoy: ${JSON.stringify(cc.shared_moments)}

Please generate 3-4 simple, heartfelt bullet points of Relationship Insights for the user about how to care for, contact, and support ${name}.
`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
      const requestBody = {
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
        generationConfig: { temperature: 0.7 }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          insights = text.trim();
        }
      }
    } catch (e) {
      console.error("Gemini API error during insights generation:", e);
    }
  }

  // Fallback engine if Gemini fails or is not configured
  if (!insights) {
    const bulletPoints = [];
    
    // Appreciation preference
    if (cc.appreciation_style === 'thoughtful message' || cc.appreciation_style === 'Love a thoughtful message') {
      bulletPoints.push(`- Loves receiving thoughtful check-in messages in their day-to-day.`);
    } else if (cc.appreciation_style === 'Enjoy a phone call') {
      bulletPoints.push(`- Appreciates hearing your voice; try calling them to brighten their day.`);
    } else if (cc.appreciation_style === 'Value a heartfelt dua') {
      bulletPoints.push(`- Deeply values heartfelt prayers and duas from family and friends.`);
    }

    // Support preference
    if (cc.support_style === 'Someone who listens') {
      bulletPoints.push(`- When life gets stressful, they value someone who just listens rather than giving advice.`);
    } else if (cc.support_style === 'Practical help') {
      bulletPoints.push(`- Prefers practical, hands-on support and acts of service when they are stressed.`);
    } else if (cc.support_style === 'Space') {
      bulletPoints.push(`- Appreciates having quiet space and time to process when feeling stressed.`);
    }

    // Focus / Dreams
    if (cc.current_focus && cc.current_focus.length > 0) {
      bulletPoints.push(`- Currently focusing their energy on: ${cc.current_focus.slice(0, 2).join(', ').toLowerCase()}.`);
    } else if (cc.dreams && cc.dreams.length > 0) {
      bulletPoints.push(`- Dream-oriented around: ${cc.dreams.slice(0, 2).join(', ').toLowerCase()}.`);
    }

    // Intimate preferences
    if (cc.small_joy) {
      bulletPoints.push(`- Smiles at small joys like: ${cc.small_joy.toLowerCase()}.`);
    }
    if (cc.care_expression && cc.care_expression.length > 0) {
      bulletPoints.push(`- Expresses care naturally through ${cc.care_expression.slice(0, 2).join(', ').toLowerCase()}.`);
    }
    if (cc.shared_moments && cc.shared_moments.length > 0) {
      bulletPoints.push(`- Enjoys simple connection over: ${cc.shared_moments.slice(0, 2).join(', ').toLowerCase()}.`);
    }

    // Communication preference
    if (cc.communication_preference) {
      bulletPoints.push(`- Best reached via ${cc.communication_preference.toLowerCase()}.`);
    }

    // Default if empty
    if (bulletPoints.length === 0) {
      bulletPoints.push(`- Appreciates small gestures of connection and consistency.`);
      bulletPoints.push(`- Values deep, meaningful relationships and being remembered.`);
    }

    insights = bulletPoints.join('\n');
  }

  // Save the insights
  await query(
    'UPDATE care_cards SET ai_insights = $1 WHERE contact_id = $2',
    [insights, contactId]
  );
}

/**
 * Manually trigger AI insight generation (for owner refresh button).
 */
export async function refreshAiInsights(contactId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const contactCheck = await query(
    'SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2',
    [contactId, tenantId]
  );
  if (contactCheck.rows.length === 0) {
    throw new Error('Contact not found or access denied.');
  }

  await generateAndSaveAiInsights(contactId);
  revalidatePath('/contacts');
  return { success: true };
}
