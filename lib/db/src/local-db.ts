import { newDb } from "pg-mem";
import fs from "node:fs";
import path from "node:path";

function findProjectRoot(): string {
  let cur = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(cur, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const content = JSON.parse(fs.readFileSync(pkg, "utf8"));
        if (content.name === "workspace" || fs.existsSync(path.join(cur, "pnpm-workspace.yaml"))) {
          return cur;
        }
      } catch {}
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
}

function esc(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "true" : "false";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

export function createLocalPostgresPool() {
  const root = findProjectRoot();
  const dataDir = path.join(root, "data");
  const dataFile = path.join(dataDir, "drive_elite_db.json");

  const mem = newDb();

  // Create Enums and Sequences
  mem.public.none(`
    CREATE TYPE role AS ENUM ('admin', 'staff', 'customer');
    CREATE TYPE category AS ENUM ('Luxury', 'Premium', 'Normal');
    CREATE TYPE transmission AS ENUM ('Automatic', 'Manual');
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');

    CREATE SEQUENCE users_id_seq START 1;
    CREATE TABLE users (
      id integer PRIMARY KEY DEFAULT nextval('users_id_seq'),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role role NOT NULL DEFAULT 'customer',
      is_verified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE SEQUENCE vehicles_id_seq START 1;
    CREATE TABLE vehicles (
      id integer PRIMARY KEY DEFAULT nextval('vehicles_id_seq'),
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      category category NOT NULL,
      daily_rate NUMERIC(10, 2) NOT NULL,
      seats INTEGER NOT NULL,
      transmission transmission NOT NULL,
      fuel_type TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 4.5,
      image_url TEXT,
      is_available BOOLEAN NOT NULL DEFAULT true,
      license_plate TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE SEQUENCE bookings_id_seq START 1;
    CREATE TABLE bookings (
      id integer PRIMARY KEY DEFAULT nextval('bookings_id_seq'),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      pickup_date TEXT NOT NULL,
      return_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      total_cost NUMERIC(10, 2) NOT NULL,
      status booking_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
    );
  `);

  // Persistence handler
  let saveTimer: NodeJS.Timeout | null = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const state = {
          users: mem.public.many("SELECT * FROM users ORDER BY id ASC"),
          vehicles: mem.public.many("SELECT * FROM vehicles ORDER BY id ASC"),
          bookings: mem.public.many("SELECT * FROM bookings ORDER BY id ASC"),
        };
        fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), "utf8");
      } catch (err) {
        console.error("[Local DB] Error persisting state to file:", err);
      }
    }, 150);
  }

  // Load from file or seed defaults
  let restored = false;
  if (fs.existsSync(dataFile)) {
    try {
      const raw = fs.readFileSync(dataFile, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        let maxUserId = 0;
        for (const u of parsed.users) {
          const createdAt = u.created_at ? esc(u.created_at) : "now()";
          mem.public.none(`
            INSERT INTO users (id, name, email, password, role, is_verified, created_at)
            VALUES (${u.id}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.password)}, ${esc(u.role)}, ${u.is_verified ? "true" : "false"}, ${createdAt});
          `);
          if (u.id > maxUserId) maxUserId = u.id;
        }
        if (maxUserId > 0) {
          mem.public.none(`SELECT setval('users_id_seq', ${maxUserId})`);
        }

        let maxVehicleId = 0;
        for (const v of parsed.vehicles || []) {
          const createdAt = v.created_at ? esc(v.created_at) : "now()";
          mem.public.none(`
            INSERT INTO vehicles (id, make, model, year, category, daily_rate, seats, transmission, fuel_type, rating, image_url, is_available, license_plate, description, created_at)
            VALUES (${v.id}, ${esc(v.make)}, ${esc(v.model)}, ${v.year}, ${esc(v.category)}, ${esc(v.daily_rate)}, ${v.seats}, ${esc(v.transmission)}, ${esc(v.fuel_type)}, ${v.rating}, ${esc(v.image_url)}, ${v.is_available ? "true" : "false"}, ${esc(v.license_plate)}, ${esc(v.description)}, ${createdAt});
          `);
          if (v.id > maxVehicleId) maxVehicleId = v.id;
        }
        if (maxVehicleId > 0) {
          mem.public.none(`SELECT setval('vehicles_id_seq', ${maxVehicleId})`);
        }

        let maxBookingId = 0;
        for (const b of parsed.bookings || []) {
          const createdAt = b.created_at ? esc(b.created_at) : "now()";
          mem.public.none(`
            INSERT INTO bookings (id, user_id, vehicle_id, pickup_date, return_date, duration_days, total_cost, status, created_at)
            VALUES (${b.id}, ${b.user_id}, ${b.vehicle_id}, ${esc(b.pickup_date)}, ${esc(b.return_date)}, ${b.duration_days}, ${esc(b.total_cost)}, ${esc(b.status)}, ${createdAt});
          `);
          if (b.id > maxBookingId) maxBookingId = b.id;
        }
        if (maxBookingId > 0) {
          mem.public.none(`SELECT setval('bookings_id_seq', ${maxBookingId})`);
        }

        restored = true;
        console.log(`[Local DB] Successfully restored ${parsed.users.length} users, ${(parsed.vehicles || []).length} vehicles, ${(parsed.bookings || []).length} bookings from storage.`);
      }
    } catch (e) {
      console.warn("[Local DB] Could not restore from file, proceeding with default seeds:", e);
    }
  }

  if (!restored) {
    console.log("[Local DB] Initializing fresh database with default accounts and vehicle fleet...");
    // 1. Seed Users
    // Hashed passwords using crypto.createHash("sha256").update(password + "elite_drive_salt").digest("hex")
    const users = [
      { id: 1, name: "Fleet Admin", email: "admin@elitedrive.com", password: "776ff8ff49f8dba9a5194215e5268ef101e5fe2e8c4df5f7a3ac73190c64460e", role: "admin", is_verified: true },
      { id: 2, name: "Customer User", email: "customer@elitedrive.com", password: "7955b62bc336a7a3b43ed6cacff59770bde4b358620ecbbe9a476ef6d6313ab1", role: "customer", is_verified: true },
      { id: 3, name: "John Doe", email: "john@example.com", password: "61d7982c88c1e34fcf1c8538c15d1e27565f9f1ae8ab29adcc9d12bff7bbe3fd", role: "customer", is_verified: true },
      { id: 4, name: "Rinan", email: "rinan@gmail.com", password: "61d7982c88c1e34fcf1c8538c15d1e27565f9f1ae8ab29adcc9d12bff7bbe3fd", role: "customer", is_verified: true }
    ];

    for (const u of users) {
      mem.public.none(`
        INSERT INTO users (id, name, email, password, role, is_verified)
        VALUES (${u.id}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.password)}, ${esc(u.role)}, ${u.is_verified ? "true" : "false"});
      `);
    }
    mem.public.none(`SELECT setval('users_id_seq', 4)`);

    // 2. Seed Vehicles
    const vehicles = [
      {
        id: 1,
        make: "Mercedes-Benz",
        model: "S-Class",
        year: 2024,
        category: "Luxury",
        daily_rate: "280.00",
        seats: 5,
        transmission: "Automatic",
        fuel_type: "Petrol",
        rating: 4.9,
        image_url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1001",
        description: "The definitive executive flagship sedan offering whisper-quiet comfort, massage seating, and state-of-the-art tech."
      },
      {
        id: 2,
        make: "BMW",
        model: "M4 Competition",
        year: 2024,
        category: "Luxury",
        daily_rate: "260.00",
        seats: 4,
        transmission: "Automatic",
        fuel_type: "Petrol",
        rating: 4.8,
        image_url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1002",
        description: "Unrivaled track-tuned agility and aggressive styling for the ultimate driving enthusiast."
      },
      {
        id: 3,
        make: "Porsche",
        model: "911 Carrera",
        year: 2024,
        category: "Luxury",
        daily_rate: "350.00",
        seats: 2,
        transmission: "Automatic",
        fuel_type: "Petrol",
        rating: 5.0,
        image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1003",
        description: "Timeless design coupled with legendary rear-engine sports car dynamics and razor-sharp steering."
      },
      {
        id: 4,
        make: "Audi",
        model: "RS7 Sportback",
        year: 2023,
        category: "Luxury",
        daily_rate: "290.00",
        seats: 5,
        transmission: "Automatic",
        fuel_type: "Petrol",
        rating: 4.8,
        image_url: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1004",
        description: "Twin-turbo V8 speed packed inside a sculpted, aerodynamic 5-door silhouette with Quattro AWD."
      },
      {
        id: 5,
        make: "Land Rover",
        model: "Range Rover",
        year: 2024,
        category: "Premium",
        daily_rate: "310.00",
        seats: 5,
        transmission: "Automatic",
        fuel_type: "Diesel",
        rating: 4.9,
        image_url: "https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1005",
        description: "Commanding luxury SUV with first-class lounge seats and effortless all-terrain presence."
      },
      {
        id: 6,
        make: "Tesla",
        model: "Model 3 Performance",
        year: 2024,
        category: "Premium",
        daily_rate: "160.00",
        seats: 5,
        transmission: "Automatic",
        fuel_type: "Electric",
        rating: 4.7,
        image_url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1006",
        description: "Instant electric torque, long-range efficiency, and ultra-smooth modern minimalist cockpit."
      },
      {
        id: 7,
        make: "Toyota",
        model: "Camry Hybrid",
        year: 2024,
        category: "Normal",
        daily_rate: "90.00",
        seats: 5,
        transmission: "Automatic",
        fuel_type: "Hybrid",
        rating: 4.6,
        image_url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1007",
        description: "Super-efficient, smooth, and highly dependable premium everyday sedan."
      },
      {
        id: 8,
        make: "Ford",
        model: "Mustang GT",
        year: 2023,
        category: "Premium",
        daily_rate: "175.00",
        seats: 4,
        transmission: "Manual",
        fuel_type: "Petrol",
        rating: 4.8,
        image_url: "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=1000&q=80",
        is_available: true,
        license_plate: "KL-07-ED-1008",
        description: "Unfiltered V8 roar paired with a crisp 6-speed manual gearbox for true driving purists."
      }
    ];

    for (const v of vehicles) {
      mem.public.none(`
        INSERT INTO vehicles (id, make, model, year, category, daily_rate, seats, transmission, fuel_type, rating, image_url, is_available, license_plate, description)
        VALUES (${v.id}, ${esc(v.make)}, ${esc(v.model)}, ${v.year}, ${esc(v.category)}, ${esc(v.daily_rate)}, ${v.seats}, ${esc(v.transmission)}, ${esc(v.fuel_type)}, ${v.rating}, ${esc(v.image_url)}, ${v.is_available ? "true" : "false"}, ${esc(v.license_plate)}, ${esc(v.description)});
      `);
    }
    mem.public.none(`SELECT setval('vehicles_id_seq', 8)`);

    // 3. Seed Sample Booking for John Doe
    mem.public.none(`
      INSERT INTO bookings (id, user_id, vehicle_id, pickup_date, return_date, duration_days, total_cost, status)
      VALUES (1, 3, 1, '2026-11-05', '2026-11-08', 3, 840.00, 'confirmed');
    `);
    mem.public.none(`SELECT setval('bookings_id_seq', 1)`);

    scheduleSave();
  }

  // Create adapter
  const pgAdapter = mem.adapters.createPg();

  // Patch adaptResults for Drizzle rowMode: "array"
  const origAdaptResults = pgAdapter.Pool.prototype.adaptResults;
  pgAdapter.Pool.prototype.adaptResults = function(query: any, res: any) {
    if (query && query.rowMode === "array") {
      const fields = res.fields || [];
      const rows = res.rows.map((row: any) => fields.map((f: any) => row[f.name]));
      return {
        ...res,
        rows,
        rowCount: res.rowCount ?? rows.length,
      };
    }
    return origAdaptResults.call(this, query, res);
  };

  // Patch query to strip unsupported query.types and trigger auto-persistence on mutations
  const origQuery = pgAdapter.Pool.prototype.query;
  pgAdapter.Pool.prototype.query = function(queryTextOrConfig: any, values: any, callback: any) {
    let sqlText = "";
    if (typeof queryTextOrConfig === "object" && queryTextOrConfig !== null) {
      if ("types" in queryTextOrConfig) {
        delete queryTextOrConfig.types;
      }
      sqlText = queryTextOrConfig.text || "";
    } else if (typeof queryTextOrConfig === "string") {
      sqlText = queryTextOrConfig;
    }

    const res = origQuery.call(this, queryTextOrConfig, values, callback);

    // If query is an insert/update/delete, trigger save
    if (/^\s*(insert|update|delete)\b/i.test(sqlText)) {
      scheduleSave();
    }

    return res;
  };

  const poolInstance = new pgAdapter.Pool();
  return { pool: poolInstance, scheduleSave };
}
