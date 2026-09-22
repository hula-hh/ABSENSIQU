const SHEETS = {
  STUDENTS: "Students",
  ATTENDANCE: "Attendance"
};

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : "";
  if (action === "getStudents") return out({ ok: true, data: read(SHEETS.STUDENTS) });
  if (action === "getAttendance") return out({ ok: true, data: read(SHEETS.ATTENDANCE) });
  return out({ ok: true, service: "ABSENSIQU API", version: "2.0" });
}

function doPost(e) {
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (b.action === "getStudents") {
      return out({ ok: true, data: read(SHEETS.STUDENTS) });
    }

    if (b.action === "getAttendance") {
      return out({ ok: true, data: read(SHEETS.ATTENDANCE) });
    }

    if (b.action === "addStudent") {
      validateStudent(b.student);
      const lock = LockService.getScriptLock();
      lock.waitLock(5000);
      try {
        if (duplicateStudent(b.student)) {
          return out({ ok: false, error: "NISN already exists" });
        }
        append(SHEETS.STUDENTS, {
          id: b.student.id,
          nis: b.student.nis,
          name: b.student.name,
          class: b.student.class,
          active: b.student.active !== false
        });
        return out({ ok: true });
      } finally {
        lock.releaseLock();
      }
    }

    if (b.action === "addAttendance") {
      validateAttendance(b.attendance);
      const lock = LockService.getScriptLock();
      lock.waitLock(5000);
      try {
        if (duplicateAttendance(b.attendance)) {
          return out({
            ok: false,
            error: "Attendance already exists",
            code: "DUPLICATE_ATTENDANCE"
          });
        }
        append(SHEETS.ATTENDANCE, b.attendance);
        return out({ ok: true });
      } finally {
        lock.releaseLock();
      }
    }

    return out({ ok: false, error: "Unknown action" });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function validateStudent(st) {
  if (!st || !String(st.nis || "").trim() || !String(st.name || "").trim() || !String(st.class || "").trim()) {
    throw Error("Student data is incomplete");
  }
}

function validateAttendance(a) {
  const required = ["id", "date", "time", "studentId", "nis", "name", "class", "subject", "status"];
  if (!a || required.some(k => !String(a[k] ?? "").trim())) {
    throw Error("Attendance data is incomplete");
  }
}

function read(name) {
  const s = SpreadsheetApp.getActive().getSheetByName(name);
  if (!s) return [];

  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];

  return v.slice(1)
    .filter(r => r.join("") !== "")
    .map(r => {
      const o = {};
      v[0].forEach((h, i) => o[h] = r[i]);
      return o;
    });
}

function append(name, obj) {
  const s = SpreadsheetApp.getActive().getSheetByName(name);
  if (!s) throw Error("Sheet " + name + " not found");

  const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  s.appendRow(h.map(k => obj[k] ?? ""));
}

function duplicateStudent(st) {
  const nis = String(st.nis).trim();
  return read(SHEETS.STUDENTS).some(x => String(x.nis).trim() === nis);
}

function duplicateAttendance(a) {
  const date = String(a.date).trim();
  const subject = String(a.subject).trim();
  const studentId = String(a.studentId).trim();

  return read(SHEETS.ATTENDANCE).some(x =>
    String(x.date).trim() === date &&
    String(x.subject).trim() === subject &&
    String(x.studentId).trim() === studentId
  );
}

function out(x) {
  return ContentService
    .createTextOutput(JSON.stringify(x))
    .setMimeType(ContentService.MimeType.JSON);
}
