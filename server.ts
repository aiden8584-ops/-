import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Google Sheets API Setup
  const sheets = google.sheets("v4");
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const API_KEY = process.env.GOOGLE_API_KEY;

  // API Route for Login
  app.post("/api/login", async (req: express.Request, res: express.Response) => {
    const { name, last4Digits } = req.body;

    if (!name || !last4Digits) {
      return res.status(400).json({ error: "이름과 전화번호 뒷자리 4자리를 입력해주세요." });
    }

    if (!SHEET_ID) {
      return res.status(500).json({ error: "서버 설정이 완료되지 않았습니다. (Google Sheet ID 누락)" });
    }

    try {
      let cleanSheetId = SHEET_ID.trim();
      let isPublished = false;

      // Handle full URLs (Standard or Published)
      if (cleanSheetId.includes("/d/e/")) {
        // Published to web format: .../d/e/2PACX-xxxx/pub...
        cleanSheetId = cleanSheetId.split("/d/e/")[1].split("/")[0];
        isPublished = true;
      } else if (cleanSheetId.includes("/d/")) {
        // Standard format: .../d/1A2B3C.../edit...
        cleanSheetId = cleanSheetId.split("/d/")[1].split("/")[0];
      }

      // Also check if the ID itself looks like a published ID (starts with 2PACX-)
      if (cleanSheetId.startsWith("2PACX-")) {
        isPublished = true;
      }

      // Determine the best URL to fetch data
      let csvUrl = "";
      if (isPublished) {
        // Published to web endpoint
        csvUrl = `https://docs.google.com/spreadsheets/d/e/${cleanSheetId}/pub?output=csv`;
      } else {
        // Standard export endpoint (fallback to gviz for better compatibility)
        csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/gviz/tq?tqx=out:csv`;
      }

      const csvResponse = await fetch(csvUrl);
      
      if (!csvResponse.ok) {
        return res.status(400).json({ 
          error: "시트 데이터를 가져올 수 없습니다.",
          details: "시트 ID가 정확한지 확인해 주세요. (현재 인식된 ID: " + cleanSheetId + ")"
        });
      }

      const csvData = await csvResponse.text();
      
      // Check if we got HTML (login page) instead of CSV
      if (csvData.includes("<!DOCTYPE html>") || csvData.includes("<html")) {
        return res.status(400).json({ 
          error: "시트 접근 권한이 없습니다.",
          details: isPublished 
            ? "웹에 게시할 때 '게시된 콘텐츠 및 설정'에서 '전체 문서'가 선택되었는지, 그리고 '액세스 제한' 체크박스가 해제되어 있는지 확인해 주세요."
            : "구글 시트의 [공유] 버튼을 눌러 '링크가 있는 모든 사용자'로 설정을 변경하거나, [파일] -> [공유] -> [웹에 게시] 기능을 사용해 주세요."
        });
      }

      const rows = csvData.split(/\r?\n/).filter(line => line.trim() !== "").map(row => {
        // Handle both comma and semicolon delimiters
        const delimiter = row.includes(";") ? ";" : ",";
        return row.split(delimiter).map(cell => cell.replace(/^"|"$/g, "").trim());
      });

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "시트가 비어 있거나 데이터를 읽을 수 없습니다." });
      }

      // Find student (Case-insensitive name match, robust phone matching)
      const student = rows.find((row) => {
        const studentName = row[0] || "";
        const phoneNumber = (row[1] || "").toString().replace(/[^0-9]/g, "");
        const studentLast4 = phoneNumber.slice(-4);

        const inputName = name.trim();
        const inputLast4 = last4Digits.trim();

        return studentName.trim() === inputName && studentLast4 === inputLast4;
      });

      if (student) {
        res.json({ 
          success: true, 
          student: { 
            name: student[0],
            school: student[2] || "일반",
            wordGid: student[3] || "0"
          } 
        });
      } else {
        res.status(401).json({ error: "일치하는 학생 정보가 없습니다. 이름과 번호를 확인해주세요." });
      }
    } catch (error: any) {
      console.error("Google Sheets API Error:", error);
      res.status(500).json({ error: "학생 명단을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // API Route for Words
  app.get("/api/words", async (req: express.Request, res: express.Response) => {
    if (!SHEET_ID) {
      return res.status(500).json({ error: "서버 설정이 완료되지 않았습니다. (Google Sheet ID 누락)" });
    }

    try {
      let cleanSheetId = SHEET_ID.trim();
      let isPublished = false;
      const gid = req.query.gid || process.env.WORDS_GID || "0";

      if (cleanSheetId.includes("/d/e/")) {
        cleanSheetId = cleanSheetId.split("/d/e/")[1].split("/")[0];
        isPublished = true;
      } else if (cleanSheetId.includes("/d/")) {
        cleanSheetId = cleanSheetId.split("/d/")[1].split("/")[0];
      }

      if (cleanSheetId.startsWith("2PACX-")) {
        isPublished = true;
      }

      let csvUrl = "";
      if (isPublished) {
        csvUrl = `https://docs.google.com/spreadsheets/d/e/${cleanSheetId}/pub?gid=${gid}&output=csv`;
      } else {
        csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv&gid=${gid}`;
      }

      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) {
        return res.status(400).json({ error: "단어 데이터를 가져올 수 없습니다." });
      }

      const csvData = await csvResponse.text();
      const rows = csvData.split(/\r?\n/).filter(line => line.trim() !== "").map(row => {
        const delimiter = row.includes(";") ? ";" : ",";
        return row.split(delimiter).map(cell => cell.replace(/^"|"$/g, "").trim());
      });

      // Map rows to word objects (Assuming Col A: Word, Col B: Meaning)
      const words = rows.slice(1).map(row => ({
        word: row[0],
        meaning: row[1]
      })).filter(w => w.word && w.meaning);

      res.json({ success: true, words });
    } catch (error) {
      console.error("Fetch Words Error:", error);
      res.status(500).json({ error: "단어 목록을 불러오는 중 오류가 발생했습니다." });
    }
  });
}

startServer();
