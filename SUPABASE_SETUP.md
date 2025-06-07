# Supabase Integration Setup Guide

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Environment Variables Setup

Create a `.env` file in the root directory of your project with the following variables:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### How to get your Supabase credentials:

1. **Go to your Supabase Dashboard**

   - Visit https://app.supabase.com
   - Select your project

2. **Get your Project URL**

   - Go to Settings → API
   - Copy the "Project URL" (it looks like: `https://your-project-id.supabase.co`)

3. **Get your Anon Key**
   - In the same API settings page
   - Copy the "anon public" key (starts with `eyJ...`)

## Database Tables

The application automatically creates the following tables:

### `policies` table

- Stores all policy data (both NSF and cancellation)
- Includes policy details, dates, premiums, and metadata
- Automatically indexed for performance

### `file_uploads` table

- Tracks file upload history
- Records upload status and error details
- Helps with data management and debugging

## Features

✅ **Automatic Data Persistence**: All uploaded CSV data is automatically saved to Supabase
✅ **Data Loading**: Application loads existing data from database on startup
✅ **File Upload Tracking**: Every file upload is logged with status and metadata
✅ **Error Handling**: Robust error handling with fallback to local data
✅ **Database Controls**: Refresh and clear database options in the UI

## Usage

1. **First Time Setup**:

   - Add your Supabase credentials to `.env`
   - Start the application
   - Upload your first CSV file

2. **Subsequent Uses**:
   - Application automatically loads existing data
   - New uploads are added to the database
   - Use "Refresh" button to reload data from database
   - Use "Clear DB" button to reset all data (with confirmation)

## Database Status

The application shows a database connection status indicator:

- 🟢 **Connected**: Successfully connected to Supabase
- 🔴 **Disconnected**: Connection issues or missing credentials

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables" error**

   - Ensure `.env` file exists in project root
   - Check that variable names match exactly: `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`
   - Restart the development server after adding environment variables

2. **Database connection fails**

   - Verify your Supabase project is active
   - Check that the URL and key are correct
   - Ensure your Supabase project has the required tables (they're created automatically)

3. **Data not persisting**
   - Check browser console for error messages
   - Verify database permissions in Supabase dashboard
   - Try the "Refresh" button to reload from database

### Row Level Security (RLS)

If you encounter permission errors, you may need to disable RLS or set up proper policies:

```sql
-- Disable RLS for policies table (for development)
ALTER TABLE public.policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads DISABLE ROW LEVEL SECURITY;
```

For production, set up proper RLS policies based on your authentication requirements.

## Benefits of Supabase Integration

- **Data Persistence**: Your data survives browser refreshes and application restarts
- **Backup**: All data is safely stored in the cloud
- **Collaboration**: Multiple users can access the same dataset
- **Scalability**: Handles large datasets efficiently
- **Real-time**: Potential for real-time updates across multiple sessions
- **Analytics**: Better insights with persistent historical data
