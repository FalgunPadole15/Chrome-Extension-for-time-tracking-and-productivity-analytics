// popup.js

function getTodayKey() {
  var today = new Date();
  return today.toISOString().split("T")[0];
}

function formatSeconds(seconds) {
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  if (h > 0) {
    return h + "h " + m + "m";
  } else if (m > 0) {
    return m + "m " + s + "s";
  } else {
    return s + "s";
  }
}

function getDayName(dateStr) {
  var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var d = new Date(dateStr + "T00:00:00");
  return days[d.getDay()];
}

function showTab(tab) {
  if (tab === "today") {
    document.getElementById("todayContent").style.display = "block";
    document.getElementById("weekContent").style.display = "none";
    document.getElementById("tabToday").classList.add("active");
    document.getElementById("tabWeek").classList.remove("active");
  } else {
    document.getElementById("todayContent").style.display = "none";
    document.getElementById("weekContent").style.display = "block";
    document.getElementById("tabToday").classList.remove("active");
    document.getElementById("tabWeek").classList.add("active");
    loadWeekData();
  }
}

function loadTodayData() {
  var dateKey = getTodayKey();
  var storageKey = "timedata_" + dateKey;

  // show today's date
  var dateEl = document.getElementById("todayDate");
  var today = new Date();
  dateEl.textContent = today.toDateString();

  chrome.storage.local.get([storageKey], function(result) {
    var todayData = result[storageKey] || {};
    var sites = Object.keys(todayData);

    var totalSeconds = 0;
    var productiveSeconds = 0;
    var unproductiveSeconds = 0;

    sites.forEach(function(site) {
      var info = todayData[site];
      totalSeconds += info.seconds;
      if (info.category === "productive") {
        productiveSeconds += info.seconds;
      } else if (info.category === "unproductive") {
        unproductiveSeconds += info.seconds;
      }
    });

    // update summary cards
    document.getElementById("totalTime").textContent = formatSeconds(totalSeconds);
    document.getElementById("productiveTime").textContent = formatSeconds(productiveSeconds);
    document.getElementById("unproductiveTime").textContent = formatSeconds(unproductiveSeconds);

    // productivity score
    var score = 0;
    if (productiveSeconds + unproductiveSeconds > 0) {
      score = Math.round((productiveSeconds / (productiveSeconds + unproductiveSeconds)) * 100);
    }
    document.getElementById("progressFill").style.width = score + "%";
    document.getElementById("scoreText").textContent = score + "%";

    // color the score
    var fillEl = document.getElementById("progressFill");
    if (score >= 70) {
      fillEl.style.background = "linear-gradient(to right, #27ae60, #2ecc71)";
      document.getElementById("scoreText").style.color = "#27ae60";
    } else if (score >= 40) {
      fillEl.style.background = "linear-gradient(to right, #f39c12, #f1c40f)";
      document.getElementById("scoreText").style.color = "#f39c12";
    } else {
      fillEl.style.background = "linear-gradient(to right, #c0392b, #e74c3c)";
      document.getElementById("scoreText").style.color = "#e74c3c";
    }

    // build site list - sort by time descending
    var siteListEl = document.getElementById("siteList");

    if (sites.length === 0) {
      siteListEl.innerHTML = '<p class="no-data">No data yet. Start browsing!</p>';
      return;
    }

    // sort sites by time
    sites.sort(function(a, b) {
      return todayData[b].seconds - todayData[a].seconds;
    });

    var html = "";
    // show top 8 sites
    var topSites = sites.slice(0, 8);
    topSites.forEach(function(site) {
      var info = todayData[site];
      var badgeClass = "badge-neutral";
      if (info.category === "productive") badgeClass = "badge-productive";
      if (info.category === "unproductive") badgeClass = "badge-unproductive";

      html += '<div class="site-item">';
      html += '<span class="site-name">' + site + '</span>';
      html += '<span class="site-time">' + formatSeconds(info.seconds) + '</span>';
      html += '<span class="site-badge ' + badgeClass + '">' + info.category + '</span>';
      html += '</div>';
    });

    siteListEl.innerHTML = html;
  });
}

