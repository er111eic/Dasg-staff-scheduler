import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "activity-staff-scheduler:v1";
const FIREBASE_CONFIG_KEY = "activity-staff-scheduler:firebase-config";
const FIREBASE_SDK_VERSION = "12.7.0";
const OCR_WORKFLOW_ENABLED = false;
const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

const defaultStaff = ["思賢", "元妙", "旻恩", "崇萱", "詠禎", "嘉鴻"];

const defaultRoleSlots = ["主攝", "副攝", "音控", "機動"];

const defaultSchedules = [
  {
    date: "5/16（六）｜第一天",
    activities: [
      {
        id: "dharma",
        title: "法會｜士林區",
        fixed: true,
        sessions: [
          { time: "08:50–09:20", content: "複習三寶（30分）" },
          { time: "09:20–09:55", content: "獻供、請壇（35分）" },
          { time: "10:05–10:55", content: "班規｜法會因由 -10分（50分）" },
          { time: "11:10–12:00", content: "人生真諦（50分）" },
          { time: "12:00–13:05", content: "分組及午餐；12:40–12:55 暖場；12:55–13:05 請師" },
          { time: "13:05–13:45", content: "發一崇德簡介（40分）" },
          { time: "13:55–14:45", content: "道之尊貴（50分）" },
          { time: "15:00–15:50", content: "天命明師之印證（50分）" },
          { time: "15:50–16:05", content: "下午茶" },
          { time: "16:05–16:50", content: "演禮及十條大愿（45分）" },
          { time: "17:00–17:50", content: "孝道｜前人慈悲影帶45分（50分）" },
          { time: "17:50–18:10", content: "孝道課後（20分）" },
          { time: "18:10–18:30", content: "晚獻及祈福" },
        ],
      },
      {
        id: "scholarship",
        title: "獎助學金頒獎",
        sessions: [
          { time: "11:10–12:00", content: "11:30 報到" },
          { time: "12:00–13:05", content: "13:00 彩排；13:30 受獎人入席" },
          { time: "13:05–13:45", content: "14:00 迎賓；14:05 帶動唱／發現新台灣" },
          { time: "13:55–14:45", content: "14:15 主席致詞；14:30 貴賓致詞；14:40 節孝勵志頒獎 part1" },
          {
            time: "15:00–15:50",
            content: "15:05 崇德國樂團表演；15:20 節孝勵志頒獎 part2；15:30 崇德管弦樂團表演；15:45 頒發感謝狀",
          },
          { time: "15:50–16:05", content: "15:55 大合唱；16:00 禮成" },
        ],
      },
      {
        id: "support",
        title: "其他支援",
        sessions: [],
      },
    ],
  },
  {
    date: "5/17（日）｜第二天",
    activities: [
      {
        id: "dharma",
        title: "法會｜士林區",
        fixed: true,
        sessions: [
          { time: "06:40–08:10", content: "06:40 八段錦；07:10 獻供；07:30 早餐；08:10 請壇" },
          { time: "08:20–09:00", content: "聖訓簡介天命殊勝（40分）" },
          { time: "09:10–10:00", content: "持齋意義（50分）" },
          { time: "10:15–11:05", content: "內外功之修持（50分）" },
          { time: "11:20–12:00", content: "進新民班殊勝（40分）" },
          { time: "12:00–13:10", content: "12:50–13:05 暖場；13:05 請師" },
          { time: "13:10–14:00", content: "天恩師德與尊師重道（50分）" },
          { time: "14:00–14:15", content: "天恩師德課後（15分）" },
          { time: "14:30–15:10", content: "信愿行證（50分）" },
          { time: "15:10–16:00", content: "圓班立愿禮" },
        ],
      },
      {
        id: "banxin-graduation",
        title: "畢班｜板新區",
        sessions: [
          { time: "06:40–08:10", content: "08:20–08:50 報到（B2禮堂座位安排）" },
          { time: "08:20–09:00", content: "08:30–08:50 獻供；08:50–09:00 善歌帶動唱" },
          { time: "09:10–10:00", content: "09:00–09:10 開場整理隊伍；09:10–09:40 2025大事紀影片；09:40–09:50 休息；09:50–10:00 班務報告" },
          { time: "10:15–11:05", content: "10:00–10:40 頒發禮物；10:40–11:00 監愿點傳師慈悲" },
          { time: "11:20–12:00", content: "11:00–11:40 獻供、立愿、點傳師；11:40–12:00 大合唱、辭駕、發蘋果、禮物" },
        ],
      },
      {
        id: "gratitude-party",
        title: "畢業感恩會",
        sessions: [
          { time: "06:40–08:10", content: "08:30–09:30 畢業生報到、領胸花" },
          { time: "12:00–13:10", content: "12:00–12:20 B1餐廳就位；12:20–12:30 負責群／指導點傳師代表；12:30–13:10 用餐" },
          { time: "13:10–14:00", content: "13:10–13:25 1F視聽教室就位；13:25–13:40 入座及頒獎綵排；13:40–14:00 善歌" },
          { time: "14:00–14:15", content: "14:00–14:15 負責群／指導點傳師代表" },
          {
            time: "14:30–15:10",
            content: "14:15–14:23 在校生感言；14:23–14:40 畢業生感言；14:40–14:50 學界指導點傳師代表慈悲；14:50–15:15 頒發畢業生禮物與祝福",
          },
          { time: "15:10–16:00", content: "15:15–15:20 合照；15:20–15:30 機動收尾" },
        ],
      },
    ],
  },
];

