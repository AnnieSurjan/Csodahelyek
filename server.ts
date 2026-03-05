import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.NODE_ENV === "production"
  ? "/data/csodahelyek.db"
  : "csodahelyek.db";
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    lat REAL,
    lng REAL,
    url TEXT UNIQUE,
    category TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    is_pro BOOLEAN DEFAULT 0
  );
`);

// Prepare statements once for better performance
const stmtGetPlaces = db.prepare("SELECT * FROM places");
const stmtInsertPlace = db.prepare(`
  INSERT INTO places (title, description, lat, lng, url, category, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const stmtGetUser = db.prepare("SELECT * FROM users WHERE email = ?");
const stmtSubscribe = db.prepare("INSERT OR REPLACE INTO users (email, is_pro) VALUES (?, 1)");

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // API Routes
  app.get("/api/places", (_req, res) => {
    try {
      const places = stmtGetPlaces.all();
      res.json(places);
    } catch {
      res.status(500).json({ error: "Nem sikerült lekérni a helyszíneket." });
    }
  });

  app.post("/api/places", (req, res) => {
    const { title, description, lat, lng, url, category, image_url } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "A cím megadása kötelező." });
    }
    if (lat == null || typeof lat !== "number" || lat < -90 || lat > 90) {
      return res.status(400).json({ error: "Érvénytelen szélességi fok." });
    }
    if (lng == null || typeof lng !== "number" || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Érvénytelen hosszúsági fok." });
    }

    try {
      const info = stmtInsertPlace.run(
        title.trim(),
        description?.trim() || null,
        lat,
        lng,
        url?.trim() || null,
        category?.trim() || null,
        image_url?.trim() || null
      );
      res.json({ id: info.lastInsertRowid });
    } catch {
      res.status(400).json({ error: "A helyszín már létezik vagy az adatok érvénytelenek." });
    }
  });

  app.get("/api/user/:email", (req, res) => {
    const { email } = req.params;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Érvénytelen e-mail cím." });
    }
    const user = stmtGetUser.get(email);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "Felhasználó nem található." });
    }
  });

  app.post("/api/subscribe", (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Érvénytelen e-mail cím." });
    }
    try {
      stmtSubscribe.run(email.trim());
      res.json({ success: true, is_pro: 1 });
    } catch {
      res.status(500).json({ error: "Feliratkozási hiba." });
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
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
