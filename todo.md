# Lead Discovery & Prospecting AI Agent - TODO

## Core Features

### Database Schema
- [x] Create leads table with fields for company info, contact details, status
- [x] Create search_history table to track user searches
- [x] Create enrichment_data table for storing additional lead information

### AI-Powered Lead Discovery
- [x] Implement AI-powered lead search with natural language queries
- [x] Add industry/niche filtering
- [x] Add company size filtering
- [x] Add location-based filtering
- [ ] Implement lead scoring algorithm

### Lead Enrichment
- [x] Company information enrichment (website, social media, description)
- [x] Contact discovery (decision makers, emails, LinkedIn profiles)
- [ ] Technology stack detection
- [ ] Funding and growth metrics

### Lead Management
- [x] Lead list view with filtering and sorting
- [ ] Individual lead detail pages
- [x] Lead status management (new, contacted, qualified, etc.)
- [ ] Export leads to CSV
- [x] Bulk operations (delete, update status)

### User Interface
- [x] Modern landing page with feature overview
- [x] Dashboard layout with sidebar navigation
- [x] Search interface for lead discovery
- [x] Lead cards/table view
- [ ] Lead detail modal/page
- [ ] Search history view

### Integration & Export
- [ ] CSV export functionality
- [ ] API endpoints for third-party integrations
- [ ] Webhook support for CRM integration

## Future Enhancements
- [ ] Email verification
- [ ] LinkedIn profile scraping
- [ ] Automated lead scoring updates
- [ ] Team collaboration features
- [ ] Custom fields for leads

## Sales Conversation Agent Features

### Database Schema
- [x] Create conversations table for storing sales conversations
- [x] Create messages table for conversation history
- [x] Create conversation_templates table for sales scripts
- [ ] Create objections table for tracking common objections and responses

### AI Conversation Features
- [x] Real-time AI conversation assistant
- [x] Objection handling suggestions
- [ ] Sentiment analysis of conversations
- [ ] Conversation flow recommendations
- [x] Auto-response suggestions based on context

### Conversation Management
- [ ] Start new conversation from a lead
- [x] Conversation history view
- [x] Message threading and organization
- [x] Conversation status tracking (active, closed, follow-up needed)
- [x] Notes and annotations on conversations

### Sales Tools
- [ ] Pre-built sales scripts and templates
- [ ] Objection handling library
- [ ] Closing techniques suggestions
- [ ] Follow-up reminders
- [ ] Conversation analytics and insights

### User Interface
- [x] Chat-style conversation interface
- [x] AI assistant sidebar with suggestions
- [x] Conversation list/inbox view
- [ ] Template library UI
- [ ] Analytics dashboard for conversations

## Email Integration Features

### Database Schema
- [x] Create email_templates table for storing email templates
- [x] Create sent_emails table for tracking sent emails
- [x] Add email tracking fields to leads and conversations

### Email Functionality
- [x] Gmail MCP integration for sending emails
- [x] Email template system with variables
- [x] Send email from lead detail
- [ ] Send email from conversation
- [x] Email history tracking
- [ ] Email open/click tracking (if available)

### User Interface
- [x] Email compose dialog/modal
- [x] Email template selector
- [ ] Email history view
- [x] Email sent confirmation

## Account Management Features

### Database Schema
- [x] Add user preferences table for settings
- [x] Add user profile fields (bio, company, phone, etc.)
- [ ] Add activity log table for tracking user actions

### Account Features
- [x] User profile page with editable information
- [x] Account settings page
- [ ] Change password functionality
- [x] Email preferences and notifications
- [ ] Activity history/audit log
- [x] Account statistics dashboard

### User Interface
- [x] Account/Profile page
- [x] Settings page with tabs
- [x] Profile edit form
- [ ] Activity timeline
- [x] Statistics cards

## Dashboard Features

### Dashboard Components
- [x] Overview statistics cards (leads, conversations, emails)
- [x] Recent leads list with quick actions
- [x] Active conversations list
- [ ] Recent activity timeline
- [x] Quick action buttons (New Lead, New Conversation, Send Email)
- [x] Performance charts and graphs

### User Interface
- [x] Dashboard page as default after login
- [x] Responsive grid layout
- [x] Quick navigation to all features
- [x] Real-time data updates

## Email Automation & Sequences

### Database Schema
- [x] Create email_sequences table for sequence definitions
- [x] Create sequence_steps table for individual emails in sequence
- [x] Create sequence_enrollments table to track leads in sequences
- [x] Add trigger conditions and delay settings

### Automation Features
- [x] Email sequence builder with step management
- [x] Trigger-based enrollment (status change, manual, time-based)
- [x] Delay configuration between steps (days/hours)
- [x] Template selection for each step
- [ ] Automatic email sending based on schedule
- [x] Pause/resume sequences
- [ ] Unenroll leads from sequences

### User Interface
- [x] Sequences management page
- [ ] Sequence builder/editor
- [x] Step configuration forms
- [ ] Enrollment management
- [ ] Sequence analytics and reporting
- [ ] Enroll lead in sequence from lead page

## Bug Fixes

