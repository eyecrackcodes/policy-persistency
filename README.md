# Policy Persistency Tracker

A React application for tracking and analyzing insurance policy persistency data. Upload CSV files containing NSF (Non-Sufficient Funds) and cancellation data to analyze policy duration, termination patterns, and agent performance.

## Features

- 📊 **CSV Data Processing**: Upload and process NSF and cancellation CSV files
- 📈 **Data Visualization**: Interactive charts and analytics
- 💾 **Database Integration**: Automatic data persistence with Supabase
- 🔄 **Real-time Updates**: Live data loading and synchronization
- 📱 **Responsive Design**: Modern, mobile-friendly interface
- 🎯 **Performance Tracking**: Agent and policy performance metrics

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/eyecrackcodes/policy-persistency.git
cd policy-persistency
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**How to get Supabase credentials:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key

### 4. Database Setup

The application will automatically create the required database tables on first run. See `SUPABASE_SETUP.md` for detailed database configuration.

### 5. Start the Application

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. **Upload CSV Files**: Drag and drop or select NSF/cancellation CSV files
2. **View Analytics**: Explore charts and metrics on the dashboard
3. **Database Sync**: Data is automatically saved to Supabase
4. **Export Data**: Download processed data in various formats

## CSV File Format

The application expects CSV files with the following columns:

- Policy Number
- Issue Date
- Paid To Date
- Contract Date
- Annual Premium
- Agent Name
- Issue State
- Product
- Termination Reason
- And more...

## Deployment

### Vercel Deployment

1. Build the project:

```bash
npm run build
```

2. Deploy to Vercel:

```bash
npx vercel --prod
```

3. Set environment variables in Vercel dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open a GitHub issue or contact the development team.
