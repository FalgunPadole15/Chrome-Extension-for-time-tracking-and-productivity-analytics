// background.js - tracks time spent on each website

var currentTab = null;
var currentDomain = null;
var startTime = null;

// websites classified as productive
var productiveSites = [
  "github.com", "stackoverflow.com", "leetcode.com", "codepen.io",
  "developer.mozilla.org", "w3schools.com", "docs.google.com",
  "notion.so", "trello.com", "jira.atlassian.com", "gitlab.com",
  "medium.com", "dev.to", "freecodecamp.org", "udemy.com",
  "coursera.org", "khan academy.org", "npmjs.com", "reactjs.org",
  "nodejs.org", "python.org", "geeksforgeeks.org", "hackerrank.com"
];

// websites classified as unproductive
var unproductiveSites = [
  "youtube.com", "facebook.com", "instagram.com", "twitter.com",
  "reddit.com", "tiktok.com", "netflix.com", "snapchat.com",
  "twitch.tv", "pinterest.com", "tumblr.com", "9gag.com",
  "buzzfeed.com", "x.com"
];

function getDomain(url) {
  try {
    var hostname = new URL(url).hostname;
    // remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch (e) {
    return null;
  }
}

function classifySite(domain) {
  if (!domain) return "neutral";
  for (var i = 0; i < productiveSites.length; i++) {
    if (domain.includes(productiveSites[i])) {
      return "productive";
    }
  }
  for (var j = 0; j < unproductiveSites.length; j++) {
    if (domain.includes(unproductiveSites[j])) {
      return "unproductive";
    }
  }
  return "neutral";
}

function getTodayKey() {
  var today = new Date();
  return today.toISOString().split("T")[0]; // format: 2025-01-15
}

function saveTime(domain, seconds) {
  if (!domain || seconds < 1) return;

  var dateKey = getTodayKey();
  var storageKey = "timedata_" + dateKey;

  chrome.storage.local.get([storageKey], function(result) {
    var todayData = result[storageKey] || {};

    if (!todayData[domain]) {
      todayData[domain] = {
        seconds: 0,
        category: classifySite(domain)
      };
    }

    todayData[domain].seconds += seconds;
    todayData[domain].category = classifySite(domain);

    var saveObj = {};
    saveObj[storageKey] = todayData;
    chrome.storage.local.set(saveObj);
  });
}

function stopTracking() {
  if (currentDomain && startTime) {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    saveTime(currentDomain, elapsed);
  }
  currentDomain = null;
  startTime = null;
}

function startTracking(url) {
  stopTracking();
  var domain = getDomain(url);
  if (domain && !domain.startsWith("chrome")) {
    currentDomain = domain;
    startTime = Date.now();
  }
}

// listen when user switches tabs
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab && tab.url) {
      currentTab = tab.id;
      startTracking(tab.url);
    }
  });
});

// listen when tab URL changes (navigation)
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tabId === currentTab && changeInfo.status === "complete" && tab.url) {
    startTracking(tab.url);
  }
});

// listen when window loses focus (user idle)
chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0 && tabs[0].url) {
        currentTab = tabs[0].id;
        startTracking(tabs[0].url);
      }
    });
  }
});

// save every 30 seconds so we don't lose data
chrome.alarms.create("saveInterval", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "saveInterval") {
    if (currentDomain && startTime) {
      var elapsed = Math.floor((Date.now() - startTime) / 1000);
      saveTime(currentDomain, elapsed);
      // reset start time so we don't double count
      startTime = Date.now();
    }
  }
});

// also send data to backend every 5 minutes
chrome.alarms.create("syncBackend", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "syncBackend") {
    syncToBackend();
  }
});

function syncToBackend() {
  var dateKey = getTodayKey();
  var storageKey = "timedata_" + dateKey;

  chrome.storage.local.get([storageKey], function(result) {
    var todayData = result[storageKey];
    if (!todayData) return;

    fetch("http://localhost:3000/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateKey, data: todayData })
    }).catch(function(err) {
      // backend might not be running, that's okay
      console.log("Backend sync failed:", err.message);
    });
  });
}

console.log("TimeTracker background script loaded");