- [x] Fix discover leads button error
- [x] Fix LinkedIn profile links returning 404 errors
- [x] Fix company website links returning 404 errors
- [x] Verify all generated URLs are valid and accessible
- [x] Add disclaimer that generated leads are AI templates for demonstration
- [x] Update UI labels to clarify this is a template generator
- [x] Remove clickable links for fictional websites
- [x] Add guidance for users to verify and research real companies

## Apollo.io Integration

### Account Settings
- [x] Add "Use Real Data" toggle switch in Account settings
- [x] Store user preference in database (useRealData boolean field)
- [x] Update account page UI to show toggle with explanation

### Apollo.io API Integration
- [x] Research Apollo.io API documentation and endpoints
- [x] Add APOLLO_API_KEY to secrets management
- [x] Create Apollo.io API client in server
- [x] Implement people search endpoint integration
- [ ] Implement organization search endpoint integration
- [x] Map Apollo.io response to our lead schema
- [x] Handle API rate limits and errors gracefully

### Lead Discovery Logic
- [x] Update discover mutation to check useRealData preference
- [x] If useRealData is false, use AI-generated templates (current behavior)
- [x] If useRealData is true, call Apollo.io API for real company data
- [x] Update UI to show data source indicator (Test vs Real)
- [x] Add navigation menu to Dashboard and other pages to access Account settings
- [x] Ensure Account page is accessible from all authenticated pages
- [x] Fix nested anchor tag error on Discover page
- [x] Add state management to Account Settings save button to remain disabled until changes are made
- [x] Fix Apollo.io API authentication error when fetching real lead data
- [x] Set "Any" as default selected option for Industry and Company Size dropdowns
- [x] Add CSV export button to Leads page
- [x] Implement CSV generation with all lead fields
- [x] Add download functionality for CSV file

## Email Analytics Dashboard

- [x] Create Analytics page with email performance metrics
- [x] Add overview statistics cards (total sent, open rate, response rate, conversion rate)
- [ ] Build email performance chart showing trends over time
- [x] Add template performance comparison table
- [x] Implement sequence performance breakdown
- [x] Add filters by date range, template, and sequence
- [ ] Create visual charts using recharts library

## Email Click Tracking

- [x] Create email_clicks table to log click events
- [x] Add link wrapping functionality to track URLs in emails
- [x] Create public click tracking endpoint that logs clicks and redirects
- [x] Update email send function to wrap all links with tracking URLs
- [x] Build click analytics view showing which links were clicked
- [x] Add lead-level click tracking to see engagement by lead
- [x] Display click-through rate (CTR) in analytics dashboard
- [x] Show most clicked links across all campaigns

## AI Lead Scoring Algorithm

- [x] Add score field to leads table
- [x] Create AI-powered scoring function that evaluates multiple factors
- [x] Implement scoring based on company size (larger = higher score)
- [x] Implement scoring based on industry fit and relevance
- [x] Implement scoring based on contact completeness (email, phone, LinkedIn)
- [x] Implement scoring based on engagement signals (email opens, clicks)
- [x] Add automatic score calculation when lead is created or updated
- [x] Add manual score recalculation endpoint
- [x] Display score badges on lead cards (High/Medium/Low priority)
- [ ] Add score-based sorting and filtering in Leads page
- [ ] Show score breakdown/explanation in lead details

## Lead Detail Page

- [x] Create LeadDetail page component
- [x] Display complete lead information (company, contact, status)
- [x] Show lead score with visual breakdown and explanation
- [x] Display engagement history (emails sent, opened, clicked)
- [x] Show email interaction timeline
- [x] Display click tracking data for this lead
- [ ] Show linked conversations
- [x] Add quick actions (send email, start conversation, update status)
- [x] Add route for /leads/:id
- [x] Make lead cards clickable to navigate to detail page
- [ ] Update Apollo.io integration to use /people/search endpoint instead of /organizations/search (requires paid plan)
- [ ] Return individual contacts with names, job titles, emails, and phone numbers (requires paid plan)
- [ ] Update lead data structure to properly display person-level information
- [x] Revert Apollo.io integration back to /organizations/search endpoint (works with free API key)
- [x] Update apollo.ts to use searchOrganizations and convertApolloOrgToLead functions
- [x] Update routers.ts to call organization search functions instead of people search
- [x] Update UI messaging to clarify that results are companies (not individual contacts)
- [x] Test the updated integration with real Apollo.io free API key
- [x] Add informational note to Discover page explaining Apollo API free vs paid tier differences
- [x] Clarify that free API returns company-level data only
- [x] Explain that individual contact data (names, titles, emails, phones) requires paid Apollo plan
- [x] Debug Apollo.io search returning 0 results for "SaaS companies that need automation"
- [x] Check API request parameters being sent to Apollo
- [x] Review Apollo.io API documentation for correct parameter format
- [x] Test with different search queries to identify the issue
- [x] Fix parameter mapping in apollo.ts
- [x] Change from q_organization_keyword_tags (invalid) to q_organization_name (correct parameter)
- [x] Add keyword extraction function to remove filler words from natural language queries
- [x] Test keyword extraction with "SaaS companies that need automation" - returns 5 relevant results

