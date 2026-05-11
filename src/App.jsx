import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "activity-staff-scheduler:v1";

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

export default function ActivitySchedulerPrototype() {
  const [staff, setStaff] = useState(defaultStaff);
  const [schedules, setSchedules] = useState(defaultSchedules);
  const [assignments, setAssignments] = useState(emptyAssignments);
  const [roleSlots, setRoleSlots] = useState(defaultRoleSlots);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [importMessage, setImportMessage] = useState("");

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
      <div className="mx-auto flex max-w-[1500px] gap-5 px-5">
        <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-stone-300 py-5 pr-5">
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

        <main className="min-w-0 flex-1 py-5">
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
