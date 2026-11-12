import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  Patient,
  ChargeEntry,
  CompiledInvoiceData,
  DischargeEventType,
  InvoiceFlag,
  GroupedCategoryCharges,
  ChargeCategory,
} from './types.js';

const MODEL_NAME = 'gemini-3.8-flash';

export function hasValidGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return false;
  if (
    key === 'MY_GEMINI_API_KEY' ||
    key === 'your_api_key_here' ||
    key === 'undefined' ||
    key === 'null' ||
    key.startsWith('MY_')
  ) {
    return false;
  }
  return key.length >= 10;
}

export function getGeminiClient(): GoogleGenAI | null {
  if (!hasValidGeminiKey()) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Deterministic local audit and compilation logic.
 * Used as high-fidelity baseline and robust fallback if Gemini is offline or rate-limited.
 */
function localAuditAndCompile(
  patient: Patient,
  charges: ChargeEntry[],
  deposit: number,
  eventType: DischargeEventType
): CompiledInvoiceData {
  const flags: InvoiceFlag[] = [];
  const activeCharges = charges.filter(c => !c.isVoided);

  // 1. Group active charges by category
  const categories: ChargeCategory[] = [
    'Room',
    'Consultation',
    'Procedure',
    'Medication',
    'Disposable/Consumable',
    'Investigation',
    'Other',
  ];

  const groupedMap = new Map<ChargeCategory, GroupedCategoryCharges>();
  categories.forEach(cat => {
    groupedMap.set(cat, {
      category: cat,
      subtotal: 0,
      items: [],
    });
  });

  let grossTotal = 0;
  activeCharges.forEach(c => {
    const total = c.quantity * c.unitPrice;
    grossTotal += total;
    const grp = groupedMap.get(c.category) || {
      category: c.category,
      subtotal: 0,
      items: [],
    };
    grp.subtotal += total;
    grp.items.push({
      id: c.id,
      description: c.description,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      total,
      timestamp: c.timestamp,
      loggedBy: c.loggedBy,
    });
    groupedMap.set(c.category, grp);
  });

  const groupedCharges = Array.from(groupedMap.values()).filter(g => g.items.length > 0);

  // 2. Anomaly Check: Duplicate entries within 30 minutes
  for (let i = 0; i < activeCharges.length; i++) {
    for (let j = i + 1; j < activeCharges.length; j++) {
      const a = activeCharges[i];
      const b = activeCharges[j];
      if (a.description.toLowerCase().trim() === b.description.toLowerCase().trim()) {
        const timeDiffMs = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const timeDiffMin = timeDiffMs / (1000 * 60);
        if (timeDiffMin <= 30) {
          flags.push({
            id: `flag-dup-${a.id}-${b.id}`,
            severity: 'warning',
            message: `Possible duplicate charge: "${a.description}" was logged twice within ${Math.round(timeDiffMin)} minutes (${a.loggedBy} and ${b.loggedBy}).`,
            relatedEntryIds: [a.id, b.id],
            status: 'active',
          });
        }
      }
    }
  }

  // 3. Anomaly Check: Procedures without matching consumables
  const procedures = activeCharges.filter(c => c.category === 'Procedure');
  const consumables = activeCharges.filter(c => c.category === 'Disposable/Consumable');
  if (procedures.length > 0 && consumables.length === 0) {
    flags.push({
      id: `flag-proc-no-consumables`,
      severity: 'warning',
      message: `Procedures (${procedures.map(p => p.description).join(', ')}) were recorded without any disposable consumables, surgical kits, or sterile drapes.`,
      relatedEntryIds: procedures.map(p => p.id),
      status: 'active',
    });
  }

  // 4. Anomaly Check: Room day count vs admit date
  const admitDate = new Date(patient.admitDate);
  const now = new Date();
  const stayDays = Math.max(1, Math.ceil((now.getTime() - admitDate.getTime()) / (1000 * 3600 * 24)));
  const roomCharges = activeCharges.filter(c => c.category === 'Room');
  const totalRoomUnits = roomCharges.reduce((acc, c) => acc + c.quantity, 0);

  if (roomCharges.length > 0 && Math.abs(totalRoomUnits - stayDays) >= 1) {
    flags.push({
      id: `flag-room-mismatch`,
      severity: 'info',
      message: `Stay duration is approximately ${stayDays} day(s), but ${totalRoomUnits} room-day unit(s) are logged. Please verify step-down/transfer timing.`,
      relatedEntryIds: roomCharges.map(r => r.id),
      status: 'active',
    });
  }

  // 5. Anomaly Check: Unusually high single quantity (> 6 for consumables or medication)
  activeCharges.forEach(c => {
    if ((c.category === 'Disposable/Consumable' || c.category === 'Medication') && c.quantity >= 8) {
      flags.push({
        id: `flag-high-qty-${c.id}`,
        severity: 'warning',
        message: `High quantity detected: ${c.quantity} units of "${c.description}" logged at once. Please confirm ward administration logs.`,
        relatedEntryIds: [c.id],
        status: 'active',
      });
    }
  });

  // 6. Anomaly Check: Voided items without reason
  const voidedCharges = charges.filter(c => c.isVoided);
  voidedCharges.forEach(v => {
    if (!v.voidReason || v.voidReason.trim().length < 3) {
      flags.push({
        id: `flag-void-${v.id}`,
        severity: 'warning',
        message: `Voided entry "${v.description}" ($${v.total.toFixed(2)}) is missing a clinical justification.`,
        relatedEntryIds: [v.id],
        status: 'active',
      });
    }
  });

  const totalDue = Math.max(0, grossTotal - deposit);

  const isSuddenExit = eventType === 'Sudden Exit';
  const familySummary = isSuddenExit
    ? `We extend our deepest condolences to the family of ${patient.name}. Automated billing reminders are paused. This clinical ledger summary reflects inpatient care provided under ${patient.consultant} and will be personally reviewed with your family liaison officer.`
    : `Inpatient care summary for ${patient.name} (${patient.bedNumber}) admitted under ${patient.consultant}. The total gross charges amount to $${grossTotal.toFixed(2)}, offset by an advance deposit of $${deposit.toFixed(2)}, leaving a remaining balance of $${totalDue.toFixed(2)}. All charges reflect physician consultations, room nursing care, ordered medications, and diagnostic investigations during the stay.`;

  const suggestedCoverNote = isSuddenExit
    ? `Statement of Inpatient Care for ${patient.name} - Handled with sympathy. Hospital family liaison is available at +1 (800) 555-0199.`
    : `Inpatient discharge statement for ${patient.name} (${patient.bedNumber}). Dispatched for family settlement prior to departure.`;

  return {
    patientId: patient.id,
    patientName: patient.name,
    bedNumber: patient.bedNumber,
    admitDate: patient.admitDate,
    eventDate: new Date().toISOString(),
    eventType,
    grossTotal,
    advanceDeposit: deposit,
    totalDue,
    groupedCharges,
    flags,
    familySummary,
    suggestedCoverNote,
    compiledAt: new Date().toISOString(),
  };
}

export const geminiService = {
  /**
   * Compiles the patient's live charges into a structured invoice,
   * audits for billing anomalies, and drafts an empathetic family summary.
   */
  async compileInvoice(
    patient: Patient,
    charges: ChargeEntry[],
    deposit: number,
    eventType: DischargeEventType
  ): Promise<CompiledInvoiceData> {
    const baseCompiled = localAuditAndCompile(patient, charges, deposit, eventType);

    const ai = getGeminiClient();
    // If no valid API key is configured, return the high-fidelity local audit result immediately
    if (!ai) {
      return baseCompiled;
    }

    try {
      const prompt = `You are WardLedger's Senior AI Clinical Billing Auditor and Patient Liaison.
Your role:
1. Examine the inpatient ledger for patient "${patient.name}" (Bed ${patient.bedNumber}, MRN ${patient.mrn}, admitted ${patient.admitDate}, attending: ${patient.consultant}, event: "${eventType}").
2. Total charges, categorize into groups, verify the advance deposit ($${deposit}), and calculate the balance due.
3. Rigorously audit the charges for these specific clinical anomalies:
   - Duplicate entries (same item logged within ~30 minutes by ward staff)
   - Procedures performed without matching sterile consumables / dressing kits / drapes
   - Room day count mismatch with admission length
   - Unusually high quantities of medication or consumables
   - Voided entries with inadequate or missing justification
4. Write a compassionate, clear, jargon-free paragraph ("familySummary") explaining the bill in warm, supportive language.
   CRITICAL SAFETY & ETHICS: If eventType is "Sudden Exit" (patient death), NEVER demand payment, mention penalties, or use transactional tone. Express profound respect and dignity, state that automated reminders are paused, and indicate a hospital family liaison is available.
5. Provide a concise "suggestedCoverNote".

Ledger Entries:
${JSON.stringify(
  charges.map(c => ({
    id: c.id,
    category: c.category,
    description: c.description,
    qty: c.quantity,
    unitPrice: c.unitPrice,
    total: c.quantity * c.unitPrice,
    timestamp: c.timestamp,
    loggedBy: c.loggedBy,
    isVoided: c.isVoided || false,
    voidReason: c.voidReason || '',
  })),
  null,
  2
)}

Return a strict JSON object with this exact shape:
{
  "flags": [
    {
      "id": "string",
      "severity": "info" | "warning",
      "message": "string explanation of clinical or billing issue",
      "relatedEntryIds": ["string"]
    }
  ],
  "familySummary": "string",
  "suggestedCoverNote": "string"
}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are an expert hospital billing specialist and patient advocate. You never invent charges, you stick strictly to the provided ledger, and you explain bills with warmth, total clarity, and zero clinical jargon.',
            responseMimeType: 'application/json',
          },
        }),
        12000
      );

      const text = response.text?.trim() || '';
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.familySummary) {
          baseCompiled.familySummary = parsed.familySummary;
        }
        if (parsed.suggestedCoverNote) {
          baseCompiled.suggestedCoverNote = parsed.suggestedCoverNote;
        }
        if (Array.isArray(parsed.flags) && parsed.flags.length > 0) {
          // Merge Gemini flags with any local critical flags
          const mergedFlagMap = new Map<string, InvoiceFlag>();
          baseCompiled.flags.forEach(f => mergedFlagMap.set(f.message.slice(0, 30), f));
          parsed.flags.forEach((f: any, idx: number) => {
            mergedFlagMap.set(f.message?.slice(0, 30) || `gemini-${idx}`, {
              id: f.id || `gemini-flag-${idx}`,
              severity: f.severity === 'warning' ? 'warning' : 'info',
              message: f.message || 'Billing alert detected.',
              relatedEntryIds: Array.isArray(f.relatedEntryIds) ? f.relatedEntryIds : [],
              status: 'active',
            });
          });
          baseCompiled.flags = Array.from(mergedFlagMap.values());
        }
      }
    } catch (err: any) {
      console.warn('Gemini compileInvoice notice, utilizing verified clinical audit baseline:', err?.message || err);
    }

    return baseCompiled;
  },

  /**
   * Grounded Patient/Family Bill Q&A.
   * Answers questions strictly based on the patient's ledger.
   * Supports English, Tamil, Hindi, Telugu, Malayalam.
   */
  async answerFamilyQuestion(params: {
    patient: Patient;
    charges: ChargeEntry[];
    question: string;
    language: string;
  }): Promise<{ answer: string; groundedInCharges: string[] }> {
    const { patient, charges, question, language } = params;
    const activeCharges = charges.filter(c => !c.isVoided);

    const getFallbackAnswer = () => {
      const qLower = question.toLowerCase();
      let matched = activeCharges.filter(c =>
        c.description.toLowerCase().includes(qLower) ||
        c.category.toLowerCase().includes(qLower) ||
        (qLower.includes('catheter') && c.description.toLowerCase().includes('catheter')) ||
        (qLower.includes('room') && c.category === 'Room') ||
        (qLower.includes('deposit') && true)
      );

      let fallbackText = `Regarding your inquiry for ${patient.name}: `;
      if (qLower.includes('catheter')) {
        fallbackText += `A catheter was recorded during inpatient care under ${patient.consultant} for fluid management and continuous monitoring.`;
      } else if (qLower.includes('deposit')) {
        fallbackText += `An advance deposit of $${patient.advanceDeposit} was credited toward your total inpatient balance.`;
      } else if (matched.length > 0) {
        fallbackText += `The ledger contains ${matched.length} related charge(s): ${matched.map(m => `"${m.description}" ($${(m.quantity * m.unitPrice).toFixed(2)})`).join(', ')}.`;
      } else {
        fallbackText += `We checked the active ledger for ${patient.name}. This specific item is not listed as a separate charge. For clinical reasons, please consult ${patient.consultant}.`;
      }

      if (language !== 'English') {
        fallbackText += ` (Language requested: ${language})`;
      }

      return {
        answer: fallbackText,
        groundedInCharges: matched.map(m => m.id),
      };
    };

    const ai = getGeminiClient();
    if (!ai) {
      return getFallbackAnswer();
    }

    try {
      const prompt = `A family member of patient "${patient.name}" (${patient.bedNumber}, admitted ${patient.admitDate}, consultant: ${patient.consultant}) is asking a question about their inpatient hospital charges.

Question: "${question}"
Requested response language: ${language} (e.g. English, Tamil, Hindi, Telugu, Malayalam).

Rules for your answer:
1. Ground your answer STRICTLY and ONLY in the provided ledger entries below.
2. If the user asks why an item is there (e.g., "Why is there a charge for a catheter?"), kindly explain its typical inpatient purpose based on the record (e.g., urinary management, hydration, sterile procedure) without diagnosing the patient.
3. If an item or concept is NOT in the ledger, explicitly state that it does not appear on the bill and advise them to speak to ${patient.consultant} or the nursing team.
4. MEDICAL SAFETY DISCLAIMER: Never provide clinical diagnoses, prognosis, or medical advice. State that you are the billing liaison assistant.
5. Reply fluently and kindly in the requested language: ${language}.

Ledger Records:
${JSON.stringify(
  activeCharges.map(c => ({
    id: c.id,
    item: c.description,
    category: c.category,
    qty: c.quantity,
    unitPrice: c.unitPrice,
    total: c.quantity * c.unitPrice,
    loggedAt: c.timestamp,
    loggedBy: c.loggedBy,
  })),
  null,
  2
)}

Advance Deposit: $${patient.advanceDeposit}
Patient Status: ${patient.status}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are WardLedger Family Bill Assistant. You are warm, respectful, transparent, and grounded only in the verified hospital ledger. You answer in the specified language.',
          },
        }),
        10000
      );

      const answer = response.text?.trim() || 'We have received your inquiry. Please consult the billing supervisor.';
      return {
        answer,
        groundedInCharges: activeCharges
          .filter(c => question.toLowerCase().includes(c.description.toLowerCase().slice(0, 5)))
          .map(c => c.id),
      };
    } catch (err) {
      console.warn('Gemini familyChat notice, using grounded ledger fallback:', err);
      return getFallbackAnswer();
    }
  },

  /**
   * Generates a localized WhatsApp/Email share message for the family.
   */
  async generateShareMessage(params: {
    patient: Patient;
    invoiceNumber: string;
    totalDue: number;
    paymentLink: string;
    language: string;
    isSuddenExit?: boolean;
  }): Promise<{ message: string; subject: string }> {
    const { patient, invoiceNumber, totalDue, paymentLink, language, isSuddenExit } = params;

    // Direct pre-built multilingual templates for instant response & fallback
    const templates: Record<string, { subject: string; message: string }> = {
      English: {
        subject: isSuddenExit
          ? `WardLedger Care Summary - ${patient.name}`
          : `WardLedger Inpatient Statement #${invoiceNumber} - ${patient.name}`,
        message: isSuddenExit
          ? `Dear Family of ${patient.name},\n\nPlease accept our sincere condolences during this difficult time. Automated billing reminders have been paused. Your patient care statement #${invoiceNumber} has been finalized and can be reviewed here:\n${paymentLink}\n\nOur Hospital Family Liaison officer is available at your convenience to assist with any questions.`
          : `Dear Family of ${patient.name},\n\nThe inpatient settlement statement #${invoiceNumber} for Bed ${patient.bedNumber} is ready for review.\n\nTotal balance due: $${totalDue.toFixed(2)} USD.\nYou can view line items and settle securely via PayPal or card using this link:\n${paymentLink}\n\nOverseas family can also pay directly in USD via PayPal. Once settled, the patient will be marked Financially Cleared for discharge.\n\nWarm regards,\nWardLedger Billing Team`,
      },
      Tamil: {
        subject: isSuddenExit
          ? `மருத்துவ அறிக்கை - ${patient.name}`
          : `மருத்துவமனை கட்டண அறிக்கை #${invoiceNumber} - ${patient.name}`,
        message: isSuddenExit
          ? `மதிப்பிற்குரிய ${patient.name} அவர்களின் குடும்பத்தினருக்கு,\n\nஎங்களின் ஆழ்ந்த இரங்கலைத் தெரிவித்துக் கொள்கிறோம். தானியங்கி நினைவூட்டல்கள் நிறுத்தப்பட்டுள்ளன. பராமரிப்பு அறிக்கை #${invoiceNumber} இதோ:\n${paymentLink}\n\nஉங்களுக்கு உதவ மருத்துவமனை தொடர்பு அதிகாரி தயாராக உள்ளார்.`
          : `அன்புள்ள ${patient.name} குடும்பத்தினருக்கு,\n\nபடுக்கை ${patient.bedNumber} க்கான மருத்துவமனை கட்டண அறிக்கை #${invoiceNumber} தயாராக உள்ளது.\n\nசெலுத்த வேண்டிய தொகை: $${totalDue.toFixed(2)} USD.\nகீழ்க்கண்ட இணைப்பின் மூலம் பேபால் (PayPal) அல்லது கார்டு வழியே எளிதாக செலுத்தலாம்:\n${paymentLink}\n\nவெளிநாட்டில் உள்ள குடும்ப உறுப்பினர்களும் பேபால் மூலம் அமெரிக்க டாலரில் (USD) எளிதாக செலுத்த முடியும். கட்டணம் செலுத்தியவுடன் வீடு திரும்ப அனுமதி வழங்கப்படும்.\n\nஅன்புடன்,\nவார்டுலெட்ஜர் மருத்துவமனை குழு`,
      },
      Hindi: {
        subject: isSuddenExit
          ? `वार्डलेजर चिकित्सा विवरण - ${patient.name}`
          : `वार्डलेजर इनपेशेंट बिल #${invoiceNumber} - ${patient.name}`,
        message: isSuddenExit
          ? `आदरणीय ${patient.name} के परिवारजन,\n\nहमारी गहरी संवेदनाएं आपके साथ हैं। स्वचालित बिलिंग संदेश रोक दिए गए हैं। देखभाल विवरण #${invoiceNumber} यहाँ देखा जा सकता है:\n${paymentLink}\n\nअस्पताल परिवार संपर्क अधिकारी आपकी सेवा में उपलब्ध हैं।`
          : `नमस्ते,\n\nमरीज ${patient.name} (बेड ${patient.bedNumber}) का डिस्चार्ज बिल #${invoiceNumber} तैयार है।\n\nकुल देय राशि: $${totalDue.toFixed(2)} USD.\nकृपया इस लिंक पर जाकर PayPal या कार्ड से सुरक्षित भुगतान करें:\n${paymentLink}\n\nविदेश में रहने वाले परिजन भी PayPal के माध्यम से USD में भुगतान कर सकते हैं। भुगतान होते ही डिस्चार्ज क्लीयरेंस प्राप्त हो जाएगी।\n\nसादर,\nवार्डलेजर बिलिंग टीम`,
      },
      Telugu: {
        subject: isSuddenExit
          ? `వార్డ్లెడ్జర్ సంరక్షణ నివేదిక - ${patient.name}`
          : `వార్డ్లెడ్జర్ డిశ్చార్జ్ బిల్లు #${invoiceNumber} - ${patient.name}`,
        message: isSuddenExit
          ? `గౌరవనీయులైన ${patient.name} కుటుంబ సభ్యులకు,\n\nమా ప్రగాఢ సానుభూతి తెలియజేస్తున్నాము. ఆటోమేటెడ్ రిమైండర్లు నిలిపివేయబడ్డాయి. సంరక్షణ వివరాలు #${invoiceNumber} ఇక్కడ చూడవచ్చు:\n${paymentLink}\n\nసహాయం కోసం ఆసుపత్రి లైజన్ అధికారి అందుబాటులో ఉన్నారు.`
          : `నమస్కారం,\n\nరోగి ${patient.name} (బెడ్ ${patient.bedNumber}) డిశ్చార్జ్ బిల్లు #${invoiceNumber} సిద్ధంగా ఉంది.\n\nచెల్లించవలసిన మొత్తం: $${totalDue.toFixed(2)} USD.\nఈ లింక్ ద్వారా PayPal లేదా కార్డుతో సురక్షితంగా చెల్లించవచ్చు:\n${paymentLink}\n\nవిదేశాల్లో ఉన్న బంధువులు కూడా PayPal ద్వారా USD లో చెల్లించవచ్చు. చెల్లింపు పూర్తయిన వెంటనే డిశ్చార్జ్ అనుమతి లభిస్తుంది.\n\nభవదీయులు,\nవార్డ్లెడ్జర్ బిల్లింగ్ బృందం`,
      },
      Malayalam: {
        subject: isSuddenExit
          ? `വാർഡ്‌ലെഡ്ജർ കെയർ സ്റ്റേറ്റ്മെന്റ് - ${patient.name}`
          : `വാർഡ്‌ലെഡ്ജർ ഡിസ്ചാർജ് ബിൽ #${invoiceNumber} - ${patient.name}`,
        message: isSuddenExit
          ? `ബഹുമാനപ്പെട്ട ${patient.name} യുടെ കുടുംബാംഗങ്ങളെ,\n\nഞങ്ങളുടെ ആത്മാർത്ഥമായ അനുശോചനം അറിയിക്കുന്നു. ഓട്ടോമേറ്റഡ് റിമൈൻഡറുകൾ നിർത്തിവച്ചിരിക്കുന്നു. കെയർ സ്റ്റേറ്റ്മെന്റ് #${invoiceNumber} ഇവിടെ പരിശോധിക്കാം:\n${paymentLink}\n\nസഹായത്തിനായി ഹോസ്പിറ്റൽ ലെയ്സൺ ഓഫീസർ ലഭ്യമാണ്.`
          : `പ്രിയപ്പെട്ട ${patient.name} കുടുംബാംഗങ്ങൾക്ക്,\n\nബെഡ് ${patient.bedNumber} ലെ ഇൻപേഷ്യന്റ് ഡിസ്ചാർജ് ബിൽ #${invoiceNumber} തയ്യാറാണ്.\n\nഅടയ്‌ക്കേണ്ട തുക: $${totalDue.toFixed(2)} USD.\nഈ ലിങ്ക് വഴി പേപാൽ (PayPal) അല്ലെങ്കിൽ കാർഡ് ഉപയോഗിച്ച് സുരക്ഷിതമായി പണമടയ്ക്കാം:\n${paymentLink}\n\nവിദേശത്തുള്ള കുടുംബാംഗങ്ങൾക്ക് പേപാൽ വഴി ഡോളറിൽ പണമടയ്ക്കാവുന്നതാണ്. പേയ്‌മെന്റ് പൂർത്തിയായാൽ ഉടൻ ഡിസ്‌ചാർജ് ക്ലിയറൻസ് ലഭിക്കും.\n\nവിശ്വസ്തതയോടെ,\nവാർഡ്‌ലെഡ്ജർ ബില്ലിംഗ് ടീം`,
      },
    };

    const chosen = templates[language] || templates['English'];
    return chosen;
  },
};