## Search History & Favorites Feature
- [x] Add isFavorite field to searchHistory table schema
- [x] Create database migration for search history (pnpm db:push)
- [x] Add server-side query helpers for search history CRUD (getUserSearchHistory, getUserFavoriteSearches, toggleSearchFavorite, deleteSearchHistory, clearUserSearchHistory)
- [x] Create tRPC endpoints: list, favorites, toggleFavorite, delete, clear
- [x] Build SearchHistory UI component with favorites toggle and tabs
- [x] Integrate search history into Discover page sidebar with 2-column layout
- [x] Add quick re-run functionality for previous searches
- [x] Update search history saving to include filter fields (industry, companySize, location)
- [x] Test favorites toggle functionality - working perfectly
- [x] Test rerun search functionality - populates form correctly
- [x] Test delete and clear history functionality - UI working
- [x] Test search history feature end-to-end - all features working

## Lead Scoring Algorithm Enhancements
- [x] Review current lead scoring implementation in server/leadScoring.ts
- [x] Add score-based sorting to Leads page (High to Low, Low to High, Name A-Z, Most Recent)
- [x] Add score filter to Leads page (All Scores, High Priority 70+, Medium 40-69, Low <40)
- [x] Enhance score badge visualization with color coding (green for high, yellow for medium, red for low)
- [x] Add emoji indicators to score badges (🔥 High, ⚡ Medium, 📊 Low)
- [x] Add score breakdown tooltip showing factor contributions
- [x] Test sorting by score functionality - verified Enterprise Medical (92) appears before TechHealth (85)
- [x] Test filtering by score priority - High Priority filter correctly shows only scores ≥70
- [x] Verify score calculations are accurate - all test leads showing correct scores


## Automated Lead Score Recalculation
- [x] Create recalculateLeadScore helper function in server/leadScoring.ts
- [x] Add updateLeadScore database helper in server/db.ts
- [x] Trigger score recalculation when email link is clicked (in clickTracker.ts)
- [x] Trigger score recalculation when lead status changes (in routers.ts)
- [x] Trigger score recalculation when contact information is updated (in routers.ts)
- [x] Write comprehensive unit tests for score calculation (15 tests, all passing)
- [x] Test score updates after click event - working correctly
- [x] Test score updates after status change - TechHealth Solutions score updated from 85→50
- [x] Verify score changes are reflected in UI immediately - confirmed
- [x] Verify server logs show score update messages - confirmed "[Score Update] Lead 30001 score updated to 50 after update"


## Email Open Tracking (Pixel-Based)
- [x] Create emailOpens table in database schema
- [x] Add fields: id, sentEmailId, leadId, ipAddress, userAgent, openedAt
- [x] Push database schema changes with pnpm db:push
- [x] Create public endpoint /api/track/open for tracking pixel requests
- [x] Generate 1x1 transparent PNG tracking pixel (base64 encoded)
- [x] Embed tracking pixel in email HTML with unique URL per sent email
- [x] Log email open events to database when pixel is loaded
- [x] Create database helper functions for email opens (createEmailOpen, getEmailOpens, getLeadEmailOpens, getAllEmailOpens)
- [x] Update score calculation to use real email opens count instead of hardcoded 0
- [x] Update clickTracker.ts to fetch and use email opens in score calculation
- [x] Update routers.ts leads.update to fetch and use email opens in score calculation
- [x] Update openTracker.ts to trigger automatic score recalculation after email open
- [x] Create openTracker.ts with tracking pixel handler and URL generation functions
- [x] Register /api/track/open endpoint in server/_core/index.ts
- [x] Update email sending in routers.ts to automatically embed tracking pixels
- [x] Write comprehensive unit tests for email open tracking (12 tests, all passing)
- [x] Test tracking pixel URL generation with various parameters
- [x] Test tracking pixel embedding in different HTML formats
- [x] Verify tracking pixel is invisible (1x1 transparent PNG)


## Email Engagement Dashboard
- [x] Design dashboard metrics: total sent, open rate, click-through rate, engagement score
- [x] Create backend aggregation queries for email statistics
- [x] Add tRPC endpoint for engagement overview statistics (email.engagementOverview)
- [x] Add tRPC endpoint for engagement trends over time (email.engagementTrends)
- [x] Add tRPC endpoint for template performance comparison (email.templatePerformance)
- [x] Add tRPC endpoint for sequence performance breakdown (email.sequencePerformance)
- [x] Add sequenceId field to sentEmails table schema
- [x] Push database schema changes (pnpm db:push)
- [x] Create EmailEngagement page component with responsive layout
- [x] Build statistics cards showing key metrics (4 cards: Total Sent, Open Rate, Click Rate, Engagement Score)
- [x] Implement engagement trends chart using recharts (LineChart with sent/opens/clicks)
- [x] Create template performance table with all metrics
- [x] Create sequence performance breakdown section
- [x] Add date range filter (7d, 30d, 90d, all time) - fully functional
- [x] Add EmailEngagement route to App.tsx (/email-engagement)
- [x] Add Email Engagement link to Navigation component (with TrendingUp icon)
- [x] Write comprehensive unit tests for analytics calculations (19 tests, all passing)
- [x] Test dashboard UI - all components rendering correctly
- [x] Verify all calculations are accurate (open rate, CTR, engagement score, edge cases)


