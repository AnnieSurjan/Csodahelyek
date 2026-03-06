import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const db = new Database("csodahelyek.db");

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
    password_hash TEXT NOT NULL,
    name TEXT,
    is_pro BOOLEAN DEFAULT 0,
    verified BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    place_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_email, place_id),
    FOREIGN KEY (place_id) REFERENCES places(id)
  );
`);

// Seed Közép-Magyarország places if DB is empty
const count = db.prepare("SELECT COUNT(*) as cnt FROM places").get() as { cnt: number };
if (count.cnt === 0) {
  const seedPlaces = [
    {
      title: "Zsámbéki Premontrei kolostor",
      description: "A Nyakas-hegy oldalában álló középkori romtemplom a magyar építészet egyik legszebb műemléke. A 13. századi premontrei kolostor romjai lenyűgöző látványt nyújtanak.",
      lat: 47.5511,
      lng: 18.7194,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Történelem",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Zs%C3%A1mb%C3%A9k_-_Church_ruins.jpg/600px-Zs%C3%A1mb%C3%A9k_-_Church_ruins.jpg"
    },
    {
      title: "Budakeszi Vadaspark",
      description: "Több mint 50 állatfaj él itt, a parasztudvarban kecskékkel, őzekkel és muflonokkal találkozhatsz. Családbarát kirándulóhely a Budai-hegységben.",
      lat: 47.5139,
      lng: 18.9253,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Budakeszi_Vadaspark_-_panoramio_%281%29.jpg/600px-Budakeszi_Vadaspark_-_panoramio_%281%29.jpg"
    },
    {
      title: "Budakeszi Arborétum",
      description: "Több mint 30 hektáros területen több mint 1000 növényfajtát mutat be, tekervényes ösvényekkel és mocsári teknősökkel.",
      lat: 47.5185,
      lng: 18.9189,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Budakeszi%2C_arboretum.jpg/600px-Budakeszi%2C_arboretum.jpg"
    },
    {
      title: "Róka-hegyi kőfejtő",
      description: "Budapest \"Grand Canyonja\" Üröm mellett. Hatalmas sziklák és szédítő panoráma várja a kirándulókat ezen a rejtett természeti csodahelyen.",
      lat: 47.5889,
      lng: 19.0139,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/R%C3%B3ka-hegyi_k%C5%91fejt%C5%91.jpg/600px-R%C3%B3ka-hegyi_k%C5%91fejt%C5%91.jpg"
    },
    {
      title: "Visegrádi Fellegvár",
      description: "A Dunakanyar egyik leglátványosabb történelmi emléke. A Fellegvár mellett a Királyi Palota, a Salamon-torony és az Ördögmalom-vízesés is megtekinthető.",
      lat: 47.7842,
      lng: 18.9775,
      url: "https://csodahelyek.hu/2024/10/14/20-kirandulohely-tomegkozlekedessel-budapest-kornyeken/",
      category: "Történelem",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Visegr%C3%A1d_Castle_%2814439178696%29.jpg/600px-Visegr%C3%A1d_Castle_%2814439178696%29.jpg"
    },
    {
      title: "Szentendre",
      description: "Páratlan kirándulóhely, télen-nyáron bővelkedik színes programkínálatban. Mediterrán hangulatú utcák, galériák, múzeumok és kávézók várják a látogatókat.",
      lat: 47.6694,
      lng: 19.0756,
      url: "https://csodahelyek.hu/2024/10/14/20-kirandulohely-tomegkozlekedessel-budapest-kornyeken/",
      category: "Városnézés",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Szentendre_f%C5%91_t%C3%A9r.jpg/600px-Szentendre_f%C5%91_t%C3%A9r.jpg"
    },
    {
      title: "Vácrátóti Nemzeti Botanikus Kert",
      description: "A 27 hektáros botanikus kert növénybemutatókkal, hangulatos sétautakkal és szervezett programokkal várja a látogatókat.",
      lat: 47.6108,
      lng: 19.2336,
      url: "https://csodahelyek.hu/2024/10/14/20-kirandulohely-tomegkozlekedessel-budapest-kornyeken/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/V%C3%A1cr%C3%A1t%C3%B3t_botanical_garden.jpg/600px-V%C3%A1cr%C3%A1t%C3%B3t_botanical_garden.jpg"
    },
    {
      title: "Martonvásári Brunszvik-kastély",
      description: "\"A legangolabb magyar kastély\" — gyönyörű angolpark veszi körül, ahol Beethoven is gyakran megfordult. A kastélyparkban romantikus séták tehetők.",
      lat: 47.3153,
      lng: 18.7878,
      url: "https://csodahelyek.hu/2020/06/14/csodahelyek-budapest-kornyeken/",
      category: "Történelem",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Brunszvik-kast%C3%A9ly_%28Martonv%C3%A1s%C3%A1r%29.jpg/600px-Brunszvik-kast%C3%A9ly_%28Martonv%C3%A1s%C3%A1r%29.jpg"
    },
    {
      title: "Nagybörzsönyi Kisvasút",
      description: "Nagybörzsöny, ahol kisvasút, vízimalom és számos túraútvonal várja a kirándulókat. A román kori Szent István-templom az egyik legszebb Árpád-kori templom.",
      lat: 47.9333,
      lng: 18.9167,
      url: "https://csodahelyek.hu/2020/06/14/csodahelyek-budapest-kornyeken/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Nagyb%C3%B6rzs%C3%B6ny_forest_railway.jpg/600px-Nagyb%C3%B6rzs%C3%B6ny_forest_railway.jpg"
    },
    {
      title: "Dabasi Szent Jakab sétány",
      description: "Tanösvényként is funkcionáló sétány, cölöpökön álló pallós úttal, fahidakkal és kilátóval. Egyedülálló természeti élmény az Alföld szélén.",
      lat: 47.1861,
      lng: 19.3208,
      url: "https://csodahelyek.hu/2020/06/14/csodahelyek-budapest-kornyeken/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Dabas_bog_boardwalk.jpg/600px-Dabas_bog_boardwalk.jpg"
    },
    {
      title: "Gödöllői Királyi Kastély",
      description: "Sissi és I. Ferenc József kedvelt királyi rezidenciája. Magyarország legnagyobb barokk kastélya lenyűgöző enteriőrökkel és parkkal.",
      lat: 47.5981,
      lng: 19.3536,
      url: "https://csodahelyek.hu/2022/10/21/oszi-kirandulohely-kevesebb-mint-1-orara-budapesttol/",
      category: "Történelem",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Royal_Palace_of_G%C3%B6d%C3%B6ll%C5%91_001.jpg/600px-Royal_Palace_of_G%C3%B6d%C3%B6ll%C5%91_001.jpg"
    },
    {
      title: "Tündérszikla – János-hegy",
      description: "A János-hegy egyik nyúlványán található Tündérszikla Budapest egyik legrejtettebb panorámapontja, mesés kilátással a városra.",
      lat: 47.5142,
      lng: 18.9528,
      url: "https://csodahelyek.hu/2021/02/04/budapest-rejtett-kincsei/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Elisabeth_Lookout%2C_Budapest.jpg/600px-Elisabeth_Lookout%2C_Budapest.jpg"
    },
    {
      title: "Japánkert – Margitsziget",
      description: "Magyarország első japánkertje a Margitszigeten. Zen-hangulatú oázis a város szívében, tavacskával, kőhíddal és japán növényekkel.",
      lat: 47.5294,
      lng: 19.0514,
      url: "https://csodahelyek.hu/2021/02/04/budapest-rejtett-kincsei/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Japanese_Garden_on_Margaret_Island.jpg/600px-Japanese_Garden_on_Margaret_Island.jpg"
    },
    {
      title: "Tóth Árpád sétány – Várnegyed",
      description: "A Várnegyed dél-nyugati oldalán húzódó romantikus sétány, minden évszakban gyönyörű. Panorámás kilátás a Budai-hegyekre.",
      lat: 47.4972,
      lng: 19.0347,
      url: "https://csodahelyek.hu/2021/02/04/budapest-rejtett-kincsei/",
      category: "Városnézés",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Budapest%2C_Castle_District%2C_T%C3%B3th_%C3%81rp%C3%A1d_promenade.jpg/600px-Budapest%2C_Castle_District%2C_T%C3%B3th_%C3%81rp%C3%A1d_promenade.jpg"
    },
    {
      title: "Teve-szikla – Pilisborosjenő",
      description: "Az Egri csillagok rajongói számára valóságos zarándokhely. A Teve-szikla szédítő kilátást nyújt a Pilis hegységre.",
      lat: 47.6047,
      lng: 18.9625,
      url: "https://csodahelyek.hu/2022/10/21/oszi-kirandulohely-kevesebb-mint-1-orara-budapesttol/",
      category: "Természet",
      image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Teve-szikla.jpg/600px-Teve-szikla.jpg"
    }
  ];

  const insertSeed = db.prepare(`
    INSERT OR IGNORE INTO places (title, description, lat, lng, url, category, image_url)
    VALUES (@title, @description, @lat, @lng, @url, @category, @image_url)
  `);

  const updateImage = db.prepare(`
    UPDATE places SET image_url = @image_url WHERE title = @title
  `);

  const seedAll = db.transaction((places: typeof seedPlaces) => {
    for (const place of places) {
      insertSeed.run(place);
      updateImage.run({ title: place.title, image_url: place.image_url });
    }
  });

  seedAll(seedPlaces);
  console.log(`Seeded ${seedPlaces.length} Közép-Magyarország places.`);
}

// Prepare statements once for better performance
const stmtGetPlaces = db.prepare("SELECT * FROM places");
const stmtInsertPlace = db.prepare(`
  INSERT INTO places (title, description, lat, lng, url, category, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const stmtGetUser = db.prepare("SELECT id, email, name, is_pro, verified FROM users WHERE email = ?");
const stmtGetUserWithPassword = db.prepare("SELECT * FROM users WHERE email = ?");
const stmtInsertUser = db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)");
const stmtVerifyUser = db.prepare("UPDATE users SET verified = 1 WHERE email = ?");
const stmtSubscribe = db.prepare("UPDATE users SET is_pro = 1 WHERE email = ?");
const stmtInsertCode = db.prepare("INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))");
const stmtGetCode = db.prepare("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1");
const stmtUseCode = db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?");
const stmtGetFavorites = db.prepare("SELECT place_id FROM favorites WHERE user_email = ?");
const stmtAddFavorite = db.prepare("INSERT OR IGNORE INTO favorites (user_email, place_id) VALUES (?, ?)");
const stmtRemoveFavorite = db.prepare("DELETE FROM favorites WHERE user_email = ? AND place_id = ?");

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

  // --- Auth endpoints ---

  app.post("/api/register", (req, res) => {
    const { email, password, name } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Érvénytelen e-mail cím." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "A jelszónak legalább 6 karakter hosszúnak kell lennie." });
    }

    const existing = stmtGetUser.get(email.trim());
    if (existing) {
      return res.status(409).json({ error: "Ez az e-mail cím már regisztrálva van." });
    }

    try {
      const hash = hashPassword(password);
      stmtInsertUser.run(email.trim(), hash, name?.trim() || null);

      const code = generateCode();
      stmtInsertCode.run(email.trim(), code);
      console.log(`[DEMO] Verifikációs kód (${email.trim()}): ${code}`);

      res.json({ success: true, message: "Regisztráció sikeres! Ellenőrizd az e-mail fiókodat.", demo_code: code });
    } catch {
      res.status(500).json({ error: "Regisztrációs hiba." });
    }
  });

  app.post("/api/verify", (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail és kód megadása kötelező." });
    }

    const record = stmtGetCode.get(email.trim(), code.trim()) as { id: number } | undefined;
    if (!record) {
      return res.status(400).json({ error: "Érvénytelen vagy lejárt kód." });
    }

    try {
      stmtUseCode.run(record.id);
      stmtVerifyUser.run(email.trim());
      const user = stmtGetUser.get(email.trim());
      res.json({ success: true, user });
    } catch {
      res.status(500).json({ error: "Verifikációs hiba." });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail és jelszó megadása kötelező." });
    }

    const user = stmtGetUserWithPassword.get(email.trim()) as { password_hash: string; verified: number; email: string; name: string; is_pro: number } | undefined;
    if (!user) {
      return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
    }

    const hash = hashPassword(password);
    if (hash !== user.password_hash) {
      return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
    }

    if (!user.verified) {
      const code = generateCode();
      stmtInsertCode.run(email.trim(), code);
      console.log(`[DEMO] Verifikációs kód (${email.trim()}): ${code}`);
      return res.status(403).json({ error: "A fiók nincs megerősítve. Új kódot küldtünk.", needs_verification: true, demo_code: code });
    }

    res.json({ success: true, user: { email: user.email, name: user.name, is_pro: user.is_pro, verified: 1 } });
  });

  app.post("/api/resend-code", (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Érvénytelen e-mail cím." });
    }

    const code = generateCode();
    stmtInsertCode.run(email.trim(), code);
    console.log(`[DEMO] Új verifikációs kód (${email.trim()}): ${code}`);
    res.json({ success: true, message: "Új kód elküldve!", demo_code: code });
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
    const user = stmtGetUser.get(email.trim()) as { verified: number } | undefined;
    if (!user) {
      return res.status(404).json({ error: "Felhasználó nem található." });
    }
    try {
      stmtSubscribe.run(email.trim());
      res.json({ success: true, is_pro: 1 });
    } catch {
      res.status(500).json({ error: "Feliratkozási hiba." });
    }
  });

  // --- Favorites endpoints ---

  app.get("/api/favorites/:email", (req, res) => {
    const { email } = req.params;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Érvénytelen e-mail cím." });
    }
    const rows = stmtGetFavorites.all(email) as { place_id: number }[];
    res.json(rows.map(r => r.place_id));
  });

  app.post("/api/favorites", (req, res) => {
    const { email, place_id } = req.body;
    if (!email || !place_id) {
      return res.status(400).json({ error: "E-mail és helyszín azonosító szükséges." });
    }
    try {
      stmtAddFavorite.run(email.trim(), place_id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Kedvenc hozzáadása sikertelen." });
    }
  });

  app.delete("/api/favorites", (req, res) => {
    const { email, place_id } = req.body;
    if (!email || !place_id) {
      return res.status(400).json({ error: "E-mail és helyszín azonosító szükséges." });
    }
    try {
      stmtRemoveFavorite.run(email.trim(), place_id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Kedvenc eltávolítása sikertelen." });
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
