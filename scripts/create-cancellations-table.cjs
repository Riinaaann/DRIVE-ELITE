const path = require('path');
const { Client } = require(path.resolve(__dirname, '../lib/db/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:R%407356844902inan@db.uedxrvpnrpmpobbcjiyu.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function createTable() {
  await client.connect();
  console.log('Connected to Supabase. Creating cancellations table...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.cancellations (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      reason TEXT DEFAULT 'Cancelled by customer',
      refund_amount NUMERIC(10,2) DEFAULT 0.00,
      refund_status TEXT DEFAULT 'pending',
      cancelled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
    );
  `);
  console.log('✓ cancellations table created successfully in Supabase!');

  // Check if any cancelled bookings exist and add an entry if not already present
  const res = await client.query(`SELECT id, user_id, total_cost FROM bookings WHERE status = 'cancelled'`);
  for (const b of res.rows) {
    const existing = await client.query('SELECT id FROM cancellations WHERE booking_id = $1', [b.id]);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO cancellations (booking_id, user_id, reason, refund_amount, refund_status)
        VALUES ($1, $2, 'Customer requested cancellation', $3, 'pending')
      `, [b.id, b.user_id, b.total_cost]);
      console.log('✓ Added record for cancelled booking #' + b.id);
    }
  }

  const count = await client.query('SELECT count(*) FROM cancellations');
  console.log('Total records in cancellations table:', count.rows[0].count);

  await client.end();
}

createTable().catch(e => {
  console.error('Error creating cancellations table:', e);
  process.exit(1);
});