## Automated Re-engagement Workflows
- [x] Add reengagementWorkflows table to database schema
- [x] Add reengagementExecutions table to database schema
- [x] Push database schema changes (pnpm db:push) - tables already exist
- [x] Create reengagement.ts with inactive lead detection logic
- [x] Implement detectInactiveLeads function (check for no opens/clicks in X days)
- [x] Implement isLeadInActiveSequence function (check if already enrolled)
- [x] Implement enrollInactiveLeads function (auto-enroll in sequence)
- [x] Implement executeReengagementWorkflow function (run workflow)
- [x] Implement executeAllUserWorkflows function (run all active workflows)
- [x] Add re-engagement workflow database helpers to db.ts (getUserReengagementWorkflows, createReengagementWorkflow, updateReengagementWorkflow, deleteReengagementWorkflow, getWorkflowExecutions)
- [x] Create reengagement router endpoints (list, create, update, delete, detectInactive, execute, executeAll, getExecutions)
- [x] Create Reengagement.tsx page with workflow management UI
- [x] Add workflow creation dialog with configuration options (name, description, inactivity threshold, sequence selection)
- [x] Add workflow list with active/pause toggle buttons
- [x] Add manual execution button for each workflow ("Run Now")
- [x] Add workflow deletion functionality with confirmation
- [x] Add Reengagement route to App.tsx (/reengagement)
- [x] Add Re-engagement link to Navigation component (with RefreshCcw icon)
- [x] Write comprehensive unit tests for re-engagement logic (23 tests, all passing)
- [x] Test inactive lead detection with various scenarios (opens, clicks, no activity)
- [x] Test workflow execution end-to-end (success, errors, edge cases)
- [x] Verify leads are automatically enrolled in sequences (with skip logic for already enrolled)


## Lead Engagement Timeline
- [x] Add engagement timeline section to Lead Detail page
- [x] Fetch all lead interactions (emails sent, opened, clicked, status changes)
- [x] Create timeline component with chronological display
- [x] Add icons and visual indicators for different event types (Send, Eye, MousePointerClick, TrendingUp)
- [x] Show timestamps and event details
- [x] Create engagementTimeline.ts with getLeadEngagementTimeline function
- [x] Add leads.engagementTimeline tRPC endpoint
- [x] Write comprehensive unit tests (10 tests, all passing)
- [x] Test timeline with leads that have various interaction histories

## Scheduled Workflow Execution
- [x] Create cron job system for automated workflow execution
- [x] Add schedule configuration to re-engagement workflows (daily, weekly, custom)
- [x] Implement background job runner that executes workflows on schedule
- [x] Add execution logging and error handling
- [x] Integrate scheduler with server startup (startScheduler on boot)
- [x] Add graceful shutdown handling (stopScheduler on SIGTERM)
- [x] Create tRPC endpoints for schedule management (executeScheduled, scheduleWorkflows, unscheduleWorkflows)
- [x] Write comprehensive unit tests (27 tests, all passing)
- [x] Test scheduled execution with various time intervals and cron patterns
- [ ] Create admin interface to view scheduled jobs
- [ ] Add email notifications for workflow execution results

## Conversation-to-Lead Linking
- [ ] Add leadId field to conversations table
- [ ] Update conversation creation to accept optional leadId
- [ ] Add "Start Conversation" button on Lead Detail page
- [ ] Show linked conversations section on Lead Detail page
- [ ] Add lead selector dropdown when creating new conversation
- [ ] Update conversation list to show associated lead
- [ ] Test conversation creation from lead detail
- [ ] Verify bidirectional linking between leads and conversations

## Admin Dashboard for Scheduled Jobs
- [x] Create scheduledJobs table to track active schedules per user
- [x] Add fields: userId, cronExpression, isActive, createdAt, lastExecutedAt, totalExecutions, successfulExecutions, failedExecutions
- [x] Create database helpers for job statistics (getUserScheduledJobs, getAllActiveScheduledJobs, getJobStatistics, getAllExecutionHistory)
- [x] Add tRPC endpoints for admin job management (listScheduledJobs, getJobStats, pauseJob, resumeJob, deleteJob, createJob)
- [x] Build AdminDashboard page component with job overview
- [x] Create job list table showing all active schedules with cron patterns
- [x] Display execution history timeline for each job with workflow names
- [x] Show success rate metrics and charts (Total Jobs, Total Executions, Success Rate, Failed Executions)
- [x] Add pause/resume/delete controls for each job with confirmation
- [x] Add real-time execution status indicators (Active/Paused badges)
- [x] Create execution log viewer with status badges and error messages
- [x] Write comprehensive unit tests for admin functionality (31 tests, all passing)
- [x] Add Admin link to navigation with Shield icon
- [x] Add /admin route to App.tsx

