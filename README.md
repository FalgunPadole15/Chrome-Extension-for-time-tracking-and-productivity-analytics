# Task 4 - Chrome Extension for Time Tracking and Productivity Analytics

**CodTech Internship - Task 4**

A Chrome Extension that tracks the time spent on different websites and provides productivity analytics with a Node.js + MongoDB backend.

---

## Features

- Tracks time spent on every website automatically
- Classifies websites as **Productive**, **Unproductive**, or **Neutral**
- Shows a **Productivity Score** for the day
- **Weekly report** with daily breakdown bars
- Add/remove custom sites from Settings page
- Auto-syncs data to the backend every 5 minutes
- Export all data as JSON

---

## Project Structure

```
task4-chrome-extension/
├── extension/
│   ├── manifest.json       # Chrome extension config
│   ├── background.js       # Tracks active tab time
│   ├── popup.html          # Main popup UI
│   ├── popup.js            # Popup logic
│   ├── popup.css           # Popup styles
│   ├── options.html        # Settings page
│   ├── options.js          # Settings logic
│   └── icons/              # Extension icons
├── backend/
│   ├── server.js           # Express + MongoDB API
│   ├── package.json
│   └── .env
└── README.md
```

---

## How to Run

### Step 1 - Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Turn on **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The extension icon will appear in the toolbar

### Step 2 - Start the Backend

Make sure MongoDB is running on your machine first.

```bash
cd backend
npm install
node server.js
```

Backend will run at: `http://localhost:3000`

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/sync | Receive data from extension |
| GET | /api/report/today | Get today's report |
| GET | /api/report/week | Get last 7 days summary |
| GET | /api/reports/all | Get all saved reports |
| DELETE | /api/report/:date | Delete a specific day |

---

## Tech Stack

- **Extension**: HTML, CSS, JavaScript (Manifest V3)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Chrome APIs**: tabs, storage, alarms, idle

---

## Output Screenshots

After loading the extension:
- Click the extension icon to see today's tracked sites
- Click **This Week** tab for the weekly productivity report
- Click **⚙ Settings** to manage productive/unproductive site lists
