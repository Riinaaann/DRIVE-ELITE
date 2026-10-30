const path = require('path');
const { Client } = require(path.resolve(__dirname, '../lib/db/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:R%407356844902inan@db.uedxrvpnrpmpobbcjiyu.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase. Updating schema...');

  // 1. Add mileage column to vehicles
  await client.query(`
    ALTER TABLE public.vehicles 
    ADD COLUMN IF NOT EXISTS mileage TEXT;
  `);
  console.log('✓ mileage column added to vehicles table');

  // 2. Set default mileage for existing vehicles that don't have it
  await client.query(`
    UPDATE public.vehicles 
    SET mileage = CASE 
      WHEN category = 'Sports' THEN '12 km/l'
      WHEN category = 'Luxury' THEN '14 km/l'
      WHEN category = 'Electric' THEN '450 km / charge'
      ELSE '18 km/l'
    END
    WHERE mileage IS NULL OR mileage = '';
  `);
  console.log('✓ Updated existing vehicles with default mileage');

  // 3. Create reviews table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.reviews (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
    );
  `);
  console.log('✓ reviews table created successfully');

  // 4. Check if sample reviews exist, insert if empty
  const reviewCount = await client.query('SELECT count(*) FROM reviews');
  if (parseInt(reviewCount.rows[0].count) === 0) {
    const vRes = await client.query('SELECT id, make, model FROM vehicles LIMIT 3');
    for (const v of vRes.rows) {
      await client.query(`
        INSERT INTO reviews (vehicle_id, user_name, rating, comment)
        VALUES 
          ($1, 'Rahul Sharma', 5, 'Exceptional experience! The car was immaculate, drove like a dream, and pickup was seamless.'),
          ($1, 'Ananya Patel', 5, 'Super smooth ride and great mileage. Will definitely book again!'),
          ($1, 'Vikram Nair', 4, 'Very comfortable luxury vehicle. Highly recommend Elite Drive!')
      `, [v.id]);
    }
    console.log('✓ Inserted sample reviews');
  }

  // 5. Update vehicle ratings based on reviews
  await client.query(`
    UPDATE public.vehicles v
    SET rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews r WHERE r.vehicle_id = v.id),
      4.8
    );
  `);
  console.log('✓ Vehicle ratings updated based on reviews');

  console.log('All database updates completed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
