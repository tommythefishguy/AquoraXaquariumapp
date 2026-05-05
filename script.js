
const cycleStages = [
  "Setup started",
  "Bacteria added",
  "Ammonia detected",
  "Nitrite detected",
  "Nitrate detected",
  "Ammonia zero",
  "Nitrite zero",
  "Water change done",
  "Tank cycled"
];


const aquoraxNavItems = [
  {id:"parameters", label:"Params", desc:"Full parameter dashboard and targets"},
  {id:"history", label:"History", desc:"Full water test timeline"},
  {id:"graphs", label:"Graphs", desc:"Parameter trend graphs"},
  {id:"guides", label:"Guides", desc:"Aquarium learning guides"}
];

const aquoraxLockedNavItems = ["home","growth","cycle","dosing","profile"];
const aquoraxHomePanels = [
  {id:"parameters", label:"Current Parameters", desc:"Live readings and Log New Test button"},
  {id:"insights", label:"Smart Insights", desc:"AquoraX advice from latest test"},
  {id:"score", label:"AquoraX Score", desc:"Overall tank score"},
  {id:"history", label:"Recent History", desc:"Latest water tests"},
  {id:"quicktools", label:"Quick Tools", desc:"Shortcut cards"}
];

function getNavPrefs(){
  try{
    const saved = JSON.parse(localStorage.getItem("aquoraxNavPrefs") || "{}");
    return saved && typeof saved === "object" ? saved : {};
  }catch(e){ return {}; }
}

function saveNavPrefs(prefs){
  localStorage.setItem("aquoraxNavPrefs", JSON.stringify(prefs));
}

function aqxApplyCleanNavDefaults(){
  /* V6 migration: clean starter nav must be Home, Growth, Journey, Dosing, Profile only. */
  const marker = "aquoraxCleanNavV6DosingLockedApplied";
  if(localStorage.getItem(marker) === "yes") return;

  const prefs = getNavPrefs();
  ["parameters","history","graphs","guides","log"].forEach(id => prefs[id] = false);
  prefs.dosing = true;
  saveNavPrefs(prefs);

  /* clear older migration flags so old builds cannot keep extras visible */
  localStorage.setItem("aquoraxCleanNavV3Applied", "replaced-by-v5");
  localStorage.setItem("aquoraxCleanNavV4Applied", "replaced-by-v6");
  localStorage.setItem("aquoraxCleanNavV5HardLockApplied", "replaced-by-v6");
  localStorage.setItem(marker, "yes");
}

function aqxHapticTap(target){
  try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
  if(target && target.classList){
    target.classList.add("buttonPressed");
    setTimeout(() => target.classList.remove("buttonPressed"), 180);
  }
}

function aqxBindButtonFeedback(){
  document.addEventListener("pointerdown", function(e){
    const btn = e.target.closest("button,.simpleTile,.trackerOpenCard,.shopLinkCard,.shopNeed");
    if(!btn) return;
    aqxHapticTap(btn);
  }, {passive:true});
}

function isNavVisible(id){
  if(aquoraxLockedNavItems.includes(id)) return true;
  if(id === "log") return false;
  const prefs = getNavPrefs();
  return prefs[id] === true;
}

function openNavMenu(){
  openPage("profile");
  renderNavCustomMenu();
}

function closeNavMenu(){ /* menu now lives in Profile */ }

function renderNavCustomMenu(){
  const box = el("navCustomList");
  if(!box) return;
  const prefs = getNavPrefs();
  box.innerHTML = aquoraxNavItems.map(item => {
    const checked = prefs[item.id] === true;
    return `
      <div class="navCustomItem">
        <div>
          <strong>${item.label}</strong>
          <span>${item.desc}</span>
        </div>
        <label class="navSwitch">
          <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleNavItem('${item.id}', this.checked)">
          <span class="navSlider"></span>
        </label>
      </div>
    `;
  }).join("");
}

function toggleNavItem(id, visible){
  if(aquoraxLockedNavItems.includes(id)) return;
  const prefs = getNavPrefs();
  prefs[id] = !!visible;
  saveNavPrefs(prefs);
  applyNavPrefs();
  renderNavCustomMenu();

  const active = document.querySelector(".page.active");
  if(active && active.id === id && !visible){
    openPage("home");
  }
}

function applyNavPrefs(){
  const classMap = {
    parameters:"aqxShowNavParameters",
    history:"aqxShowNavHistory",
    graphs:"aqxShowNavGraphs",
    guides:"aqxShowNavGuides",
    log:"aqxShowNavLog"
  };

  Object.values(classMap).forEach(cls => document.body.classList.remove(cls));

  document.querySelectorAll(".nav button").forEach(btn => {
    const id = (btn.id || "").replace("nav-", "");
    if(!id) return;

    const visible = isNavVisible(id);
    btn.classList.toggle("navHidden", !visible);

    /* Core nav uses normal display. Optional nav is controlled by body classes + hard CSS. */
    if(aquoraxLockedNavItems.includes(id)){
      btn.style.display = "";
    }else{
      btn.style.display = "";
      if(visible && classMap[id]) document.body.classList.add(classMap[id]);
    }
  });
}

function firstVisiblePage(){
  const current = localStorage.getItem("aquoraxCurrentPage") || "home";
  return current || "home";
}

function el(id){
  return document.getElementById(id);
}

function val(id){
  const item = el(id);
  return item ? item.value : "";
}

function setVal(id, value){
  const item = el(id);
  if(item) item.value = value || "";
}

function selectedTankType(){
  return localStorage.getItem("aquoraxTankType") || localStorage.getItem("aquoraxWelcomeTank") || "";
}

function selectWelcomeTank(type){
  localStorage.setItem("aquoraxWelcomeTank", type);
  localStorage.setItem("aquoraxTankType", type);
  updateWelcomeTankButtons();
  if(el("tankTypeSelect")) setVal("tankTypeSelect", type);
  if(el("cycleTank")) setVal("cycleTank", type);
  updateTankSummary();
  updateCycle();
  renderParameterPage();
}

function updateWelcomeTankButtons(){
  const type = selectedTankType();
  const salt = el("welcomeSalt");
  const fresh = el("welcomeFresh");
  if(salt) salt.classList.toggle("active", type === "reef");
  if(fresh) fresh.classList.toggle("active", type === "freshwater");
}

function parseNum(value){
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

function roundDose(num){
  if(num === null || num <= 0) return null;
  if(num < 10) return Math.round(num * 10) / 10;
  return Math.round(num);
}

function nowStamp(){
  const d = new Date();
  return {
    iso:d.toISOString(),
    date:d.toLocaleDateString(),
    time:d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})
  };
}

function daysSince(iso){
  if(!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86400000);
}

function enterApp(){
  const chosen = selectedTankType();
  if(!chosen){
    alert("Choose Salt Water or Fresh Water first.");
    return;
  }
  localStorage.setItem("aquoraxTankType", chosen);
  localStorage.setItem("aquoraxWelcomeSeen", "yes");
  if(el("welcomeScreen")) el("welcomeScreen").style.display = "none";
  openPage("home");
}

function isCycleConfirmedComplete(){
  return localStorage.getItem("aquoraxCycleConfirmedComplete") === "yes";
}

function applyCycleCompletionGate(){
  const confirmed = isCycleConfirmedComplete();
  document.body.classList.toggle("aqxCycleConfirmed", confirmed);
}

function confirmCycleCompleteFromHome(){
  localStorage.setItem("aquoraxCycleConfirmedComplete", "yes");
  localStorage.setItem("aquoraxCycleConfirmedAt", new Date().toISOString());
  applyCycleCompletionGate();
  renderParameterPage();
  renderTestHistory();
  openPage("home");
}

function goToCycleJourneyFromHome(){
  localStorage.setItem("aquoraxCycleConfirmedComplete", "no");
  applyCycleCompletionGate();
  openPage("cycle");
}

function requireCompletedCycleForFullParameters(page){
  if(page === "log" && !isCycleConfirmedComplete()){
    alert("Complete your cycle first. AquoraX will take you to Journey so you can keep logging cycle results.");
    openPage("cycle");
    return false;
  }
  return true;
}

function openPage(page){
  if(page === "log" && !isCycleConfirmedComplete()){
    localStorage.setItem("aquoraxCycleConfirmedComplete", "no");
    applyCycleCompletionGate();
    page = "cycle";
  }

  applyCycleCompletionGate();

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));

  const target = el(page);
  const navBtn = el("nav-" + page);

  if(target) target.classList.add("active");
  if(navBtn) navBtn.classList.add("active");

  localStorage.setItem("aquoraxCurrentPage", page);
  window.scrollTo(0,0);

  if(page === "parameters"){
    renderParameterPage();
  }
  if(page === "profile"){
    renderNavCustomMenu();
    aqxRenderHomePanelCustomList();
    aqxRenderHomeParameterCustomiser();
    aqxRenderHomeLayoutCustomiser();
  }
  if(page === "cycle"){
    applyBeginnerMode();
    renderBeginnerCycleGuide();
  }

  if(page === "growth"){
    closeTrackerPanels();
    renderParameterPage();
  }

  if(page === "log"){
    if(el("testDate") && !val("testDate")) setVal("testDate", new Date().toISOString().slice(0,10));
  }

  if(page === "history"){
    renderTestHistory();
  }

  if(page === "graphs"){
    setTimeout(drawParameterTrendGraph, 80);
  }

  if(page === "dosing"){
    renderDosingPage();
  }

  if(page === "cycle"){
    setTimeout(drawCycleGraph, 80);
  }
}

function saveTank(){
  const type = val("tankTypeSelect");
  const volume = val("tankVolumeMain");

  localStorage.setItem("aquoraxTankType", type);
  localStorage.setItem("aquoraxTankVolume", volume);

  if(type && el("cycleTank")) setVal("cycleTank", type);
  if(volume && el("cycleVolume")) setVal("cycleVolume", volume);

  saveCycle();
  updateTankSummary();
  renderParameterPage();
}

function updateTankSummary(){
  const type = localStorage.getItem("aquoraxTankType") || "";
  const volume = localStorage.getItem("aquoraxTankVolume") || "";

  let text = "No tank type selected yet.";
  if(type === "reef") text = "Reef / Marine tank selected.";
  if(type === "freshwater") text = "Freshwater tank selected.";
  if(volume) text += " System volume: " + volume + " L.";

  if(el("tankSummary")) el("tankSummary").innerText = text;
}

function saveCycle(){
  const data = {
    tank: val("cycleTank"),
    volume: val("cycleVolume"),
    stage: val("cycleStage"),
    ammonia: val("ammonia"),
    nitrite: val("nitrite"),
    nitrate: val("nitrate"),
    ph: val("ph"),
    temp: val("temp"),
    salinity: val("salinity")
  };

  localStorage.setItem("aquoraxCycleData", JSON.stringify(data));
  localStorage.setItem("aquoraxTankType", data.tank);
  localStorage.setItem("aquoraxTankVolume", data.volume);

  if(el("tankTypeSelect")) setVal("tankTypeSelect", data.tank);
  if(el("tankVolumeMain")) setVal("tankVolumeMain", data.volume);

  updateTankSummary();
  updateCycle();
  renderParameterPage();
}

function numberValue(id){
  return parseNum(val(id));
}

function updateCycle(){
  const tank = val("cycleTank") || "freshwater";

  const ammonia = numberValue("ammonia");
  const nitrite = numberValue("nitrite");
  const nitrate = numberValue("nitrate");
  const ph = numberValue("ph");
  const temp = numberValue("temp");
  const salinity = numberValue("salinity");

  if(el("salinityBox")) el("salinityBox").style.display = tank === "reef" ? "block" : "none";

  updateBlueSharkDosing();
  updateDoseStatusDisplays();
  updateCycleGuidance();

  if(ph !== null && (ph < 6.5 || ph > 8.6)){
    setGuidanceExtra("Your pH looks outside the usual range, so double-check it.");
  }

  if(temp !== null && (temp < 22 || temp > 30)){
    setGuidanceExtra("Your temperature looks outside the Blue Shark cycle temperature range of 23-30°C, so adjust carefully.");
  }

  if(tank === "reef" && salinity !== null && (salinity < 1.023 || salinity > 1.026)){
    setGuidanceExtra("For reef tanks, salinity is usually kept close to 1.025.");
  }
}

function updateBlueSharkDosing(){
  const tank = val("cycleTank") || "freshwater";
  const volume = parseNum(val("cycleVolume"));

  const productName = tank === "reef" ? "Blue Shark Colony Marine" : "Blue Shark Colony Freshwater";
  if(el("rapidProductName")) el("rapidProductName").innerText = productName;

  if(volume === null || volume <= 0){
    if(el("rapidDose")) el("rapidDose").innerText = "Enter volume";
    if(el("paradigmDose")) el("paradigmDose").innerText = "Enter volume";
    return;
  }

  let rapidDose;
  if(tank === "reef"){
    rapidDose = volume * (118 / 45);
  }else{
    rapidDose = volume * (118 / 95);
  }

  const paradigmDose = volume * (5 / 37.85);

  if(el("rapidDose")) el("rapidDose").innerText = roundDose(rapidDose) + " ml";
  if(el("paradigmDose")) el("paradigmDose").innerText = roundDose(paradigmDose) + " ml";

  if(el("rapidNote")){
    el("rapidNote").innerText = tank === "reef"
      ? "Rapid Cycle single dose. 118 ml treats 45 L. Add once per tank/system."
      : "Rapid Cycle single dose. 118 ml treats 95 L. Add once per tank/system.";
  }
}

/* DOSING LOGS */
function getDoseLog(){
  return JSON.parse(localStorage.getItem("aquoraxDoseLog") || '{"rapid":null,"paradigm":[]}');
}

function saveDoseLog(log){
  localStorage.setItem("aquoraxDoseLog", JSON.stringify(log));
}

function showCycleStartedModal(){
  const modal = el("cycleStartedModal");
  if(modal) modal.classList.add("show");
}

function closeCycleStartedModal(){
  const modal = el("cycleStartedModal");
  if(modal) modal.classList.remove("show");
}

function confirmRapidCycleDose(){
  const volume = parseNum(val("cycleVolume"));
  if(volume === null || volume <= 0){
    alert("Enter your system volume before confirming the dose.");
    return;
  }

  const firstConfirm = confirm("Confirm Rapid Cycle added?\n\nThis is the Blue Shark Colony single dose for this tank/system.");
  if(!firstConfirm) return;

  const secondConfirm = confirm("Final check:\n\nHave you added the full Blue Shark Colony dose to your system?\n\nThis should only be done once per tank setup.");
  if(!secondConfirm) return;

  const log = getDoseLog();
  if(log.rapid){
    updateDoseStatusDisplays();
    return;
  }

  const stamp = nowStamp();
  log.rapid = {
    type:"rapid",
    label:"Rapid Cycle",
    product: val("cycleTank") === "reef" ? "Blue Shark Colony Marine" : "Blue Shark Colony Freshwater",
    volume: val("cycleVolume"),
    dose: el("rapidDose") ? el("rapidDose").innerText : "",
    iso:stamp.iso,
    date:stamp.date,
    time:stamp.time
  };

  saveDoseLog(log);
  addGraphEvent("rapid", "Rapid Cycle", stamp.iso, stamp.date, stamp.time);
  updateDoseStatusDisplays();
  drawCycleGraph();
  renderCycleHistory();
  updateCycleGuidance();
  showCycleStartedModal();
}

function confirmParadigmDose(){
  const volume = parseNum(val("cycleVolume"));
  if(volume === null || volume <= 0){
    alert("Enter your system volume before confirming the dose.");
    return;
  }

  const ok = confirm("Confirm Paradigm added?\n\nThis will record the date and time on your Cycle Review Graph.");
  if(!ok) return;

  const log = getDoseLog();
  if(!Array.isArray(log.paradigm)) log.paradigm = [];

  const stamp = nowStamp();

  log.paradigm.push({
    type:"paradigm",
    label:"Paradigm",
    product:"Blue Shark Paradigm",
    volume: val("cycleVolume"),
    dose: el("paradigmDose") ? el("paradigmDose").innerText : "",
    iso:stamp.iso,
    date:stamp.date,
    time:stamp.time
  });

  saveDoseLog(log);
  addGraphEvent("paradigm", "Paradigm", stamp.iso, stamp.date, stamp.time);
  updateDoseStatusDisplays();
  drawCycleGraph();
  renderCycleHistory();
  updateCycleGuidance();
}

function updateDoseStatusDisplays(){
  const log = getDoseLog();

  if(log.rapid){
    if(el("rapidButtonWrap")){
      el("rapidButtonWrap").innerHTML = '<button class="lockedBtn" disabled>✓ Rapid Cycle Completed</button>';
    }
    if(el("rapidTimestamp")){
      el("rapidTimestamp").innerHTML = `
        <strong>Rapid Cycle Added</strong>
        ${log.rapid.date} · ${log.rapid.time}<br>
        ${log.rapid.dose} recorded for ${log.rapid.volume} L.
      `;
    }
  }else{
    if(el("rapidButtonWrap")){
      el("rapidButtonWrap").innerHTML = '<button class="primaryBtn" onclick="confirmRapidCycleDose()">Confirm Rapid Cycle Added</button>';
    }
    if(el("rapidTimestamp")){
      el("rapidTimestamp").innerHTML = '<strong>Rapid Cycle Status</strong>Not added yet.';
    }
  }

  const paradigmLog = Array.isArray(log.paradigm) ? log.paradigm : [];
  const last = paradigmLog[paradigmLog.length - 1];

  if(last){
    const days = daysSince(last.iso);
    const dayText = days === 0 ? "Added today." : days === 1 ? "1 day since last dose." : days + " days since last dose.";
    if(el("paradigmTimestamp")){
      el("paradigmTimestamp").innerHTML = `
        <strong>Last Paradigm Dose</strong>
        ${last.date} · ${last.time}<br>
        ${last.dose} recorded for ${last.volume} L.<br>
        ${dayText}
      `;
    }
  }else{
    if(el("paradigmTimestamp")){
      el("paradigmTimestamp").innerHTML = '<strong>Paradigm Status</strong>Not added yet.';
    }
  }
}

/* GRAPH + HISTORY */
function getCycleHistory(){
  return JSON.parse(localStorage.getItem("aquoraxCycleHistory") || "[]");
}

function saveCycleHistory(history){
  localStorage.setItem("aquoraxCycleHistory", JSON.stringify(history));
}

function getGraphEvents(){
  return JSON.parse(localStorage.getItem("aquoraxGraphEvents") || "[]");
}

function saveGraphEvents(events){
  localStorage.setItem("aquoraxGraphEvents", JSON.stringify(events));
}

function addGraphEvent(type, label, iso, date, time){
  const events = getGraphEvents();
  events.push({
    id:Date.now(),
    type:type,
    label:label,
    iso:iso,
    date:date,
    time:time
  });
  saveGraphEvents(events);
}

function saveCycleTest(){
  const ammonia = numberValue("ammonia");
  const nitrite = numberValue("nitrite");
  const nitrate = numberValue("nitrate");

  if(ammonia === null && nitrite === null && nitrate === null){
    alert("Add at least one ammonia, nitrite or nitrate reading first.");
    return;
  }

  const stamp = nowStamp();

  const test = {
    id: Date.now(),
    iso: stamp.iso,
    date: stamp.date,
    time: stamp.time,
    stage: 0,
    ammonia: ammonia,
    nitrite: nitrite,
    nitrate: nitrate,
    ph: numberValue("ph"),
    temp: numberValue("temp"),
    salinity: numberValue("salinity")
  };

  const history = getCycleHistory();
  history.push(test);

  if(history.length > 30) history.shift();

  saveCycleHistory(history);
  drawCycleGraph();
  renderCycleHistory();
  updateCycleGuidance();
  const g = el('cycleSmartStatus');
  if(g) g.closest('.card').scrollIntoView({behavior:'smooth', block:'start'});
}

function clearCycleHistory(){
  if(!confirm("Clear cycle graph history and dosing markers?")) return;
  localStorage.removeItem("aquoraxCycleHistory");
  localStorage.removeItem("aquoraxGraphEvents");
  drawCycleGraph();
  renderCycleHistory();
  updateCycleGuidance();
}