const emptyAssignments = {};

function createSlotKey(date, time, activityId, role) {
  return [date, time, activityId, role].join("__");
}

function orderActivities(activities) {
  const fixed = activities.filter((activity) => activity.fixed || activity.id === "dharma");
  const movable = activities.filter((activity) => !activity.fixed && activity.id !== "dharma");
  return [...fixed, ...movable];
}

function parseStartTime(time) {
  const match = String(time).match(/(\d{1,2})[:：](\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getTimesForDay(day) {
  const seen = new Set();

  orderActivities(day.activities).forEach((activity) => {
    activity.sessions.forEach((session) => {
      seen.add(session.time);
    });
  });

  return Array.from(seen).sort((left, right) => parseStartTime(left) - parseStartTime(right));
}

function getSession(activity, time) {
  return activity.sessions.find((session) => session.time === time);
}

function normalizeImportedData(input) {
  if (!input || typeof input !== "object") {
    throw new Error("JSON 必須是物件。");
  }

  const staff = Array.isArray(input.staff) ? input.staff : defaultStaff;
  const roleSlots = Array.isArray(input.roleSlots) ? input.roleSlots : defaultRoleSlots;
  const schedules = Array.isArray(input.schedules) ? input.schedules : null;
  const assignments = input.assignments && typeof input.assignments === "object" ? input.assignments : emptyAssignments;

  if (!schedules) {
    throw new Error("JSON 需要包含 schedules 陣列。");
  }

  return {
    staff,
    roleSlots,
    schedules: schedules.map((day, dayIndex) => ({
      date: String(day.date || `第 ${dayIndex + 1} 天`),
      activities: orderActivities(
        (Array.isArray(day.activities) ? day.activities : []).map((activity, activityIndex) => ({
          id: String(activity.id || `activity-${activityIndex + 1}`),
          title: String(activity.title || activity.name || `活動 ${activityIndex + 1}`),
          fixed: Boolean(activity.fixed || activity.id === "dharma"),
          sessions: (Array.isArray(activity.sessions) ? activity.sessions : []).map((session) => ({
            time: String(session.time || ""),
            content: String(session.content || session.title || ""),
          })),
        })),
      ),
    })),
    assignments,
  };
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${TESSERACT_CDN}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Tesseract), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("OCR 套件載入失敗。")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("OCR 套件載入失敗，請確認網路連線後再試。"));
    document.head.appendChild(script);
  });
}

function extractJsonFromText(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("尚未貼上 AI 解析後的 JSON。");

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
    if (!candidate || candidate === trimmed) throw new Error("找不到可解析的 JSON 物件。");
    return JSON.parse(candidate);
  }
}