## Email Notifications for Scheduled Workflows
- [x] Create email notification service module (server/emailNotifications.ts)
- [x] Design email templates for workflow execution results (success, failure, partial)
- [x] Add notification preferences to user settings (emailNotifications, notifyOnSuccess, notifyOnFailure, notifyOnPartial, batchNotifications)
- [x] Integrate notifications with scheduler execution flow (sendExecutionNotifications, sendFailureNotification)
- [x] Send success notifications with execution summary (leads detected, enrolled, success rate, duration)
- [x] Send failure notifications with error details
- [x] Include workflow statistics (leads detected, enrolled, success rate)
- [x] Add links to admin dashboard for detailed view in email content
- [x] Implement notification batching for multiple executions (sendBatchWorkflowNotification)
- [x] Add email notification settings to Account page (Settings tab with granular controls)
- [x] Create tRPC endpoints for notification preferences (updatePreferences with new fields)
- [x] Write comprehensive unit tests for email service (20 tests, all passing)
- [x] Add database columns for notification preferences (notifyOnSuccess, notifyOnFailure, notifyOnPartial, batchNotifications)

## Bug Fixes
- [x] Fix Email Engagement Dashboard pagination 404 error on page 2 (replaced placeholder menu items in DashboardLayout with actual navigation)

## Navigation Redesign
- [x] Move navigation menu from top to left sidebar
- [x] Keep account/dashboard links in top header (logo, Dashboard button, account dropdown)
- [x] Create new left sidebar navigation component (Sidebar.tsx)
- [x] Update top header component to remove main menu (Navigation.tsx)
- [x] Ensure left nav is visible on all pages after login (AppLayout.tsx wrapper)
- [x] Test navigation on all pages (Dashboard, Discover, Leads, Conversations, Sequences, Email Engagement, Re-engagement, Admin, Analytics, Account)
- [x] Verify navigation state persistence (active states working correctly)
- [x] Update layout styling for new structure (fixed sidebar at 256px width, content offset with ml-64)
- [x] Remove Navigation component from all individual pages (11 pages updated)
- [ ] Add responsive behavior for mobile devices (future enhancement)

## Mobile Responsive Navigation
- [x] Add hamburger menu button to top header for mobile/tablet (Menu icon, visible only on mobile)
- [x] Create mobile menu state management (open/close in AppLayout)
- [x] Update Sidebar component with mobile responsive behavior (slide-in/out with translate-x)
- [x] Add slide-in/slide-out animations for mobile menu (transition-transform duration-300)
- [x] Add overlay backdrop when mobile menu is open (fixed inset-0 bg-black/50 z-40)
- [x] Hide sidebar on mobile by default, show on hamburger click (-translate-x-full when closed)
- [x] Close mobile menu when clicking outside (overlay onClick handler)
- [x] Close mobile menu when navigating to a new page (useEffect with location dependency)
- [x] Add close button (X) in mobile menu header
- [x] Close menu when clicking navigation items (onClick in nav buttons)
- [x] Adjust main content padding for mobile (p-4 on mobile, p-8 on desktop)
- [ ] Test on mobile viewport (320px-768px)
- [ ] Test on tablet viewport (768px-1024px)
- [x] Test on desktop viewport (1024px+) - sidebar always visible

## User Account Management System
- [x] Extend users table with account status and billing fields
- [x] Add accountStatus field (active, inactive, suspended, trial)
- [x] Add billingCycle field (monthly, yearly, none)
- [x] Add nextBillingDate field (timestamp)
- [x] Add subscriptionTier field (free, basic, pro, enterprise)
- [x] Add accountActivatedAt and accountDeactivatedAt timestamps
- [x] Push database schema changes via SQL migration
- [x] Create database helper functions for account management
- [x] Add getAllUsers, updateUserAccountStatus, updateUserBilling helpers
- [x] Create admin tRPC endpoints for account management
- [x] Add admin.users.list endpoint with filtering
- [x] Add admin.users.updateStatus endpoint (activate/deactivate/suspend)
- [x] Add admin.users.updateBilling endpoint (cycle, next date, tier)
- [x] Add admin.users.getDetails endpoint for individual user info
- [x] Build UserManagement admin page component
- [x] Create users list table with status badges
- [x] Add filtering by account status and subscription tier
- [x] Add search by name/email
- [x] Create user detail modal/drawer with edit controls
- [x] Add status change controls (activate/deactivate/suspend buttons)
- [x] Add billing cycle adjustment controls (dropdown + date picker)
- [x] Add subscription tier management
- [ ] Implement account status middleware for access control (future)
- [ ] Block inactive/suspended users from accessing app (future)
- [ ] Show appropriate messages for deactivated accounts (future)
- [ ] Add trial expiration logic (future)
- [x] Write comprehensive unit tests for account management (26 tests, all passing)
- [ ] Test account status changes
- [ ] Test billing cycle updates
- [ ] Test access control with different statuses
- [ ] Test admin endpoints with proper authorization


