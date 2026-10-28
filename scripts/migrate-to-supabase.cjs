const path = require('path');
const { Client } = require(path.resolve(__dirname, '../lib/db/node_modules/pg'));

const NEON_URL = "postgresql://neondb_owner:npg_ireoGl6EPSh7@ep-falling-thunder-ak1l6677.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require";
const SUPABASE_URL = "postgresql://postgres:" + encodeURIComponent("R@7356844902inan") + "@db.yokdhyfwgoythppmubgs.supabase.co:5432/postgres";

async function run() {
  console.log("=== SUPABASE DATABASE MIGRATION ===");

  const supabase = new Client({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await supabase.connect();
  console.log("✓ Connected to Supabase");

  // 1. Create types if they do not exist
  console.log("1. Setting up enums and types in Supabase...");
  await supabase.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
        CREATE TYPE public.role AS ENUM ('admin', 'staff', 'customer');
      END IF;
    END $$;
  `);

  await supabase.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category') THEN
        CREATE TYPE public.category AS ENUM ('Luxury', 'Premium', 'Normal', 'Sedan', 'SUV', 'Sports', 'Electric', 'Van');
      END IF;
    END $$;
  `);

  await supabase.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transmission') THEN
        CREATE TYPE public.transmission AS ENUM ('Automatic', 'Manual');
      END IF;
    END $$;
  `);

  await supabase.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
      END IF;
    END $$;
  `);
  console.log("✓ Enums ready");

  // 2. Create tables in Supabase
  console.log("2. Creating tables in Supabase...");
  await supabase.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role public.role NOT NULL DEFAULT 'customer',
      is_verified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
    );
  `);

  await supabase.query(`
    CREATE TABLE IF NOT EXISTS public.vehicles (
      id SERIAL PRIMARY KEY,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      category public.category NOT NULL,
      daily_rate NUMERIC(10, 2) NOT NULL,
      seats INTEGER NOT NULL,
      transmission public.transmission NOT NULL,
      fuel_type TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 4.5,
      image_url TEXT,
      is_available BOOLEAN NOT NULL DEFAULT true,
      license_plate TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
    );
  `);

  await supabase.query(`
    CREATE TABLE IF NOT EXISTS public.bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      vehicle_id INTEGER NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
      pickup_date TEXT NOT NULL,
      return_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      total_cost NUMERIC(10, 2) NOT NULL,
      status public.booking_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
    );
  `);
  console.log("✓ Tables ready in Supabase");

  // 3. Connect to Neon and migrate existing data
  console.log("3. Connecting to source (Neon) database to migrate existing records...");
  const neon = new Client({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });
  await neon.connect();
  console.log("✓ Connected to Neon");

  // Migrate users
  const { rows: users } = await neon.query("SELECT * FROM public.users ORDER BY id ASC");
  console.log(`Migrating ${users.length} users...`);
  for (const u of users) {
    await supabase.query(`
      INSERT INTO public.users (id, name, email, password, role, is_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        is_verified = EXCLUDED.is_verified
    `, [u.id, u.name, u.email, u.password, u.role, u.is_verified, u.created_at]);
  }
  await supabase.query("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM public.users), 1))");
  console.log("✓ Users migrated successfully");

  // Migrate vehicles
  const { rows: vehicles } = await neon.query("SELECT * FROM public.vehicles ORDER BY id ASC");
  console.log(`Migrating ${vehicles.length} vehicles...`);
  for (const v of vehicles) {
    await supabase.query(`
      INSERT INTO public.vehicles (
        id, make, model, year, category, daily_rate, seats, transmission,
        fuel_type, rating, image_url, is_available, license_plate, description, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        make = EXCLUDED.make,
        model = EXCLUDED.model,
        year = EXCLUDED.year,
        category = EXCLUDED.category,
        daily_rate = EXCLUDED.daily_rate,
        seats = EXCLUDED.seats,
        transmission = EXCLUDED.transmission,
        fuel_type = EXCLUDED.fuel_type,
        rating = EXCLUDED.rating,
        image_url = EXCLUDED.image_url,
        is_available = EXCLUDED.is_available,
        license_plate = EXCLUDED.license_plate,
        description = EXCLUDED.description
    `, [
      v.id, v.make, v.model, v.year, v.category, v.daily_rate, v.seats, v.transmission,
      v.fuel_type, v.rating, v.image_url, v.is_available, v.license_plate, v.description, v.created_at
    ]);
  }
  await supabase.query("SELECT setval('vehicles_id_seq', COALESCE((SELECT MAX(id) FROM public.vehicles), 1))");
  console.log("✓ Vehicles migrated successfully");

  // Migrate bookings
  const { rows: bookings } = await neon.query("SELECT * FROM public.bookings ORDER BY id ASC");
  console.log(`Migrating ${bookings.length} bookings...`);
  for (const b of bookings) {
    await supabase.query(`
      INSERT INTO public.bookings (
        id, user_id, vehicle_id, pickup_date, return_date, duration_days, total_cost, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        vehicle_id = EXCLUDED.vehicle_id,
        pickup_date = EXCLUDED.pickup_date,
        return_date = EXCLUDED.return_date,
        duration_days = EXCLUDED.duration_days,
        total_cost = EXCLUDED.total_cost,
        status = EXCLUDED.status
    `, [b.id, b.user_id, b.vehicle_id, b.pickup_date, b.return_date, b.duration_days, b.total_cost, b.status, b.created_at]);
  }
  await supabase.query("SELECT setval('bookings_id_seq', COALESCE((SELECT MAX(id) FROM public.bookings), 1))");
  console.log("✓ Bookings migrated successfully");

  await neon.end();

  // Verification
  console.log("\n4. Verifying data in Supabase...");
  const sUsers = await supabase.query("SELECT count(*) FROM public.users");
  const sVehicles = await supabase.query("SELECT count(*) FROM public.vehicles");
  const sBookings = await supabase.query("SELECT count(*) FROM public.bookings");
  console.log(`✓ Supabase row counts: Users: ${sUsers.rows[0].count}, Vehicles: ${sVehicles.rows[0].count}, Bookings: ${sBookings.rows[0].count}`);

  await supabase.end();
  console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