function createAiParsingPrompt({ staff, roleSlots, ocrText }) {
  return `請把以下活動流程表 OCR 文字整理成排班系統 JSON。

只回傳 JSON，不要 Markdown，不要解釋。

資料結構必須完全符合：
{
  "staff": string[],
  "roleSlots": string[],
  "schedules": [
    {
      "date": "日期或第幾天",
      "activities": [
        {
          "id": "英文或拼音識別碼",
          "title": "活動名稱",
          "fixed": boolean,
          "sessions": [
            { "time": "HH:MM–HH:MM", "content": "流程內容" }
          ]
        }
      ]
    }
  ],
  "assignments": {}
}

整理規則：
1. 支援兩日以上活動，每一天放在 schedules 的一個物件。
2. 法會活動固定放在 activities 第一個，並設定 fixed: true。
3. 其他活動依日期與活動數量往右排列，設定 fixed: false。
4. 同一日期內不同活動若共用同一時段，time 必須寫成完全相同的字串。
5. 人員不要自動安排，assignments 保持空物件。
6. staff 若 OCR 沒有名單，使用目前名單：${JSON.stringify(staff)}。
7. roleSlots 若 OCR 沒有職務，使用目前職務：${JSON.stringify(roleSlots)}。

OCR 文字：
${ocrText}`;
}

async function createFirebaseClient(config) {
  const appModule = await import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
  const firestoreModule = await import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
  const app = appModule.initializeApp(config);
  const db = firestoreModule.getFirestore(app);

  return {
    db,
    doc: firestoreModule.doc,
    collection: firestoreModule.collection,
    getDoc: firestoreModule.getDoc,
    setDoc: firestoreModule.setDoc,
    addDoc: firestoreModule.addDoc,
    serverTimestamp: firestoreModule.serverTimestamp,
  };
}