function loadWeekData() {
  // get last 7 days
  var keys = [];
  var dates = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var dateStr = d.toISOString().split("T")[0];
    dates.push(dateStr);
    keys.push("timedata_" + dateStr);
  }

  chrome.storage.local.get(keys, function(result) {
    var weekProductiveSeconds = 0;
    var weekUnproductiveSeconds = 0;
    var weekTotalSeconds = 0;
    var allSites = {};

    var dailyData = [];

    dates.forEach(function(dateStr) {
      var storageKey = "timedata_" + dateStr;
      var dayData = result[storageKey] || {};
      var dayTotal = 0;
      var dayProductive = 0;
      var dayUnproductive = 0;

      Object.keys(dayData).forEach(function(site) {
        var info = dayData[site];
        dayTotal += info.seconds;
        weekTotalSeconds += info.seconds;

        if (info.category === "productive") {
          dayProductive += info.seconds;
          weekProductiveSeconds += info.seconds;
        } else if (info.category === "unproductive") {
          dayUnproductive += info.seconds;
          weekUnproductiveSeconds += info.seconds;
        }

        if (!allSites[site]) {
          allSites[site] = { seconds: 0, category: info.category };
        }
        allSites[site].seconds += info.seconds;
      });

      dailyData.push({
        date: dateStr,
        total: dayTotal,
        productive: dayProductive,
        unproductive: dayUnproductive
      });
    });

    // weekly summary
    var weekScore = 0;
    if (weekProductiveSeconds + weekUnproductiveSeconds > 0) {
      weekScore = Math.round((weekProductiveSeconds / (weekProductiveSeconds + weekUnproductiveSeconds)) * 100);
    }

    var weekListEl = document.getElementById("weekList");
    weekListEl.innerHTML =
      '<div class="site-item">' +
      '<span class="site-name">Total Time</span>' +
      '<span class="site-time">' + formatSeconds(weekTotalSeconds) + '</span>' +
      '</div>' +
      '<div class="site-item">' +
      '<span class="site-name">Productive Time</span>' +
      '<span class="site-time">' + formatSeconds(weekProductiveSeconds) + '</span>' +
      '<span class="site-badge badge-productive">productive</span>' +
      '</div>' +
      '<div class="site-item">' +
      '<span class="site-name">Wasted Time</span>' +
      '<span class="site-time">' + formatSeconds(weekUnproductiveSeconds) + '</span>' +
      '<span class="site-badge badge-unproductive">unproductive</span>' +
      '</div>' +
      '<div class="site-item">' +
      '<span class="site-name">Weekly Score</span>' +
      '<span class="site-time">' + weekScore + '%</span>' +
      '</div>';

    // daily breakdown bars
    var maxTotal = 0;
    dailyData.forEach(function(d) {
      if (d.total > maxTotal) maxTotal = d.total;
    });

    var dailyEl = document.getElementById("dailyBreakdown");
    var html = "";
    dailyData.forEach(function(d) {
      var pWidth = maxTotal > 0 ? Math.round((d.productive / maxTotal) * 120) : 0;
      var uWidth = maxTotal > 0 ? Math.round((d.unproductive / maxTotal) * 120) : 0;
      html += '<div class="day-item">';
      html += '<div style="display:flex; justify-content:space-between;">';
      html += '<span class="day-name">' + getDayName(d.date) + ' ' + d.date.slice(5) + '</span>';
      html += '<span class="day-time">' + formatSeconds(d.total) + '</span>';
      html += '</div>';
      html += '<div class="day-bar">';
      if (pWidth > 0) {
        html += '<div class="day-bar-fill day-bar-productive" style="width:' + pWidth + 'px"></div>';
      }
      if (uWidth > 0) {
        html += '<div class="day-bar-fill day-bar-unproductive" style="width:' + uWidth + 'px"></div>';
      }
      if (pWidth === 0 && uWidth === 0) {
        html += '<span style="font-size:11px;color:#bbb;">no data</span>';
      }
      html += '</div>';
      html += '</div>';
    });
    dailyEl.innerHTML = html;
  });
}

function clearToday() {
  if (confirm("Clear all tracking data for today?")) {
    var dateKey = getTodayKey();
    var storageKey = "timedata_" + dateKey;
    chrome.storage.local.remove([storageKey], function() {
      loadTodayData();
    });
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

// run when popup opens
document.addEventListener("DOMContentLoaded", function() {
  loadTodayData();
});
