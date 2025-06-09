# Policy Persistency Tracker

A comprehensive insurance policy persistency analysis and retention management system built with React and Supabase.

## 🚀 Features

### 📊 **Advanced Analytics**
- **Month-over-Month Persistency Tracking**: Accurate cohort-based analysis with enhanced date validation
- **Comprehensive State Analysis**: Sortable metrics including per-capita calculations and market penetration
- **Agent Performance Analytics**: Complete agent analysis with risk scoring and retention metrics
- **Smart Insights**: Interactive tiles with detailed drill-down capabilities

### 🎯 **Task Management**
- **Intelligent Task Distribution**: Automated assignment based on agent specialties and workload
- **Priority-Based Workflow**: High-value policy prioritization with urgency scoring
- **Direct System Integration**: One-click access to AMS policy search and CRM systems
- **Real-time Status Tracking**: Live updates on task completion and agent performance

### 📈 **Business Intelligence**
- **Risk Assessment**: Automated identification of high-risk agents and policies
- **Trend Analysis**: Rolling averages, volatility tracking, and predictive insights
- **Premium Analytics**: Revenue impact analysis and premium-at-risk calculations
- **Geographic Intelligence**: State-by-state performance with population-based metrics

### 🔧 **Technical Features**
- **Scalable Architecture**: Optimized for growing datasets with efficient data processing
- **Enhanced Data Validation**: Robust date validation and data quality indicators
- **Production-Ready Logging**: Environment-based logging with comprehensive error handling
- **Responsive Design**: Mobile-optimized interface with adaptive layouts

## 🛠️ Technology Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Charts**: Recharts for interactive data visualization
- **Backend**: Supabase (PostgreSQL, Real-time subscriptions)
- **Deployment**: Vercel
- **State Management**: React Hooks and Context

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/policy-persistency-tracker.git
   cd policy-persistency-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

## 🗄️ Database Schema

### Core Tables
- **`policies`**: Main policy data with issue dates, premiums, and termination details
- **`tasks`**: Retention tasks with priority scoring and assignment logic
- **`agents`**: Agent profiles with specialties and performance metrics

### Key Fields
- `issue_date`: Policy issue date (YYYY-MM-DD)
- `paid_to_date`: Last payment date for persistency calculation
- `annual_premium`: Policy premium for revenue analysis
- `termination_type`: NSF vs Cancellation classification
- `agent_name`: Assigned agent for performance tracking

## 📊 Persistency Calculation Logic

### Enhanced Algorithm
The system uses an improved persistency calculation that:

1. **Validates Data Quality**: Filters invalid dates and future-dated policies
2. **Cohort Analysis**: Groups policies by issue month for accurate tracking
3. **Month-Based Calculation**: Uses precise month counting between issue and paid-to dates
4. **Potential vs Actual**: Compares actual persistence against maximum possible duration
5. **Volatility Tracking**: Calculates standard deviation for trend stability analysis

### Formula
```
Persistency Rate = (Actual Months Persisted / Potential Months) × 100
```

Where:
- **Actual Months**: Issue month to paid_to month
- **Potential Months**: Issue month to current month (capped at 5 years)

## 🎯 Key Metrics

### State Analytics
- **Policies per 100K Population**: Market penetration analysis
- **Termination Rates**: NSF vs Cancellation breakdown
- **Average Premium**: Revenue per policy analysis
- **High-Value Policy Percentage**: Premium >$3,000 tracking

### Agent Analytics
- **Risk Scoring**: Termination rate-based assessment
- **Retention Score**: Success rate calculation
- **Average Duration**: Policy persistence measurement
- **Premium Performance**: Revenue generation analysis

## 🚀 Deployment

### Vercel Deployment
1. **Connect to GitHub**: Link your repository to Vercel
2. **Environment Variables**: Add Supabase credentials in Vercel dashboard
3. **Build Settings**: 
   - Build Command: `npm run build`
   - Output Directory: `build`
4. **Deploy**: Automatic deployment on push to main branch

### Production Considerations
- **Environment Variables**: Ensure all Supabase keys are properly configured
- **CORS Settings**: Configure Supabase for production domain
- **Performance**: Enable Vercel Analytics for monitoring
- **Security**: Use service role key only for server-side operations

## 📈 Performance Optimizations

### Data Processing
- **Memoized Calculations**: React.useMemo for expensive computations
- **Efficient Filtering**: Optimized data validation and processing
- **Lazy Loading**: Component-based code splitting
- **Caching**: Supabase query optimization

### User Experience
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Loading States**: Comprehensive loading indicators
- **Error Handling**: Graceful error recovery and user feedback
- **Accessibility**: WCAG compliant interface design

## 🔧 Development

### Available Scripts
- `npm start`: Development server
- `npm run build`: Production build
- `npm test`: Run test suite
- `npm run eject`: Eject from Create React App

### Code Structure
```
src/
├── components/          # React components
│   ├── InsightModal.js     # Smart insights modal
│   ├── PersistencyAnalytics.js  # Main analytics component
│   ├── TaskDashboard.js    # Task management interface
│   └── CustomerContactPanel.js  # Contact management
├── services/            # Business logic
│   ├── supabase.js         # Database client
│   ├── taskService.js      # Task distribution logic
│   └── logger.js           # Logging utilities
├── hooks/               # Custom React hooks
└── utils/               # Utility functions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Review the documentation and code comments
- Check the Supabase dashboard for database connectivity

## 🎯 Roadmap

### Upcoming Features
- **Predictive Analytics**: Machine learning-based persistency forecasting
- **Advanced Reporting**: PDF export and scheduled reports
- **API Integration**: Third-party CRM and policy system connectors
- **Mobile App**: Native mobile application for field agents
- **Real-time Notifications**: Push notifications for critical tasks

---

**Built with ❤️ for insurance professionals seeking data-driven retention insights.**