export default function ActivitySchedulerPrototype() {
  const [staff, setStaff] = useState(defaultStaff);
  const [schedules, setSchedules] = useState(defaultSchedules);
  const [assignments, setAssignments] = useState(emptyAssignments);
  const [roleSlots, setRoleSlots] = useState(defaultRoleSlots);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [flowImage, setFlowImage] = useState(null);
  const [flowImageUrl, setFlowImageUrl] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiJson, setAiJson] = useState("");
  const [firebaseConfigText, setFirebaseConfigText] = useState("");
  const [firebaseEventId, setFirebaseEventId] = useState("current-event");
  const [firebaseMessage, setFirebaseMessage] = useState("");
  const [isFirebaseBusy, setIsFirebaseBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const normalized = normalizeImportedData(parsed);
      setStaff(normalized.staff);
      setSchedules(normalized.schedules);
      setAssignments(normalized.assignments);
      setRoleSlots(normalized.roleSlots);
      setImportMessage("已載入 localStorage 排班資料。");
    } catch (error) {
      setImportMessage(`localStorage 資料格式錯誤：${error.message}`);
    }
  }, []);

  useEffect(() => {
    const payload = { staff, schedules, assignments, roleSlots };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [staff, schedules, assignments, roleSlots]);

  useEffect(() => {
    const savedConfig = window.localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (savedConfig) setFirebaseConfigText(savedConfig);
  }, []);

  useEffect(() => {
    return () => {
      if (flowImageUrl) URL.revokeObjectURL(flowImageUrl);
    };
  }, [flowImageUrl]);

  const conflicts = useMemo(() => {
    const map = {};

    Object.entries(assignments).forEach(([slotKey, person]) => {
      if (!person) return;
      const [date, time] = slotKey.split("__");
      const conflictKey = `${date}__${time}__${person}`;
      map[conflictKey] = (map[conflictKey] || 0) + 1;
    });

    return map;
  }, [assignments]);

  const exportJson = useMemo(
    () => JSON.stringify({ staff, schedules, assignments, roleSlots }, null, 2),
    [staff, schedules, assignments, roleSlots],
  );

  function assignPerson(slotKey) {
    if (!selectedStaff) return;
    setAssignments((prev) => ({ ...prev, [slotKey]: selectedStaff }));
  }

  function clearSlot(slotKey) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }

  function isConflict(slotKey, person) {
    if (!person) return false;
    const [date, time] = slotKey.split("__");
    return conflicts[`${date}__${time}__${person}`] > 1;
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonInput);
      const normalized = normalizeImportedData(parsed);
      setStaff(normalized.staff);
      setSchedules(normalized.schedules);
      setAssignments(normalized.assignments);
      setRoleSlots(normalized.roleSlots);
      setSelectedStaff("");
      setImportMessage("JSON 匯入完成，已同步寫入 localStorage。");
    } catch (error) {
      setImportMessage(`JSON 匯入失敗：${error.message}`);
    }
  }

  function handleFlowImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (flowImageUrl) URL.revokeObjectURL(flowImageUrl);
    setFlowImage(file);
    setFlowImageUrl(URL.createObjectURL(file));
    setOcrMessage(`已載入圖片：${file.name}`);
    setOcrProgress(0);
  }

  async function runBrowserOcr() {
    if (!flowImage) {
      setOcrMessage("請先選擇流程表圖片。");
      return;
    }

    setIsOcrRunning(true);
    setOcrProgress(0);
    setOcrMessage("OCR 載入中...");

    try {
      const Tesseract = await loadTesseract();
      const result = await Tesseract.recognize(flowImage, "chi_tra+eng", {
        logger: (entry) => {
          if (entry.status === "recognizing text") {
            setOcrProgress(Math.round(entry.progress * 100));
          }
        },
      });
      setOcrText(result.data.text.trim());
      setOcrMessage("OCR 完成，請檢查文字後產生 AI 解析提示。");
    } catch (error) {
      setOcrMessage(`OCR 失敗：${error.message}`);
    } finally {
      setIsOcrRunning(false);
    }
  }

  function buildAiPrompt() {
    if (!ocrText.trim()) {
      setOcrMessage("請先執行 OCR 或貼上流程表文字。");
      return;
    }

    setAiPrompt(createAiParsingPrompt({ staff, roleSlots, ocrText }));
    setOcrMessage("已產生 AI 解析提示，可貼到 ChatGPT 或其他 AI 取得 JSON。");
  }

  async function copyAiPrompt() {
    if (!aiPrompt) {
      setOcrMessage("請先產生 AI 解析提示。");
      return;
    }

    try {
      await navigator.clipboard.writeText(aiPrompt);
      setOcrMessage("AI 解析提示已複製。");
    } catch {
      setOcrMessage("瀏覽器不允許自動複製，請手動選取提示內容。");
    }
  }

  function importAiJson() {
    try {
      const parsed = extractJsonFromText(aiJson);
      const normalized = normalizeImportedData(parsed);
      setStaff(normalized.staff);
      setSchedules(normalized.schedules);
      setAssignments(normalized.assignments);
      setRoleSlots(normalized.roleSlots);
      setJsonInput(JSON.stringify(normalized, null, 2));
      setSelectedStaff("");
      setImportMessage("AI 解析 JSON 已匯入，並同步寫入 localStorage。");
      setOcrMessage("AI JSON 匯入完成。");
    } catch (error) {
      setOcrMessage(`AI JSON 匯入失敗：${error.message}`);
    }
  }

  function parseFirebaseConfig() {
    const config = JSON.parse(firebaseConfigText);
    if (!config || typeof config !== "object") {
      throw new Error("Firebase config 必須是 JSON 物件。");
    }

    if (!config.apiKey || !config.projectId || !config.appId) {
      throw new Error("Firebase config 至少需要 apiKey、projectId、appId。");
    }

    return config;
  }

  function currentPayload() {
    return { staff, schedules, assignments, roleSlots };
  }

  async function withFirebase(action) {
    setIsFirebaseBusy(true);
    setFirebaseMessage("Firebase 連線中...");

    try {
      const config = parseFirebaseConfig();
      window.localStorage.setItem(FIREBASE_CONFIG_KEY, firebaseConfigText);
      const firebase = await createFirebaseClient(config);
      await action(firebase);
    } catch (error) {
      setFirebaseMessage(`Firebase 操作失敗：${error.message}`);
    } finally {
      setIsFirebaseBusy(false);
    }
  }

  function saveEventToFirebase() {
    withFirebase(async ({ db, doc, setDoc, serverTimestamp }) => {
      const eventRef = doc(db, "events", firebaseEventId || "current-event");
      await setDoc(
        eventRef,
        {
          ...currentPayload(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setFirebaseMessage(`已儲存活動到 Firebase：events/${firebaseEventId || "current-event"}`);
    });
  }

  function loadEventFromFirebase() {
    withFirebase(async ({ db, doc, getDoc }) => {
      const eventRef = doc(db, "events", firebaseEventId || "current-event");
      const snapshot = await getDoc(eventRef);
      if (!snapshot.exists()) {
        setFirebaseMessage(`找不到 Firebase 活動：events/${firebaseEventId || "current-event"}`);
        return;
      }

      const normalized = normalizeImportedData(snapshot.data());
      setStaff(normalized.staff);
      setSchedules(normalized.schedules);
      setAssignments(normalized.assignments);
      setRoleSlots(normalized.roleSlots);
      setSelectedStaff("");
      setFirebaseMessage(`已載入 Firebase 活動：events/${firebaseEventId || "current-event"}`);
    });
  }

  function saveTemplateToFirebase() {
    withFirebase(async ({ db, collection, addDoc, serverTimestamp }) => {
      const templateRef = await addDoc(collection(db, "templates"), {
        name: `${firebaseEventId || "current-event"} template`,
        schedules,
        roleSlots,
        createdAt: serverTimestamp(),
      });
      setFirebaseMessage(`已建立模板：templates/${templateRef.id}`);
    });
  }

  function saveStaffListToFirebase() {
    withFirebase(async ({ db, collection, addDoc, serverTimestamp }) => {
      const staffRef = await addDoc(collection(db, "staffLists"), {
        name: `${firebaseEventId || "current-event"} staff`,
        staff,
        createdAt: serverTimestamp(),
      });
      setFirebaseMessage(`已建立人員名單：staffLists/${staffRef.id}`);
    });
  }

  function saveHistoryToFirebase() {
    withFirebase(async ({ db, collection, addDoc, serverTimestamp }) => {
      const historyRef = await addDoc(collection(db, "scheduleHistory"), {
        eventId: firebaseEventId || "current-event",
        ...currentPayload(),
        createdAt: serverTimestamp(),
      });
      setFirebaseMessage(`已建立歷史排班：scheduleHistory/${historyRef.id}`);
    });
  }

  function resetToDefault() {
    setStaff(defaultStaff);
    setSchedules(defaultSchedules);
    setAssignments(emptyAssignments);
    setRoleSlots(defaultRoleSlots);
    setSelectedStaff("");
    setImportMessage("已還原預設資料。");
  }

  function StaffPool() {
    return (
      <div className="grid gap-2">
        {staff.map((person) => (
          <button
            key={person}
            type="button"
            onClick={() => setSelectedStaff(person)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
              selectedStaff === person
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
            }`}
          >
            {person}
          </button>
        ))}
      </div>
    );
  }

  function AssignmentSlots({ date, time, activityId }) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {roleSlots.map((role) => {
          const slotKey = createSlotKey(date, time, activityId, role);
          const person = assignments[slotKey];
          const conflict = isConflict(slotKey, person);

          return (
            <div
              key={slotKey}
              className={`relative min-h-16 rounded-lg border text-xs transition ${
                conflict
                  ? "border-red-500 bg-red-50"
                  : person
                    ? "border-stone-400 bg-white"
                    : "border-dashed border-stone-300 bg-stone-50 hover:bg-white"
              }`}
            >
              <button type="button" onClick={() => assignPerson(slotKey)} className="h-full min-h-16 w-full p-2 text-left">
                <div className="font-semibold text-stone-800">{role}</div>
                <div className={`mt-1 pr-6 ${person ? "font-semibold text-stone-950" : "text-stone-400"}`}>
                  {person || "未安排"}
                </div>
                {conflict && <div className="mt-1 font-semibold text-red-600">同時段衝突</div>}
              </button>
              {person && (
                <button
                  type="button"
                  onClick={() => clearSlot(slotKey)}
                  className="absolute right-1.5 top-1.5 rounded-md border border-stone-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-stone-600 hover:border-red-400 hover:text-red-600"
                  aria-label={`清除 ${role} 的 ${person}`}
                  title="清除這格人員"
                >
                  清除
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function EventCell({ date, time, activity, session }) {
    if (!session) {
      return <div className="min-h-28 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-400">無活動</div>;
    }

    return (
      <div className="min-h-28 rounded-lg border border-stone-300 bg-white p-3">
        <div className="text-sm font-semibold leading-relaxed text-stone-950">{session.content}</div>
        <AssignmentSlots date={date} time={time} activityId={activity.id} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div className="min-h-screen pl-64">
        <aside className="fixed inset-y-0 left-0 z-20 w-64 overflow-y-auto border-r border-stone-300 bg-stone-100 p-5">
          <h1 className="text-2xl font-bold">活動人力排班</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">以日期、時段、活動與職務安排人員，並偵測同日同時段重複安排。</p>

          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold">人員</div>
            <StaffPool />
          </div>

          <div className="mt-4 rounded-lg border border-stone-300 bg-white p-3 text-sm">
            <div className="text-stone-500">目前選擇</div>
            <div className="mt-1 font-semibold">{selectedStaff || "尚未選擇"}</div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold">JSON 匯入</div>
            <textarea
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              className="h-44 w-full resize-y rounded-lg border border-stone-300 bg-white p-3 font-mono text-xs outline-none focus:border-stone-700"
              placeholder='{"staff":[],"roleSlots":[],"schedules":[],"assignments":{}}'
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={importJson} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white">
                匯入 JSON
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
              >
                還原
              </button>
            </div>
            {importMessage && <div className="mt-2 text-xs leading-5 text-stone-600">{importMessage}</div>}
          </div>
        </aside>

        <main className="mx-auto min-w-0 max-w-[1236px] px-5 py-5">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="rounded-lg border border-stone-300 bg-white p-4">
              <h2 className="text-base font-semibold">資料結構</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-stone-200 p-3">staff：{staff.length} 人</div>
                <div className="rounded-lg border border-stone-200 p-3">roleSlots：{roleSlots.length} 項</div>
                <div className="rounded-lg border border-stone-200 p-3">schedules：{schedules.length} 日</div>
                <div className="rounded-lg border border-stone-200 p-3">assignments：{Object.keys(assignments).length} 筆</div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-4">
              <h2 className="text-base font-semibold">匯出 JSON</h2>
              <textarea readOnly value={exportJson} className="mt-3 h-28 w-full resize-y rounded-lg border border-stone-300 bg-stone-50 p-3 font-mono text-xs" />
            </section>
          </div>

          <section className="mb-4 rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Firebase 儲存</h2>
              {firebaseMessage && <div className="text-sm text-stone-600">{firebaseMessage}</div>}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <label className="block text-sm font-semibold text-stone-800" htmlFor="firebase-config">
                  Firebase config
                </label>
                <textarea
                  id="firebase-config"
                  value={firebaseConfigText}
                  onChange={(event) => setFirebaseConfigText(event.target.value)}
                  className="mt-2 h-36 w-full resize-y rounded-lg border border-stone-300 bg-stone-50 p-3 font-mono text-xs outline-none focus:border-stone-700"
                  placeholder='{"apiKey":"","authDomain":"","projectId":"","storageBucket":"","messagingSenderId":"","appId":""}'
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-800" htmlFor="firebase-event-id">
                  活動 ID
                </label>
                <input
                  id="firebase-event-id"
                  value={firebaseEventId}
                  onChange={(event) => setFirebaseEventId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-700"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={loadEventFromFirebase} disabled={isFirebaseBusy} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 disabled:text-stone-400">
                    載入活動
                  </button>
                  <button type="button" onClick={saveEventToFirebase} disabled={isFirebaseBusy} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-stone-400">
                    儲存活動
                  </button>
                  <button type="button" onClick={saveTemplateToFirebase} disabled={isFirebaseBusy} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 disabled:text-stone-400">
                    存模板
                  </button>
                  <button type="button" onClick={saveStaffListToFirebase} disabled={isFirebaseBusy} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 disabled:text-stone-400">
                    存人員
                  </button>
                  <button type="button" onClick={saveHistoryToFirebase} disabled={isFirebaseBusy} className="col-span-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 disabled:text-stone-400">
                    建立歷史排班
                  </button>
                </div>
              </div>
            </div>
          </section>

          {OCR_WORKFLOW_ENABLED && (
            <section className="mb-4 rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">圖片 OCR / AI 解析</h2>
              {ocrMessage && <div className="text-sm text-stone-600">{ocrMessage}</div>}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <label className="block text-sm font-semibold text-stone-800" htmlFor="flow-image">
                  流程表圖片
                </label>
                <input
                  id="flow-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFlowImageChange}
                  className="mt-2 block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />

                <div className="mt-3 aspect-[4/5] overflow-hidden rounded-lg border border-stone-300 bg-stone-50">
                  {flowImageUrl ? (
                    <img src={flowImageUrl} alt="流程表預覽" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-stone-400">尚未選擇圖片</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={runBrowserOcr}
                  disabled={isOcrRunning}
                  className="mt-3 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isOcrRunning ? `OCR ${ocrProgress}%` : "執行 OCR"}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-stone-800" htmlFor="ocr-text">
                    OCR 文字
                  </label>
                  <button type="button" onClick={buildAiPrompt} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-800">
                    產生提示
                  </button>
                </div>
                <textarea
                  id="ocr-text"
                  value={ocrText}
                  onChange={(event) => setOcrText(event.target.value)}
                  className="mt-2 h-72 w-full resize-y rounded-lg border border-stone-300 bg-stone-50 p-3 text-sm leading-6 outline-none focus:border-stone-700"
                  placeholder="OCR 文字會出現在這裡，也可以直接貼上圖片解析出的文字。"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-stone-800" htmlFor="ai-prompt">
                    AI 解析提示
                  </label>
                  <button type="button" onClick={copyAiPrompt} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-800">
                    複製
                  </button>
                </div>
                <textarea
                  id="ai-prompt"
                  readOnly
                  value={aiPrompt}
                  className="mt-2 h-72 w-full resize-y rounded-lg border border-stone-300 bg-stone-50 p-3 font-mono text-xs leading-5"
                  placeholder="按「產生提示」後，將提示交給 AI 轉成排班 JSON。"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <label className="block text-sm font-semibold text-stone-800" htmlFor="ai-json">
                  AI 回傳 JSON
                </label>
                <textarea
                  id="ai-json"
                  value={aiJson}
                  onChange={(event) => setAiJson(event.target.value)}
                  className="mt-2 h-36 w-full resize-y rounded-lg border border-stone-300 bg-white p-3 font-mono text-xs outline-none focus:border-stone-700"
                  placeholder='{"staff":[],"roleSlots":[],"schedules":[],"assignments":{}}'
                />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={importAiJson} className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white lg:w-auto">
                  匯入 AI JSON
                </button>
              </div>
            </div>
          </section>
          )}

          <div className="space-y-6">
            {schedules.map((day) => {
              const activities = orderActivities(day.activities);
              const times = getTimesForDay(day);
              const gridTemplateColumns = `120px minmax(320px, 1.2fr) repeat(${Math.max(activities.length - 1, 0)}, minmax(280px, 1fr))`;

              return (
                <section key={day.date} className="overflow-x-auto rounded-lg border border-stone-300 bg-white">
                  <div style={{ minWidth: `${120 + activities.length * 320}px` }}>
                    <div className="border-b border-stone-300 px-4 py-3 text-lg font-bold">{day.date}</div>
                    <div className="grid border-b border-stone-300 bg-stone-900 text-sm font-semibold text-white" style={{ gridTemplateColumns }}>
                      <div className="p-3">時段</div>
                      {activities.map((activity) => (
                        <div key={activity.id} className="p-3">
                          {activity.title}
                        </div>
                      ))}
                    </div>

                    {times.map((time) => (
                      <div key={`${day.date}__${time}`} className="grid border-b border-stone-200 last:border-b-0" style={{ gridTemplateColumns }}>
                        <div className="bg-stone-50 p-3 text-sm font-semibold text-stone-800">{time}</div>
                        {activities.map((activity) => (
                          <div key={`${activity.id}__${time}`} className="p-3">
                            <EventCell date={day.date} time={time} activity={activity} session={getSession(activity, time)} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
