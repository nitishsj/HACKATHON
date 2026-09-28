import type { QueueStatus } from "./queueLogic";

export type PatientLanguage = "en" | "hi" | "ta" | "te";

export const languageOptions: { code: PatientLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
];

export const voiceLocales: Record<PatientLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
};

type PatientCopy = {
  navPatient: string; navStaff: string; navDisplay: string; language: string;
  statusLabels: Record<QueueStatus, string>;
  liveQueue: string; waiting: (count: number) => string; tagline: string;
  titleLead: string; titleAccent: string; intro: string; benefitWait: string; benefitVoice: string; benefitPrivacy: string; restTagline: string;
  clinicName: string; joinTitle: string; savedTitle: string; formIntro: string; patientName: string; namePlaceholder: string;
  phoneLabel: string; phonePlaceholder: string; phoneHint: string; smsConsent: string; smsUnavailable: string; smsRates: string;
  smsInvalidPhone: string; smsStatusLabel: string; smsStatusQueued: string; smsStatusDelivered: string; smsStatusFailed: string;
  submit: string; submitting: string; namePrivacy: string; livePrivate: string; updateFrequency: string;
  tokenLabel: string; estimate: string; ahead: string; statusTitle: string; waitingStatus: (minutes: number) => string;
  calledStatus: string; consultationStatus: string; completedStatus: string; noShowStatus: string;
  voiceOn: string; voiceOff: string; pageOpen: string; voiceDisclaimer: string; checkInAgain: string;
  reloadError: string; findingToken: string; tokenError: string; tokenErrorHelp: string; clearToken: string;
  step1: string; step1Help: string; step2: string; step2Help: string; step3: string; step3Help: string; footer: string;
  anyMoment: string; minutes: (count: number) => string; hoursMinutes: (hours: number, minutes: number) => string;
  voiceAnnouncement: (token: string) => string;
};

