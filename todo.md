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
