import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

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
    is_pro BOOLEAN DEFAULT 0
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
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/zsambeki-romtemplom.jpg"
    },
    {
      title: "Budakeszi Vadaspark",
      description: "Több mint 50 állatfaj él itt, a parasztudvarban kecskékkel, őzekkel és muflonokkal találkozhatsz. Családbarát kirándulóhely a Budai-hegységben.",
      lat: 47.5139,
      lng: 18.9253,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/budakeszi-vadaspark.jpg"
    },
    {
      title: "Budakeszi Arborétum",
      description: "Több mint 30 hektáros területen több mint 1000 növényfajtát mutat be, tekervényes ösvényekkel és mocsári teknősökkel.",
      lat: 47.5185,
      lng: 18.9189,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/budakeszi-arboretum.jpg"
    },
    {
      title: "Róka-hegyi kőfejtő",
      description: "Budapest \"Grand Canyonja\" Üröm mellett. Hatalmas sziklák és szédítő panoráma várja a kirándulókat ezen a rejtett természeti csodahelyen.",
      lat: 47.5889,
      lng: 19.0139,
      url: "https://csodahelyek.hu/2025/09/15/15-latnivalo-pest-varmegyeben/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/roka-hegyi-kofejto.jpg"
    },
    {
      title: "Visegrádi Fellegvár",
      description: "A Dunakanyar egyik leglátványosabb történelmi emléke. A Fellegvár mellett a Királyi Palota, a Salamon-torony és az Ördögmalom-vízesés is megtekinthető.",
      lat: 47.7842,
      lng: 18.9775,
      url: "https://csodahelyek.hu/2024/10/14/20-kirandulohely-tomegkozlekedessel-budapest-kornyeken/",
      category: "Történelem",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/visegradi-fellegvar.jpg"
    },
    {
      title: "Szentendre",
      description: "Páratlan kirándulóhely, télen-nyáron bővelkedik színes programkínálatban. Mediterrán hangulatú utcák, galériák, múzeumok és kávézók várják a látogatókat.",
      lat: 47.6694,
      lng: 19.0756,
      url: "https://csodahelyek.hu/2024/10/14/20-kirandulohely-tomegkozlekedessel-budapest-kornyeken/",
      category: "Városnézés",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/szentendre.jpg"
    },
    {
      title: "Vácrátóti Nemzeti Botanikus Kert",
      description: "A 27 hektáros botanikus kert növénybemutatókkal, hangulatos sétautakkal és szervezett programokkal várja a látogatókat.",
      lat: 47.6108,
      lng: 19.2336,
      url: "https://csodahelyek.hu/2024/10/14/20-kirandulohely-tomegkozlekedessel-budapest-kornyeken/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/vacratot-botanikus-kert.jpg"
    },
    {
      title: "Martonvásári Brunszvik-kastély",
      description: "\"A legangolabb magyar kastély\" — gyönyörű angolpark veszi körül, ahol Beethoven is gyakran megfordult. A kastélyparkban romantikus séták tehetők.",
      lat: 47.3153,
      lng: 18.7878,
      url: "https://csodahelyek.hu/2020/06/14/csodahelyek-budapest-kornyeken/",
      category: "Történelem",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/brunszvik-kastely.jpg"
    },
    {
      title: "Nagybörzsönyi Kisvasút",
      description: "Nagybörzsöny, ahol kisvasút, vízimalom és számos túraútvonal várja a kirándulókat. A román kori Szent István-templom az egyik legszebb Árpád-kori templom.",
      lat: 47.9333,
      lng: 18.9167,
      url: "https://csodahelyek.hu/2020/06/14/csodahelyek-budapest-kornyeken/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/nagyborzsony.jpg"
    },
    {
      title: "Dabasi Szent Jakab sétány",
      description: "Tanösvényként is funkcionáló sétány, cölöpökön álló pallós úttal, fahidakkal és kilátóval. Egyedülálló természeti élmény az Alföld szélén.",
      lat: 47.1861,
      lng: 19.3208,
      url: "https://csodahelyek.hu/2020/06/14/csodahelyek-budapest-kornyeken/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/dabas-szent-jakab.jpg"
    },
    {
      title: "Gödöllői Királyi Kastély",
      description: "Sissi és I. Ferenc József kedvelt királyi rezidenciája. Magyarország legnagyobb barokk kastélya lenyűgöző enteriőrökkel és parkkal.",
      lat: 47.5981,
      lng: 19.3536,
      url: "https://csodahelyek.hu/2022/10/21/oszi-kirandulohely-kevesebb-mint-1-orara-budapesttol/",
      category: "Történelem",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2020/06/godolloi-kastely.jpg"
    },
    {
      title: "Tündérszikla – János-hegy",
      description: "A János-hegy egyik nyúlványán található Tündérszikla Budapest egyik legrejtettebb panorámapontja, mesés kilátással a városra.",
      lat: 47.5142,
      lng: 18.9528,
      url: "https://csodahelyek.hu/2021/02/04/budapest-rejtett-kincsei/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2021/02/tundershikla.jpg"
    },
    {
      title: "Japánkert – Margitsziget",
      description: "Magyarország első japánkertje a Margitszigeten. Zen-hangulatú oázis a város szívében, tavacskával, kőhíddal és japán növényekkel.",
      lat: 47.5294,
      lng: 19.0514,
      url: "https://csodahelyek.hu/2021/02/04/budapest-rejtett-kincsei/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2021/02/japankert-margitsziget.jpg"
    },
    {
      title: "Tóth Árpád sétány – Várnegyed",
      description: "A Várnegyed dél-nyugati oldalán húzódó romantikus sétány, minden évszakban gyönyörű. Panorámás kilátás a Budai-hegyekre.",
      lat: 47.4972,
      lng: 19.0347,
      url: "https://csodahelyek.hu/2021/02/04/budapest-rejtett-kincsei/",
      category: "Városnézés",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2021/02/toth-arpad-setany.jpg"
    },
    {
      title: "Teve-szikla – Pilisborosjenő",
      description: "Az Egri csillagok rajongói számára valóságos zarándokhely. A Teve-szikla szédítő kilátást nyújt a Pilis hegységre.",
      lat: 47.6047,
      lng: 18.9625,
      url: "https://csodahelyek.hu/2022/10/21/oszi-kirandulohely-kevesebb-mint-1-orara-budapesttol/",
      category: "Természet",
      image_url: "https://csodahelyek.hu/wp-content/uploads/2022/10/teve-szikla.jpg"
    }
  ];

  const insertSeed = db.prepare(`
    INSERT OR IGNORE INTO places (title, description, lat, lng, url, category, image_url)
    VALUES (@title, @description, @lat, @lng, @url, @category, @image_url)
  `);

  const seedAll = db.transaction((places: typeof seedPlaces) => {
    for (const place of places) {
      insertSeed.run(place);
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
