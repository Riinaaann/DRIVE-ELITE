const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../lib/db/node_modules/pg'));

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/drive_elite_db.json'), 'utf8'));

const client = new Client({
  connectionString: 'postgresql://postgres:R%407356844902inan@db.uedxrvpnrpmpobbcjiyu.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function sync() {
  await client.connect();
  console.log('Connected to Supabase. Syncing data...');

  // 1. Sync Users
  for (const u of data.users) {
    await client.query(`
      INSERT INTO users (id, name, email, password, role, is_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_verified = EXCLUDED.is_verified;
    `, [u.id, u.name, u.email, u.password, u.role, u.is_verified, new Date(u.created_at)]);
  }
  await client.query(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));`);
  console.log('✓ Users synced');

  // 2. Sync Vehicles
  for (const v of data.vehicles) {
    await client.query(`
      INSERT INTO vehicles (id, make, model, year, category, daily_rate, seats, transmission, fuel_type, rating, image_url, is_available, license_plate, description, created_at)
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
        description = EXCLUDED.description;
    `, [
      v.id, v.make, v.model, v.year, v.category, v.daily_rate, v.seats,
      v.transmission, v.fuel_type, v.rating || 4.5, v.image_url,
      v.is_available !== false, v.license_plate, v.description,
      v.created_at ? new Date(v.created_at) : new Date()
    ]);
  }
  await client.query(`SELECT setval('vehicles_id_seq', COALESCE((SELECT MAX(id) FROM vehicles), 1));`);
  console.log('✓ Vehicles synced');

  // 3. Sync Bookings
  for (const b of data.bookings) {
    await client.query(`
      INSERT INTO bookings (id, user_id, vehicle_id, pickup_date, return_date, duration_days, total_cost, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        pickup_date = EXCLUDED.pickup_date,
        return_date = EXCLUDED.return_date,
        total_cost = EXCLUDED.total_cost;
    `, [
      b.id, b.user_id, b.vehicle_id, b.pickup_date, b.return_date,
      b.duration_days, b.total_cost, b.status, new Date(b.created_at)
    ]);
  }
  await client.query(`SELECT setval('bookings_id_seq', COALESCE((SELECT MAX(id) FROM bookings), 1));`);
  console.log('✓ Bookings synced');

  // Verify counts in Supabase
  const usersCount = await client.query('SELECT count(*) FROM users;');
  const vehiclesCount = await client.query('SELECT count(*) FROM vehicles;');
  const bookingsCount = await client.query('SELECT count(*) FROM bookings;');
  console.log('\n=======================================');
  console.log('SUPABASE LIVE DATABASE STATS:');
  console.log('- Total Users in Supabase:', usersCount.rows[0].count);
  console.log('- Total Vehicles in Supabase:', vehiclesCount.rows[0].count);
  console.log('- Total Bookings in Supabase:', bookingsCount.rows[0].count);
  console.log('=======================================\n');

  await client.end();
}

sync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
