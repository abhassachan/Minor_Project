# CONQUR — GPS-Enabled Gamified Running Web Application

## Project Overview
**CONQUR** is a GPS-enabled gamified running Progressive Web Application (PWA) that transforms outdoor running into an engaging and competitive experience. The system tracks user movement in real-time and allows users to claim virtual territories based on their running routes, participate in clan wars, and complete dynamic global challenges.

## Team Members
- Abhas Sachan (2023BTECH003)  
- Ayush Sharma (2023BTECH021)

## Key Features
- **Real-Time GPS Tracking:** Accurate route tracking using browser geolocation APIs.
- **Interactive Map Visualization:** Live map-based route plotting and territory visualization using Leaflet.
- **Territory Claiming:** Capture physical locations by running through them and establish dominance.
- **Clan Wars System:** Form alliances, join clans via invite links, and compete in team-based territory control.
- **Dynamic Global Challenges:** Automatically synced global challenges that reward users with XP.
- **Progressive Web App (PWA):** Installable mobile-first web application with custom branding.
- **User Progression:** Profile statistics, run history, and leaderboard rankings.

## Tech Stack
### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS v4
- **Maps:** Leaflet & React-Leaflet
- **Icons:** Lucide React

### Backend
- **Environment:** Node.js + Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Automation:** node-cron (for scheduled challenges)

## Project Structure
- `/frontend`: Contains the Vite + React frontend application.
- `/backend`: Contains the Node.js + Express backend API.

## Setup Instructions

### Prerequisites
- Node.js
- MongoDB instance (local or MongoDB Atlas)

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `backend` directory with the required variables:
   - `PORT` (e.g., 5000)
   - `MONGO_URI` (Your MongoDB connection string)
   - `JWT_SECRET` (Your JWT secret key)
   - `ADMIN_SECRET_KEY` (Key for admin operations)
4. Start the backend server: `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Deployment
- **Frontend:** Configured for deployment on Vercel (`vercel.json`).
- **Backend:** Configured for deployment on Render (`render.yaml`).