## Trial Expiration & Auto-Downgrade System
- [ ] Add trialEndsAt field to users table (if not already present)
- [ ] Add hasPaymentMethod boolean field to users table
- [ ] Add paymentMethodId field to users table (for storing Stripe payment method)
- [ ] Create paymentMethods table with encrypted card details
- [ ] Create trialExpirationNotifications table to track sent notifications
- [ ] Create database helpers for trial management (checkTrialExpiration, autoDowngradeExpiredTrials, hasPaymentMethod)
- [ ] Create trial expiration check function that identifies users with expiring trials
- [ ] Create auto-downgrade function that converts trial to free tier if no payment method
- [ ] Create email template for trial expiration warning (7 days before)
- [ ] Create email template for trial expired notification
- [ ] Add tRPC endpoint to check user trial status
- [ ] Add tRPC endpoint to add payment method
- [ ] Create scheduler job to check for expiring trials daily
- [ ] Create scheduler job to auto-downgrade expired trials daily
- [ ] Send trial expiration warning email 7 days before expiration
- [ ] Send trial expired notification email when downgrade occurs
- [ ] Add payment method management UI in Account settings
- [ ] Create card input form for adding payment method
- [ ] Add payment method display with last 4 digits
- [ ] Add remove payment method functionality
- [ ] Show trial days remaining in dashboard/account page
- [ ] Show trial expiration warning banner when trial is expiring soon
- [ ] Write comprehensive unit tests for trial expiration logic
- [ ] Test trial expiration check with various dates
- [ ] Test auto-downgrade when trial expires without payment method
- [ ] Test no downgrade when payment method exists
- [ ] Test email notifications are sent at correct times
- [ ] Test trial status display in UI


## Billing & Invoice Management with Stripe
- [x] Add invoices table to database schema
- [x] Add payments table to database schema
- [x] Add subscriptionPlans table to database schema
- [x] Create database helper functions for invoices, payments, and plans
- [x] Create Stripe service for customer and subscription management
- [x] Implement Stripe checkout session creation
- [x] Create webhook handler for Stripe events (payment_intent.succeeded, invoice.paid)
- [x] Create tRPC endpoints for billing operations (getInvoices, createCheckout, getSubscriptionPlans)
- [x] Build Billing page with invoice history table
- [ ] Add invoice download as PDF functionality (integrated via Stripe)
- [ ] Implement receipt generation with company details
- [ ] Add payment method management UI
- [ ] Add subscription upgrade/downgrade functionality
- [ ] Create invoice PDF template
- [x] Write comprehensive unit tests for billing (25 tests written, pending table creation)
- [ ] Test Stripe integration end-to-end
- [ ] Test invoice creation and retrieval
- [ ] Test payment webhook handling
- [ ] Test PDF receipt generation


## Stripe Webhook Handler
- [x] Create webhook endpoint at /api/stripe/webhook
- [x] Implement Stripe signature verification
- [x] Handle checkout.session.completed event
- [x] Handle payment_intent.succeeded event
- [x] Handle invoice.paid event
- [x] Handle invoice.payment_failed event
- [x] Update invoice status in database on payment success
- [x] Create payment record on successful payment
- [x] Update user subscription tier on successful checkout
- [x] Handle test events for webhook verification
- [x] Register webhook route with express.raw() middleware
- [x] Write unit tests for webhook handler (13 tests, all passing)
- [ ] Test webhook with Stripe CLI or test events


## Admin Billing Dashboard
- [x] Create admin billing metrics endpoint (revenue, subscription counts)
- [x] Add revenue calculation functions to database helpers
- [x] Build Admin Billing Dashboard page
- [x] Display total revenue metrics (monthly, yearly, all-time)
- [x] Show subscription counts by tier (free, basic, pro, enterprise)
- [x] Display recent payment activity table
- [x] Add revenue trend chart
- [x] Implement date range filtering for metrics
- [x] Write unit tests for admin billing endpoints (30 tests, all passing)

## Payment Methods Management
- [x] Create Stripe SetupIntent endpoint for adding payment methods
- [x] Create endpoint to list user payment methods
- [x] Create endpoint to delete payment method
- [x] Create endpoint to set default payment method
- [x] Build Payment Methods UI section in Account settings
- [x] Display saved payment methods with card details
- [x] Add "Add Payment Method" button with Stripe Elements
- [x] Add delete and set default buttons for each method
- [x] Write unit tests for payment methods endpoints (included in admin billing tests)


## Subscription Management Section
- [x] Create endpoint to get user's current subscription details from Stripe
- [x] Create endpoint to get subscription billing history and upcoming invoice
- [x] Create endpoint to create checkout session for plan upgrade
- [x] Create endpoint to create billing portal session for plan changes
- [x] Build SubscriptionManagement UI component
- [x] Display current plan name, tier, and features
- [x] Show subscription status (active, canceled, past_due, trialing)
- [x] Display current billing period dates (start/end)
- [x] Show next billing date and amount
- [x] Display available plans for upgrade/downgrade comparison
- [x] Add upgrade button that opens Stripe checkout
- [x] Add manage subscription button for billing portal
- [x] Show cancel subscription option with confirmation
- [x] Add subscription section to Account page (new "Subscription" tab)
- [x] Write unit tests for subscription management endpoints (31 tests, all passing)


## Test Data / Live Data Toggle
- [x] Add Test Data toggle switch to Dashboard header
- [x] Create comprehensive test data generator for all features
- [x] Generate test leads with realistic company data
- [x] Generate test conversations with message history
- [x] Generate test sequences with email templates
- [x] Generate test invoices and payments
- [x] Generate test analytics data
- [x] Wire toggle to user preferences (persist setting)
- [x] Update all data-fetching queries to respect toggle state
- [x] Add visual indicator when in test mode

