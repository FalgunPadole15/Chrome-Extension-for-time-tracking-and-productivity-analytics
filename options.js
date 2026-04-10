// options.js

var defaultProductive = [
  "github.com", "stackoverflow.com", "leetcode.com", "codepen.io",
  "developer.mozilla.org", "w3schools.com", "docs.google.com",
  "notion.so", "trello.com", "gitlab.com", "freecodecamp.org",
  "udemy.com", "coursera.org", "geeksforgeeks.org", "hackerrank.com"
];

var defaultUnproductive = [
  "youtube.com", "facebook.com", "instagram.com", "twitter.com",
  "reddit.com", "tiktok.com", "netflix.com", "snapchat.com",
  "twitch.tv", "pinterest.com", "x.com", "9gag.com"
];

function loadSiteLists() {
  chrome.storage.local.get(["customProductive", "customUnproductive"], function(result) {
    var productive = result.customProductive || defaultProductive;
    var unproductive = result.customUnproductive || defaultUnproductive;

    renderList("productiveList", productive, "productive");
    renderList("unproductiveList", unproductive, "unproductive");
  });
}

function renderList(elementId, sites, type) {
  var listEl = document.getElementById(elementId);
  var html = "";
  sites.forEach(function(site, index) {
    html += '<li>';
    html += '<span>' + site + '</span>';
    html += '<button class="remove-btn" onclick="removeSite(\'' + type + '\', ' + index + ')">Remove</button>';
    html += '</li>';
  });
  if (sites.length === 0) {
    html = '<li style="color:#aaa; background:none;">No sites added yet</li>';
  }
  listEl.innerHTML = html;
}

function addSite(type) {
  var inputId = type === "productive" ? "productiveInput" : "unproductiveInput";
  var inputEl = document.getElementById(inputId);
  var site = inputEl.value.trim().toLowerCase();

  if (!site) {
    alert("Please enter a site domain.");
    return;
  }

  // remove http/https if user typed it
  site = site.replace("https://", "").replace("http://", "").replace("www.", "");
  // remove trailing slash
  if (site.endsWith("/")) {
    site = site.slice(0, -1);
  }

  var storageKey = type === "productive" ? "customProductive" : "customUnproductive";
  var defaultList = type === "productive" ? defaultProductive : defaultUnproductive;

  chrome.storage.local.get([storageKey], function(result) {
    var sites = result[storageKey] || defaultList;

    if (sites.indexOf(site) !== -1) {
      alert("This site is already in the list.");
      return;
    }

    sites.push(site);
    var saveObj = {};
    saveObj[storageKey] = sites;
    chrome.storage.local.set(saveObj, function() {
      inputEl.value = "";
      loadSiteLists();
      showStatus("Site added successfully!");
    });
  });
}

function removeSite(type, index) {
  var storageKey = type === "productive" ? "customProductive" : "customUnproductive";
  var defaultList = type === "productive" ? defaultProductive : defaultUnproductive;

  chrome.storage.local.get([storageKey], function(result) {
    var sites = result[storageKey] || defaultList;
    sites.splice(index, 1);
    var saveObj = {};
    saveObj[storageKey] = sites;
    chrome.storage.local.set(saveObj, function() {
      loadSiteLists();
      showStatus("Site removed.");
    });
  });
}

function exportData() {
  chrome.storage.local.get(null, function(allData) {
    var json = JSON.stringify(allData, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "timetracker_data.json";
    a.click();
    URL.revokeObjectURL(url);
    showStatus("Data exported!");
  });
}

function clearAllData() {
  if (confirm("This will delete ALL tracking data. Are you sure?")) {
    chrome.storage.local.get(null, function(allData) {
      var keysToRemove = [];
      Object.keys(allData).forEach(function(key) {
        if (key.startsWith("timedata_")) {
          keysToRemove.push(key);
        }
      });
      chrome.storage.local.remove(keysToRemove, function() {
        showStatus("All tracking data cleared!");
      });
    });
  }
}

function showStatus(msg) {
  var el = document.getElementById("statusMsg");
  el.textContent = msg;
  setTimeout(function() {
    el.textContent = "";
  }, 3000);
}

document.addEventListener("DOMContentLoaded", function() {
  loadSiteLists();
});
