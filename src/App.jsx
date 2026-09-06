import { useEffect, useMemo, useRef, useState } from "react";
import { findConflictingSlots } from "./scheduling.js";

const STORAGE_KEY = "activity-staff-scheduler:v1";
const FIREBASE_CONFIG_KEY = "activity-staff-scheduler:firebase-config";
const DEFAULT_FIREBASE_EVENT_ID = "current-event";
const FIREBASE_SDK_VERSION = "12.7.0";
const AUTO_SAVE_DELAY_MS = 250;
const OCR_WORKFLOW_ENABLED = false;
const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyALbqBVkXcsvntdrbOL7K4yKkKddlufmN4",
  authDomain: "dasg-staff-scheduler.firebaseapp.com",
  projectId: "dasg-staff-scheduler",
  storageBucket: "dasg-staff-scheduler.firebasestorage.app",
  messagingSenderId: "199735855413",
  appId: "1:199735855413:web:d404700c17d07a7e6da47c",
  measurementId: "G-WW7KHRFE9M",
};

const defaultStaff = ["思賢", "元妙", "旻恩", "崇萱", "詠禎", "嘉鴻"];

const defaultRoleSlots = ["主攝", "副攝", "支援", "音控", "音控支援", "剪輯", "剪輯支援"];
const continuousRoleSlots = ["剪輯", "剪輯支援"];
const continuousRoleSlotSet = new Set(continuousRoleSlots);

const defaultSchedules = [
  {
    date: "8/8（六）｜第一天",
    activities: [
      {
        id: "dharma-20260808",
        title: "法會｜學界大專法會",
        responsibleDistrict: "台北道場",
        fixed: true,
        sessions: [
          { time: "08:50–09:20", content: "複習三寶（30分）" },
          { time: "09:20–09:55", content: "獻供、請壇（35分）" },
          { time: "10:05–10:55", content: "班規（法會因由 -10分）（50分）" },
          { time: "11:10–12:00", content: "人生真諦（50分）；12:00 分組及午餐" },
          { time: "12:40–13:05", content: "暖場；請師" },
          { time: "13:05–13:45", content: "發一崇德簡介（40分）" },
          { time: "13:55–14:45", content: "道之尊貴（50分）" },
          { time: "15:00–15:50", content: "天命明師之印證（50分）" },
          { time: "15:50–16:05", content: "下午茶" },
          { time: "16:05–16:50", content: "演禮及十條大愿（45分）" },
          { time: "17:00–17:50", content: "孝道（前人慈悲影帶45分）（50分）" },
          { time: "17:50–18:10", content: "孝道課後（20分）" },
          { time: "18:10–18:30", content: "晚獻及祈福" },
        ],
      },
    ],
  },
  {
    date: "8/9（日）｜第二天",
    activities: [
      {
        id: "dharma-20260809",
        title: "法會｜學界大專法會",
        responsibleDistrict: "台北道場",
        fixed: true,
        sessions: [
          { time: "06:40–08:10", content: "早獻供（20分）；06:40 八段錦；07:10 獻供；07:30 早餐；08:10 歸班" },
          { time: "08:20–09:00", content: "聖訓簡介天命殊勝（40分）" },
          { time: "09:10–10:00", content: "持齋意義（50分）" },
          { time: "10:15–11:05", content: "內外功之修持（50分）" },
          { time: "11:20–12:00", content: "進新民班殊勝（40分）" },
          { time: "12:50–13:10", content: "暖場；請師" },
          { time: "13:10–14:00", content: "天恩師德與尊師重道（50分）" },
          { time: "14:00–14:15", content: "天恩師德課後（15分）" },
          { time: "14:30–15:10", content: "信愿行證（50分）" },
          { time: "15:10–16:00", content: "圓班立愿禮" },
        ],
      },
    ],
  },
];

const emptyAssignments = {};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEventRecord(input = {}, index = 0) {
  return {
    id: String(input.id || `event-${Date.now()}-${index + 1}`),
    name: String(input.name || `第 ${index + 1} 場活動`),
    staff: Array.isArray(input.staff) ? [...input.staff] : [...defaultStaff],
    roleSlots: Array.isArray(input.roleSlots) ? [...input.roleSlots] : [...defaultRoleSlots],
    schedules: Array.isArray(input.schedules) ? cloneData(input.schedules) : [],
    assignments: input.assignments && typeof input.assignments === "object" ? cloneData(input.assignments) : {},
  };
}

const defaultEvent = createEventRecord({
  id: "event-default",
  name: "2026/08/08-09 學界大專法會",
  staff: defaultStaff,
  roleSlots: defaultRoleSlots,
  schedules: defaultSchedules,
  assignments: emptyAssignments,
});

function createSlotKey(date, time, activityId, role) {
  return [date, time, activityId, role].join("__");
}

function createContinuousSlotKey(eventId, role) {
  return ["event", eventId, role].join("__");
}

function isContinuousSlotKey(slotKey) {
  return String(slotKey).startsWith("event__");
}

function getSlotRole(slotKey) {
  return String(slotKey).split("__").at(-1);
}