function drawCycleGraph(){
  const canvas = el("cycleGraph");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const history = getCycleHistory();
  const events = getGraphEvents();

  const width = canvas.width;
  const height = canvas.height;
  const pad = 38;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#02070d";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1;

  for(let i=0;i<=4;i++){
    const y = pad + ((height - pad*2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - 16, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#9fbcd3";
  ctx.font = "13px Arial";

  if(history.length === 0 && events.length === 0){
    ctx.fillText("Save test results or confirm dosing to build your cycle graph.", pad, height / 2);
    return;
  }

  const timelineItems = [
    ...history.map(h => ({iso:h.iso, kind:"test"})),
    ...events.map(e => ({iso:e.iso, kind:e.type}))
  ].sort((a,b) => new Date(a.iso) - new Date(b.iso));

  const startTime = new Date(timelineItems[0].iso).getTime();
  const endTime = new Date(timelineItems[timelineItems.length - 1].iso).getTime();
  const timeRange = Math.max(endTime - startTime, 1);

  const values = [];
  history.forEach(h => {
    if(h.ammonia !== null) values.push(h.ammonia);
    if(h.nitrite !== null) values.push(h.nitrite);
    if(h.nitrate !== null) values.push(h.nitrate);
  });

  let maxValue = values.length ? Math.max(...values, 1) : 1;
  maxValue = Math.ceil(maxValue);

  ctx.fillText(maxValue + " ppm", 4, pad + 4);
  ctx.fillText("0", 20, height - pad + 4);

  function xForIso(iso){
    if(timelineItems.length === 1) return width / 2;
    const t = new Date(iso).getTime();
    return pad + ((t - startTime) / timeRange) * (width - pad - 22);
  }

  function yForValue(value){
    const cleanValue = value === null ? 0 : value;
    return height - pad - ((cleanValue / maxValue) * (height - pad*2));
  }

  function drawLine(key, color){
    if(history.length === 0) return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    history.forEach((h, index) => {
      const x = xForIso(h.iso);
      const y = yForValue(h[key]);
      if(index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    history.forEach(h => {
      const x = xForIso(h.iso);
      const y = yForValue(h[key]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawLine("ammonia", "#63f7a3");
  drawLine("nitrite", "#00c8ff");
  drawLine("nitrate", "#ffd36a");

  events.forEach(event => {
    const x = xForIso(event.iso);
    const color = event.type === "rapid" ? "#ff6b6b" : "#c084fc";
    const label = event.type === "rapid" ? "Rapid" : "Paradigm";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, height - pad);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, pad + 10, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x + 6, pad + 24);
    ctx.rotate(-Math.PI / 7);
    ctx.fillStyle = "#dceeff";
    ctx.font = "11px Arial";
    ctx.fillText(label + " " + event.date + " " + event.time, 0, 0);
    ctx.restore();
  });
}

function getCycleTestsForState(){
  if(typeof getCycleData === "function"){
    const d = getCycleData();
    if(d && Array.isArray(d.tests)) return d.tests;
  }
  try{
    const direct = JSON.parse(localStorage.getItem("aquoraxCycleTests") || "null");
    if(Array.isArray(direct)) return direct;
  }catch(e){}
  try{
    const legacy = JSON.parse(localStorage.getItem("cycleTests") || "null");
    if(Array.isArray(legacy)) return legacy;
  }catch(e){}
  try{
    const tests = JSON.parse(localStorage.getItem("tests") || "null");
    if(Array.isArray(tests)) return tests;
  }catch(e){}
  return [];
}

function numFromTest(t, keys){
  for(const k of keys){
    if(t && t[k] !== undefined && t[k] !== null && t[k] !== ""){
      const n = parseFloat(t[k]);
      if(!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function testDateFromTest(t){
  return (t && (t.date || t.testDate || t.createdAt || t.time || t.timestamp)) || "";
}

function renderTankStateSummary(){
  const el = document.getElementById("tankStateCard");
  if(!el) return;

  const tests = getCycleTestsForState();
  if(!tests.length){
    el.innerHTML = `
      <div class="tankStateTop">
        <div>
          <h2>Current Tank State</h2>
          <p>No water test has been logged yet.</p>
        </div>
        <div class="tankStateBadge waiting">● Waiting</div>
      </div>
      <p class="small">Add your first ammonia, nitrite and nitrate result to unlock your live cycle status.</p>
    `;
    return;
  }

  const last = tests[tests.length - 1];
  const ammonia = numFromTest(last, ["ammonia","nh3","amm"]);
  const nitrite = numFromTest(last, ["nitrite","no2"]);
  const nitrate = numFromTest(last, ["nitrate","no3"]);
  const date = testDateFromTest(last);

  let state = "Cycling";
  let badgeClass = "cycling";
  let dot = "●";
  let message = "Your filter bacteria are still building. Keep testing before adding livestock.";

  if(ammonia >= 1 || nitrite >= 1.5){
    state = "Issue Detected";
    badgeClass = "issue";
    message = "Ammonia or nitrite is high. Avoid livestock additions and keep monitoring closely.";
  } else if(ammonia === 0 && nitrite === 0 && nitrate > 0){
    state = "Stable";
    badgeClass = "stable";
    message = "Ammonia and nitrite are zero with nitrate present. Confirm stability with repeat testing.";
  } else if(ammonia > 0 || nitrite > 0){
    state = "Cycling";
    badgeClass = "cycling";
    message = "The cycle is active. This is normal while the biological filter develops.";
  } else {
    state = "Monitoring";
    badgeClass = "waiting";
    message = "Readings are low, but more results are needed to confirm the tank state.";
  }

  const dateText = date ? `Last Test ${new Date(date).toString() !== "Invalid Date" ? new Date(date).toLocaleDateString() : date}` : "Last Test";

  el.innerHTML = `
    <div class="tankStateTop">
      <div>
        <h2>Current Tank State</h2>
        <p>${message}</p>
      </div>
      <div class="tankStateBadge ${badgeClass}">${dot} ${state}</div>
    </div>

    <h3>${dateText}</h3>
    <div class="lastTestGrid">
      <div class="lastTestBox"><span>Ammonia</span><b>${ammonia} ppm</b></div>
      <div class="lastTestBox"><span>Nitrite</span><b>${nitrite} ppm</b></div>
      <div class="lastTestBox"><span>Nitrate</span><b>${nitrate} ppm</b></div>
    </div>
  `;
}

function pulseCycleGraph(){
  const graphCard = document.querySelector("#cycleGraph")?.closest(".card");
  if(!graphCard) return;
  graphCard.classList.remove("graphPulse");
  void graphCard.offsetWidth;
  graphCard.classList.add("graphPulse");
}

function renderCycleHistory(){
  const list = el("cycleHistoryList");
  if(!list) return;

  const history = getCycleHistory().map(h => ({...h, kind:"test"}));
  const events = getGraphEvents().map(e => ({...e, kind:e.type}));

  const combined = [...history, ...events].sort((a,b) => new Date(b.iso) - new Date(a.iso));

  if(combined.length === 0){
    list.innerHTML = "";
    return;
  }

  list.innerHTML = combined.slice(0, 8).map(item => {
    if(item.kind === "rapid"){
      return `
        <div class="historyItem">
          <strong>${item.date} ${item.time} — Rapid Cycle Added</strong>
          <span>Blue Shark Colony dose confirmed and marked on the graph.</span>
        </div>
      `;
    }

    if(item.kind === "paradigm"){
      const days = daysSince(item.iso);
      const dayText = days === 0 ? "Added today" : days === 1 ? "1 day ago" : days + " days ago";
      return `
        <div class="historyItem">
          <strong>${item.date} ${item.time} — Paradigm Added</strong>
          <span>Blue Shark Paradigm dose confirmed. ${dayText}.</span>
        </div>
      `;
    }

    return `
      <div class="historyItem">
        <strong>${item.date} ${item.time} — Water Test Saved</strong>
        <span>Ammonia: ${item.ammonia ?? "-"} ppm · Nitrite: ${item.nitrite ?? "-"} ppm · Nitrate: ${item.nitrate ?? "-"} ppm</span>
      </div>
    `;
  }).join("");
}

function setGuidanceExtra(extra){
  const next = el("cycleSmartNext");
  if(next && extra && !next.innerText.includes(extra)){
    next.innerText += " " + extra;
  }
}

function updateCycleGuidance(){
  const statusEl = el("cycleSmartStatus");
  const whatEl = el("cycleSmartWhat");
  const nextEl = el("cycleSmartNext");
  const confidenceEl = el("cycleConfidence");

  if(!statusEl || !whatEl || !nextEl || !confidenceEl) return;

  const history = getCycleHistory();
  const doseLog = getDoseLog();
  const rapidAdded = !!doseLog.rapid;
  const paradigmLog = Array.isArray(doseLog.paradigm) ? doseLog.paradigm : [];
  const lastParadigm = paradigmLog[paradigmLog.length - 1];

  const liveAmmonia = numberValue("ammonia");
  const liveNitrite = numberValue("nitrite");
  const liveNitrate = numberValue("nitrate");

  let status = "Waiting for data";
  let what = rapidAdded
    ? "Blue Shark Rapid Cycle has been recorded. Save a water test so AquoraX can guide the cycle."
    : "Confirm Rapid Cycle and save your first water test to begin cycle guidance.";
  let next = "Enter ammonia, nitrite and nitrate, then press Save Test Result.";
  let confidence = "Waiting for saved test results.";

  if(history.length === 0 && (liveAmmonia !== null || liveNitrite !== null || liveNitrate !== null)){
    status = "Ready to save test";
    what = "You have readings entered, but they have not been saved to the graph yet.";
    next = "Press Save Test Result so AquoraX can start tracking your cycle pattern.";
    confidence = "Low — readings entered but not saved.";
  }

  if(history.length === 1){
    const latest = history[0];
    status = "Cycle tracking started";
    what = "Your first test has been saved. AquoraX needs more than one result to detect a trend.";
    next = "Test again later and save the result so the app can compare movement.";
    confidence = "Low — one saved test result.";

    if(latest.ammonia !== null && latest.ammonia > 0.25){
      status = "Early cycle";
      what = "Ammonia is present. This is commonly seen in the first stage of cycling.";
      next = "Keep testing every few days. Do not rush livestock.";
    }
  }

  if(history.length >= 2){
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    const aNow = latest.ammonia;
    const n2Now = latest.nitrite;
    const n3Now = latest.nitrate;

    const aPrev = previous.ammonia;
    const n2Prev = previous.nitrite;
    const n3Prev = previous.nitrate;

    const ammoniaDropping = aNow !== null && aPrev !== null && aNow < aPrev;
    const ammoniaRising = aNow !== null && aPrev !== null && aNow > aPrev;
    const nitriteRising = n2Now !== null && n2Prev !== null && n2Now > n2Prev;
    const nitriteDropping = n2Now !== null && n2Prev !== null && n2Now < n2Prev;
    const nitrateRising = n3Now !== null && n3Prev !== null && n3Now > n3Prev;

    const ammoniaZero = aNow !== null && aNow <= 0.1;
    const nitriteZero = n2Now !== null && n2Now <= 0.1;
    const nitratePresent = n3Now !== null && n3Now > 0;

    status = "Tracking cycle";
    what = "AquoraX is reading the movement between your saved water tests.";
    next = "Keep saving results so the trend becomes clearer.";
    confidence = history.length >= 4 ? "Medium — based on " + history.length + " saved tests." : "Low — based on " + history.length + " saved tests.";

    if(ammoniaRising){
      status = "Early cycle";
      what = "Ammonia is still rising. This usually means the cycle is still in its early phase.";
      next = "Continue testing. Avoid adding extra livestock until ammonia starts dropping.";
      confidence = "Medium — ammonia movement detected.";
    }

    if(ammoniaDropping && nitriteRising){
      status = "Cycle progressing";
      what = "Ammonia is dropping while nitrite is rising. This means bacteria are converting ammonia.";
      next = "Keep monitoring. Do not rush the cycle; wait for nitrite to fall.";
      confidence = "High — ammonia and nitrite trend detected.";
    }

    if(ammoniaZero && n2Now !== null && n2Now > 0.5){
      status = "Nitrite phase";
      what = "Ammonia is near zero and nitrite is now the dominant reading.";
      next = "Keep testing. The tank is progressing but is not fully cycled yet.";
      confidence = "High — nitrite phase detected.";
    }

    if(nitrateRising && ammoniaDropping && nitriteDropping){
      status = "Nearing completion";
      what = "Nitrate is building while ammonia and nitrite are falling. This is a strong sign your biofilter is developing.";
      next = "Prepare for a water change and continue testing until ammonia and nitrite stay at zero.";
      confidence = "High — late cycle trend detected.";
    }

    if(ammoniaZero && nitriteZero && nitratePresent){
      status = "Cycled";
      what = "Ammonia and nitrite are near zero while nitrate is present. This suggests your biological filtration is established.";
      next = "Add livestock slowly and continue monitoring water quality.";
      confidence = "High — based on " + history.length + " saved tests.";
    }
  }

  if(rapidAdded){
    what += " Blue Shark Rapid Cycle is logged on your graph.";
  }

  if(lastParadigm){
    const days = daysSince(lastParadigm.iso);
    if(days === 0) next += " Paradigm was recorded today.";
    else if(days === 1) next += " Paradigm was last recorded 1 day ago.";
    else if(days !== null) next += " Paradigm was last recorded " + days + " days ago.";
  }

  statusEl.innerText = status;
  whatEl.innerText = what;
  nextEl.innerText = next;
  confidenceEl.innerHTML = "<strong>Confidence</strong>" + confidence;
  renderBeginnerCycleGuide();
}



function isBeginnerModeOn(){
  return localStorage.getItem("aquoraxBeginnerMode") !== "off";
}

function toggleBeginnerMode(on){
  localStorage.setItem("aquoraxBeginnerMode", on ? "on" : "off");
  applyBeginnerMode();
  renderBeginnerCycleGuide();
}

function applyBeginnerMode(){
  const on = isBeginnerModeOn();
  document.body.classList.toggle("aqxBeginnerMode", on);
  const toggle = document.getElementById("beginnerModeToggle");
  if(toggle) toggle.checked = on;
}

function latestCycleSnapshot(){
  const history = typeof getCycleHistory === "function" ? getCycleHistory() : [];
  const latest = history.length ? history[history.length - 1] : null;
  return {
    history,
    latest,
    ammonia: latest ? latest.ammonia : numberValue("ammonia"),
    nitrite: latest ? latest.nitrite : numberValue("nitrite"),
    nitrate: latest ? latest.nitrate : numberValue("nitrate"),
    ph: latest ? latest.ph : numberValue("ph"),
    temp: latest ? latest.temp : numberValue("temp"),
    salinity: latest ? latest.salinity : numberValue("salinity")
  };
}

function beginnerCycleState(){
  const snap = latestCycleSnapshot();
  const h = snap.history;
  const a = snap.ammonia;
  const n2 = snap.nitrite;
  const n3 = snap.nitrate;

  let stage = "Waiting for first test";
  let text = "Save your first water test and AquoraX will explain the cycle in simple steps.";
  let today = "Add ammonia, nitrite and nitrate readings, then press Save Test Result.";
  let fish = "AquoraX needs a saved test before it can judge livestock safety.";
  let fishClass = "caution";
  let fishBadge = "⚠️ Waiting for data";
  let reminder = "After your first saved test, test again in around 24 hours while cycling.";

  if(h.length === 0 && (a !== null || n2 !== null || n3 !== null)){
    stage = "Ready to save";
    text = "You have readings entered, but they are not saved yet. Saving creates your cycle timeline.";
    today = "Press Save Test Result so AquoraX can start tracking your cycle.";
  }

  if(h.length > 0){
    stage = "Cycle started";
    text = "Your first results are saved. The app now needs repeat tests to see the direction your cycle is moving.";
    today = "Do not panic over one result. Test again in about 24 hours and watch the trend.";
    reminder = "Next recommended test: around 24 hours after the last saved test.";
  }

  if(a !== null && a > 0.25){
    stage = "Ammonia stage";
    text = "Ammonia is present. In a new tank this usually means the cycle is in its early stage.";
    today = "Keep testing and avoid adding extra livestock until ammonia starts dropping.";
    fish = "Ammonia can stress or harm fish. Wait until it reaches zero before adding more livestock.";
    fishClass = "unsafe";
    fishBadge = "❌ Not safe yet";
  }

  if(a !== null && a <= 0.25 && n2 !== null && n2 > 0.25){
    stage = "Nitrite stage";
    text = "Ammonia is being processed, but nitrite is now present. This is progress, but the tank is not finished yet.";
    today = "Keep testing. Wait for nitrite to fall to zero before calling the cycle complete.";
    fish = "Nitrite is also dangerous. Hold off until nitrite stays at zero.";
    fishClass = "unsafe";
    fishBadge = "❌ Not safe yet";
  }

  if(a !== null && n2 !== null && n3 !== null && a <= 0.1 && n2 <= 0.1 && n3 > 0){
    stage = "Likely cycled";
    text = "Ammonia and nitrite are near zero while nitrate is present. That is the classic sign your filter bacteria are working.";
    today = "Confirm with another test, then add livestock slowly rather than all at once.";
    fish = "Looks safe to proceed slowly, but keep testing after any new livestock.";
    fishClass = "safe";
    fishBadge = "✅ Safer to add slowly";
    reminder = "Next recommended test: test again tomorrow to confirm stability before increasing livestock.";
  }

  if(a !== null && n2 !== null && (a > 0.1 || n2 > 0.1) && a <= 0.25 && n2 <= 0.25){
    fish = "Very low readings are better, but beginners should wait for ammonia and nitrite to stay at zero.";
    fishClass = "caution";
    fishBadge = "⚠️ Proceed with caution";
  }

  return {stage,text,today,fish,fishClass,fishBadge,reminder,snap};
}

function explainParam(name, value, unit){
  if(value === null || value === undefined || value === ""){
    return `${name}: not tested yet. Add this reading when you can.`;
  }
  const v = parseFloat(value);
  if(name === "Ammonia"){
    if(v <= 0.1) return "Ammonia is controlled. This should stay at zero in a safe tank.";
    if(v <= 0.25) return "A small ammonia reading means keep watching closely.";
    return "Ammonia is elevated. This is common during cycling but unsafe for livestock.";
  }
  if(name === "Nitrite"){
    if(v <= 0.1) return "Nitrite is controlled. This should also stay at zero.";
    return "Nitrite is present. Your cycle is progressing, but it is not complete yet.";
  }
  if(name === "Nitrate"){
    if(v <= 0) return "No nitrate yet. The cycle may still be early or not enough data is saved.";
    if(v <= 40) return "Nitrate is present. This often means the cycle is moving in the right direction.";
    return "Nitrate is high. A water change may be needed once ammonia and nitrite are safe.";
  }
  if(name === "pH"){
    if(v < 6.8) return "pH is low for many tanks. Keep it stable and check your tank type target.";
    if(v > 8.5) return "pH is high. Stability matters, but check it against your tank type target.";
    return "pH looks within a common aquarium range. Stability is key.";
  }
  return `${name}: ${value}${unit ? " " + unit : ""}.`;
}

function renderBeginnerCycleGuide(){
  applyBeginnerMode();
  const card = document.getElementById("beginnerGuideCard");
  if(!card) return;

  const state = beginnerCycleState();
  const snap = state.snap;

  const stageBadge = document.getElementById("beginnerStageBadge");
  const stageText = document.getElementById("beginnerStageText");
  const todayText = document.getElementById("beginnerTodayText");
  const fishText = document.getElementById("beginnerFishText");
  const fishBadge = document.getElementById("beginnerFishBadge");
  const reminderText = document.getElementById("beginnerReminderText");
  const paramGrid = document.getElementById("beginnerParamExplainGrid");

  if(stageBadge) stageBadge.innerText = "🧪 " + state.stage;
  if(stageText) stageText.innerText = state.text;
  if(todayText) todayText.innerText = state.today;
  if(fishText) fishText.innerText = state.fish;
  if(fishBadge){
    fishBadge.className = "fishSafetyBadge " + state.fishClass;
    fishBadge.innerText = state.fishBadge;
  }
  if(reminderText) reminderText.innerText = state.reminder;

  if(paramGrid){
    const rows = [
      ["Ammonia", snap.ammonia, "ppm"],
      ["Nitrite", snap.nitrite, "ppm"],
      ["Nitrate", snap.nitrate, "ppm"],
      ["pH", snap.ph, ""]
    ];
    paramGrid.innerHTML = rows.map(([name,value,unit]) => `
      <div class="beginnerParam">
        <strong>${name}${value !== null && value !== undefined ? `: ${value}${unit ? " " + unit : ""}` : ""}</strong>
        <span>${explainParam(name,value,unit)}</span>
      </div>
    `).join("");
  }
}

function parameterTargets(type){
  if(type === "reef"){
    return [
      ["Ammonia", "0 ppm"],
      ["Nitrite", "0 ppm"],
      ["Nitrate", "2–20 ppm"],
      ["pH", "8.1–8.4"],
      ["Temperature", "24–26°C"],
      ["Salinity", "1.024–1.026 SG"],
      ["Alkalinity", "7–10 dKH"],
      ["Calcium", "400–450 ppm"],
      ["Magnesium", "1250–1350 ppm"],
      ["Phosphate", "0.03–0.10 ppm"]
    ];
  }
  return [
    ["Ammonia", "0 ppm"],
    ["Nitrite", "0 ppm"],
    ["Nitrate", "5–40 ppm"],
    ["pH", "6.8–7.8"],
    ["Temperature", "24–26°C"],
    ["GH", "4–12 dGH"],
    ["KH", "3–8 dKH"],
    ["Phosphate", "0.1–1.0 ppm"],
    ["Lighting", "6–8 hrs daily"],
    ["Fertiliser", "Dose to plant demand"]
  ];
}


function renderParameterPage(){
  const type = selectedTankType() || "freshwater";
  const isReef = type === "reef";
  const title = el("parameterTitle");
  const summary = el("parameterSummary");
  const intro = el("parameterPageIntro");
  const grid = el("parameterGrid");

  if(title) title.innerText = isReef ? "Saltwater / Reef Parameter Targets" : "Freshwater Parameter Targets";
  if(summary) summary.innerText = isReef
    ? "Use these reef targets as your quick test-chart guide. Keep changes slow and stable."
    : "Use these freshwater targets as your quick test-chart guide. Adjust slowly for your livestock and plants.";
  if(intro) intro.innerText = isReef
    ? "Saltwater selected — reef parameter targets shown below."
    : "Freshwater selected — freshwater parameter targets shown below.";

  if(grid){
    grid.innerHTML = parameterTargets(type).map(row => `
      <div class="paramTile">
        <strong>${row[0]}</strong>
        <span>${row[1]}</span>
      </div>
    `).join("");
  }

  const coralOpen = el("coralTrackerOpen");
  const plantOpen = el("plantTrackerOpen");
  const growthCoralOpen = el("growthCoralTrackerOpen");
  const growthPlantOpen = el("growthPlantTrackerOpen");
  if(coralOpen) coralOpen.style.display = isReef ? "block" : "none";
  if(plantOpen) plantOpen.style.display = isReef ? "none" : "block";
  if(growthCoralOpen) growthCoralOpen.style.display = isReef ? "block" : "none";
  if(growthPlantOpen) growthPlantOpen.style.display = isReef ? "none" : "block";

  renderTrackerList("coral");
  renderTrackerList("plant");
  renderLiveParameters();
  renderSmartInsights();
  renderHomeDashboard();
}

function openGrowthTrackerPanel(kind){
  const main = el("growthMain");
  const coralPanel = el("coralTrackerPanel");
  const plantPanel = el("plantTrackerPanel");

  if(main) main.style.display = "none";
  if(coralPanel) coralPanel.classList.toggle("active", kind === "coral");
  if(plantPanel) plantPanel.classList.toggle("active", kind === "plant");

  renderTrackerList(kind);
  window.scrollTo(0,0);
}

function closeTrackerPanels(){
  const main = el("growthMain");
  const coralPanel = el("coralTrackerPanel");
  const plantPanel = el("plantTrackerPanel");

  if(main) main.style.display = "block";
  if(coralPanel) coralPanel.classList.remove("active");
  if(plantPanel) plantPanel.classList.remove("active");

  window.scrollTo(0,0);
}


function triggerCameraInput(inputId){
  const input = el(inputId);
  if(input) input.click();
}

function trackerKey(kind){
  return kind === "coral" ? "aquoraxCoralTracker" : "aquoraxPlantTracker";
}

function getTrackerItems(kind){
  try{
    const data = JSON.parse(localStorage.getItem(trackerKey(kind)) || "[]");
    return Array.isArray(data) ? data : [];
  }catch(e){
    return [];
  }
}

function saveTrackerItems(kind, items){
  try{
    localStorage.setItem(trackerKey(kind), JSON.stringify(items));
  }catch(e){
    alert("Storage is full on this device. Try using smaller photos, deleting old updates, or exporting before adding more.");
    throw e;
  }
}


function compressTrackerImage(file, maxSize=900, quality=0.72){
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if(width > height && width > maxSize){
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        }else if(height > maxSize){
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = () => resolve(e.target.result || "");
      img.src = e.target.result;
    };

    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function readTrackerImage(inputId){
  return new Promise(resolve => {
    const input = el(inputId);
    if(!input || !input.files || !input.files[0]){
      resolve("");
      return;
    }

    compressTrackerImage(input.files[0]).then(resolve);
  });
}

function trackerStorageWarning(){
  return "Images are compressed before saving so bigger collections work much better on one device. Browser storage still has a real device limit, so huge coral farms should use smaller photos.";
}

function toggleTrackerDetails(kind, id){
  const box = el(`${kind}Details_${id}`);
  if(!box) return;
  box.classList.toggle("open");
}

async function addTrackerItem(kind){
  const prefix = kind === "coral" ? "coral" : "plant";
  const name = val(prefix + "Name").trim();
  const type = val(prefix + "Type").trim();
  const dateAdded = val(prefix + "DateAdded");
  const growth = val(prefix + "Growth").trim();

  if(!name){
    alert(kind === "coral" ? "Add a coral name first." : "Add a plant name first.");
    return;
  }

  const image = await readTrackerImage(prefix + "Image");
  const stamp = nowStamp();
  const items = getTrackerItems(kind);

  items.unshift({
    id:Date.now(),
    name,
    type,
    dateAdded:dateAdded || stamp.iso.slice(0,10),
    growth,
    firstImage:image,
    latestImage:image,
    latestNote:growth,
    createdDate:stamp.date,
    createdTime:stamp.time,
    updates:[]
  });

  saveTrackerItems(kind, items);

  setVal(prefix + "Name", "");
  setVal(prefix + "Type", "");
  setVal(prefix + "DateAdded", "");
  setVal(prefix + "Growth", "");
  if(el(prefix + "Image")) el(prefix + "Image").value = "";

  renderTrackerList(kind);
}

async function addTrackerGrowthImage(kind, id){
  const inputId = `${kind}UpdateImage_${id}`;
  const noteId = `${kind}UpdateNote_${id}`;
  const image = await readTrackerImage(inputId);
  const note = val(noteId).trim();

  if(!image && !note){
    alert("Add a progress image or growth note first.");
    return;
  }

  const stamp = nowStamp();
  const items = getTrackerItems(kind);
  const item = items.find(x => String(x.id) === String(id));
  if(!item) return;

  if(!Array.isArray(item.updates)) item.updates = [];
  item.updates.unshift({
    image,
    note,
    date:stamp.date,
    time:stamp.time,
    iso:stamp.iso
  });

  if(image) item.latestImage = image;
  if(note) item.latestNote = note;

  saveTrackerItems(kind, items);
  renderTrackerList(kind);
}

function deleteTrackerItem(kind, id){
  if(!confirm("Delete this saved tracker item?")) return;
  const items = getTrackerItems(kind).filter(item => String(item.id) !== String(id));
  saveTrackerItems(kind, items);
  renderTrackerList(kind);
}

function imageBox(label, image){
  if(image){
    return `
      <div class="compareImageBox">
        <img src="${image}" alt="${label}">
        <span>${label}</span>
      </div>
    `;
  }
  return `
    <div class="compareImageBox">
      <span style="padding:45px 8px;">No ${label.toLowerCase()} saved</span>
    </div>
  `;
}


function compareSliderHtml(kind, item){
  if(!item.firstImage || !item.latestImage){
    return "";
  }

  const sameImage = item.firstImage === item.latestImage;
  const disabledNote = sameImage
    ? "Add a newer progress photo to unlock a proper before/after comparison."
    : "Drag the slider to compare the first photo with the latest progress photo.";

  return `
    <div class="compareSliderWrap">
      <div class="compareSlider" id="${kind}Slider_${item.id}">
        <img src="${item.firstImage}" alt="First ${kind} photo">
        <img class="latestImageLayer" id="${kind}LatestLayer_${item.id}" src="${item.latestImage}" alt="Latest ${kind} photo">
        <div class="compareSliderLine" id="${kind}SliderLine_${item.id}"></div>
        <div class="compareSliderHandle" id="${kind}SliderHandle_${item.id}">↔</div>
        <div class="compareSliderLabels">
          <span>First</span>
          <span>Latest</span>
        </div>
      </div>
      <input class="compareRange" type="range" min="0" max="100" value="50" oninput="updateCompareSlider('${kind}', '${item.id}', this.value)">
      <div class="sliderHint">${disabledNote}</div>
    </div>
  `;
}

function updateCompareSlider(kind, id, value){
  const safe = Math.max(0, Math.min(100, parseFloat(value) || 50));
  const layer = el(`${kind}LatestLayer_${id}`);
  const line = el(`${kind}SliderLine_${id}`);
  const handle = el(`${kind}SliderHandle_${id}`);

  if(layer) layer.style.clipPath = `inset(0 0 0 ${safe}%)`;
  if(line) line.style.left = safe + "%";
  if(handle) handle.style.left = safe + "%";
}



function renderTrackerList(kind){
  const list = el(kind === "coral" ? "coralTrackerList" : "plantTrackerList");
  if(!list) return;

  const countEl = el(kind === "coral" ? "coralTrackerCount" : "plantTrackerCount");
  const searchEl = el(kind === "coral" ? "coralTrackerSearch" : "plantTrackerSearch");

  const allItems = getTrackerItems(kind);
  const label = kind === "coral" ? "coral" : "plant";
  const plural = kind === "coral" ? "corals" : "plants";
  const query = searchEl ? searchEl.value.trim().toLowerCase() : "";

  const items = query
    ? allItems.filter(item => `${item.name || ""} ${item.type || ""} ${item.growth || ""} ${item.latestNote || ""}`.toLowerCase().includes(query))
    : allItems;

  if(countEl){
    countEl.innerText = query
      ? `${items.length} of ${allItems.length} ${plural} shown`
      : `${allItems.length} ${plural} saved`;
  }

  if(!allItems.length){
    list.innerHTML = `<div class="trackerItem"><span>No ${plural} saved yet.</span><div class="storageNote">${trackerStorageWarning()}</div></div>`;
    return;
  }

  if(!items.length){
    list.innerHTML = `<div class="trackerItem"><span>No ${plural} match your search.</span></div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const latestUpdate = Array.isArray(item.updates) && item.updates.length ? item.updates[0] : null;
    const latestText = latestUpdate
      ? `Latest update ${latestUpdate.date} · ${latestUpdate.time}`
      : `Added ${item.createdDate || item.dateAdded || ""}`;

    const updateCount = Array.isArray(item.updates) ? item.updates.length : 0;

    return `
      <div class="trackerItem">
        <div class="trackerItemHeader">
          <div>
            <strong>${item.name}</strong>
            <span>${item.type || "No type / placement added."}</span>
            <span>Date added: ${item.dateAdded || "Not set"}</span>
            <div class="growthBadge">${updateCount} update${updateCount === 1 ? "" : "s"} · ${latestText}</div>
          </div>
          <button class="secondaryBtn" onclick="toggleTrackerDetails('${kind}', '${item.id}')">Open</button>
        </div>

        <div class="trackerThumbRow">
          ${item.firstImage ? `<img class="trackerThumb" src="${item.firstImage}" alt="First photo" onclick="openTrackerTimeline('${kind}', '${item.id}', 0)">` : ""}
          ${item.latestImage && item.latestImage !== item.firstImage ? `<img class="trackerThumb" src="${item.latestImage}" alt="Latest photo" onclick="openTrackerTimeline('${kind}', '${item.id}', 999)">` : ""}
        </div>

        <div id="${kind}Details_${item.id}" class="trackerDetails">
          <span>${item.latestNote || item.growth || "No growth notes added yet."}</span>

          <div class="sideBySideImages">
            ${imageBox("First photo", item.firstImage)}
            ${imageBox("Latest photo", item.latestImage)}
          </div>

          ${compareSliderHtml(kind, item)}

          <button class="secondaryBtn" style="margin-top:10px;" onclick="openTrackerTimeline('${kind}', '${item.id}', 0)">Open Full Photo Timeline</button>

          <div style="margin-top:12px;">
            <label>Add Progress Photo</label>
            <input id="${kind}UpdateImage_${item.id}" class="imageInput" type="file" accept="image/*" capture="environment">

            <div class="cameraQuickBox">
              <strong>Camera</strong>
              <span>Open your camera and add a fresh growth photo for this ${label}.</span>
              <button type="button" class="cameraBtn" onclick="triggerCameraInput('${kind}UpdateImage_${item.id}')">📸 Open Camera / Add Progress Photo</button>
            </div>

            <label>Growth Update</label>
            <input id="${kind}UpdateNote_${item.id}" placeholder="Example: New growth, colour change, trimmed back">

            <button class="primaryBtn" onclick="addTrackerGrowthImage('${kind}', '${item.id}')">Save Growth Update</button>
            <button class="secondaryBtn" style="margin-top:8px;" onclick="deleteTrackerItem('${kind}', '${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}


function resetCycle(){
  if(!confirm("Reset your cycle journey? This will reset readings, dosing confirmations and graph history.")) return;

  localStorage.removeItem("aquoraxCycleData");
  localStorage.removeItem("aquoraxCycleHistory");
  localStorage.removeItem("aquoraxGraphEvents");
  localStorage.removeItem("aquoraxDoseLog");

  const savedTank = localStorage.getItem("aquoraxTankType") || "freshwater";
  const savedVolume = localStorage.getItem("aquoraxTankVolume") || "";

  setVal("cycleTank", savedTank);
  setVal("cycleVolume", savedVolume);
  setVal("cycleStage", "0");
  setVal("ammonia", "");
  setVal("nitrite", "");
  setVal("nitrate", "");
  setVal("ph", "");
  setVal("temp", "");
  setVal("salinity", "");

  saveCycle();
  drawCycleGraph();
  renderCycleHistory();
}



/* Dosing + ICP tracker logic */
function getDosingProducts(){
  try{ const d = JSON.parse(localStorage.getItem("aquoraxDosingProducts") || "[]"); return Array.isArray(d) ? d : []; }catch(e){ return []; }
}
function saveDosingProducts(items){ localStorage.setItem("aquoraxDosingProducts", JSON.stringify(items)); }
function getDosingHistory(){
  try{ const d = JSON.parse(localStorage.getItem("aquoraxDosingHistory") || "[]"); return Array.isArray(d) ? d : []; }catch(e){ return []; }
}
function saveDosingHistory(items){ localStorage.setItem("aquoraxDosingHistory", JSON.stringify(items)); }
function getIcpTests(){
  try{ const d = JSON.parse(localStorage.getItem("aquoraxIcpTests") || "[]"); return Array.isArray(d) ? d : []; }catch(e){ return []; }
}
function saveIcpTests(items){ localStorage.setItem("aquoraxIcpTests", JSON.stringify(items)); }
function doseIntervalDays(freq, custom){
  if(freq === "daily") return 1;
  if(freq === "weekly") return 7;
  const n = parseInt(custom,10);
  return (!Number.isNaN(n) && n > 0) ? n : 1;
}
function prettyDateTime(iso){
  if(!iso) return "Not logged yet";
  const d = new Date(iso);
  if(d.toString() === "Invalid Date") return iso;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function nextDueText(product){
  if(!product.lastDosedIso) return {text:"Due now", cls:"due"};
  const days = doseIntervalDays(product.frequency, product.interval);
  const next = new Date(new Date(product.lastDosedIso).getTime() + days*86400000);
  const diffDays = Math.ceil((next.getTime() - Date.now()) / 86400000);
  if(diffDays <= 0) return {text:"Due now", cls:"due"};
  if(diffDays === 1) return {text:"Due tomorrow", cls:""};
  return {text:`Due in ${diffDays} days`, cls:""};
}
function toggleCustomDoseInterval(){
  const wrap = el("customDoseIntervalWrap");
  if(wrap) wrap.style.display = val("doseProductFrequency") === "custom" ? "block" : "none";
}
function addDosingProduct(){
  const name = val("doseProductName").trim();
  const amount = parseFloat(val("doseProductAmount"));
  if(!name){ alert("Add a product name first."); return; }
  if(Number.isNaN(amount) || amount <= 0){ alert("Add a dose amount first."); return; }
  const freq = val("doseProductFrequency") || "daily";
  const product = {
    id:Date.now(),
    name,
    amount,
    unit:val("doseProductUnit") || "ml",
    frequency:freq,
    interval:doseIntervalDays(freq, val("doseProductInterval")),
    notes:val("doseProductNotes"),
    createdIso:new Date().toISOString(),
    lastDosedIso:null
  };
  const items = getDosingProducts();
  items.push(product);
  saveDosingProducts(items);
  ["doseProductName","doseProductAmount","doseProductInterval","doseProductNotes"].forEach(id => setVal(id,""));
  setVal("doseProductFrequency","daily");
  toggleCustomDoseInterval();
  renderDosingPage();
}
function logDose(productId){
  const items = getDosingProducts();
  const p = items.find(x => String(x.id) === String(productId));
  if(!p) return;
  const iso = new Date().toISOString();
  p.lastDosedIso = iso;
  saveDosingProducts(items);
  const history = getDosingHistory();
  history.unshift({id:Date.now(), productId:p.id, name:p.name, amount:p.amount, unit:p.unit, iso});
  saveDosingHistory(history.slice(0,200));
  renderDosingPage();
}
function deleteDosingProduct(productId){
  if(!confirm("Remove this dosing product?")) return;
  saveDosingProducts(getDosingProducts().filter(x => String(x.id) !== String(productId)));
  renderDosingPage();
}
function clearDosingHistory(){
  if(!confirm("Clear dosing history? Products will stay saved.")) return;
  saveDosingHistory([]);
  renderDosingPage();
}
function renderDosingProducts(){
  const box = el("dosingProductList");
  if(!box) return;
  const items = getDosingProducts();
  if(!items.length){ box.innerHTML = '<p class="smallPrint">No dosing products saved yet.</p>'; return; }
  box.innerHTML = items.map(p => {
    const due = nextDueText(p);
    const freqText = p.frequency === "custom" ? `Every ${p.interval || 1} days` : (p.frequency === "weekly" ? "Weekly" : "Daily");
    return `<div class="doseTrackerCard">
      <strong>${p.name}</strong>
      <span>${p.amount} ${p.unit} · ${freqText}</span>
      <span>Last dosed: ${prettyDateTime(p.lastDosedIso)}</span>
      ${p.notes ? `<span>Notes: ${p.notes}</span>` : ""}
      <div class="doseStatusPill ${due.cls}">${due.text}</div>
      ${aqxConsumptionHtml(p)}
      <div class="doseActionRow">
        <button class="primaryBtn" onclick="logDose('${p.id}')">Log Dose</button>
        <button class="dangerBtn" onclick="deleteDosingProduct('${p.id}')">Remove</button>
      </div>
    </div>`;
  }).join("");
}
function renderDosingHistory(){
  const box = el("dosingHistoryList");
  if(!box) return;
  const history = getDosingHistory();
  if(!history.length){ box.innerHTML = '<p class="smallPrint">No doses logged yet.</p>'; return; }
  box.innerHTML = history.slice(0,30).map(h => `<div class="historyItem"><strong>${h.name}</strong><span>${h.amount} ${h.unit} dosed · ${prettyDateTime(h.iso)}</span></div>`).join("");
}
function addIcpParameterRow(name="", value="", unit="", status="ok"){
  const box = el("icpParameterBuilder");
  if(!box) return;
  const row = document.createElement("div");
  row.className = "icpParameterRow";
  row.innerHTML = `
    <div><label>Parameter</label><input class="icpName" placeholder="Example: Iodine" value="${name}"></div>
    <div><label>Value</label><input class="icpValue" placeholder="Example: 0.06" value="${value}"></div>
    <div><label>Unit / Status</label><input class="icpUnit" placeholder="ppm / µg/L" value="${unit}"><select class="icpStatus" style="margin-top:8px;"><option value="ok">OK</option><option value="watch">Watch</option><option value="low">Low</option><option value="high">High</option></select></div>
    <button class="icpRemoveBtn" onclick="this.closest('.icpParameterRow').remove()">×</button>
  `;
  box.appendChild(row);
  const select = row.querySelector('.icpStatus');
  if(select) select.value = status;
}
function addCommonIcpRows(){
  const common = ["Calcium","Magnesium","Alkalinity","Potassium","Iodine","Iron","Phosphate","Nitrate","Silicate","Strontium"];
  common.forEach(name => addIcpParameterRow(name,"","","ok"));
}
function resetIcpBuilder(){
  const box = el("icpParameterBuilder");
  if(box) box.innerHTML = "";
  addIcpParameterRow();
}
function saveIcpTest(){
  const rows = Array.from(document.querySelectorAll("#icpParameterBuilder .icpParameterRow"));
  const parameters = rows.map(row => ({
    name:(row.querySelector('.icpName')?.value || '').trim(),
    value:(row.querySelector('.icpValue')?.value || '').trim(),
    unit:(row.querySelector('.icpUnit')?.value || '').trim(),
    status:(row.querySelector('.icpStatus')?.value || 'ok')
  })).filter(p => p.name || p.value);
  if(!parameters.length){ alert("Add at least one ICP parameter first."); return; }
  const test = {
    id:Date.now(),
    date:val("icpDate") || new Date().toISOString().slice(0,10),
    lab:val("icpLab"),
    notes:val("icpNotes"),
    parameters,
    savedIso:new Date().toISOString()
  };
  const tests = getIcpTests();
  tests.unshift(test);
  saveIcpTests(tests);
  renderParameterPage(); renderHomeDashboard(); aqxRenderHomeParameterCustomiser(); aqxRenderHomeLayoutCustomiser();
  ["icpDate","icpLab","icpNotes"].forEach(id => setVal(id,""));
  resetIcpBuilder();
  renderIcpTests();
}
function deleteIcpTest(id){
  if(!confirm("Remove this ICP test?")) return;
  saveIcpTests(getIcpTests().filter(t => String(t.id) !== String(id)));
  renderIcpTests(); renderParameterPage(); renderHomeDashboard(); aqxRenderHomeParameterCustomiser(); aqxRenderHomeLayoutCustomiser();
  aqxRenderHomeLayoutCustomiser();
}
function renderIcpTests(){
  const box = el("icpTestList");
  if(!box) return;
  const tests = getIcpTests();
  if(!tests.length){ box.innerHTML = '<p class="smallPrint">No ICP tests saved yet.</p>'; return; }
  box.innerHTML = tests.map(t => {
    const chips = (t.parameters || []).map(p => {
      const cls = p.status === "ok" ? "good" : (p.status === "watch" ? "warn" : "bad");
      const value = [p.value, p.unit].filter(Boolean).join(" ");
      return `<span class="icpChip ${cls}">${p.name}${value ? `: ${value}` : ""}${p.status && p.status !== "ok" ? ` · ${p.status}` : ""}</span>`;
    }).join("");
    return `<div class="testHistoryItem">
      <strong>${t.date} ${t.lab ? `· ${t.lab}` : ""}</strong>
      ${t.notes ? `<span>${t.notes}</span>` : ""}
      <div class="icpParamChips">${chips}</div>
      <button class="dangerBtn" style="margin-top:12px;" onclick="deleteIcpTest('${t.id}')">Remove ICP Test</button>
    </div>`;
  }).join("");
}
function renderDosingPage(){
  toggleCustomDoseInterval();
  renderDosingProducts();
  renderDosingHistory();
  if(el("icpParameterBuilder") && !el("icpParameterBuilder").children.length) resetIcpBuilder();
  renderIcpTests();
  renderDosingInsights();
  if(el("icpDate") && !val("icpDate")) setVal("icpDate", new Date().toISOString().slice(0,10));
}

window.addEventListener("DOMContentLoaded", () => {
  const welcomeSeen = localStorage.getItem("aquoraxWelcomeSeen");
  if(welcomeSeen === "yes" && el("welcomeScreen")){
    el("welcomeScreen").style.display = "none";
  }

  const savedTank = localStorage.getItem("aquoraxTankType") || "";
  const savedVolume = localStorage.getItem("aquoraxTankVolume") || "";

  setVal("tankTypeSelect", savedTank);
  setVal("tankVolumeMain", savedVolume);
  updateTankSummary();
  updateWelcomeTankButtons();
  aqxApplyCustomSettings();
  aqxApplyCleanNavDefaults();
  aqxBindButtonFeedback();
  aqxRefreshLoginState();
  setTimeout(aqxInstallSaveActionWrappers, 250);
  applyCycleCompletionGate();
  renderNavCustomMenu();
  applyNavPrefs();
  renderParameterPage();
  aqxRenderHomePanelCustomList();
  aqxRenderHomeParameterCustomiser();
  aqxRenderHomeLayoutCustomiser();
  applyBeginnerMode();

  const savedCycle = JSON.parse(localStorage.getItem("aquoraxCycleData") || "{}");

  setVal("cycleTank", savedCycle.tank || savedTank || "freshwater");
  setVal("cycleVolume", savedCycle.volume || savedVolume || "");
  setVal("cycleStage", savedCycle.stage || "0");
  setVal("ammonia", savedCycle.ammonia || "");
  setVal("nitrite", savedCycle.nitrite || "");
  setVal("nitrate", savedCycle.nitrate || "");
  setVal("ph", savedCycle.ph || "");
  setVal("temp", savedCycle.temp || "");
  setVal("salinity", savedCycle.salinity || "");

  updateCycle();
  renderParameterPage();
  renderCycleHistory();
  renderBeginnerCycleGuide();
  renderDosingPage();
  drawCycleGraph();

  const savedPageRaw = localStorage.getItem("aquoraxCurrentPage") || "home";
  const savedPage = (savedPageRaw === "log" && !isCycleConfirmedComplete()) ? "home" : savedPageRaw;
  openPage(savedPage);
});

function isCycleCompleteFromLatestTest(){
  const tests = typeof getCycleTestsForState === "function" ? getCycleTestsForState() : [];
  if(!tests.length) return {complete:false};

  const last = tests[tests.length - 1];
  const ammonia = typeof numFromTest === "function" ? numFromTest(last, ["ammonia","nh3","amm"]) : parseFloat(last.ammonia || 0);
  const nitrite = typeof numFromTest === "function" ? numFromTest(last, ["nitrite","no2"]) : parseFloat(last.nitrite || 0);
  const nitrate = typeof numFromTest === "function" ? numFromTest(last, ["nitrate","no3"]) : parseFloat(last.nitrate || 0);
  const date = typeof testDateFromTest === "function" ? testDateFromTest(last) : (last.date || last.timestamp || "");

  return {
    complete: ammonia === 0 && nitrite === 0 && nitrate > 0,
    ammonia,
    nitrite,
    nitrate,
    date
  };
}

function maybeShowCycleCompleteCelebration(){
  const result = isCycleCompleteFromLatestTest();
  if(!result.complete) return;

  const celebrationKey = "aquoraxCycleCompleteCelebrated";
  const signature = `${result.date}|${result.ammonia}|${result.nitrite}|${result.nitrate}`;
  const seen = localStorage.getItem(celebrationKey);

  if(seen === signature) return;

  localStorage.setItem(celebrationKey, signature);
  localStorage.setItem("aquoraxCycleConfirmedComplete", "yes");
  applyCycleCompletionGate();

  const overlay = document.getElementById("cycleCompleteOverlay");
  if(!overlay) return;

  const amm = document.getElementById("completeAmm");
  const nitrite = document.getElementById("completeNitrite");
  const nitrate = document.getElementById("completeNitrate");

  if(amm) amm.textContent = `${result.ammonia} ppm`;
  if(nitrite) nitrite.textContent = `${result.nitrite} ppm`;
  if(nitrate) nitrate.textContent = `${result.nitrate} ppm`;

  setTimeout(()=>overlay.classList.add("show"), 350);
}

function closeCycleCompleteCelebration(){
  const overlay = document.getElementById("cycleCompleteOverlay");
  if(overlay) overlay.classList.remove("show");
}

function updateShopCard(){
  const cardTitle = document.getElementById("shopTitle");
  const cardDesc = document.getElementById("shopDesc");
  const cardBtn = document.getElementById("shopBtn");

  const tests = JSON.parse(localStorage.getItem("cycleTests") || "[]");
  if(!tests.length) return;

  const last = tests[tests.length-1];
  const ammonia = parseFloat(last.ammonia||0);
  const nitrite = parseFloat(last.nitrite||0);
  const nitrate = parseFloat(last.nitrate||0);

  if(ammonia > 0 || nitrite > 0){
    cardTitle.textContent = "Fix Your Water";
    cardDesc.textContent = "Your tank is still cycling. Get bacteria and treatments to stabilise your water.";
    cardBtn.textContent = "Shop Treatments";
  }
  else if(ammonia === 0 && nitrite === 0 && nitrate > 0){
    cardTitle.textContent = "Maintain Your Tank";
    cardDesc.textContent = "Your cycle is stable. Browse maintenance and support products.";
    cardBtn.textContent = "Shop Maintenance";
  }
  else{
    cardTitle.textContent = "Start Your Cycle";
    cardDesc.textContent = "Kickstart your aquarium cycle with trusted bacteria products.";
    cardBtn.textContent = "Shop Cycle Products";
  }
}

document.addEventListener("DOMContentLoaded", updateShopCard);


let viewerImages = [];
let viewerIndex = 0;
let viewerTouchStartX = 0;

function openViewer(items, index){
  viewerImages = Array.isArray(items) ? items.filter(x => x && x.src) : [];
  viewerIndex = Math.max(0, Math.min(index || 0, viewerImages.length - 1));

  if(!viewerImages.length) return;

  const v = document.getElementById("viewer");
  v.classList.add("show");
  renderViewer();
}

function renderViewer(){
  const current = viewerImages[viewerIndex];
  const img = document.getElementById("viewerImg");
  const meta = document.getElementById("viewerMeta");
  const title = document.getElementById("viewerTitle");
  const strip = document.getElementById("viewerThumbStrip");
  const prev = document.getElementById("viewerPrevBtn");
  const next = document.getElementById("viewerNextBtn");

  if(!current) return;

  img.src = current.src;
  title.innerText = current.title || "Growth Timeline";
  meta.innerHTML = `
    <strong>${current.label || "Photo " + (viewerIndex + 1)}</strong><br>
    ${current.date || ""}${current.note ? " · " + current.note : ""}
    <br>${viewerIndex + 1} of ${viewerImages.length}
  `;

  if(prev) prev.disabled = viewerIndex <= 0;
  if(next) next.disabled = viewerIndex >= viewerImages.length - 1;

  if(strip){
    strip.innerHTML = viewerImages.map((item, i) => `
      <img class="viewerThumb ${i === viewerIndex ? "active" : ""}" src="${item.src}" onclick="jumpViewerImage(${i})">
    `).join("");
  }
}

function jumpViewerImage(index){
  viewerIndex = Math.max(0, Math.min(index, viewerImages.length - 1));
  renderViewer();
}

function closeViewer(){
  const v = document.getElementById("viewer");
  if(v) v.classList.remove("show");
}

function nextImage(e){
  if(e) e.stopPropagation();
  if(viewerIndex < viewerImages.length - 1){
    viewerIndex++;
    renderViewer();
  }
}

function prevImage(e){
  if(e) e.stopPropagation();
  if(viewerIndex > 0){
    viewerIndex--;
    renderViewer();
  }
}

document.addEventListener("keydown", function(e){
  const v = document.getElementById("viewer");
  if(!v || !v.classList.contains("show")) return;

  if(e.key === "Escape") closeViewer();
  if(e.key === "ArrowRight") nextImage(e);
  if(e.key === "ArrowLeft") prevImage(e);
});

document.addEventListener("touchstart", function(e){
  const v = document.getElementById("viewer");
  if(!v || !v.classList.contains("show")) return;
  viewerTouchStartX = e.changedTouches[0].clientX;
}, {passive:true});

document.addEventListener("touchend", function(e){
  const v = document.getElementById("viewer");
  if(!v || !v.classList.contains("show")) return;

  const endX = e.changedTouches[0].clientX;
  const diff = endX - viewerTouchStartX;

  if(Math.abs(diff) > 45){
    if(diff < 0) nextImage(e);
    else prevImage(e);
  }
}, {passive:true});

function trackerTimelineItems(kind, item){
  const title = item.name || (kind === "coral" ? "Coral Timeline" : "Plant Timeline");
  const photos = [];

  if(item.firstImage){
    photos.push({
      src:item.firstImage,
      label:"First Photo",
      date:item.dateAdded ? "Added " + item.dateAdded : "",
      note:item.growth || "",
      title:title
    });
  }

  const updates = Array.isArray(item.updates) ? [...item.updates].reverse() : [];
  updates.forEach((u, i) => {
    if(u.image){
      photos.push({
        src:u.image,
        label:"Progress Update " + (i + 1),
        date:(u.date || "") + (u.time ? " · " + u.time : ""),
        note:u.note || "",
        title:title
      });
    }
  });

  if(item.latestImage && !photos.some(p => p.src === item.latestImage)){
    photos.push({
      src:item.latestImage,
      label:"Latest Photo",
      date:"Latest",
      note:item.latestNote || "",
      title:title
    });
  }

  return photos;
}

function openTrackerTimeline(kind, id, index){
  const items = getTrackerItems(kind);
  const item = items.find(x => String(x.id) === String(id));
  if(!item) return;

  const photos = trackerTimelineItems(kind, item);
  if(!photos.length){
    alert("No photos saved for this item yet.");
    return;
  }

  const startIndex = index === 999 ? photos.length - 1 : (index || 0);
  openViewer(photos, startIndex);
}

(function initialiseCustomNav(){
  setTimeout(function(){
    aqxApplyCustomSettings();
    aqxApplyCleanNavDefaults();
    applyNavPrefs();
    renderNavCustomMenu();
    renderParameterPage();
    renderTestHistory();

    const savedPage = firstVisiblePage();
    const currentActive = document.querySelector(".page.active");
    if(savedPage && currentActive && currentActive.id !== savedPage && localStorage.getItem("aquoraxWelcomeSeen") === "yes"){
      openPage(savedPage);
    }
  }, 80);
})();



/* AquoraX Cloud, Saving Overlay, Autosave + Pro Dosing Insights */
const aqxCloudStoragePrefix = "aquoraxCloudBackups:";
const aqxCloudSessionKey = "aquoraxCloudSession";
let aqxCloudBackupTimer = null;
let aqxCloudRestoring = false;
let aqxSavingTimer = null;

function aqxCloudUser(){
  try{return JSON.parse(localStorage.getItem(aqxCloudSessionKey) || "null");}catch(e){return null;}
}
function aqxCloudEmail(){ const u=aqxCloudUser(); return u && u.email ? String(u.email).toLowerCase() : ""; }
function aqxSetLoginMessage(msg){ const n=el("aqxLoginMessage"); if(n) n.textContent=msg; }
function aqxCloudKey(email){ return aqxCloudStoragePrefix + String(email || aqxCloudEmail()).toLowerCase(); }
function aqxIsCloudUserStored(email){ return !!localStorage.getItem("aquoraxCloudUser:" + String(email||"").toLowerCase()); }
function aqxStoreCloudUser(email,password){
  localStorage.setItem("aquoraxCloudUser:" + String(email).toLowerCase(), JSON.stringify({email:String(email).toLowerCase(), password:String(password), createdAt:new Date().toISOString()}));
}
function aqxValidateCloudUser(email,password){
  try{ const u=JSON.parse(localStorage.getItem("aquoraxCloudUser:" + String(email).toLowerCase()) || "null"); return !!(u && u.password === String(password)); }catch(e){ return false; }
}
function aqxSetSession(email){
  localStorage.setItem(aqxCloudSessionKey, JSON.stringify({email:String(email).toLowerCase(), signedInAt:new Date().toISOString()}));
  document.body.classList.add("aqxLoggedIn");
  aqxUpdateCloudStatus("Signed in. Checking backup…");
  aqxAutoRestoreOnLogin();
  aqxQueueCloudBackup("login");
  aqxRefreshLoginState();
}
function aqxCreateAccount(){
  const email=val("aqxLoginEmail").trim().toLowerCase();
  const password=val("aqxLoginPassword");
  if(!email || !email.includes("@")){ aqxSetLoginMessage("Add a valid email address first."); return; }
  if(!password || password.length < 6){ aqxSetLoginMessage("Use a password with at least 6 characters."); return; }
  if(aqxIsCloudUserStored(email)){ aqxSetLoginMessage("Account already exists. Sign in instead."); return; }
  aqxStoreCloudUser(email,password);
  aqxSetSession(email);
  aqxShowSaving("Creating cloud account…","Setting up your AquoraX backup.","Account ready ✅");
}
function aqxSignIn(){
  const email=val("aqxLoginEmail").trim().toLowerCase();
  const password=val("aqxLoginPassword");
  if(!email || !password){ aqxSetLoginMessage("Enter your email and password."); return; }
  if(!aqxValidateCloudUser(email,password)){
    aqxSetLoginMessage("No matching account found in this build. Create account first, or add Firebase keys later for real cloud auth.");
    return;
  }
  aqxSetSession(email);
  aqxShowSaving("Signing in…","Restoring your AquoraX cloud backup.","Signed in ✅");
}
function aqxSignOut(){
  if(!confirm("Sign out of AquoraX Cloud on this device?")) return;
  localStorage.removeItem(aqxCloudSessionKey);
  document.body.classList.remove("aqxLoggedIn");
  aqxCloseCloudHub();
  aqxRefreshLoginState();
}
function aqxRefreshLoginState(){
  const logged=!!aqxCloudUser();
  document.body.classList.toggle("aqxLoggedIn", logged);
  const screen=el("aqxLoginScreen");
  if(screen) screen.classList.toggle("show", !logged);
  if(el("welcomeScreen")) el("welcomeScreen").style.display = logged && localStorage.getItem("aquoraxWelcomeSeen")==="yes" ? "none" : (logged ? "flex" : "none");
  aqxUpdateCloudStatus();
}
function aqxOpenCloudHub(){ aqxUpdateCloudStatus(); const o=el("aqxCloudPanelOverlay"); if(o) o.classList.add("show"); }
function aqxCloseCloudHub(e){ if(e && e.target && e.target.id !== "aqxCloudPanelOverlay") return; const o=el("aqxCloudPanelOverlay"); if(o) o.classList.remove("show"); }
function aqxCloudDataKeys(){
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k) continue;
    if(k.startsWith("aquoraxCloudUser:") || k.startsWith(aqxCloudStoragePrefix) || k===aqxCloudSessionKey) continue;
    if(k.startsWith("aquorax") || k==="cycleTests" || k==="trackerItems" || k==="coralItems" || k==="plantItems") keys.push(k);
  }
  return keys;
}
function aqxBuildBackupPayload(){
  const data={};
  aqxCloudDataKeys().forEach(k=>{ data[k]=localStorage.getItem(k); });
  return {version:"AquoraXCloudV1", savedAt:new Date().toISOString(), email:aqxCloudEmail(), data};
}
function aqxBackupExists(email){ return !!localStorage.getItem(aqxCloudKey(email)); }
function aqxDoCloudBackup(reason="autosave"){
  const email=aqxCloudEmail(); if(!email || aqxCloudRestoring) return;
  const payload=aqxBuildBackupPayload();
  localStorage.setItem(aqxCloudKey(email), JSON.stringify(payload));
  localStorage.setItem("aquoraxLastCloudBackup", payload.savedAt);
  aqxUpdateCloudStatus(`Last backup: ${new Date(payload.savedAt).toLocaleString()} · ${reason}`);
}
function aqxQueueCloudBackup(reason="change"){
  if(!aqxCloudEmail() || aqxCloudRestoring) return;
  clearTimeout(aqxCloudBackupTimer);
  aqxUpdateCloudStatus("Saving changes to cloud queue…");
  aqxCloudBackupTimer=setTimeout(()=>aqxDoCloudBackup(reason), 1200);
}
function aqxRestorePayload(payload){
  if(!payload || !payload.data) return false;
  aqxCloudRestoring=true;
  Object.keys(payload.data).forEach(k=>{ if(typeof payload.data[k] === "string") localStorage.setItem(k,payload.data[k]); });
  aqxCloudRestoring=false;
  return true;
}
function aqxAutoRestoreOnLogin(){
  const email=aqxCloudEmail(); if(!email) return;
  try{
    const raw=localStorage.getItem(aqxCloudKey(email)); if(!raw) return;
    const payload=JSON.parse(raw);
    const localLast=localStorage.getItem("aquoraxLastCloudBackup") || "";
    const localEmpty=!localStorage.getItem("aquoraxWelcomeSeen") && !localStorage.getItem("aquoraxDosingProducts") && !localStorage.getItem("aquoraxCycleHistory");
    if(localEmpty || (payload.savedAt && payload.savedAt > localLast)){
      aqxRestorePayload(payload);
      aqxUpdateCloudStatus("Cloud backup restored automatically.");
      setTimeout(()=>location.reload(), 700);
    }
  }catch(e){ aqxUpdateCloudStatus("Cloud restore skipped: backup could not be read."); }
}
function aqxManualBackup(){ aqxShowSaving("Backing up…","Saving your latest AquoraX data.","Backup complete ✅"); aqxDoCloudBackup("manual"); }
function aqxManualRestore(){
  const email=aqxCloudEmail(); if(!email) return;
  const raw=localStorage.getItem(aqxCloudKey(email));
  if(!raw){ alert("No cloud backup found yet."); return; }
  if(!confirm("Restore your latest cloud backup? This will refresh the app.")) return;
  aqxShowSaving("Restoring…","Loading your AquoraX cloud backup.","Restore complete ✅");
  try{ aqxRestorePayload(JSON.parse(raw)); setTimeout(()=>location.reload(), 900); }catch(e){ alert("Could not restore backup."); }
}
function aqxExportBackupFile(){
  const payload=aqxBuildBackupPayload();
  const blob=new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="aquorax-backup-"+new Date().toISOString().slice(0,10)+".json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
function aqxUpdateCloudStatus(msg){
  const email=aqxCloudEmail();
  const userLine=el("aqxCloudUserLine"); if(userLine) userLine.textContent=email ? "Connected as: " + email : "Not connected.";
  const last=localStorage.getItem("aquoraxLastCloudBackup");
  const status=el("aqxCloudSyncStatus");
  if(status) status.textContent=msg || (last ? "Last backup: " + new Date(last).toLocaleString() : "No backup yet. Your next save will create one.");
}
function aqxShowSaving(title="Saving…", sub="Securing your AquoraX data.", done="Saved ✅"){
  const overlay=el("aqxSavingOverlay"), card=el("aqxSavingCard"), t=el("aqxSavingTitle"), s=el("aqxSavingSub");
  if(!overlay || !card) return;
  clearTimeout(aqxSavingTimer);
  card.classList.remove("saved");
  if(t) t.textContent=title;
  if(s) s.textContent=sub;
  overlay.classList.add("show");
  aqxSavingTimer=setTimeout(()=>{
    card.classList.add("saved");
    if(t) t.textContent=done;
    if(s) s.textContent="Your changes are saved locally and queued for cloud backup.";
    aqxSavingTimer=setTimeout(()=>overlay.classList.remove("show"), 650);
  }, 650);
}
function aqxWrapAction(name,title,sub,done){
  const original=window[name];
  if(typeof original !== "function" || original.__aqxWrapped) return;
  const wrapped=function(...args){
    const result=original.apply(this,args);
    aqxShowSaving(title,sub,done);
    aqxQueueCloudBackup(name);
    return result;
  };
  wrapped.__aqxWrapped=true;
  window[name]=wrapped;
}
function aqxInstallSaveActionWrappers(){
  aqxWrapAction("saveCycleTest","Saving test results…","Updating your cycle and water history.","Results saved ✅");
  aqxWrapAction("saveLoggedTest","Saving test results…","Updating your Home dashboard and history.","Results saved ✅");
  aqxWrapAction("addTrackerItem","Saving growth record…","Storing your growth tracker update.","Growth saved ✅");
  aqxWrapAction("saveTrackerUpdate","Saving growth update…","Updating your growth timeline.","Growth update saved ✅");
  aqxWrapAction("addDosingProduct","Saving dosing product…","Adding this product to your dosing schedule.","Dosing product saved ✅");
  aqxWrapAction("logDose","Logging dose…","Updating dose history and next due date.","Dose logged ✅");
  aqxWrapAction("saveIcpTest","Saving ICP test…","Storing your ICP parameters and notes.","ICP test saved ✅");
  aqxWrapAction("deleteIcpTest","Removing ICP test…","Updating your saved ICP history.","ICP removed ✅");
  aqxWrapAction("deleteDosingProduct","Removing dosing product…","Updating your dosing schedule.","Product removed ✅");
  aqxWrapAction("confirmRapidCycleDose","Updating journey…","Recording Blue Shark rapid cycle dose.","Journey updated ✅");
  aqxWrapAction("confirmParadigmDose","Updating journey…","Recording Blue Shark Paradigm dose.","Journey updated ✅");
  aqxWrapAction("confirmCycleCompleteFromHome","Unlocking dashboard…","Saving cycle completion status.","Dashboard unlocked ✅");
}
function aqxDaysBetween(a,b){ return Math.abs((new Date(a).getTime()-new Date(b).getTime())/86400000); }
function aqxProductHistory(productId){ return getDosingHistory().filter(h=>String(h.productId)===String(productId)).sort((a,b)=>new Date(a.iso)-new Date(b.iso)); }
function aqxAverageIntervalDays(history){
  if(history.length < 2) return null;
  let total=0, count=0;
  for(let i=1;i<history.length;i++){ total += aqxDaysBetween(history[i].iso, history[i-1].iso); count++; }
  return count ? total/count : null;
}
function aqxLatestIcpSignals(){
  const tests=getIcpTests(); if(!tests.length) return [];
  const latest=tests[0];
  return (latest.parameters||[]).filter(p=>p.status && p.status!=="ok").map(p=>({name:p.name,status:p.status,value:[p.value,p.unit].filter(Boolean).join(" "),date:latest.date}));
}
function renderDosingInsights(){
  const box=el("dosingInsightList"); if(!box) return;
  const products=getDosingProducts(); const history=getDosingHistory(); const signals=aqxLatestIcpSignals();
  const insights=[];
  const dueProducts=products.filter(p=>nextDueText(p).cls==="due");
  if(!products.length) insights.push({cls:"warn",title:"No dosing schedule configured",text:"Add your core dosing products first so AquoraX can track consistency, missed doses and ICP-linked adjustments."});
  else if(dueProducts.length) insights.push({cls:"bad",title:"Dosing attention required",text:`${dueProducts.length} product${dueProducts.length===1?" is":"s are"} due now: ${dueProducts.map(p=>p.name).slice(0,3).join(", ")}${dueProducts.length>3?"…":""}.`});
  else insights.push({cls:"good",title:"Schedule currently controlled",text:"No saved dosing products are overdue based on their configured interval."});
  if(history.length >= 5) insights.push({cls:"good",title:"Consumption dataset building",text:`${history.length} dose logs saved. This is enough to start spotting consistency and consumption patterns.`});
  if(signals.length) insights.push({cls:"warn",title:"ICP adjustment signals",text:`Latest ICP shows ${signals.length} non-OK item${signals.length===1?"":"s"}: ${signals.map(s=>`${s.name} ${s.status}${s.value?" ("+s.value+")":""}`).slice(0,4).join(", ")}. Review dosing before changing amounts.`});
  else insights.push({cls:"good",title:"ICP signal status",text:"No low/high/watch markers found in the latest saved ICP test."});
  box.innerHTML=insights.map(i=>`<div class="dosingInsightItem ${i.cls}"><strong>${i.title}</strong><span>${i.text}</span></div>`).join("");
}
function aqxConsumptionHtml(product){
  const hist=aqxProductHistory(product.id);
  const avg=aqxAverageIntervalDays(hist);
  const expected=doseIntervalDays(product.frequency, product.interval);
  let status="No pattern yet — log at least two doses.";
  if(avg!==null){
    const drift=avg-expected;
    if(Math.abs(drift)<=0.35) status=`Average interval ${avg.toFixed(1)} days · on target.`;
    else if(drift>0) status=`Average interval ${avg.toFixed(1)} days · slower than target by ${drift.toFixed(1)} days.`;
    else status=`Average interval ${avg.toFixed(1)} days · faster than target by ${Math.abs(drift).toFixed(1)} days.`;
  }
  return `<div class="consumptionMini"><strong>Consumption tracking</strong><br>${hist.length} logs saved. ${status}</div>`;
}
(function aqxInstallLocalStorageAutosave(){
  if(Storage.prototype.__aqxAutosaveInstalled) return;
  const originalSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const result=originalSet.apply(this,arguments);
    try{
      if(typeof key==="string" && !aqxCloudRestoring && key!==aqxCloudSessionKey && !key.startsWith(aqxCloudStoragePrefix) && !key.startsWith("aquoraxCloudUser:") && (key.startsWith("aquorax") || key==="cycleTests")){
        setTimeout(()=>aqxQueueCloudBackup("autosave"),0);
      }
    }catch(e){}
    return result;
  };
  Storage.prototype.__aqxAutosaveInstalled=true;
})();



/* AquoraX Advanced Customiser Logic */
function aqxDefaultCustomSettings(){
  return {
    panelOpacity:96,panelGlow:12,bgDim:58,blur:0,radiusBoost:0,accent:"#00c8ff",fullClear:false,
    text:"#ffffff",heading:"#ffffff",muted:"#9fbcd3",buttonText:"#00111f",value:"#00c8ff",
    homePanels:{parameters:true,insights:true,score:true,history:true,quicktools:true},customBg:""
  };
}
function aqxGetCustomSettings(){
  try{return Object.assign(aqxDefaultCustomSettings(), JSON.parse(localStorage.getItem("aquoraxCustomSettings")||"{}"));}
  catch(e){return aqxDefaultCustomSettings();}
}
function aqxSaveCustomSettings(settings){
  localStorage.setItem("aquoraxCustomSettings", JSON.stringify(settings));
}
function aqxApplyCustomSettings(){
  const s=aqxGetCustomSettings();
  document.documentElement.style.setProperty("--aqxPanelOpacity", String((s.panelOpacity||0)/100));
  document.documentElement.style.setProperty("--aqxPanelGlow", String((s.panelGlow||0)/100));
  document.documentElement.style.setProperty("--aqxBgDim", String((s.bgDim||0)/100));
  document.documentElement.style.setProperty("--aqxBlur", (s.blur||0)+"px");
  document.documentElement.style.setProperty("--aqxRadiusBoost", (s.radiusBoost||0)+"px");
  document.documentElement.style.setProperty("--aqxAccent", s.accent||"#00c8ff");
  document.documentElement.style.setProperty("--aqxTextColour", s.text||"#ffffff");
  document.documentElement.style.setProperty("--aqxHeadingColour", s.heading||"#ffffff");
  document.documentElement.style.setProperty("--aqxMutedColour", s.muted||"#9fbcd3");
  document.documentElement.style.setProperty("--aqxButtonTextColour", s.buttonText||"#00111f");
  document.documentElement.style.setProperty("--aqxValueColour", s.value||s.accent||"#00c8ff");
  document.body.classList.toggle("aqxFullClear", !!s.fullClear);
  if(s.customBg){
    document.documentElement.style.setProperty("--aqxCustomBg", `url(${s.customBg})`);
    document.body.classList.add("aqxCustomBgActive");
  }else{
    document.documentElement.style.removeProperty("--aqxCustomBg");
    document.body.classList.remove("aqxCustomBgActive");
  }
  aqxSyncCustomControls();
  aqxApplyHomePanelPrefs();
}
function aqxSyncCustomControls(){
  const s=aqxGetCustomSettings();
  const map={aqxPanelOpacity:s.panelOpacity,aqxPanelGlow:s.panelGlow,aqxBgDim:s.bgDim,aqxBlur:s.blur,aqxRadiusBoost:s.radiusBoost};
  Object.keys(map).forEach(id=>{const node=el(id); if(node) node.value=map[id];});
  const labels={aqxPanelOpacityValue:(s.panelOpacity||0)+"%",aqxPanelGlowValue:(s.panelGlow||0)+"%",aqxBgDimValue:(s.bgDim||0)+"%",aqxBlurValue:(s.blur||0)+"px",aqxRadiusBoostValue:(s.radiusBoost||0)+"px"};
  Object.keys(labels).forEach(id=>{const node=el(id); if(node) node.innerText=labels[id];});
  if(el("aqxAccentPicker")) el("aqxAccentPicker").value=s.accent||"#00c8ff";
  if(el("aqxFullClear")) el("aqxFullClear").checked=!!s.fullClear;
  const colours={aqxTextColour:s.text,aqxHeadingColour:s.heading,aqxMutedColour:s.muted,aqxButtonTextColour:s.buttonText,aqxValueColour:s.value};
  Object.keys(colours).forEach(id=>{if(el(id)) el(id).value=colours[id]||"#ffffff";});
  const prev=el("aqxBgPreview");
  if(prev){prev.src=s.customBg||""; prev.classList.toggle("show",!!s.customBg);}
  aqxRenderHomePanelCustomList();
  aqxRenderHomeParameterCustomiser();
}
function aqxSetRange(key,value){
  const s=aqxGetCustomSettings(); s[key]=Number(value); aqxSaveCustomSettings(s); aqxApplyCustomSettings();
}
function aqxSetAccent(value){
  const s=aqxGetCustomSettings(); s.accent=value; s.value=value; aqxSaveCustomSettings(s); aqxApplyCustomSettings();
}
function aqxSetFontColour(key,value){
  const s=aqxGetCustomSettings(); s[key]=value; aqxSaveCustomSettings(s); aqxApplyCustomSettings();
}
function aqxToggleFullClear(checked){const s=aqxGetCustomSettings(); s.fullClear=!!checked; aqxSaveCustomSettings(s); aqxApplyCustomSettings();}
function aqxUploadBackground(event){
  const file=event.target.files && event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(){const s=aqxGetCustomSettings(); s.customBg=reader.result; aqxSaveCustomSettings(s); aqxApplyCustomSettings();};
  reader.readAsDataURL(file);
}
function aqxResetBackground(){const s=aqxGetCustomSettings(); s.customBg=""; aqxSaveCustomSettings(s); aqxApplyCustomSettings();}
function aqxApplyPreset(name){
  const s=aqxGetCustomSettings();
  if(name==="deepBlue"){s.accent="#00c8ff";s.value="#00c8ff";s.panelOpacity=88;s.panelGlow=20;s.bgDim=45;s.blur=4;s.radiusBoost=4;}
  aqxSaveCustomSettings(s); aqxApplyCustomSettings();
}
function aqxFontPreset(name){
  const s=aqxGetCustomSettings();
  if(name==="classic"){s.text="#ffffff";s.heading="#ffffff";s.muted="#9fbcd3";s.buttonText="#00111f";s.value=s.accent||"#00c8ff";}
  if(name==="bright"){s.text="#f7fdff";s.heading="#ffffff";s.muted="#d7efff";s.buttonText="#00111f";s.value="#ffffff";}
  aqxSaveCustomSettings(s); aqxApplyCustomSettings();
}
function aqxRenderHomePanelCustomList(){
  const box=el("aqxPanelCustomList"); if(!box) return;
  const s=aqxGetCustomSettings(); const prefs=Object.assign(aqxDefaultCustomSettings().homePanels,s.homePanels||{});
  box.innerHTML=aqxHomePanels.map(item=>`<div class="navCustomItem"><div><strong>${item.label}</strong><span>${item.desc}</span></div><label class="navSwitch"><input type="checkbox" ${prefs[item.id]!==false?"checked":""} onchange="aqxToggleHomePanel('${item.id}',this.checked)"><span class="navSlider"></span></label></div>`).join("");
}
function aqxToggleHomePanel(id,visible){const s=aqxGetCustomSettings(); s.homePanels=Object.assign(aqxDefaultCustomSettings().homePanels,s.homePanels||{}); s.homePanels[id]=!!visible; aqxSaveCustomSettings(s); aqxApplyCustomSettings();}
function aqxApplyHomePanelPrefs(){
  const s=aqxGetCustomSettings(); const prefs=Object.assign(aqxDefaultCustomSettings().homePanels,s.homePanels||{});
  document.querySelectorAll("[data-panel]").forEach(panel=>{panel.classList.toggle("aqxPanelHidden", prefs[panel.getAttribute("data-panel")]===false);});
}
function aqxResetCustomisation(){
  if(!confirm("Reset all AquoraX customisation settings?")) return;
  localStorage.removeItem("aquoraxCustomSettings");
  localStorage.removeItem("aquoraxNavPrefs");
  localStorage.removeItem("aquoraxHomeParameterPrefs");
  localStorage.removeItem("aquoraxCleanNavV3Applied");
  localStorage.removeItem("aquoraxCleanNavV4Applied");
  localStorage.removeItem("aquoraxCleanNavV5HardLockApplied");
  aqxApplyCleanNavDefaults(); aqxApplyCustomSettings(); applyNavPrefs(); renderNavCustomMenu(); aqxRenderHomePanelCustomList();
}

const parameterDefs = {
  reef:[
    {key:"temperature", label:"Temperature", unit:"°C", target:"24–26 °C", min:24, max:26, icon:"🌡️"},
    {key:"salinity", label:"Specific Gravity", unit:"SG", target:"1.024–1.026 SG", min:1.024, max:1.026, icon:"≈"},
    {key:"ph", label:"pH", unit:"", target:"8.1–8.4", min:8.1, max:8.4, icon:"pH"},
    {key:"alkalinity", label:"Alkalinity", unit:"dKH", target:"7–10 dKH", min:7, max:10, icon:"Alk"},
    {key:"calcium", label:"Calcium", unit:"ppm", target:"400–450 ppm", min:400, max:450, icon:"Ca"},
    {key:"magnesium", label:"Magnesium", unit:"ppm", target:"1250–1350 ppm", min:1250, max:1350, icon:"Mg"},
    {key:"ammonia", label:"Ammonia", unit:"ppm", target:"0 ppm", min:0, max:0.1, icon:"NH₃"},
    {key:"nitrite", label:"Nitrite", unit:"ppm", target:"0 ppm", min:0, max:0.1, icon:"NO₂"},
    {key:"nitrate", label:"Nitrate", unit:"ppm", target:"2–20 ppm", min:2, max:20, icon:"NO₃"},
    {key:"phosphate", label:"Phosphate", unit:"ppm", target:"0.03–0.10 ppm", min:0.03, max:0.10, icon:"PO₄"}
  ],
  freshwater:[
    {key:"temperature", label:"Temperature", unit:"°C", target:"22–26 °C", min:22, max:26, icon:"🌡️"},
    {key:"ph", label:"pH", unit:"", target:"6.5–7.8", min:6.5, max:7.8, icon:"pH"},
    {key:"ammonia", label:"Ammonia", unit:"ppm", target:"0 ppm", min:0, max:0.1, icon:"NH₃"},
    {key:"nitrite", label:"Nitrite", unit:"ppm", target:"0 ppm", min:0, max:0.1, icon:"NO₂"},
    {key:"nitrate", label:"Nitrate", unit:"ppm", target:"5–40 ppm", min:5, max:40, icon:"NO₃"},
    {key:"phosphate", label:"Phosphate", unit:"ppm", target:"0.05–1.0 ppm", min:0.05, max:1.0, icon:"PO₄"}
  ]
};

/* Home parameter + ICP monitoring customisation */
function aqxSlug(text){
  return String(text||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"") || ("param_"+Date.now());
}
function aqxDefaultHomeParameterPrefs(){
  const visibleStandard={};
  Object.keys(parameterDefs).forEach(type=>{
    visibleStandard[type]={};
    parameterDefs[type].forEach(def=>visibleStandard[type][def.key]=true);
  });
  return {visibleStandard, custom:[], icpMonitored:[], pinned:[], globalTileStyle:"default", globalTileSize:"standard"};
}
function aqxGetHomeParameterPrefs(){
  const defaults=aqxDefaultHomeParameterPrefs();
  try{
    const saved=JSON.parse(localStorage.getItem("aquoraxHomeParameterPrefs")||"{}");
    saved.visibleStandard=Object.assign({}, defaults.visibleStandard, saved.visibleStandard||{});
    Object.keys(defaults.visibleStandard).forEach(type=>{saved.visibleStandard[type]=Object.assign({}, defaults.visibleStandard[type], (saved.visibleStandard||{})[type]||{});});
    saved.custom=Array.isArray(saved.custom)?saved.custom:[];
    saved.icpMonitored=Array.isArray(saved.icpMonitored)?saved.icpMonitored:[];
    saved.pinned=Array.isArray(saved.pinned)?saved.pinned:[];
    saved.globalTileStyle=saved.globalTileStyle||"default";
    saved.globalTileSize=saved.globalTileSize||"standard";
    return saved;
  }catch(e){return defaults;}
}
function aqxSaveHomeParameterPrefs(prefs){localStorage.setItem("aquoraxHomeParameterPrefs", JSON.stringify(prefs));}
function aqxLatestIcpMap(){
  const tests = (typeof getIcpTests === "function" ? getIcpTests() : []);
  const out={};
  tests.slice().reverse().forEach(test=>{
    (test.parameters||[]).forEach(param=>{
      const slug=aqxSlug(param.name);
      out[slug]={name:param.name,value:param.value,unit:param.unit,status:param.status||"ok",date:test.date||test.savedIso,lab:test.lab||"ICP"};
    });
  });
  return out;
}
function aqxAvailableIcpParameters(){
  const seen={};
  (typeof getIcpTests === "function" ? getIcpTests() : []).forEach(test=>{
    (test.parameters||[]).forEach(param=>{
      const slug=aqxSlug(param.name);
      if(!seen[slug]) seen[slug]={slug,name:param.name,unit:param.unit||"",status:param.status||"ok"};
      else if(param.unit && !seen[slug].unit) seen[slug].unit=param.unit;
    });
  });
  return Object.values(seen).sort((a,b)=>a.name.localeCompare(b.name));
}
function aqxDefsForDisplay(type){
  const prefs=aqxGetHomeParameterPrefs();
  const standard=(parameterDefs[type]||parameterDefs.freshwater).filter(def=>((prefs.visibleStandard[type]||{})[def.key]!==false));
  const custom=(prefs.custom||[]).map(c=>({key:"custom_"+c.key,label:c.label,unit:c.unit||"",target:c.target||"Custom tracked parameter",min:c.min,max:c.max,icon:c.icon||c.label.slice(0,2),custom:true,source:"custom"}));
  const icpMap=aqxLatestIcpMap();
  const icp=(prefs.icpMonitored||[]).map(slug=>{
    const latest=icpMap[slug]||{};
    return {key:"icp_"+slug,label:latest.name||slug.replace(/_/g," "),unit:latest.unit||"",target:"Latest ICP result",icon:(latest.name||"ICP").slice(0,2),icp:true,source:"icp",icpSlug:slug};
  });
  return [...standard,...custom,...icp];
}
function aqxToggleStandardHomeParam(type,key,visible){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.visibleStandard[type]=prefs.visibleStandard[type]||{};
  prefs.visibleStandard[type][key]=!!visible;
  aqxSaveHomeParameterPrefs(prefs);
  renderParameterPage(); renderHomeDashboard(); aqxRenderHomeParameterCustomiser(); aqxRenderHomeLayoutCustomiser();
}
function aqxToggleIcpHomeParam(slug,visible){
  const prefs=aqxGetHomeParameterPrefs();
  const set=new Set(prefs.icpMonitored||[]);
  if(visible) set.add(slug); else set.delete(slug);
  prefs.icpMonitored=Array.from(set);
  aqxSaveHomeParameterPrefs(prefs);
  renderParameterPage(); renderHomeDashboard(); aqxRenderHomeParameterCustomiser(); aqxRenderHomeLayoutCustomiser();
}
function aqxAddCustomHomeParameter(){
  const name=val("aqxCustomParamName").trim();
  if(!name){alert("Add a parameter name first.");return;}
  const prefs=aqxGetHomeParameterPrefs();
  const key=aqxSlug(name);
  const minRaw=val("aqxCustomParamMin"), maxRaw=val("aqxCustomParamMax");
  prefs.custom=(prefs.custom||[]).filter(p=>p.key!==key);
  prefs.custom.push({key,label:name,unit:val("aqxCustomParamUnit"),target:val("aqxCustomParamTarget"),min:minRaw===""?null:parseFloat(minRaw),max:maxRaw===""?null:parseFloat(maxRaw),icon:val("aqxCustomParamIcon")||name.slice(0,2)});
  aqxSaveHomeParameterPrefs(prefs);
  ["aqxCustomParamName","aqxCustomParamUnit","aqxCustomParamTarget","aqxCustomParamMin","aqxCustomParamMax","aqxCustomParamIcon"].forEach(id=>setVal(id,""));
  aqxRenderHomeParameterCustomiser(); aqxRenderHomeLayoutCustomiser(); renderParameterPage(); renderHomeDashboard();
}
function aqxRemoveCustomHomeParameter(key){
  if(!confirm("Remove this custom Home parameter?")) return;
  const prefs=aqxGetHomeParameterPrefs(); prefs.custom=(prefs.custom||[]).filter(p=>p.key!==key); aqxSaveHomeParameterPrefs(prefs);
  aqxRenderHomeParameterCustomiser(); aqxRenderHomeLayoutCustomiser(); renderParameterPage(); renderHomeDashboard();
}
function aqxRenderHomeParameterCustomiser(){
  const type=selectedTankType()||"freshwater";
  const prefs=aqxGetHomeParameterPrefs();
  const box=el("aqxHomeParameterList");
  if(box){
    const standard=(parameterDefs[type]||parameterDefs.freshwater).map(def=>`<div class="paramCustomItem"><div><strong>${def.label}</strong><span>${def.target} ${def.unit?"· "+def.unit:""}</span><span class="paramSourceBadge">Standard ${type==="reef"?"reef":"freshwater"}</span></div><label class="navSwitch"><input type="checkbox" ${((prefs.visibleStandard[type]||{})[def.key]!==false)?"checked":""} onchange="aqxToggleStandardHomeParam('${type}','${def.key}',this.checked)"><span class="navSlider"></span></label></div>`).join("");
    const custom=(prefs.custom||[]).map(c=>`<div class="paramCustomItem"><div><strong>${c.label}</strong><span>${c.target||"Custom tracked parameter"} ${c.unit?"· "+c.unit:""}</span><span class="paramSourceBadge">Custom</span></div><button class="dangerBtn" style="width:auto;min-width:92px;" onclick="aqxRemoveCustomHomeParameter('${c.key}')">Remove</button></div>`).join("");
    box.innerHTML=standard + (custom || '<div class="paramCustomItem"><div><strong>No custom Home parameters yet</strong><span>Add your own below or turn on ICP parameters once ICP results exist.</span></div></div>');
  }
  const icpBox=el("aqxIcpHomeParameterList");
  if(icpBox){
    const icp=aqxAvailableIcpParameters();
    if(!icp.length){icpBox.innerHTML='<div class="paramCustomItem"><div><strong>No ICP parameters saved yet</strong><span>Save an ICP test first, then choose which ICP values should appear on Home.</span></div></div>';return;}
    const on=new Set(prefs.icpMonitored||[]);
    icpBox.innerHTML=icp.map(p=>`<div class="paramCustomItem"><div><strong>${p.name}</strong><span>${p.unit||"No unit saved"}</span><span class="paramSourceBadge">ICP</span></div><label class="navSwitch"><input type="checkbox" ${on.has(p.slug)?"checked":""} onchange="aqxToggleIcpHomeParam('${p.slug}',this.checked)"><span class="navSlider"></span></label></div>`).join("");
  }
}


function getParameterTests(){
  try{
    const data = JSON.parse(localStorage.getItem("aquoraxParameterTests") || "[]");
    return Array.isArray(data) ? data : [];
  }catch(e){
    return [];
  }
}

function saveParameterTests(tests){
  localStorage.setItem("aquoraxParameterTests", JSON.stringify(tests));
}

function paramNum(id){
  const v = val(id);
  if(v === "") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function saveParameterTest(){
  const test = {
    id:Date.now(),
    date:val("testDate") || new Date().toISOString().slice(0,10),
    time:new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}),
    tank:selectedTankType() || "freshwater",
    temperature:paramNum("logTemp"),
    salinity:paramNum("logSalinity"),
    ph:paramNum("logPh"),
    alkalinity:paramNum("logAlk"),
    calcium:paramNum("logCalcium"),
    magnesium:paramNum("logMagnesium"),
    ammonia:paramNum("logAmmonia"),
    nitrite:paramNum("logNitrite"),
    nitrate:paramNum("logNitrate"),
    phosphate:paramNum("logPhosphate"),
    notes:val("logNotes")
  };

  const hasValue = Object.keys(test).some(k => typeof test[k] === "number");
  if(!hasValue){
    alert("Add at least one test result first.");
    return;
  }

  const tests = getParameterTests();
  tests.push(test);
  saveParameterTests(tests);

  ["logTemp","logSalinity","logPh","logAlk","logCalcium","logMagnesium","logAmmonia","logNitrite","logNitrate","logPhosphate","logNotes"].forEach(id => setVal(id,""));

  renderParameterPage();
  renderTestHistory();
  drawParameterTrendGraph();
  openPage("home");
}

function latestMergedParameters(){
  const tests = getParameterTests();
  const merged = {};
  const dates = {};

  tests.forEach(test => {
    Object.keys(test).forEach(k => {
      if(typeof test[k] === "number"){
        merged[k] = test[k];
        dates[k] = test.date;
      }
    });
  });

  const prefs = (typeof aqxGetHomeParameterPrefs === "function") ? aqxGetHomeParameterPrefs() : {custom:[],icpMonitored:[]};
  const icpMap = (typeof aqxLatestIcpMap === "function") ? aqxLatestIcpMap() : {};
  (prefs.icpMonitored||[]).forEach(slug => {
    const p = icpMap[slug];
    if(p){
      const numeric = parseFloat(String(p.value).replace(/,/g,""));
      merged["icp_" + slug] = Number.isNaN(numeric) ? p.value : numeric;
      dates["icp_" + slug] = p.date || "Latest ICP";
      merged["icp_" + slug + "__status"] = p.status || "ok";
      merged["icp_" + slug + "__raw"] = [p.value,p.unit].filter(Boolean).join(" ");
    }
  });

  return {values:merged, dates:dates, latest:tests[tests.length - 1] || null};
}

function parameterStatus(def, value){
  if(value === undefined || value === null || value === "") return {text:"No data", cls:""};
  if(def && def.icp){
    const data = latestMergedParameters();
    const st = data.values[def.key + "__status"] || "ok";
    if(st === "ok") return {text:"ICP OK ✅", cls:"paramStatusGood"};
    if(st === "watch") return {text:"ICP watch ⚠️", cls:"paramStatusWatch"};
    return {text:"ICP " + st + " ❌", cls:"paramStatusBad"};
  }
  if(def.min === null || def.max === null || def.min === undefined || def.max === undefined || Number.isNaN(Number(def.min)) || Number.isNaN(Number(def.max))){
    return {text:"Tracked ✅", cls:"paramStatusGood"};
  }
  if(value >= def.min && value <= def.max) return {text:"In range ✅", cls:"paramStatusGood"};

  const nearLow = value < def.min && value >= def.min * 0.85;
  const nearHigh = value > def.max && value <= def.max * 1.18;

  if(nearLow || nearHigh) return {text:"Needs watching ⚠️", cls:"paramStatusWatch"};
  return {text:"Bad — fix it ❌", cls:"paramStatusBad"};
}

function renderLiveParameters(){
  const type = selectedTankType() || "freshwater";
  const defs = aqxOrderedDefs(aqxDefsForDisplay(type));
  const data = latestMergedParameters();
  const grid = el("parameterLiveGrid");
  if(!grid) return;

  grid.innerHTML = defs.map(def => {
    const value = data.values[def.key];
    const status = parameterStatus(def, value);
    const display = value === undefined || value === null ? "--" : (data.values[def.key + "__raw"] || value);
    const date = data.dates[def.key] || "Not logged yet";

    return `
      <div class="paramLiveCard ${aqxTileClass(def)}" onclick="openPage('graphs')">
        <div class="paramLiveTop">
          <div class="paramIcon">${def.icon}</div>
          <h3>${def.label}</h3>
        </div>
        <div class="paramValue">${display} <small>${def.unit}</small></div>
        <div class="paramTarget">Target: ${def.target}<br>Updated: ${date}<br><span class="${status.cls}">${status.text}</span></div>
      </div>
    `;
  }).join("");
}

function calculateAqxScore(){
  const type = selectedTankType() || "freshwater";
  const defs = aqxOrderedDefs(aqxDefsForDisplay(type));
  const data = latestMergedParameters();
  let scored = 0;
  let penalties = 0;
  let worst = null;

  defs.forEach(def => {
    const value = data.values[def.key];
    if(value === undefined || value === null) return;
    if(def.icp || def.min === null || def.max === null || def.min === undefined || def.max === undefined || Number.isNaN(Number(def.min)) || Number.isNaN(Number(def.max))) return;
    scored++;

    let penalty = 0;
    if(value < def.min) penalty = Math.min(20, Math.round(((def.min - value) / Math.max(def.min, 1)) * 100));
    if(value > def.max) penalty = Math.min(25, Math.round(((value - def.max) / Math.max(def.max, 1)) * 100));

    penalties += penalty;
    if(!worst || penalty > worst.penalty) worst = {def, value, penalty};
  });

  if(scored === 0) return {score:null, worst:null, status:"No test logged yet"};

  const score = Math.max(0, Math.min(100, 100 - penalties));
  let status = "Stable";
  if(score < 70) status = "Unstable";
  else if(score < 85) status = "Watch";

  return {score, worst, status};
}

function renderSmartInsights(){
  const card = el("smartInsightsCard");
  if(!card) return;

  const result = calculateAqxScore();

  if(result.score === null){
    card.innerHTML = `<h2>Smart Insights</h2><p>No test logged yet. Add your first result so AquoraX can compare parameters and guide you.</p>`;
    updateScoreDisplay(result);
    return;
  }

  let advice = "Everything logged looks steady. Keep testing consistently.";
  if(result.worst && result.worst.penalty > 0){
    advice = `${result.worst.def.label} is ${result.worst.value} ${result.worst.def.unit}. Start here first and correct slowly.`;
  }

  card.innerHTML = `
    <h2>Smart Insights</h2>
    <div class="timestampBox">
      <strong>${result.status === "Stable" ? "✅ Stable" : result.status === "Watch" ? "⚠️ Watch" : "🚨 Unstable"}</strong>
      ${advice}<br><br>
      Small, steady corrections are safer than chasing perfect numbers.
    </div>
  `;

  updateScoreDisplay(result);
}

function updateScoreDisplay(result){
  const num = el("reefScoreNumber");
  const txt = el("reefScoreText");
  const title = el("reefScoreTitle");
  const type = selectedTankType() === "reef" ? "Reef" : "Aquarium";

  if(title) title.innerText = type + " Score";
  if(num) num.innerText = result.score === null ? "--" : result.score;
  if(txt){
    if(result.score === null) txt.innerText = "Log your first test to unlock your score.";
    else txt.innerText = result.status + " — based on your latest saved parameter readings.";
  }
}


function updateHomeScoreDisplay(result){
  const num = el("homeScoreNumber");
  const txt = el("homeScoreText");
  const title = el("homeScoreTitle");
  const type = selectedTankType() === "reef" ? "Reef" : "Aquarium";
  if(title) title.innerText = type + " Score";
  if(num) num.innerText = result.score === null ? "--" : result.score;
  if(txt){
    if(result.score === null) txt.innerText = "Log your first test to unlock your score.";
    else txt.innerText = result.status + " — based on your latest saved parameter readings.";
  }
}


function aqxParamLayoutKey(def){return def.key;}
function aqxOrderedDefs(defs){
  const prefs=aqxGetHomeParameterPrefs();
  const pinned=Array.isArray(prefs.pinned)?prefs.pinned:[];
  const pinnedSet=new Set(pinned);
  const pinnedDefs=[];
  const normalDefs=[];
  defs.forEach(d=>{
    if(pinnedSet.has(aqxParamLayoutKey(d))) pinnedDefs.push(d);
    else normalDefs.push(d);
  });
  pinnedDefs.sort((a,b)=>pinned.indexOf(aqxParamLayoutKey(a))-pinned.indexOf(aqxParamLayoutKey(b)));
  return [...pinnedDefs,...normalDefs];
}
function aqxTileClass(def){
  const prefs=aqxGetHomeParameterPrefs();
  const cls=[];
  const size=prefs.globalTileSize||"standard";
  const style=prefs.globalTileStyle||"default";
  if(size==="compact") cls.push("aqxParamTileCompact");
  if(size==="large") cls.push("aqxParamTileLarge");
  if(style==="rounded") cls.push("aqxParamTileRound");
  if(style==="square") cls.push("aqxParamTileSquare");
  if(style==="glass") cls.push("aqxParamTileGlass");
  if(style==="glow") cls.push("aqxParamTileGlow");
  return cls.join(" ");
}
function aqxSetHomeGlobalStyle(style){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.globalTileStyle=style||"default";
  aqxSaveHomeParameterPrefs(prefs);
  renderHomeDashboard(); aqxRenderHomeLayoutCustomiser();
}
function aqxSetHomeGlobalSize(size){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.globalTileSize=size||"standard";
  aqxSaveHomeParameterPrefs(prefs);
  renderHomeDashboard(); aqxRenderHomeLayoutCustomiser();
}
function aqxToggleHomePinned(key){
  const prefs=aqxGetHomeParameterPrefs();
  const pinned=Array.isArray(prefs.pinned)?prefs.pinned:[];
  const i=pinned.indexOf(key);
  if(i>=0) pinned.splice(i,1);
  else pinned.push(key);
  prefs.pinned=pinned;
  aqxSaveHomeParameterPrefs(prefs);
  renderHomeDashboard(); aqxRenderHomeLayoutCustomiser();
}
function aqxResetHomeParameterLayout(){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.pinned=[];
  prefs.globalTileStyle="default";
  prefs.globalTileSize="standard";
  aqxSaveHomeParameterPrefs(prefs);
  renderHomeDashboard(); aqxRenderHomeLayoutCustomiser();
}
function aqxRenderHomeLayoutCustomiser(){
  const box=el("aqxHomeLayoutList");
  const styleBox=el("aqxHomeStyleButtons");
  const sizeBox=el("aqxHomeSizeButtons");
  const prefs=aqxGetHomeParameterPrefs();
  if(styleBox){
    const styles=[
      ["default","Default"],
      ["rounded","Rounded"],
      ["square","Square"],
      ["glass","Glass"],
      ["glow","Glow"]
    ];
    styleBox.innerHTML=styles.map(([key,label])=>`<button class="homeStyleBtn ${prefs.globalTileStyle===key?"active":""}" onclick="aqxSetHomeGlobalStyle('${key}')">${label}</button>`).join("");
  }
  if(sizeBox){
    const sizes=[
      ["compact","Compact"],
      ["standard","Standard"],
      ["large","Large"]
    ];
    sizeBox.innerHTML=sizes.map(([key,label])=>`<button class="homeStyleBtn ${prefs.globalTileSize===key?"active":""}" onclick="aqxSetHomeGlobalSize('${key}')">${label}</button>`).join("");
  }
  if(!box) return;
  const defs=aqxOrderedDefs(aqxDefsForDisplay(selectedTankType()||"freshwater"));
  const pinned=new Set(Array.isArray(prefs.pinned)?prefs.pinned:[]);
  if(!defs.length){box.innerHTML='<div class="paramCustomItem"><div><strong>No Home parameters visible</strong><span>Turn some parameters on first.</span></div></div>';return;}
  box.innerHTML=defs.map(def=>{
    const key=aqxParamLayoutKey(def);
    const isPinned=pinned.has(key);
    return `<div class="homePriorityItem">
      <div><strong>${def.label}</strong><span>${def.source==="icp"?"ICP":def.custom?"Custom":"Standard"} · ${def.unit||"No unit"}</span></div>
      <button class="homePinBtn ${isPinned?"pinned":""}" onclick="aqxToggleHomePinned('${key}')">${isPinned?"★ Pinned":"☆ Pin"}</button>
    </div>`;
  }).join("");
}

function renderHomeDashboard(){
  const type = selectedTankType() || "freshwater";
  const isReef = type === "reef";
  const defs = aqxOrderedDefs(aqxDefsForDisplay(type));
  const data = latestMergedParameters();
  const homeTitle = el("homeParameterTitle");
  const homeSummary = el("homeParameterSummary");
  const homeGrid = el("homeParameterLiveGrid");
  if(homeTitle) homeTitle.innerText = isReef ? "Saltwater / Reef Parameters" : "Freshwater Parameters";
  if(homeSummary) homeSummary.innerText = data.latest ? "Latest saved test data is shown below." : "Your latest saved readings appear here after you log a test.";
  if(homeGrid){
    const hprefs = aqxGetHomeParameterPrefs();
    homeGrid.className = "paramLiveGrid" + ((hprefs.globalTileSize||"standard")==="large" ? " aqxHomeGridLarge" : "");
    homeGrid.innerHTML = defs.map(def => {
      const value = data.values[def.key];
      const status = parameterStatus(def, value);
      const display = value === undefined || value === null ? "--" : (data.values[def.key + "__raw"] || value);
      const date = data.dates[def.key] || "Not logged yet";
      const key = aqxParamLayoutKey(def);
      const pinned = Array.isArray(hprefs.pinned) && hprefs.pinned.includes(key);
      return `
        <div class="paramLiveCard ${aqxTileClass(def)}" onclick="openPage('graphs')">
          <button class="homeCardPin ${pinned?"pinned":""}" onclick="event.stopPropagation(); aqxToggleHomePinned('${key}')" title="Pin to top">${pinned?"★":"☆"}</button>
          <div class="paramLiveTop"><div class="paramIcon">${def.icon}</div><h3>${def.label}</h3></div>
          <div class="paramValue">${display} <small>${def.unit}</small></div>
          <div class="paramTarget">Target: ${def.target}<br>Updated: ${date}<br><span class="${status.cls}">${status.text}</span></div>
        </div>`;
    }).join("");
  }
  const result = calculateAqxScore();
  const insight = el("homeSmartInsightsCard");
  if(insight){
    if(result.score === null){
      insight.innerHTML = `<h2>Smart Insights</h2><p>No test logged yet. Add your first result so AquoraX can compare parameters and guide you.</p>`;
    }else{
      let advice = "Everything logged looks steady. Keep testing consistently.";
      if(result.worst && result.worst.penalty > 0){
        advice = `${result.worst.def.label} is ${result.worst.value} ${result.worst.def.unit}. Start here first and correct slowly.`;
      }
      insight.innerHTML = `<h2>Smart Insights</h2><div class="timestampBox"><strong>${result.status === "Stable" ? "✅ Stable" : result.status === "Watch" ? "⚠️ Watch" : "🚨 Unstable"}</strong>${advice}<br><br>Small, steady corrections are safer than chasing perfect numbers.</div>`;
    }
  }
  updateHomeScoreDisplay(result);
  renderHomeTestHistory();
  aqxApplyHomePanelPrefs();
}

function renderHomeTestHistory(){
  const list = el("homeTestHistoryList");
  if(!list) return;
  const tests = getParameterTests().slice(-3).reverse();
  if(!tests.length){
    list.innerHTML = `<p style="margin-top:12px;">No test history yet.</p>`;
    return;
  }
  list.innerHTML = tests.map(t => {
    const labels = {temperature:"Temp", salinity:"SG", ph:"pH", alkalinity:"Alk", calcium:"Calcium", magnesium:"Magnesium", ammonia:"Ammonia", nitrite:"Nitrite", nitrate:"Nitrate", phosphate:"Phosphate"};
    const values = Object.keys(labels).filter(k => typeof t[k] === "number").map(k => `${labels[k]}: ${t[k]}`).join(" · ");
    return `<div class="testHistoryItem"><strong>${t.date} · ${t.time || ""}</strong><span>${values || "No values"}</span>${t.notes ? `<span>Notes: ${t.notes}</span>` : ""}</div>`;
  }).join("");
}

function renderTestHistory(){
  const list = el("testHistoryList");
  if(!list) return;

  const tests = getParameterTests().slice().reverse();
  if(!tests.length){
    list.innerHTML = `<div class="testHistoryItem"><span>No tests saved yet.</span></div>`;
    return;
  }

  const labels = {
    temperature:"Temp", salinity:"SG", ph:"pH", alkalinity:"Alk", calcium:"Calcium",
    magnesium:"Mag", ammonia:"Ammonia", nitrite:"Nitrite", nitrate:"Nitrate", phosphate:"Phosphate"
  };

  list.innerHTML = tests.map(t => {
    const values = Object.keys(labels)
      .filter(k => typeof t[k] === "number")
      .map(k => `${labels[k]}: ${t[k]}`)
      .join(" · ");

    return `
      <div class="testHistoryItem">
        <strong>${t.date} · ${t.time || ""}</strong>
        <span>${values || "No values"}</span>
        ${t.notes ? `<span>Notes: ${t.notes}</span>` : ""}
      </div>
    `;
  }).join("");
}

function clearParameterTests(){
  if(!confirm("Clear all saved water test history?")) return;
  localStorage.removeItem("aquoraxParameterTests");
  renderParameterPage();
  renderTestHistory();
  drawParameterTrendGraph();
}


function drawParameterTrendGraph(){
  const canvas = el("parameterTrendGraph");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const tests = getParameterTests();

  const type = selectedTankType() || "freshwater";
  const defs = parameterDefs[type] || parameterDefs.freshwater;
  const activeDefs = defs.filter(def => tests.some(t => typeof t[def.key] === "number"));

  const w = canvas.width;
  const h = canvas.height;
  const pad = 42;

  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = "#02070d";
  ctx.fillRect(0,0,w,h);

  ctx.strokeStyle = "rgba(255,255,255,.1)";
  ctx.lineWidth = 1;
  for(let i=0;i<=4;i++){
    const y = pad + ((h-pad*2)/4)*i;
    ctx.beginPath();
    ctx.moveTo(pad,y);
    ctx.lineTo(w-18,y);
    ctx.stroke();
  }

  ctx.fillStyle = "#9fbcd3";
  ctx.font = "13px Arial";

  if(!tests.length || !activeDefs.length){
    ctx.fillText("No saved test results yet. Log a water test to build your full trend graph.", pad, h/2);
    const legend = el("parameterGraphLegend");
    if(legend) legend.innerHTML = "";
    return;
  }

  const palette = ["#00c8ff","#63f7a3","#ffd36a","#c084fc","#ff6b6b","#8fdcff","#ff9f43","#7bed9f","#70a1ff","#ff6bcb"];

  function x(i){
    if(tests.length === 1) return w/2;
    return pad + (i/(tests.length-1))*(w-pad-22);
  }

  function normalise(value, def){
    const centre = (def.min + def.max) / 2;
    const span = Math.max(def.max - def.min, 1);
    const low = centre - span * 2.5;
    const high = centre + span * 2.5;
    const pct = (value - low) / (high - low);
    return Math.max(0, Math.min(1, pct));
  }

  function y(norm){
    return h - pad - (norm * (h - pad*2));
  }

  ctx.fillText("High", 6, pad+4);
  ctx.fillText("Low", 12, h-pad+4);

  activeDefs.forEach((def, defIndex) => {
    const color = palette[defIndex % palette.length];
    const points = [];

    tests.forEach((t, i) => {
      if(typeof t[def.key] === "number"){
        points.push({
          x:x(i),
          y:y(normalise(t[def.key], def)),
          value:t[def.key],
          date:t.date
        });
      }
    });

    if(!points.length) return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    points.forEach((p, i) => {
      if(i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });

    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI*2);
      ctx.fill();
    });

    const last = points[points.length - 1];
    if(last){
      ctx.fillStyle = color;
      ctx.font = "11px Arial";
      ctx.fillText(def.label, Math.min(last.x + 6, w - 110), last.y - 6);
    }
  });

  const legend = el("parameterGraphLegend");
  if(legend){
    legend.innerHTML = activeDefs.map((def, i) => `
      <div class="legendItem">
        <span class="parameterLegendDot" style="background:${palette[i % palette.length]}"></span>
        ${def.label}
      </div>
    `).join("");
  }
}



/* AquoraX Saving Overlay Final Patch - visible user save feedback */
(function(){
  function aqxReady(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function aqxEnsureSavingOverlay(){
    if(!document.getElementById('aqxSavingOverlay')){
      const overlay=document.createElement('div');
      overlay.id='aqxSavingOverlay';
      overlay.className='aqxSavingOverlay';
      overlay.innerHTML=`<div id="aqxSavingCard" class="aqxSavingCard"><div class="aqxSpinner"></div><div id="aqxSavingTitle" class="aqxSavingTitle">Saving results…</div><div id="aqxSavingSub" class="aqxSavingSub">Securing your AquoraX data.</div></div>`;
      document.body.appendChild(overlay);
    }
  }

  let aqxFinalSavingTimer=null;
  window.aqxSavingFeedback = function(title, sub, done){
    aqxEnsureSavingOverlay();
    const overlay=document.getElementById('aqxSavingOverlay');
    const card=document.getElementById('aqxSavingCard');
    const titleEl=document.getElementById('aqxSavingTitle');
    const subEl=document.getElementById('aqxSavingSub');
    if(!overlay || !card) return;
    clearTimeout(aqxFinalSavingTimer);
    card.classList.remove('saved');
    if(titleEl) titleEl.textContent = title || 'Saving results…';
    if(subEl) subEl.textContent = sub || 'Saving safely to AquoraX.';
    overlay.classList.add('show');
    aqxFinalSavingTimer=setTimeout(function(){
      card.classList.add('saved');
      if(titleEl) titleEl.textContent = done || 'Saved successfully ✅';
      if(subEl) subEl.textContent = 'Your data has been saved safely.';
      aqxFinalSavingTimer=setTimeout(function(){ overlay.classList.remove('show'); }, 700);
    }, 750);
  };

  function aqxWrapSaveFunction(fnName, title, sub, done){
    const original=window[fnName];
    if(typeof original !== 'function' || original.__aqxFinalSavingWrapped) return;
    const wrapped=function(){
      const before=JSON.stringify({
        p:localStorage.getItem('aquoraxParameterTests'),
        c:localStorage.getItem('aquoraxCycleHistory'),
        d:localStorage.getItem('aquoraxDosingProducts'),
        h:localStorage.getItem('aquoraxDosingHistory'),
        i:localStorage.getItem('aquoraxIcpTests'),
        coral:localStorage.getItem('aquoraxTracker_corals') || localStorage.getItem('aquoraxCorals'),
        plant:localStorage.getItem('aquoraxTracker_plants') || localStorage.getItem('aquoraxPlants')
      });
      const result=original.apply(this, arguments);
      setTimeout(function(){
        const after=JSON.stringify({
          p:localStorage.getItem('aquoraxParameterTests'),
          c:localStorage.getItem('aquoraxCycleHistory'),
          d:localStorage.getItem('aquoraxDosingProducts'),
          h:localStorage.getItem('aquoraxDosingHistory'),
          i:localStorage.getItem('aquoraxIcpTests'),
          coral:localStorage.getItem('aquoraxTracker_corals') || localStorage.getItem('aquoraxCorals'),
          plant:localStorage.getItem('aquoraxTracker_plants') || localStorage.getItem('aquoraxPlants')
        });
        if(before !== after || ['confirmCycleCompleteFromHome','confirmRapidCycleDose','confirmParadigmDose','saveNavPrefs','aqxSaveHomeParameterPrefs','aqxSaveCustomSettings'].includes(fnName)){
          window.aqxSavingFeedback(title, sub, done);
          if(typeof window.aqxQueueCloudBackup === 'function') window.aqxQueueCloudBackup(fnName);
        }
      }, 40);
      return result;
    };
    wrapped.__aqxFinalSavingWrapped=true;
    window[fnName]=wrapped;
  }

  window.aqxInstallFinalSavingOverlay = function(){
    aqxEnsureSavingOverlay();
    aqxWrapSaveFunction('saveParameterTest','Saving results…','Updating your Home dashboard and parameter history.','Results saved successfully ✅');
    aqxWrapSaveFunction('saveCycleTest','Saving cycle results…','Updating your Cycle Journey timeline.','Cycle results saved ✅');
    aqxWrapSaveFunction('addTrackerItem','Saving growth record…','Adding this item to your growth tracker.','Growth record saved ✅');
    aqxWrapSaveFunction('addTrackerGrowthImage','Saving growth update…','Updating the growth timeline.','Growth update saved ✅');
    aqxWrapSaveFunction('addDosingProduct','Saving dosing product…','Adding this product to your dosing tracker.','Dosing product saved ✅');
    aqxWrapSaveFunction('logDose','Logging dose…','Updating dose history and next due date.','Dose logged ✅');
    aqxWrapSaveFunction('saveIcpTest','Saving ICP test…','Updating ICP results and Home monitored values.','ICP test saved ✅');
    aqxWrapSaveFunction('deleteIcpTest','Removing ICP test…','Updating saved ICP history.','ICP test removed ✅');
    aqxWrapSaveFunction('deleteDosingProduct','Removing dosing product…','Updating dosing tracker.','Dosing product removed ✅');
    aqxWrapSaveFunction('confirmRapidCycleDose','Updating Journey…','Recording Blue Shark rapid cycle dose.','Journey updated ✅');
    aqxWrapSaveFunction('confirmParadigmDose','Updating Journey…','Recording Blue Shark Paradigm dose.','Journey updated ✅');
    aqxWrapSaveFunction('confirmCycleCompleteFromHome','Unlocking dashboard…','Saving cycle completion status.','Dashboard unlocked ✅');
    aqxWrapSaveFunction('saveNavPrefs','Saving navigation…','Updating your app layout preferences.','Navigation saved ✅');
    aqxWrapSaveFunction('aqxSaveHomeParameterPrefs','Saving Home parameters…','Updating your Home result cards.','Home cards saved ✅');
  };

  aqxReady(function(){
    setTimeout(window.aqxInstallFinalSavingOverlay, 300);
    setTimeout(window.aqxInstallFinalSavingOverlay, 1200);
  });
})();


/* AquoraX Home Controls HARD REBUILD - real working controls */
(function(){
  const STYLE_CLASSES=['aqxHomeStyleDefault','aqxHomeStyleRounded','aqxHomeStyleSquare','aqxHomeStyleGlass','aqxHomeStyleGlow'];
  const SIZE_CLASSES=['aqxHomeSizeCompact','aqxHomeSizeStandard','aqxHomeSizeLarge'];
  function safePrefs(){
    try{
      if(typeof aqxGetHomeParameterPrefs === 'function') return aqxGetHomeParameterPrefs();
    }catch(e){}
    try{return JSON.parse(localStorage.getItem('aquoraxHomeParameterPrefs')||'{}')||{};}catch(e){return {};}
  }
  function savePrefs(prefs){
    try{
      if(typeof aqxSaveHomeParameterPrefs === 'function') return aqxSaveHomeParameterPrefs(prefs);
    }catch(e){}
    localStorage.setItem('aquoraxHomeParameterPrefs', JSON.stringify(prefs||{}));
  }
  window.aqxApplyHomeCardControls = function(){
    const prefs=safePrefs();
    const style=(prefs.globalTileStyle||'default').toLowerCase();
    const size=(prefs.globalTileSize||'standard').toLowerCase();
    document.body.classList.remove(...STYLE_CLASSES,...SIZE_CLASSES);
    document.body.classList.add('aqxHomeStyle'+style.charAt(0).toUpperCase()+style.slice(1));
    document.body.classList.add('aqxHomeSize'+size.charAt(0).toUpperCase()+size.slice(1));
  };
  window.aqxSetHomeGlobalStyle = function(style){
    const prefs=safePrefs();
    prefs.globalTileStyle=style||'default';
    savePrefs(prefs);
    window.aqxApplyHomeCardControls();
    if(typeof renderHomeDashboard==='function') renderHomeDashboard();
    if(typeof aqxRenderHomeLayoutCustomiser==='function') aqxRenderHomeLayoutCustomiser();
    if(typeof aqxShowSaving==='function') aqxShowSaving('Updating Home cards...','Card style saved');
  };
  window.aqxSetHomeGlobalSize = function(size){
    const prefs=safePrefs();
    prefs.globalTileSize=size||'standard';
    savePrefs(prefs);
    window.aqxApplyHomeCardControls();
    if(typeof renderHomeDashboard==='function') renderHomeDashboard();
    if(typeof aqxRenderHomeLayoutCustomiser==='function') aqxRenderHomeLayoutCustomiser();
    if(typeof aqxShowSaving==='function') aqxShowSaving('Updating Home cards...','Card size saved');
  };
  window.aqxToggleHomePinned = function(key){
    const prefs=safePrefs();
    const pinned=Array.isArray(prefs.pinned)?prefs.pinned:[];
    const i=pinned.indexOf(key);
    if(i>=0) pinned.splice(i,1); else pinned.push(key);
    prefs.pinned=pinned;
    savePrefs(prefs);
    window.aqxApplyHomeCardControls();
    if(typeof renderHomeDashboard==='function') renderHomeDashboard();
    if(typeof aqxRenderHomeLayoutCustomiser==='function') aqxRenderHomeLayoutCustomiser();
  };
  window.aqxResetHomeParameterLayout = function(){
    const prefs=safePrefs();
    prefs.pinned=[];
    prefs.globalTileStyle='default';
    prefs.globalTileSize='standard';
    savePrefs(prefs);
    window.aqxApplyHomeCardControls();
    if(typeof renderHomeDashboard==='function') renderHomeDashboard();
    if(typeof aqxRenderHomeLayoutCustomiser==='function') aqxRenderHomeLayoutCustomiser();
    if(typeof aqxShowSaving==='function') aqxShowSaving('Resetting Home layout...','Home layout reset');
  };
  function paramDefs(){
    try{
      const type=(typeof selectedTankType==='function' ? selectedTankType() : 'freshwater') || 'freshwater';
      if(typeof aqxDefsForDisplay==='function'){
        const defs=aqxDefsForDisplay(type)||[];
        if(typeof aqxOrderedDefs==='function') return aqxOrderedDefs(defs);
        return defs;
      }
    }catch(e){}
    return [];
  }
  window.aqxRenderHomeLayoutCustomiser = function(){
    const prefs=safePrefs();
    const styleBox=document.getElementById('aqxHomeStyleButtons');
    const sizeBox=document.getElementById('aqxHomeSizeButtons');
    const list=document.getElementById('aqxHomeLayoutList');
    const currentStyle=prefs.globalTileStyle||'default';
    const currentSize=prefs.globalTileSize||'standard';
    if(styleBox){
      styleBox.innerHTML=[['default','Default'],['rounded','Rounded'],['square','Square'],['glass','Glass'],['glow','Glow']]
        .map(([k,l])=>`<button type="button" class="homeStyleBtn ${currentStyle===k?'active aqxHomeControlActive':''}" onclick="aqxSetHomeGlobalStyle('${k}')">${l}</button>`).join('');
    }
    if(sizeBox){
      sizeBox.innerHTML=[['compact','Compact'],['standard','Standard'],['large','Large']]
        .map(([k,l])=>`<button type="button" class="homeStyleBtn ${currentSize===k?'active aqxHomeControlActive':''}" onclick="aqxSetHomeGlobalSize('${k}')">${l}</button>`).join('');
    }
    if(list){
      const defs=paramDefs();
      const pinned=new Set(Array.isArray(prefs.pinned)?prefs.pinned:[]);
      if(!defs.length){
        list.innerHTML='<div class="homePriorityItem"><div><strong>No Home parameters visible</strong><span>Turn parameters on above first.</span></div></div>';
      }else{
        list.innerHTML=defs.map(def=>{
          const key=def.key;
          const isPinned=pinned.has(key);
          return `<div class="homePriorityItem">
            <div><strong>${def.label||key}</strong><span>${def.source==='icp'?'ICP':def.custom?'Custom':'Standard'} · ${def.unit||'No unit'}</span></div>
            <button type="button" class="homePinBtn ${isPinned?'pinned':''}" onclick="aqxToggleHomePinned('${key}')">${isPinned?'★ Pinned':'☆ Pin'}</button>
          </div>`;
        }).join('');
      }
    }
    window.aqxApplyHomeCardControls();
  };
  const oldRender=window.renderHomeDashboard;
  if(typeof oldRender==='function'){
    window.renderHomeDashboard=function(){
      const out=oldRender.apply(this, arguments);
      window.aqxApplyHomeCardControls();
      return out;
    };
  }
  document.addEventListener('DOMContentLoaded',()=>{
    window.aqxApplyHomeCardControls();
    setTimeout(()=>{try{window.aqxRenderHomeLayoutCustomiser(); window.aqxApplyHomeCardControls();}catch(e){}},150);
  });
})();



/* AquoraX FULL Home Parameter Panel Customiser - final visual wiring */
(function(){
  const STYLE_CLASSES=['aqxHomeStyleDefault','aqxHomeStyleRectangle','aqxHomeStyleRounded','aqxHomeStyleSquare','aqxHomeStyleCircle','aqxHomeStyleGlass','aqxHomeStyleGlow'];
  const SIZE_CLASSES=['aqxHomeSizeCompact','aqxHomeSizeStandard','aqxHomeSizeLarge'];
  const COL_CLASSES=['aqxHomeCols1','aqxHomeCols2','aqxHomeCols3'];
  const ALIGN_CLASSES=['aqxHomeAlignLeft','aqxHomeAlignCenter','aqxHomeAlignRight'];
  const defaults={globalTileStyle:'rectangle',globalTileSize:'standard',columns:'2',align:'left',radius:20,opacity:96,glow:20,border:22,gap:12,valueSize:36,pinned:[]};
  function readPrefs(){
    let p={};
    try{ if(typeof window.aqxGetHomeParameterPrefs==='function') p=window.aqxGetHomeParameterPrefs()||{}; }catch(e){}
    if(!p || typeof p!=='object'){try{p=JSON.parse(localStorage.getItem('aquoraxHomeParameterPrefs')||'{}')||{};}catch(e){p={};}}
    const merged=Object.assign({},defaults,p);
    if(merged.globalTileStyle==='default') merged.globalTileStyle='rectangle';
    if(!Array.isArray(merged.pinned)) merged.pinned=[];
    return merged;
  }
  function writePrefs(p){
    const clean=Object.assign({},defaults,p||{});
    if(!Array.isArray(clean.pinned)) clean.pinned=[];
    try{localStorage.setItem('aquoraxHomeParameterPrefs',JSON.stringify(clean));}catch(e){}
  }
  function cap(n,min,max,fb){n=parseFloat(n); if(Number.isNaN(n)) n=fb; return Math.max(min,Math.min(max,n));}
  function titleCase(s){s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1);}
  window.aqxApplyHomeCardControls=function(){
    const p=readPrefs();
    const style=(p.globalTileStyle||'rectangle').toLowerCase();
    const size=(p.globalTileSize||'standard').toLowerCase();
    const cols=String(p.columns||'2');
    const align=(p.align||'left').toLowerCase();
    document.body.classList.remove(...STYLE_CLASSES,...SIZE_CLASSES,...COL_CLASSES,...ALIGN_CLASSES);
    document.body.classList.add('aqxHomeStyle'+titleCase(style));
    document.body.classList.add('aqxHomeSize'+titleCase(size));
    document.body.classList.add('aqxHomeCols'+cols);
    document.body.classList.add('aqxHomeAlign'+titleCase(align));
    document.documentElement.style.setProperty('--aqxHomePanelRadius', cap(p.radius,0,48,20)+'px');
    document.documentElement.style.setProperty('--aqxHomePanelOpacity', cap(p.opacity,20,100,96)/100);
    document.documentElement.style.setProperty('--aqxHomePanelGlow', cap(p.glow,0,100,20)/100);
    document.documentElement.style.setProperty('--aqxHomePanelBorder', cap(p.border,0,100,22)/100);
    document.documentElement.style.setProperty('--aqxHomePanelGap', cap(p.gap,6,24,12)+'px');
    document.documentElement.style.setProperty('--aqxHomeValueSize', cap(p.valueSize,22,58,36)+'px');
    document.documentElement.style.setProperty('--aqxHomePanelAlign', align);
  };
  window.aqxSaveHomeParameterPrefs=function(prefs){writePrefs(prefs); aqxApplyHomeCardControls(); if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('homeParameterPrefs');};
  window.aqxGetHomeParameterPrefs=function(){return readPrefs();};
  window.aqxSetHomeGlobalStyle=function(style){const p=readPrefs(); p.globalTileStyle=style||'rectangle'; if(style==='circle' && p.columns==='1') p.columns='2'; writePrefs(p); aqxRefreshHomePanelUI('Panel shape saved');};
  window.aqxSetHomeGlobalSize=function(size){const p=readPrefs(); p.globalTileSize=size||'standard'; writePrefs(p); aqxRefreshHomePanelUI('Panel size saved');};
  window.aqxSetHomeColumns=function(cols){const p=readPrefs(); p.columns=String(cols||'2'); writePrefs(p); aqxRefreshHomePanelUI('Panel layout saved');};
  window.aqxSetHomeAlign=function(align){const p=readPrefs(); p.align=align||'left'; writePrefs(p); aqxRefreshHomePanelUI('Panel alignment saved');};
  window.aqxSetHomePanelNumber=function(key,value){const p=readPrefs(); p[key]=Number(value); writePrefs(p); aqxApplyHomeCardControls(); aqxSyncPanelControls(p); if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard();};
  window.aqxToggleHomePinned=function(key){const p=readPrefs(); const arr=Array.isArray(p.pinned)?p.pinned:[]; const i=arr.indexOf(key); if(i>=0) arr.splice(i,1); else arr.push(key); p.pinned=arr; writePrefs(p); aqxRefreshHomePanelUI();};
  window.aqxResetHomeParameterLayout=function(){const p=readPrefs(); const reset=Object.assign({},p,defaults,{pinned:[]}); writePrefs(reset); aqxRefreshHomePanelUI('Home panels reset');};
  function aqxRefreshHomePanelUI(message){
    aqxApplyHomeCardControls();
    if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard();
    if(typeof window.aqxRenderHomeLayoutCustomiser==='function') window.aqxRenderHomeLayoutCustomiser();
    if(message && typeof window.aqxSavingFeedback==='function') window.aqxSavingFeedback('Saving panel layout…','Updating your Home parameter panels.',message+' ✅');
  }
  function defs(){
    try{const type=(typeof selectedTankType==='function'?selectedTankType():'freshwater')||'freshwater'; let d=(typeof aqxDefsForDisplay==='function'?aqxDefsForDisplay(type):[])||[]; return (typeof aqxOrderedDefs==='function'?aqxOrderedDefs(d):d)||[];}catch(e){return [];}
  }
  function buttonGrid(items,current,fn){return items.map(([k,l])=>`<button type="button" class="homeStyleBtn ${String(current)===String(k)?'active aqxHomeControlActive':''}" onclick="${fn}('${k}')">${l}</button>`).join('');}
  function aqxSyncPanelControls(p){
    const map={radius:['aqxHomeRadiusRange','aqxHomeRadiusValue','px'],opacity:['aqxHomeOpacityRange','aqxHomeOpacityValue','%'],glow:['aqxHomeGlowRange','aqxHomeGlowValue','%'],border:['aqxHomeBorderRange','aqxHomeBorderValue','%'],gap:['aqxHomeGapRange','aqxHomeGapValue','px'],valueSize:['aqxHomeValueSizeRange','aqxHomeValueSizeValue','px']};
    Object.entries(map).forEach(([key,[inputId,valueId,suffix]])=>{const input=document.getElementById(inputId), out=document.getElementById(valueId); const v=p[key]??defaults[key]; if(input) input.value=v; if(out) out.textContent=v+suffix;});
  }
  window.aqxRenderHomeLayoutCustomiser=function(){
    const p=readPrefs();
    const styleBox=document.getElementById('aqxHomeStyleButtons');
    const sizeBox=document.getElementById('aqxHomeSizeButtons');
    const colBox=document.getElementById('aqxHomeColumnButtons');
    const alignBox=document.getElementById('aqxHomeAlignButtons');
    const list=document.getElementById('aqxHomeLayoutList');
    if(styleBox) styleBox.innerHTML=buttonGrid([['rectangle','Rectangle'],['circle','Circle'],['square','Square'],['rounded','Rounded'],['glass','Glass'],['glow','Glow']],p.globalTileStyle,'aqxSetHomeGlobalStyle');
    if(sizeBox) sizeBox.innerHTML=buttonGrid([['compact','Compact'],['standard','Standard'],['large','Large']],p.globalTileSize,'aqxSetHomeGlobalSize');
    if(colBox) colBox.innerHTML=buttonGrid([['1','1 per row'],['2','2 per row'],['3','3 per row']],p.columns,'aqxSetHomeColumns');
    if(alignBox) alignBox.innerHTML=buttonGrid([['left','Left'],['center','Centre'],['right','Right']],p.align,'aqxSetHomeAlign');
    aqxSyncPanelControls(p);
    if(list){
      const d=defs(); const pinned=new Set(Array.isArray(p.pinned)?p.pinned:[]);
      list.innerHTML=d.length?d.map(def=>{const key=def.key; const is=pinned.has(key); return `<div class="homePriorityItem"><div><strong>${def.label||key}</strong><span>${def.source==='icp'?'ICP':def.custom?'Custom':'Standard'} · ${def.unit||'No unit'}</span></div><button type="button" class="homePinBtn ${is?'pinned':''}" onclick="aqxToggleHomePinned('${key}')">${is?'★ Pinned':'☆ Pin'}</button></div>`;}).join(''):'<div class="homePriorityItem"><div><strong>No Home parameters visible</strong><span>Turn parameters on above first.</span></div></div>';
    }
    aqxApplyHomeCardControls();
  };
  const oldRender=window.renderHomeDashboard;
  if(typeof oldRender==='function' && !oldRender.__aqxFullPanelWrapped){
    const wrapped=function(){const out=oldRender.apply(this,arguments); aqxApplyHomeCardControls(); return out;};
    wrapped.__aqxFullPanelWrapped=true; window.renderHomeDashboard=wrapped;
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{aqxApplyHomeCardControls(); try{aqxRenderHomeLayoutCustomiser();}catch(e){}},250);});
})();




/* AquoraX PARAMETER PANEL CONTROLS - SAFE RECOVERY + WORKING CUSTOMISER */
(function(){
  const PREF_KEY='aquoraxHomeParameterPrefs';
  const styleOptions=[['rectangle','Rectangle'],['circle','Circle'],['square','Square'],['rounded','Rounded'],['glass','Glass'],['glow','Glow']];
  const sizeOptions=[['compact','Compact'],['standard','Standard'],['large','Large']];
  const colOptions=[['1','1 per row'],['2','2 per row'],['3','3 per row']];
  const alignOptions=[['left','Left'],['center','Centre'],['right','Right']];

  function getParameterDefSource(){
    try{ if(typeof parameterDefs !== 'undefined' && parameterDefs) return parameterDefs; }catch(e){}
    return {
      reef:[
        {key:'temperature',label:'Temperature',unit:'°C'}, {key:'salinity',label:'Specific Gravity',unit:'SG'}, {key:'ph',label:'pH',unit:''},
        {key:'alkalinity',label:'Alkalinity',unit:'dKH'}, {key:'calcium',label:'Calcium',unit:'ppm'}, {key:'magnesium',label:'Magnesium',unit:'ppm'},
        {key:'ammonia',label:'Ammonia',unit:'ppm'}, {key:'nitrite',label:'Nitrite',unit:'ppm'}, {key:'nitrate',label:'Nitrate',unit:'ppm'}, {key:'phosphate',label:'Phosphate',unit:'ppm'}
      ],
      freshwater:[
        {key:'temperature',label:'Temperature',unit:'°C'}, {key:'ph',label:'pH',unit:''}, {key:'ammonia',label:'Ammonia',unit:'ppm'},
        {key:'nitrite',label:'Nitrite',unit:'ppm'}, {key:'nitrate',label:'Nitrate',unit:'ppm'}, {key:'phosphate',label:'Phosphate',unit:'ppm'}
      ]
    };
  }

  function defaultPrefs(){
    const src=getParameterDefSource();
    const visibleStandard={};
    Object.keys(src).forEach(type=>{
      visibleStandard[type]={};
      (src[type]||[]).forEach(def=>{ visibleStandard[type][def.key]=true; });
    });
    return {
      visibleStandard,
      custom:[],
      icpMonitored:[],
      pinned:[],
      globalTileStyle:'rectangle',
      globalTileSize:'standard',
      columns:'2',
      align:'left',
      radius:20,
      opacity:96,
      glow:20,
      border:22,
      gap:12,
      valueSize:36
    };
  }

  function clamp(n,min,max,fb){ n=parseFloat(n); if(Number.isNaN(n)) n=fb; return Math.max(min,Math.min(max,n)); }
  function read(){
    const defs=defaultPrefs();
    let saved={};
    try{ saved=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{}; }catch(e){ saved={}; }
    const merged=Object.assign({}, defs, saved);
    merged.visibleStandard=Object.assign({}, defs.visibleStandard, saved.visibleStandard||{});
    Object.keys(defs.visibleStandard).forEach(type=>{
      merged.visibleStandard[type]=Object.assign({}, defs.visibleStandard[type], (saved.visibleStandard||{})[type]||{});
    });
    merged.custom=Array.isArray(saved.custom)?saved.custom:[];
    merged.icpMonitored=Array.isArray(saved.icpMonitored)?saved.icpMonitored:[];
    merged.pinned=Array.isArray(saved.pinned)?saved.pinned:[];
    if(!merged.globalTileStyle || merged.globalTileStyle==='default') merged.globalTileStyle='rectangle';
    if(!merged.globalTileSize) merged.globalTileSize='standard';
    merged.columns=String(merged.columns||'2');
    merged.align=merged.align||'left';
    return merged;
  }
  function write(p){
    const clean=Object.assign({}, defaultPrefs(), p||{});
    if(!Array.isArray(clean.custom)) clean.custom=[];
    if(!Array.isArray(clean.icpMonitored)) clean.icpMonitored=[];
    if(!Array.isArray(clean.pinned)) clean.pinned=[];
    if(clean.globalTileStyle==='default') clean.globalTileStyle='rectangle';
    clean.columns=String(clean.columns||'2');
    try{ localStorage.setItem(PREF_KEY, JSON.stringify(clean)); }catch(e){}
  }
  function prefKey(def){ try{return (typeof aqxParamLayoutKey==='function')?aqxParamLayoutKey(def):(def.key||def.label);}catch(e){return def.key||def.label;} }
  function currentDefs(){
    try{
      const type=(typeof selectedTankType==='function'?selectedTankType():'freshwater')||'freshwater';
      let list=[];
      if(typeof aqxDefsForDisplay==='function') list=aqxDefsForDisplay(type)||[];
      if(typeof aqxOrderedDefs==='function') list=aqxOrderedDefs(list)||list;
      return list;
    }catch(e){
      const type=(typeof selectedTankType==='function'?selectedTankType():'freshwater')||'freshwater';
      const src=getParameterDefSource();
      return src[type]||src.freshwater||[];
    }
  }
  function activeButtonGrid(id, options, current, attr){
    const box=document.getElementById(id); if(!box) return;
    box.innerHTML=options.map(([value,label])=>`<button type="button" class="homeStyleBtn ${String(current)===String(value)?'active aqxHomeControlActive':''}" data-aqx-panel="${attr}" data-value="${value}">${label}</button>`).join('');
  }
  function syncRanges(p){
    const map={
      radius:['aqxHomeRadiusRange','aqxHomeRadiusValue','px'],
      opacity:['aqxHomeOpacityRange','aqxHomeOpacityValue','%'],
      glow:['aqxHomeGlowRange','aqxHomeGlowValue','%'],
      border:['aqxHomeBorderRange','aqxHomeBorderValue','%'],
      gap:['aqxHomeGapRange','aqxHomeGapValue','px'],
      valueSize:['aqxHomeValueSizeRange','aqxHomeValueSizeValue','px']
    };
    Object.keys(map).forEach(key=>{
      const [inputId,outputId,suffix]=map[key];
      const input=document.getElementById(inputId), output=document.getElementById(outputId);
      const value=p[key];
      if(input) input.value=value;
      if(output) output.textContent=value+suffix;
    });
  }
  function titleCase(s){s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1);}
  function applyVisuals(){
    const p=read();
    const grid=document.getElementById('homeParameterLiveGrid');
    const style=p.globalTileStyle||'rectangle';
    const size=p.globalTileSize||'standard';
    document.documentElement.style.setProperty('--aqxHomePanelRadius', clamp(p.radius,0,80,20)+'px');
    document.documentElement.style.setProperty('--aqxHomePanelOpacity', clamp(p.opacity,20,100,96)/100);
    document.documentElement.style.setProperty('--aqxHomePanelGlow', clamp(p.glow,0,100,20)/100);
    document.documentElement.style.setProperty('--aqxHomePanelBorder', clamp(p.border,0,100,22)/100);
    document.documentElement.style.setProperty('--aqxHomePanelGap', clamp(p.gap,4,36,12)+'px');
    document.documentElement.style.setProperty('--aqxHomeValueSize', clamp(p.valueSize,18,70,36)+'px');

    document.body.classList.remove('aqxHomeStyleDefault','aqxHomeStyleRectangle','aqxHomeStyleRounded','aqxHomeStyleSquare','aqxHomeStyleCircle','aqxHomeStyleGlass','aqxHomeStyleGlow','aqxHomeSizeCompact','aqxHomeSizeStandard','aqxHomeSizeLarge','aqxHomeCols1','aqxHomeCols2','aqxHomeCols3','aqxHomeAlignLeft','aqxHomeAlignCenter','aqxHomeAlignRight');
    document.body.classList.add('aqxHomeStyle'+titleCase(style));
    document.body.classList.add('aqxHomeSize'+titleCase(size));
    document.body.classList.add('aqxHomeCols'+String(p.columns||'2'));
    document.body.classList.add('aqxHomeAlign'+titleCase(p.align||'left'));

    if(!grid) return;
    grid.classList.remove('aqxPanelStyle-rectangle','aqxPanelStyle-rounded','aqxPanelStyle-square','aqxPanelStyle-circle','aqxPanelStyle-glass','aqxPanelStyle-glow','aqxPanelSize-compact','aqxPanelSize-standard','aqxPanelSize-large','aqxPanelCols-1','aqxPanelCols-2','aqxPanelCols-3','aqxPanelAlign-left','aqxPanelAlign-center','aqxPanelAlign-right');
    grid.classList.add('aqxPanelStyle-'+style,'aqxPanelSize-'+size,'aqxPanelCols-'+String(p.columns||'2'),'aqxPanelAlign-'+(p.align||'left'));
    grid.style.gap=clamp(p.gap,4,36,12)+'px';
    grid.style.display='grid';
    grid.querySelectorAll('.paramLiveCard').forEach(card=>{
      card.style.opacity='1';
      card.style.display='';
      card.style.borderColor='rgba(0,200,255,'+(clamp(p.border,0,100,22)/100)+')';
      card.style.textAlign=p.align||'left';
      card.style.backgroundColor='rgba(8,24,39,'+(clamp(p.opacity,20,100,96)/100)+')';
      card.style.boxShadow='0 0 '+Math.round(14+clamp(p.glow,0,100,20)/2)+'px rgba(0,200,255,'+(clamp(p.glow,0,100,20)/180)+')';
      const value=card.querySelector('.paramValue'); if(value) value.style.fontSize=clamp(p.valueSize,18,70,36)+'px';
      card.style.aspectRatio='auto';
      card.style.borderRadius=clamp(p.radius,0,80,20)+'px';
      if(style==='circle'){ card.style.aspectRatio='1 / 1'; card.style.borderRadius='999px'; }
      if(style==='square'){ card.style.aspectRatio='1 / 1'; card.style.borderRadius='8px'; }
      if(style==='rounded'){ card.style.borderRadius='36px'; }
      if(style==='glass'){ card.style.backdropFilter='blur(16px)'; card.style.backgroundColor='rgba(255,255,255,.055)'; }
      if(style==='glow'){ card.style.boxShadow='0 0 42px rgba(0,200,255,.38), inset 0 0 18px rgba(255,255,255,.035)'; }
    });
  }
  function renderControls(){
    const p=read();
    activeButtonGrid('aqxHomeStyleButtons',styleOptions,p.globalTileStyle,'style');
    activeButtonGrid('aqxHomeSizeButtons',sizeOptions,p.globalTileSize,'size');
    activeButtonGrid('aqxHomeColumnButtons',colOptions,p.columns,'columns');
    activeButtonGrid('aqxHomeAlignButtons',alignOptions,p.align,'align');
    syncRanges(p);
    const list=document.getElementById('aqxHomeLayoutList');
    if(list){
      const defs=currentDefs(); const pinned=new Set(p.pinned||[]);
      list.innerHTML=defs.length?defs.map(def=>{const key=prefKey(def); const is=pinned.has(key); return `<div class="homePriorityItem"><div><strong>${def.label||key}</strong><span>${def.source==='icp'?'ICP':def.custom?'Custom':'Standard'} · ${def.unit||'No unit'}</span></div><button type="button" class="homePinBtn ${is?'pinned':''}" data-aqx-pin="${key}">${is?'★ Pinned':'☆ Pin'}</button></div>`;}).join(''):'<div class="homePriorityItem"><div><strong>No Home parameters visible</strong><span>Turn parameters on above first.</span></div></div>';
    }
    applyVisuals();
  }
  function rerender(msg){
    if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard();
    renderControls();
    applyVisuals();
    if(msg && typeof window.aqxSavingFeedback==='function') window.aqxSavingFeedback('Saving panel layout…','Updating your Home parameter panels.',msg+' ✅');
  }

  window.aqxGetHomeParameterPrefs=read;
  window.aqxSaveHomeParameterPrefs=function(prefs){write(prefs); applyVisuals(); if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('homeParameterPrefs');};
  window.aqxSetHomeGlobalStyle=function(value){const p=read(); p.globalTileStyle=value||'rectangle'; if(p.globalTileStyle==='circle' && p.columns==='1') p.columns='2'; write(p); rerender('Panel shape saved');};
  window.aqxSetHomeGlobalSize=function(value){const p=read(); p.globalTileSize=value||'standard'; write(p); rerender('Panel size saved');};
  window.aqxSetHomeColumns=function(value){const p=read(); p.columns=String(value||'2'); if(p.globalTileStyle==='circle' && p.columns==='1') p.columns='2'; write(p); rerender('Panel layout saved');};
  window.aqxSetHomeAlign=function(value){const p=read(); p.align=value||'left'; write(p); rerender('Panel alignment saved');};
  window.aqxSetHomePanelNumber=function(key,value){const p=read(); p[key]=Number(value); write(p); renderControls(); applyVisuals();};
  window.aqxToggleHomePinned=function(key){const p=read(); const arr=Array.isArray(p.pinned)?p.pinned:[]; const i=arr.indexOf(key); if(i>=0) arr.splice(i,1); else arr.push(key); p.pinned=arr; write(p); rerender();};
  window.aqxResetHomeParameterLayout=function(){const p=read(); const reset=Object.assign({},p,{pinned:[],globalTileStyle:'rectangle',globalTileSize:'standard',columns:'2',align:'left',radius:20,opacity:96,glow:20,border:22,gap:12,valueSize:36}); write(reset); rerender('Home panels reset');};
  window.aqxApplyHomeCardControls=applyVisuals;
  window.aqxRenderHomeLayoutCustomiser=renderControls;

  document.addEventListener('click',function(e){
    const btn=e.target.closest('[data-aqx-panel]');
    if(btn){
      e.preventDefault();
      const type=btn.getAttribute('data-aqx-panel'), value=btn.getAttribute('data-value');
      if(type==='style') window.aqxSetHomeGlobalStyle(value);
      if(type==='size') window.aqxSetHomeGlobalSize(value);
      if(type==='columns') window.aqxSetHomeColumns(value);
      if(type==='align') window.aqxSetHomeAlign(value);
      return;
    }
    const pin=e.target.closest('[data-aqx-pin]');
    if(pin){ e.preventDefault(); window.aqxToggleHomePinned(pin.getAttribute('data-aqx-pin')); }
  });
  document.addEventListener('input',function(e){
    const ids={aqxHomeRadiusRange:'radius',aqxHomeOpacityRange:'opacity',aqxHomeGlowRange:'glow',aqxHomeBorderRange:'border',aqxHomeGapRange:'gap',aqxHomeValueSizeRange:'valueSize'};
    if(ids[e.target.id]) window.aqxSetHomePanelNumber(ids[e.target.id],e.target.value);
  });
  const existingRender=window.renderHomeDashboard;
  if(typeof existingRender==='function' && !existingRender.__aqxSafePanelWrapped){
    const wrapped=function(){const out=existingRender.apply(this,arguments); setTimeout(applyVisuals,0); return out;};
    wrapped.__aqxSafePanelWrapped=true;
    window.renderHomeDashboard=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){try{renderControls(); if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard(); applyVisuals();}catch(e){console.warn('AquoraX Home panel recovery failed',e);}},300);});
})();



/* AquoraX Home Parameter Visibility Restore - keeps safe panel renderer but restores add/remove/show/hide */
(function(){
  const PREF_KEY='aquoraxHomeParameterPrefs';
  function el(id){return document.getElementById(id);} 
  function slug(text){
    return String(text||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || ('param_'+Date.now());
  }
  function tankType(){
    try{return (typeof selectedTankType==='function' ? selectedTankType() : 'freshwater') || 'freshwater';}catch(e){return 'freshwater';}
  }
  function defSource(){
    try{ if(typeof parameterDefs !== 'undefined' && parameterDefs) return parameterDefs; }catch(e){}
    return {
      reef:[
        {key:'temperature',label:'Temperature',unit:'°C',target:'24–26 °C',min:24,max:26,icon:'🌡️'},
        {key:'salinity',label:'Specific Gravity',unit:'SG',target:'1.024–1.026',min:1.024,max:1.026,icon:'SG'},
        {key:'ph',label:'pH',unit:'',target:'8.0–8.4',min:8,max:8.4,icon:'pH'},
        {key:'alkalinity',label:'Alkalinity',unit:'dKH',target:'7.5–9.5 dKH',min:7.5,max:9.5,icon:'KH'},
        {key:'calcium',label:'Calcium',unit:'ppm',target:'400–450 ppm',min:400,max:450,icon:'Ca'},
        {key:'magnesium',label:'Magnesium',unit:'ppm',target:'1250–1400 ppm',min:1250,max:1400,icon:'Mg'},
        {key:'ammonia',label:'Ammonia',unit:'ppm',target:'0 ppm',min:0,max:0.1,icon:'NH₃'},
        {key:'nitrite',label:'Nitrite',unit:'ppm',target:'0 ppm',min:0,max:0.1,icon:'NO₂'},
        {key:'nitrate',label:'Nitrate',unit:'ppm',target:'2–20 ppm',min:2,max:20,icon:'NO₃'},
        {key:'phosphate',label:'Phosphate',unit:'ppm',target:'0.03–0.10 ppm',min:0.03,max:0.1,icon:'PO₄'}
      ],
      freshwater:[
        {key:'temperature',label:'Temperature',unit:'°C',target:'22–26 °C',min:22,max:26,icon:'🌡️'},
        {key:'ph',label:'pH',unit:'',target:'6.5–7.8',min:6.5,max:7.8,icon:'pH'},
        {key:'ammonia',label:'Ammonia',unit:'ppm',target:'0 ppm',min:0,max:0.1,icon:'NH₃'},
        {key:'nitrite',label:'Nitrite',unit:'ppm',target:'0 ppm',min:0,max:0.1,icon:'NO₂'},
        {key:'nitrate',label:'Nitrate',unit:'ppm',target:'5–40 ppm',min:5,max:40,icon:'NO₃'},
        {key:'phosphate',label:'Phosphate',unit:'ppm',target:'0.05–1.0 ppm',min:0.05,max:1.0,icon:'PO₄'}
      ]
    };
  }
  function defaults(){
    const src=defSource(); const visibleStandard={};
    Object.keys(src).forEach(type=>{visibleStandard[type]={}; (src[type]||[]).forEach(d=>visibleStandard[type][d.key]=true);});
    return {visibleStandard:visibleStandard,custom:[],icpMonitored:[],pinned:[],globalTileStyle:'rectangle',globalTileSize:'standard',columns:'2',align:'left',radius:20,opacity:96,glow:20,border:22,gap:12,valueSize:36};
  }
  function read(){
    const d=defaults(); let s={};
    try{s=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){s={};}
    const out=Object.assign({},d,s);
    out.visibleStandard=Object.assign({},d.visibleStandard,s.visibleStandard||{});
    Object.keys(d.visibleStandard).forEach(type=>{out.visibleStandard[type]=Object.assign({},d.visibleStandard[type],((s.visibleStandard||{})[type]||{}));});
    out.custom=Array.isArray(s.custom)?s.custom:[];
    out.icpMonitored=Array.isArray(s.icpMonitored)?s.icpMonitored:[];
    out.pinned=Array.isArray(s.pinned)?s.pinned:[];
    out.globalTileStyle=out.globalTileStyle||'rectangle';
    out.globalTileSize=out.globalTileSize||'standard';
    out.columns=String(out.columns||'2');
    out.align=out.align||'left';
    return out;
  }
  function write(p){
    const clean=Object.assign({},defaults(),p||{});
    clean.custom=Array.isArray(clean.custom)?clean.custom:[];
    clean.icpMonitored=Array.isArray(clean.icpMonitored)?clean.icpMonitored:[];
    clean.pinned=Array.isArray(clean.pinned)?clean.pinned:[];
    clean.columns=String(clean.columns||'2');
    try{localStorage.setItem(PREF_KEY,JSON.stringify(clean));}catch(e){}
  }
  function latestIcpMap(){
    const out={}; let tests=[];
    try{tests=(typeof getIcpTests==='function'?getIcpTests():[])||[];}catch(e){tests=[];}
    tests.slice().reverse().forEach(test=>{(test.parameters||[]).forEach(param=>{const s=slug(param.name); out[s]={name:param.name,value:param.value,unit:param.unit,status:param.status||'ok',date:test.date||test.savedIso,lab:test.lab||'ICP'};});});
    return out;
  }
  function availableIcpParameters(){
    const seen={}; let tests=[];
    try{tests=(typeof getIcpTests==='function'?getIcpTests():[])||[];}catch(e){tests=[];}
    tests.forEach(test=>{(test.parameters||[]).forEach(param=>{const s=slug(param.name); if(!seen[s]) seen[s]={slug:s,name:param.name,unit:param.unit||'',status:param.status||'ok'}; else if(param.unit&&!seen[s].unit) seen[s].unit=param.unit;});});
    return Object.values(seen).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  }
  window.aqxGetHomeParameterPrefs=read;
  window.aqxSaveHomeParameterPrefs=function(prefs){write(prefs); if(typeof window.aqxApplyHomeCardControls==='function') window.aqxApplyHomeCardControls(); if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('homeParameterPrefs');};
  window.aqxLatestIcpMap=latestIcpMap;
  window.aqxAvailableIcpParameters=availableIcpParameters;
  window.aqxDefsForDisplay=function(type){
    type=type||tankType(); const p=read(); const src=defSource();
    const standard=(src[type]||src.freshwater||[]).filter(def=>((p.visibleStandard[type]||{})[def.key]!==false));
    const custom=(p.custom||[]).map(c=>({key:'custom_'+c.key,label:c.label,unit:c.unit||'',target:c.target||'Custom tracked parameter',min:c.min,max:c.max,icon:c.icon||String(c.label||'C').slice(0,2),custom:true,source:'custom'}));
    const icpMap=latestIcpMap();
    const icp=(p.icpMonitored||[]).map(s=>{const latest=icpMap[s]||{}; return {key:'icp_'+s,label:latest.name||String(s).replace(/_/g,' '),unit:latest.unit||'',target:'Latest ICP result',icon:String(latest.name||'ICP').slice(0,2),icp:true,source:'icp',icpSlug:s};});
    return standard.concat(custom,icp);
  };
  function refresh(){
    try{ if(typeof renderParameterPage==='function') renderParameterPage(); }catch(e){}
    try{ if(typeof renderHomeDashboard==='function') renderHomeDashboard(); }catch(e){}
    try{ if(typeof window.aqxRenderHomeParameterCustomiser==='function') window.aqxRenderHomeParameterCustomiser(); }catch(e){}
    try{ if(typeof window.aqxRenderHomeLayoutCustomiser==='function') window.aqxRenderHomeLayoutCustomiser(); }catch(e){}
    try{ if(typeof window.aqxApplyHomeCardControls==='function') window.aqxApplyHomeCardControls(); }catch(e){}
  }
  window.aqxToggleStandardHomeParam=function(type,key,visible){
    const p=read(); type=type||tankType(); p.visibleStandard[type]=p.visibleStandard[type]||{}; p.visibleStandard[type][key]=!!visible; write(p); refresh();
  };
  window.aqxToggleIcpHomeParam=function(s,visible){
    const p=read(); const set=new Set(p.icpMonitored||[]); if(visible) set.add(s); else set.delete(s); p.icpMonitored=Array.from(set); write(p); refresh();
  };
  window.aqxAddCustomHomeParameter=function(){
    const name=(el('aqxCustomParamName')||{}).value||''; if(!name.trim()){alert('Add a parameter name first.');return;}
    const p=read(); const key=slug(name);
    const minRaw=(el('aqxCustomParamMin')||{}).value||''; const maxRaw=(el('aqxCustomParamMax')||{}).value||'';
    p.custom=(p.custom||[]).filter(x=>x.key!==key);
    p.custom.push({key:key,label:name.trim(),unit:((el('aqxCustomParamUnit')||{}).value||''),target:((el('aqxCustomParamTarget')||{}).value||''),min:minRaw===''?null:parseFloat(minRaw),max:maxRaw===''?null:parseFloat(maxRaw),icon:((el('aqxCustomParamIcon')||{}).value||name.trim().slice(0,2))});
    write(p); ['aqxCustomParamName','aqxCustomParamUnit','aqxCustomParamTarget','aqxCustomParamMin','aqxCustomParamMax','aqxCustomParamIcon'].forEach(id=>{const x=el(id); if(x) x.value='';}); refresh();
  };
  window.aqxRemoveCustomHomeParameter=function(key){
    if(!confirm('Remove this custom Home parameter?')) return;
    const p=read(); p.custom=(p.custom||[]).filter(x=>x.key!==key); p.pinned=(p.pinned||[]).filter(x=>x!=='custom_'+key); write(p); refresh();
  };
  window.aqxRenderHomeParameterCustomiser=function(){
    const type=tankType(); const p=read(); const box=el('aqxHomeParameterList');
    if(box){
      const standards=(defSource()[type]||defSource().freshwater||[]).map(def=>{
        const checked=((p.visibleStandard[type]||{})[def.key]!==false)?'checked':'';
        return '<div class="paramCustomItem"><div><strong>'+def.label+'</strong><span>'+(def.target||'Tracked parameter')+(def.unit?' · '+def.unit:'')+'</span><span class="paramSourceBadge">Standard '+(type==='reef'?'reef':'freshwater')+'</span></div><label class="navSwitch"><input type="checkbox" '+checked+' onchange="aqxToggleStandardHomeParam(\''+type+'\',\''+def.key+'\',this.checked)"><span class="navSlider"></span></label></div>';
      }).join('');
      const custom=(p.custom||[]).map(c=>'<div class="paramCustomItem"><div><strong>'+c.label+'</strong><span>'+(c.target||'Custom tracked parameter')+(c.unit?' · '+c.unit:'')+'</span><span class="paramSourceBadge">Custom</span></div><button class="dangerBtn" style="width:auto;min-width:92px;" onclick="aqxRemoveCustomHomeParameter(\''+c.key+'\')">Remove</button></div>').join('');
      box.innerHTML=standards + (custom || '<div class="paramCustomItem"><div><strong>No custom Home parameters yet</strong><span>Add your own below or turn on ICP parameters once ICP results exist.</span></div></div>');
    }
    const icpBox=el('aqxIcpHomeParameterList');
    if(icpBox){
      const icp=availableIcpParameters();
      if(!icp.length){icpBox.innerHTML='<div class="paramCustomItem"><div><strong>No ICP parameters saved yet</strong><span>Save an ICP test first, then choose which ICP values should appear on Home.</span></div></div>';}
      else{
        const on=new Set(p.icpMonitored||[]);
        icpBox.innerHTML=icp.map(item=>'<div class="paramCustomItem"><div><strong>'+item.name+'</strong><span>'+(item.unit||'No unit saved')+'</span><span class="paramSourceBadge">ICP</span></div><label class="navSwitch"><input type="checkbox" '+(on.has(item.slug)?'checked':'')+' onchange="aqxToggleIcpHomeParam(\''+item.slug+'\',this.checked)"><span class="navSlider"></span></label></div>').join('');
      }
    }
  };
  document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,350); setTimeout(refresh,1200);});
})();
