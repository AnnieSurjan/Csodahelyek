import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("csodahelyek.db");

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/places", (req, res) => {
    const places = db.prepare("SELECT * FROM places").all();
    res.json(places);
  });

  app.post("/api/places", (req, res) => {
    const { title, description, lat, lng, url, category, image_url } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO places (title, description, lat, lng, url, category, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(title, description, lat, lng, url, category, image_url);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Place already exists or invalid data" });
    }
  });

  app.get("/api/user/:email", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.params.email);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/subscribe", (req, res) => {
    const { email } = req.body;
    db.prepare("INSERT OR REPLACE INTO users (email, is_pro) VALUES (?, 1)").run(email);
    res.json({ success: true, is_pro: 1 });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