function orderActivities(activities) {
  return [...activities].sort((left, right) => {
    const leftTaipei = left.responsibleDistrict === "台北區" || String(left.title).includes("台北區");
    const rightTaipei = right.responsibleDistrict === "台北區" || String(right.title).includes("台北區");

    if (leftTaipei !== rightTaipei) return leftTaipei ? -1 : 1;
    if ((left.fixed || left.id === "dharma") !== (right.fixed || right.id === "dharma")) {
      return left.fixed || left.id === "dharma" ? -1 : 1;
    }
    return 0;
  });
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

function migrateAssignments(input) {
  if (!input || typeof input !== "object") return emptyAssignments;

  return Object.fromEntries(
    Object.entries(input).map(([slotKey, person]) => {
      const parts = slotKey.split("__");
      const role = parts[3];
      if (role === "機動") parts[3] = "支援";
      return [parts.join("__"), person];
    }),
  );
}

function inferResponsibleDistrict(activity) {
  if (activity.responsibleDistrict) return String(activity.responsibleDistrict);
  const title = String(activity.title || activity.name || "");
  if (title.includes("台北區") || activity.id === "gratitude-party") return "台北區";
  if (title.includes("板新區") || activity.id === "banxin-graduation") return "板新區";
  if (title.includes("士林區") || activity.id === "dharma" || activity.id === "scholarship") return "士林區";
  return "";
}

function normalizeActivityTitle(activity, fallbackTitle) {
  const title = String(activity.title || activity.name || fallbackTitle);
  const district = inferResponsibleDistrict(activity);

  if (!district || title.includes(district)) return title;
  return `${title}｜${district}`;
}

function normalizeImportedData(input) {
  if (!input || typeof input !== "object") {
    throw new Error("JSON 必須是物件。");
  }

  const staff = Array.isArray(input.staff) ? input.staff : defaultStaff;
  const roleSlots = defaultRoleSlots;
  const schedules = Array.isArray(input.schedules) ? input.schedules : null;
  const assignments = migrateAssignments(input.assignments);

  if (!schedules) {
    throw new Error("JSON 需要包含 schedules 陣列。");
  }

  return {
    staff,
    roleSlots,
    schedules: schedules.map((day, dayIndex) => ({
      date: String(day.date || `第 ${dayIndex + 1} 天`),
      activities: orderActivities(
        (Array.isArray(day.activities) ? day.activities : [])
          .filter((activity) => activity.id !== "support" || (Array.isArray(activity.sessions) && activity.sessions.length > 0))
          .map((activity, activityIndex) => ({
            id: String(activity.id || `activity-${activityIndex + 1}`),
            title: normalizeActivityTitle(activity, `活動 ${activityIndex + 1}`),
            responsibleDistrict: inferResponsibleDistrict(activity),
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

function normalizeEventRecord(input, eventIndex = 0) {
  if (!input || typeof input !== "object") {
    return createEventRecord({ name: `第 ${eventIndex + 1} 場活動` }, eventIndex);
  }

  if (!Array.isArray(input.schedules)) {
    return createEventRecord({
      id: input.id,
      name: input.name || `第 ${eventIndex + 1} 場活動`,
      staff: input.staff || defaultStaff,
      roleSlots: input.roleSlots || defaultRoleSlots,
      schedules: [],
      assignments: {},
    }, eventIndex);
  }

  const normalized = normalizeImportedData(input);
  return createEventRecord({
    id: input.id,
    name: input.name || `第 ${eventIndex + 1} 場活動`,
    ...normalized,
  }, eventIndex);
}

function normalizeStoredData(input) {
  if (!input || typeof input !== "object") {
    return { events: [defaultEvent], activeEventIndex: 0 };
  }

  if (Array.isArray(input.events)) {
    const events = input.events.length
      ? input.events.map((event, index) => normalizeEventRecord(event, index))
      : [defaultEvent];
    const requestedIndex = Number.isInteger(input.activeEventIndex) ? input.activeEventIndex : 0;
    const activeEventIndex = Math.min(Math.max(requestedIndex, 0), events.length - 1);
    return { events, activeEventIndex };
  }

  const event = normalizeEventRecord({
    id: input.id || "event-default",
    name: input.name || "5/16-17 活動",
    ...input,
  }, 0);
  return { events: [event], activeEventIndex: 0 };
}

function formatSyncTime(date = new Date()) {
  return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
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
  const authModule = await import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`);
  const firestoreModule = await import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
  const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(config);
  const auth = authModule.getAuth(app);
  if (!auth.currentUser) {
    await authModule.signInAnonymously(auth);
  }
  const db = firestoreModule.getFirestore(app);

  return {
    auth,
    db,
    doc: firestoreModule.doc,
    collection: firestoreModule.collection,
    getDoc: firestoreModule.getDoc,
    setDoc: firestoreModule.setDoc,
    addDoc: firestoreModule.addDoc,
    onSnapshot: firestoreModule.onSnapshot,
    serverTimestamp: firestoreModule.serverTimestamp,
  };
}

export default function ActivitySchedulerPrototype() {
  const [initialData] = useState(() => {
    try {
      return normalizeStoredData(JSON.parse(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      return { events: [defaultEvent], activeEventIndex: 0 };
    }
  });
  const initialEvent = initialData.events[initialData.activeEventIndex];
  const [staff, setStaff] = useState(initialEvent.staff);
  const [schedules, setSchedules] = useState(initialEvent.schedules);
  const [assignments, setAssignments] = useState(initialEvent.assignments);
  const [roleSlots, setRoleSlots] = useState(initialEvent.roleSlots);
  const [events, setEvents] = useState(initialData.events);
  const [activeEventIndex, setActiveEventIndex] = useState(initialData.activeEventIndex);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
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
  const [firebaseEventId, setFirebaseEventId] = useState(DEFAULT_FIREBASE_EVENT_ID);
  const [firebaseMessage, setFirebaseMessage] = useState("");
  const [isFirebaseBusy, setIsFirebaseBusy] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState("雲端同步準備中");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [imageExportMessage, setImageExportMessage] = useState("");
  const [undoCount, setUndoCount] = useState(0);
  const [undoMessage, setUndoMessage] = useState("");
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState("");
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const hasCloudLoadedRef = useRef(false);
  const isApplyingCloudDataRef = useRef(false);
  const lastCloudPayloadRef = useRef("");
  const autoSaveTimerRef = useRef(null);
  const firebaseClientRef = useRef(null);
  const localChangeSerialRef = useRef(0);
  const savedChangeSerialRef = useRef(0);
  const undoStackRef = useRef([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPayload()));
    } catch {
      setActionMessage("此瀏覽器無法儲存本機備份，請確認雲端同步狀態。");
    }
  }, [staff, schedules, assignments, roleSlots, events, activeEventIndex]);

  useEffect(() => {
    const savedConfig = window.localStorage.getItem(FIREBASE_CONFIG_KEY);
    setFirebaseConfigText(savedConfig || JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2));
  }, []);

  useEffect(() => {
    if (!firebaseConfigText.trim()) return undefined;

    let unsubscribe = null;
    let cancelled = false;

    async function subscribeToCloudEvent() {
      setSyncStatus("雲端連線中");

      try {
        const config = parseFirebaseConfig(firebaseConfigText);
        const firebase = await createFirebaseClient(config);
        firebaseClientRef.current = firebase;
        const eventId = firebaseEventId || DEFAULT_FIREBASE_EVENT_ID;
        const eventRef = firebase.doc(firebase.db, "events", eventId);

        unsubscribe = firebase.onSnapshot(
          eventRef,
          async (snapshot) => {
            if (cancelled) return;

            if (!snapshot.exists()) {
              hasCloudLoadedRef.current = true;
              setSyncStatus("建立雲端排班中");
              await savePayloadToFirebase(firebase, currentPayload(), "已建立雲端排班");
              return;
            }

            const normalized = normalizeStoredData(snapshot.data());
            const cloudPayload = JSON.stringify(normalized);

            hasCloudLoadedRef.current = true;

            if (cloudPayload === lastCloudPayloadRef.current) {
              if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
              savedChangeSerialRef.current = localChangeSerialRef.current;
              setSyncStatus("已同步雲端");
              setLastSyncedAt(formatSyncTime());
              return;
            }

            isApplyingCloudDataRef.current = true;
            if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
            lastCloudPayloadRef.current = cloudPayload;
            savedChangeSerialRef.current = localChangeSerialRef.current;
            setEvents(normalized.events);
            setActiveEventIndex(normalized.activeEventIndex);
            applyEventRecord(normalized.events[normalized.activeEventIndex], normalized.activeEventIndex);
            setSelectedStaff("");
            undoStackRef.current = [];
            setUndoCount(0);
            setUndoMessage("");
            setSyncStatus("已同步雲端");
            setLastSyncedAt(formatSyncTime());
            window.setTimeout(() => {
              isApplyingCloudDataRef.current = false;
            }, 500);
          },
          (error) => {
            if (!cancelled) setSyncStatus(`雲端同步失敗：${error.message}`);
          },
        );
      } catch (error) {
        if (!cancelled) setSyncStatus(`雲端設定錯誤：${error.message}`);
      }
    }

    subscribeToCloudEvent();

    return () => {
      cancelled = true;
      hasCloudLoadedRef.current = false;
      firebaseClientRef.current = null;
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseConfigText, firebaseEventId]);

  useEffect(() => {
    if (!firebaseConfigText.trim() || !hasCloudLoadedRef.current || isApplyingCloudDataRef.current) return undefined;
    if (localChangeSerialRef.current <= savedChangeSerialRef.current) return undefined;

    const payload = currentPayload();
    const payloadJson = JSON.stringify(normalizeStoredData(payload));
    if (payloadJson === lastCloudPayloadRef.current) {
      savedChangeSerialRef.current = localChangeSerialRef.current;
      return undefined;
    }

    setSyncStatus("有變更，準備儲存");
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);

    const savingSerial = localChangeSerialRef.current;
    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        setSyncStatus("雲端儲存中");
        const config = parseFirebaseConfig(firebaseConfigText);
        window.localStorage.setItem(FIREBASE_CONFIG_KEY, firebaseConfigText);
        const firebase = firebaseClientRef.current || (await createFirebaseClient(config));
        firebaseClientRef.current = firebase;
        await savePayloadToFirebase(firebase, payload, "已自動儲存");
        if (localChangeSerialRef.current === savingSerial) {
          savedChangeSerialRef.current = savingSerial;
        }
      } catch (error) {
        setSyncStatus(`自動儲存失敗：${error.message}`);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, [staff, schedules, assignments, roleSlots, events, activeEventIndex, firebaseConfigText, firebaseEventId]);

  useEffect(() => {
    return () => {
      if (flowImageUrl) URL.revokeObjectURL(flowImageUrl);
    };
  }, [flowImageUrl]);

  const conflicts = useMemo(() => findConflictingSlots(assignments, continuousRoleSlots), [assignments]);

  const exportJson = useMemo(
    () => JSON.stringify(currentPayload(), null, 2),
    [staff, schedules, assignments, roleSlots, events, activeEventIndex],
  );

  const assignedCount = useMemo(() => Object.keys(assignments).length, [assignments]);
  const sessionRoleSlots = useMemo(
    () => roleSlots.filter((role) => !continuousRoleSlotSet.has(role)),
    [roleSlots],
  );
  const activeEventId = events[activeEventIndex]?.id || `event-${activeEventIndex + 1}`;

  function markLocalChange() {
    localChangeSerialRef.current += 1;
  }

  function pushUndoSnapshot(message = "已記錄上一步") {
    undoStackRef.current = [
      ...undoStackRef.current,
      {
        payload: JSON.parse(JSON.stringify(currentPayload())),
        selectedStaff,
      },
    ].slice(-30);
    setUndoCount(undoStackRef.current.length);
    setUndoMessage(message);
  }

  function undoLastChange() {
    const previous = undoStackRef.current.at(-1);
    if (!previous) return;

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setUndoCount(undoStackRef.current.length);
    markLocalChange();
    const normalized = normalizeStoredData(previous.payload);
    setEvents(normalized.events);
    setActiveEventIndex(normalized.activeEventIndex);
    applyEventRecord(normalized.events[normalized.activeEventIndex], normalized.activeEventIndex);
    setSelectedStaff(previous.selectedStaff || "");
    setUndoMessage("已回到上一步。");
    setActionMessage("已回到上一步。");
  }

  function assignPerson(slotKey, person = selectedStaff) {
    if (!person) { setActionMessage("請先選擇人員。"); return; }
    if (!staff.includes(person)) return;
    if (assignments[slotKey] === person) return;
    pushUndoSnapshot("已記錄排班前狀態。");
    markLocalChange();
    setAssignments((prev) => ({ ...prev, [slotKey]: person }));
    setActionMessage(`已安排 ${person} · ${getSlotRole(slotKey)}`);
  }

  function assignPersonToNextSlot(date, time, activityId, person = selectedStaff) {
    if (!person) { setActionMessage("請先選擇人員。"); return; }
    if (!staff.includes(person)) return;
    if (!sessionRoleSlots.length) return;
    const openRole = sessionRoleSlots.find((role) => !assignments[createSlotKey(date, time, activityId, role)]);
    if (!openRole) { setActionMessage("這堂課已滿員，請點選要更換的職位。"); return; }
    assignPerson(createSlotKey(date, time, activityId, openRole), person);
  }

  function clearSlot(slotKey) {
    if (!assignments[slotKey]) return;
    pushUndoSnapshot("已記錄清除前狀態。");
    markLocalChange();
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }

  function addStaffMember(event) {
    event.preventDefault();
    const name = newStaffName.trim();
    if (!name) return;

    if (staff.includes(name)) {
      setSelectedStaff(name);
      setNewStaffName("");
      return;
    }

    pushUndoSnapshot("已記錄新增前狀態。");
    markLocalChange();
    setStaff((prev) => [...prev, name]);
    setSelectedStaff(name);
    setNewStaffName("");
  }

  function removeStaffMember(person) {
    if (!staff.includes(person)) return;
    pushUndoSnapshot(`已記錄刪除 ${person} 前狀態。`);
    markLocalChange();
    setStaff((prev) => prev.filter((name) => name !== person));
    setAssignments((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, assignedPerson]) => assignedPerson !== person)),
    );
    if (selectedStaff === person) setSelectedStaff("");
  }

  function handleStaffDragStart(event, person) {
    event.dataTransfer.setData("text/plain", person);
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleDropToSession(event, date, time, activityId) {
    event.preventDefault();
    const person = event.dataTransfer.getData("text/plain");
    assignPersonToNextSlot(date, time, activityId, person);
  }

  function handleDropToSlot(event, slotKey) {
    event.preventDefault();
    event.stopPropagation();
    const person = event.dataTransfer.getData("text/plain");
    assignPerson(slotKey, person);
  }

  function isConflict(slotKey, person) {
    return Boolean(person) && conflicts.has(slotKey);
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const value = String(text || "");
    const lines = [];
    let line = "";

    Array.from(value).forEach((char) => {
      const candidate = `${line}${char}`;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = char.trimStart();
      } else {
        line = candidate;
      }
    });

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function renderScheduleImage(daysToRender, dayNumber) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setImageExportMessage("此瀏覽器無法建立圖片，請改用桌機或更新瀏覽器。");
      return null;
    }
    const width = 1440;
    const margin = 48;
    const colGap = 18;
    const colWidths = [140, 680, 470];
    const lineHeight = 26;
    const rows = [];
    const continuousItems = continuousRoleSlots
      .filter((role) => roleSlots.includes(role))
      .map((role) => {
        const person = assignments[createContinuousSlotKey(activeEventId, role)];
        return { role, person, text: person ? `${role}　${person}` : `${role}　` };
      });
    const continuousAssignedCount = continuousItems.filter((item) => item.person).length;
    const dayAssignedCount = daysToRender.reduce((count, day) => {
      const dayPrefix = `${day.date}__`;
      return count + Object.keys(assignments).filter((key) => key.startsWith(dayPrefix) && assignments[key]).length;
    }, continuousAssignedCount);

    daysToRender.forEach((day, dayIndex) => {
      rows.push({ type: "day", date: day.date, topGap: dayIndex > 0 ? 20 : 0 });
      if (continuousItems.length) {
        rows.push({
          type: "continuous",
          text: continuousItems.map((item) => item.text).join("　｜　"),
          selected: Boolean(selectedStaff && continuousItems.some((item) => item.person === selectedStaff)),
          hasPeople: continuousItems.some((item) => item.person),
        });
      }
      const activities = orderActivities(day.activities);
      getTimesForDay(day).forEach((time) => {
        activities.forEach((activity) => {
          const session = getSession(activity, time);
          if (!session) return;

          const people = sessionRoleSlots
            .map((role) => {
              const person = assignments[createSlotKey(day.date, time, activity.id, role)];
              return person ? { role, person, text: `${role}　${person}` } : null;
            })
            .filter(Boolean);

          rows.push({
            type: "slot",
            time,
            content: session.content || activity.title,
            people,
            selected: Boolean(selectedStaff && people.some((item) => item.person === selectedStaff)),
          });
        });
      });
    });

    ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    const measuredRows = rows.map((row) => {
      if (row.type === "day") return { ...row, height: 64 + row.topGap };
      if (row.type === "continuous") {
        const contentLines = wrapCanvasText(ctx, row.text, colWidths[1] + colGap + colWidths[2]);
        return { ...row, contentLines, height: Math.max(58, contentLines.length * lineHeight + 28) };
      }

      const contentLines = wrapCanvasText(ctx, row.content, colWidths[1]);
      const peopleLines = row.people.flatMap((item) => wrapCanvasText(ctx, item.text, colWidths[2]));
      const visualLineCount = Math.max(contentLines.length, peopleLines.length || 1);
      const height = Math.max(70, visualLineCount * lineHeight + 30);
      return { ...row, contentLines, peopleLines, height };
    });

    const height = 122 + measuredRows.reduce((sum, row) => sum + row.height, 0) + 50;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(214, 211, 209, 0.28)";
    for (let x = 0; x < width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#1c1917";
    ctx.font = "700 32px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    const dateRange = daysToRender
      .map((day) => String(day.date).split("｜")[0].trim())
      .filter(Boolean);
    const titleDate = dateRange.length > 1 ? `${dateRange[0]}-${dateRange[dateRange.length - 1]}` : dateRange[0] || "";
    ctx.fillText(`活動人力排班｜第 ${dayNumber} 天${titleDate ? `｜${titleDate}` : ""}`, margin, 52);
    ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#78716c";
    ctx.fillText(`已安排 ${dayAssignedCount} 格｜輸出 ${formatSyncTime()}`, margin, 82);
    if (selectedStaff) {
      ctx.fillStyle = "#d98b75";
      ctx.fillText(`目前標注：${selectedStaff}`, margin + 520, 82);
    }

    const colX = [
      margin,
      margin + colWidths[0] + colGap,
      margin + colWidths[0] + colWidths[1] + colGap * 2,
    ];
    let y = 122;

    measuredRows.forEach((row) => {
      if (row.type === "day") {
        y += row.topGap;
        const dayHeight = 64;
        ctx.fillStyle = "#fffaf2";
        ctx.fillRect(margin - 14, y, width - margin * 2 + 28, dayHeight);
        ctx.strokeStyle = "#eadfd5";
        ctx.strokeRect(margin - 14, y, width - margin * 2 + 28, dayHeight);
        ctx.fillStyle = "#1c1917";
        ctx.font = "700 24px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
        ctx.fillText(row.date, margin, y + 40);
        y += dayHeight;
        return;
      }

      if (row.type === "continuous") {
        ctx.fillStyle = row.selected ? "#fff1e6" : row.hasPeople ? "#fffaf2" : "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(margin - 14, y, width - margin * 2 + 28, row.height);
        ctx.strokeStyle = row.selected ? "#d98b75" : "#eadfd5";
        ctx.strokeRect(margin - 14, y, width - margin * 2 + 28, row.height);
        if (row.hasPeople) {
          ctx.fillStyle = row.selected ? "#d98b75" : "#e4cbb9";
          ctx.fillRect(margin - 14, y, 5, row.height);
        }

        ctx.fillStyle = "#44403c";
        ctx.font = "700 19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
        ctx.fillText("整場工作", colX[0], y + 34);
        ctx.fillStyle = row.selected ? "#b35f4d" : "#57534e";
        ctx.font = row.hasPeople ? "700 19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif" : "19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
        row.contentLines.forEach((line, index) => {
          ctx.fillText(line, colX[1], y + 34 + index * lineHeight);
        });

        y += row.height;
        return;
      }

      const hasPeople = row.people.length > 0;
      ctx.fillStyle = row.selected ? "#fff1e6" : hasPeople ? "#fffaf2" : "rgba(255, 255, 255, 0.92)";
      ctx.fillRect(margin - 14, y, width - margin * 2 + 28, row.height);
      ctx.strokeStyle = row.selected ? "#d98b75" : hasPeople ? "#eadfd5" : "#f3ece4";
      ctx.strokeRect(margin - 14, y, width - margin * 2 + 28, row.height);
      if (hasPeople) {
        ctx.fillStyle = row.selected ? "#d98b75" : "#e4cbb9";
        ctx.fillRect(margin - 14, y, 5, row.height);
      }

      ctx.fillStyle = "#44403c";
      ctx.font = "700 19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
      ctx.fillText(row.time, colX[0], y + 31);

      ctx.font = "19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
      ctx.fillStyle = "#1c1917";
      row.contentLines.forEach((line, index) => {
        ctx.fillText(line, colX[1], y + 30 + index * lineHeight);
      });

      ctx.fillStyle = row.selected ? "#b35f4d" : "#57534e";
      ctx.font = hasPeople ? "700 19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif" : "19px -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
      row.peopleLines.forEach((line, index) => {
        ctx.fillText(line, colX[2], y + 30 + index * lineHeight);
      });

      y += row.height;
    });

    return canvas;
  }

  function sanitizeFileNamePart(value) {
    return String(value || "")
      .replace(/[^\dA-Za-z\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function downloadCanvas(canvas, fileName) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadScheduleImage(dayIndex = null) {
    if (!schedules.length) {
      setImageExportMessage("目前沒有可輸出的活動流程。");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    let exportedCount = 0;
    const daysToExport = dayIndex === null
      ? schedules.map((day, index) => ({ day, index }))
      : schedules[dayIndex]
        ? [{ day: schedules[dayIndex], index: dayIndex }]
        : [];

    if (!daysToExport.length) {
      setImageExportMessage(`目前沒有第 ${dayIndex + 1} 天可輸出。`);
      return;
    }

    daysToExport.forEach(({ day, index }) => {
      const canvas = renderScheduleImage([day], index + 1);
      if (!canvas) return;

      const dateLabel = sanitizeFileNamePart(String(day.date).split("｜")[0]);
      const fileName = `activity-staff-scheduler-day-${index + 1}${dateLabel ? `-${dateLabel}` : ""}-${today}.png`;
      downloadCanvas(canvas, fileName);
      exportedCount += 1;
    });

    setImageExportMessage(`已輸出 ${exportedCount} 張 PNG，可傳到 LINE 查看。`);
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonInput);
      pushUndoSnapshot("已記錄匯入前狀態。");
      markLocalChange();
      if (Array.isArray(parsed.events)) {
        const normalized = normalizeStoredData(parsed);
        setEvents(normalized.events);
        setActiveEventIndex(normalized.activeEventIndex);
        applyEventRecord(normalized.events[normalized.activeEventIndex], normalized.activeEventIndex);
        setSelectedStaff("");
        setImportMessage("多場次 JSON 匯入完成，已同步寫入 localStorage。");
      } else {
        const normalized = normalizeImportedData(parsed);
        setStaff(normalized.staff);
        setSchedules(normalized.schedules);
        setAssignments(normalized.assignments);
        setRoleSlots(normalized.roleSlots);
        setSelectedStaff("");
        setImportMessage("JSON 匯入完成，已同步寫入 localStorage。");
      }
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
      pushUndoSnapshot("已記錄 AI JSON 匯入前狀態。");
      markLocalChange();
      if (Array.isArray(parsed.events)) {
        const normalized = normalizeStoredData(parsed);
        setEvents(normalized.events);
        setActiveEventIndex(normalized.activeEventIndex);
        applyEventRecord(normalized.events[normalized.activeEventIndex], normalized.activeEventIndex);
        setJsonInput(JSON.stringify(normalized, null, 2));
        setSelectedStaff("");
        setImportMessage("AI 多場次 JSON 已匯入，並同步寫入 localStorage。");
      } else {
        const normalized = normalizeImportedData(parsed);
        setStaff(normalized.staff);
        setSchedules(normalized.schedules);
        setAssignments(normalized.assignments);
        setRoleSlots(normalized.roleSlots);
        setJsonInput(JSON.stringify(normalized, null, 2));
        setSelectedStaff("");
        setImportMessage("AI 解析 JSON 已匯入，並同步寫入 localStorage。");
      }
      setOcrMessage("AI JSON 匯入完成。");
    } catch (error) {
      setOcrMessage(`AI JSON 匯入失敗：${error.message}`);
    }
  }

  function parseFirebaseConfig(text = firebaseConfigText) {
    const config = JSON.parse(text);
    if (!config || typeof config !== "object") {
      throw new Error("Firebase config 必須是 JSON 物件。");
    }

    if (!config.apiKey || !config.projectId || !config.appId) {
      throw new Error("Firebase config 至少需要 apiKey、projectId、appId。");
    }

    return config;
  }

  function applyEventRecord(event, eventIndex = activeEventIndex) {
    const normalized = createEventRecord(event, eventIndex);
    setStaff(normalized.staff);
    setSchedules(normalized.schedules);
    setAssignments(normalized.assignments);
    setRoleSlots(normalized.roleSlots);
  }

  function currentEventRecord() {
    const base = events[activeEventIndex] || {};
    return createEventRecord({
      ...base,
      name: base.name || `第 ${activeEventIndex + 1} 場活動`,
      staff,
      schedules,
      assignments,
      roleSlots,
    }, activeEventIndex);
  }

  function eventsWithCurrentEvent() {
    const nextEvents = events.length ? [...events] : [currentEventRecord()];
    nextEvents[activeEventIndex] = currentEventRecord();
    return nextEvents;
  }

  function currentPayload() {
    return {
      staff,
      schedules,
      assignments,
      roleSlots,
      events: eventsWithCurrentEvent(),
      activeEventIndex,
    };
  }

  async function savePayloadToFirebase(firebase, payload, successMessage) {
    const eventRef = firebase.doc(firebase.db, "events", firebaseEventId || DEFAULT_FIREBASE_EVENT_ID);
    await firebase.setDoc(eventRef, {
      ...payload,
      updatedAt: firebase.serverTimestamp(),
    });
    lastCloudPayloadRef.current = JSON.stringify(normalizeStoredData(payload));
    setSyncStatus(successMessage);
    setLastSyncedAt(formatSyncTime());
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
    withFirebase(async (firebase) => {
      await savePayloadToFirebase(firebase, currentPayload(), "已手動儲存");
      setFirebaseMessage(`已儲存活動到 Firebase：events/${firebaseEventId || DEFAULT_FIREBASE_EVENT_ID}`);
    });
  }

  function loadEventFromFirebase() {
    withFirebase(async ({ db, doc, getDoc }) => {
      const eventRef = doc(db, "events", firebaseEventId || DEFAULT_FIREBASE_EVENT_ID);
      const snapshot = await getDoc(eventRef);
      if (!snapshot.exists()) {
        setFirebaseMessage(`找不到 Firebase 活動：events/${firebaseEventId || DEFAULT_FIREBASE_EVENT_ID}`);
        return;
      }

      const normalized = normalizeStoredData(snapshot.data());
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      lastCloudPayloadRef.current = JSON.stringify(normalized);
      savedChangeSerialRef.current = localChangeSerialRef.current;
      undoStackRef.current = [];
      setUndoCount(0);
      setUndoMessage("");
      setEvents(normalized.events);
      setActiveEventIndex(normalized.activeEventIndex);
      applyEventRecord(normalized.events[normalized.activeEventIndex], normalized.activeEventIndex);
      setSelectedStaff("");
      setSyncStatus("已同步雲端");
      setLastSyncedAt(formatSyncTime());
      setFirebaseMessage(`已載入 Firebase 活動：events/${firebaseEventId || DEFAULT_FIREBASE_EVENT_ID}`);
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
    pushUndoSnapshot("已記錄還原前狀態。");
    markLocalChange();
    setStaff(defaultStaff);
    setSchedules(defaultSchedules);
    setAssignments(emptyAssignments);
    setRoleSlots(defaultRoleSlots);
    setSelectedStaff("");
    setImportMessage("已還原預設資料。");
  }

  function switchEvent(targetIndex) {
    const mergedEvents = eventsWithCurrentEvent();
    if (targetIndex < 0 || targetIndex >= mergedEvents.length || targetIndex === activeEventIndex) return;

    markLocalChange();
    setEvents(mergedEvents);
    setActiveEventIndex(targetIndex);
    applyEventRecord(mergedEvents[targetIndex], targetIndex);
    setSelectedStaff("");
    setScheduleQuery("");
    setScheduleFilter("all");
    setUndoMessage("");
  }

  function addNextEvent() {
    const mergedEvents = eventsWithCurrentEvent();
    const sourceEvent = mergedEvents[activeEventIndex] || currentEventRecord();
    const nextEvent = createEventRecord({
      id: `event-${Date.now()}`,
      name: `第 ${mergedEvents.length + 1} 場活動`,
      staff: sourceEvent.staff,
      roleSlots: sourceEvent.roleSlots,
      schedules: [],
      assignments: {},
    }, mergedEvents.length);

    markLocalChange();
    setEvents([...mergedEvents, nextEvent]);
    setActiveEventIndex(mergedEvents.length);
    applyEventRecord(nextEvent, mergedEvents.length);
    setSelectedStaff("");
    setImportMessage("已新增空白場次，請上傳活動流程表。");
    setImageExportMessage("");
  }

  function renderStaffPool() {
    return (
      <div>
        <form onSubmit={addStaffMember} className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:mb-3">
          <input
            value={newStaffName}
            onChange={(event) => setNewStaffName(event.target.value)}
            className="min-w-0 rounded-md border border-[#eadfd5] bg-[#fffdf8] px-2.5 py-1.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#d98b75] lg:px-3 lg:py-2"
            placeholder="新增人員"
            aria-label="新增人員姓名"
          />
          <button type="submit" className="rounded-md bg-[#2f2a25] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#453d35] lg:py-2">
            新增
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
          {staff.map((person) => (
            <div
              key={person}
              draggable
              onDragStart={(event) => handleStaffDragStart(event, person)}
              className={`grid flex-none grid-cols-[minmax(0,1fr)_24px] items-center rounded-md border transition lg:grid-cols-[minmax(0,1fr)_28px] ${
                selectedStaff === person
                  ? "border-[#2f2a25] bg-[#2f2a25] text-white"
                  : "border-[#eadfd5] bg-[#fffdf8] text-stone-800 hover:border-[#e4cbb9] hover:bg-[#fff8ee]"
              }`}
            >
              <button type="button" aria-pressed={selectedStaff === person} onClick={() => setSelectedStaff(selectedStaff === person ? "" : person)} className="min-w-[4.75rem] px-3 py-2 text-left text-sm font-semibold lg:min-w-0 lg:py-2.5">
                {person}
              </button>
              <button
                type="button"
                onClick={() => removeStaffMember(person)}
                className={`mr-1 h-5 w-5 rounded text-sm font-semibold lg:h-6 lg:w-6 ${
                  selectedStaff === person ? "text-stone-300 hover:bg-[#453d35] hover:text-white" : "text-stone-400 hover:bg-[#fff2e7] hover:text-red-600"
                }`}
                aria-label={`移除 ${person}`}
                title="從候選名單移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderContinuousAssignments({ compact = false }) {
    const visibleRoles = continuousRoleSlots.filter((role) => roleSlots.includes(role));
    if (!visibleRoles.length) return null;

    return (
      <div className={`rounded-md border border-[#eadfd5] bg-[#fffdf8] px-3 py-2 ${compact ? "min-w-[430px]" : ""}`}>
        <div className={compact ? "flex items-center gap-3 whitespace-nowrap" : ""}>
          <div className={compact ? "shrink-0 text-xs font-semibold text-stone-500" : "mb-2 text-xs font-semibold text-stone-500"}>整場工作</div>
          <div className={compact ? "flex min-w-0 items-center gap-2" : "grid grid-cols-2 gap-2"}>
          {visibleRoles.map((role) => {
            const slotKey = createContinuousSlotKey(activeEventId, role);
            const person = assignments[slotKey];
            const isSelectedPerson = Boolean(selectedStaff && person === selectedStaff);

            return (
              <div
                key={slotKey}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDropToSlot(event, slotKey)}
                className={`relative rounded-md border text-xs transition ${compact ? "min-h-[46px] min-w-[145px]" : "min-h-[50px]"} ${
                  isSelectedPerson
                    ? "border-[#d98b75] bg-[#fff1e6] shadow-[inset_0_0_0_1px_#d98b75]"
                    : person
                      ? "border-[#e4cbb9] bg-[#fff8ee]"
                      : "border-dashed border-[#eadfd5] bg-white hover:border-[#e4cbb9] hover:bg-[#fff8ee]"
                }`}
              >
                <button type="button" onClick={() => assignPerson(slotKey)} className={`h-full w-full p-2 text-left ${compact ? "min-h-[46px]" : "min-h-[50px]"}`}>
                  <div className="font-semibold text-stone-700">{role}</div>
                  <div className={`mt-1 pr-7 text-sm ${compact ? "whitespace-nowrap" : ""} ${person ? "font-semibold text-stone-950" : "text-stone-400"}`}>
                    {person || "未安排"}
                  </div>
                </button>
                {person && (
                  <button
                    type="button"
                    onClick={() => clearSlot(slotKey)}
                    className="absolute right-1.5 top-1.5 h-5 w-5 rounded border border-[#eadfd5] bg-white text-xs font-semibold leading-4 text-stone-500 transition hover:border-red-300 hover:text-red-600"
                    aria-label={`清除 ${role} 的 ${person}`}
                    title="清除這格人員"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  }

  function renderAssignmentSlots({ date, time, activityId }) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
        {sessionRoleSlots.map((role) => {
          const slotKey = createSlotKey(date, time, activityId, role);
          const person = assignments[slotKey];
          const conflict = isConflict(slotKey, person);
          const isSelectedPerson = Boolean(selectedStaff && person === selectedStaff);

          return (
            <div
              key={slotKey}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropToSlot(event, slotKey)}
              className={`relative min-h-[58px] rounded-md border text-xs transition ${
                isSelectedPerson
                  ? conflict
                    ? "border-red-400 bg-red-50 shadow-[inset_0_0_0_1px_#d98b75]"
                    : "border-[#d98b75] bg-[#fff1e6] shadow-[inset_0_0_0_1px_#d98b75]"
                  : conflict
                    ? "border-red-400 bg-red-50"
                  : person
                    ? "border-[#e4cbb9] bg-[#fff8ee]"
                    : "border-dashed border-[#eadfd5] bg-[#fffdf8] hover:border-[#e4cbb9] hover:bg-[#fff8ee]"
              }`}
            >
              <button type="button" onClick={() => assignPerson(slotKey)} className="h-full min-h-[58px] w-full p-2 text-left">
                <div className="font-semibold text-stone-700">{role}</div>
                <div className={`mt-1 pr-7 text-sm ${person ? "font-semibold text-stone-950" : "text-stone-400"}`}>
                  {person || "未安排"}
                </div>
                {conflict && <div className="mt-1 font-semibold text-red-600">同時段衝突</div>}
              </button>
              {person && (
                <button
                  type="button"
                  onClick={() => clearSlot(slotKey)}
                  className="absolute right-1.5 top-1.5 h-5 w-5 rounded border border-[#eadfd5] bg-white text-xs font-semibold leading-4 text-stone-500 transition hover:border-red-300 hover:text-red-600"
                  aria-label={`清除 ${role} 的 ${person}`}
                  title="清除這格人員"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderEventCell({ date, time, activity, session }) {
    if (!session) {
      return <div className="min-h-[112px] rounded-md border border-[#f0e8de] bg-[#fffdf8] p-3 text-sm text-stone-400">—</div>;
    }

    return (
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDropToSession(event, date, time, activity.id)}
        className="min-h-[112px] rounded-md border border-[#eadfd5] bg-white p-3 transition hover:border-[#e4cbb9] hover:bg-[#fffdf8]"
      >
        <button type="button" onClick={() => assignPersonToNextSlot(date, time, activity.id)} className="w-full text-left text-sm font-semibold leading-relaxed text-stone-950">
          {session.content}
        </button>
        {renderAssignmentSlots({ date, time, activityId: activity.id })}
      </div>
    );
  }

  function renderEmptyScheduleState() {
    return (
      <section className="rounded-md border border-[#eadfd5] bg-white p-6">
        <div className="mx-auto max-w-xl text-center">
          <h3 className="text-lg font-bold text-stone-950">尚未建立活動流程</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            上傳活動流程表圖片後，下一步會接 AI 解析，產生可套用的完整班表。
          </p>

          <label
            htmlFor="empty-flow-image"
            className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-md bg-[#2f2a25] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#453d35]"
          >
            上傳活動流程表
          </label>
          <input id="empty-flow-image" type="file" accept="image/*" onChange={handleFlowImageChange} className="sr-only" />

          {flowImageUrl && (
            <div className="mt-5 rounded-md border border-[#eadfd5] bg-[#fffdf8] p-3 text-left">
              <div className="mb-2 text-sm font-semibold text-stone-800">流程表預覽</div>
              <div className="aspect-[4/3] overflow-hidden rounded-md border border-[#f0e8de] bg-white">
                <img src={flowImageUrl} alt="流程表預覽" className="h-full w-full object-contain" />
              </div>
              <div className="mt-2 text-xs leading-5 text-stone-500">
                已先保留圖片上傳入口；OpenAI 解析會接在這個步驟之後，解析完成再套用成完整班表。
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderAdminTools() {
    if (!isAdminOpen) return null;

    return (
      <section className="mb-4 rounded-md border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h2 className="text-base font-semibold">管理工具</h2>
          <button
            type="button"
            onClick={() => setIsAdminOpen(false)}
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
          >
            收合
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
          <section className="rounded-md border border-stone-100 p-4">
            <h3 className="text-sm font-semibold">資料匯入</h3>
            <textarea
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              className="mt-3 h-36 w-full resize-y rounded-md border border-stone-200 bg-stone-50 p-3 font-mono text-xs outline-none focus:border-stone-500"
              placeholder='{"staff":[],"roleSlots":[],"schedules":[],"assignments":{}}'
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={importJson} className="rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
                匯入 JSON
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
              >
                還原預設
              </button>
            </div>
            {importMessage && <div className="mt-2 text-xs leading-5 text-stone-600">{importMessage}</div>}
          </section>

          <section className="rounded-md border border-stone-100 p-4">
            <h3 className="text-sm font-semibold">資料匯出</h3>
            <textarea readOnly value={exportJson} className="mt-3 h-36 w-full resize-y rounded-md border border-stone-200 bg-stone-50 p-3 font-mono text-xs" />
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
              <div className="rounded-md border border-stone-100 bg-stone-50 p-2">人員：{staff.length}</div>
              <div className="rounded-md border border-stone-100 bg-stone-50 p-2">職務：{roleSlots.length}</div>
              <div className="rounded-md border border-stone-100 bg-stone-50 p-2">日期：{schedules.length}</div>
              <div className="rounded-md border border-stone-100 bg-stone-50 p-2">已排：{assignedCount}</div>
            </div>
          </section>

          <section className="rounded-md border border-stone-100 p-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Firebase 儲存</h3>
              {firebaseMessage && <div className="text-sm text-stone-600">{firebaseMessage}</div>}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <label className="block text-sm font-semibold text-stone-800" htmlFor="firebase-config">
                  Firebase config
                </label>
                <textarea
                  id="firebase-config"
                  value={firebaseConfigText}
                  onChange={(event) => setFirebaseConfigText(event.target.value)}
                  className="mt-2 h-32 w-full resize-y rounded-md border border-stone-200 bg-stone-50 p-3 font-mono text-xs outline-none focus:border-stone-500"
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
                  className="mt-2 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={loadEventFromFirebase} disabled={isFirebaseBusy} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 disabled:text-stone-400">
                    載入
                  </button>
                  <button type="button" onClick={saveEventToFirebase} disabled={isFirebaseBusy} className="rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:bg-stone-400">
                    儲存
                  </button>
                  <button type="button" onClick={saveTemplateToFirebase} disabled={isFirebaseBusy} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 disabled:text-stone-400">
                    存模板
                  </button>
                  <button type="button" onClick={saveStaffListToFirebase} disabled={isFirebaseBusy} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 disabled:text-stone-400">
                    存人員
                  </button>
                  <button type="button" onClick={saveHistoryToFirebase} disabled={isFirebaseBusy} className="col-span-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 disabled:text-stone-400">
                    建立歷史排班
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <div className="jp-page min-h-screen text-stone-950">
      <div className="min-h-screen lg:pl-64">
        <aside className={`jp-sidebar ${mobileToolsOpen ? "mobile-tools-open" : ""} sticky top-0 z-30 max-h-[46vh] overflow-y-auto border-b border-[#eadfd5] p-3 shadow-sm shadow-stone-200/60 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r lg:p-5 lg:shadow-none`}>
          <h1 className="flex items-center gap-2 text-lg font-bold lg:text-2xl">
            <span className="jp-mark text-base" aria-hidden="true">✿</span>
            活動人力排班
            <button type="button" aria-expanded={mobileToolsOpen} onClick={() => setMobileToolsOpen((open) => !open)} className="ml-auto text-xs font-normal lg:hidden">{mobileToolsOpen ? "收合工具" : "更多工具"}</button>
          </h1>

          <div className="mobile-secondary mt-3 rounded-md border border-[#eadfd5] bg-[#fffdf8] p-2 lg:mt-4 lg:p-3">
            <div className="text-xs text-stone-500">目前場次</div>
            <div className="mt-1 truncate text-sm font-semibold text-stone-900">{events[activeEventIndex]?.name || `第 ${activeEventIndex + 1} 場活動`}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchEvent(activeEventIndex - 1)}
                disabled={activeEventIndex === 0}
                className="rounded-md border border-[#eadfd5] bg-white px-2 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-[#e4cbb9] hover:bg-[#fff8ee] disabled:text-stone-300 disabled:hover:border-[#eadfd5] disabled:hover:bg-white"
              >
                上一場
              </button>
              <button
                type="button"
                onClick={() => switchEvent(activeEventIndex + 1)}
                disabled={activeEventIndex >= events.length - 1}
                className="rounded-md border border-[#eadfd5] bg-white px-2 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-[#e4cbb9] hover:bg-[#fff8ee] disabled:text-stone-300 disabled:hover:border-[#eadfd5] disabled:hover:bg-white"
              >
                下一場
              </button>
            </div>
            <button
              type="button"
              onClick={addNextEvent}
              className="mt-2 w-full rounded-md bg-[#2f2a25] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#453d35]"
            >
              新增下一場
            </button>
          </div>

          <div className="mt-3 lg:mt-5">
            <div className="mb-2 text-sm font-semibold">人員</div>
            {renderStaffPool()}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-4 lg:block">
            <div className="jp-panel rounded-md border border-[#eadfd5] p-2 text-xs lg:p-3 lg:text-sm">
              <div className="text-stone-500">目前選擇</div>
              <div className="mt-1 truncate text-sm font-semibold lg:text-lg">{selectedStaff || "尚未選擇"}</div>
            </div>

            <div className="jp-panel rounded-md border border-[#eadfd5] p-2 text-xs lg:mt-3 lg:p-3 lg:text-sm">
              <div className="text-stone-500">同步狀態</div>
              <div className="mt-1 truncate font-semibold text-stone-900">{syncStatus}</div>
              {lastSyncedAt && <div className="mt-1 truncate text-xs text-stone-500">最後同步 {lastSyncedAt}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={undoLastChange}
            disabled={undoCount === 0}
            className="mt-3 w-full rounded-md border border-[#eadfd5] bg-[#fffdf8] px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-[#e4cbb9] hover:bg-[#fff8ee] disabled:text-stone-300 disabled:hover:border-[#eadfd5] disabled:hover:bg-[#fffdf8] lg:py-2"
          >
            回到上一步{undoCount > 0 ? `（${undoCount}）` : ""}
          </button>
          {undoMessage && <div className="mt-1 text-xs leading-5 text-stone-500">{undoMessage}</div>}

          <div className="mobile-secondary">
          <button
            type="button"
            onClick={() => setIsAdminOpen((open) => !open)}
            className="mt-3 w-full rounded-md border border-[#eadfd5] bg-[#fffdf8] px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-[#e4cbb9] hover:bg-[#fff8ee] lg:mt-5 lg:py-2"
          >
            {isAdminOpen ? "收合管理工具" : "管理工具"}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => downloadScheduleImage(0)}
              disabled={!schedules[0]}
              className="rounded-md border border-[#e4cbb9] bg-[#fffdf8] px-3 py-1.5 text-sm font-semibold text-stone-800 transition hover:bg-[#fff8ee] disabled:border-[#eadfd5] disabled:text-stone-300 disabled:hover:bg-[#fffdf8] lg:py-2"
            >
              第一天
            </button>
            <button
              type="button"
              onClick={() => downloadScheduleImage(1)}
              disabled={!schedules[1]}
              className="rounded-md border border-[#e4cbb9] bg-[#fffdf8] px-3 py-1.5 text-sm font-semibold text-stone-800 transition hover:bg-[#fff8ee] disabled:border-[#eadfd5] disabled:text-stone-300 disabled:hover:bg-[#fffdf8] lg:py-2"
            >
              第二天
            </button>
          </div>
          {imageExportMessage && <div className="mt-1 text-xs leading-5 text-stone-500">{imageExportMessage}</div>}
          </div>
        </aside>

        <main className="mx-auto min-w-0 max-w-[1240px] px-4 py-4 sm:px-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{events[activeEventIndex]?.name || "排班表"}</h2>
              <div className="mt-1 text-sm text-stone-600">
                第 {activeEventIndex + 1} / {events.length} 場，{schedules.length} 天活動，已安排 {assignedCount} 格
              </div>
            </div>
            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              <div className="rounded-md border border-[#eadfd5] bg-[#fffdf8] px-3 py-2 text-sm">
                同步：<span className="font-semibold">{syncStatus}</span>
              </div>
              <div className="rounded-md border border-[#eadfd5] bg-[#fffdf8] px-3 py-2 text-sm">
                目前選擇：<span className="font-semibold">{selectedStaff || "尚未選擇"}</span>
              </div>
            </div>
          </div>

          {renderAdminTools()}

          <div className="schedule-toolbar">
            <input type="search" aria-label="搜尋課程或活動" placeholder="搜尋課程或活動" value={scheduleQuery} onChange={(event) => setScheduleQuery(event.target.value)} />
            <select aria-label="排班篩選" value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}>
              <option value="all">全部課程</option>
              <option value="selected" disabled={!selectedStaff}>所選人員{selectedStaff ? `：${selectedStaff}` : ""}</option>
              <option value="conflict">有衝突的課程（{conflicts.size} 格）</option>
            </select>
            <nav aria-label="日期跳轉" className="flex flex-wrap gap-3">
              {schedules.map((day, index) => <a key={day.date} href={`#schedule-day-${index}`} className="text-sm underline underline-offset-4">{day.date}</a>)}
            </nav>
          </div>
          {actionMessage && <p role="status" className="mb-3 text-sm text-stone-600">{actionMessage}</p>}

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

          {schedules.length === 0 ? (
            renderEmptyScheduleState()
          ) : (
            <div className="space-y-6">
              {schedules.map((day, dayIndex) => {
                const activities = orderActivities(day.activities);
                const times = getTimesForDay(day).filter((time) => activities.some((activity) => {
                  const session = getSession(activity, time);
                  if (!session) return false;
                  if (!`${activity.title} ${session.content} ${time}`.toLowerCase().includes(scheduleQuery.trim().toLowerCase())) return false;
                  const keys = sessionRoleSlots.map((role) => createSlotKey(day.date, time, activity.id, role));
                  if (scheduleFilter === "selected" && selectedStaff) return keys.some((key) => assignments[key] === selectedStaff);
                  if (scheduleFilter === "conflict") return keys.some((key) => conflicts.has(key));
                  return true;
                }));
                const gridTemplateColumns = activities.length === 1 ? "minmax(0, 1fr)" : `100px repeat(${activities.length}, minmax(300px, 1fr))`;

                return (
                  <section id={`schedule-day-${dayIndex}`} key={day.date} className={`schedule-day overflow-x-auto border border-[#eadfd5] bg-white ${activities.length === 1 ? "single-activity" : ""}`}>
                    <div style={{ minWidth: activities.length === 1 ? 0 : `${100 + activities.length * 320}px` }}>
                      <div className="jp-day-title border-b border-[#f0e8de] px-4 py-3 text-center text-lg font-bold">{day.date}</div>
                      <div className="grid border-b border-[#eadfd5] bg-[#fff8ee] text-sm font-semibold text-stone-700" style={{ gridTemplateColumns }}>
                        {activities.length !== 1 && <div className="border-r border-[#eadfd5] p-3">時段</div>}
                        {activities.map((activity, activityIndex) => (
                          <div key={activity.id} className="border-r border-[#eadfd5] p-3 last:border-r-0">
                            <div className="activity-heading flex flex-wrap items-center gap-4">
                              <span className="min-w-0 font-semibold">{activity.title}</span>
                              {activityIndex === 0 && <div className="continuous-work ml-auto">{renderContinuousAssignments({ compact: true })}</div>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {times.length === 0 && <p className="p-6 text-sm text-stone-500">這一天沒有符合條件的課程。</p>}
                      {times.map((time) => (
                        <div key={`${day.date}__${time}`} className="grid border-b border-[#f3ece4] last:border-b-0" style={{ gridTemplateColumns }}>
                          <div className="border-r border-[#f0e8de] bg-[#fffdf8] p-3 text-sm font-semibold text-stone-700">{time}</div>
                          {activities.map((activity) => (
                            <div key={`${activity.id}__${time}`} className="border-r border-[#f3ece4] bg-white/80 p-3 last:border-r-0">
                              {renderEventCell({ date: day.date, time, activity, session: getSession(activity, time) })}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
