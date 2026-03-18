(async function () {
  "use strict";

  // Match 3 letters at a word boundary, not followed by more letters
  // Allows gru001 to match "gru" (digits after are ok, letters are not)
  const CODE_PATTERN = /\b([A-Za-z]{3})(?![A-Za-z])/g;

  const dataUrl = chrome.runtime.getURL("airports.json");
  const resp = await fetch(dataUrl);
  const AIRPORTS = await resp.json();

  let popup = null;
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function removePopup() {
    if (!popup) return;
    if (popup.parentElement) popup.parentElement.removeChild(popup);
    popup = null;
    dragging = false;
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  }

  function onMouseDown(e) {
    if (!popup) return;
    // Start drag if clicking the handle
    var handle = e.target.closest(".airport-popup-handle");
    if (handle && popup.contains(handle)) {
      dragging = true;
      dragOffsetX = e.clientX - popup.getBoundingClientRect().left;
      dragOffsetY = e.clientY - popup.getBoundingClientRect().top;
      e.preventDefault();
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragEnd);
      return;
    }
    // Click outside dismisses
    if (!popup.contains(e.target)) removePopup();
  }

  function onDragMove(e) {
    if (!dragging || !popup) return;
    popup.style.left = (e.pageX - dragOffsetX) + "px";
    popup.style.top = (e.pageY - dragOffsetY) + "px";
  }

  function onDragEnd() {
    dragging = false;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") removePopup();
  }

  function showPopup(codes, x, y) {
    removePopup();
    if (codes.length === 0) return;

    popup = document.createElement("div");
    popup.className = "airport-selection-popup";

    var handle = '<div class="airport-popup-handle"><span class="airport-popup-handle-dots">&#x2630;</span></div>';

    var items = codes.map(function (code) {
      var info = AIRPORTS[code];
      var location = [info.city, info.country].filter(Boolean).join(", ");

      if (info.airports) {
        // Metro/city code — render header + sub-airports
        var html = '<div class="airport-selection-item airport-metro-item">' +
          '<span class="tooltip-code">' + escapeHTML(code) + "</span> " + escapeHTML(location) +
          '<span class="tooltip-metro-badge">metro area</span>';
        if (info.name) {
          html += '<span class="tooltip-name">' + escapeHTML(info.name) + "</span>";
        }
        var subs = info.airports;
        for (var i = 0; i < subs.length; i++) {
          var subInfo = AIRPORTS[subs[i]];
          var prefix = i < subs.length - 1 ? "\u251C" : "\u2514";
          var subName = subInfo ? subInfo.name : subs[i];
          html += '<div class="airport-sub-item">' +
            '<span class="airport-sub-prefix">' + prefix + "</span> " +
            '<span class="tooltip-code">' + escapeHTML(subs[i]) + "</span> " +
            escapeHTML(subName) +
            "</div>";
        }
        html += "</div>";
        return html;
      }

      return '<div class="airport-selection-item">' +
        '<span class="tooltip-code">' + escapeHTML(code) + "</span> " + escapeHTML(location) +
        '<span class="tooltip-name">' + escapeHTML(info.name) + "</span>" +
        "</div>";
    }).join("");

    popup.innerHTML = handle + items;

    popup.style.left = x + "px";
    popup.style.top = y + "px";
    document.body.appendChild(popup);

    var rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      popup.style.left = (x - rect.width) + "px";
    }
    if (rect.bottom > window.innerHeight) {
      popup.style.top = (y - rect.height - 10) + "px";
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
  }

  document.addEventListener("mouseup", function (e) {
    // Don't trigger popup if we just finished dragging
    if (dragging) return;
    // Don't trigger if clicking inside the popup
    if (popup && popup.contains(e.target)) return;

    var sel = window.getSelection();
    var text = (sel ? sel.toString() : "").trim();
    if (!text) {
      removePopup();
      return;
    }

    var codes = [];
    var seen = new Set();
    for (var match of text.matchAll(CODE_PATTERN)) {
      var code = match[1].toUpperCase();
      if (AIRPORTS[code] && !seen.has(code)) {
        seen.add(code);
        codes.push(code);
      }
    }

    if (codes.length === 0) {
      removePopup();
      return;
    }

    showPopup(codes, e.pageX + 10, e.pageY + 10);
  });
})();