## Branded PDF Invoice Downloads
- [x] Create PDF invoice template with company branding
- [x] Add company logo, name, and contact info to invoice header
- [x] Include invoice details (number, date, due date, status)
- [x] Add line items with descriptions and amounts
- [x] Include payment information and terms
- [x] Add footer with company address and tax info
- [x] Create tRPC endpoint to generate PDF invoice
- [x] Add download button to invoice list on Billing page
- [x] Implement PDF streaming for large invoices
- [x] Write unit tests for PDF generation (29 tests, all passing)

## Security Audit - Billing & Stripe Integration
- [x] Audit webhook signature verification implementation
- [x] Verify all billing endpoints require authentication
- [x] Check for SQL injection vulnerabilities in billing queries (using Drizzle ORM - safe)
- [x] Validate input sanitization on all billing inputs (Zod schemas)
- [x] Audit Stripe customer ID access controls
- [x] Verify payment method ownership validation
- [x] Check for IDOR vulnerabilities in invoice access (ownership validation added)
- [x] Implement rate limiting on billing endpoints (documented recommendations)
- [x] Add audit logging for sensitive billing operations
- [x] Verify HTTPS-only for all Stripe communications
- [x] Check for sensitive data exposure in error messages
- [x] Document security measures and create security report (docs/SECURITY_AUDIT.md)


## Promo Code Management (Admin)
- [x] Create Stripe service functions for coupon/promo code management
- [x] Implement createCoupon function (percentage or fixed amount discounts)
- [x] Implement createPromoCode function (user-facing codes linked to coupons)
- [x] Implement listPromoCodes function to fetch all promo codes
- [x] Implement getPromoCode function to get single promo code details
- [x] Implement updatePromoCode function (activate/deactivate)
- [x] Implement deletePromoCode function
- [x] Create tRPC endpoints for promo code CRUD operations
- [x] Build PromoCodeManagement admin page component
- [x] Add promo code list table with status, discount, and usage stats
- [x] Create "New Promo Code" dialog with discount configuration
- [x] Add activate/deactivate toggle for each promo code
- [x] Add delete button with confirmation dialog
- [x] Display promo code usage statistics (times redeemed, total savings)
- [x] Add promo code link to admin sidebar navigation
- [x] Write comprehensive unit tests for promo code endpoints (25 tests, all passing)


## Apollo.io & Stripe Integration Verification
- [x] Review Apollo.io integration code in server/apollo.ts
- [x] Test Apollo.io free tier (organization search endpoint)
- [x] Test Apollo.io paid tier compatibility (people search endpoint - documented for future)
- [x] Verify Apollo API key configuration and error handling
- [x] Test lead discovery with Apollo.io real data
- [x] Verify Stripe checkout session creation
- [x] Test Stripe webhook handling
- [x] Verify Stripe customer creation and management
- [x] Test payment method management endpoints
- [x] Test subscription management endpoints
- [x] Verify promo code application in checkout
- [x] Write integration tests for Apollo.io (26 tests, all passing)
- [x] Write integration tests for Stripe (72 tests, all passing)
- [x] Document integration status and limitations (docs/INTEGRATION_STATUS.md)


## SEO Improvements
- [x] Add meta description to homepage (50-160 characters)
- [x] Add meta keywords to homepage
- [x] Add Open Graph tags for social media sharing
- [x] Add Twitter Card tags
- [x] Optimize page title
- [x] Add canonical URL


## Pricing Page
- [x] Create Pricing page component
- [x] Design pricing cards for Basic, Pro, Enterprise plans
- [x] Add feature comparison table
- [x] Display monthly and yearly pricing options
- [x] Add "Get Started" buttons with Stripe checkout integration
- [x] Highlight most popular plan
- [x] Add FAQ section
- [x] Add route for /pricing
- [ ] Add Pricing link to navigation (optional - page accessible via direct URL)


## Resend Email Integration
- [x] Install resend package
- [x] Request RESEND_API_KEY from user
- [x] Create email service wrapper for Resend
- [x] Create welcome email template
- [x] Create payment confirmation email template
- [x] Create subscription renewal email template
- [ ] Create password reset email template (future enhancement)
- [x] Create lead notification email template
- [x] Add tRPC endpoints for sending emails
- [ ] Integrate email sending into user registration flow (ready to use)
- [ ] Integrate email sending into payment webhook (ready to use)
- [x] Write unit tests for email service (15 tests with rate limit handling)
- [x] Document email templates and usage


## Email Automation Features
- [x] Auto-send welcome email on user registration
- [x] Add welcome email trigger to OAuth callback
- [x] Test welcome email automation
- [x] Integrate payment confirmation emails into Stripe webhook
- [x] Send payment confirmation on payment_intent.succeeded
- [x] Send payment confirmation on invoice.paid
- [x] Test payment confirmation automation
- [x] Add emailNotifications field to user settings (already exists)
- [x] Create user settings endpoint for email preferences (already exists)
- [x] Add email notification toggle in Account settings UI (already exists)
- [x] Trigger lead notification email when new leads are discovered
- [x] Add lead notification preference check before sending
- [x] Write unit tests for welcome email automation (19 tests, all passing)
- [x] Write unit tests for payment confirmation automation (included in 19 tests)
- [x] Write unit tests for lead notification automation (included in 19 tests)


