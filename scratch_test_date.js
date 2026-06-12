const now = new Date("2026-06-10T10:01:53+01:00");
const allDaily = [
  { report_date: "2026-06-08", on_hours: 5, interruptions: 1, intervals: [] },
  { report_date: "2026-06-09", on_hours: 0, interruptions: 0, intervals: [] },
  { report_date: "2026-06-10", on_hours: 0, interruptions: 0, intervals: [] }
];

console.log("=== MOCKING DAY VIEW ===");
const periodOffset = 0;
const targetDate = new Date(now);
const intervals = []; // mock intervals

const fixedDataDay = [];
for (let hour = 0; hour < 24; hour++) {
  const hourStart = new Date(targetDate);
  hourStart.setHours(hour, 0, 0, 0);
  fixedDataDay.push({
    dateObj: hourStart,
    label: (hour % 6 === 0) ? (hour === 0 ? '12am' : (hour === 12 ? '12pm' : (hour < 12 ? hour+'am' : (hour-12)+'pm'))) : '',
    on_hours: hour < 10 ? 1 : 0, // mock some hours having power
    isToday: periodOffset === 0 && hour === now.getHours(),
  });
}

fixedDataDay.forEach((d, i) => {
  const labelBg = d.isToday ? 'background-color: var(--border-light); border-radius: 12px; padding: 2px 6px; display: flex; align-items: center; justify-content: center; color: var(--text-main);' : 'padding: 2px 6px; display: flex; align-items: center; justify-content: center;';
  if (d.isToday || labelBg.includes("background-color")) {
    console.log(`Hour ${i} (${d.label || 'empty'}): isToday=${d.isToday}, labelBg has background-color`);
  }
});

console.log("=== MOCKING MONTH VIEW ===");
const targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
const fixedDataMonth = [];
for (let i = 1; i <= daysInMonth; i++) {
  const d = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i);
  const tzOffset = d.getTimezoneOffset() * 60000;
  const dateStr = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
  const match = allDaily.find(x => x.report_date === dateStr);
  fixedDataMonth.push({
    dateObj: d,
    label: (i === 1 || i % 8 === 0 || i === daysInMonth) ? i : '',
    on_hours: match ? match.on_hours : 0,
    isToday: periodOffset === 0 && d.getDate() === now.getDate(),
    original: match
  });
}

fixedDataMonth.forEach((d, i) => {
  const labelBg = d.isToday ? 'background-color: var(--border-light); border-radius: 12px; padding: 2px 6px; display: flex; align-items: center; justify-content: center; color: var(--text-main);' : 'padding: 2px 6px; display: flex; align-items: center; justify-content: center;';
  if (d.isToday || labelBg.includes("background-color")) {
    console.log(`Day ${i+1} (${d.label || 'empty'}): isToday=${d.isToday}, labelBg has background-color`);
  }
});