export const patientCopy: Record<PatientLanguage, PatientCopy> = {
  en: {
    navPatient: "Patient check-in", navStaff: "Staff console", navDisplay: "Room screen", language: "Language",
    statusLabels: { waiting: "Waiting", called: "Called next", in_consultation: "In consultation", completed: "Completed", no_show: "No-show" },
    liveQueue: "Live clinic queue", waiting: count => `${count} ${count === 1 ? "person" : "people"} waiting`, tagline: "A calmer way to visit the clinic",
    titleLead: "Your care comes first.", titleAccent: "Not the waiting room.", intro: "Take a place in line from anywhere. We’ll keep your wait estimate up to date, so you can spend less time sitting and more time feeling like yourself.",
    benefitWait: "Smart wait estimates", benefitVoice: "Turn alerts in your browser", benefitPrivacy: "Private token tracking", restTagline: "More room to rest, read, or get home.",
    clinicName: "Goodwell Community Clinic", joinTitle: "Join the live queue", savedTitle: "Your place is saved", formIntro: "Enter your name and we’ll hold your place. A phone number is optional unless you choose SMS alerts.", patientName: "Patient name", namePlaceholder: "e.g. Samira Patel",
    phoneLabel: "Mobile number (optional)", phonePlaceholder: "+91 98765 43210", phoneHint: "Spaces are okay. A 10-digit Indian number gets +91 automatically.", smsConsent: "Text me a check-in confirmation and another alert near my turn. Reply STOP to opt out.", smsUnavailable: "SMS alerts are not set up yet. You can still join and track your token here.", smsRates: "Message and data rates may apply. Queue-only messages; no medical details.",
    smsInvalidPhone: "SMS needs a valid phone number. Your check-in will still work without SMS.", smsStatusLabel: "Check-in text", smsStatusQueued: "Queued — delivery is updating.", smsStatusDelivered: "Delivered to your phone.", smsStatusFailed: "Could not be delivered. Your queue place is still saved.",
    submit: "Get my queue token", submitting: "Saving your place…", namePrivacy: "Your name is visible to clinic staff only. The room screen shows queue tokens, never patient names.", livePrivate: "Live status · Private token", updateFrequency: "Updates every few seconds",
    tokenLabel: "Your queue token", estimate: "Estimated wait", ahead: "ahead of you", statusTitle: "You’re in the right place", waitingStatus: minutes => `We’re watching the line. Your estimate uses recent consultation times (about ${minutes} minutes each).`,
    calledStatus: "Your token is being called. Please head to reception now.", consultationStatus: "You’re with the clinician now. Wishing you well.", completedStatus: "Your visit is complete. We hope you feel better soon.", noShowStatus: "You were marked as missed. Please ask the clinic team to rejoin the queue.",
    voiceOn: "Voice alert is on", voiceOff: "Turn on voice alert", pageOpen: "While this page is open", voiceDisclaimer: "Keep this page open for live updates. Voice alerts use your device’s browser and are not phone calls.", checkInAgain: "Check in again",
    reloadError: "Couldn’t refresh this token. Check your connection and try again.", findingToken: "Finding your saved token…", tokenError: "We couldn’t load this token.", tokenErrorHelp: "Check your connection. If the token expired, clear it from this device and check in again.", clearToken: "Clear saved token",
    step1: "Take your token", step1Help: "A private queue number is saved on your device.", step2: "Check your live ETA", step2Help: "The estimate adjusts as the queue moves.", step3: "Come when it’s close", step3Help: "Choose SMS or browser voice alerts if available.", footer: "CareQueue · A calmer clinic experience",
    anyMoment: "Any moment", minutes: count => `~${count} min`, hoursMinutes: (hours, minutes) => `~${hours}h${minutes ? ` ${minutes}m` : ""}`,
    voiceAnnouncement: token => `Your token ${token.replace("-", " ")} is being called. Please proceed to the reception desk.`,
  },
  hi: {
    navPatient: "मरीज़ पंजीकरण", navStaff: "स्टाफ़ कंसोल", navDisplay: "प्रतीक्षा कक्ष", language: "भाषा",
    statusLabels: { waiting: "प्रतीक्षा में", called: "बुलाया गया", in_consultation: "परामर्श जारी", completed: "पूरा हुआ", no_show: "अनुपस्थित" },
    liveQueue: "लाइव क्लिनिक कतार", waiting: count => `${count} ${count === 1 ? "व्यक्ति प्रतीक्षा में" : "लोग प्रतीक्षा में"}`, tagline: "क्लिनिक आने का थोड़ा सुकूनभरा तरीका",
    titleLead: "आपकी देखभाल पहले।", titleAccent: "प्रतीक्षा कक्ष बाद में।", intro: "कहीं से भी कतार में अपनी जगह लें। हम प्रतीक्षा का अनुमान अपडेट करते रहेंगे, ताकि आपको क्लिनिक में कम बैठना पड़े।",
    benefitWait: "स्मार्ट प्रतीक्षा अनुमान", benefitVoice: "ब्राउज़र में आवाज़ सूचना", benefitPrivacy: "निजी टोकन ट्रैकिंग", restTagline: "आराम करें, पढ़ें या घर पर रहें।",
    clinicName: "गुडवेल कम्युनिटी क्लिनिक", joinTitle: "लाइव कतार में शामिल हों", savedTitle: "आपकी जगह सुरक्षित है", formIntro: "अपना नाम दर्ज करें। SMS सूचना चाहें तभी फ़ोन नंबर दें।", patientName: "मरीज़ का नाम", namePlaceholder: "जैसे: सीमा पटेल",
    phoneLabel: "मोबाइल नंबर (वैकल्पिक)", phonePlaceholder: "+91 98765 43210", phoneHint: "स्पेस स्वीकार्य हैं। 10 अंकों के भारतीय नंबर में +91 अपने आप जुड़ जाएगा।", smsConsent: "पंजीकरण पुष्टिकरण और बारी पास आने पर SMS पाएँ। बंद करने के लिए STOP भेजें।", smsUnavailable: "SMS सूचना अभी चालू नहीं है। आप फिर भी कतार में शामिल होकर अपना टोकन देख सकते हैं।", smsRates: "संदेश शुल्क लग सकता है। केवल कतार की जानकारी; कोई चिकित्सीय विवरण नहीं।",
    smsInvalidPhone: "SMS के लिए सही नंबर दें; फिर भी आपका पंजीकरण हो जाएगा।", smsStatusLabel: "पंजीकरण SMS", smsStatusQueued: "कतार में है — डिलीवरी अपडेट हो रही है।", smsStatusDelivered: "आपके फ़ोन पर पहुँचा।", smsStatusFailed: "SMS नहीं पहुँचा। आपकी कतार की जगह सुरक्षित है।",
    submit: "मेरा टोकन लें", submitting: "आपकी जगह सुरक्षित की जा रही है…", namePrivacy: "आपका नाम केवल क्लिनिक स्टाफ़ को दिखता है। स्क्रीन पर केवल टोकन दिखते हैं।", livePrivate: "लाइव स्थिति · निजी टोकन", updateFrequency: "हर कुछ सेकंड में अपडेट",
    tokenLabel: "आपका कतार टोकन", estimate: "अनुमानित प्रतीक्षा", ahead: "लोग आपसे आगे", statusTitle: "आप सही जगह पर हैं", waitingStatus: minutes => `कतार की निगरानी जारी है। हाल के परामर्श के आधार पर लगभग ${minutes} मिनट प्रति मरीज़ का अनुमान है।`,
    calledStatus: "आपका टोकन बुलाया जा रहा है। कृपया स्वागत कक्ष पर आएँ।", consultationStatus: "आपका परामर्श चल रहा है। स्वस्थ रहें।", completedStatus: "आपकी मुलाक़ात पूरी हुई। आप जल्द बेहतर महसूस करें।", noShowStatus: "आपको अनुपस्थित दर्ज किया गया। कतार में वापस जुड़ने के लिए क्लिनिक टीम से कहें।",
    voiceOn: "आवाज़ सूचना चालू है", voiceOff: "आवाज़ सूचना चालू करें", pageOpen: "यह पेज खुला रहने पर", voiceDisclaimer: "लाइव अपडेट के लिए यह पेज खुला रखें। आवाज़ सूचना आपके ब्राउज़र से आती है, फ़ोन कॉल नहीं।", checkInAgain: "फिर से पंजीकरण करें",
    reloadError: "टोकन अपडेट नहीं हुआ। कनेक्शन जाँचकर फिर कोशिश करें।", findingToken: "आपका टोकन ढूँढ रहे हैं…", tokenError: "यह टोकन लोड नहीं हुआ।", tokenErrorHelp: "कनेक्शन जाँचें। टोकन समाप्त हो तो इसे हटाकर फिर पंजीकरण करें।", clearToken: "सहेजा टोकन हटाएँ",
    step1: "टोकन लें", step1Help: "आपका निजी कतार नंबर इस डिवाइस पर सहेजा जाता है।", step2: "लाइव अनुमान देखें", step2Help: "कतार बदलने पर अनुमान अपडेट होता है।", step3: "बारी पास आने पर आएँ", step3Help: "उपलब्ध होने पर SMS या ब्राउज़र आवाज़ सूचना चुनें।", footer: "CareQueue · क्लिनिक का सुकूनभरा अनुभव",
    anyMoment: "किसी भी पल", minutes: count => `लगभग ${count} मिनट`, hoursMinutes: (hours, minutes) => `लगभग ${hours} घंटे${minutes ? ` ${minutes} मिनट` : ""}`,
    voiceAnnouncement: token => `टोकन ${token.replace("-", " ")} बुलाया जा रहा है। कृपया स्वागत कक्ष पर आएँ।`,
  },
  ta: {
    navPatient: "நோயாளர் பதிவு", navStaff: "பணியாளர் திரை", navDisplay: "காத்திருப்பு அறை", language: "மொழி",
    statusLabels: { waiting: "காத்திருப்பு", called: "அழைக்கப்பட்டார்", in_consultation: "ஆலோசனை நடைபெறுகிறது", completed: "முடிந்தது", no_show: "வரவில்லை" },
    liveQueue: "நேரடி மருத்துவமனை வரிசை", waiting: count => `${count} பேர் காத்திருக்கிறார்கள்`, tagline: "மருத்துவமனை வருகை இன்னும் அமைதியாக",
    titleLead: "உங்கள் நலனே முதலில்.", titleAccent: "காத்திருப்பு அறை அல்ல.", intro: "எங்கிருந்தும் வரிசையில் இடம் பெறுங்கள். காத்திருப்பு நேரத்தை நாங்கள் புதுப்பிப்போம்; மருத்துவமனையில் அமர்ந்து காத்திருக்கும் நேரம் குறையும்.",
    benefitWait: "புத்திசாலி காத்திருப்பு கணிப்பு", benefitVoice: "உலாவி குரல் அறிவிப்பு", benefitPrivacy: "தனிப்பட்ட டோக்கன்", restTagline: "ஓய்வெடுக்கவும், படிக்கவும் அல்லது வீட்டில் இருக்கவும்.",
    clinicName: "குட்வெல் சமூக மருத்துவமனை", joinTitle: "நேரடி வரிசையில் சேருங்கள்", savedTitle: "உங்கள் இடம் உறுதி செய்யப்பட்டது", formIntro: "உங்கள் பெயரை உள்ளிடுங்கள். SMS அறிவிப்பை விரும்பினால் மட்டும் தொலைபேசி எண்ணை அளிக்கவும்.", patientName: "நோயாளர் பெயர்", namePlaceholder: "எ.கா. சமீரா பட்டேல்",
    phoneLabel: "கைபேசி எண் (விருப்பம்)", phonePlaceholder: "+91 98765 43210", phoneHint: "இடைவெளிகள் பரவாயில்லை. 10 இலக்க இந்திய எண்ணுக்கு +91 தானாக சேர்க்கப்படும்.", smsConsent: "பதிவு உறுதிப்படுத்தல் மற்றும் முறை நெருங்கும்போது SMS பெறுங்கள். நிறுத்த STOP அனுப்பவும்.", smsUnavailable: "SMS அறிவிப்புகள் இன்னும் அமைக்கப்படவில்லை. இருந்தாலும் வரிசையில் சேர்ந்து டோக்கனைப் பார்க்கலாம்.", smsRates: "செய்தி மற்றும் தரவுக் கட்டணம் இருக்கலாம். வரிசைத் தகவல் மட்டும்; மருத்துவ விவரங்கள் இல்லை.",
    smsInvalidPhone: "SMS பெற சரியான எண்ணை உள்ளிடுங்கள்; பதிவு அதில்லாமலும் தொடரும்.", smsStatusLabel: "பதிவு SMS", smsStatusQueued: "வரிசைப்படுத்தப்பட்டது — நிலை புதுப்பிக்கப்படுகிறது.", smsStatusDelivered: "உங்கள் கைபேசிக்கு அனுப்பப்பட்டது.", smsStatusFailed: "SMS அனுப்ப முடியவில்லை. உங்கள் வரிசை இடம் பாதுகாப்பாக உள்ளது.",
    submit: "என் டோக்கனைப் பெறுங்கள்", submitting: "உங்கள் இடம் சேமிக்கப்படுகிறது…", namePrivacy: "உங்கள் பெயரை மருத்துவமனைப் பணியாளர்கள் மட்டுமே பார்ப்பார்கள். திரையில் டோக்கன்கள் மட்டுமே காட்டப்படும்.", livePrivate: "நேரடி நிலை · தனிப்பட்ட டோக்கன்", updateFrequency: "சில விநாடிகளுக்கு ஒருமுறை புதுப்பிக்கப்படும்",
    tokenLabel: "உங்கள் வரிசை டோக்கன்", estimate: "காத்திருப்பு கணிப்பு", ahead: "பேர் உங்களுக்கு முன்", statusTitle: "நீங்கள் சரியான இடத்தில் உள்ளீர்கள்", waitingStatus: minutes => `வரிசையை நாங்கள் கண்காணிக்கிறோம். சமீபத்திய ஆலோசனைகளின் அடிப்படையில் ஒவ்வொன்றும் சுமார் ${minutes} நிமிடம்.`,
    calledStatus: "உங்கள் டோக்கன் அழைக்கப்படுகிறது. வரவேற்பறைக்கு வாருங்கள்.", consultationStatus: "மருத்துவருடன் ஆலோசனை நடைபெறுகிறது. நலமாக இருங்கள்.", completedStatus: "உங்கள் வருகை முடிந்தது. விரைவில் நலம் பெற வாழ்த்துகள்.", noShowStatus: "நீங்கள் வராதவராகப் பதிவு செய்யப்பட்டுள்ளீர்கள். மீண்டும் வரிசையில் சேர மருத்துவமனைப் பணியாளர்களிடம் கேளுங்கள்.",
    voiceOn: "குரல் அறிவிப்பு இயக்கத்தில் உள்ளது", voiceOff: "குரல் அறிவிப்பை இயக்கவும்", pageOpen: "இந்தப் பக்கம் திறந்திருக்கும் போது", voiceDisclaimer: "நேரடி புதுப்பிப்புகளுக்குப் பக்கத்தைத் திறந்து வையுங்கள். குரல் அறிவிப்பு உலாவியிலிருந்து வரும்; தொலைபேசி அழைப்பு அல்ல.", checkInAgain: "மீண்டும் பதிவு செய்யுங்கள்",
    reloadError: "டோக்கனைப் புதுப்பிக்க முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.", findingToken: "சேமித்த டோக்கனைத் தேடுகிறது…", tokenError: "இந்த டோக்கனை ஏற்ற முடியவில்லை.", tokenErrorHelp: "இணைப்பைச் சரிபார்க்கவும். டோக்கன் காலாவதியானால் அதை நீக்கி மீண்டும் பதிவு செய்யுங்கள்.", clearToken: "சேமித்த டோக்கனை நீக்கு",
    step1: "டோக்கனைப் பெறுங்கள்", step1Help: "தனிப்பட்ட வரிசை எண் உங்கள் சாதனத்தில் சேமிக்கப்படும்.", step2: "நேரடி நேரத்தைப் பாருங்கள்", step2Help: "வரிசை நகரும்போது கணிப்பு புதுப்பிக்கப்படும்.", step3: "நேரம் நெருங்கும்போது வாருங்கள்", step3Help: "கிடைத்தால் SMS அல்லது உலாவி குரல் அறிவிப்பைத் தேர்ந்தெடுக்கவும்.", footer: "CareQueue · அமைதியான மருத்துவமனை அனுபவம்",
    anyMoment: "விரைவில்", minutes: count => `சுமார் ${count} நிமி`, hoursMinutes: (hours, minutes) => `சுமார் ${hours} மணி${minutes ? ` ${minutes} நிமி` : ""}`,
    voiceAnnouncement: token => `டோக்கன் ${token.replace("-", " ")} அழைக்கப்படுகிறது. வரவேற்பறைக்கு வாருங்கள்.`,
  },
  te: {
    navPatient: "రోగి నమోదు", navStaff: "సిబ్బంది కన్సోల్", navDisplay: "వేచిచూసే గది", language: "భాష",
    statusLabels: { waiting: "వేచి ఉన్నారు", called: "పిలిచారు", in_consultation: "సంప్రదింపు జరుగుతోంది", completed: "పూర్తయింది", no_show: "రాలేదు" },
    liveQueue: "లైవ్ క్లినిక్ క్యూ", waiting: count => `${count} మంది వేచి ఉన్నారు`, tagline: "క్లినిక్‌కు ప్రశాంతమైన సందర్శన",
    titleLead: "మీ ఆరోగ్యమే ముఖ్యం.", titleAccent: "వేచిచూసే గది కాదు.", intro: "ఎక్కడి నుంచైనా క్యూలో చేరండి. మీ వేచి ఉండే సమయాన్ని మేము అప్‌డేట్ చేస్తాం; క్లినిక్‌లో కూర్చొని గడిపే సమయం తగ్గుతుంది.",
    benefitWait: "స్మార్ట్ వేచి సమయం", benefitVoice: "బ్రౌజర్ వాయిస్ అలర్ట్", benefitPrivacy: "ప్రైవేట్ టోకెన్", restTagline: "విశ్రాంతి తీసుకోండి, చదవండి లేదా ఇంట్లో ఉండండి.",
    clinicName: "గుడ్‌వెల్ కమ్యూనిటీ క్లినిక్", joinTitle: "లైవ్ క్యూలో చేరండి", savedTitle: "మీ స్థానం భద్రపరచబడింది", formIntro: "మీ పేరు నమోదు చేయండి. SMS అలర్ట్ కావాలనుకుంటే మాత్రమే ఫోన్ నంబర్ ఇవ్వండి.", patientName: "రోగి పేరు", namePlaceholder: "ఉదా: సమీరా పటేల్",
    phoneLabel: "మొబైల్ నంబర్ (ఐచ్ఛికం)", phonePlaceholder: "+91 98765 43210", phoneHint: "స్పేస్‌లు సరే. 10 అంకెల భారతీయ నంబర్‌కు +91 ఆటోమేటిక్‌గా చేరుతుంది.", smsConsent: "నమోదు నిర్ధారణ మరియు మీ వంతు దగ్గరలో SMS పొందండి. ఆపేందుకు STOP పంపండి.", smsUnavailable: "SMS అలర్ట్‌లు ఇంకా సెటప్ కాలేదు. అయినా క్యూలో చేరి మీ టోకెన్‌ను చూడవచ్చు.", smsRates: "సందేశ/డేటా ఛార్జీలు వర్తించవచ్చు. క్యూ సమాచారం మాత్రమే; వైద్య వివరాలు ఉండవు.",
    smsInvalidPhone: "SMS కోసం సరైన నంబర్ ఇవ్వండి; SMS లేకుండానే నమోదు కొనసాగుతుంది.", smsStatusLabel: "నమోదు SMS", smsStatusQueued: "క్యూలో ఉంది — డెలివరీ అప్‌డేట్ అవుతోంది.", smsStatusDelivered: "మీ ఫోన్‌కు చేరింది.", smsStatusFailed: "SMS చేరలేదు. మీ క్యూ స్థానం భద్రంగా ఉంది.",
    submit: "నా క్యూ టోకెన్ పొందండి", submitting: "మీ స్థానం భద్రపరుస్తున్నాం…", namePrivacy: "మీ పేరును క్లినిక్ సిబ్బంది మాత్రమే చూస్తారు. గది స్క్రీన్‌లో టోకెన్‌లే కనిపిస్తాయి.", livePrivate: "లైవ్ స్థితి · ప్రైవేట్ టోకెన్", updateFrequency: "కొన్ని సెకన్లకోసారి అప్‌డేట్",
    tokenLabel: "మీ క్యూ టోకెన్", estimate: "అంచనా వేచి సమయం", ahead: "మంది మీ ముందు", statusTitle: "మీరు సరైన చోట ఉన్నారు", waitingStatus: minutes => `క్యూను గమనిస్తున్నాం. ఇటీవలి సంప్రదింపుల ఆధారంగా ఒక్కొక్కటి సుమారు ${minutes} నిమిషాలు.`,
    calledStatus: "మీ టోకెన్ పిలుస్తున్నారు. దయచేసి రిసెప్షన్‌కు రండి.", consultationStatus: "మీ సంప్రదింపు జరుగుతోంది. ఆరోగ్యంగా ఉండండి.", completedStatus: "మీ సందర్శన పూర్తయింది. త్వరగా కోలుకోవాలని ఆశిస్తున్నాం.", noShowStatus: "మీరు రాలేదని నమోదు చేశారు. మళ్లీ క్యూలో చేరేందుకు క్లినిక్ సిబ్బందిని అడగండి.",
    voiceOn: "వాయిస్ అలర్ట్ ఆన్‌లో ఉంది", voiceOff: "వాయిస్ అలర్ట్ ఆన్ చేయండి", pageOpen: "ఈ పేజీ తెరిచి ఉన్నప్పుడు", voiceDisclaimer: "లైవ్ అప్‌డేట్‌ల కోసం ఈ పేజీని తెరిచి ఉంచండి. వాయిస్ అలర్ట్ మీ బ్రౌజర్ ద్వారా వస్తుంది; ఫోన్ కాల్ కాదు.", checkInAgain: "మళ్లీ నమోదు చేయండి",
    reloadError: "టోకెన్‌ను రిఫ్రెష్ చేయలేకపోయాం. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.", findingToken: "మీ సేవ్ చేసిన టోకెన్ కోసం చూస్తున్నాం…", tokenError: "ఈ టోకెన్‌ను లోడ్ చేయలేకపోయాం.", tokenErrorHelp: "కనెక్షన్ తనిఖీ చేయండి. టోకెన్ గడువు ముగిస్తే దాన్ని తీసేసి మళ్లీ నమోదు చేయండి.", clearToken: "సేవ్ చేసిన టోకెన్ తొలగించండి",
    step1: "టోకెన్ పొందండి", step1Help: "ప్రైవేట్ క్యూ నంబర్ మీ పరికరంలో సేవ్ అవుతుంది.", step2: "లైవ్ ETA చూడండి", step2Help: "క్యూ కదిలే కొద్దీ అంచనా మారుతుంది.", step3: "సమయం దగ్గరైనప్పుడు రండి", step3Help: "అందుబాటులో ఉంటే SMS లేదా బ్రౌజర్ వాయిస్ అలర్ట్ ఎంచుకోండి.", footer: "CareQueue · ప్రశాంతమైన క్లినిక్ అనుభవం",
    anyMoment: "ఏ క్షణమైనా", minutes: count => `సుమారు ${count} నిమి`, hoursMinutes: (hours, minutes) => `సుమారు ${hours} గంట${minutes ? ` ${minutes} నిమి` : ""}`,
    voiceAnnouncement: token => `మీ టోకెన్ ${token.replace("-", " ")} పిలుస్తున్నారు. దయచేసి రిసెప్షన్‌కు రండి.`,
  },
};