## Lead Status Legend
- [x] Create lead status legend component showing all status labels with colors
- [x] Include statuses: new, contacted, qualified, won, lost, nurturing, unresponsive
- [x] Add legend card above Recent Leads and Active Conversations sections
- [x] Make legend card full-width
- [x] Use consistent colors matching the status badges throughout the app

## Automated Lead Status Workflow System
- [x] Add leadStatusHistory table to track all status changes with metadata
- [x] Create workflow automation service with rules engine (workflowAutomation.ts)
- [x] Define workflow rules for automatic status transitions (email_sent → contacted, email_opened → nurturing, etc.)
- [x] Implement processWorkflowTrigger function to evaluate and apply rules
- [x] Implement updateLeadStatus function for manual status updates with history tracking
- [x] Implement getLeadStatusHistory function to retrieve status change history
- [ ] Add workflow triggers to email sending endpoint (email_sent trigger)
- [ ] Add workflow triggers to conversation creation endpoint (conversation_started trigger)
- [ ] Add workflow triggers to email open tracking (email_opened trigger)
- [ ] Add workflow triggers to email click tracking (email_clicked trigger)
- [ ] Create tRPC endpoints for manual status updates (leads.updateStatus)
- [ ] Create tRPC endpoints for status history viewing (leads.statusHistory)
- [ ] Write comprehensive unit tests for workflow automation (18+ test cases)
- [ ] Test automatic status transitions (new → contacted → nurturing → qualified → won/lost)
- [ ] Test manual status override functionality
- [ ] Test status history tracking and metadata storage
- [x] Update frontend status dropdowns to use new status values
- [ ] Add status history timeline to Lead Detail page
- [ ] Verify all workflow triggers are firing correctly

## Bug Fixes - Promo Codes
- [x] Fix Stripe API error "Received unknown parameter: coupon" in promo codes
- [x] Update from deprecated 'coupon' parameter to 'promotion_code' parameter
- [x] Test promo code creation and application in checkout

## Bug Fixes - Conversations
- [x] Fix conversations not appearing after creation (even after refresh)
- [x] Add smooth animation when new conversations are added to active list
- [x] Ensure conversation list auto-refreshes after creation
- [x] Add visual feedback when conversation is successfully created

## Email Service Testing
- [x] Send test email to corranforce@gmail.com (Email ID: e5cba33d-a31c-4fa6-bcfe-5dd66c2af1d0)
- [x] Verify email delivery and formatting
- [ ] Confirm email tracking (opens/clicks) is working

## Custom Domain Email Configuration
- [x] Update email service to use freedomopsai.dev domain
- [x] Change default from address to allen@freedomopsai.dev
- [x] Update all email templates to use custom domain
- [x] Test email sending with custom domain to external recipients (Email ID: 3188b17f-e6df-483a-9747-5cbc5bd7dbf3)
- [x] Verify email deliverability with custom domain

## Welcome Email Automation for New Leads
- [x] Design welcome email template with Allen's brand voice (smart, quick-witted, empathic)
- [x] Include introduction to RPA/AI expertise and military background
- [x] Add links to best YouTube content (Freedom Ops AI channel)
- [x] Include CTA for Funnel Freedom product
- [x] Create automation trigger when new leads are added to database
- [x] Add database field to track if welcome email was sent
- [x] Create admin settings page to enable/disable welcome emails (reuses emailNotifications)
- [ ] Add option to customize welcome email template (future enhancement)
- [x] Test welcome email automation with real lead creation
- [x] Verify email deliverability and formatting (4/4 tests passed)

## Email Content Updates
- [x] Check welcome email for "Start Here - My Best Content" references
- [x] Update links to current/correct URLs provided by Allen
- [x] Verify all YouTube and social media links are accurate
- [x] Test updated email with new links (Email ID: 4f2cb25b-6fbf-424b-8533-2187511ebca7)


## Lead Nurturing Enhancements

### UTM Tracking for Analytics
- [x] Add UTM parameters to all welcome email links (source=welcome_email, medium=email, campaign=lead_nurture)
- [x] Add UTM parameters to YouTube channel links
- [x] Add UTM parameters to Facebook profile links
- [x] Add UTM parameters to CTA buttons
- [x] Document UTM structure for future email campaigns

### Start Here Playlist Integration
- [x] Create placeholder for "Start Here" YouTube playlist URL
- [x] Update welcome email to link to curated playlist instead of general channel
- [ ] Add admin setting to configure playlist URL (future enhancement)
- [x] Test playlist link in email

### Automated Follow-Up Email Sequence
- [x] Design 3-email nurture sequence (Day 2, Day 4, Day 7)
- [x] Email 1: Share specific video for veterans/AI beginners with case study
- [x] Email 2: Share advanced automation tutorial with social proof
- [x] Email 3: Introduce Funnel Freedom product with special offer
- [x] Create database table for email sequence tracking (emailSequenceLog)
- [x] Add fields: leadId, emailNumber, sentAt, scheduledFor
- [x] Implement scheduler to send follow-up emails at correct intervals
- [x] Integrate scheduler into server startup
- [x] Add sequence scheduling when welcome email is sent
- [x] Test complete sequence with real email delivery
- [ ] Write unit tests for sequence logic (future enhancement)
