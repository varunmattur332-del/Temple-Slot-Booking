-- Run this in the Supabase SQL Editor

-- 1. Create the bookings table
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  slot_id text not null,
  booking_date date not null,
  full_name text not null,
  place text not null,
  mobile text not null,
  
  -- Prevent double booking for the same slot on the same day
  unique(slot_id, booking_date)
);

-- 2. Enable Row Level Security (RLS) if you want to restrict access
-- For this simple demo, we can leave it off or create a simple policy
alter table bookings enable row level security;

-- 3. Create a policy to allow anyone to insert (since we have no auth)
-- WARNING: In a real app, you'd want some form of protection.
create policy "Enable insert for everyone" on bookings for insert with check (true);

-- 4. Create a policy to allow everyone to read bookings (to see what's booked)
create policy "Enable read access for all users" on bookings for select using (true);
