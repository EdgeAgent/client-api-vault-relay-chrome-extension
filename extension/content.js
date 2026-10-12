(() => {
  if (globalThis.__AUTOPILOT_BRIDGE_CAPTURE_READY__) return;
  globalThis.__AUTOPILOT_BRIDGE_CAPTURE_READY__ = true;

  const sensitiveLabel = /password|passcode|secret|token|api[\s_-]?key|credit|debit|card number|cvv|cvc|bank|routing|social security|\bssn\b|email|phone|address/i;
  const scrub = value => String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email masked]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[number masked]")
    .replace(/\b\d{13,19}\b/g, "[number masked]")
    .replace(/\b(?:sk|pk|api|token)[-_][A-Za-z0-9_-]{12,}\b/gi, "[credential masked]")
    .slice(0, 500);
  const visible = element => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
  };
  const labelFor = element => {
    const associated = element.labels?.[0]?.innerText || element.getAttribute("aria-label") || element.getAttribute("title") || element.placeholder || "";
    return scrub(associated).trim();
  };
  const capture = () => {
    const headings = [...document.querySelectorAll("h1,h2,h3,[role=heading]")]
      .filter(visible).slice(0, 18).map(el => scrub(el.innerText).trim()).filter(Boolean);
    const controls = [...document.querySelectorAll("button,[role=button],a[href],input,select,textarea,[role=checkbox],[role=radio]")]
      .filter(visible).slice(0, 80).map((el, index) => {
        const tag = el.tagName.toLowerCase();
        const type = tag === "input" ? (el.type || "text").toLowerCase() : "";
        const label = labelFor(el);
        const sensitive = sensitiveLabel.test(`${label} ${type} ${el.autocomplete || ""}`) || ["password", "email", "tel"].includes(type) || /cc-|current-password|new-password/i.test(el.autocomplete || "");
        return {
          index,
          kind: tag === "a" ? "link" : (tag === "button" || el.getAttribute("role") === "button" ? "button" : "field"),
          label: sensitive ? "[sensitive field masked]" : (label || scrub(el.innerText).trim() || `${tag} control`),
          type: sensitive ? "masked" : (type || undefined),
          disabled: Boolean(el.disabled || el.getAttribute("aria-disabled") === "true"),
          requiresApproval: tag === "button" && (/submit|delete|remove|purchase|pay|send|confirm|save/i.test(`${type} ${label} ${el.innerText}`)),
        };
      });
    const mainText = [...document.querySelectorAll("main h1, main h2, main p, main li, [role=main] h1, [role=main] h2, [role=main] p")]
      .filter(el => visible(el) && !el.closest("form")).slice(0, 24).map(el => scrub(el.innerText).trim()).filter(Boolean).join(" ").slice(0, 2500);
    return {
      host: location.hostname,
      path: location.pathname.slice(0, 300),
      title: scrub(document.title).slice(0, 160),
      headings,
      summary: mainText,
      controls,
      note: "No form values, cookies, storage, query strings, screenshots, or hidden page content are included.",
      capturedAt: new Date().toISOString(),
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "AUTOPILOT_CAPTURE_PAGE") return undefined;
    try { sendResponse({ ok: true, page: capture() }); }
    catch { sendResponse({ ok: false, error: "Could not index this page." }); }
    return false;
  });
})();
