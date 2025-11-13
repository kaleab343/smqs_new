# Database Setup Guide

## Overview
SMQS is designed to support multiple database backends. Currently, it uses localStorage for demonstration. This guide covers setting up persistent storage.

## Supported Databases

### Option 1: Supabase (PostgreSQL)
1. Create Supabase project
2. Run SQL schema from `lib/db-types.ts`
3. Update environment variables:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   \`\`\`

### Option 2: Neon (PostgreSQL)
1. Create Neon project
2. Run SQL schema from `lib/db-types.ts`
3. Update environment variables:
   \`\`\`
   DATABASE_URL=postgresql://...
   \`\`\`

### Option 3: PlanetScale (MySQL)
1. Create PlanetScale database
2. Modify SQL schema for MySQL syntax
3. Update connection string

## Tables

### users
- Stores user accounts (patients, doctors, admins, receptionists)
- Indexes: email (unique), role

### queue_entries
- Current queue state
- Indexes: patient_id, doctor_id, status

### appointments
- Scheduled appointments
- Indexes: patient_id, doctor_id, date_time

### audit_logs
- System activity tracking
- Indexes: user_id, timestamp

## Migration Steps

1. Set up database credentials
2. Run SQL schema
3. Update queue-engine.ts to use database queries
4. Update auth context for database user lookup
5. Test all operations

## Backup Strategy
- Daily automated backups
- 30-day retention policy
- Test restores monthly
