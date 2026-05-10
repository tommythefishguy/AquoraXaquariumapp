
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
  {id:"guides", label:"Guides", desc:"Aquarium learning guides"},
  {id:"jobs", label:"Jobs", desc:"Tank maintenance reminders and completed jobs"}
];

const aquoraxLockedNavItems = ["home","growth","dosing","cycle","profile"];
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
  /* V7 migration: clean starter nav must be Home, Tank Life, Tank Care, Journey, Profile only. */
  const marker = "aquoraxCleanNavV6DosingLockedApplied";
  if(localStorage.getItem(marker) === "yes") return;

  const prefs = getNavPrefs();
  ["parameters","history","graphs","guides","jobs","dosing","log"].forEach(id => prefs[id] = false);
  prefs.care = true;
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
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape") aqxCloseSideMenu();
  });
}

function isNavVisible(id){
  if(aquoraxLockedNavItems.includes(id)) return true;
  if(id === "log") return false;
  const prefs = getNavPrefs();
  return prefs[id] === true;
}

function openNavMenu(){
  aqxOpenSideMenu();
}

function closeNavMenu(){
  aqxCloseSideMenu();
}

function aqxOpenSideMenu(){
  const overlay = el("aqxSideMenuOverlay");
  if(!overlay) return;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("aqxMenuOpen");
}

function aqxCloseSideMenu(event){
  if(event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
  const overlay = el("aqxSideMenuOverlay");
  if(!overlay) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("aqxMenuOpen");
}

function aqxSideMenuGo(page){
  aqxCloseSideMenu();
  openPage(page);
}

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
    jobs:"aqxShowNavJobs",
    log:"aqxShowNavLog"
  };

  Object.values(classMap).forEach(cls => document.body.classList.remove(cls));

  document.querySelectorAll(".nav button").forEach(btn => {
    const id = (btn.id || "").replace("nav-", "");
    if(!id) return;

    const visible = isNavVisible(id);
    btn.classList.toggle("navHidden", !visible);

    /* Core nav stays locked visible. Optional nav is forced by JS as well as CSS so Profile toggles cannot desync. */
    if(aquoraxLockedNavItems.includes(id)){
      btn.style.display = "";
      btn.removeAttribute("aria-hidden");
    }else{
      btn.style.display = visible ? "block" : "none";
      btn.setAttribute("aria-hidden", visible ? "false" : "true");
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
  let chosen = selectedTankType();
  if(!chosen){
    // Reef-only app: default safely to reef instead of blocking users with old freshwater-era wording.
    chosen = "reef";
  }
  localStorage.setItem("aquoraxTankType", chosen);
  localStorage.setItem("aquoraxWelcomeTank", chosen);
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
  document.querySelectorAll(".aqxSideMenuGroup button").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(`.aqxSideMenuGroup button[onclick*="'${page}'"]`).forEach(btn => btn.classList.add("active"));
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

  if(page === "care"){
    if(typeof aqxRenderTankCare === "function") aqxRenderTankCare();
  }

  if(page === "jobs"){
    aqxRenderJobs();
  }

  if(page === "home" && typeof aqxRenderHomeJobs === "function"){
    aqxRenderHomeJobs();
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
function aqxActiveScopedStorageKey(base){
  try{
    if(typeof window.aqxScopedKey === "function") return window.aqxScopedKey(base);
  }catch(e){}
  return base;
}

function getCycleHistory(){
  try{
    const key = aqxActiveScopedStorageKey("aquoraxCycleHistory");
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  }catch(e){ return []; }
}

function saveCycleHistory(history){
  localStorage.setItem(aqxActiveScopedStorageKey("aquoraxCycleHistory"), JSON.stringify(history || []));
}

function getGraphEvents(){
  try{
    const key = aqxActiveScopedStorageKey("aquoraxGraphEvents");
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  }catch(e){ return []; }
}

function saveGraphEvents(events){
  localStorage.setItem(aqxActiveScopedStorageKey("aquoraxGraphEvents"), JSON.stringify(events || []));
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
    tankId: (window.aqxGetActiveTank ? window.aqxGetActiveTank().id : "tank_main"),
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

  ["coral","plant","fish","algae","invert"].forEach(kind => {
    const oldOpen = el(kind + "TrackerOpen");
    const growthOpen = el("growth" + trackerMeta(kind).cap + "TrackerOpen");
    if(oldOpen) oldOpen.style.display = "block";
    if(growthOpen) growthOpen.style.display = "block";
    renderTrackerList(kind);
  });
  renderLiveParameters();
  renderSmartInsights();
  renderHomeDashboard();
}

function trackerMeta(kind){
  const meta = {
    coral:{cap:"Coral", label:"coral", plural:"corals", key:"aquoraxCoralTracker", empty:"Add a coral name first.", timeline:"Coral Timeline"},
    plant:{cap:"Plant", label:"plant", plural:"plants", key:"aquoraxPlantTracker", empty:"Add a plant name first.", timeline:"Plant Timeline"},
    fish:{cap:"Fish", label:"fish", plural:"fish", key:"aquoraxFishTracker", empty:"Add a fish name first.", timeline:"Fish Timeline"},
    algae:{cap:"Algae", label:"algae log", plural:"algae logs", key:"aquoraxAlgaeTracker", empty:"Add an algae / area name first.", timeline:"Algae Timeline"},
    invert:{cap:"Invert", label:"invert", plural:"inverts", key:"aquoraxInvertTracker", empty:"Add an invert name first.", timeline:"Invert Timeline"}
  };
  return meta[kind] || meta.coral;
}

function openGrowthTrackerPanel(kind){
  const main = el("growthMain");
  if(main) main.style.display = "none";
  ["coral","plant","fish","algae","invert"].forEach(k => {
    const panel = el(k + "TrackerPanel");
    if(panel) panel.classList.toggle("active", k === kind);
  });
  renderTrackerList(kind);
  window.scrollTo(0,0);
}

function closeTrackerPanels(){
  const main = el("growthMain");
  if(main) main.style.display = "block";
  ["coral","plant","fish","algae","invert"].forEach(k => {
    const panel = el(k + "TrackerPanel");
    if(panel) panel.classList.remove("active");
  });
  window.scrollTo(0,0);
}


function triggerCameraInput(inputId){
  const input = el(inputId);
  if(input) input.click();
}

function trackerKey(kind){
  const base = trackerMeta(kind).key;
  try{
    if(typeof window.aqxScopedKey === "function") return window.aqxScopedKey(base);
  }catch(e){}
  return base;
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
  const prefix = kind;
  const meta = trackerMeta(kind);
  const name = val(prefix + "Name").trim();
  const type = val(prefix + "Type").trim();
  const dateAdded = val(prefix + "DateAdded");
  const growth = val(prefix + "Growth").trim();

  if(!name){
    alert(meta.empty);
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
  const meta = trackerMeta(kind);
  const list = el(kind + "TrackerList");
  if(!list) return;

  const countEl = el(kind + "TrackerCount");
  const searchEl = el(kind + "TrackerSearch");

  const allItems = getTrackerItems(kind);
  const label = meta.label;
  const plural = meta.plural;
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


/* === AquoraX ICP Screenshot/Text Import === */
let aqxPendingIcpFile = null;
let aqxTesseractLoading = null;
let aqxIcpImportSource = 'idle';
function aqxClearIcpImportResults(opts={}){
  const {clearText=false, clearForm=false, clearImportMeta=false} = opts;
  if(clearText) setVal('aqxIcpImportText','');
  const review = el('aqxIcpImportReview');
  if(review){ review.style.display='none'; review.innerHTML=''; }
  if(clearForm){
    const box = el('icpParameterBuilder');
    if(box) box.innerHTML = '';
  }
  if(clearImportMeta){
    setVal('icpLab','');
    setVal('icpNotes','');
  }
}
const AQX_ICP_PARAM_ALIASES = {
  alkalinity:['alkalinity','alk','kh','carbonate hardness','dKH'],
  calcium:['calcium','ca'],
  magnesium:['magnesium','mg'],
  nitrate:['nitrate','no3','no₃'],
  phosphate:['phosphate','po4','po₄'],
  potassium:['potassium','k'],
  iodine:['iodine','i'],
  iron:['iron','fe'],
  strontium:['strontium','sr'],
  boron:['boron','b'],
  bromide:['bromide','br'],
  barium:['barium','ba'],
  manganese:['manganese','mn'],
  molybdenum:['molybdenum','mo'],
  zinc:['zinc','zn'],
  copper:['copper','cu'],
  nickel:['nickel','ni'],
  lithium:['lithium','li'],
  vanadium:['vanadium','v'],
  chromium:['chromium','cr'],
  cobalt:['cobalt','co'],
  selenium:['selenium','se'],
  fluoride:['fluoride','f'],
  salinity:['salinity'],
  ph:['ph','pH'],
  silicate:['silicate','sio2','silicon']
};
const AQX_ICP_LABELS = {
  alkalinity:'Alkalinity', calcium:'Calcium', magnesium:'Magnesium', nitrate:'Nitrate', phosphate:'Phosphate', potassium:'Potassium', iodine:'Iodine', iron:'Iron', strontium:'Strontium', boron:'Boron', bromide:'Bromide', barium:'Barium', manganese:'Manganese', molybdenum:'Molybdenum', zinc:'Zinc', copper:'Copper', nickel:'Nickel', lithium:'Lithium', vanadium:'Vanadium', chromium:'Chromium', cobalt:'Cobalt', selenium:'Selenium', fluoride:'Fluoride', salinity:'Salinity', ph:'pH', silicate:'Silicate'
};
const AQX_ICP_RANGES = {
  alkalinity:[7.5,9.0,'dKH'], calcium:[400,460,'ppm'], magnesium:[1280,1420,'ppm'], nitrate:[1,20,'ppm'], phosphate:[0.02,0.10,'ppm'], potassium:[380,420,'ppm'], iodine:[0.03,0.08,'ppm'], iron:[0,0.01,'ppm'], strontium:[7,10,'ppm'], boron:[3.8,5.0,'ppm'], bromide:[60,75,'ppm'], barium:[0,0.08,'ppm'], manganese:[0,0.01,'ppm'], molybdenum:[0.005,0.02,'ppm'], zinc:[0,0.015,'ppm'], copper:[0,0.005,'ppm'], nickel:[0,0.01,'ppm'], lithium:[0.15,0.25,'ppm'], vanadium:[0,0.003,'ppm'], chromium:[0,0.005,'ppm'], cobalt:[0,0.003,'ppm'], selenium:[0,0.004,'ppm'], fluoride:[1.0,1.5,'ppm'], salinity:[34,36,'ppt'], ph:[7.9,8.4,''], silicate:[0,0.2,'ppm']
};
function aqxIcpSetStatus(msg, cls=''){
  const box = el('aqxIcpImportStatus');
  if(box){ box.className = 'aqxIcpImportStatus ' + cls; box.textContent = msg; }
}
function aqxHandleIcpFile(file){
  aqxPendingIcpFile = file || null;
  aqxIcpImportSource = 'file';
  aqxClearIcpImportResults({clearText:true, clearForm:true});
  const preview = el('aqxIcpImportPreview');
  if(!file){ if(preview) preview.style.display='none'; aqxIcpSetStatus('Ready to import. Upload a clear screenshot or paste ICP text.'); return; }
  aqxIcpSetStatus('File ready: ' + file.name + '. Tap Scan Screenshot to auto-read it. Demo results have been cleared.');
  if(preview){
    if(file.type && file.type.startsWith('image/')){
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${url}" alt="ICP upload preview"><span>${file.name}</span>`;
      preview.style.display = 'grid';
    }else{
      preview.innerHTML = `<strong>${file.name}</strong><span>PDF selected. For this first build, screenshot/image OCR is more reliable. Paste report text if OCR cannot read it.</span>`;
      preview.style.display = 'grid';
    }
  }
}
function aqxPrepareIcpImageForOcr(file){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try{
        const scale = Math.min(4, Math.max(2, 2400 / Math.max(img.width, img.height)));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', {willReadFrequently:true});
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0,0,canvas.width,canvas.height);
        for(let i=0;i<data.data.length;i+=4){
          const r=data.data[i], g=data.data[i+1], b=data.data[i+2];
          let y = 0.299*r + 0.587*g + 0.114*b;
          // boost contrast for small ICP table text
          y = y < 165 ? Math.max(0, y-35) : Math.min(255, y+35);
          data.data[i]=data.data[i+1]=data.data[i+2]=y;
        }
        ctx.putImageData(data,0,0);
        URL.revokeObjectURL(url);
        resolve(canvas);
      }catch(e){ URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image. Try another screenshot.')); };
    img.src = url;
  });
}
function aqxLoadTesseract(){
  if(window.Tesseract) return Promise.resolve(window.Tesseract);
  if(aqxTesseractLoading) return aqxTesseractLoading;
  aqxIcpSetStatus('Loading OCR engine... this can take a moment the first time.');
  aqxTesseractLoading = new Promise((resolve,reject)=>{
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    sc.async = true;
    sc.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('OCR engine did not initialise'));
    sc.onerror = () => reject(new Error('Could not load OCR engine. Check internet connection or paste ICP text instead.'));
    document.head.appendChild(sc);
  });
  return aqxTesseractLoading;
}
async function aqxStartIcpOcr(){
  if(!aqxPendingIcpFile){ alert('Upload an ICP screenshot first.'); return; }
  aqxIcpImportSource = 'scan';
  aqxClearIcpImportResults({clearText:true, clearForm:true});
  if(aqxPendingIcpFile.type && aqxPendingIcpFile.type === 'application/pdf'){
    aqxIcpSetStatus('PDF OCR needs the next backend stage. For now, use a screenshot image or paste the report text.', 'warn');
    return;
  }
  try{
    const T = await aqxLoadTesseract();
    aqxIcpSetStatus('Preparing screenshot for OCR...');
    const ocrTarget = await aqxPrepareIcpImageForOcr(aqxPendingIcpFile);
    aqxIcpSetStatus('Scanning ICP screenshot... keep this page open.');
    const result = await T.recognize(ocrTarget, 'eng', { logger:m => { if(m && m.status){ aqxIcpSetStatus('Scanning: ' + m.status + (m.progress ? ' ' + Math.round(m.progress*100) + '%' : '')); } } });
    const rawText = ((result && result.data && result.data.text) || '').trim();
    const cleanedText = aqxCleanOcrText(rawText);
    setVal('aqxIcpImportText', cleanedText || rawText);
    if(!cleanedText && !rawText){
      aqxIcpSetStatus('No readable text was detected. Try a sharper/cropped screenshot or paste the ICP text.', 'warn');
      return;
    }
    aqxParseIcpText(cleanedText || rawText, {source:'scan'});
  }catch(err){
    console.error(err);
    aqxClearIcpImportResults({clearForm:true});
    aqxIcpSetStatus((err && err.message) ? err.message : 'OCR failed. Paste ICP report text instead.', 'warn');
  }
}
function aqxParseIcpTextFromBox(){
  aqxParseIcpText(val('aqxIcpImportText'));
}
function aqxFillDemoIcpImport(){
  const demo = `Triton ICP-OES Report\nDate 09/05/2026\nAlkalinity 8.3 dKH OK\nCalcium 430 ppm OK\nMagnesium 1360 ppm OK\nNitrate 8.2 ppm OK\nPhosphate 0.05 ppm OK\nPotassium 392 ppm LOW\nIodine 0.04 ppm LOW\nStrontium 7.9 ppm OK\nIron 0.001 ppm OK`;
  setVal('aqxIcpImportText', demo);
  aqxParseIcpText(demo);
}
function aqxDetectIcpLab(text){
  const t = String(text||'').toLowerCase();
  if(/\btriton\b|core7|icp[-\s]?oes|applied reef bioscience/.test(t)) return 'Triton';
  if(/fauna\s+marin|reef\s+icp|reef\s+power|faunamarin/.test(t)) return 'Fauna Marin';
  if(/\bati\b|ati\s+lab|ati\s+icp/.test(t)) return 'ATI';
  if(/coral\s+essentials|sustainable\s+reefs/.test(t)) return 'Coral Essentials';
  // IMPORTANT: never fall back to the previous form value here.
  // Otherwise every new scan can incorrectly inherit the last provider, e.g. ATI.
  return 'Unknown ICP Lab';
}
function aqxDetectIcpDate(text){
  const t = String(text||'');
  const m = t.match(/(\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b)|(\b\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}\b)/);
  if(!m) return val('icpDate') || new Date().toISOString().slice(0,10);
  const raw = m[0].replace(/[.]/g,'/').replace(/-/g,'/');
  const parts = raw.split('/');
  if(parts[0].length === 4) return `${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
  let y = parts[2].length === 2 ? '20'+parts[2] : parts[2];
  return `${y}-${String(parts[1]).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`;
}
function aqxCleanOcrText(text){
  const raw = String(text||'');
  return raw
    .replace(/[|]/g,' ')
    .replace(/([A-Za-z])\s*[:=]\s*/g,'$1 ')
    .split(/\n|\r/)
    .map(x => x.replace(/\s+/g,' ').trim())
    .filter(Boolean)
    .filter(line => /\d/.test(line) || /(triton|fauna|ati|icp|calcium|magnesium|alk|alkalinity|nitrate|phosphate|potassium|iodine|strontium|iron|boron|barium|zinc|copper|salinity|silicate|ph\b)/i.test(line))
    .join('\n');
}
function aqxNormaliseNumber(x){
  if(x == null) return '';
  return String(x).replace(',', '.').replace(/[<>]/g,'').trim();
}
function aqxInferIcpStatus(key, value, textLine){
  const line = String(textLine||'').toLowerCase();
  if(/\b(low|deficient|below)\b/.test(line)) return 'low';
  if(/\b(high|elevated|above)\b/.test(line)) return 'high';
  if(/\b(watch|warning|caution)\b/.test(line)) return 'watch';
  const n = parseFloat(aqxNormaliseNumber(value));
  const r = AQX_ICP_RANGES[key];
  if(!isFinite(n) || !r) return 'ok';
  if(n < r[0]) return 'low';
  if(n > r[1]) return 'high';
  return 'ok';
}
function aqxDetectUnit(key, line){
  const l = String(line||'');
  if(/µg\/l|ug\/l|μg\/l/i.test(l)) return 'µg/L';
  if(/mg\/l/i.test(l)) return 'mg/L';
  if(/ppm/i.test(l)) return 'ppm';
  if(/ppt/i.test(l)) return 'ppt';
  if(/dkh|dKH/.test(l)) return 'dKH';
  return (AQX_ICP_RANGES[key] && AQX_ICP_RANGES[key][2]) || '';
}
function aqxParseIcpText(text, opts={}){
  text = String(text||'').trim();
  const source = opts.source || aqxIcpImportSource || 'manual';
  // Start every import clean so old demo/provider/notes cannot leak into the next scan.
  if(source === 'scan' || source === 'manual'){ aqxClearIcpImportResults({clearForm:true, clearImportMeta:true}); }
  if(!text){ aqxClearIcpImportResults({clearForm: source === 'scan', clearImportMeta: source === 'scan'}); aqxIcpSetStatus('Paste ICP text or upload a screenshot first.', 'warn'); return; }
  const found = new Map();
  const lines = text.split(/\n|\r|;/).map(x => x.trim()).filter(Boolean);
  const all = lines.concat(text.replace(/\s+/g,' '));
  Object.keys(AQX_ICP_PARAM_ALIASES).forEach(key => {
    const aliases = AQX_ICP_PARAM_ALIASES[key];
    for(const line of all){
      for(const a of aliases){
        const safe = a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const isSymbol = /^[a-z]{1,2}$/i.test(a);
        const symbolGuard = isSymbol ? '(?:\\(|\\[|\\b|^)' : '(?:^|\\b)';
        const re = new RegExp(symbolGuard+safe+'(?:\\)|\\]|\\b|\\s|:|=|-)\\s*[:=\\-]?\\s*(<|>)?\\s*(-?\\d+(?:[.,]\\d+)?)\\s*(ppm|ppt|mg\\/l|ug\\/l|µg\\/L|μg\\/L|dKH)?','i');
        const m = line.match(re);
        // Avoid false positives from messy OCR where single-letter element symbols appear inside random words.
        if(m && isSymbol && !new RegExp('(?:^|[^a-zA-Z])'+safe+'(?:[^a-zA-Z]|$)','i').test(line)) continue;
        if(m && !found.has(key)){
          const value = aqxNormaliseNumber((m[1]||'') + m[2]);
          found.set(key, {name:AQX_ICP_LABELS[key]||key, value, unit:m[3]||aqxDetectUnit(key,line), status:aqxInferIcpStatus(key,value,line)});
          break;
        }
      }
      if(found.has(key)) break;
    }
  });
  const params = Array.from(found.values());
  if(!params.length){
    aqxClearIcpImportResults({clearForm: source === 'scan', clearImportMeta: source === 'scan'});
    const msg = source === 'scan'
      ? 'No usable ICP values detected from this image. Try cropping closer to the results table, use a sharper screenshot, or paste the report text.'
      : 'No reef parameters detected. Try pasting clearer text with parameter names and values.';
    aqxIcpSetStatus(msg, 'warn');
    return;
  }
  const detectedLab = aqxDetectIcpLab(text);
  setVal('icpLab', detectedLab === 'Unknown ICP Lab' ? '' : detectedLab);
  setVal('icpDate', aqxDetectIcpDate(text));
  setVal('icpNotes', `${detectedLab === 'Unknown ICP Lab' ? 'Imported from ICP screenshot/text' : 'Imported from '+detectedLab+' screenshot/text'}. Review values before saving.`);
  const box = el('icpParameterBuilder');
  if(box) box.innerHTML = '';
  params.forEach(p => addIcpParameterRow(p.name, p.value, p.unit, p.status));
  aqxRenderIcpImportReview(params, source);
  const sourceLabel = source === 'scan' ? 'from screenshot' : source === 'demo' ? 'from demo data' : 'from pasted text';
  aqxIcpSetStatus(`Imported ${params.length} ICP parameters ${sourceLabel}. Review the form, then tap Save ICP Test.`, 'ok');
  const form = el('icpParameterBuilder');
  if(form) form.scrollIntoView({behavior:'smooth', block:'center'});
}
function aqxRenderIcpImportReview(params, source='manual'){
  const box = el('aqxIcpImportReview');
  if(!box) return;
  box.style.display = 'grid';
  const label = source === 'scan' ? 'Detected from screenshot' : source === 'demo' ? 'Demo ICP data loaded' : 'Detected from pasted text';
  box.innerHTML = `<strong>${label}: ${params.length} parameters</strong><div>${params.slice(0,18).map(p => `<span class="${p.status}">${p.name}: ${p.value} ${p.unit || ''} · ${String(p.status).toUpperCase()}</span>`).join('')}</div><small>Always review results before saving. For screenshots, crop close to the ICP results table for best accuracy.</small>`;
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
  const title = item.name || trackerMeta(kind).timeline;
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
const AQX_FIREBASE_BUILD = "cloud-reminders-fixed-20260507f";
const aqxCloudStoragePrefix = "aquoraxCloudBackups:";
const aqxCloudSessionKey = "aquoraxCloudSession";
let aqxCloudBackupTimer = null;
let aqxCloudRestoring = false;
let aqxSavingTimer = null;
let aqxFirebaseApp = null;
let aqxFirebaseAuth = null;
let aqxFirebaseDb = null;
let aqxFirebaseMessaging = null;
let aqxFirebaseReady = false;
let aqxFirebaseAuthBooted = false;

const aqxFirebaseConfig = {
  apiKey: "AIzaSyDwlhhGnZcQRwIxOSQgS8keYyKcsbvYZHU",
  authDomain: "aquoraxapp.firebaseapp.com",
  projectId: "aquoraxapp",
  storageBucket: "aquoraxapp.firebasestorage.app",
  messagingSenderId: "346111843196",
  appId: "1:346111843196:web:e7ddca8a9cf95163b6a2f9",
  measurementId: "G-YYJETWQE2E"
};

function aqxInitFirebase(){
  try{
    if(!window.firebase){ aqxSetLoginMessage("Firebase SDK not loaded yet. Check internet connection and refresh."); return false; }
    if(!aqxFirebaseApp){ aqxFirebaseApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(aqxFirebaseConfig); }
    aqxFirebaseAuth = firebase.auth();
    aqxFirebaseDb = firebase.firestore();
    try{ if(firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()){ aqxFirebaseMessaging = firebase.messaging(); } }catch(e){ aqxFirebaseMessaging = null; }
    try{ aqxFirebaseDb.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
    aqxFirebaseReady = true;
    if(!aqxFirebaseAuthBooted){
      aqxFirebaseAuthBooted = true;
      aqxFirebaseAuth.onAuthStateChanged(function(user){
        if(user){ aqxSetSessionFromFirebase(user);
      try{ aqxUnlockCloudGate(); }catch(e){} }
        else { localStorage.removeItem(aqxCloudSessionKey); document.body.classList.remove("aqxLoggedIn"); aqxRefreshLoginState(); }
      });
    }
    return true;
  }catch(e){
    console.warn("AquoraX Firebase init failed", e);
    aqxSetLoginMessage("Firebase could not start. Refresh once, then try again. Build: "+AQX_FIREBASE_BUILD);
    return false;
  }
}


async function aqxEnsureFirestoreUser(user){
  try{
    if(!user || !aqxFirebaseDb) return;
    const userRef = aqxFirebaseDb.collection("users").doc(user.uid);
    await userRef.set({
      uid:user.uid,
      email:String(user.email||"").toLowerCase(),
      createdAt:(new Date()).toISOString(),
      lastLoginAt:(new Date()).toISOString(),
      notificationsEnabled: (typeof Notification !== "undefined" && Notification.permission==="granted")
    }, {merge:true});
  }catch(e){
    console.warn("Could not create Firestore user document", e);
  }
}

function aqxCloudUser(){
  try{
    const fbUser = aqxFirebaseAuth && aqxFirebaseAuth.currentUser;
    if(fbUser) return {uid:fbUser.uid,email:String(fbUser.email||"").toLowerCase(),signedInAt:new Date().toISOString(),provider:"firebase"};
    return JSON.parse(localStorage.getItem(aqxCloudSessionKey) || "null");
  }catch(e){return null;}
}
function aqxCloudUid(){ const u=aqxCloudUser(); return u && u.uid ? String(u.uid) : ""; }
function aqxCloudEmail(){ const u=aqxCloudUser(); return u && u.email ? String(u.email).toLowerCase() : ""; }
function aqxSetLoginMessage(msg){ const n=el("aqxLoginMessage"); if(n) n.textContent=msg; }
function aqxCloudDocRef(){
  if(!aqxFirebaseReady || !aqxFirebaseDb || !aqxCloudUid()) return null;
  return aqxFirebaseDb.collection("users").doc(aqxCloudUid()).collection("backups").doc("main");
}
function aqxForceSignedInUiAfterLogin(){
  try{
    document.body.classList.add("aqxLoggedIn");

    const loginScreen = el("aqxLoginScreen");
    if(loginScreen) loginScreen.classList.remove("show");

    // AquoraX is reef-only now, so first sign-in should not stall on old tank-type choices.
    if(!localStorage.getItem("aquoraxTankType")) localStorage.setItem("aquoraxTankType", "reef");
    if(!localStorage.getItem("aquoraxWelcomeTank")) localStorage.setItem("aquoraxWelcomeTank", "reef");

    // First login should behave like the app has unlocked, not like the account failed.
    localStorage.setItem("aquoraxWelcomeSeen", "yes");
    const welcome = el("welcomeScreen");
    if(welcome) welcome.style.display = "none";

    aqxRefreshLoginState();

    try{ openPage(localStorage.getItem("aquoraxCurrentPage") || "home"); }catch(e){
      try{ openPage("home"); }catch(err){}
    }

    const overlay = el("aqxSavingOverlay");
    if(overlay){
      setTimeout(function(){ overlay.classList.remove("show"); }, 950);
    }

    setTimeout(function(){
      aqxRefreshLoginState();
      aqxUpdateCloudStatus("Signed in to AquoraX Cloud.");
      try{ openPage(localStorage.getItem("aquoraxCurrentPage") || "home"); }catch(e){}
    }, 300);
  }catch(e){
    console.warn("AquoraX signed-in UI refresh skipped", e);
  }
}

async function aqxSetSessionFromFirebase(user){
  if(!user) return;
  await aqxEnsureFirestoreUser(user);
  localStorage.setItem(aqxCloudSessionKey, JSON.stringify({uid:user.uid,email:String(user.email||"").toLowerCase(),signedInAt:new Date().toISOString(),provider:"firebase"}));
  
  try{ aqxDismissLoginGateAfterConfirmedCloudUser(); }catch(e){}
document.body.classList.add("aqxLoggedIn");
  aqxUpdateCloudStatus("Signed in. Checking cloud backup…");
  aqxForceSignedInUiAfterLogin();
  try{ aqxUnlockCloudGate(); }catch(e){}
  aqxAutoRestoreOnLogin();
  aqxQueueCloudBackup("login");
  aqxRefreshLoginState();
  aqxForceSignedInUiAfterLogin();
}
async function aqxCreateAccount(){
  const email=val("aqxLoginEmail").trim().toLowerCase();
  const password=val("aqxLoginPassword");
  if(!email || !email.includes("@")){ aqxSetLoginMessage("Add a valid email address first."); return; }
  if(!password || password.length < 6){ aqxSetLoginMessage("Use a password with at least 6 characters."); return; }
  if(!aqxInitFirebase()) return;
  try{
    aqxShowSaving("Creating account…","Setting up your AquoraX cloud space.","Account ready ✅");
    const cred = await aqxFirebaseAuth.createUserWithEmailAndPassword(email,password);
    aqxSetSessionFromFirebase(cred.user);
    try{ aqxDismissLoginGateAfterConfirmedCloudUser(); }catch(e){}
    await aqxDoCloudBackup("account created");
    aqxSetLoginMessage("Account created and cloud backup started.");
  }catch(e){
    console.warn(e);
    aqxSetLoginMessage((e && e.message) ? e.message : "Could not create account.");
  }
}
async function aqxSignIn(){
  const email=val("aqxLoginEmail").trim().toLowerCase();
  const password=val("aqxLoginPassword");
  if(!email || !password){ aqxSetLoginMessage("Enter your email and password."); return; }
  if(!aqxInitFirebase()) return;
  try{
    aqxShowSaving("Signing in…","Connecting to AquoraX Cloud.","Signed in ✅");
    const cred = await aqxFirebaseAuth.signInWithEmailAndPassword(email,password);
    aqxSetSessionFromFirebase(cred.user);
    try{ aqxDismissLoginGateAfterConfirmedCloudUser(); }catch(e){}
  }catch(e){
    console.warn(e);
    aqxSetLoginMessage((e && e.message) ? e.message : "Could not sign in.");
  }
}
async function aqxSignOut(){
  if(!confirm("Sign out of AquoraX Cloud on this device?")) return;
  try{ if(aqxFirebaseAuth) await aqxFirebaseAuth.signOut(); }catch(e){}
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
  return {version:"AquoraXFirebaseCloudV1", savedAt:new Date().toISOString(), email:aqxCloudEmail(), uid:aqxCloudUid(), data:data};
}
async function aqxDoCloudBackup(reason="autosave"){
  if(!aqxCloudEmail() || aqxCloudRestoring) return;
  if(!aqxInitFirebase()) return;
  const ref=aqxCloudDocRef(); if(!ref) return;
  const payload=aqxBuildBackupPayload();
  try{
    await ref.set(payload, {merge:true});
    localStorage.setItem("aquoraxLastCloudBackup", payload.savedAt);
    aqxUpdateCloudStatus(`Cloud backup: ${new Date(payload.savedAt).toLocaleString()} · ${reason}`);
  }catch(e){
    console.warn("Cloud backup failed",e);
    aqxUpdateCloudStatus("Cloud backup failed. Local save is still safe.");
  }
}
function aqxQueueCloudBackup(reason="change"){
  if(!aqxCloudEmail() || aqxCloudRestoring) return;
  clearTimeout(aqxCloudBackupTimer);
  aqxUpdateCloudStatus("Saving changes to cloud queue…");
  aqxCloudBackupTimer=setTimeout(()=>{ aqxDoCloudBackup(reason); }, 1400);
}
function aqxRestorePayload(payload){
  if(!payload || !payload.data) return false;
  aqxCloudRestoring=true;
  Object.keys(payload.data).forEach(k=>{ if(typeof payload.data[k] === "string") localStorage.setItem(k,payload.data[k]); });
  aqxCloudRestoring=false;
  return true;
}
async function aqxFetchCloudPayload(){
  if(!aqxInitFirebase()) return null;
  const ref=aqxCloudDocRef(); if(!ref) return null;
  const snap=await ref.get();
  return snap.exists ? snap.data() : null;
}
async function aqxAutoRestoreOnLogin(){
  if(!aqxCloudEmail()) return;
  try{
    const payload=await aqxFetchCloudPayload(); if(!payload) return;
    const localLast=localStorage.getItem("aquoraxLastCloudBackup") || "";
    const localEmpty=!localStorage.getItem("aquoraxWelcomeSeen") && !localStorage.getItem("aquoraxDosingProducts") && !localStorage.getItem("aquoraxCycleHistory");
    if(localEmpty || (payload.savedAt && payload.savedAt > localLast)){
      aqxRestorePayload(payload);
      localStorage.setItem("aquoraxLastCloudBackup", payload.savedAt || new Date().toISOString());
      aqxUpdateCloudStatus("Cloud backup restored automatically.");
      setTimeout(()=>location.reload(), 700);
    }
  }catch(e){ console.warn(e); aqxUpdateCloudStatus("Cloud restore skipped. Local data is still safe."); }
}
async function aqxManualBackup(){ aqxShowSaving("Backing up…","Saving your latest AquoraX data to Firebase.","Cloud backup complete ✅"); await aqxDoCloudBackup("manual"); }
async function aqxManualRestore(){
  if(!aqxCloudEmail()) return;
  if(!confirm("Restore your latest cloud backup? This will refresh the app.")) return;
  aqxShowSaving("Restoring…","Loading your AquoraX cloud backup from Firebase.","Restore complete ✅");
  try{
    const payload=await aqxFetchCloudPayload();
    if(!payload){ alert("No cloud backup found yet."); return; }
    aqxRestorePayload(payload);
    localStorage.setItem("aquoraxLastCloudBackup", payload.savedAt || new Date().toISOString());
    setTimeout(()=>location.reload(), 900);
  }catch(e){ console.warn(e); alert("Could not restore backup."); }
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
  if(status) status.textContent=msg || (email ? (last ? "Cloud backup: " + new Date(last).toLocaleString() : "Connected. Next save will create a cloud backup.") : "Not connected.");
  const settings=el("aqxSettingsCloudStatus");
  if(settings) settings.textContent=status ? status.textContent : "Cloud status unavailable.";
}

document.addEventListener("DOMContentLoaded", function(){
  aqxInitFirebase();
  setTimeout(aqxRefreshLoginState, 250);
  setTimeout(aqxUpdateCloudStatus, 900);
});
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
    const aqxSafeBg=String(s.customBg).replace(/\\/g,"\\\\").replace(/"/g,'\\"');
    document.documentElement.style.setProperty("--aqxCustomBg", `url("${aqxSafeBg}")`);
    document.body.classList.add("aqxCustomBgActive");
  }else{
    document.documentElement.style.removeProperty("--aqxCustomBg");
    document.body.classList.remove("aqxCustomBgActive");
  }
  aqxSyncCustomControls();
  aqxRenderAIGuidance();
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
  if(!file.type || !file.type.startsWith("image/")){ alert("Please choose an image file."); return; }
  const reader=new FileReader();
  reader.onload=function(){
    const raw=reader.result;
    const saveBg=function(dataUrl){
      const s=aqxGetCustomSettings();
      s.customBg=dataUrl;
      aqxSaveCustomSettings(s);
      aqxApplyCustomSettings();
      setTimeout(aqxApplyCustomSettings,80);
    };
    const img=new Image();
    img.onload=function(){
      try{
        const maxSide=1800;
        let w=img.naturalWidth||img.width;
        let h=img.naturalHeight||img.height;
        if(w>maxSide || h>maxSide){
          const scale=Math.min(maxSide/w,maxSide/h);
          w=Math.round(w*scale); h=Math.round(h*scale);
        }
        const canvas=document.createElement("canvas");
        canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext("2d");
        ctx.drawImage(img,0,0,w,h);
        saveBg(canvas.toDataURL("image/jpeg",0.86));
      }catch(e){
        saveBg(raw);
      }
    };
    img.onerror=function(){
      alert("That image format could not be used as a background. Try a JPG or PNG image.");
    };
    img.src=raw;
  };
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
  localStorage.removeItem("aquoraxCleanNavV6DosingLockedApplied");
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
  return {visibleStandard, custom:[], icpMonitored:[], pinned:[], globalTileStyle:"default", globalTileSize:"standard", colour1:"#081827", colour2:"#040c16", borderColour:"#00c8ff", textColour:"#ffffff"};
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
    saved.colour1=saved.colour1||defaults.colour1;
    saved.colour2=saved.colour2||defaults.colour2;
    saved.borderColour=saved.borderColour||defaults.borderColour;
    saved.textColour=saved.textColour||defaults.textColour;
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
    const key = aqxActiveScopedStorageKey("aquoraxParameterTests");
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  }catch(e){
    return [];
  }
}

function saveParameterTests(tests){
  localStorage.setItem(aqxActiveScopedStorageKey("aquoraxParameterTests"), JSON.stringify(tests || []));
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
    tankId: (window.aqxGetActiveTank ? window.aqxGetActiveTank().id : "tank_main"),
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
  if(value === undefined || value === null || value === "") return {text:"No data", cls:"paramStatusNone", cardCls:"paramCardNone", level:"none"};
  if(def && def.icp){
    const data = latestMergedParameters();
    const st = data.values[def.key + "__status"] || "ok";
    if(st === "ok") return {text:"Healthy", cls:"paramStatusGood", cardCls:"paramCardGood", level:"good"};
    if(st === "watch") return {text:"Warning", cls:"paramStatusWatch", cardCls:"paramCardWatch", level:"watch"};
    return {text:"Urgent", cls:"paramStatusBad", cardCls:"paramCardBad", level:"bad"};
  }
  if(def.min === null || def.max === null || def.min === undefined || def.max === undefined || Number.isNaN(Number(def.min)) || Number.isNaN(Number(def.max))){
    return {text:"Tracking", cls:"paramStatusActive", cardCls:"paramCardActive", level:"active"};
  }
  if(value >= def.min && value <= def.max) return {text:"Healthy", cls:"paramStatusGood", cardCls:"paramCardGood", level:"good"};

  const nearLow = value < def.min && value >= def.min * 0.85;
  const nearHigh = value > def.max && value <= def.max * 1.18;

  if(nearLow || nearHigh) return {text:"Warning", cls:"paramStatusWatch", cardCls:"paramCardWatch", level:"watch"};
  return {text:"Urgent", cls:"paramStatusBad", cardCls:"paramCardBad", level:"bad"};
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
      <div class="paramLiveCard ${aqxTileClass(def)} ${status.cardCls || ''}" onclick="openPage('graphs')">
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

function aqxHexToRgb(hex){
  hex=String(hex||"#00c8ff").replace("#","");
  if(hex.length===3) hex=hex.split("").map(c=>c+c).join("");
  const n=parseInt(hex,16);
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function aqxHexToRgba(hex,alpha){
  const c=aqxHexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}
function aqxApplyHomeParamColours(){
  const prefs=aqxGetHomeParameterPrefs();
  const root=document.documentElement;
  const c1=aqxHexToRgb(prefs.colour1||"#081827"), c2=aqxHexToRgb(prefs.colour2||"#040c16");
  root.style.setProperty("--aqxHomeParamBoxColour", prefs.colour1||"#081827");
  root.style.setProperty("--aqxHomeParamBoxColour2", prefs.colour2||"#040c16");
  root.style.setProperty("--aqxHomeParamBoxRgb", `${c1.r},${c1.g},${c1.b}`);
  root.style.setProperty("--aqxHomeParamBoxRgb2", `${c2.r},${c2.g},${c2.b}`);
  root.style.setProperty("--aqxHomeParamBoxBorderColour", aqxHexToRgba(prefs.borderColour||"#00c8ff", .36));
  root.style.setProperty("--aqxHomeParamBoxGlowColour", aqxHexToRgba(prefs.borderColour||"#00c8ff", .24));
  root.style.setProperty("--aqxHomeParamBoxTextColour", prefs.textColour||"#ffffff");
}
function aqxSetHomeParamColours(){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.colour1=(el("aqxHomeParamColour1")||{}).value||prefs.colour1||"#081827";
  prefs.colour2=(el("aqxHomeParamColour2")||{}).value||prefs.colour2||"#040c16";
  prefs.borderColour=(el("aqxHomeParamBorderColour")||{}).value||prefs.borderColour||"#00c8ff";
  prefs.textColour=(el("aqxHomeParamTextColour")||{}).value||prefs.textColour||"#ffffff";
  aqxSaveHomeParameterPrefs(prefs);
  aqxApplyHomeParamColours();
  aqxRenderHomeColourPresets();
}
function aqxSetHomeParamPreset(c1,c2,b,t){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.colour1=c1; prefs.colour2=c2; prefs.borderColour=b; prefs.textColour=t||"#ffffff";
  aqxSaveHomeParameterPrefs(prefs);
  aqxApplyHomeParamColours();
  aqxRenderHomeLayoutCustomiser();
}
function aqxResetHomeParamColours(){
  const prefs=aqxGetHomeParameterPrefs();
  prefs.colour1="#081827"; prefs.colour2="#040c16"; prefs.borderColour="#00c8ff"; prefs.textColour="#ffffff";
  aqxSaveHomeParameterPrefs(prefs);
  aqxApplyHomeParamColours();
  aqxRenderHomeLayoutCustomiser();
}
function aqxRenderHomeColourPresets(){
  const box=el("aqxHomeColourPresets");
  if(!box) return;
  const prefs=aqxGetHomeParameterPrefs();
  const presets=[
    ["Aqua","#081827","#040c16","#00c8ff","#ffffff"],
    ["Deep Blue","#071b3a","#030916","#2b8cff","#ffffff"],
    ["Reef Purple","#24113a","#0c0616","#b768ff","#ffffff"],
    ["Coral Gold","#2b1d08","#0f0902","#ffd36a","#fff4d6"],
    ["Emerald","#09261f","#03120e","#37f5a2","#edfff8"],
    ["Ruby","#2b0912","#110307","#ff4d7d","#fff0f4"],
    ["Ice","#dff7ff","#83dfff","#00c8ff","#00111f"],
    ["Slate","#151c24","#070b10","#7aa7c7","#ffffff"]
  ];
  box.innerHTML=presets.map(([name,c1,c2,b,t])=>{
    const active=(prefs.colour1===c1 && prefs.colour2===c2 && prefs.borderColour===b && prefs.textColour===t);
    return `<button class="aqxColourPreset ${active?"active":""}" title="${name}" style="background:linear-gradient(135deg,${c1},${c2});border-color:${b};" onclick="aqxSetHomeParamPreset('${c1}','${c2}','${b}','${t}')"></button>`;
  }).join("");
}
function aqxRenderHomeLayoutCustomiser(){
  const box=el("aqxHomeLayoutList");
  const styleBox=el("aqxHomeStyleButtons");
  const sizeBox=el("aqxHomeSizeButtons");
  const prefs=aqxGetHomeParameterPrefs();
  [["aqxHomeParamColour1",prefs.colour1||"#081827"],["aqxHomeParamColour2",prefs.colour2||"#040c16"],["aqxHomeParamBorderColour",prefs.borderColour||"#00c8ff"],["aqxHomeParamTextColour",prefs.textColour||"#ffffff"]].forEach(([id,v])=>{const input=el(id); if(input) input.value=v;});
  aqxApplyHomeParamColours();
  aqxRenderHomeColourPresets();
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



/* AquoraX AI Guidance Brain - offline, safe, no API key needed */
function aqxReadStoredArray(key){
  try{const x=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(x)?x:[];}catch(e){return [];}
}
function aqxGuidanceLatestTests(){
  return (typeof getParameterTests === "function" ? getParameterTests() : []).slice(-6);
}
function aqxGuidanceDaysOld(dateStr){
  if(!dateStr) return null;
  const t=new Date(dateStr+"T12:00:00").getTime();
  if(Number.isNaN(t)) return null;
  return Math.max(0,Math.floor((Date.now()-t)/86400000));
}
function aqxGuidanceTrend(tests,key){
  const vals=tests.map(t=>typeof t[key]==="number"?t[key]:null).filter(v=>v!==null);
  if(vals.length<2) return "steady";
  const first=vals[0], last=vals[vals.length-1];
  const delta=last-first;
  if(Math.abs(delta)<0.02) return "steady";
  return delta>0?"rising":"falling";
}
function aqxBuildGuidanceBrain(){
  const type=(typeof selectedTankType==="function" ? selectedTankType() : "") || "freshwater";
  const tests=aqxGuidanceLatestTests();
  const latest=tests[tests.length-1]||null;
  const values=latest || {};
  const jobs=aqxReadStoredArray("aquoraxJobsV1");
  const done=aqxReadStoredArray("aquoraxJobsDoneV1");
  const age=latest ? aqxGuidanceDaysOld(latest.date) : null;
  const ammonia=typeof values.ammonia==="number"?values.ammonia:null;
  const nitrite=typeof values.nitrite==="number"?values.nitrite:null;
  const nitrate=typeof values.nitrate==="number"?values.nitrate:null;
  const phosphate=typeof values.phosphate==="number"?values.phosphate:null;
  const ph=typeof values.ph==="number"?values.ph:null;
  const salinity=typeof values.salinity==="number"?values.salinity:null;
  const alk=typeof values.alkalinity==="number"?values.alkalinity:null;
  const dueJobs=jobs.filter(j=>{
    const d=(j.dueDate||"");
    const today=new Date();
    const td=today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0")+"-"+String(today.getDate()).padStart(2,"0");
    return d && d<=td;
  });
  let risk="low", status="Tank guidance ready", why="AquoraX is watching your latest readings, jobs and recent maintenance history.", next="Keep logging results consistently so guidance gets more accurate.", confidence="Medium";
  let detail=[];

  if(!latest){
    risk="medium"; status="Waiting for first test"; why="There is not enough saved parameter data yet to make a confident tank read."; next="Log ammonia, nitrite, nitrate and pH first. Once saved, AquoraX will start guiding the next action."; confidence="Low";
  }else if(age!==null && age>7){
    risk="medium"; status="Data is getting old"; why="Your latest test is over a week old, so the tank may have changed since AquoraX last saw it."; next="Run a fresh water test before making dosing or livestock decisions."; confidence="Low";
  }else if(ammonia!==null && ammonia>0.2){
    risk="high"; status="Ammonia needs attention"; why="Ammonia is detectable. This can stress livestock and usually means the biofilter is not keeping up yet."; next="Retest within 24 hours, avoid adding livestock, reduce feeding, and follow your Journey guidance if the tank is still cycling."; confidence=age!==null&&age<=2?"High":"Medium";
  }else if(nitrite!==null && nitrite>0.2){
    risk="high"; status="Nitrite spike detected"; why="Nitrite is present, which commonly happens during cycling or after a filter/bacteria disruption."; next="Keep monitoring ammonia, nitrite and nitrate. Avoid livestock changes until ammonia and nitrite stay at 0."; confidence=age!==null&&age<=2?"High":"Medium";
  }else if(nitrate!==null && nitrate>50){
    risk="medium"; status="Nitrate is building"; why="Nitrate is elevated. It is less urgent than ammonia or nitrite, but it shows waste is accumulating."; next="Plan a controlled water change and check your maintenance jobs are up to date."; confidence="High";
  }else if(type==="reef" && phosphate!==null && phosphate>0.12){
    risk="medium"; status="Phosphate is high for reef"; why="Raised phosphate can fuel algae and affect coral colour or growth when it stays elevated."; next="Check feeding, filtration and recent maintenance before making sudden changes."; confidence="Medium";
  }else if(type==="reef" && alk!==null && (alk<7 || alk>11.5)){
    risk="medium"; status="Alkalinity is outside reef comfort"; why="Alkalinity stability is one of the main drivers of coral health."; next="Adjust slowly and avoid chasing numbers too quickly. Retest before dosing heavily."; confidence="Medium";
  }else if(ph!==null && (ph<6.8 || ph>8.6)){
    risk="medium"; status="pH needs watching"; why="pH is outside a comfortable range and can indicate instability, poor gas exchange or chemistry drift."; next="Retest pH and check aeration before making major corrections."; confidence="Medium";
  }else if(type==="reef" && salinity!==null && (salinity<1.023 || salinity>1.027)){
    risk="medium"; status="Salinity is drifting"; why="Reef tanks are sensitive to salinity swings, especially corals and inverts."; next="Correct salinity slowly and confirm with a calibrated refractometer if possible."; confidence="Medium";
  }else{
    risk="low"; status="Tank looks steady"; why="Your latest key readings do not show an urgent ammonia, nitrite or chemistry warning."; next="Stay consistent: keep testing, complete due jobs and watch trends rather than chasing one perfect number."; confidence=tests.length>=3?"High":"Medium";
  }

  if(dueJobs.length){
    if(risk==="low") risk="medium";
    detail.push(dueJobs.length+" job"+(dueJobs.length===1?"":"s")+" due now");
  }
  if(latest){
    detail.push("Latest test: "+(age===0?"today":(age===1?"yesterday":(age+" days ago"))));
    const nitrateTrend=aqxGuidanceTrend(tests,"nitrate");
    if(nitrateTrend==="rising") detail.push("Nitrate trend rising");
    const ammoniaTrend=aqxGuidanceTrend(tests,"ammonia");
    if(ammoniaTrend==="falling" && ammonia!==null && ammonia<=0.2) detail.push("Ammonia improving");
  }
  if(done.length) detail.push("Maintenance history active");
  return {risk,status,why,next,confidence,detail,type};
}
function aqxRenderAIGuidance(){
  const box=el("homeAiGuidanceCard");
  if(!box) return;
  const g=aqxBuildGuidanceBrain();
  const riskLabel=g.risk==="high"?"High risk":(g.risk==="medium"?"Watch closely":"Low risk");
  box.innerHTML=`
    <div class="aiGuidanceTop">
      <div>
        <div class="aiGuidanceEyebrow">AquoraX Guidance Brain</div>
        <h2>${g.status}</h2>
      </div>
      <div class="aiGuidanceRisk ${g.risk}">${riskLabel}</div>
    </div>
    <div class="aiGuidanceGrid">
      <div class="aiGuidanceBlock"><strong>Current tank read</strong><span>${g.why}</span></div>
      <div class="aiGuidanceBlock"><strong>Next best action</strong><span>${g.next}</span></div>
    </div>
    <div class="aiGuidanceMeta">
      <span class="aiGuidancePill">Confidence: ${g.confidence}</span>
      <span class="aiGuidancePill">Mode: ${g.type==="reef"?"Saltwater / Reef":"Freshwater"}</span>
      ${(g.detail||[]).slice(0,3).map(d=>`<span class="aiGuidancePill">${d}</span>`).join("")}
    </div>
    <div class="aiGuidanceActionRow">
      <button class="secondaryBtn" onclick="openPage('log')">Log New Test</button>
      <button class="secondaryBtn" onclick="openPage('jobs')">Check Jobs</button>
    </div>`;
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
    aqxApplyHomeParamColours();
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
        <div class="paramLiveCard ${aqxTileClass(def)} ${status.cardCls || ''}" onclick="openPage('graphs')">
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




// --- Split from index.html: section break ---



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


/* AquoraX Jobs - stable single-file module */
(function(){
  const JOB_KEY="aquoraxJobsV1";
  const DONE_KEY="aquoraxJobsDoneV1";
  let currentFilter="all";
  function pad(n){return String(n).padStart(2,"0");}
  function todayDate(){const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
  function nowLocalIso(){const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
  function readJobs(){try{const x=JSON.parse(localStorage.getItem(JOB_KEY)||"[]"); return Array.isArray(x)?x:[];}catch(e){return [];}}
  function writeJobs(jobs){try{localStorage.setItem(JOB_KEY,JSON.stringify(jobs||[]));}catch(e){} if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('jobs');}
  function readDone(){try{const x=JSON.parse(localStorage.getItem(DONE_KEY)||"[]"); return Array.isArray(x)?x:[];}catch(e){return [];}}
  function writeDone(items){try{localStorage.setItem(DONE_KEY,JSON.stringify((items||[]).slice(0,50)));}catch(e){} if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('jobsDone');}
  function dueDateTime(job){return new Date((job.dueDate||todayDate())+"T"+(job.dueTime||"09:00"));}
  function statusOf(job){
    const due=dueDateTime(job); const now=new Date();
    const dueDay=(job.dueDate||""); const today=todayDate();
    if(due < now && dueDay < today) return "overdue";
    if(due < now && dueDay === today) return "dueSoon";
    if(dueDay === today) return "dueToday";
    return "upcoming";
  }
  function statusLabel(s){return s==="overdue"?"Overdue":(s==="dueToday"||s==="dueSoon"?"Due Today":"Upcoming");}
  function addDays(date, days){const d=new Date(date.getTime()); d.setDate(d.getDate()+days); return d;}
  function addMonths(date, months){const d=new Date(date.getTime()); d.setMonth(d.getMonth()+months); return d;}
  function dateToInput(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
  function nextDue(job){
    const base=dueDateTime(job);
    if(job.repeat==="daily") return dateToInput(addDays(base,1));
    if(job.repeat==="weekly") return dateToInput(addDays(base,7));
    if(job.repeat==="fortnightly") return dateToInput(addDays(base,14));
    if(job.repeat==="monthly") return dateToInput(addMonths(base,1));
    return null;
  }
  function escapeHtml(v){return String(v||"").replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  window.aqxSetJobsFilter=function(filter){currentFilter=filter||"all"; aqxRenderJobs();};
  window.aqxQuickJob=function(title,cat,repeat){
    const date=el('jobDueDate'); const time=el('jobDueTime'); const name=el('jobTitle'); const category=el('jobCategory'); const rep=el('jobRepeat');
    if(name) name.value=title||''; if(category) category.value=cat||'Custom'; if(rep) rep.value=repeat||'none'; if(date) date.value=todayDate(); if(time) time.value='09:00';
  };
  window.aqxAddJob=function(){
    const title=(val('jobTitle')||'').trim();
    if(!title){alert('Add a job name first.');return;}
    const job={id:'job_'+Date.now(),title:title,category:val('jobCategory')||'Custom',dueDate:val('jobDueDate')||todayDate(),dueTime:val('jobDueTime')||'09:00',repeat:val('jobRepeat')||'none',notes:(val('jobNotes')||'').trim(),created:nowLocalIso()};
    const jobs=readJobs(); jobs.push(job); writeJobs(jobs);
    ['jobTitle','jobNotes'].forEach(id=>{const x=el(id); if(x) x.value='';});
    aqxRenderJobs(); aqxRenderHomeJobs();
    if(typeof showSavingOverlay==='function') showSavingOverlay('Job saved');
  };
  window.aqxCompleteJob=function(id){
    const jobs=readJobs(); const job=jobs.find(j=>j.id===id); if(!job) return;
    const done=readDone(); done.unshift({id:'done_'+Date.now(),title:job.title,category:job.category,completed:nowLocalIso(),notes:job.notes||'',repeat:job.repeat||'none'}); writeDone(done);
    const next=nextDue(job);
    let updated;
    if(next){updated=jobs.map(j=>j.id===id?Object.assign({},j,{dueDate:next}):j);} else {updated=jobs.filter(j=>j.id!==id);}
    writeJobs(updated); aqxRenderJobs(); aqxRenderHomeJobs();
    if(typeof showSavingOverlay==='function') showSavingOverlay(next?'Job completed — next reminder set':'Job completed');
  };
  window.aqxDeleteJob=function(id){if(!confirm('Remove this job?')) return; writeJobs(readJobs().filter(j=>j.id!==id)); aqxRenderJobs(); aqxRenderHomeJobs();};
  window.aqxClearCompletedJobs=function(){if(!confirm('Clear completed job log?')) return; writeDone([]); aqxRenderJobs();};
  window.aqxRenderJobs=function(){
    const jobs=readJobs().sort((a,b)=>dueDateTime(a)-dueDateTime(b));
    const dueToday=jobs.filter(j=>['dueToday','dueSoon'].includes(statusOf(j))).length;
    const overdue=jobs.filter(j=>statusOf(j)==='overdue').length;
    const setText=(id,t)=>{const x=el(id); if(x) x.textContent=t;};
    setText('jobsDueTodayCount',dueToday); setText('jobsOverdueCount',overdue); setText('jobsTotalCount',jobs.length);
    ['all','due','overdue'].forEach(f=>{const b=el('jobsFilter'+f.charAt(0).toUpperCase()+f.slice(1)); if(b) b.classList.toggle('active',currentFilter===f);});
    const box=el('jobsList');
    if(box){
      let view=jobs;
      if(currentFilter==='due') view=jobs.filter(j=>['dueToday','dueSoon'].includes(statusOf(j)));
      if(currentFilter==='overdue') view=jobs.filter(j=>statusOf(j)==='overdue');
      if(!view.length){box.innerHTML='<div class="jobEmpty">No jobs to show here yet.</div>';}
      else box.innerHTML=view.map(job=>{const st=statusOf(job); return '<div class="jobCard '+(st==='overdue'?'overdue':(st==='dueSoon'||st==='dueToday'?'dueSoon':''))+'"><div class="jobTop"><div><strong>'+escapeHtml(job.title)+'</strong><div class="jobMeta">'+escapeHtml(job.category)+' · Due '+escapeHtml(job.dueDate)+' '+escapeHtml(job.dueTime||'')+' · '+(job.repeat==='none'?'No repeat':escapeHtml(job.repeat))+'</div></div><span class="jobBadge '+(st==='overdue'?'overdue':(st==='dueSoon'||st==='dueToday'?'dueSoon':''))+'">'+statusLabel(st)+'</span></div>'+(job.notes?'<div class="jobNotes">'+escapeHtml(job.notes)+'</div>':'')+'<div class="jobActions"><button class="primaryBtn" onclick="aqxCompleteJob(\''+job.id+'\')">Mark Done</button><button class="dangerBtn" onclick="aqxDeleteJob(\''+job.id+'\')">Remove</button></div></div>';}).join('');
    }
    const doneBox=el('jobsDoneList');
    if(doneBox){const done=readDone().slice(0,12); doneBox.innerHTML=done.length?done.map(d=>'<div class="jobsLogItem"><strong style="color:white">'+escapeHtml(d.title)+'</strong><br>'+escapeHtml(d.category)+' · Completed '+escapeHtml((d.completed||'').replace('T',' '))+'</div>').join(''):'<div class="jobEmpty">No completed jobs yet.</div>';}
  };
  window.aqxRenderHomeJobs=function(){
    const jobs=readJobs().sort((a,b)=>dueDateTime(a)-dueDateTime(b));
    const summary=el('homeJobsSummary'); const list=el('homeJobsMiniList'); if(!summary && !list) return;
    const due=jobs.filter(j=>['overdue','dueToday','dueSoon'].includes(statusOf(j)));
    if(summary){summary.textContent=due.length?due.length+' job'+(due.length===1?'':'s')+' need attention today.':'No urgent jobs due today.';}
    if(list){list.innerHTML=due.slice(0,3).map(j=>'<div class="jobsLogItem"><strong style="color:white">'+escapeHtml(j.title)+'</strong><br>'+escapeHtml(j.category)+' · '+statusLabel(statusOf(j))+'</div>').join('') || '<div class="jobEmpty">Your maintenance schedule is clear today.</div>';}
  };
  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(function(){try{const d=el('jobDueDate'); if(d&&!d.value)d.value=todayDate(); const t=el('jobDueTime'); if(t&&!t.value)t.value='09:00'; aqxRenderHomeJobs();}catch(e){console.warn('AquoraX Jobs safe init failed',e);}},450);
  });
})();



/* AquoraX Parameter Reorder + Customiser Preview Fix */
(function(){
  function read(){try{return (typeof window.aqxGetHomeParameterPrefs==='function'?window.aqxGetHomeParameterPrefs():JSON.parse(localStorage.getItem('aquoraxHomeParameterPrefs')||'{}'))||{};}catch(e){return {};}}
  function write(p){try{if(typeof window.aqxSaveHomeParameterPrefs==='function') window.aqxSaveHomeParameterPrefs(p); else localStorage.setItem('aquoraxHomeParameterPrefs',JSON.stringify(p||{}));}catch(e){}}
  function keyOf(def){return def && def.key ? def.key : '';}
  function defs(){try{return (typeof window.aqxDefsForDisplay==='function'?window.aqxDefsForDisplay((typeof selectedTankType==='function'?selectedTankType():'freshwater')||'freshwater'):[])||[];}catch(e){return [];}}
  function applyPreviewClasses(grid,p){
    if(!grid) return;
    const style=(p.globalTileStyle||'rectangle').toLowerCase();
    const size=(p.globalTileSize||'standard').toLowerCase();
    const align=(p.align||'left').toLowerCase();
    const cols=String(p.columns||'2');
    grid.className='paramLiveGrid aqxPanelStyle-'+style+' aqxPanelSize-'+size+' aqxPanelAlign-'+align;
    grid.style.gridTemplateColumns='repeat('+Math.max(1,Math.min(3,parseInt(cols,10)||2))+',1fr)';
    grid.style.gap=(Number(p.gap)||12)+'px';
  }
  function renderPreview(){
    const grid=document.getElementById('aqxHomePanelPreviewGrid');
    if(!grid) return;
    const p=read();
    try{if(typeof window.aqxApplyHomeParamColours==='function') window.aqxApplyHomeParamColours();}catch(e){}
    applyPreviewClasses(grid,p);
    const sample=[
      {icon:'°C',label:'Temperature',value:'25.1',unit:'°C',target:'Target: 24–26 °C',status:'In range'},
      {icon:'pH',label:'pH',value:'8.2',unit:'',target:'Target: 8.1–8.4',status:'Stable'}
    ];
    grid.innerHTML=sample.map(x=>'<div class="paramLiveCard"><div class="paramLiveTop"><div class="paramIcon">'+x.icon+'</div><h3>'+x.label+'</h3></div><div class="paramValue">'+x.value+' <small>'+x.unit+'</small></div><div class="paramTarget">'+x.target+'<br>Preview only<br><span class="paramStatusGood">'+x.status+' ✅</span></div></div>').join('');
  }
  const oldOrdered=window.aqxOrderedDefs;
  window.aqxOrderedDefs=function(list){
    const p=read(); const order=Array.isArray(p.order)?p.order:[];
    const arr=(Array.isArray(list)?list.slice():[]);
    if(order.length){
      const rank=new Map(order.map((k,i)=>[k,i]));
      arr.sort((a,b)=>{
        const ra=rank.has(keyOf(a))?rank.get(keyOf(a)):9999;
        const rb=rank.has(keyOf(b))?rank.get(keyOf(b)):9999;
        if(ra!==rb) return ra-rb;
        return 0;
      });
      return arr;
    }
    return typeof oldOrdered==='function'?oldOrdered(list):arr;
  };
  function saveOrderFromDom(){
    const list=document.getElementById('aqxHomeLayoutList'); if(!list) return;
    const keys=[...list.querySelectorAll('[data-aqx-order-key]')].map(x=>x.getAttribute('data-aqx-order-key')).filter(Boolean);
    const p=read(); p.order=keys; p.pinned=[]; write(p);
    try{if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard();}catch(e){}
    renderPreview();
  }
  window.aqxMoveHomeParam=function(key,dir){
    const p=read(); const current=(Array.isArray(p.order)&&p.order.length?p.order:defs().map(keyOf));
    const i=current.indexOf(key); if(i<0) return;
    const j=Math.max(0,Math.min(current.length-1,i+dir));
    if(i===j) return;
    const item=current.splice(i,1)[0]; current.splice(j,0,item); p.order=current; p.pinned=[]; write(p);
    try{if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard();}catch(e){}
    try{window.aqxRenderHomeLayoutCustomiser();}catch(e){}
  };
  const oldRender=window.aqxRenderHomeLayoutCustomiser;
  window.aqxRenderHomeLayoutCustomiser=function(){
    try{if(typeof oldRender==='function') oldRender();}catch(e){}
    const p=read();
    const list=document.getElementById('aqxHomeLayoutList');
    if(list){
      const ordered=window.aqxOrderedDefs(defs());
      if(!ordered.length){
        list.innerHTML='<div class="homePriorityItem"><div class="homeDragText"><strong>No Home parameters visible</strong><span>Turn parameters on first.</span></div></div>';
      }else{
        list.innerHTML=ordered.map((def,i)=>{
          const key=keyOf(def);
          const src=def.source==='icp'?'ICP':def.custom?'Custom':'Standard';
          return '<div class="homePriorityItem" draggable="true" data-aqx-order-key="'+key+'"><div class="homeDragHandle" title="Hold and drag">☰</div><div class="homeDragText"><strong>'+ (def.label||key) +'</strong><span>'+src+' · '+(def.unit||'No unit')+'</span></div><span class="homeOrderBadge">'+(i+1)+'</span></div>';
        }).join('');
      }
    }
    renderPreview();
  };
  document.addEventListener('dragstart',function(e){
    const item=e.target.closest('[data-aqx-order-key]'); if(!item) return;
    item.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',item.getAttribute('data-aqx-order-key'));
  });
  document.addEventListener('dragend',function(e){const item=e.target.closest('[data-aqx-order-key]'); if(item) item.classList.remove('dragging'); saveOrderFromDom();});
  document.addEventListener('dragover',function(e){
    const list=document.getElementById('aqxHomeLayoutList'); if(!list || !e.target.closest('#aqxHomeLayoutList')) return;
    e.preventDefault(); const dragging=list.querySelector('.dragging'); if(!dragging) return;
    const items=[...list.querySelectorAll('[data-aqx-order-key]:not(.dragging)')];
    const after=items.find(el=>e.clientY < el.getBoundingClientRect().top + el.offsetHeight/2);
    if(after) list.insertBefore(dragging,after); else list.appendChild(dragging);
  });
  document.addEventListener('input',function(e){
    if(e.target && /^aqxHome/.test(e.target.id||'')) setTimeout(renderPreview,0);
  });
  document.addEventListener('click',function(e){
    if(e.target.closest('#aqxHomeStyleButtons,#aqxHomeSizeButtons,#aqxHomeColumnButtons,#aqxHomeAlignButtons,#aqxHomeColourPresets')) setTimeout(renderPreview,80);
  });
  window.aqxResetHomeParameterLayout=(function(old){return function(){
    const p=read(); delete p.order; p.pinned=[]; write(p);
    if(typeof old==='function') old();
    try{window.aqxRenderHomeLayoutCustomiser(); if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard();}catch(e){}
    renderPreview();
  };})(window.aqxResetHomeParameterLayout);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){try{window.aqxRenderHomeLayoutCustomiser(); renderPreview();}catch(e){}},700);});
})();


/* AquoraX Parameter Customiser HARD REPAIR
   Fixes: colour controls, live preview, star removal, reliable reorder controls. */
(function(){
  const PREF_KEY='aquoraxHomeParameterPrefs';
  const $=(id)=>document.getElementById(id);
  const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const slug=(v)=>String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  function hexToRgb(hex){
    hex=String(hex||'#00c8ff').replace('#','');
    if(hex.length===3) hex=hex.split('').map(c=>c+c).join('');
    const n=parseInt(hex,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
  }
  function rgba(hex,a){const c=hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`;}
  function defaults(){
    const visibleStandard={};
    try{Object.keys(parameterDefs||{}).forEach(t=>{visibleStandard[t]={}; (parameterDefs[t]||[]).forEach(d=>visibleStandard[t][d.key]=true);});}catch(e){}
    return {visibleStandard,custom:[],icpMonitored:[],pinned:[],order:[],globalTileStyle:'rectangle',globalTileSize:'standard',columns:'2',align:'left',radius:20,opacity:96,glow:20,border:22,gap:12,valueSize:36,colour1:'#081827',colour2:'#040c16',borderColour:'#00c8ff',textColour:'#ffffff'};
  }
  function read(){
    const d=defaults(); let saved={};
    try{saved=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){}
    const p=Object.assign({},d,saved);
    p.visibleStandard=Object.assign({},d.visibleStandard,saved.visibleStandard||{});
    Object.keys(d.visibleStandard).forEach(t=>{p.visibleStandard[t]=Object.assign({},d.visibleStandard[t],(saved.visibleStandard||{})[t]||{});});
    ['custom','icpMonitored','pinned','order'].forEach(k=>{p[k]=Array.isArray(saved[k])?saved[k]:[];});
    if(!p.globalTileStyle || p.globalTileStyle==='default') p.globalTileStyle='rectangle';
    if(!p.globalTileSize) p.globalTileSize='standard';
    p.columns=String(p.columns||'2'); p.align=p.align||'left';
    p.colour1=p.colour1||d.colour1; p.colour2=p.colour2||d.colour2; p.borderColour=p.borderColour||d.borderColour; p.textColour=p.textColour||d.textColour;
    return p;
  }
  function write(p){try{localStorage.setItem(PREF_KEY,JSON.stringify(Object.assign({},read(),p||{})));}catch(e){}}
  function keyOf(def){try{return (typeof aqxParamLayoutKey==='function')?aqxParamLayoutKey(def):(def.key||slug(def.label));}catch(e){return def.key||slug(def.label);}}
  function baseDefs(){
    try{const type=(typeof selectedTankType==='function'?selectedTankType():'freshwater')||'freshwater'; return (typeof aqxDefsForDisplay==='function'?aqxDefsForDisplay(type):((parameterDefs||{})[type]||[]))||[];}catch(e){return [];}
  }
  function ordered(list){
    const arr=(Array.isArray(list)?list.slice():[]); const order=read().order||[];
    if(!order.length) return arr;
    const rank=new Map(order.map((k,i)=>[k,i]));
    return arr.sort((a,b)=>{
      const ak=keyOf(a), bk=keyOf(b);
      const ai=rank.has(ak)?rank.get(ak):9999, bi=rank.has(bk)?rank.get(bk):9999;
      return ai-bi;
    });
  }
  window.aqxOrderedDefs=ordered;
  function applyCards(scope){
    const p=read();
    const root=document.documentElement;
    const c1=hexToRgb(p.colour1), c2=hexToRgb(p.colour2);
    root.style.setProperty('--aqxHomeParamBoxColour',p.colour1);
    root.style.setProperty('--aqxHomeParamBoxColour2',p.colour2);
    root.style.setProperty('--aqxHomeParamBoxRgb',`${c1.r},${c1.g},${c1.b}`);
    root.style.setProperty('--aqxHomeParamBoxRgb2',`${c2.r},${c2.g},${c2.b}`);
    root.style.setProperty('--aqxHomeParamBoxBorderColour',rgba(p.borderColour,.42));
    root.style.setProperty('--aqxHomeParamBoxGlowColour',rgba(p.borderColour,.30));
    root.style.setProperty('--aqxHomeParamBoxTextColour',p.textColour);
    root.style.setProperty('--aqxHomePanelRadius',(Number(p.radius)||20)+'px');
    root.style.setProperty('--aqxHomePanelOpacity',(Number(p.opacity)||96)/100);
    root.style.setProperty('--aqxHomePanelGlow',(Number(p.glow)||20)/100);
    root.style.setProperty('--aqxHomePanelGap',(Number(p.gap)||12)+'px');
    root.style.setProperty('--aqxHomeValueSize',(Number(p.valueSize)||36)+'px');
    const grids=[];
    if(scope) grids.push(scope); else ['homeParameterLiveGrid','aqxHomePanelPreviewGrid'].forEach(id=>{const g=$(id); if(g) grids.push(g);});
    grids.forEach(grid=>{
      grid.style.display='grid'; grid.style.gap=(Number(p.gap)||12)+'px'; grid.style.gridTemplateColumns=`repeat(${Math.max(1,Math.min(3,parseInt(p.columns)||2))},1fr)`;
      grid.querySelectorAll('.homeCardPin,.homePinBtn').forEach(x=>x.remove());
      grid.querySelectorAll('.paramLiveCard').forEach(card=>{
        card.style.background=`linear-gradient(145deg, ${rgba(p.colour1,(Number(p.opacity)||96)/100)}, ${rgba(p.colour2,(Number(p.opacity)||96)/100)})`;
        card.style.borderColor=rgba(p.borderColour,(Number(p.border)||32)/100);
        card.style.boxShadow=`0 15px 36px rgba(0,0,0,.28), 0 0 ${Math.round(12+(Number(p.glow)||20)/2)}px ${rgba(p.borderColour,(Number(p.glow)||20)/170)}`;
        card.style.color=p.textColour; card.style.textAlign=p.align||'left';
        card.style.borderRadius=(Number(p.radius)||20)+'px'; card.style.aspectRatio='auto';
        if(p.globalTileStyle==='circle'){card.style.aspectRatio='1/1'; card.style.borderRadius='999px'; card.style.display='flex'; card.style.flexDirection='column'; card.style.justifyContent='center'; card.style.alignItems='center'; card.style.textAlign='center';}
        if(p.globalTileStyle==='square'){card.style.aspectRatio='1/1'; card.style.borderRadius='10px';}
        if(p.globalTileStyle==='rounded'){card.style.borderRadius='36px';}
        if(p.globalTileStyle==='glass'){card.style.backdropFilter='blur(15px)'; card.style.background=`linear-gradient(145deg, ${rgba(p.colour1,.42)}, ${rgba(p.colour2,.34)})`;}
        if(p.globalTileStyle==='glow'){card.style.boxShadow=`0 0 42px ${rgba(p.borderColour,.40)}, inset 0 0 18px rgba(255,255,255,.035)`;}
        card.querySelectorAll('h3,.paramValue,.paramTarget,.paramIcon,small,span,strong').forEach(x=>{x.style.color=p.textColour;});
        const val=card.querySelector('.paramValue'); if(val) val.style.fontSize=(Number(p.valueSize)||36)+'px';
        const icon=card.querySelector('.paramIcon'); if(icon){icon.style.borderColor=rgba(p.borderColour,.55); icon.style.background=rgba(p.colour1,.55);}
      });
    });
  }
  window.aqxApplyHomeParamColours=function(){applyCards();};
  window.aqxApplyHomeCardControls=function(){applyCards();};
  function setColourInputs(p){[['aqxHomeParamColour1','colour1'],['aqxHomeParamColour2','colour2'],['aqxHomeParamBorderColour','borderColour'],['aqxHomeParamTextColour','textColour']].forEach(([id,k])=>{const x=$(id); if(x) x.value=p[k];});}
  function colourPresets(){
    const box=$('aqxHomeColourPresets'); if(!box) return;
    const p=read(); const presets=[['Aqua','#081827','#040c16','#00c8ff','#ffffff'],['Deep Blue','#071b3a','#030916','#2b8cff','#ffffff'],['Reef Purple','#24113a','#0c0616','#b768ff','#ffffff'],['Coral Gold','#2b1d08','#0f0902','#ffd36a','#fff4d6'],['Emerald','#09261f','#03120e','#37f5a2','#edfff8'],['Ruby','#2b0912','#110307','#ff4d7d','#fff0f4'],['Ice','#dff7ff','#83dfff','#00c8ff','#00111f'],['Slate','#151c24','#070b10','#7aa7c7','#ffffff']];
    box.innerHTML=presets.map(([name,a,b,c,t])=>`<button type="button" class="aqxColourPreset ${(p.colour1===a&&p.colour2===b&&p.borderColour===c)?'active':''}" title="${name}" style="background:linear-gradient(135deg,${a},${b});border-color:${c};" data-c1="${a}" data-c2="${b}" data-b="${c}" data-t="${t}"></button>`).join('');
  }
  window.aqxRenderHomeColourPresets=colourPresets;
  window.aqxSetHomeParamColours=function(){
    const p=read();
    p.colour1=($('aqxHomeParamColour1')||{}).value||p.colour1;
    p.colour2=($('aqxHomeParamColour2')||{}).value||p.colour2;
    p.borderColour=($('aqxHomeParamBorderColour')||{}).value||p.borderColour;
    p.textColour=($('aqxHomeParamTextColour')||{}).value||p.textColour;
    write(p); applyCards(); renderPreview(); colourPresets();
  };
  window.aqxSetHomeParamPreset=function(c1,c2,b,t){const p=read(); Object.assign(p,{colour1:c1,colour2:c2,borderColour:b,textColour:t||'#ffffff'}); write(p); setColourInputs(p); colourPresets(); applyCards(); renderPreview();};
  window.aqxResetHomeParamColours=function(){const p=read(); Object.assign(p,{colour1:'#081827',colour2:'#040c16',borderColour:'#00c8ff',textColour:'#ffffff'}); write(p); setColourInputs(p); colourPresets(); applyCards(); renderPreview();};
  function renderPreview(){
    const grid=$('aqxHomePanelPreviewGrid'); if(!grid) return;
    grid.innerHTML=`<div class="paramLiveCard"><div class="paramLiveTop"><div class="paramIcon">°C</div><h3>Temperature</h3></div><div class="paramValue">25.1 <small>°C</small></div><div class="paramTarget">Target: 24–26 °C<br>Live preview</div></div><div class="paramLiveCard"><div class="paramLiveTop"><div class="paramIcon">pH</div><h3>pH</h3></div><div class="paramValue">8.2</div><div class="paramTarget">Target: 8.1–8.4<br>Live preview</div></div>`;
    applyCards(grid);
  }
  function saveOrderFromList(){const list=$('aqxHomeLayoutList'); if(!list) return; const p=read(); p.order=[...list.querySelectorAll('[data-aqx-order-key]')].map(x=>x.dataset.aqxOrderKey).filter(Boolean); p.pinned=[]; write(p); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard();}catch(e){} applyCards(); renderPreview(); renderReorderList();}
  window.aqxMoveHomeParam=function(key,dir){const p=read(); let arr=p.order&&p.order.length?p.order.slice():ordered(baseDefs()).map(keyOf); const i=arr.indexOf(key); if(i<0) return; const j=Math.max(0,Math.min(arr.length-1,i+dir)); if(i===j) return; const v=arr.splice(i,1)[0]; arr.splice(j,0,v); p.order=arr; p.pinned=[]; write(p); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard();}catch(e){} renderReorderList(); applyCards(); renderPreview();};
  function renderReorderList(){
    const list=$('aqxHomeLayoutList'); if(!list) return;
    const defs=ordered(baseDefs());
    if(!defs.length){list.innerHTML='<div class="homePriorityItem"><div><strong>No Home parameters visible</strong><span>Turn parameters on first.</span></div></div>'; return;}
    list.innerHTML=defs.map((def,i)=>{const key=esc(keyOf(def)); return `<div class="homePriorityItem aqxReorderItem" data-aqx-order-key="${key}"><button type="button" class="homeDragHandle" aria-label="Drag to reorder">☰</button><div class="homeDragText"><strong>${esc(def.label||key)}</strong><span>${esc(def.source==='icp'?'ICP':def.custom?'Custom':'Standard')} · ${esc(def.unit||'No unit')}</span></div><div class="aqxReorderBtns"><button type="button" ${i===0?'disabled':''} onclick="aqxMoveHomeParam('${key}',-1)">↑</button><button type="button" ${i===defs.length-1?'disabled':''} onclick="aqxMoveHomeParam('${key}',1)">↓</button></div></div>`;}).join('');
  }
  const previousLayout=window.aqxRenderHomeLayoutCustomiser;
  window.aqxRenderHomeLayoutCustomiser=function(){try{if(typeof previousLayout==='function') previousLayout();}catch(e){} const p=read(); setColourInputs(p); colourPresets(); renderReorderList(); renderPreview(); applyCards();};
  document.addEventListener('click',function(e){
    const preset=e.target.closest('.aqxColourPreset[data-c1]'); if(preset){e.preventDefault(); window.aqxSetHomeParamPreset(preset.dataset.c1,preset.dataset.c2,preset.dataset.b,preset.dataset.t);}
  },true);
  document.addEventListener('input',function(e){if(e.target&&['aqxHomeParamColour1','aqxHomeParamColour2','aqxHomeParamBorderColour','aqxHomeParamTextColour'].includes(e.target.id)){window.aqxSetHomeParamColours();}},true);
  let dragItem=null;
  document.addEventListener('pointerdown',function(e){const h=e.target.closest('.homeDragHandle'); if(!h) return; const item=h.closest('[data-aqx-order-key]'); if(!item) return; dragItem=item; item.classList.add('dragging'); try{h.setPointerCapture(e.pointerId);}catch(_){ } e.preventDefault();},true);
  document.addEventListener('pointermove',function(e){if(!dragItem) return; const list=$('aqxHomeLayoutList'); if(!list) return; const items=[...list.querySelectorAll('[data-aqx-order-key]:not(.dragging)')]; const after=items.find(el=>e.clientY < el.getBoundingClientRect().top + el.offsetHeight/2); if(after) list.insertBefore(dragItem,after); else list.appendChild(dragItem);},true);
  document.addEventListener('pointerup',function(){if(!dragItem) return; dragItem.classList.remove('dragging'); dragItem=null; saveOrderFromList();},true);
  const oldRenderHome=window.renderHomeDashboard;
  if(typeof oldRenderHome==='function') window.renderHomeDashboard=function(){const out=oldRenderHome.apply(this,arguments); setTimeout(applyCards,0); return out;};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){try{window.aqxRenderHomeLayoutCustomiser(); applyCards(); renderPreview();}catch(e){console.warn('AquoraX parameter repair init',e);}},500);});
})();


/* AquoraX FINAL PARAMETER CUSTOMISER SMOOTH REPAIR
   Purpose: make the customiser preview and the real Home parameter cards use one source of truth.
   Fixes shape buttons showing stale square/circle states, colour changes not applying visibly, and janky preview refresh. */
(function(){
  const PREF_KEY = 'aquoraxHomeParameterPrefs';
  const $ = id => document.getElementById(id);
  const STYLE_OPTIONS = [['rectangle','Rectangle'],['circle','Circle'],['square','Square'],['rounded','Rounded'],['glass','Glass'],['glow','Glow']];
  const SIZE_OPTIONS = [['compact','Compact'],['standard','Standard'],['large','Large']];
  const COLUMN_OPTIONS = [['1','1'],['2','2'],['3','3']];
  const ALIGN_OPTIONS = [['left','Left'],['center','Center'],['right','Right']];
  const DEFAULTS = {globalTileStyle:'rectangle',globalTileSize:'standard',columns:'2',align:'left',radius:20,opacity:96,glow:20,border:22,gap:12,valueSize:36,colour1:'#081827',colour2:'#040c16',borderColour:'#00c8ff',textColour:'#ffffff',order:[],pinned:[]};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function hexToRgb(hex){hex=String(hex||'#00c8ff').replace('#',''); if(hex.length===3) hex=hex.split('').map(c=>c+c).join(''); const n=parseInt(hex,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
  function rgba(hex,a){const c=hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`;}
  function read(){let saved={}; try{saved=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){} const p=Object.assign({},DEFAULTS,saved); if(!p.globalTileStyle || p.globalTileStyle==='default') p.globalTileStyle='rectangle'; p.columns=String(p.columns||'2'); if(!Array.isArray(p.order)) p.order=[]; if(!Array.isArray(p.pinned)) p.pinned=[]; return p;}
  function write(p){const merged=Object.assign({},read(),p||{}); try{localStorage.setItem(PREF_KEY,JSON.stringify(merged));}catch(e){} return merged;}
  function keyOf(def){return (def&&def.key)||String((def&&def.label)||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
  function defs(){try{const type=(typeof selectedTankType==='function'?selectedTankType():'freshwater')||'freshwater'; return (typeof aqxDefsForDisplay==='function'?aqxDefsForDisplay(type):((window.parameterDefs||{})[type]||[]))||[];}catch(e){return [];}}
  function ordered(list){const p=read(); const order=p.order||[]; const rank=new Map(order.map((k,i)=>[k,i])); return (list||[]).slice().sort((a,b)=>{const ai=rank.has(keyOf(a))?rank.get(keyOf(a)):9999; const bi=rank.has(keyOf(b))?rank.get(keyOf(b)):9999; return ai-bi;});}
  window.aqxOrderedDefs = ordered;
  function syncInputs(p){
    [['aqxHomeParamColour1','colour1'],['aqxHomeParamColour2','colour2'],['aqxHomeParamBorderColour','borderColour'],['aqxHomeParamTextColour','textColour']].forEach(([id,k])=>{const x=$(id); if(x) x.value=p[k];});
    const rangeMap={radius:['aqxHomeRadiusRange','aqxHomeRadiusValue','px'],opacity:['aqxHomeOpacityRange','aqxHomeOpacityValue','%'],glow:['aqxHomeGlowRange','aqxHomeGlowValue','%'],border:['aqxHomeBorderRange','aqxHomeBorderValue','%'],gap:['aqxHomeGapRange','aqxHomeGapValue','px'],valueSize:['aqxHomeValueSizeRange','aqxHomeValueSizeValue','px']};
    Object.keys(rangeMap).forEach(k=>{const [rid,vid,s]=rangeMap[k]; const r=$(rid), v=$(vid); if(r) r.value=p[k]; if(v) v.textContent=p[k]+s;});
  }
  function buttonGrid(id, options, active, fn){const box=$(id); if(!box) return; box.innerHTML=options.map(([k,l])=>`<button type="button" class="homeStyleBtn ${String(active)===String(k)?'active':''}" data-aqx-panel-control="${fn}" data-aqx-value="${k}">${l}</button>`).join('');}
  function renderButtons(){const p=read(); buttonGrid('aqxHomeStyleButtons',STYLE_OPTIONS,p.globalTileStyle,'style'); buttonGrid('aqxHomeSizeButtons',SIZE_OPTIONS,p.globalTileSize,'size'); buttonGrid('aqxHomeColumnButtons',COLUMN_OPTIONS,p.columns,'columns'); buttonGrid('aqxHomeAlignButtons',ALIGN_OPTIONS,p.align,'align');}
  function setVars(p){const r1=hexToRgb(p.colour1), r2=hexToRgb(p.colour2); const root=document.documentElement; root.style.setProperty('--aqxHomeParamBoxColour',p.colour1); root.style.setProperty('--aqxHomeParamBoxColour2',p.colour2); root.style.setProperty('--aqxHomeParamBoxRgb',`${r1.r},${r1.g},${r1.b}`); root.style.setProperty('--aqxHomeParamBoxRgb2',`${r2.r},${r2.g},${r2.b}`); root.style.setProperty('--aqxHomeParamBoxBorderColour',rgba(p.borderColour,.42)); root.style.setProperty('--aqxHomeParamBoxGlowColour',rgba(p.borderColour,.30)); root.style.setProperty('--aqxHomeParamBoxTextColour',p.textColour); root.style.setProperty('--aqxHomePanelGap',Number(p.gap||12)+'px'); root.style.setProperty('--aqxHomeValueSize',Number(p.valueSize||36)+'px');}
  function styleCard(card,p){
    card.style.background=`linear-gradient(145deg, ${rgba(p.colour1,(Number(p.opacity)||96)/100)}, ${rgba(p.colour2,(Number(p.opacity)||96)/100)})`;
    card.style.borderColor=rgba(p.borderColour,(Number(p.border)||22)/100);
    card.style.boxShadow=`0 14px 34px rgba(0,0,0,.28), 0 0 ${Math.round(12+(Number(p.glow)||20)/2)}px ${rgba(p.borderColour,(Number(p.glow)||20)/170)}`;
    card.style.color=p.textColour; card.style.textAlign=p.align||'left'; card.style.aspectRatio='auto'; card.style.borderRadius=(Number(p.radius)||20)+'px'; card.style.display=''; card.style.flexDirection=''; card.style.justifyContent=''; card.style.alignItems='';
    if(p.globalTileStyle==='circle'){card.style.aspectRatio='1 / 1'; card.style.borderRadius='999px'; card.style.display='flex'; card.style.flexDirection='column'; card.style.justifyContent='center'; card.style.alignItems='center'; card.style.textAlign='center';}
    if(p.globalTileStyle==='square'){card.style.aspectRatio='1 / 1'; card.style.borderRadius='10px';}
    if(p.globalTileStyle==='rounded'){card.style.borderRadius='36px';}
    if(p.globalTileStyle==='glass'){card.style.backdropFilter='blur(15px)'; card.style.background=`linear-gradient(145deg, ${rgba(p.colour1,.44)}, ${rgba(p.colour2,.34)})`;}
    if(p.globalTileStyle==='glow'){card.style.boxShadow=`0 0 42px ${rgba(p.borderColour,.42)}, inset 0 0 18px rgba(255,255,255,.035)`;}
    card.querySelectorAll('h3,.paramValue,.paramTarget,.paramIcon,small,span,strong').forEach(x=>{x.style.color=p.textColour;});
    const val=card.querySelector('.paramValue'); if(val) val.style.fontSize=(Number(p.valueSize)||36)+'px';
    const icon=card.querySelector('.paramIcon'); if(icon){icon.style.borderColor=rgba(p.borderColour,.55); icon.style.background=rgba(p.colour1,.55);}
  }
  function applyAll(scope){const p=read(); setVars(p); const grids=scope?[scope]:['homeParameterLiveGrid','aqxHomePanelPreviewGrid'].map($).filter(Boolean); grids.forEach(grid=>{grid.style.display='grid'; grid.style.gridTemplateColumns=`repeat(${Math.max(1,Math.min(3,parseInt(p.columns)||2))},1fr)`; grid.style.gap=(Number(p.gap)||12)+'px'; grid.querySelectorAll('.homeCardPin,.homePinBtn').forEach(x=>x.remove()); grid.querySelectorAll('.paramLiveCard').forEach(card=>styleCard(card,p));});}
  function renderPreview(){const grid=$('aqxHomePanelPreviewGrid'); if(!grid) return; const p=read(); grid.innerHTML=`<div class="paramLiveCard"><div class="paramLiveTop"><div class="paramIcon">°C</div><h3>Temperature</h3></div><div class="paramValue">25.1 <small>°C</small></div><div class="paramTarget">Target: 24–26 °C<br>${esc(p.globalTileStyle)} preview</div></div><div class="paramLiveCard"><div class="paramLiveTop"><div class="paramIcon">pH</div><h3>pH</h3></div><div class="paramValue">8.2</div><div class="paramTarget">Target: 8.1–8.4<br>${esc(p.globalTileStyle)} preview</div></div>`; applyAll(grid);}
  function renderColourPresets(){const box=$('aqxHomeColourPresets'); if(!box) return; const p=read(); const presets=[['Aqua','#081827','#040c16','#00c8ff','#ffffff'],['Deep Blue','#071b3a','#030916','#2b8cff','#ffffff'],['Reef Purple','#24113a','#0c0616','#b768ff','#ffffff'],['Coral Gold','#2b1d08','#0f0902','#ffd36a','#fff4d6'],['Emerald','#09261f','#03120e','#37f5a2','#edfff8'],['Ruby','#2b0912','#110307','#ff4d7d','#fff0f4'],['Ice','#dff7ff','#83dfff','#00c8ff','#00111f'],['Slate','#151c24','#070b10','#7aa7c7','#ffffff']]; box.innerHTML=presets.map(([name,a,b,c,t])=>`<button type="button" class="aqxColourPreset ${(p.colour1===a&&p.colour2===b&&p.borderColour===c)?'active':''}" title="${name}" style="background:linear-gradient(135deg,${a},${b});border-color:${c};" data-c1="${a}" data-c2="${b}" data-b="${c}" data-t="${t}"></button>`).join('');}
  function renderOrder(){const list=$('aqxHomeLayoutList'); if(!list) return; const d=ordered(defs()); if(!d.length){list.innerHTML='<div class="homePriorityItem"><div><strong>No Home parameters visible</strong><span>Turn parameters on first.</span></div></div>'; return;} list.innerHTML=d.map((def,i)=>{const k=esc(keyOf(def)); return `<div class="homePriorityItem aqxReorderItem" data-aqx-order-key="${k}"><button type="button" class="homeDragHandle" aria-label="Drag to reorder">☰</button><div class="homeDragText"><strong>${esc(def.label||k)}</strong><span>${esc(def.source==='icp'?'ICP':def.custom?'Custom':'Standard')} · ${esc(def.unit||'No unit')}</span></div><div class="aqxReorderBtns"><button type="button" ${i===0?'disabled':''} onclick="aqxMoveHomeParam('${k}',-1)">↑</button><button type="button" ${i===d.length-1?'disabled':''} onclick="aqxMoveHomeParam('${k}',1)">↓</button></div></div>`;}).join('');}
  function refresh(){const p=read(); syncInputs(p); renderButtons(); renderColourPresets(); renderOrder(); renderPreview(); applyAll();}
  window.aqxSetHomeGlobalStyle=function(style){write({globalTileStyle:style||'rectangle'}); refresh(); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard(); setTimeout(applyAll,0);}catch(e){}};
  window.aqxSetHomeGlobalSize=function(size){write({globalTileSize:size||'standard'}); refresh(); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard(); setTimeout(applyAll,0);}catch(e){}};
  window.aqxSetHomePanelNumber=function(key,value){const allowed=['radius','opacity','glow','border','gap','valueSize']; if(!allowed.includes(key)) return; const patch={}; patch[key]=Number(value); write(patch); refresh();};
  window.aqxSetHomeParamColours=function(){const patch={}; [['aqxHomeParamColour1','colour1'],['aqxHomeParamColour2','colour2'],['aqxHomeParamBorderColour','borderColour'],['aqxHomeParamTextColour','textColour']].forEach(([id,k])=>{const x=$(id); if(x) patch[k]=x.value;}); write(patch); refresh();};
  window.aqxSetHomeParamPreset=function(c1,c2,b,t){write({colour1:c1,colour2:c2,borderColour:b,textColour:t||'#ffffff'}); refresh();};
  window.aqxResetHomeParamColours=function(){write({colour1:'#081827',colour2:'#040c16',borderColour:'#00c8ff',textColour:'#ffffff'}); refresh();};
  window.aqxMoveHomeParam=function(key,dir){const d=ordered(defs()).map(keyOf); const i=d.indexOf(key); if(i<0) return; const j=Math.max(0,Math.min(d.length-1,i+dir)); if(i===j) return; const item=d.splice(i,1)[0]; d.splice(j,0,item); write({order:d,pinned:[]}); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard();}catch(e){} refresh();};
  window.aqxResetHomeParameterLayout=function(){write({globalTileStyle:'rectangle',globalTileSize:'standard',columns:'2',align:'left',radius:20,opacity:96,glow:20,border:22,gap:12,valueSize:36,order:[],pinned:[]}); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard();}catch(e){} refresh();};
  const previousLayout = window.aqxRenderHomeLayoutCustomiser;
  window.aqxRenderHomeLayoutCustomiser=function(){try{if(typeof previousLayout==='function') previousLayout();}catch(e){} refresh();};
  document.addEventListener('click',function(e){
    const btn=e.target.closest('[data-aqx-panel-control]'); if(btn){e.preventDefault(); const type=btn.dataset.aqxPanelControl, val=btn.dataset.aqxValue; if(type==='style') window.aqxSetHomeGlobalStyle(val); if(type==='size') window.aqxSetHomeGlobalSize(val); if(type==='columns'){write({columns:String(val)}); refresh();} if(type==='align'){write({align:val}); refresh();} return;}
    const preset=e.target.closest('.aqxColourPreset[data-c1]'); if(preset){e.preventDefault(); window.aqxSetHomeParamPreset(preset.dataset.c1,preset.dataset.c2,preset.dataset.b,preset.dataset.t);}
  },true);
  let dragItem=null;
  document.addEventListener('pointerdown',function(e){const h=e.target.closest('.homeDragHandle'); if(!h) return; const item=h.closest('[data-aqx-order-key]'); if(!item) return; dragItem=item; item.classList.add('dragging'); e.preventDefault();},true);
  document.addEventListener('pointermove',function(e){if(!dragItem) return; const list=$('aqxHomeLayoutList'); if(!list) return; const items=[...list.querySelectorAll('[data-aqx-order-key]:not(.dragging)')]; const after=items.find(el=>e.clientY < el.getBoundingClientRect().top + el.offsetHeight/2); if(after) list.insertBefore(dragItem,after); else list.appendChild(dragItem);},true);
  document.addEventListener('pointerup',function(){if(!dragItem) return; const list=$('aqxHomeLayoutList'); dragItem.classList.remove('dragging'); dragItem=null; if(list){write({order:[...list.querySelectorAll('[data-aqx-order-key]')].map(x=>x.dataset.aqxOrderKey),pinned:[]}); try{if(typeof renderHomeDashboard==='function') renderHomeDashboard();}catch(e){} refresh();}},true);
  const oldHome=window.renderHomeDashboard; if(typeof oldHome==='function'){window.renderHomeDashboard=function(){const out=oldHome.apply(this,arguments); setTimeout(applyAll,0); return out;};}
  window.aqxApplyHomeParamColours=function(){applyAll();}; window.aqxApplyHomeCardControls=function(){applyAll();};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,250); setTimeout(refresh,900);});
  setTimeout(refresh,250);
})();

/* AQUORAX HARD FIX: force live preview shape classes and true circle rendering */
(function(){
  const PREF_KEY='aquoraxHomeParameterPrefs';
  function read(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){return {};}}
  function applyHardShapeFix(){
    const p=read();
    const style=String(p.globalTileStyle||'rectangle').toLowerCase();
    const cols=String(p.columns||'2');
    ['homeParameterLiveGrid','aqxHomePanelPreviewGrid'].forEach(id=>{
      const grid=document.getElementById(id);
      if(!grid) return;
      grid.classList.remove('aqxPanelStyle-rectangle','aqxPanelStyle-rounded','aqxPanelStyle-square','aqxPanelStyle-circle','aqxPanelStyle-glass','aqxPanelStyle-glow','aqxPanelCols-1','aqxPanelCols-2','aqxPanelCols-3');
      grid.classList.add('aqxPanelStyle-'+style,'aqxPanelCols-'+cols);
      grid.querySelectorAll('.paramLiveCard').forEach(card=>{
        card.style.removeProperty('width');
        card.style.setProperty('height','auto','important');
        card.style.setProperty('min-height','0','important');
        if(style==='circle'){
          card.style.setProperty('aspect-ratio','1 / 1','important');
          card.style.setProperty('border-radius','50%','important');
          card.style.setProperty('display','flex','important');
          card.style.setProperty('flex-direction','column','important');
          card.style.setProperty('justify-content','center','important');
          card.style.setProperty('align-items','center','important');
          card.style.setProperty('text-align','center','important');
          card.style.setProperty('overflow','hidden','important');
          card.style.setProperty('justify-self','center','important');
        } else if(style==='square'){
          card.style.setProperty('aspect-ratio','1 / 1','important');
          card.style.setProperty('border-radius','10px','important');
        } else if(style==='rectangle'){
          card.style.setProperty('aspect-ratio','auto','important');
          card.style.setProperty('border-radius',(p.radius||20)+'px','important');
        }
      });
    });
  }
  const oldSetStyle=window.aqxSetHomeGlobalStyle;
  window.aqxSetHomeGlobalStyle=function(value){
    if(typeof oldSetStyle==='function') oldSetStyle(value);
    setTimeout(applyHardShapeFix,0);
    setTimeout(applyHardShapeFix,80);
  };
  const oldRender=window.aqxRenderHomeLayoutCustomiser;
  window.aqxRenderHomeLayoutCustomiser=function(){
    if(typeof oldRender==='function') oldRender();
    setTimeout(applyHardShapeFix,0);
  };
  const oldHome=window.renderHomeDashboard;
  if(typeof oldHome==='function' && !oldHome.__aqxHardShapeFixWrapped){
    const wrapped=function(){const out=oldHome.apply(this,arguments); setTimeout(applyHardShapeFix,0); return out;};
    wrapped.__aqxHardShapeFixWrapped=true;
    window.renderHomeDashboard=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(applyHardShapeFix,200); setTimeout(applyHardShapeFix,900);});
  document.addEventListener('click',function(e){if(e.target.closest('#aqxHomeStyleButtons button')) setTimeout(applyHardShapeFix,60);},true);
})();

/* AQUORAX RESPONSIVE PARAMETER CARD SYSTEM — final override: square / circle / rectangle only */
(function(){
  const PREF_KEY='aquoraxHomeParameterPrefs';
  const SHAPES=[['rectangle','Rectangle'],['square','Square'],['circle','Circle']];
  function $(id){return document.getElementById(id);}
  function read(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){return {};}}
  function write(patch){const p=Object.assign({},read(),patch||{}); if(!['rectangle','square','circle'].includes(String(p.globalTileStyle||'').toLowerCase())) p.globalTileStyle='rectangle'; try{localStorage.setItem(PREF_KEY,JSON.stringify(p));}catch(e){} return p;}
  function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function shape(){const s=String(read().globalTileStyle||'rectangle').toLowerCase(); return ['rectangle','square','circle'].includes(s)?s:'rectangle';}
  function statusFrom(card){
    const span=card.querySelector('.paramTarget span');
    if(span) return span.textContent.trim();
    const t=(card.querySelector('.paramTarget')?.textContent||'').trim();
    if(!t) return 'Preview';
    const parts=t.split(/\n|Updated:|Target:/).map(x=>x.trim()).filter(Boolean);
    return parts[parts.length-1]||'Preview';
  }
  function cleanInline(card){
    ['width','height','min-height','aspect-ratio','border-radius','display','flex-direction','justify-content','align-items','text-align','overflow','justify-self'].forEach(p=>card.style.removeProperty(p));
    const top=card.querySelector('.paramLiveTop');
    if(top){['padding-right','justify-content','align-items','flex-direction','gap','margin','margin-bottom'].forEach(p=>top.style.removeProperty(p));}
  }
  function applyResponsiveCards(){
    const s=shape();
    const p=write({globalTileStyle:s});
    const cols=String(p.columns||'2');
    ['homeParameterLiveGrid','aqxHomePanelPreviewGrid'].forEach(id=>{
      const grid=$(id); if(!grid) return;
      grid.classList.add('aqxResponsiveParamGrid');
      grid.classList.remove('aqxResponsiveShapeRectangle','aqxResponsiveShapeSquare','aqxResponsiveShapeCircle','aqxPanelStyle-rounded','aqxPanelStyle-glass','aqxPanelStyle-glow');
      grid.classList.add('aqxResponsiveShape'+s.charAt(0).toUpperCase()+s.slice(1),'aqxPanelStyle-'+s,'aqxPanelCols-'+cols);
      grid.querySelectorAll('.homeCardPin,.homePinBtn').forEach(x=>x.remove());
      grid.querySelectorAll('.paramLiveCard').forEach(card=>{
        cleanInline(card);
        card.dataset.aqxShape=s;
        let mini=card.querySelector('.aqxParamMiniStatus');
        if(!mini){mini=document.createElement('div'); mini.className='aqxParamMiniStatus'; card.appendChild(mini);}
        mini.textContent=statusFrom(card).replace(' ✅','').replace(' ⚠️','').replace(' ❌','');
      });
    });
  }
  function renderShapeButtons(){
    const box=$('aqxHomeStyleButtons'); if(!box) return;
    const s=shape();
    box.innerHTML=SHAPES.map(([k,l])=>`<button type="button" class="homeStyleBtn ${s===k?'active aqxHomeControlActive':''}" data-aqx-panel-control="style" data-aqx-value="${k}">${l}</button>`).join('');
  }
  function renderCleanPreview(){
    const grid=$('aqxHomePanelPreviewGrid'); if(!grid) return;
    grid.innerHTML=`
      <div class="paramLiveCard">
        <div class="paramLiveTop"><div class="paramIcon">°C</div><h3>Temperature</h3></div>
        <div class="paramValue">25.1 <small>°C</small></div>
        <div class="paramTarget">Target: 24–26 °C<br>Updated: Preview only<br><span class="paramStatusGood">In range ✅</span></div>
      </div>
      <div class="paramLiveCard">
        <div class="paramLiveTop"><div class="paramIcon">pH</div><h3>pH</h3></div>
        <div class="paramValue">8.2 <small></small></div>
        <div class="paramTarget">Target: 8.1–8.4<br>Updated: Preview only<br><span class="paramStatusGood">Stable ✅</span></div>
      </div>`;
  }
  function fullRefresh(){
    renderShapeButtons();
    renderCleanPreview();
    applyResponsiveCards();
  }
  window.aqxSetHomeGlobalStyle=function(value){
    const v=['rectangle','square','circle'].includes(String(value).toLowerCase())?String(value).toLowerCase():'rectangle';
    const p=write({globalTileStyle:v});
    try{ if(typeof window.aqxApplyHomeCardControls==='function') window.aqxApplyHomeCardControls(); }catch(e){}
    try{ if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard(); }catch(e){}
    setTimeout(fullRefresh,0); setTimeout(applyResponsiveCards,90); setTimeout(applyResponsiveCards,220);
  };
  const oldCustomiser=window.aqxRenderHomeLayoutCustomiser;
  window.aqxRenderHomeLayoutCustomiser=function(){
    try{ if(typeof oldCustomiser==='function') oldCustomiser.apply(this,arguments); }catch(e){}
    setTimeout(fullRefresh,0); setTimeout(applyResponsiveCards,120);
  };
  const oldHome=window.renderHomeDashboard;
  if(typeof oldHome==='function' && !oldHome.__aqxResponsiveCardsWrapped){
    const wrapped=function(){const out=oldHome.apply(this,arguments); setTimeout(applyResponsiveCards,0); setTimeout(applyResponsiveCards,120); return out;};
    wrapped.__aqxResponsiveCardsWrapped=true;
    window.renderHomeDashboard=wrapped;
  }
  document.addEventListener('click',function(e){
    const btn=e.target.closest('#aqxHomeStyleButtons [data-aqx-panel-control="style"]');
    if(!btn) return;
    e.preventDefault(); e.stopPropagation();
    window.aqxSetHomeGlobalStyle(btn.dataset.aqxValue||'rectangle');
  },true);
  document.addEventListener('DOMContentLoaded',function(){write({globalTileStyle:shape()}); setTimeout(fullRefresh,250); setTimeout(applyResponsiveCards,900);});
  setTimeout(fullRefresh,250); setTimeout(applyResponsiveCards,900);
})();

/* AQUORAX MULTI-TANK SYSTEM — active tank + all tank overview, sidebar friendly */
(function(){
  const TANKS_KEY = 'aquoraxTanksV1';
  const ACTIVE_KEY = 'aquoraxActiveTankIdV1';
  const SCOPED_KEYS = {
    parameterTests:'aquoraxParameterTests',
    cycleHistory:'aquoraxCycleHistory',
    graphEvents:'aquoraxGraphEvents',
    doseLog:'aquoraxDoseLog',
    dosingProducts:'aquoraxDosingProducts',
    dosingHistory:'aquoraxDosingHistory',
    icpTests:'aquoraxIcpTests',
    jobs:'aquoraxJobsV1',
    jobsDone:'aquoraxJobsDoneV1',
    corals:'aquoraxTracker_corals',
    plants:'aquoraxTracker_plants',
    fish:'aquoraxFishTracker',
    algae:'aquoraxAlgaeTracker',
    inverts:'aquoraxInvertTracker'
  };
  function safeJson(raw,fallback){try{const v=JSON.parse(raw||''); return v==null?fallback:v;}catch(e){return fallback;}}
  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function uid(){return 'tank_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);}
  function typeLabel(t){return t==='reef'?'Saltwater Reef':(t==='freshwater'?'Freshwater':'Aquarium');}
  function getLegacyType(){return localStorage.getItem('aquoraxTankType') || localStorage.getItem('aquoraxWelcomeTank') || 'reef';}
  function getLegacyVolume(){return localStorage.getItem('aquoraxTankVolume') || '';}
  function readTanksRaw(){const x=safeJson(localStorage.getItem(TANKS_KEY),'__bad__'); return Array.isArray(x)?x:[];}
  function writeTanks(tanks){localStorage.setItem(TANKS_KEY, JSON.stringify(tanks||[]));}
  function ensureTanks(){
    let tanks=readTanksRaw();
    if(!tanks.length){
      const id='tank_main';
      tanks=[{id:id,name:'Main Tank',type:getLegacyType(),volume:getLegacyVolume(),createdAt:new Date().toISOString()}];
      writeTanks(tanks);
      localStorage.setItem(ACTIVE_KEY,id);
      migrateLegacyData(id);
    }
    let active=localStorage.getItem(ACTIVE_KEY);
    if(!tanks.some(t=>t.id===active)){active=tanks[0].id; localStorage.setItem(ACTIVE_KEY,active);}
    syncActiveLegacyFields();
    return tanks;
  }
  function activeTank(){const tanks=ensureTanks(); const id=localStorage.getItem(ACTIVE_KEY); return tanks.find(t=>t.id===id)||tanks[0];}
  function scopedKey(base,tankId){return base+'__'+(tankId||activeTank().id);}
  function migrateLegacyData(id){
    Object.values(SCOPED_KEYS).forEach(base=>{
      const scoped=scopedKey(base,id);
      if(localStorage.getItem(scoped)==null && localStorage.getItem(base)!=null){localStorage.setItem(scoped, localStorage.getItem(base));}
    });
  }
  function syncActiveLegacyFields(){
    const t=(readTanksRaw().find(x=>x.id===localStorage.getItem(ACTIVE_KEY))||readTanksRaw()[0]);
    if(!t) return;
    localStorage.setItem('aquoraxTankType', t.type||'reef');
    localStorage.setItem('aquoraxWelcomeTank', t.type||'reef');
    localStorage.setItem('aquoraxTankVolume', t.volume||'');
    const tankTypeSelect=document.getElementById('tankTypeSelect'); if(tankTypeSelect) tankTypeSelect.value=t.type||'reef';
    const cycleTank=document.getElementById('cycleTank'); if(cycleTank) cycleTank.value=t.type||'reef';
    const vol=document.getElementById('tankVolumeMain'); if(vol) vol.value=t.volume||'';
  }
  function latestTestFor(tankId){
    const arr=safeJson(localStorage.getItem(scopedKey(SCOPED_KEYS.parameterTests,tankId)),'__bad__');
    if(!Array.isArray(arr)||!arr.length) return null;
    return arr.slice().sort((a,b)=>String((a.date||'')+(a.time||'')).localeCompare(String((b.date||'')+(b.time||'')))).pop();
  }
  function parameterLine(test,type){
    if(!test) return '<span class="aqxTankMuted">No tests logged yet</span>';
    const keys=(type==='reef')?['temperature','salinity','ph','nitrate','phosphate']:['temperature','ph','ammonia','nitrite','nitrate'];
    const labels={temperature:'Temp',salinity:'Salinity',ph:'pH',nitrate:'NO3',phosphate:'PO4',ammonia:'NH3',nitrite:'NO2'};
    const units={temperature:'°C',salinity:'',ph:'',nitrate:'',phosphate:'',ammonia:'',nitrite:''};
    const bits=keys.filter(k=>typeof test[k]==='number').slice(0,5).map(k=>'<b>'+labels[k]+'</b> '+test[k]+units[k]);
    return bits.length?bits.join('<span class="aqxTankSep">•</span>'):'<span class="aqxTankMuted">Latest test has notes only</span>';
  }
  function tankStatus(test){
    if(!test) return {txt:'Needs first test',cls:'watch'};
    const age=Math.floor((Date.now()-new Date(test.date||Date.now()).getTime())/86400000);
    if(age>14) return {txt:'Test overdue',cls:'bad'};
    if(age>7) return {txt:'Needs test soon',cls:'watch'};
    return {txt:'Updated',cls:'good'};
  }
  function renderTankOverview(){
    ensureTanks();
    const host=document.getElementById('aqxMultiTankHome');
    if(!host) return;
    const tanks=readTanksRaw(); const activeId=localStorage.getItem(ACTIVE_KEY);
    const active=tanks.find(t=>t.id===activeId)||tanks[0];
    const latest=latestTestFor(active.id); const st=tankStatus(latest);
    const other=tanks.filter(t=>t.id!==active.id);
    host.innerHTML=`
      <div class="aqxMinimalTankHero">
        <div class="aqxMinimalTankMain">
          <span class="aqxMiniKicker">Active tank</span>
          <h2>${esc(active.name||'My Tank')}</h2>
          <p>${typeLabel(active.type)}${active.volume?' · '+esc(active.volume)+' L':''}</p>
          <div class="aqxMinimalStatus ${esc(st.cls)}">${esc(st.txt)}</div>
        </div>
        <div class="aqxMinimalTankReading">${parameterLine(latest,active.type)}</div>
        <div class="aqxMinimalTankActions">
          <button class="primaryBtn" onclick="openPage('log')">Log Test</button>
          <button class="secondaryBtn" onclick="aqxOpenTankManager()">Tanks</button>
        </div>
      </div>
      <details class="aqxHomeDisclosure aqxTankSwitcherMini">
        <summary>Switch tank or add another</summary>
        <div class="aqxActiveTankSelector">
          <label>Active Tank</label>
          <select onchange="aqxSwitchTank(this.value)">${tanks.map(t=>`<option value="${esc(t.id)}" ${t.id===activeId?'selected':''}>${esc(t.name)} — ${typeLabel(t.type)}</option>`).join('')}</select>
        </div>
        <div class="aqxTankOverviewGrid aqxCompactTankGrid">
          ${tanks.map(t=>{const lt=latestTestFor(t.id); const ts=tankStatus(lt); return `
            <button type="button" class="aqxTankCard ${t.id===activeId?'active':''}" onclick="aqxSwitchTank('${esc(t.id)}')">
              <div class="aqxTankCardHead"><strong>${esc(t.name)}</strong><span class="${ts.cls}">${ts.txt}</span></div>
              <small>${typeLabel(t.type)}${t.volume?' · '+esc(t.volume)+' L':''}</small>
            </button>`;}).join('')}
        </div>
        <button class="secondaryBtn aqxTankMiniBtn" onclick="aqxAddTank()">+ Add Tank</button>
      </details>`;
  }
  function injectUi(){
    if(!document.getElementById('aqxMultiTankHome')){
      const card=document.createElement('div'); card.id='aqxMultiTankHome'; card.className='card aqxMultiTankHome requiresCycleComplete';
      const home=document.querySelector('#home .homeBrandHeader');
      if(home && home.parentNode) home.parentNode.insertBefore(card, home.nextSibling);
    }
    const menu=document.querySelector('.aqxSideMenuGroup .aqxSideMenuLabel');
    const firstGroup=menu?menu.parentElement:null;
    if(firstGroup && !document.getElementById('aqxSideMenuTanksBtn')){
      const btn=document.createElement('button'); btn.id='aqxSideMenuTanksBtn'; btn.type='button'; btn.textContent='Manage Tanks'; btn.onclick=function(){aqxCloseSideMenu(); aqxOpenTankManager();};
      firstGroup.insertBefore(btn, firstGroup.children[2]||null);
    }
  }
  function refreshAll(){
    syncActiveLegacyFields();
    try{ if(typeof updateWelcomeTankButtons==='function') updateWelcomeTankButtons(); }catch(e){}
    try{ if(typeof updateTankSummary==='function') updateTankSummary(); }catch(e){}
    try{ if(typeof updateCycle==='function') updateCycle(); }catch(e){}
    try{ if(typeof renderParameterPage==='function') renderParameterPage(); }catch(e){}
    try{ if(typeof renderTestHistory==='function') renderTestHistory(); }catch(e){}
    try{ if(typeof drawParameterTrendGraph==='function') drawParameterTrendGraph(); }catch(e){}
    try{ if(typeof renderHomeDashboard==='function') renderHomeDashboard(); }catch(e){}
    try{ if(typeof aqxRenderJobs==='function') aqxRenderJobs(); }catch(e){}
    try{ if(typeof aqxRenderHomeJobs==='function') aqxRenderHomeJobs(); }catch(e){}
    try{ if(typeof aqxRenderTankCare==='function') aqxRenderTankCare(); }catch(e){}
    renderTankOverview();
  }
  window.aqxGetTanks=function(){return ensureTanks().slice();};
  window.aqxGetActiveTank=function(){return Object.assign({},activeTank());};
  window.aqxScopedKey=function(base,tankId){return scopedKey(base,tankId);};
  window.aqxSwitchTank=function(id){
    const tanks=ensureTanks(); if(!tanks.some(t=>t.id===id)) return;
    localStorage.setItem(ACTIVE_KEY,id); syncActiveLegacyFields();
    try{ if(typeof showSavingOverlay==='function') showSavingOverlay('Switched tank','Loading '+(activeTank().name||'tank')+' data'); }catch(e){}
    setTimeout(refreshAll,80);
  };
  window.aqxAddTank=function(){
    const name=prompt('Tank name? Example: Reef 425, Frag Tank, Nano Reef'); if(!name||!name.trim()) return;
    let type=prompt('Tank type? Type reef or freshwater','reef'); type=String(type||'reef').toLowerCase().trim(); if(type!=='freshwater') type='reef';
    const volume=prompt('Tank volume in litres? Optional','')||'';
    const tanks=ensureTanks(); const id=uid(); tanks.push({id:id,name:name.trim(),type:type,volume:String(volume).trim(),createdAt:new Date().toISOString()}); writeTanks(tanks); localStorage.setItem(ACTIVE_KEY,id); syncActiveLegacyFields(); refreshAll();
  };
  window.aqxRenameActiveTank=function(){
    const tanks=ensureTanks(); const a=activeTank(); const name=prompt('Rename tank',a.name||''); if(!name||!name.trim()) return;
    const t=tanks.find(x=>x.id===a.id); if(t) t.name=name.trim(); writeTanks(tanks); refreshAll();
  };
  window.aqxOpenTankManager=function(){
    ensureTanks(); renderTankOverview();
    const a=activeTank();
    alert('Active tank: '+(a.name||'Tank')+'\n\nUse the My Tanks card on Home to add tanks or switch between them. The sidebar stays exactly as your quick access menu.');
    try{ openPage('home'); }catch(e){}
  };
  const oldSelected=window.selectedTankType;
  window.selectedTankType=function(){return (activeTank().type || (typeof oldSelected==='function'?oldSelected():'reef') || 'reef');};
  const oldSaveTank=window.saveTank;
  window.saveTank=function(){
    const tanks=ensureTanks(); const a=activeTank(); const t=tanks.find(x=>x.id===a.id);
    if(t){t.type=(document.getElementById('tankTypeSelect')||{}).value || t.type || 'reef'; t.volume=(document.getElementById('tankVolumeMain')||{}).value || ''; writeTanks(tanks);}
    syncActiveLegacyFields();
    if(typeof oldSaveTank==='function') oldSaveTank.apply(this,arguments);
    refreshAll();
  };
  const oldGetTests=window.getParameterTests;
  window.getParameterTests=function(){
    const arr=safeJson(localStorage.getItem(scopedKey(SCOPED_KEYS.parameterTests)),'__bad__');
    return Array.isArray(arr) ? arr : [];
  };
  window.saveParameterTests=function(tests){localStorage.setItem(scopedKey(SCOPED_KEYS.parameterTests), JSON.stringify(tests||[]));};
  // Jobs are scoped too, but legacy functions keep their names. Mirror active tank data into legacy keys before screens render.
  // Important: when a tank has no data yet, clear the legacy key to [] so another tank's readings never appear.
  function mirrorScopedToLegacy(){Object.values(SCOPED_KEYS).forEach(base=>{const scoped=scopedKey(base); const v=localStorage.getItem(scoped); localStorage.setItem(base, v!=null ? v : '[]');});}
  const oldOpenPage=window.openPage;
  if(typeof oldOpenPage==='function'){
    window.openPage=function(page){mirrorScopedToLegacy(); const out=oldOpenPage.apply(this,arguments); setTimeout(renderTankOverview,80); return out;};
  }
  document.addEventListener('DOMContentLoaded',function(){ensureTanks(); injectUi(); mirrorScopedToLegacy(); setTimeout(refreshAll,250); setTimeout(renderTankOverview,900);});
  setTimeout(function(){ensureTanks(); injectUi(); mirrorScopedToLegacy(); refreshAll();},500);
})();



// === AquoraX Tank Life Layout Patch ===
(function(){
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function items(kind){try{return (typeof getTrackerItems==='function'?getTrackerItems(kind):[])||[]}catch(e){return []}}
 function activeName(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank().name)||'Active Tank'}catch(e){return 'Active Tank'}}
 function renderTankLifeSummary(){
   const main=document.getElementById('growthMain'); if(!main) return;
   let card=document.getElementById('aqxTankLifeSummaryCard');
   if(!card){
     card=document.createElement('div');
     card.id='aqxTankLifeSummaryCard';
     card.className='card aqxTankLifeSummaryCard';
     const header=main.querySelector('.pageHeader');
     if(header && header.parentNode) header.parentNode.insertBefore(card, header.nextSibling);
     else main.prepend(card);
   }
   const fish=items('fish').length, coral=items('coral').length, invert=items('invert').length, plant=items('plant').length, algae=items('algae').length;
   card.innerHTML=`
     <div class="aqxTankLifeHead">
       <div>
         <span class="aqxMiniKicker">${esc(activeName())}</span>
         <h2>Tank Life</h2>
         <p>Everything living in this tank, kept together in one place.</p>
       </div>
       <button class="secondaryBtn aqxTankLifeMiniBtn" onclick="openPage('home')">Switch Tank</button>
     </div>
     <div class="aqxTankLifeCounts">
       <button onclick="openGrowthTrackerPanel('fish')"><strong>${fish}</strong><span>Fish</span></button>
       <button onclick="openGrowthTrackerPanel('coral')"><strong>${coral}</strong><span>Corals</span></button>
       <button onclick="openGrowthTrackerPanel('invert')"><strong>${invert}</strong><span>Inverts</span></button>
       <button onclick="openGrowthTrackerPanel('plant')"><strong>${plant}</strong><span>Plants</span></button>
       <button onclick="openGrowthTrackerPanel('algae')"><strong>${algae}</strong><span>Algae Logs</span></button>
     </div>`;
 }
 const oldOpen=window.openPage;
 if(typeof oldOpen==='function'){
   window.openPage=function(page){const out=oldOpen.apply(this,arguments); if(page==='growth') setTimeout(renderTankLifeSummary,80); return out;};
 }
 const oldSwitch=window.aqxSwitchTank;
 if(typeof oldSwitch==='function'){
   window.aqxSwitchTank=function(id){const out=oldSwitch.apply(this,arguments); setTimeout(renderTankLifeSummary,160); return out;};
 }
 ['addTrackerItem','deleteTrackerItem','deleteTrackerUpdate'].forEach(fn=>{
   const old=window[fn];
   if(typeof old==='function') window[fn]=function(){const out=old.apply(this,arguments); setTimeout(renderTankLifeSummary,150); return out;};
 });
 document.addEventListener('DOMContentLoaded',()=>setTimeout(renderTankLifeSummary,1000));
 setTimeout(renderTankLifeSummary,1500);
})();

// === AquoraX Tank-Specific Jobs Patch ===
(function(){
  const JOB_KEY='aquoraxJobsV1';
  const DONE_KEY='aquoraxJobsDoneV1';
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank'};}catch(e){return {id:'tank_main',name:'Main Tank'};}}
  function scoped(base){try{return (window.aqxScopedKey?window.aqxScopedKey(base,activeTank().id):(base+'__'+activeTank().id));}catch(e){return base+'__tank_main';}}
  function copyScopedToLegacy(){
    [JOB_KEY,DONE_KEY].forEach(base=>{try{const v=localStorage.getItem(scoped(base)); if(v!=null){localStorage.setItem(base,v);} else if(localStorage.getItem(base)==null){localStorage.setItem(base,'[]');}}catch(e){}});
  }
  function copyLegacyToScoped(){
    [JOB_KEY,DONE_KEY].forEach(base=>{try{const v=localStorage.getItem(base); if(v!=null)localStorage.setItem(scoped(base),v);}catch(e){}});
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function enhanceJobsHeader(){
    const jobsPage=document.getElementById('jobs'); if(!jobsPage) return;
    let card=document.getElementById('aqxJobsTankContext');
    if(!card){
      card=document.createElement('div');
      card.id='aqxJobsTankContext';
      card.className='card aqxJobsTankContext';
      const first=jobsPage.querySelector('.pageHeader')||jobsPage.firstElementChild;
      if(first&&first.parentNode) first.parentNode.insertBefore(card, first.nextSibling); else jobsPage.prepend(card);
    }
    const tank=activeTank();
    card.innerHTML='<div class="aqxJobsTankTop"><div><span class="aqxMiniKicker">Active Tank</span><h2>'+esc(tank.name||'Tank')+'</h2><p>Jobs and completed maintenance shown here are linked only to this tank.</p></div><button class="secondaryBtn" onclick="openPage(\'home\')">Switch Tank</button></div>';
  }
  function rerender(){copyScopedToLegacy(); enhanceJobsHeader(); try{if(typeof window.aqxRenderJobs==='function') window.aqxRenderJobs();}catch(e){} try{if(typeof window.aqxRenderHomeJobs==='function') window.aqxRenderHomeJobs();}catch(e){}}
  ['aqxAddJob','aqxCompleteJob','aqxDeleteJob','aqxClearCompletedJobs'].forEach(fn=>{
    const old=window[fn];
    if(typeof old==='function'){
      window[fn]=function(){copyScopedToLegacy(); const out=old.apply(this,arguments); copyLegacyToScoped(); setTimeout(function(){enhanceJobsHeader(); try{if(typeof window.aqxRenderHomeJobs==='function') window.aqxRenderHomeJobs();}catch(e){}},80); return out;};
    }
  });
  const oldRender=window.aqxRenderJobs;
  if(typeof oldRender==='function'){
    window.aqxRenderJobs=function(){copyScopedToLegacy(); enhanceJobsHeader(); return oldRender.apply(this,arguments);};
  }
  const oldHome=window.aqxRenderHomeJobs;
  if(typeof oldHome==='function'){
    window.aqxRenderHomeJobs=function(){copyScopedToLegacy(); return oldHome.apply(this,arguments);};
  }
  const oldSwitch=window.aqxSwitchTank;
  if(typeof oldSwitch==='function'){
    window.aqxSwitchTank=function(id){copyLegacyToScoped(); const out=oldSwitch.apply(this,arguments); setTimeout(rerender,180); return out;};
  }
  const oldOpen=window.openPage;
  if(typeof oldOpen==='function'){
    window.openPage=function(page){copyScopedToLegacy(); const out=oldOpen.apply(this,arguments); if(page==='jobs') setTimeout(rerender,100); return out;};
  }
  document.addEventListener('DOMContentLoaded',function(){copyScopedToLegacy(); setTimeout(function(){enhanceJobsHeader(); copyLegacyToScoped();},1000);});
  setTimeout(function(){copyScopedToLegacy(); enhanceJobsHeader(); copyLegacyToScoped();},1400);
})();


// === AquoraX Tank Care + Equipment Patch ===
(function(){
  const EQUIP_KEY='aquoraxEquipmentV1';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank'};}catch(e){return {id:'tank_main',name:'Main Tank'};}}
  function scoped(base){try{return window.aqxScopedKey?window.aqxScopedKey(base,activeTank().id):(base+'__'+activeTank().id);}catch(e){return base+'__tank_main';}}
  function readEquipment(){try{const x=JSON.parse(localStorage.getItem(scoped(EQUIP_KEY))||'[]'); return Array.isArray(x)?x:[];}catch(e){return [];}}
  function writeEquipment(items){try{localStorage.setItem(scoped(EQUIP_KEY),JSON.stringify(items||[])); if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('equipment');}catch(e){}}
  function addDays(dateStr, days){const d=dateStr?new Date(dateStr):new Date(); if(isNaN(d.getTime())) d.setTime(Date.now()); d.setDate(d.getDate()+Number(days||30)); return d.toISOString().slice(0,10);}
  function daysUntil(dateStr){const d=new Date(dateStr); if(isNaN(d.getTime())) return 9999; const today=new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0); return Math.ceil((d-today)/86400000);}
  function statusFor(eq){const left=daysUntil(eq.nextService); if(left<0) return {cls:'bad',txt:'Overdue'}; if(left<=7) return {cls:'watch',txt:'Due soon'}; return {cls:'good',txt:left+' days'};}
  window.aqxAddEquipment=function(){
    const name=(document.getElementById('equipmentName')||{}).value||''; if(!name.trim()){alert('Add an equipment name first.'); return;}
    const item={id:'eq_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),name:name.trim(),model:(document.getElementById('equipmentModel')||{}).value||'',category:(document.getElementById('equipmentCategory')||{}).value||'Other',installDate:(document.getElementById('equipmentInstallDate')||{}).value||new Date().toISOString().slice(0,10),interval:Number((document.getElementById('equipmentInterval')||{}).value||30),notes:(document.getElementById('equipmentNotes')||{}).value||'',lastService:'',nextService:''};
    item.nextService=addDays(item.installDate,item.interval);
    const items=readEquipment(); items.push(item); writeEquipment(items);
    ['equipmentName','equipmentModel','equipmentInstallDate','equipmentNotes'].forEach(id=>{const x=document.getElementById(id); if(x) x.value='';});
    renderEquipment(); renderTankCare();
  };
  window.aqxServiceEquipment=function(id){
    const items=readEquipment().map(eq=>eq.id===id?Object.assign({},eq,{lastService:new Date().toISOString().slice(0,10),nextService:addDays(new Date().toISOString().slice(0,10),eq.interval)}):eq);
    writeEquipment(items); renderEquipment(); renderTankCare();
  };
  window.aqxDeleteEquipment=function(id){if(!confirm('Remove this equipment item?')) return; writeEquipment(readEquipment().filter(eq=>eq.id!==id)); renderEquipment(); renderTankCare();};
  function renderEquipment(){
    const box=document.getElementById('equipmentList'); if(!box) return;
    const items=readEquipment().sort((a,b)=>daysUntil(a.nextService)-daysUntil(b.nextService));
    if(!items.length){box.innerHTML='<div class="jobEmpty">No equipment saved for this tank yet.</div>'; return;}
    box.innerHTML=items.map(eq=>{const st=statusFor(eq); const left=daysUntil(eq.nextService); return `<div class="trackerItem aqxEquipmentItem"><div><div class="aqxTankCardHead"><strong>${esc(eq.name)}</strong><span class="${st.cls}">${esc(st.txt)}</span></div><p>${esc(eq.category)}${eq.model?' · '+esc(eq.model):''}</p><small>Next service: ${esc(eq.nextService||'Not set')}${left<0?' · '+Math.abs(left)+' days overdue':''}</small>${eq.notes?'<em>'+esc(eq.notes)+'</em>':''}</div><div class="customButtonGrid"><button class="secondaryBtn" onclick="aqxServiceEquipment('${esc(eq.id)}')">Mark Serviced</button><button class="dangerBtn" onclick="aqxDeleteEquipment('${esc(eq.id)}')">Remove</button></div></div>`;}).join('');
  }
  function renderTankCare(){
    const tank=activeTank(); const ctx=document.getElementById('aqxTankCareContext');
    const equipment=readEquipment(); const due=equipment.filter(eq=>daysUntil(eq.nextService)<=7).length;
    let jobsDue=0; try{const jobs=JSON.parse(localStorage.getItem(scoped('aquoraxJobsV1'))||'[]'); jobsDue=Array.isArray(jobs)?jobs.length:0;}catch(e){}
    if(ctx){ctx.innerHTML=`<div class="aqxJobsTankTop"><div><span class="aqxMiniKicker">Active Tank</span><h2>${esc(tank.name||'Tank')}</h2><p>Tank Care is locked into the bottom menu and keeps maintenance separate for each tank.</p></div><button class="secondaryBtn" onclick="openPage('home')">Switch Tank</button></div><div class="aqxTankLifeCounts aqxCareCounts"><button onclick="openPage('parameters')"><strong>Params</strong><span>Testing</span></button><button onclick="openPage('dosing')"><strong>Dosing</strong><span>Products</span></button><button onclick="openPage('jobs')"><strong>${jobsDue}</strong><span>Jobs</span></button><button onclick="document.getElementById('equipmentName').focus()"><strong>${equipment.length}</strong><span>Equipment</span></button><button onclick="openPage('graphs')"><strong>Trends</strong><span>Graphs</span></button></div>${due?'<p class="aqxCareWarning">⚠️ '+due+' equipment item'+(due===1?'':'s')+' need service soon.</p>':''}`;}
    renderEquipment();
  }
  window.aqxRenderTankCare=renderTankCare;
  const oldOpen=window.openPage;
  if(typeof oldOpen==='function') window.openPage=function(page){const out=oldOpen.apply(this,arguments); if(page==='care') setTimeout(renderTankCare,80); return out;};
  const oldSwitch=window.aqxSwitchTank;
  if(typeof oldSwitch==='function') window.aqxSwitchTank=function(id){const out=oldSwitch.apply(this,arguments); setTimeout(renderTankCare,180); return out;};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(renderTankCare,1000));
  setTimeout(renderTankCare,1500);
})();


// === AquoraX Cycle Prompt Once Per Tank Fix ===
(function(){
  const COMPLETE_BASE = 'aquoraxCycleConfirmedComplete';
  const COMPLETE_AT_BASE = 'aquoraxCycleConfirmedAt';
  const PROMPT_BASE = 'aquoraxCyclePromptSeen';
  function activeTankId(){
    try{
      const t = window.aqxGetActiveTank && window.aqxGetActiveTank();
      return (t && t.id) || localStorage.getItem('aquoraxActiveTankId') || 'tank_main';
    }catch(e){
      return localStorage.getItem('aquoraxActiveTankId') || 'tank_main';
    }
  }
  function key(base, tankId){
    const id = tankId || activeTankId();
    try{return window.aqxScopedKey ? window.aqxScopedKey(base, id) : (base + '__' + id);}catch(e){return base + '__' + id;}
  }
  function legacyComplete(){return localStorage.getItem(COMPLETE_BASE)==='yes';}
  function readComplete(){
    const scoped = localStorage.getItem(key(COMPLETE_BASE));
    if(scoped === 'yes' || scoped === 'no') return scoped === 'yes';
    if(legacyComplete()){
      localStorage.setItem(key(COMPLETE_BASE),'yes');
      localStorage.setItem(key(PROMPT_BASE),'yes');
      return true;
    }
    return false;
  }
  function promptSeen(){return localStorage.getItem(key(PROMPT_BASE)) === 'yes';}
  function setPromptSeen(){localStorage.setItem(key(PROMPT_BASE),'yes');}
  function setComplete(value){
    localStorage.setItem(key(COMPLETE_BASE), value ? 'yes' : 'no');
    localStorage.setItem(COMPLETE_BASE, value ? 'yes' : 'no');
    setPromptSeen();
    if(value){localStorage.setItem(key(COMPLETE_AT_BASE), new Date().toISOString());}
  }
  function syncLegacyForActive(){
    localStorage.setItem(COMPLETE_BASE, readComplete() ? 'yes' : 'no');
  }
  function applyGate(){
    syncLegacyForActive();
    const complete = readComplete();
    const seen = promptSeen();
    document.body.classList.toggle('aqxCycleConfirmed', complete || seen);
    const card = document.getElementById('homeCycleGateCard');
    if(card) card.style.display = seen ? 'none' : '';
  }
  window.isCycleConfirmedComplete = readComplete;
  window.applyCycleCompletionGate = applyGate;
  window.confirmCycleCompleteFromHome = function(){
    setComplete(true);
    applyGate();
    try{ if(typeof renderParameterPage==='function') renderParameterPage(); }catch(e){}
    try{ if(typeof renderTestHistory==='function') renderTestHistory(); }catch(e){}
    try{ if(typeof renderHomeDashboard==='function') renderHomeDashboard(); }catch(e){}
    try{ openPage('home'); }catch(e){}
  };
  window.goToCycleJourneyFromHome = function(){
    setComplete(false);
    applyGate();
    try{ openPage('cycle'); }catch(e){}
  };
  window.aqxResetCyclePromptForActiveTank = function(){
    localStorage.removeItem(key(PROMPT_BASE));
    localStorage.removeItem(key(COMPLETE_BASE));
    localStorage.removeItem(key(COMPLETE_AT_BASE));
    localStorage.removeItem(COMPLETE_BASE);
    applyGate();
    try{ openPage('home'); }catch(e){}
  };
  const oldOpen = window.openPage;
  if(typeof oldOpen === 'function'){
    window.openPage = function(page){
      applyGate();
      if(page === 'log' && !readComplete()){
        setPromptSeen();
        applyGate();
        page = 'cycle';
      }
      const out = oldOpen.apply(this, arguments.length ? [page] : arguments);
      setTimeout(applyGate, 60);
      return out;
    };
  }
  const oldSwitch = window.aqxSwitchTank;
  if(typeof oldSwitch === 'function'){
    window.aqxSwitchTank = function(id){
      const out = oldSwitch.apply(this, arguments);
      setTimeout(function(){syncLegacyForActive(); applyGate();}, 120);
      return out;
    };
  }
  const oldAdd = window.aqxAddTank;
  if(typeof oldAdd === 'function'){
    window.aqxAddTank = function(){
      const out = oldAdd.apply(this, arguments);
      setTimeout(function(){
        localStorage.removeItem(key(PROMPT_BASE));
        localStorage.removeItem(key(COMPLETE_BASE));
        applyGate();
      }, 120);
      return out;
    };
  }
  document.addEventListener('DOMContentLoaded', function(){setTimeout(applyGate, 250); setTimeout(applyGate, 1200);});
  setTimeout(applyGate, 500);
})();

// === AquoraX Tank-Specific Dual Mode Dosing Countdown Patch ===
(function(){
  const PRODUCT_BASE = 'aquoraxDosingProducts';
  const HISTORY_BASE = 'aquoraxDosingHistory';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank'};}catch(e){return {id:'tank_main',name:'Main Tank'};}}
  function scoped(base){try{return window.aqxScopedKey?window.aqxScopedKey(base,activeTank().id):(base+'__'+activeTank().id);}catch(e){return base+'__tank_main';}}
  function read(base){try{const v=JSON.parse(localStorage.getItem(scoped(base))||'[]'); return Array.isArray(v)?v:[];}catch(e){return [];}}
  function write(base,items){localStorage.setItem(scoped(base),JSON.stringify(items||[])); try{if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('dosing');}catch(e){}}
  function num(v,fallback){const n=parseFloat(v); return Number.isFinite(n)?n:fallback;}
  function daysBetween(a,b){const da=new Date(a||Date.now()); const db=new Date(b||Date.now()); if(isNaN(da)||isNaN(db)) return 0; return Math.max(0, Math.floor((db-da)/86400000));}
  function intervalDays(freq, custom){try{return typeof doseIntervalDays==='function'?doseIntervalDays(freq,custom):(freq==='weekly'?7:(freq==='custom'?Math.max(1,parseInt(custom||1,10)):1));}catch(e){return freq==='weekly'?7:(freq==='custom'?Math.max(1,parseInt(custom||1,10)):1);}}
  function dosePerDay(p){const amt=num(p.amount,0); if(amt<=0) return 0; const interval=Math.max(1, num(p.interval || intervalDays(p.frequency,p.interval), 1)); return amt/interval;}
  function liveRemaining(p){
    let remaining=num(p.remainingAmount, NaN);
    if(!Number.isFinite(remaining)) remaining=num(p.bottleSize, 0);
    if((p.mode||'manual')==='auto'){
      const anchor=p.stockUpdatedIso||p.createdIso||new Date().toISOString();
      remaining = remaining - (daysBetween(anchor, new Date().toISOString()) * dosePerDay(p));
    }
    return Math.max(0, remaining);
  }
  function daysLeft(p){const daily=dosePerDay(p); if(daily<=0) return null; return Math.floor(liveRemaining(p)/daily);}
  function saveLiveAutoProduct(p){
    if((p.mode||'manual')!=='auto') return p;
    const remain=liveRemaining(p);
    return Object.assign({},p,{remainingAmount:remain,stockUpdatedIso:new Date().toISOString()});
  }
  function freqText(p){return p.frequency==='custom'?`Every ${p.interval||1} days`:(p.frequency==='weekly'?'Weekly':'Daily');}
  function invStatus(p){
    const left=daysLeft(p), low=num(p.lowStockDays,14);
    if(left===null) return {cls:'watch',txt:'No countdown'};
    if(left<=0) return {cls:'bad',txt:'Empty now'};
    if(left<=low) return {cls:'warn',txt:`Low: ${left} day${left===1?'':'s'} left`};
    return {cls:'good',txt:`${left} day${left===1?'':'s'} left`};
  }
  function invHtml(p){
    const bottle=num(p.bottleSize,0), remain=liveRemaining(p), left=daysLeft(p), st=invStatus(p);
    const pct=bottle>0?Math.max(0,Math.min(100,(remain/bottle)*100)):0;
    const unit=esc(p.unit||'ml');
    return `<div class="aqxDoseCountdown ${st.cls}">
      <div class="aqxDoseCountdownTop"><strong>${esc((p.mode||'manual')==='auto'?'Auto countdown':'Manual countdown')}</strong><span>${esc(st.txt)}</span></div>
      <div class="aqxDoseBar"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="aqxDoseMeta"><span>${remain.toFixed(remain<10?1:0)} ${unit} left${bottle?` / ${bottle} ${unit}`:''}</span><span>${left==null?'Set stock for countdown':left+' days estimated'}</span></div>
    </div>`;
  }
  window.getDosingProducts=function(){return read(PRODUCT_BASE);};
  window.saveDosingProducts=function(items){write(PRODUCT_BASE,items);};
  window.getDosingHistory=function(){return read(HISTORY_BASE);};
  window.saveDosingHistory=function(items){write(HISTORY_BASE,items);};
  window.addDosingProduct=function(){
    const name=(document.getElementById('doseProductName')?.value||'').trim();
    const amount=num(document.getElementById('doseProductAmount')?.value, NaN);
    if(!name){alert('Add a product name first.'); return;}
    if(!Number.isFinite(amount)||amount<=0){alert('Add a dose amount first.'); return;}
    const freq=document.getElementById('doseProductFrequency')?.value||'daily';
    const bottle=num(document.getElementById('doseProductBottleSize')?.value, 0);
    const remaining=num(document.getElementById('doseProductRemaining')?.value, bottle||0);
    const product={
      id:'dose_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),
      name, amount,
      unit:document.getElementById('doseProductUnit')?.value||'ml',
      frequency:freq,
      interval:intervalDays(freq, document.getElementById('doseProductInterval')?.value),
      mode:document.getElementById('doseProductMode')?.value||'auto',
      bottleSize:bottle,
      remainingAmount:Math.max(0,remaining),
      lowStockDays:num(document.getElementById('doseProductLowDays')?.value,14),
      stockUpdatedIso:new Date().toISOString(),
      notes:document.getElementById('doseProductNotes')?.value||'',
      createdIso:new Date().toISOString(),
      lastDosedIso:null
    };
    const items=read(PRODUCT_BASE); items.push(product); write(PRODUCT_BASE,items);
    ['doseProductName','doseProductAmount','doseProductInterval','doseProductBottleSize','doseProductRemaining','doseProductNotes'].forEach(id=>{const x=document.getElementById(id); if(x) x.value='';});
    const f=document.getElementById('doseProductFrequency'); if(f) f.value='daily';
    const m=document.getElementById('doseProductMode'); if(m) m.value='auto';
    try{toggleCustomDoseInterval();}catch(e){}
    renderDosingPage();
  };
  window.logDose=function(productId){
    const iso=new Date().toISOString();
    const items=read(PRODUCT_BASE).map(p=>{
      if(String(p.id)!==String(productId)) return p;
      let next=Object.assign({},p,{lastDosedIso:iso});
      if((next.mode||'manual')==='manual'){
        const current=liveRemaining(next);
        next.remainingAmount=Math.max(0,current-num(next.amount,0));
        next.stockUpdatedIso=iso;
      }else{
        next=saveLiveAutoProduct(next);
      }
      return next;
    });
    const p=items.find(x=>String(x.id)===String(productId));
    write(PRODUCT_BASE,items);
    if(p){const h=read(HISTORY_BASE); h.unshift({id:Date.now(),productId:p.id,name:p.name,amount:p.amount,unit:p.unit,mode:p.mode||'manual',iso}); write(HISTORY_BASE,h.slice(0,200));}
    renderDosingPage();
  };
  window.aqxRefillDosingProduct=function(productId){
    const items=read(PRODUCT_BASE); const p=items.find(x=>String(x.id)===String(productId)); if(!p) return;
    const defaultAmount=num(p.bottleSize,0)||liveRemaining(p);
    const answer=prompt('How much product is now in the bottle/container?', String(defaultAmount));
    if(answer==null) return;
    const amount=num(answer,NaN); if(!Number.isFinite(amount)||amount<0){alert('Enter a valid amount.'); return;}
    p.remainingAmount=amount; if(amount>num(p.bottleSize,0)) p.bottleSize=amount; p.stockUpdatedIso=new Date().toISOString();
    write(PRODUCT_BASE,items); renderDosingPage();
  };
  window.deleteDosingProduct=function(productId){if(!confirm('Remove this dosing product?')) return; write(PRODUCT_BASE, read(PRODUCT_BASE).filter(x=>String(x.id)!==String(productId))); renderDosingPage();};
  window.clearDosingHistory=function(){if(!confirm('Clear dosing history? Products will stay saved.')) return; write(HISTORY_BASE,[]); renderDosingPage();};
  window.renderDosingProducts=function(){
    const box=document.getElementById('dosingProductList'); if(!box) return;
    const items=read(PRODUCT_BASE);
    if(!items.length){box.innerHTML='<p class="smallPrint">No dosing products saved for this tank yet.</p>'; return;}
    box.innerHTML=items.map(p=>{
      const due=typeof nextDueText==='function'?nextDueText(p):{text:'Ready',cls:''};
      return `<div class="doseTrackerCard aqxDoseCard">
        <div class="aqxDoseCardHead"><div><strong>${esc(p.name)}</strong><span>${esc(activeTank().name||'Tank')} · ${esc((p.mode||'manual')==='auto'?'Auto dosing':'Manual dosing')}</span></div><div class="doseStatusPill ${esc(due.cls||'')}">${esc(due.text||'Ready')}</div></div>
        <span>${esc(p.amount)} ${esc(p.unit||'ml')} · ${esc(freqText(p))}</span>
        <span>Last logged: ${typeof prettyDateTime==='function'?prettyDateTime(p.lastDosedIso):esc(p.lastDosedIso||'Not logged yet')}</span>
        ${p.notes?`<span>Notes: ${esc(p.notes)}</span>`:''}
        ${invHtml(p)}
        <div class="doseActionRow">
          <button class="primaryBtn" onclick="logDose('${esc(p.id)}')">${(p.mode||'manual')==='auto'?'Log Check':'Log Dose'}</button>
          <button class="secondaryBtn" onclick="aqxRefillDosingProduct('${esc(p.id)}')">Refill</button>
          <button class="dangerBtn" onclick="deleteDosingProduct('${esc(p.id)}')">Remove</button>
        </div>
      </div>`;
    }).join('');
  };
  window.renderDosingHistory=function(){
    const box=document.getElementById('dosingHistoryList'); if(!box) return;
    const h=read(HISTORY_BASE); if(!h.length){box.innerHTML='<p class="smallPrint">No doses logged for this tank yet.</p>'; return;}
    box.innerHTML=h.slice(0,30).map(x=>`<div class="historyItem"><strong>${esc(x.name)}</strong><span>${esc(x.amount)} ${esc(x.unit||'ml')} ${x.mode==='auto'?'checked/logged':'dosed'} · ${typeof prettyDateTime==='function'?prettyDateTime(x.iso):esc(x.iso)}</span></div>`).join('');
  };
  function lowCount(){return read(PRODUCT_BASE).filter(p=>{const left=daysLeft(p); return left!==null && left<=num(p.lowStockDays,14);}).length;}
  const oldCare=window.aqxRenderTankCare;
  window.aqxRenderTankCare=function(){try{if(typeof oldCare==='function') oldCare.apply(this,arguments);}catch(e){} const ctx=document.getElementById('aqxTankCareContext'); if(ctx && !document.getElementById('aqxDosingLowCareNote')){const n=lowCount(); if(n){ctx.insertAdjacentHTML('beforeend',`<p id="aqxDosingLowCareNote" class="aqxCareWarning">⚠️ ${n} dosing product${n===1?'':'s'} running low for this tank.</p>`);}}};
  const oldSwitch=window.aqxSwitchTank;
  if(typeof oldSwitch==='function' && !oldSwitch.__aqxDoseCountdownWrapped){
    const wrapped=function(){const out=oldSwitch.apply(this,arguments); setTimeout(()=>{try{renderDosingPage();}catch(e){}},180); return out;};
    wrapped.__aqxDoseCountdownWrapped=true; window.aqxSwitchTank=wrapped;
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{renderDosingPage();}catch(e){}},900));
})();


// === AquoraX Dosing Visible Multi-Tank Context Fix ===
(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function tanks(){try{return (window.aqxGetTanks&&window.aqxGetTanks())||[];}catch(e){return []}}
  function active(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank',type:'reef'};}catch(e){return {id:'tank_main',name:'Main Tank',type:'reef'}}}
  function typeLabel(t){return t==='freshwater'?'Freshwater':'Saltwater Reef';}
  function scopedKey(base,id){try{return window.aqxScopedKey?window.aqxScopedKey(base,id):(base+'__'+id);}catch(e){return base+'__'+id;}}
  function readList(base,id){try{const v=JSON.parse(localStorage.getItem(scopedKey(base,id||active().id))||'[]'); return Array.isArray(v)?v:[];}catch(e){return []}}
  function dailyDose(p){const amt=parseFloat(p.amount||0)||0; const interval=Math.max(1,parseFloat(p.interval||1)||1); return amt/interval;}
  function daysLeft(p){const remaining=parseFloat(p.remainingAmount||p.bottleSize||0)||0; const daily=dailyDose(p); return daily>0?Math.floor(remaining/daily):null;}
  function lowProductsForTank(id){return readList('aquoraxDosingProducts',id).filter(p=>{const d=daysLeft(p); const low=parseFloat(p.lowStockDays||14)||14; return d!==null && d<=low;}).length;}
  function renderDosingTankContext(){
    const tank=active();
    const list=tanks();
    const name=document.getElementById('aqxDosingActiveTankName');
    if(name) name.textContent=(tank.name||'Current Tank')+' Dosing';
    const help=document.getElementById('aqxDosingActiveTankHelp');
    if(help){
      const productCount=readList('aquoraxDosingProducts',tank.id).length;
      const low=lowProductsForTank(tank.id);
      help.textContent=`${typeLabel(tank.type)} · ${productCount} dosing product${productCount===1?'':'s'} saved for this tank${low?` · ${low} low stock warning${low===1?'':'s'}`:''}.`;
    }
    const sel=document.getElementById('aqxDosingTankSelect');
    if(sel){
      sel.innerHTML=list.map(t=>`<option value="${esc(t.id)}" ${t.id===tank.id?'selected':''}>${esc(t.name||'Tank')} — ${typeLabel(t.type)}</option>`).join('');
      sel.value=tank.id;
    }
    const header=document.querySelector('#dosing .pageHeader p');
    if(header) header.textContent='Track dosing for the active tank only. Switch tank below to see separate products, countdowns and history.';
  }
  const oldRender=window.renderDosingPage;
  window.renderDosingPage=function(){
    renderDosingTankContext();
    const out=typeof oldRender==='function'?oldRender.apply(this,arguments):undefined;
    setTimeout(renderDosingTankContext,0);
    setTimeout(renderDosingTankContext,150);
    return out;
  };
  const oldSwitch=window.aqxSwitchTank;
  if(typeof oldSwitch==='function' && !oldSwitch.__aqxDosingVisibleTankWrapped){
    const wrapped=function(){
      const out=oldSwitch.apply(this,arguments);
      setTimeout(function(){try{renderDosingTankContext(); if(typeof window.renderDosingPage==='function') window.renderDosingPage();}catch(e){}},180);
      return out;
    };
    wrapped.__aqxDosingVisibleTankWrapped=true;
    window.aqxSwitchTank=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderDosingTankContext,300); setTimeout(renderDosingTankContext,1200);});
  setTimeout(renderDosingTankContext,700);
})();

// === AquoraX Smart Tank Care Dashboard Patch ===
(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank',type:'reef'};}catch(e){return {id:'tank_main',name:'Main Tank',type:'reef'};}}
  function scoped(base,id){try{return window.aqxScopedKey?window.aqxScopedKey(base,id||activeTank().id):(base+'__'+(id||activeTank().id));}catch(e){return base+'__tank_main';}}
  function readList(base){try{const v=JSON.parse(localStorage.getItem(scoped(base))||'[]'); return Array.isArray(v)?v:[];}catch(e){return [];}}
  function today(){const d=new Date(); d.setHours(0,0,0,0); return d;}
  function daysUntil(dateStr){const d=new Date(dateStr); if(isNaN(d.getTime())) return 9999; d.setHours(0,0,0,0); return Math.ceil((d-today())/86400000);}
  function daysBetween(a,b){const da=new Date(a||Date.now()); const db=new Date(b||Date.now()); if(isNaN(da)||isNaN(db)) return 0; return Math.max(0,Math.floor((db-da)/86400000));}
  function num(v,f){const n=parseFloat(v); return Number.isFinite(n)?n:f;}
  function dosePerDay(p){const amt=num(p.amount,0); const interval=Math.max(1,num(p.interval,1)); return amt/interval;}
  function liveRemaining(p){let r=num(p.remainingAmount,NaN); if(!Number.isFinite(r)) r=num(p.bottleSize,0); if((p.mode||'manual')==='auto'){const anchor=p.stockUpdatedIso||p.createdIso||new Date().toISOString(); r-=daysBetween(anchor,new Date().toISOString())*dosePerDay(p);} return Math.max(0,r);}
  function doseDaysLeft(p){const daily=dosePerDay(p); return daily>0?Math.floor(liveRemaining(p)/daily):null;}
  function jobStatus(job){
    const due=new Date((job.dueDate||new Date().toISOString().slice(0,10))+'T'+(job.dueTime||'09:00'));
    const now=new Date();
    if(due<now && (due.toDateString()!==now.toDateString())) return 'overdue';
    const d=daysUntil(job.dueDate);
    if(d<0) return 'overdue';
    if(d===0) return 'today';
    if(d<=2) return 'soon';
    return 'ok';
  }
  function latestTestAge(){
    let tests=[]; try{tests=(typeof window.getParameterTests==='function'?window.getParameterTests():readList('aquoraxParameterTests'))||[];}catch(e){tests=readList('aquoraxParameterTests');}
    if(!tests.length) return null;
    const last=tests[tests.length-1]||{};
    const date=last.savedIso||((last.date||'')+'T'+(last.time||'00:00'));
    const d=new Date(date); if(isNaN(d.getTime())) return null;
    return Math.floor((Date.now()-d.getTime())/86400000);
  }
  function buildDashboard(){
    const tank=activeTank();
    const dosing=readList('aquoraxDosingProducts');
    const equipment=readList('aquoraxEquipmentV1');
    const jobs=readList('aquoraxJobsV1');
    const lowDosing=dosing.filter(p=>{const left=doseDaysLeft(p); return left!==null && left<=num(p.lowStockDays,14);}).sort((a,b)=>(doseDaysLeft(a)||0)-(doseDaysLeft(b)||0));
    const equipDue=equipment.filter(eq=>daysUntil(eq.nextService)<=7).sort((a,b)=>daysUntil(a.nextService)-daysUntil(b.nextService));
    const jobsAttention=jobs.filter(j=>['overdue','today','soon'].includes(jobStatus(j))).sort((a,b)=>daysUntil(a.dueDate)-daysUntil(b.dueDate));
    const age=latestTestAge();
    const alerts=[];
    lowDosing.slice(0,3).forEach(p=>{const left=doseDaysLeft(p); alerts.push({type:left<=0?'critical':'warning',title:`${p.name} running low`,text:left<=0?'Product is empty or due for refill now.':`Around ${left} day${left===1?'':'s'} left.`,action:`<button onclick="openPage('dosing')">Open Dosing</button>`});});
    equipDue.slice(0,3).forEach(eq=>{const left=daysUntil(eq.nextService); alerts.push({type:left<0?'critical':'warning',title:`${eq.name} service ${left<0?'overdue':'due soon'}`,text:left<0?`${Math.abs(left)} day${Math.abs(left)===1?'':'s'} overdue.`:`Due in ${left} day${left===1?'':'s'}.`,action:`<button onclick="document.getElementById('equipmentName').scrollIntoView({behavior:'smooth',block:'center'})">Open Equipment</button>`});});
    jobsAttention.slice(0,3).forEach(j=>{const st=jobStatus(j); alerts.push({type:st==='overdue'?'critical':'info',title:j.title||'Job due',text:`${j.category||'Maintenance'} · ${st==='overdue'?'Overdue':st==='today'?'Due today':'Due soon'}.`,action:`<button onclick="openPage('jobs')">Open Jobs</button>`});});
    if(age===null) alerts.push({type:'info',title:'No parameter test yet',text:'Log the first test for this tank so AquoraX can build proper guidance.',action:`<button onclick="openPage('log')">Log Test</button>`});
    else if(age>=7) alerts.push({type:'warning',title:'Water test due',text:`Last test was ${age} days ago.`,action:`<button onclick="openPage('log')">Log Test</button>`});
    const attention=alerts.length?alerts.slice(0,6).map(a=>`<div class="aqxCareAlert ${a.type}"><div><strong>${esc(a.title)}</strong><span>${esc(a.text)}</span></div>${a.action||''}</div>`).join(''):'<div class="aqxCareAllGood"><strong>All clear for now</strong><span>No urgent dosing, equipment, job or testing alerts for this tank.</span></div>';
    const tasks=[...jobsAttention.slice(0,4).map(j=>({title:j.title||'Maintenance job',meta:(j.category||'Job')+' · '+(jobStatus(j)==='overdue'?'Overdue':jobStatus(j)==='today'?'Today':'Soon'),page:'jobs'})),...lowDosing.slice(0,2).map(p=>({title:'Check '+p.name,meta:'Dosing stock · '+(doseDaysLeft(p)||0)+' days left',page:'dosing'})),...equipDue.slice(0,2).map(e=>({title:'Service '+e.name,meta:'Equipment · '+(daysUntil(e.nextService)<0?'Overdue':'Due soon'),page:'care'}))].slice(0,5);
    const taskHtml=tasks.length?tasks.map(t=>`<button class="aqxCareTask" onclick="openPage('${esc(t.page)}')"><strong>${esc(t.title)}</strong><span>${esc(t.meta)}</span></button>`).join(''):'<div class="aqxCareAllGood compact"><strong>No tasks due today</strong><span>Your active tank care schedule is clear.</span></div>';
    const health=[
      {label:'Dosing',value:!dosing.length?'Not configured':(lowDosing.length?lowDosing.length+' low':'Active'),cls:!dosing.length?'none':(lowDosing.length?'warn':'good')},
      {label:'Equipment',value:!equipment.length?'Not setup':(equipDue.length?equipDue.length+' due':'Serviced'),cls:!equipment.length?'none':(equipDue.some(e=>daysUntil(e.nextService)<0)?'bad':(equipDue.length?'warn':'good'))},
      {label:'Jobs',value:!jobs.length?'None created':(jobsAttention.length?jobsAttention.length+' due':'Clear'),cls:!jobs.length?'none':(jobsAttention.some(j=>jobStatus(j)==='overdue')?'bad':(jobsAttention.length?'warn':'good'))},
      {label:'Testing',value:age===null?'No tests logged':(age>=7?'Due':age+'d ago'),cls:age===null?'none':(age>=7?'warn':'good')}
    ].map(h=>`<div class="aqxCareHealth ${h.cls}"><span>${esc(h.label)}</span><strong>${esc(h.value)}</strong></div>`).join('');
    return `<div class="aqxSmartCareDash">
      <div class="aqxSmartCareHero"><div><span class="aqxMiniKicker">Active Tank</span><h2>${esc(tank.name||'Tank')} Care Dashboard</h2><p>Daily attention, dosing stock, equipment service and jobs for this tank only.</p></div><button class="secondaryBtn" onclick="openPage('home')">Switch Tank</button></div>
      <div class="aqxCareHealthGrid">${health}</div>
      <div class="aqxCareDashGrid"><section><h3>Attention Needed</h3>${attention}</section><section><h3>Today’s Tasks</h3>${taskHtml}</section></div>
      <div class="aqxCareQuickRow"><button onclick="openPage('log')">Log Test</button><button onclick="openPage('dosing')">Dosing</button><button onclick="openPage('jobs')">Jobs</button><button onclick="document.getElementById('equipmentName').focus()">Equipment</button></div>
    </div>`;
  }
  function renderSmartCare(){
    const ctx=document.getElementById('aqxTankCareContext'); if(!ctx) return;
    ctx.innerHTML=buildDashboard();
    try{if(typeof window.renderEquipment==='function') window.renderEquipment();}catch(e){}
  }
  const previous=window.aqxRenderTankCare;
  window.aqxRenderTankCare=function(){try{if(typeof previous==='function') previous.apply(this,arguments);}catch(e){} renderSmartCare();};
  const oldOpen=window.openPage;
  if(typeof oldOpen==='function' && !oldOpen.__aqxSmartCareDashWrapped){
    const wrapped=function(page){const out=oldOpen.apply(this,arguments); if(page==='care') setTimeout(renderSmartCare,100); return out;};
    wrapped.__aqxSmartCareDashWrapped=true; window.openPage=wrapped;
  }
  const oldSwitch=window.aqxSwitchTank;
  if(typeof oldSwitch==='function' && !oldSwitch.__aqxSmartCareDashWrapped){
    const wrapped=function(id){const out=oldSwitch.apply(this,arguments); setTimeout(renderSmartCare,180); return out;};
    wrapped.__aqxSmartCareDashWrapped=true; window.aqxSwitchTank=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderSmartCare,900); setTimeout(renderSmartCare,1800);});
})();


/* AquoraX guided onboarding tour patch */
(function(){
  const TOUR_KEY='aquoraxOnboardingTourCompleteV1';
  const steps=[
    {page:'home',icon:'🌊',title:'Welcome to AquoraX',text:'Your complete aquarium management system. This quick tour shows where everything lives before you start using the app.'},
    {page:'home',icon:'🏠',title:'Home',text:'See all tanks, active tank summaries, alerts and quick access to the most important daily information.'},
    {page:'growth',icon:'🐠',title:'Tank Life',text:'Track the living side of each aquarium: fish, corals, inverts, plants, algae and growth progress.'},
    {page:'care',icon:'🛠️',title:'Tank Care',text:'Manage parameters, dosing countdowns, jobs, equipment maintenance and care alerts for the active tank.'},
    {page:'cycle',icon:'🧭',title:'Tank Journey',text:'Follow each tank\'s cycle journey, milestones and long-term progression separately.'},
    {page:'profile',icon:'✨',title:'Profile & Customisation',text:'Customise the look of AquoraX, manage settings, and replay this tour any time.'}
  ];
  let idx=0;
  function $(id){return document.getElementById(id)}
  function visibleWelcome(){const w=$('welcomeScreen'); return w && getComputedStyle(w).display!=='none';}
  function render(){
    const s=steps[idx]||steps[0];
    try{ if(typeof openPage==='function') openPage(s.page); }catch(e){}
    const step=$('aqxOnboardingStep'), icon=$('aqxOnboardingIcon'), title=$('aqxOnboardingTitle'), text=$('aqxOnboardingText'), bar=$('aqxOnboardingProgressBar'), next=$('aqxOnboardingNextBtn');
    if(step) step.textContent='Step '+(idx+1)+' of '+steps.length;
    if(icon) icon.textContent=s.icon;
    if(title) title.textContent=s.title;
    if(text) text.textContent=s.text;
    if(bar) bar.style.width=(((idx+1)/steps.length)*100)+'%';
    if(next) next.textContent=idx===steps.length-1?'Finish Tour':'Got it';
  }
  window.aqxStartOnboardingTour=function(force){
    if(!force && localStorage.getItem(TOUR_KEY)==='yes') return;
    if(!force && visibleWelcome()) return;
    idx=0;
    const o=$('aqxOnboardingTour'); if(!o) return;
    o.classList.add('show'); o.setAttribute('aria-hidden','false'); document.body.classList.add('aqxTourOpen');
    render();
  };
  window.aqxFinishOnboardingTour=function(){
    localStorage.setItem(TOUR_KEY,'yes');
    const o=$('aqxOnboardingTour'); if(o){o.classList.remove('show'); o.setAttribute('aria-hidden','true');}
    document.body.classList.remove('aqxTourOpen');
    try{openPage('home')}catch(e){}
  };
  window.aqxNextOnboardingStep=function(){
    if(idx>=steps.length-1){window.aqxFinishOnboardingTour(); return;}
    idx++; render();
  };
  window.aqxPrevOnboardingStep=function(){
    if(idx<=0) return;
    idx--; render();
  };
  window.aqxResetOnboardingTour=function(){
    localStorage.removeItem(TOUR_KEY);
    window.aqxStartOnboardingTour(true);
  };
  const oldEnter=window.enterApp;
  if(typeof oldEnter==='function' && !oldEnter.__aqxTourWrapped){
    const wrapped=function(){
      const out=oldEnter.apply(this,arguments);
      setTimeout(function(){try{window.aqxStartOnboardingTour(false)}catch(e){}},500);
      return out;
    };
    wrapped.__aqxTourWrapped=true;
    window.enterApp=wrapped;
  }
  function injectReplayButton(){
    const profile=$('profile'); if(!profile || $('aqxReplayTourCard')) return;
    const card=document.createElement('div');
    card.id='aqxReplayTourCard';
    card.className='card profileTourReplayCard';
    card.innerHTML='<h2>App Tour</h2><p>Replay the guided AquoraX walkthrough for Home, Tank Life, Tank Care, Tank Journey and Profile.</p><button onclick="aqxStartOnboardingTour(true)">Replay App Tour</button>';
    const first=profile.querySelector('.card');
    if(first && first.parentNode) first.parentNode.insertBefore(card, first.nextSibling); else profile.prepend(card);
  }
  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(injectReplayButton,700);
    setTimeout(function(){try{window.aqxStartOnboardingTour(false)}catch(e){}},1200);
  });
})();

/* AquoraX guides clickable detail patch */
(function(){
  const guideData = {
    "getting-started": {
      title: "Getting Started",
      tag: "Beginner Guide",
      intro: "Start simple, keep the tank stable, and avoid rushing livestock. AquoraX is built to guide each tank separately as your system matures.",
      sections: [
        ["What this guide covers", "Choosing freshwater or marine, setting up the basics, adding your first tank in AquoraX, and avoiding early mistakes."],
        ["First steps", "Add your tank, enter the volume, choose the tank type, then use Tank Care to begin logging tests and maintenance."],
        ["Common mistakes", "Adding livestock too early, changing too much at once, ignoring test results, or copying another tank without understanding your own system."],
        ["AquoraX tip", "Use Home for your overview, Tank Care for maintenance, Tank Life for livestock, and Tank Journey for cycle and progress." ]
      ]
    },
    "cycling-your-tank": {
      title: "Cycling Your Tank",
      tag: "Tank Journey Guide",
      intro: "Cycling builds the bacteria that process waste. The aim is for ammonia and nitrite to be safely controlled before the tank is stocked.",
      sections: [
        ["What to watch", "Ammonia normally appears first, nitrite can follow, and nitrate usually rises as the cycle matures."],
        ["What to do", "Test regularly, avoid rushing livestock, and use Tank Journey to track the cycle for the active tank."],
        ["When it is safer", "A tank is generally safer when ammonia and nitrite stay at zero and nitrate is manageable for the type of aquarium."],
        ["AquoraX tip", "Each tank has its own Tank Journey, so a new frag tank or freshwater tank can cycle separately from your main display." ]
      ]
    },
    "water-testing": {
      title: "Water Testing",
      tag: "Tank Care Guide",
      intro: "Testing is about spotting trends, not chasing perfect numbers every day. Stability is usually more important than sudden corrections.",
      sections: [
        ["Core tests", "Freshwater users often track ammonia, nitrite, nitrate, pH and temperature. Reef users often add salinity, alkalinity, calcium, magnesium and phosphate."],
        ["Best practice", "Test at similar times where possible, record results straight away, and look at trends before making large changes."],
        ["Common mistakes", "Reacting too aggressively to one result, using expired test kits, or failing to compare results against livestock behaviour."],
        ["AquoraX tip", "Log tests in Tank Care so graphs, summaries and future smart alerts can understand each tank separately." ]
      ]
    },
    "coral-plant-care": {
      title: "Coral & Plant Care",
      tag: "Tank Life Guide",
      intro: "Corals and plants both respond to stability, light, nutrients and flow. The exact needs depend on the species and tank type.",
      sections: [
        ["Coral basics", "Start with hardy corals, place them carefully, avoid sudden lighting changes, and watch extension, colour and tissue health."],
        ["Plant basics", "Healthy plants need suitable light, nutrients and consistent maintenance. Growth changes can show when something is missing."],
        ["What to track", "Use Tank Life to record livestock, photos, notes and growth so you can see changes over time."],
        ["AquoraX tip", "Keep coral, plant, fish and invert records inside the active tank so every aquarium has its own living history." ]
      ]
    }
  };

  function escapeHTML(v){
    return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  window.aqxOpenGuide = function(id){
    const guide = guideData[id];
    const box = document.getElementById('aqxGuideDetail');
    if(!guide || !box) return;
    const sections = guide.sections.map(([h,p]) => `
      <div class="aqxGuideSection">
        <h3>${escapeHTML(h)}</h3>
        <p>${escapeHTML(p)}</p>
      </div>
    `).join('');
    box.innerHTML = `
      <div class="aqxGuideDetailTop">
        <span>${escapeHTML(guide.tag)}</span>
        <button class="secondaryBtn" onclick="aqxCloseGuide()">Close</button>
      </div>
      <h2>${escapeHTML(guide.title)}</h2>
      <p>${escapeHTML(guide.intro)}</p>
      ${sections}
    `;
    box.style.display = 'block';
    setTimeout(() => box.scrollIntoView({behavior:'smooth', block:'start'}), 50);
  };

  window.aqxCloseGuide = function(){
    const box = document.getElementById('aqxGuideDetail');
    if(box){ box.style.display='none'; box.innerHTML=''; }
  };
})();

/* AquoraX smart guide recommendations patch */
(function(){
  const aqxGuideSuggestions = [
    {
      id:"cycling-your-tank",
      title:"Cycling Your Tank",
      match:function(latest){
        return !latest || (Number(latest.ammonia||0) > 0.1 || Number(latest.nitrite||0) > 0.1);
      },
      reason:"Your readings suggest the tank may still be cycling or biologically unstable."
    },
    {
      id:"water-testing",
      title:"Water Testing",
      match:function(latest){
        return Number(latest.nitrate||0) > 20 || Number(latest.phosphate||0) > 0.10;
      },
      reason:"AquoraX detected elevated nutrients, so testing consistency and trend tracking are important right now."
    },
    {
      id:"coral-plant-care",
      title:"Coral & Plant Care",
      match:function(latest){
        return Number(latest.calcium||0) < 400 || Number(latest.magnesium||0) < 1250 || Number(latest.alkalinity||0) < 7;
      },
      reason:"Some coral-supporting parameters look lower than ideal for long-term stability."
    },
    {
      id:"getting-started",
      title:"Getting Started",
      match:function(latest, tests){
        return !tests.length;
      },
      reason:"No parameter history has been logged yet, so this is the best place to begin."
    }
  ];

  window.aqxRenderSmartGuideRecommendations = function(){
    const box = document.getElementById("aqxSmartGuideRecommendations");
    if(!box) return;

    const tests = (typeof getParameterTests === "function" ? getParameterTests() : []);
    const latest = tests[tests.length - 1] || {};
    const matched = aqxGuideSuggestions.filter(g => {
      try{return g.match(latest, tests);}catch(e){return false;}
    });

    const guides = matched.length ? matched.slice(0,3) : [{
      id:"water-testing",
      title:"Water Testing",
      reason:"Your latest saved readings look fairly stable. Keep testing consistently and monitoring trends."
    }];

    box.innerHTML = `
      <div class="aqxSmartGuideHeader">
        <div>
          <span class="aqxMiniKicker">Smart Guide Suggestions</span>
          <h2>Recommended For Your Tank</h2>
        </div>
      </div>

      <div class="aqxSmartGuideList">
        ${guides.map(g => `
          <button class="card aqxSmartGuideCard" onclick="aqxOpenGuide('${g.id}')">
            <div class="aqxSmartGuideTop">
              <strong>${g.title}</strong>
              <span>Open Guide</span>
            </div>
            <p>${g.reason}</p>
          </button>
        `).join("")}
      </div>
    `;
  };

  document.addEventListener("DOMContentLoaded", function(){
    const grid = document.querySelector(".aqxGuideGrid");
    if(grid && !document.getElementById("aqxSmartGuideRecommendations")){
      const wrap = document.createElement("div");
      wrap.id = "aqxSmartGuideRecommendations";
      wrap.className = "card aqxSmartGuideRecommendations";
      grid.parentNode.insertBefore(wrap, grid);
    }

    setTimeout(function(){
      try{aqxRenderSmartGuideRecommendations();}catch(e){}
    }, 400);
  });

  const oldSave = window.saveParameters;
  if(typeof oldSave === "function" && !oldSave.__aqxGuideWrapped){
    const wrapped = function(){
      const out = oldSave.apply(this, arguments);
      setTimeout(function(){
        try{aqxRenderSmartGuideRecommendations();}catch(e){}
      }, 250);
      return out;
    };
    wrapped.__aqxGuideWrapped = true;
    window.saveParameters = wrapped;
  }
})();

/* AQUORAX WATER TYPE SWITCHER — per tank freshwater / saltwater parameter mode */
(function(){
  const TANKS_KEY = 'aquoraxTanksV1';
  const ACTIVE_KEY = 'aquoraxActiveTankIdV1';
  const reefOnlyInputIds = ['logSalinity','logAlk','logCalcium','logMagnesium'];
  const reefOnlyCycleIds = ['salinityBox'];

  function safeJson(raw, fallback){
    try{ const v = JSON.parse(raw || ''); return v == null ? fallback : v; }catch(e){ return fallback; }
  }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function tanks(){
    const list = safeJson(localStorage.getItem(TANKS_KEY), []);
    return Array.isArray(list) ? list : [];
  }
  function writeTanks(list){ localStorage.setItem(TANKS_KEY, JSON.stringify(list || [])); }
  function activeTank(){
    const list = tanks();
    const id = localStorage.getItem(ACTIVE_KEY);
    return list.find(t => t.id === id) || list[0] || null;
  }
  function normalType(type){ return type === 'freshwater' ? 'freshwater' : 'reef'; }
  function typeLabel(type){ return normalType(type) === 'reef' ? 'Salt Water / Reef' : 'Fresh Water'; }
  function currentType(){
    try{ if(typeof window.selectedTankType === 'function') return normalType(window.selectedTankType()); }catch(e){}
    const active = activeTank();
    return normalType((active && active.type) || localStorage.getItem('aquoraxTankType') || 'freshwater');
  }
  function syncLegacy(type){
    localStorage.setItem('aquoraxTankType', type);
    localStorage.setItem('aquoraxWelcomeTank', type);
    const tankTypeSelect = document.getElementById('tankTypeSelect');
    const cycleTank = document.getElementById('cycleTank');
    if(tankTypeSelect) tankTypeSelect.value = type;
    if(cycleTank) cycleTank.value = type;
  }
  function updateActiveTankType(type){
    type = normalType(type);
    const list = tanks();
    const active = activeTank();
    if(active){
      const found = list.find(t => t.id === active.id);
      if(found) found.type = type;
      writeTanks(list);
    }
    syncLegacy(type);
  }
  function clearReefOnlyLogValues(){
    reefOnlyInputIds.forEach(id => {
      const input = document.getElementById(id);
      if(input) input.value = '';
    });
  }
  function setFieldGroup(inputId, reefOnly){
    const input = document.getElementById(inputId);
    if(!input) return;
    const wrap = input.closest('.formGrid > div') || input.parentElement;
    if(wrap) wrap.classList.toggle('aqxReefOnlyField', !!reefOnly);
  }
  function decorateFields(){
    reefOnlyInputIds.forEach(id => setFieldGroup(id, true));
  }
  function renderSwitcherHtml(context){
    const type = currentType();
    const active = activeTank();
    const name = (active && active.name) || 'Active Tank';
    return `
      <div class="aqxWaterTypeHead">
        <div>
          <span class="aqxMiniKicker">${esc(name)}</span>
          <h2>Water Type</h2>
          <p>${type === 'reef' ? 'Salt water mode is showing reef parameters including SG, alkalinity, calcium and magnesium.' : 'Fresh water mode hides reef-only tests so logging stays clean.'}</p>
        </div>
      </div>
      <div class="aqxWaterTypeSwitch" role="group" aria-label="Choose water type">
        <button type="button" class="${type === 'reef' ? 'active' : ''}" onclick="aqxSetActiveWaterType('reef')">Salt Water</button>
        <button type="button" class="${type === 'freshwater' ? 'active' : ''}" onclick="aqxSetActiveWaterType('freshwater')">Fresh Water</button>
      </div>
      <div class="aqxWaterTypeNote">Current test mode: <strong>${typeLabel(type)}</strong>${context === 'log' && type === 'freshwater' ? ' · Reef-only inputs are hidden for this tank.' : ''}</div>
    `;
  }
  function ensureLogSwitcher(){
    const page = document.getElementById('log');
    const card = page ? page.querySelector('.card') : null;
    if(!card) return;
    let box = document.getElementById('aqxLogWaterTypeSwitcher');
    if(!box){
      box = document.createElement('div');
      box.id = 'aqxLogWaterTypeSwitcher';
      box.className = 'aqxWaterTypeCard';
      card.insertBefore(box, card.firstElementChild || null);
    }
    box.innerHTML = renderSwitcherHtml('log');
  }
  function ensureHomeSwitcher(){
    const host = document.getElementById('aqxMultiTankHome');
    if(!host) return;
    let box = document.getElementById('aqxHomeWaterTypeSwitcher');
    if(!box){
      box = document.createElement('div');
      box.id = 'aqxHomeWaterTypeSwitcher';
      box.className = 'card aqxHomeWaterTypeSwitcher requiresCycleComplete';
      host.parentNode.insertBefore(box, host.nextSibling);
    }
    box.innerHTML = renderSwitcherHtml('home');
  }
  function applyVisibility(){
    const type = currentType();
    const isReef = type === 'reef';
    decorateFields();
    document.body.classList.toggle('aqxFreshwaterMode', !isReef);
    document.body.classList.toggle('aqxReefMode', isReef);
    reefOnlyCycleIds.forEach(id => {
      const item = document.getElementById(id);
      if(item) item.style.display = isReef ? '' : 'none';
    });
    if(!isReef) clearReefOnlyLogValues();
    ensureLogSwitcher();
    ensureHomeSwitcher();
  }
  function refreshAll(){
    applyVisibility();
    try{ if(typeof updateWelcomeTankButtons === 'function') updateWelcomeTankButtons(); }catch(e){}
    try{ if(typeof updateTankSummary === 'function') updateTankSummary(); }catch(e){}
    try{ if(typeof updateCycle === 'function') updateCycle(); }catch(e){}
    try{ if(typeof renderParameterPage === 'function') renderParameterPage(); }catch(e){}
    try{ if(typeof renderHomeDashboard === 'function') renderHomeDashboard(); }catch(e){}
    try{ if(typeof renderTestHistory === 'function') renderTestHistory(); }catch(e){}
    try{ if(typeof drawParameterTrendGraph === 'function') drawParameterTrendGraph(); }catch(e){}
    try{ if(typeof aqxRenderHomeParameterCustomiser === 'function') aqxRenderHomeParameterCustomiser(); }catch(e){}
    try{ if(typeof aqxRenderHomeLayoutCustomiser === 'function') aqxRenderHomeLayoutCustomiser(); }catch(e){}
  }

  window.aqxSetActiveWaterType = function(type){
    type = normalType(type);
    updateActiveTankType(type);
    if(type === 'freshwater') clearReefOnlyLogValues();
    refreshAll();
    try{
      if(typeof window.aqxSavingFeedback === 'function') window.aqxSavingFeedback('Saving tank type…','Updating visible parameters for this tank.','Water type saved ✅');
      else if(typeof showSavingOverlay === 'function') showSavingOverlay('Water type saved','This tank is now set to '+typeLabel(type));
    }catch(e){}
  };

  const oldSaveParameterTest = window.saveParameterTest;
  if(typeof oldSaveParameterTest === 'function' && !oldSaveParameterTest.__aqxWaterTypeWrapped){
    const wrapped = function(){
      if(currentType() !== 'reef') clearReefOnlyLogValues();
      return oldSaveParameterTest.apply(this, arguments);
    };
    wrapped.__aqxWaterTypeWrapped = true;
    window.saveParameterTest = wrapped;
  }

  const oldSaveCycle = window.saveCycle;
  if(typeof oldSaveCycle === 'function' && !oldSaveCycle.__aqxWaterTypeWrapped){
    const wrapped = function(){
      const cycleTank = document.getElementById('cycleTank');
      if(cycleTank && cycleTank.value) updateActiveTankType(cycleTank.value);
      const out = oldSaveCycle.apply(this, arguments);
      applyVisibility();
      return out;
    };
    wrapped.__aqxWaterTypeWrapped = true;
    window.saveCycle = wrapped;
  }

  const oldSaveTank = window.saveTank;
  if(typeof oldSaveTank === 'function' && !oldSaveTank.__aqxWaterTypeWrapped){
    const wrapped = function(){
      const tankTypeSelect = document.getElementById('tankTypeSelect');
      if(tankTypeSelect && tankTypeSelect.value) updateActiveTankType(tankTypeSelect.value);
      const out = oldSaveTank.apply(this, arguments);
      applyVisibility();
      return out;
    };
    wrapped.__aqxWaterTypeWrapped = true;
    window.saveTank = wrapped;
  }

  const oldSwitchTank = window.aqxSwitchTank;
  if(typeof oldSwitchTank === 'function' && !oldSwitchTank.__aqxWaterTypeWrapped){
    const wrapped = function(){
      const out = oldSwitchTank.apply(this, arguments);
      setTimeout(refreshAll, 120);
      return out;
    };
    wrapped.__aqxWaterTypeWrapped = true;
    window.aqxSwitchTank = wrapped;
  }

  const oldOpenPage = window.openPage;
  if(typeof oldOpenPage === 'function' && !oldOpenPage.__aqxWaterTypeWrapped){
    const wrapped = function(page){
      const out = oldOpenPage.apply(this, arguments);
      setTimeout(applyVisibility, 80);
      return out;
    };
    wrapped.__aqxWaterTypeWrapped = true;
    window.openPage = wrapped;
  }

  document.addEventListener('change', function(e){
    if(e.target && e.target.id === 'tankTypeSelect') window.aqxSetActiveWaterType(e.target.value);
    if(e.target && e.target.id === 'cycleTank') window.aqxSetActiveWaterType(e.target.value);
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(refreshAll, 300);
    setTimeout(refreshAll, 1100);
  });
  setTimeout(refreshAll, 700);
})();


// === AquoraX Simplified UX Patch ===
(function(){
  const KEY='aquorax_simple_mode_v1';
  const pageHelp={
    home:['Home','This is your control centre. Start here, then choose one clear action.'],
    growth:['Livestock','Animals, plants, corals, inverts and algae for the active tank.'],
    care:['Care','Water tests, dosing, jobs and equipment maintenance live here.'],
    cycle:['Journey','Cycling, milestones and long-term tank progress live here.'],
    profile:['Settings','App look, customisation, backups, tour replay and account tools live here.'],
    guides:['Guides','Readable aquarium help and smart recommendations.'],
    log:['Test water','Save a new set of readings for the active tank.'],
    jobs:['Jobs','Water changes, testing, cleaning and reminders.'],
    dosing:['Dosing','Manual dosing, auto dosing countdowns, inventory and ICP records.'],
    parameters:['Parameters','Latest readings and target ranges for the active tank type.'],
    history:['History','Older test results and trends for the active tank.'],
    graphs:['Graphs','Advanced trends for people who want deeper detail.']
  };
  function setText(sel,txt){document.querySelectorAll(sel).forEach(el=>{ if(el && el.textContent.trim()) el.textContent=txt; });}
  function renameLabels(){
    const map={growth:'Livestock',care:'Care',cycle:'Journey',profile:'Settings',home:'Home'};
    Object.keys(map).forEach(id=>{
      const b=document.getElementById('nav-'+id); if(b) b.textContent=map[id];
    });
    document.querySelectorAll('button').forEach(b=>{
      const t=(b.textContent||'').trim();
      if(t==='Tank Life') b.textContent='Livestock';
      if(t==='Tank Care') b.textContent='Care';
      if(t==='Tank Journey') b.textContent='Journey';
      if(t==='Profile') b.textContent='Settings';
      if(t==='Home Dashboard') b.textContent='Home';
    });
  }
  function helperFor(page){
    const data=pageHelp[page]; if(!data) return;
    const panel=document.getElementById(page); if(!panel || panel.querySelector('.aqxPageHelper')) return;
    const header=panel.querySelector('.pageHeader'); if(!header) return;
    const div=document.createElement('div');
    div.className='aqxPageHelper';
    div.innerHTML='<strong>'+data[0]+'</strong><span>'+data[1]+'</span>';
    header.insertAdjacentElement('afterend',div);
  }
  function applyMode(){
    const simple=localStorage.getItem(KEY)!=='advanced';
    document.body.classList.toggle('aqxSimpleMode',simple);
    const btn=document.getElementById('aqxSimpleModeBtn');
    if(btn) btn.textContent=simple?'Simple Mode: On':'Advanced Mode: On';
  }
  window.aqxToggleSimpleMode=function(){
    const simple=localStorage.getItem(KEY)!=='advanced';
    localStorage.setItem(KEY,simple?'advanced':'simple');
    applyMode();
    try{ if(navigator.vibrate) navigator.vibrate(10); }catch(e){}
  };
  function refresh(){
    renameLabels();
    Object.keys(pageHelp).forEach(helperFor);
    applyMode();
  }
  const oldOpen=window.openPage;
  if(typeof oldOpen==='function' && !oldOpen.__aqxSimpleUxWrapped){
    const wrapped=function(page){ const out=oldOpen.apply(this,arguments); setTimeout(refresh,50); return out; };
    wrapped.__aqxSimpleUxWrapped=true; window.openPage=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){ setTimeout(refresh,100); setTimeout(refresh,900); });
  setTimeout(refresh,300);
})();


/* AquoraX Parameter-First Home UX patch
   Makes water parameters the centre of Home, keeps all systems underneath, and hides setup/admin panels from the main view. */
(function(){
  function move(el, parent, before){ if(el && parent){ parent.insertBefore(el, before || null); } }
  function parameterFirstLayout(){
    const home=document.getElementById('home'); if(!home) return;
    const header=home.querySelector('.homeBrandHeader');
    const params=home.querySelector('.parameterHero');
    const tank=document.getElementById('aqxMultiTankHome');
    const quick=document.getElementById('aqxSimpleCommandCard');
    const water=document.getElementById('aqxHomeWaterTypeSwitcher');
    const insights=document.getElementById('homeSmartInsightsCard');
    const jobs=document.getElementById('homeJobsCard');
    const ai=document.getElementById('homeAiGuidanceCard');
    const more=home.querySelector('.aqxMoreHomeTools');

    if(params && header) move(params, home, header.nextSibling);
    if(tank && params) move(tank, home, params.nextSibling);
    if(insights && tank) move(insights, home, tank.nextSibling);
    if(jobs && insights) move(jobs, home, insights.nextSibling);
    if(ai && jobs) move(ai, home, jobs.nextSibling);
    if(more) home.appendChild(more);

    if(quick) quick.classList.add('aqxVisuallyReducedHomeTool');
    if(water) water.classList.add('aqxWaterTypeMovedOffHome');

    const details=params?params.querySelector('details.aqxHomeDisclosure'):null;
    if(details){ details.open=true; details.classList.add('aqxParamsAlwaysOpen'); }
    const summary=details?details.querySelector('summary'):null;
    if(summary) summary.textContent='Full live parameter dashboard';

    const title=document.getElementById('homeParameterTitle');
    if(title && !title.dataset.aqxParamFirst){
      title.dataset.aqxParamFirst='1';
      title.textContent=title.textContent.replace('Saltwater / Reef Parameters','Water Parameters').replace('Freshwater Parameters','Water Parameters');
    }
    const subtitle=document.getElementById('homeParameterSummary');
    if(subtitle && !subtitle.dataset.aqxParamFirst){
      subtitle.dataset.aqxParamFirst='1';
      subtitle.textContent='This is the main dashboard for the active tank. Log a test and AquoraX will update these readings.';
    }
  }

  const oldRender=window.renderHomeDashboard;
  if(typeof oldRender==='function' && !oldRender.__aqxParameterFirst){
    const wrapped=function(){
      const out=oldRender.apply(this, arguments);
      setTimeout(parameterFirstLayout,0);
      return out;
    };
    wrapped.__aqxParameterFirst=true;
    window.renderHomeDashboard=wrapped;
  }
  const oldTank=window.renderTankOverview;
  if(typeof oldTank==='function' && !oldTank.__aqxParameterFirst){
    const wrappedTank=function(){
      const out=oldTank.apply(this, arguments);
      setTimeout(parameterFirstLayout,0);
      return out;
    };
    wrappedTank.__aqxParameterFirst=true;
    window.renderTankOverview=wrappedTank;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(parameterFirstLayout,60);
    setTimeout(parameterFirstLayout,300);
  });
  window.aqxParameterFirstLayout=parameterFirstLayout;
})();

/* === AQUORAX FINAL FIX: keep Home parameter custom shapes while layering smart glow === */
(function(){
  const PREF_KEY='aquoraxHomeParameterPrefs';
  const SHAPES=['rectangle','square','circle'];
  function readPrefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){return {};}}
  function currentShape(){
    const s=String(readPrefs().globalTileStyle||'rectangle').toLowerCase();
    return SHAPES.includes(s)?s:'rectangle';
  }
  function statusOf(card){
    if(card.classList.contains('paramCardBad')) return 'bad';
    if(card.classList.contains('paramCardWatch')) return 'watch';
    if(card.classList.contains('paramCardGood')) return 'good';
    if(card.classList.contains('paramCardActive')) return 'active';
    return 'none';
  }
  function glow(status){
    if(status==='bad') return {border:'rgba(255,80,95,.72)',shadow:'0 0 40px rgba(255,80,95,.36), inset 0 0 26px rgba(255,80,95,.065)'};
    if(status==='watch') return {border:'rgba(255,183,77,.68)',shadow:'0 0 34px rgba(255,183,77,.30), inset 0 0 24px rgba(255,183,77,.055)'};
    if(status==='good') return {border:'rgba(99,247,163,.52)',shadow:'0 0 30px rgba(99,247,163,.24), inset 0 0 22px rgba(99,247,163,.045)'};
    if(status==='active') return {border:'rgba(73,207,255,.48)',shadow:'0 0 26px rgba(73,207,255,.20), inset 0 0 20px rgba(73,207,255,.035)'};
    return {border:'rgba(155,170,185,.24)',shadow:'0 0 18px rgba(155,170,185,.08), inset 0 0 16px rgba(255,255,255,.018)'};
  }
  function applyFinalHomeParameterLayer(){
    const grid=document.getElementById('homeParameterLiveGrid');
    if(!grid) return;
    const shape=currentShape();
    grid.classList.remove('aqxFinalShapeRectangle','aqxFinalShapeSquare','aqxFinalShapeCircle');
    grid.classList.add('aqxFinalShape'+shape.charAt(0).toUpperCase()+shape.slice(1));
    grid.classList.add('aqxPanelStyle-'+shape,'aqxResponsiveShape'+shape.charAt(0).toUpperCase()+shape.slice(1));
    grid.querySelectorAll('.paramLiveCard').forEach(card=>{
      card.dataset.aqxFinalShape=shape;
      card.classList.remove('aqxParamTileRound','aqxParamTileGlow','aqxParamTileGlass');
      const g=glow(statusOf(card));
      card.style.setProperty('border-color',g.border,'important');
      card.style.setProperty('box-shadow',g.shadow,'important');
      if(shape==='circle'){
        card.style.setProperty('aspect-ratio','1 / 1','important');
        card.style.setProperty('width','min(100%,156px)','important');
        card.style.setProperty('height','auto','important');
        card.style.setProperty('min-height','0','important');
        card.style.setProperty('border-radius','50%','important');
        card.style.setProperty('display','flex','important');
        card.style.setProperty('flex-direction','column','important');
        card.style.setProperty('align-items','center','important');
        card.style.setProperty('justify-content','center','important');
        card.style.setProperty('text-align','center','important');
        card.style.setProperty('justify-self','center','important');
        card.style.setProperty('overflow','hidden','important');
      }else if(shape==='square'){
        card.style.setProperty('aspect-ratio','1 / 1','important');
        card.style.setProperty('width','100%','important');
        card.style.setProperty('height','auto','important');
        card.style.setProperty('min-height','0','important');
        card.style.setProperty('border-radius','16px','important');
      }else{
        card.style.setProperty('aspect-ratio','auto','important');
        card.style.setProperty('width','100%','important');
        card.style.setProperty('min-height','126px','important');
        card.style.setProperty('border-radius',(readPrefs().radius||20)+'px','important');
      }
    });
  }
  const oldRender=window.renderHomeDashboard;
  if(typeof oldRender==='function' && !oldRender.__aqxFinalShapeGlowLayer){
    const wrapped=function(){const out=oldRender.apply(this,arguments); setTimeout(applyFinalHomeParameterLayer,0); setTimeout(applyFinalHomeParameterLayer,140); return out;};
    wrapped.__aqxFinalShapeGlowLayer=true;
    window.renderHomeDashboard=wrapped;
  }
  const oldSet=window.aqxSetHomeGlobalStyle;
  window.aqxSetHomeGlobalStyle=function(style){
    try{ if(typeof oldSet==='function') oldSet.apply(this,arguments); }catch(e){}
    const p=readPrefs(); p.globalTileStyle=SHAPES.includes(String(style).toLowerCase())?String(style).toLowerCase():'rectangle';
    try{localStorage.setItem(PREF_KEY,JSON.stringify(p));}catch(e){}
    setTimeout(applyFinalHomeParameterLayer,0); setTimeout(applyFinalHomeParameterLayer,160);
  };
  document.addEventListener('DOMContentLoaded',function(){setTimeout(applyFinalHomeParameterLayer,350); setTimeout(applyFinalHomeParameterLayer,1100);});
  document.addEventListener('click',function(e){
    if(e.target.closest('#aqxHomeStyleButtons button') || e.target.closest('[onclick*="aqxSetHomeGlobalStyle"]')){
      setTimeout(applyFinalHomeParameterLayer,90); setTimeout(applyFinalHomeParameterLayer,260);
    }
  },true);
  window.aqxApplyFinalHomeParameterLayer=applyFinalHomeParameterLayer;
})();

/* === AquoraX Jobs Persistence Hard Fix — tank-scoped direct storage === */
(function(){
  const JOB_KEY='aquoraxJobsV1';
  const DONE_KEY='aquoraxJobsDoneV1';
  let currentFilter='all';
  function el(id){return document.getElementById(id);}
  function val(id){const x=el(id); return x?x.value:'';}
  function pad(n){return String(n).padStart(2,'0');}
  function todayDate(){const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function nowLocalIso(){const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank'};}catch(e){return {id:'tank_main',name:'Main Tank'};}}
  function scopedKey(base){try{return window.aqxScopedKey?window.aqxScopedKey(base,activeTank().id):(base+'__'+activeTank().id);}catch(e){return base+'__tank_main';}}
  function readList(base){
    const sk=scopedKey(base);
    try{
      let raw=localStorage.getItem(sk);
      if(raw==null){ raw=localStorage.getItem(base); if(raw!=null) localStorage.setItem(sk,raw); }
      const arr=JSON.parse(raw||'[]');
      return Array.isArray(arr)?arr:[];
    }catch(e){return [];}
  }
  function writeList(base,items){
    const arr=Array.isArray(items)?items:[];
    try{
      const raw=JSON.stringify(arr);
      localStorage.setItem(scopedKey(base),raw);
      localStorage.setItem(base,raw); // keep older dashboard functions in sync for current active tank
      if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup(base===JOB_KEY?'jobs':'jobsDone');
    }catch(e){console.warn('AquoraX jobs save failed',e);}
  }
  function dueDateTime(job){return new Date((job.dueDate||todayDate())+'T'+(job.dueTime||'09:00'));}
  function statusOf(job){
    const due=dueDateTime(job), now=new Date();
    const dueDay=job.dueDate||'', today=todayDate();
    if(due < now && dueDay < today) return 'overdue';
    if(due < now && dueDay === today) return 'dueSoon';
    if(dueDay === today) return 'dueToday';
    return 'upcoming';
  }
  function statusLabel(s){return s==='overdue'?'Overdue':(s==='dueToday'||s==='dueSoon'?'Due Today':'Upcoming');}
  function addDays(date,days){const d=new Date(date.getTime()); d.setDate(d.getDate()+days); return d;}
  function addMonths(date,months){const d=new Date(date.getTime()); d.setMonth(d.getMonth()+months); return d;}
  function dateToInput(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function nextDue(job){
    const base=dueDateTime(job);
    if(job.repeat==='daily') return dateToInput(addDays(base,1));
    if(job.repeat==='weekly') return dateToInput(addDays(base,7));
    if(job.repeat==='fortnightly') return dateToInput(addDays(base,14));
    if(job.repeat==='monthly') return dateToInput(addMonths(base,1));
    return null;
  }
  function mirrorActiveToLegacy(){writeList(JOB_KEY,readList(JOB_KEY)); writeList(DONE_KEY,readList(DONE_KEY));}
  function enhanceHeader(){
    const page=el('jobs'); if(!page) return;
    let card=el('aqxJobsTankContext');
    if(!card){card=document.createElement('div'); card.id='aqxJobsTankContext'; card.className='card aqxJobsTankContext'; const first=page.querySelector('.pageHeader')||page.firstElementChild; if(first&&first.parentNode) first.parentNode.insertBefore(card,first.nextSibling); else page.prepend(card);}
    const t=activeTank();
    card.innerHTML='<div class="aqxJobsTankTop"><div><span class="aqxMiniKicker">Active Tank</span><h2>'+esc(t.name||'Tank')+'</h2><p>Jobs and completed maintenance shown here are linked only to this tank.</p></div><button class="secondaryBtn" onclick="openPage(\'home\')">Switch Tank</button></div>';
  }
  window.aqxSetJobsFilter=function(filter){currentFilter=filter||'all'; window.aqxRenderJobs();};
  window.aqxQuickJob=function(title,cat,repeat){
    const date=el('jobDueDate'), time=el('jobDueTime'), name=el('jobTitle'), category=el('jobCategory'), rep=el('jobRepeat');
    if(name) name.value=title||''; if(category) category.value=cat||'Custom'; if(rep) rep.value=repeat||'none'; if(date) date.value=todayDate(); if(time) time.value='09:00';
  };
  window.aqxAddJob=function(){
    const title=(val('jobTitle')||'').trim();
    if(!title){alert('Add a job name first.'); return;}
    const job={id:'job_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), tankId:activeTank().id, title:title, category:val('jobCategory')||'Custom', dueDate:val('jobDueDate')||todayDate(), dueTime:val('jobDueTime')||'09:00', repeat:val('jobRepeat')||'none', notes:(val('jobNotes')||'').trim(), created:nowLocalIso()};
    const jobs=readList(JOB_KEY); jobs.push(job); writeList(JOB_KEY,jobs);
    ['jobTitle','jobNotes'].forEach(function(id){const x=el(id); if(x) x.value='';});
    window.aqxRenderJobs(); window.aqxRenderHomeJobs();
    try{ if(typeof window.aqxRenderTankCare==='function') window.aqxRenderTankCare(); }catch(e){}
    if(typeof showSavingOverlay==='function') showSavingOverlay('Job saved');
  };
  window.aqxCompleteJob=function(id){
    const jobs=readList(JOB_KEY); const job=jobs.find(function(j){return j.id===id;}); if(!job) return;
    const done=readList(DONE_KEY); done.unshift({id:'done_'+Date.now(), tankId:activeTank().id, title:job.title, category:job.category, completed:nowLocalIso(), notes:job.notes||'', repeat:job.repeat||'none'}); writeList(DONE_KEY,done.slice(0,50));
    const next=nextDue(job); const updated=next?jobs.map(function(j){return j.id===id?Object.assign({},j,{dueDate:next}):j;}):jobs.filter(function(j){return j.id!==id;});
    writeList(JOB_KEY,updated); window.aqxRenderJobs(); window.aqxRenderHomeJobs(); try{ if(typeof window.aqxRenderTankCare==='function') window.aqxRenderTankCare(); }catch(e){}
    if(typeof showSavingOverlay==='function') showSavingOverlay(next?'Job completed — next reminder set':'Job completed');
  };
  window.aqxDeleteJob=function(id){
    if(!confirm('Remove this job?')) return;
    writeList(JOB_KEY,readList(JOB_KEY).filter(function(j){return j.id!==id;})); window.aqxRenderJobs(); window.aqxRenderHomeJobs(); try{ if(typeof window.aqxRenderTankCare==='function') window.aqxRenderTankCare(); }catch(e){}
  };
  window.aqxClearCompletedJobs=function(){ if(!confirm('Clear completed job log?')) return; writeList(DONE_KEY,[]); window.aqxRenderJobs(); };
  window.aqxRenderJobs=function(){
    mirrorActiveToLegacy(); enhanceHeader();
    const jobs=readList(JOB_KEY).sort(function(a,b){return dueDateTime(a)-dueDateTime(b);});
    const dueToday=jobs.filter(function(j){return ['dueToday','dueSoon'].includes(statusOf(j));}).length;
    const overdue=jobs.filter(function(j){return statusOf(j)==='overdue';}).length;
    const setText=function(id,t){const x=el(id); if(x) x.textContent=t;};
    setText('jobsDueTodayCount',dueToday); setText('jobsOverdueCount',overdue); setText('jobsTotalCount',jobs.length);
    ['all','due','overdue'].forEach(function(f){const b=el('jobsFilter'+f.charAt(0).toUpperCase()+f.slice(1)); if(b) b.classList.toggle('active',currentFilter===f);});
    const box=el('jobsList');
    if(box){
      let view=jobs;
      if(currentFilter==='due') view=jobs.filter(function(j){return ['dueToday','dueSoon'].includes(statusOf(j));});
      if(currentFilter==='overdue') view=jobs.filter(function(j){return statusOf(j)==='overdue';});
      box.innerHTML=view.length?view.map(function(job){const st=statusOf(job); return '<div class="jobCard '+(st==='overdue'?'overdue':(st==='dueSoon'||st==='dueToday'?'dueSoon':''))+'"><div class="jobTop"><div><strong>'+esc(job.title)+'</strong><div class="jobMeta">'+esc(job.category)+' · Due '+esc(job.dueDate)+' '+esc(job.dueTime||'')+' · '+(job.repeat==='none'?'No repeat':esc(job.repeat))+'</div></div><span class="jobBadge '+(st==='overdue'?'overdue':(st==='dueSoon'||st==='dueToday'?'dueSoon':''))+'">'+statusLabel(st)+'</span></div>'+(job.notes?'<div class="jobNotes">'+esc(job.notes)+'</div>':'')+'<div class="jobActions"><button class="primaryBtn" onclick="aqxCompleteJob(\''+esc(job.id)+'\')">Mark Done</button><button class="dangerBtn" onclick="aqxDeleteJob(\''+esc(job.id)+'\')">Remove</button></div></div>';}).join(''):'<div class="jobEmpty">No jobs to show here yet.</div>';
    }
    const doneBox=el('jobsDoneList');
    if(doneBox){const done=readList(DONE_KEY).slice(0,12); doneBox.innerHTML=done.length?done.map(function(d){return '<div class="jobsLogItem"><strong style="color:white">'+esc(d.title)+'</strong><br>'+esc(d.category)+' · Completed '+esc((d.completed||'').replace('T',' '))+'</div>';}).join(''):'<div class="jobEmpty">No completed jobs yet.</div>';}
  };
  window.aqxRenderHomeJobs=function(){
    mirrorActiveToLegacy();
    const jobs=readList(JOB_KEY).sort(function(a,b){return dueDateTime(a)-dueDateTime(b);});
    const summary=el('homeJobsSummary'), list=el('homeJobsMiniList'); if(!summary && !list) return;
    const due=jobs.filter(function(j){return ['overdue','dueToday','dueSoon'].includes(statusOf(j));});
    if(summary) summary.textContent=jobs.length?(due.length?due.length+' job'+(due.length===1?'':'s')+' need attention today.':'No urgent jobs due today.'):'No tasks created yet.';
    if(list) list.innerHTML=due.length?due.slice(0,3).map(function(j){return '<div class="jobsLogItem"><strong style="color:white">'+esc(j.title)+'</strong><br>'+esc(j.category)+' · '+statusLabel(statusOf(j))+'</div>';}).join(''):(jobs.length?'<div class="jobEmpty">Your maintenance schedule is clear today.</div>':'<div class="jobEmpty">No jobs saved for this tank yet.</div>');
  };
  const oldSwitch=window.aqxSwitchTank;
  if(typeof oldSwitch==='function' && !oldSwitch.__aqxJobsHardFixed){
    const wrapped=function(id){const out=oldSwitch.apply(this,arguments); setTimeout(function(){mirrorActiveToLegacy(); window.aqxRenderJobs(); window.aqxRenderHomeJobs();},160); return out;};
    wrapped.__aqxJobsHardFixed=true; window.aqxSwitchTank=wrapped;
  }
  const oldOpen=window.openPage;
  if(typeof oldOpen==='function' && !oldOpen.__aqxJobsHardFixed){
    const wrapped=function(page){mirrorActiveToLegacy(); const out=oldOpen.apply(this,arguments); if(page==='jobs'||page==='home'||page==='care') setTimeout(function(){window.aqxRenderJobs(); window.aqxRenderHomeJobs();},120); return out;};
    wrapped.__aqxJobsHardFixed=true; window.openPage=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){const d=el('jobDueDate'); if(d&&!d.value)d.value=todayDate(); const t=el('jobDueTime'); if(t&&!t.value)t.value='09:00'; mirrorActiveToLegacy(); window.aqxRenderJobs(); window.aqxRenderHomeJobs();},650);});
  setTimeout(function(){mirrorActiveToLegacy(); window.aqxRenderJobs(); window.aqxRenderHomeJobs();},1200);
})();

/* === AquoraX Global Intro Strip Removal Patch ===
   Keeps the app mobile-first by removing repeated page titles, intro text and generated helper cards. */
(function(){
  function aqxRemovePageIntroBlocks(){
    try{
      document.querySelectorAll('.homeBrandHeader,.pageHeader,.aqxPageHelper').forEach(function(el){
        if(el && el.parentNode) el.parentNode.removeChild(el);
      });
    }catch(e){}
  }
  const oldOpenPage = window.openPage;
  if(typeof oldOpenPage === 'function' && !oldOpenPage.__aqxIntroStripRemoved){
    const wrapped = function(){
      const result = oldOpenPage.apply(this, arguments);
      setTimeout(aqxRemovePageIntroBlocks, 20);
      setTimeout(aqxRemovePageIntroBlocks, 120);
      return result;
    };
    wrapped.__aqxIntroStripRemoved = true;
    window.openPage = wrapped;
  }
  document.addEventListener('DOMContentLoaded', function(){
    aqxRemovePageIntroBlocks();
    setTimeout(aqxRemovePageIntroBlocks, 250);
    setTimeout(aqxRemovePageIntroBlocks, 1000);
  });
  setTimeout(aqxRemovePageIntroBlocks, 100);
  setTimeout(aqxRemovePageIntroBlocks, 700);
})();


/* === AquoraX PWA Install + Local Notification Reminders Patch ===
   Adds installable home-screen icon support and device notification reminders.
   Works best after adding AquoraX to the Android home screen / Chrome PWA.
   True background push notifications still require a future server push system. */
(function(){
  const ENABLED_KEY='aqxNotificationsEnabledV1';
  const SENT_KEY='aqxNotificationsSentV1';
  const TEST_REMINDER_HOURS=48;
  function $(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function pad(n){return String(n).padStart(2,'0');}
  function today(){const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function safeJson(raw,fallback){try{const v=JSON.parse(raw||''); return v==null?fallback:v;}catch(e){return fallback;}}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank'};}catch(e){return {id:'tank_main',name:'Main Tank'};}}
  function scopedKey(base){try{return window.aqxScopedKey?window.aqxScopedKey(base,activeTank().id):(base+'__'+activeTank().id);}catch(e){return base+'__tank_main';}}
  function readList(base){const scoped=localStorage.getItem(scopedKey(base)); const legacy=localStorage.getItem(base); const arr=safeJson(scoped!=null?scoped:legacy,[]); return Array.isArray(arr)?arr:[];}
  function dueDateTime(item){return new Date((item.dueDate||item.nextService||today())+'T'+(item.dueTime||'09:00'));}
  function isDue(item){const d=dueDateTime(item); const now=new Date(); return d <= now || (item.dueDate===today());}
  function sentMap(){return safeJson(localStorage.getItem(SENT_KEY),{});}
  function markSent(key){const m=sentMap(); m[key]=Date.now(); localStorage.setItem(SENT_KEY,JSON.stringify(m));}
  function recentlySent(key,hours){const m=sentMap(); const t=Number(m[key]||0); return t && (Date.now()-t) < hours*60*60*1000;}
  function statusText(){
    const box=$('aqxNotificationStatus'); if(!box) return;
    if(!('Notification' in window)){box.textContent='Notifications are not supported in this browser. Try AquoraX as an installed Chrome app on Android.'; return;}
    if(Notification.permission==='granted' && localStorage.getItem(ENABLED_KEY)==='true') box.textContent='Notifications are enabled on this device.';
    else if(Notification.permission==='denied') box.textContent='Notifications are blocked. Enable them in browser/app settings.';
    else box.textContent='Notifications are ready. Tap Enable Notifications to allow reminders.';
  }
  async function swReg(){
    if(!('serviceWorker' in navigator)) return null;
    try{return await navigator.serviceWorker.register('/AquoraXaquariumapp/sw.js', {scope:'/AquoraXaquariumapp/'});}catch(e){console.warn('AquoraX service worker failed',e); return null;}
  }
  async function notify(title,body,tag){
    if(!('Notification' in window) || Notification.permission!=='granted') return false;
    const reg=await swReg();
    const opts={body:body||'',tag:tag||('aqx-'+Date.now()),renotify:false,badge:'assets/icon-192.png',icon:'assets/icon-192.png',data:{url:'./index.html'}};
    try{ if(reg && reg.showNotification){ await reg.showNotification(title,opts); } else { new Notification(title,opts); } return true; }catch(e){ console.warn('AquoraX notification failed',e); return false; }
  }
  function latestTestAgeHours(){
    const tests=readList('aquoraxParameterTests');
    if(!tests.length) return null;
    const last=tests.slice().sort(function(a,b){return new Date(b.savedIso||b.date||0)-new Date(a.savedIso||a.date||0);})[0];
    const raw=last.savedIso||last.date;
    if(!raw) return null;
    const d=new Date(raw); if(isNaN(d.getTime())) return null;
    return (Date.now()-d.getTime())/(60*60*1000);
  }
  function dueJobs(){return readList('aquoraxJobsV1').filter(isDue);}
  function dueEquipment(){return readList('aquoraxEquipmentV1').filter(isDue);}
  window.aqxEnableNotifications=async function(){
    if(!('Notification' in window)){alert('Notifications are not supported in this browser.'); statusText(); return;}
    await swReg();
    let perm=Notification.permission;
    if(perm!=='granted') perm=await Notification.requestPermission();
    if(perm==='granted'){
      localStorage.setItem(ENABLED_KEY,'true');
      statusText();
      await notify('AquoraX notifications enabled','Care reminders will now appear on this device.','aqx-enabled');
      setTimeout(function(){window.aqxCheckNotificationsNow(false);},1200);
    }else{
      localStorage.setItem(ENABLED_KEY,'false'); statusText(); alert('Notifications were not enabled.');
    }
  };
  window.aqxSendTestNotification=async function(){
    if(!('Notification' in window)){alert('Notifications are not supported here.'); return;}
    if(Notification.permission!=='granted'){await window.aqxEnableNotifications(); return;}
    await notify('AquoraX test alert','Notifications are working on this device.','aqx-test');
  };
  window.aqxCheckNotificationsNow=async function(manual){
    statusText();
    if(localStorage.getItem(ENABLED_KEY)!=='true' || !('Notification' in window) || Notification.permission!=='granted'){
      if(manual) alert('Enable notifications first.');
      return;
    }
    const tank=activeTank();
    const jobs=dueJobs();
    if(jobs.length && !recentlySent('jobs-'+tank.id,12)){
      await notify('AquoraX: '+jobs.length+' job'+(jobs.length===1?'':'s')+' due', (jobs[0].title||'Maintenance')+' needs attention for '+(tank.name||'your tank')+'.','aqx-jobs-'+tank.id); markSent('jobs-'+tank.id);
    }
    const equipment=dueEquipment();
    if(equipment.length && !recentlySent('equipment-'+tank.id,24)){
      await notify('AquoraX: equipment service due', (equipment[0].name||'Equipment')+' needs checking for '+(tank.name||'your tank')+'.','aqx-equipment-'+tank.id); markSent('equipment-'+tank.id);
    }
    const age=latestTestAgeHours();
    if((age===null || age>=TEST_REMINDER_HOURS) && !recentlySent('test-'+tank.id,24)){
      await notify('AquoraX: water test reminder', age===null?'No water test logged yet for '+(tank.name||'this tank')+'.':'It has been over '+TEST_REMINDER_HOURS+' hours since the last water test for '+(tank.name||'this tank')+'.','aqx-test-'+tank.id); markSent('test-'+tank.id);
    }
    if(manual && !jobs.length && !equipment.length && !(age===null || age>=TEST_REMINDER_HOURS)) alert('No reminders due right now.');
  };
  const oldOpen=window.openPage;
  if(typeof oldOpen==='function' && !oldOpen.__aqxNotifyPatched){
    const wrapped=function(page){const out=oldOpen.apply(this,arguments); setTimeout(statusText,120); if(page==='home'||page==='care'||page==='jobs') setTimeout(function(){window.aqxCheckNotificationsNow(false);},500); return out;};
    wrapped.__aqxNotifyPatched=true; window.openPage=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){swReg(); setTimeout(statusText,700); setTimeout(function(){window.aqxCheckNotificationsNow(false);},2500); setInterval(function(){window.aqxCheckNotificationsNow(false);},30*60*1000);});
})();


/* === AquoraX Firebase Cloud Messaging Real-Time Push Patch ===
   Registers this browser/PWA with Firebase Cloud Messaging, stores device tokens
   under the signed-in user's Firestore account, keeps local reminders as fallback,
   and handles foreground push alerts cleanly. */
(function(){
  const VAPID_KEY_STORAGE='aqxFirebaseVapidPublicKeyV1';
  const FCM_TOKEN_STORAGE='aqxFirebaseFcmTokenV1';
  const DEVICE_ID_STORAGE='aqxFirebaseDeviceIdV1';
  const ENABLED_KEY='aqxNotificationsEnabledV1';
  const BUILD='cloud-reminders-fixed-20260507f';
  function $(id){return document.getElementById(id);}
  function msg(text){const box=$('aqxNotificationStatus'); if(box) box.textContent=text;}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function deviceId(){
    let id=localStorage.getItem(DEVICE_ID_STORAGE);
    if(!id){id='aqx_device_'+Date.now()+'_'+Math.random().toString(36).slice(2,10); localStorage.setItem(DEVICE_ID_STORAGE,id);}
    return id;
  }
  const AQX_DEFAULT_VAPID_KEY='BMeSn69568_PkzWwej9vCyqZYhRj_-T8n6FYIqHvPilqN3UiB7q8Rz8FZ6eACLarNyDMpOT5AlKf5vJwg89PmE';
  function vapidKey(){return (localStorage.getItem(VAPID_KEY_STORAGE)||AQX_DEFAULT_VAPID_KEY||'').trim();}
  function fillKeyInput(){const inp=$('aqxVapidKeyInput'); if(inp && !inp.value) inp.value=vapidKey();}
  function signedInUser(){try{return aqxFirebaseAuth && aqxFirebaseAuth.currentUser ? aqxFirebaseAuth.currentUser : null;}catch(e){return null;}}
  function firebaseReady(){try{return typeof aqxInitFirebase==='function' && aqxInitFirebase() && window.firebase && firebase.messaging;}catch(e){return false;}}
  async function getMainServiceWorker(){
    if(!('serviceWorker' in navigator)) return null;
    try{
      const reg=await navigator.serviceWorker.register('/AquoraXaquariumapp/sw.js?v='+BUILD,{scope:'/AquoraXaquariumapp/'});
      await navigator.serviceWorker.ready;
      return reg;
    }catch(e){console.warn('AquoraX FCM service worker registration failed',e); return null;}
  }
  async function saveTokenToCloud(token){
    const user=signedInUser();
    if(!user || !aqxFirebaseDb || !token) return;
    const ref=aqxFirebaseDb.collection('users').doc(user.uid).collection('notificationTokens').doc(deviceId());
    await ref.set({
      token:token,
      deviceId:deviceId(),
      platform:navigator.platform||'',
      userAgent:navigator.userAgent||'',
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
      enabled:true,
      build:BUILD
    },{merge:true});
  }
  async function fcmSupported(){
    try{
      if(!window.firebase || !firebase.messaging || !firebase.messaging.isSupported) return false;
      return await firebase.messaging.isSupported();
    }catch(e){return false;}
  }
  async function registerFcmToken(){
    if(!firebaseReady()){msg('Firebase is not ready yet. Sign in and refresh once.'); return null;}
    const key=vapidKey();
    if(!key){msg('AquoraX push configuration is missing. Update the app files and try again.'); return null;}
    if(!(await fcmSupported())){msg('Firebase Cloud Messaging is not supported in this browser. Use Chrome/installed PWA on Android.'); return null;}
    const reg=await getMainServiceWorker();
    if(!reg){msg('Service worker could not start. Reopen the installed app and try again.'); return null;}
    const messaging=aqxFirebaseMessaging || firebase.messaging();
    const token=await messaging.getToken({vapidKey:key,serviceWorkerRegistration:reg});
    if(!token){msg('Firebase did not return a push token. Check notification permission and VAPID key.'); return null;}
    localStorage.setItem(FCM_TOKEN_STORAGE,token);
    await saveTokenToCloud(token);
    try{
      messaging.onMessage(function(payload){
        const n=(payload && payload.notification)||{};
        const title=n.title || 'AquoraX Alert';
        const body=n.body || 'You have a new AquoraX notification.';
        if(Notification.permission==='granted' && reg && reg.showNotification){
          reg.showNotification(title,{body:body,icon:'assets/icon-192.png',badge:'assets/icon-192.png',tag:(payload && payload.messageId)||'aqx-fcm-foreground',data:{url:'./index.html'}});
        }else{ msg(title+': '+body); }
      });
    }catch(e){}
    msg('Real-time notifications are enabled on this device. Token saved to your AquoraX cloud account.');
    return token;
  }
  window.aqxSaveVapidKeyFromSettings=function(){
    localStorage.setItem(VAPID_KEY_STORAGE,AQX_DEFAULT_VAPID_KEY);
    msg('AquoraX push is configured automatically. Tap Enable Notifications.');
  };
  const oldEnable=window.aqxEnableNotifications;
  window.aqxEnableNotifications=async function(){
    localStorage.setItem(VAPID_KEY_STORAGE,AQX_DEFAULT_VAPID_KEY);
    if(!('Notification' in window)){alert('Notifications are not supported in this browser.'); msg('Notifications are not supported here. Try Chrome or the installed Android PWA.'); return;}
    let perm=Notification.permission;
    if(perm!=='granted') perm=await Notification.requestPermission();
    if(perm!=='granted'){localStorage.setItem(ENABLED_KEY,'false'); msg('Notifications are blocked. Enable them in browser/app settings.'); return;}
    localStorage.setItem(ENABLED_KEY,'true');
    if(typeof oldEnable==='function'){try{await oldEnable();}catch(e){console.warn('AquoraX local notification enable failed',e);}}
    try{await registerFcmToken();}catch(e){console.warn('AquoraX FCM token failed',e); msg((e&&e.message)?e.message:'Real-time registration failed. Check browser notification permission and reopen the app.');}
  };
  const oldTest=window.aqxSendTestNotification;
  window.aqxSendTestNotification=async function(){
    if(Notification.permission!=='granted'){await window.aqxEnableNotifications(); return;}
    const reg=await getMainServiceWorker();
    try{if(reg && reg.showNotification) await reg.showNotification('AquoraX real-time test','This device can show AquoraX notifications.',{icon:'assets/icon-192.png',badge:'assets/icon-192.png',tag:'aqx-realtime-test',data:{url:'./index.html'}});}
    catch(e){if(typeof oldTest==='function') return oldTest();}
  };
  window.aqxRefreshFcmToken=registerFcmToken;
  function updateCard(){
    fillKeyInput();
    if(!('Notification' in window)){msg('Notifications are not supported in this browser.'); return;}
    const token=localStorage.getItem(FCM_TOKEN_STORAGE)||'';
    const key=vapidKey();
    if(Notification.permission==='granted' && token) msg('Real-time notifications are enabled on this device.');
    else if(Notification.permission==='granted' && !key) msg('Notifications are allowed, but AquoraX push configuration is missing.');
    else if(Notification.permission==='denied') msg('Notifications are blocked in browser/app settings.');
    else msg('Ready to enable. Tap Enable Notifications, then allow browser notifications.');
  }
  const oldSetSession=window.aqxSetSessionFromFirebase;
  if(typeof oldSetSession==='function' && !oldSetSession.__aqxFcmWrapped){
    const wrapped=function(user){const out=oldSetSession.apply(this,arguments); setTimeout(function(){if(Notification.permission==='granted' && vapidKey()) registerFcmToken().catch(function(){});},1800); return out;};
    wrapped.__aqxFcmWrapped=true; window.aqxSetSessionFromFirebase=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(updateCard,900); setTimeout(updateCard,2400);});
  setTimeout(updateCard,1200);
})();


/* === AquoraX PWA Install Prompt Helper === */
(function(){
  var deferredInstallPrompt=null;
  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredInstallPrompt=e;
    localStorage.setItem('aqxPwaInstallReady','true');
    var btn=document.getElementById('aqxInstallAppBtn');
    if(btn && !isStandalone()) btn.style.display='inline-flex';
  });
  window.addEventListener('appinstalled', function(){
    deferredInstallPrompt=null;
    localStorage.setItem('aqxPwaInstalled','true');
    var btn=document.getElementById('aqxInstallAppBtn');
    if(btn) btn.style.display='none';
  });
  window.aqxInstallApp=function(){
    if(isStandalone()){ alert('AquoraX is already installed.'); return; }
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.finally(function(){deferredInstallPrompt=null;});
      return;
    }
    alert('On Android Chrome, open the browser menu and choose Install app. If it only says Create shortcut, reopen AquoraX after a refresh and try again.');
  };
  document.addEventListener('DOMContentLoaded', function(){
    var btn=document.getElementById('aqxInstallAppBtn');
    if(btn && !isStandalone() && localStorage.getItem('aqxPwaInstallReady')==='true') btn.style.display='inline-flex';
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/AquoraXaquariumapp/sw.js?v=pwa-scope-fixed-20260507e', {scope:'./'}).then(function(reg){
        if(reg && reg.update) reg.update();
        return navigator.serviceWorker.ready;
      }).catch(function(e){console.warn('AquoraX PWA worker registration failed',e);});
    }
  });
})();


/* === AquoraX Cloud Scheduled Job Reminders Patch ===
   Saves tank jobs into Firestore so Firebase Cloud Functions can send real
   FCM push notifications at the due time, even when AquoraX is closed. */
(function(){
  const JOB_BASE='aquoraxJobsV1';
  const BUILD='cloud-reminders-fixed-20260507f';
  let syncTimer=null;
  function safeJson(v,fallback){try{const x=JSON.parse(v||'null'); return x==null?fallback:x;}catch(e){return fallback;}}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank'};}catch(e){return {id:'tank_main',name:'Main Tank'};}}
  function scopedKey(base,tankId){try{return window.aqxScopedKey?window.aqxScopedKey(base,tankId||activeTank().id):(base+'__'+(tankId||activeTank().id));}catch(e){return base+'__tank_main';}}
  function parseDue(job){
    const raw=(job && job.dueDate ? job.dueDate : new Date().toISOString().slice(0,10))+'T'+(job && job.dueTime ? job.dueTime : '09:00');
    const d=new Date(raw);
    return isNaN(d.getTime())?new Date():d;
  }
  function allKnownJobs(){
    const found=[]; const seen={};
    function addList(raw,sourceTank){
      const arr=safeJson(raw,[]); if(!Array.isArray(arr)) return;
      arr.forEach(function(j){
        if(!j || !j.id) return;
        const tankId=j.tankId || sourceTank || activeTank().id || 'tank_main';
        const key=tankId+'_'+j.id;
        if(seen[key]) return; seen[key]=true;
        found.push(Object.assign({},j,{tankId:tankId}));
      });
    }
    try{
      addList(localStorage.getItem(JOB_BASE),activeTank().id);
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(k.indexOf(JOB_BASE+'__')===0){ addList(localStorage.getItem(k),k.replace(JOB_BASE+'__','')); }
      }
    }catch(e){}
    return found;
  }
  function firebaseReady(){try{return typeof aqxInitFirebase==='function' && aqxInitFirebase() && aqxFirebaseDb && aqxFirebaseAuth && aqxFirebaseAuth.currentUser;}catch(e){return false;}}
  async function syncJobsNow(reason){
    if(!firebaseReady()) return;
    const user=aqxFirebaseAuth.currentUser; if(!user) return;
    const jobs=allKnownJobs();
    const batch=aqxFirebaseDb.batch();
    const seenIds=[];
    jobs.forEach(function(job){
      const docId=String(job.tankId||'tank_main')+'_'+String(job.id).replace(/[^a-zA-Z0-9_-]/g,'_');
      seenIds.push(docId);
      const due=parseDue(job);
      const ref=aqxFirebaseDb.collection('users').doc(user.uid).collection('reminders').doc(docId);
      batch.set(ref,{
        id:docId,
        source:'job',
        sourceJobId:String(job.id),
        uid:user.uid,
        tankId:String(job.tankId||'tank_main'),
        title:String(job.title||'AquoraX job'),
        category:String(job.category||'Maintenance'),
        notes:String(job.notes||''),
        repeat:String(job.repeat||'none'),
        dueDate:String(job.dueDate||''),
        dueTime:String(job.dueTime||'09:00'),
        dueAt:firebase.firestore.Timestamp.fromDate(due),
        dueAtIso:due.toISOString(),
        status:'active',
        enabled:true,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
        build:BUILD
      },{merge:true});
    });
    const metaRef=aqxFirebaseDb.collection('users').doc(user.uid).collection('sync').doc('jobs');
    batch.set(metaRef,{updatedAt:firebase.firestore.FieldValue.serverTimestamp(),count:jobs.length,reason:reason||'sync',build:BUILD},{merge:true});
    try{
      await batch.commit();
      const box=document.getElementById('aqxNotificationStatus');
      if(box && Notification && Notification.permission==='granted') box.textContent='Real-time notifications are enabled. '+jobs.length+' job reminder'+(jobs.length===1?'':'s')+' synced to AquoraX Cloud.';
    }catch(e){console.warn('AquoraX cloud reminder sync failed',e);}
  }
  function queue(reason){clearTimeout(syncTimer); syncTimer=setTimeout(function(){syncJobsNow(reason);},900);}
  window.aqxSyncJobRemindersToCloud=function(){return syncJobsNow('manual');};
  ['aqxAddJob','aqxCompleteJob','aqxDeleteJob','aqxClearCompletedJobs'].forEach(function(name){
    const old=window[name];
    if(typeof old==='function' && !old.__aqxCloudReminderWrapped){
      const wrapped=function(){const out=old.apply(this,arguments); queue(name); return out;};
      wrapped.__aqxCloudReminderWrapped=true; window[name]=wrapped;
    }
  });
  const oldSetSession=window.aqxSetSessionFromFirebase;
  if(typeof oldSetSession==='function' && !oldSetSession.__aqxCloudReminderWrapped){
    const wrapped=function(user){const out=oldSetSession.apply(this,arguments); setTimeout(function(){queue('login');},2200); return out;};
    wrapped.__aqxCloudReminderWrapped=true; window.aqxSetSessionFromFirebase=wrapped;
  }
  const oldEnable=window.aqxEnableNotifications;
  if(typeof oldEnable==='function' && !oldEnable.__aqxCloudReminderWrapped){
    const wrapped=async function(){const out=await oldEnable.apply(this,arguments); queue('notifications enabled'); return out;};
    wrapped.__aqxCloudReminderWrapped=true; window.aqxEnableNotifications=wrapped;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){queue('startup');},3500);});
})();


// === AquoraX Multi-Brand Reef Ecosystem Patch ===
(function(){
  const PRODUCT_BASE='aquoraxDosingProducts';
  const HISTORY_BASE='aquoraxDosingHistory';
  const BRAND_KEY='aquoraxActiveDosingBrand';
  const BRAND_ASSET='assets/brand-ecosystems/';
  const BRAND_PACKS={
    coral:{
      id:'coral', short:'Coral Essentials', title:'Coral Essentials Ecosystem',
      logo:BRAND_ASSET+'coral-essentials-logo.jpg',
      shop:'https://finestaquatics.co.uk/search?q=coral+essentials',
      button:'Buy Coral Essentials at Finest Aquatics',
      subtitle:'Core method dosing, coral vitality and ICP-ready reef nutrition for the active tank.',
      support:'Presentation demo: four hero products, ecosystem switching, dosing intelligence, refill prediction and ICP-aware tracking.',
      groups:['Core Method'],
      products:[
        {id:'ce-cve',name:'CVE+',purpose:'Coral vitality and energy support',size:100,dose:1,img:BRAND_ASSET+'ce-cve-plus.png',group:'Core Method'},
        {id:'ce-calcium',name:'Calcium + Trace',purpose:'Foundation calcium and trace support',size:1000,dose:10,img:BRAND_ASSET+'ce-calcium-trace.png',group:'Core Method'},
        {id:'ce-carbonate',name:'Carbonate + Trace',purpose:'Alkalinity foundation and trace support',size:1000,dose:10,img:BRAND_ASSET+'ce-carbonate-trace.png',group:'Core Method'},
        {id:'ce-magnesium',name:'Magnesium + Trace',purpose:'Magnesium foundation and trace support',size:1000,dose:10,img:BRAND_ASSET+'ce-magnesium-trace.png',group:'Core Method'}
      ]
    },
    triton:{
      id:'triton', short:'Triton', title:'Triton ICP & Core7 Ecosystem',
      logo:BRAND_ASSET+'triton-logo.webp',
      shop:'https://finestaquatics.co.uk/search?q=triton',
      button:'Buy Triton at Finest Aquatics',
      subtitle:'ICP-led reef chemistry, Core7 method tracking and professional stability intelligence.',
      support:'Triton mode highlights ICP testing, Core7 components, chemistry stability and lab-style reef management.',
      groups:['ICP Testing','Core7 Method'],
      products:[
        {id:'triton-icp',name:'Triton ICP-OES Test',purpose:'Laboratory ICP water analysis',size:1,dose:1,img:BRAND_ASSET+'triton-icp-oes.avif',group:'ICP Testing',unit:'test'},
        {id:'triton-core7-1',name:'Core7 Component 1',purpose:'Core7 reef supplement component',size:5000,dose:10,img:BRAND_ASSET+'triton-core7-1.avif',group:'Core7 Method'},
        {id:'triton-core7-2',name:'Core7 Component 2',purpose:'Core7 reef supplement component',size:5000,dose:10,img:BRAND_ASSET+'triton-core7-2.avif',group:'Core7 Method'},
        {id:'triton-core7-3a',name:'Core7 Component 3A',purpose:'Core7 reef supplement component',size:5000,dose:10,img:BRAND_ASSET+'triton-core7-3a.avif',group:'Core7 Method'},
        {id:'triton-core7-3b',name:'Core7 Component 3B',purpose:'Core7 reef supplement component',size:5000,dose:10,img:BRAND_ASSET+'triton-core7-3b.avif',group:'Core7 Method'}
      ]
    },
    fauna:{
      id:'fauna', short:'Fauna Marin', title:'Fauna Marin Balling & ICP Ecosystem',
      logo:BRAND_ASSET+'fauna-marin-logo.webp',
      shop:'https://finestaquatics.co.uk/search?q=fauna+marin',
      button:'Buy Fauna Marin at Finest Aquatics',
      subtitle:'Balling method tracking, trace balance and ICP-aware reef chemistry control.',
      support:'Fauna Marin mode is built for reefers running Balling-style chemistry, trace correction and ICP-led adjustment.',
      groups:['ICP Testing','Balling Method'],
      products:[
        {id:'fauna-icp',name:'Fauna Marin Reef ICP Test',purpose:'ICP reef water analysis',size:1,dose:1,img:BRAND_ASSET+'fauna-reef-icp.webp',group:'ICP Testing',unit:'test'},
        {id:'fauna-balling-ca',name:'Balling Light Calcium',purpose:'Calcium foundation dosing',size:1000,dose:10,img:BRAND_ASSET+'fauna-balling-1.webp',group:'Balling Method'},
        {id:'fauna-balling-kh',name:'Balling Light Carbonate',purpose:'Alkalinity foundation dosing',size:1000,dose:10,img:BRAND_ASSET+'fauna-balling-2.webp',group:'Balling Method'},
        {id:'fauna-balling-mg',name:'Balling Light Magnesium',purpose:'Magnesium foundation dosing',size:1000,dose:10,img:BRAND_ASSET+'fauna-balling-3.webp',group:'Balling Method'}
      ]
    }
  };
  window.aqxBrandPacks=BRAND_PACKS;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function activeTank(){try{return (window.aqxGetActiveTank&&window.aqxGetActiveTank())||{id:'tank_main',name:'Main Tank',type:'reef'};}catch(e){return {id:'tank_main',name:'Main Tank',type:'reef'};}}
  function scoped(base){try{return window.aqxScopedKey?window.aqxScopedKey(base,activeTank().id):(base+'__'+activeTank().id);}catch(e){return base+'__tank_main';}}
  function read(base){try{const v=JSON.parse(localStorage.getItem(scoped(base))||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
  function write(base,items){localStorage.setItem(scoped(base),JSON.stringify(items||[]));try{if(typeof window.aqxQueueCloudBackup==='function') window.aqxQueueCloudBackup('dosing');}catch(e){}}
  window.getDosingProducts=function(){return read(PRODUCT_BASE);};
  window.saveDosingProducts=function(items){write(PRODUCT_BASE,items);};
  window.getDosingHistory=function(){return read(HISTORY_BASE);};
  window.saveDosingHistory=function(items){write(HISTORY_BASE,items);};
  function num(v,f){const n=parseFloat(v);return Number.isFinite(n)?n:f;}
  function currentBrandId(){const saved=localStorage.getItem(BRAND_KEY)||'coral';return BRAND_PACKS[saved]?saved:'coral';}
  function pack(id){return BRAND_PACKS[id||currentBrandId()]||BRAND_PACKS.coral;}
  function allProducts(){return Object.values(BRAND_PACKS).flatMap(b=>b.products.map(p=>Object.assign({brand:b.id,brandName:b.short},p)));}
  function currentProducts(){return pack().products.map(p=>Object.assign({brand:pack().id,brandName:pack().short},p));}
  function productMeta(p){const id=p.ecosystemProductId||p.ceProductId;return allProducts().find(x=>x.id===id)||allProducts().find(x=>(x.name||'').toLowerCase()===(p.name||'').toLowerCase())||null;}
  function intervalDays(freq, custom){return freq==='weekly'?7:(freq==='custom'?Math.max(1,parseInt(custom||1,10)):1);}
  function dosePerDay(p){const amt=num(p.amount,0);const interval=Math.max(1,num(p.interval||intervalDays(p.frequency,p.interval),1));return amt>0?amt/interval:0;}
  function daysBetween(a,b){const da=new Date(a||Date.now()),db=new Date(b||Date.now());if(isNaN(da)||isNaN(db))return 0;return Math.max(0,Math.floor((db-da)/86400000));}
  function liveRemaining(p){let r=num(p.remainingAmount,NaN);if(!Number.isFinite(r))r=num(p.bottleSize,0);if((p.mode||'manual')==='auto'){r-=daysBetween(p.stockUpdatedIso||p.createdIso||new Date().toISOString(),new Date().toISOString())*dosePerDay(p);}return Math.max(0,r);}
  function daysLeft(p){const d=dosePerDay(p);return d>0?Math.floor(liveRemaining(p)/d):null;}
  function pct(p){const b=num(p.bottleSize,0);return b>0?Math.max(0,Math.min(100,(liveRemaining(p)/b)*100)):0;}
  function status(p){const left=daysLeft(p), low=num(p.lowStockDays,14);if(left===null)return{cls:'nodata',txt:'No countdown',short:'No Data'};if(left<=0)return{cls:'bad',txt:'Refill now',short:'Urgent'};if(left<=low)return{cls:'warn',txt:left+' days left',short:'Low Stock'};return{cls:'good',txt:'Est. '+left+' days',short:'On Track'};}
  function setValSafe(id,v){const e=document.getElementById(id);if(e)e.value=v;}
  function fillProductForm(id){const m=allProducts().find(x=>x.id===id);if(!m)return;setValSafe('doseProductName',m.name);setValSafe('doseProductAmount',m.dose);setValSafe('doseProductBottleSize',m.size);setValSafe('doseProductRemaining',m.size);setValSafe('doseProductUnit',m.unit||'ml');setValSafe('doseProductFrequency',(m.unit==='test')?'custom':'daily');setValSafe('doseProductMode',(m.unit==='test')?'manual':'auto');setValSafe('doseProductNotes',m.purpose);window.__aqxSelectedEcosystemProductId=m.id;try{toggleCustomDoseInterval();}catch(e){}const form=document.getElementById('doseProductName');if(form)form.scrollIntoView({behavior:'smooth',block:'center'});}
  window.aqxPickCoralEssentialsProduct=fillProductForm;
  window.aqxPickEcosystemProduct=fillProductForm;
  function renderBrandHero(){const b=pack();const hero=document.getElementById('aqxBrandHero');if(hero){hero.classList.remove('coral','triton','fauna');hero.classList.add(b.id);}const logo=document.getElementById('aqxBrandLogo');if(logo){logo.src=b.logo;logo.alt=b.short;}const title=document.getElementById('aqxBrandTitle');if(title)title.textContent=b.title;const sub=document.getElementById('aqxBrandSubtitle');if(sub)sub.textContent=b.subtitle;const link=document.getElementById('aqxBrandShopLink');if(link){link.href=b.shop;link.textContent=b.button;}const support=document.getElementById('aqxBrandSupportText');if(support)support.textContent=b.support;document.querySelectorAll('.aqxBrandSelector button').forEach(btn=>btn.classList.toggle('active',btn.dataset.brand===b.id));const small=document.querySelector('.aqxCeLibraryCard .aqxCeSmallLink');if(small)small.href=b.shop;}
  window.aqxSetDosingBrand=function(id){if(!BRAND_PACKS[id])return;localStorage.setItem(BRAND_KEY,id);window.__aqxSelectedEcosystemProductId='';renderDosingPage();};
  function renderLibrary(){renderBrandHero();const list=document.getElementById('aqxCeProductLibrary');const dl=document.getElementById('aqxCeProductNames');const products=currentProducts();if(dl)dl.innerHTML=products.map(p=>`<option value="${esc(p.name)}"></option>`).join('');if(!list)return;const active=read(PRODUCT_BASE).map(p=>String(p.ecosystemProductId||p.ceProductId||'')+'|'+String(p.name||'').toLowerCase());let html='';const groups=pack().groups||[...new Set(products.map(p=>p.group||'Products'))];groups.forEach(g=>{const groupProducts=products.filter(p=>(p.group||'Products')===g);if(!groupProducts.length)return;html+=`<div class="aqxBrandGroupTitle">${esc(g)}<span>${groupProducts.length} showcase product${groupProducts.length===1?'':'s'}</span></div>`;html+=groupProducts.map(p=>{const added=active.includes(p.id+'|'+p.name.toLowerCase())||active.some(x=>x.endsWith('|'+p.name.toLowerCase()));return `<button class="aqxCeProductTile ${added?'added':''}" onclick="aqxPickEcosystemProduct('${esc(p.id)}')" type="button"><span class="aqxCeBottleGlow"><img src="${esc(p.img)}" alt="${esc(p.name)}"></span><strong>${esc(p.name)}</strong><small>${esc(p.brandName)} · ${esc(p.purpose)}</small><em>${added?'Added to tank':'Add to dosing'}</em></button>`;}).join('');});list.innerHTML=html;}
  window.aqxRenderCoralEssentialsLibrary=renderLibrary;
  window.addDosingProduct=function(){const name=(document.getElementById('doseProductName')?.value||'').trim();const amount=num(document.getElementById('doseProductAmount')?.value,NaN);if(!name){alert('Add a product name first.');return;}if(!Number.isFinite(amount)||amount<=0){alert('Add a dose amount first.');return;}const selected=allProducts().find(x=>x.id===window.__aqxSelectedEcosystemProductId)||currentProducts().find(x=>x.name.toLowerCase()===name.toLowerCase())||allProducts().find(x=>x.name.toLowerCase()===name.toLowerCase());const b=selected?pack(selected.brand):pack();const freq=document.getElementById('doseProductFrequency')?.value||'daily';const bottle=num(document.getElementById('doseProductBottleSize')?.value,selected?selected.size:0);const remaining=num(document.getElementById('doseProductRemaining')?.value,bottle||0);const product={id:'dose_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),name,amount,unit:document.getElementById('doseProductUnit')?.value||selected?.unit||'ml',frequency:freq,interval:intervalDays(freq,document.getElementById('doseProductInterval')?.value),mode:document.getElementById('doseProductMode')?.value||'auto',bottleSize:bottle,remainingAmount:Math.max(0,remaining),lowStockDays:num(document.getElementById('doseProductLowDays')?.value,14),stockUpdatedIso:new Date().toISOString(),notes:document.getElementById('doseProductNotes')?.value||'',createdIso:new Date().toISOString(),lastDosedIso:null,ecosystemBrand:b.id,ecosystemBrandName:b.short,ecosystemProductId:selected?selected.id:'',ecosystemProductImage:selected?selected.img:'',ecosystemProductGroup:selected?selected.group:'',ecosystemPurpose:selected?selected.purpose:'',ceProductId:selected&&selected.brand==='coral'?selected.id:'',ceProductImage:selected&&selected.brand==='coral'?selected.img:''};const items=read(PRODUCT_BASE);items.push(product);write(PRODUCT_BASE,items);['doseProductName','doseProductAmount','doseProductInterval','doseProductBottleSize','doseProductRemaining','doseProductNotes'].forEach(id=>{const x=document.getElementById(id);if(x)x.value='';});window.__aqxSelectedEcosystemProductId='';setValSafe('doseProductFrequency','daily');setValSafe('doseProductMode','auto');try{toggleCustomDoseInterval();}catch(e){}renderDosingPage();};
  window.logDose=function(productId){const items=read(PRODUCT_BASE);const p=items.find(x=>String(x.id)===String(productId));if(!p)return;const iso=new Date().toISOString();p.lastDosedIso=iso;if((p.mode||'manual')==='manual'){p.remainingAmount=Math.max(0,num(p.remainingAmount,p.bottleSize||0)-num(p.amount,0));p.stockUpdatedIso=iso;}write(PRODUCT_BASE,items);const hist=read(HISTORY_BASE);hist.unshift({id:Date.now(),productId:p.id,name:p.name,amount:p.amount,unit:p.unit,brand:p.ecosystemBrandName||productMeta(p)?.brandName||'',iso});write(HISTORY_BASE,hist.slice(0,200));renderDosingPage();};
  window.deleteDosingProduct=function(productId){if(!confirm('Remove this dosing product?'))return;write(PRODUCT_BASE,read(PRODUCT_BASE).filter(x=>String(x.id)!==String(productId)));renderDosingPage();};
  window.aqxRefillDosingProduct=function(productId){const items=read(PRODUCT_BASE);const p=items.find(x=>String(x.id)===String(productId));if(!p)return;p.remainingAmount=num(p.bottleSize,p.remainingAmount||0);p.stockUpdatedIso=new Date().toISOString();write(PRODUCT_BASE,items);renderDosingPage();};
  window.clearDosingHistory=function(){if(!confirm('Clear dosing history? Products will stay saved.'))return;write(HISTORY_BASE,[]);renderDosingPage();};
  window.renderDosingProducts=function(){const box=document.getElementById('dosingProductList');if(!box)return;const items=read(PRODUCT_BASE);if(!items.length){box.innerHTML='<div class="aqxCeEmpty"><strong>No dosing products active yet</strong><span>Choose Coral Essentials, Triton or Fauna Marin above, then add the products this tank actually runs.</span></div>';return;}box.innerHTML=items.map(p=>{const m=productMeta(p), img=p.ecosystemProductImage||p.ceProductImage||(m&&m.img)||'', st=status(p), pc=pct(p), unit=esc(p.unit||'ml'), daily=dosePerDay(p), brand=p.ecosystemBrandName||(m&&m.brandName)||'AquoraX', due=typeof nextDueText==='function'?nextDueText(p):{text:'Ready',cls:''};return `<div class="aqxCeDoseProduct ${st.cls}"><div class="aqxCeDoseBottle">${img?`<img src="${esc(img)}" alt="${esc(p.name)}">`:`<span>${esc((p.name||'?').slice(0,2).toUpperCase())}</span>`}</div><div class="aqxCeDoseInfo"><strong>${esc(p.name)}</strong><span>${esc((m&&m.purpose)||p.notes||'Reef dosing product')}</span><small>${esc((p.mode||'manual')==='auto'?'Auto countdown':'Manual dosing')} · ${esc(activeTank().name||'Tank')}</small><span class="aqxEcosystemBadge">${esc(brand)}</span><div class="aqxCeDoseBar"><i style="width:${pc.toFixed(0)}%"></i></div></div><div class="aqxCeDoseMetrics"><div class="aqxCeRing" style="--p:${pc.toFixed(0)}"><b>${pc.toFixed(0)}%</b></div><div><strong>${daily.toFixed(daily<10?1:0)} ${unit}/day</strong><span>${esc(due.text||'Ready')}</span></div><em>${esc(st.short)}<small>${esc(st.txt)}</small></em></div><div class="aqxCeDoseActions"><button class="primaryBtn" onclick="logDose('${esc(p.id)}')">${(p.mode||'manual')==='auto'?'Log Check':'Log Dose'}</button><button class="secondaryBtn" onclick="aqxRefillDosingProduct('${esc(p.id)}')">Refill</button><button class="dangerBtn" onclick="deleteDosingProduct('${esc(p.id)}')">Remove</button></div></div>`;}).join('');};
  function renderOverview(){const box=document.getElementById('aqxCeDosingOverview');if(!box)return;const products=read(PRODUCT_BASE), history=read(HISTORY_BASE);const low=products.filter(p=>{const l=daysLeft(p);return l!==null&&l<=num(p.lowStockDays,14);}).length;const due=products.filter(p=>{try{const d=nextDueText(p);return String(d.cls||'').includes('bad')||String(d.text||'').toLowerCase().includes('due');}catch(e){return false;}}).length;const b=pack();const activeBrand=products.filter(p=>(p.ecosystemBrand||'')===b.id).length;const classes=products.length?(low?'warn':'good'):'nodata';box.innerHTML=[{label:'Ecosystem',val:b.short,sub:activeBrand+' active from selected brand',cls:products.length?'good':'nodata'},{label:'Dosing Health',val:products.length?(low?'Watch':'Tracking'):'—',sub:products.length+' active product'+(products.length===1?'':'s'),cls:classes},{label:'Consistency',val:history.length?Math.min(100,70+Math.min(30,history.length*3))+'%':'—',sub:history.length?history.length+' logs saved':'0 logs saved',cls:history.length?'good':'nodata'},{label:'Products Due',val:String(due),sub:due?'Review today':'None due',cls:due?'warn':(products.length?'good':'nodata')},{label:'ICP Layer',val:(b.id==='coral'?'Ready':'Featured'),sub:b.id==='triton'?'Triton ICP focus':b.id==='fauna'?'Fauna Marin ICP focus':'ICP-ready dosing',cls:'warn'}].map(x=>`<div class="aqxCeOverviewStat ${x.cls}"><div class="aqxCeMiniRing"><b>${esc(x.val)}</b></div><strong>${esc(x.label)}</strong><span>${esc(x.sub)}</span></div>`).join('');}
  function renderInsights(){const box=document.getElementById('dosingInsightList');if(!box)return;const products=read(PRODUCT_BASE), history=read(HISTORY_BASE), b=pack();const insights=[];if(!products.length){insights.push({cls:'warn',title:'No ecosystem data yet',text:'Pick a brand ecosystem and add the products this tank actually uses to unlock countdowns and dosing intelligence.'});}else{const lows=products.filter(p=>{const l=daysLeft(p);return l!==null&&l<=num(p.lowStockDays,14);}).sort((a,b)=>(daysLeft(a)||0)-(daysLeft(b)||0));if(lows.length)insights.push({cls:lows.some(p=>(daysLeft(p)||0)<=0)?'bad':'warn',title:'Refill attention',text:lows.slice(0,3).map(p=>p.name+' ('+(daysLeft(p)||0)+' days)').join(', ')});insights.push({cls:'good',title:'Multi-brand ecosystem active',text:'AquoraX can run Coral Essentials, Triton and Fauna Marin product logic from one tank-specific dosing engine.'});if(history.length)insights.push({cls:'good',title:'Dosing history active',text:history.length+' dose/check log'+(history.length===1?'':'s')+' saved for this tank.'});else insights.push({cls:'warn',title:'No dose checks logged yet',text:'Use Log Check or Log Dose so AquoraX can judge consistency from real saved data.'});}
    insights.push({cls:'warn',title:b.short+' intelligence layer',text:b.id==='triton'?'ICP-led Core7 stability mode is ready for future lab import and chemistry guidance.':b.id==='fauna'?'Balling and ICP trace logic is ready for future Fauna Marin method guidance.':'Core method dosing and ICP-ready Coral Essentials reef support is active.'});
    try{const signals=(typeof getLatestIcpSignals==='function'?getLatestIcpSignals():[])||[];if(signals.length)insights.push({cls:'warn',title:'ICP adjustment signals',text:`Latest ICP shows ${signals.length} non-OK item${signals.length===1?'':'s'}. Review chemistry before changing doses.`});else insights.push({cls:'warn',title:'No ICP signal yet',text:'Add ICP results to unlock chemistry-aware dosing guidance.'});}catch(e){}
    box.innerHTML=insights.map(i=>`<div class="dosingInsightItem ${i.cls}"><strong>${esc(i.title)}</strong><span>${esc(i.text)}</span></div>`).join('');}
  const oldRender=window.renderDosingPage;
  window.renderDosingPage=function(){const out=typeof oldRender==='function'?oldRender.apply(this,arguments):undefined;renderLibrary();renderOverview();renderInsights();return out;};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){try{renderLibrary();renderOverview();renderInsights();}catch(e){}},900);});
})();

/* === AquoraX Reef Intelligence Engine v2 ===
   Makes the Reef Health Engine honest: ICP imports that look OCR-corrupted are held for review
   instead of turning the whole reef score into a fake 0/urgent state. */
(function(){
  function $(id){return document.getElementById(id);} 
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function n(v,f){var x=parseFloat(String(v||'').replace(',','.').replace(/[<>]/g,''));return Number.isFinite(x)?x:(f||0);} 
  function latestIcp(){try{var a=(typeof getIcpTests==='function'?getIcpTests():[])||[];return a[0]||null;}catch(e){return null;}}
  function dosingProducts(){try{return (typeof getDosingProducts==='function'?getDosingProducts():[])||[];}catch(e){return [];}}
  function dosingHistory(){try{return (typeof getDosingHistory==='function'?getDosingHistory():[])||[];}catch(e){return [];}}
  function currentBrand(){try{var id=localStorage.getItem('aquoraxActiveDosingBrand')||'coral';var packs=window.aqxBrandPacks||{};return packs[id]||packs.coral||{id:id,short:id};}catch(e){return {id:'coral',short:'Coral Essentials'};}}
  function classify(status){status=String(status||'ok').toLowerCase(); if(status==='high')return 'bad'; if(status==='low'||status==='watch')return 'warn'; return 'good';}
  function getSignals(test){var out=[];((test&&test.parameters)||[]).forEach(function(p){var s=String(p.status||'ok').toLowerCase(); if(s && s!=='ok') out.push({name:p.name,value:p.value,unit:p.unit,status:s,cls:classify(s)});}); return out;}
  function icpAgeDays(test){if(!test||!test.date)return null;var d=new Date(test.date); if(isNaN(d))return null; return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
  function daysLeft(p){try{var amt=n(p.amount,0);var interval=Math.max(1,n(p.interval||(p.frequency==='weekly'?7:1),1));var perDay=amt/interval;var remaining=n(p.remainingAmount,Number.NaN); if(!Number.isFinite(remaining)) remaining=n(p.bottleSize,0); if((p.mode||'manual')==='auto'){var start=new Date(p.stockUpdatedIso||p.createdIso||Date.now()); if(!isNaN(start)){remaining-=Math.max(0,Math.floor((Date.now()-start.getTime())/86400000))*perDay;}} return perDay>0?Math.floor(Math.max(0,remaining)/perDay):null;}catch(e){return null;}}

  // Soft plausibility check. This does not pretend to diagnose the reef — it spots obvious OCR/table parsing corruption.
  var plausible={
    calcium:[250,650], magnesium:[800,1800], potassium:[250,550], strontium:[0,25], boron:[0,15], bromide:[0,120],
    barium:[0,5], manganese:[0,1], molybdenum:[0,1], zinc:[0,1], copper:[0,1], nickel:[0,1], lithium:[0,1], chromium:[0,1], cobalt:[0,1], selenium:[0,1], iodine:[0,1], iron:[0,1], phosphate:[0,5], nitrate:[0,200], alkalinity:[0,20]
  };
  function keyName(name){return String(name||'').toLowerCase().replace(/[^a-z]/g,'');}
  function importLooksSuspect(test, signals){
    if(!test) return false;
    var params=(test.parameters||[]), bad=0, weird=[];
    params.forEach(function(p){
      var k=keyName(p.name), val=n(p.value,NaN); if(!Number.isFinite(val)) return;
      Object.keys(plausible).some(function(pk){
        if(k.indexOf(pk)===0 || pk.indexOf(k)===0){var r=plausible[pk]; if(val<r[0]||val>r[1]){bad++; weird.push(p.name+': '+p.value);} return true;} return false;
      });
    });
    // If nearly everything is screaming red/high after a screenshot import, treat it as pending review, not reef reality.
    var manySignals = signals.length>=6;
    var manyHighs = signals.filter(function(s){return s.status==='high';}).length>=5;
    var imported = /imported|screenshot|ocr/i.test(String(test.notes||''));
    return bad>=2 || (imported && manySignals && manyHighs);
  }

  function reefHealth(){var test=latestIcp(), products=dosingProducts(), hist=dosingHistory(), signals=getSignals(test); var score=100; var notes=[]; var age=icpAgeDays(test); var suspect=importLooksSuspect(test,signals);
    if(suspect){
      return {score:'—',numericScore:0,cls:'review',label:'Review ICP',notes:['Latest ICP import needs review before reef scoring'],test:test,signals:signals,age:age,low:[],products:products,hist:hist,suspect:true};
    }
    if(!test){score-=22; notes.push('No ICP result saved yet');}
    else if(age!==null && age>45){score-=10; notes.push('ICP is '+age+' days old');}
    // Cap ICP penalty so the engine never creates a fake catastrophic zero from one scan.
    var icpPenalty=0; signals.forEach(function(s){icpPenalty+=s.status==='high'?7:5;}); score-=Math.min(30,icpPenalty);
    if(signals.length) notes.push(signals.length+' ICP item'+(signals.length===1?'':'s')+' need review');
    if(!products.length){score-=12; notes.push('No active ecosystem products');}
    var low=products.filter(function(p){var l=daysLeft(p);return l!==null&&l<=n(p.lowStockDays,14);});
    if(low.length){score-=Math.min(16,low.length*5); notes.push(low.length+' product'+(low.length===1?'':'s')+' near refill');}
    if(!hist.length){score-=5; notes.push('No dose/check history');}
    score=Math.max(35,Math.min(100,Math.round(score)));
    var cls=score>=82?'good':score>=62?'warn':'bad';
    var label=score>=82?'Stable':score>=62?'Watch':'Needs Review';
    return {score:score,numericScore:score,cls:cls,label:label,notes:notes,test:test,signals:signals,age:age,low:low,products:products,hist:hist,suspect:false};
  }
  function ensurePanel(){var existing=$('aqxReefIntelligencePanel'); if(existing)return existing; var anchor=$('dosingInsightList'); if(!anchor)return null; var card=document.createElement('div'); card.id='aqxReefIntelligencePanel'; card.className='card aqxReefIntelCard'; card.innerHTML='<div class="aqxReefIntelLoading">Reef Intelligence loading…</div>'; var insightCard=anchor.closest('.card'); if(insightCard&&insightCard.parentNode){insightCard.parentNode.insertBefore(card,insightCard);} return card;}
  function brandCopy(b, health){
    if(health.suspect) return 'Latest ICP import looks like table/OCR data. Review values before AquoraX scores the reef.';
    if(b.id==='triton') return health.signals.length?'ICP signals detected. Review Core7 stability before changing doses.':'Triton mode is reading clean — ICP-led stability is the focus.';
    if(b.id==='fauna') return health.signals.length?'Trace or Balling-related correction may be needed. Review changes slowly.':'Fauna Marin mode is ready for trace and Balling stability tracking.';
    return health.signals.length?'Trace support may need review against the Coral Essentials method.':'Coral Essentials mode is ready for core method dosing and vitality tracking.';
  }
  function renderReefIntelligence(){var card=ensurePanel(); if(!card)return; var h=reefHealth(), b=currentBrand(); var signalHtml=h.signals.length?h.signals.slice(0,6).map(function(s){return '<span class="'+esc(s.cls)+'">'+esc(s.name)+': '+esc(s.value)+' '+esc(s.unit||'')+' · '+esc(s.status.toUpperCase())+'</span>';}).join(''):'<span class="good">No low/high ICP markers saved</span>';
    var prediction=[];
    if(h.suspect) prediction.push({cls:'warn',title:'Review import before scoring',text:'This looks like OCR/table data. Check the auto-filled values, remove wrong rows, then save a clean ICP test.'});
    else if(!h.test) prediction.push({cls:'warn',title:'ICP import needed',text:'Upload or paste an ICP report to unlock real reef chemistry intelligence.'});
    else if(h.age!==null&&h.age>30) prediction.push({cls:'warn',title:'ICP check due soon',text:'Latest ICP is '+h.age+' days old. A fresh report will sharpen trend predictions.'});
    if(!h.suspect && h.low.length) prediction.push({cls:h.low.some(function(p){return daysLeft(p)<=0;})?'bad':'warn',title:'Refill prediction',text:h.low.slice(0,3).map(function(p){return p.name+' in '+daysLeft(p)+' days';}).join(', ')});
    if(!h.suspect && h.signals.some(function(s){return /potassium|iodine|iron|strontium/i.test(s.name)})) prediction.push({cls:'warn',title:'Trace trend watch',text:'Trace markers are outside target. Track the next ICP to confirm if this is consumption or a one-off swing.'});
    if(!prediction.length) prediction.push({cls:'good',title:'No urgent prediction',text:'Nothing saved suggests an urgent chemistry or refill issue right now.'});
    var scoreStyle='style="--score:'+esc(h.numericScore||0)+'"';
    card.innerHTML='<div class="aqxReefIntelTop"><div><span class="aqxMiniKicker">AquoraX Reef Intelligence</span><h2>Reef Health Engine</h2><p>'+esc(brandCopy(b,h))+'</p></div><div class="aqxReefScore '+esc(h.cls)+'" '+scoreStyle+'><b>'+esc(h.score)+'</b><span>'+esc(h.label)+'</span></div></div><div class="aqxReefIntelGrid"><div class="aqxReefIntelBlock"><strong>ICP Signals</strong><div class="aqxReefSignalChips">'+signalHtml+'</div><small>'+(h.test?esc((h.test.lab||'ICP')+' · '+(h.test.date||'latest')):'No ICP test saved')+'</small></div><div class="aqxReefIntelBlock"><strong>Predictions</strong>'+prediction.map(function(p){return '<div class="aqxPrediction '+esc(p.cls)+'"><b>'+esc(p.title)+'</b><span>'+esc(p.text)+'</span></div>';}).join('')+'</div></div><div class="aqxReefIntelFooter"><span>'+esc(b.short)+' ecosystem</span><span>'+h.products.length+' active product'+(h.products.length===1?'':'s')+'</span><span>'+h.hist.length+' dose/check log'+(h.hist.length===1?'':'s')+'</span></div>';
  }
  function enhanceProviderNotes(){var lab=$('icpLab'), notes=$('icpNotes'); if(!lab||!notes)return; var v=(lab.value||'').toLowerCase(); var add=''; if(/triton/.test(v)) add='Triton ICP imported — Core7 and trace stability should be reviewed against saved dosing.'; else if(/fauna/.test(v)) add='Fauna Marin ICP imported — review trace balance and Balling stability before corrections.'; else if(/coral/.test(v)) add='Coral Essentials ICP support imported — review core method dosing and trace demand.'; if(add && (!notes.value||/Imported from/.test(notes.value))) notes.value=add; }
  var oldParse=typeof aqxParseIcpText==='function'?aqxParseIcpText:null;
  if(oldParse && !oldParse.__aqxReefIntelWrapped){aqxParseIcpText=function(){var out=oldParse.apply(this,arguments); enhanceProviderNotes(); setTimeout(renderReefIntelligence,120); return out;}; aqxParseIcpText.__aqxReefIntelWrapped=true;}
  var oldSave=window.saveIcpTest;
  if(typeof oldSave==='function'&&!oldSave.__aqxReefIntelWrapped){window.saveIcpTest=function(){var out=oldSave.apply(this,arguments); setTimeout(renderReefIntelligence,160); return out;}; window.saveIcpTest.__aqxReefIntelWrapped=true;}
  var oldDel=window.deleteIcpTest;
  if(typeof oldDel==='function'&&!oldDel.__aqxReefIntelWrapped){window.deleteIcpTest=function(){var out=oldDel.apply(this,arguments); setTimeout(renderReefIntelligence,160); return out;}; window.deleteIcpTest.__aqxReefIntelWrapped=true;}
  var oldBrand=window.aqxSetDosingBrand;
  if(typeof oldBrand==='function'&&!oldBrand.__aqxReefIntelWrapped){window.aqxSetDosingBrand=function(){var out=oldBrand.apply(this,arguments); setTimeout(renderReefIntelligence,160); return out;}; window.aqxSetDosingBrand.__aqxReefIntelWrapped=true;}
  var oldRender=window.renderDosingPage;
  if(typeof oldRender==='function'&&!oldRender.__aqxReefIntelWrapped){window.renderDosingPage=function(){var out=oldRender.apply(this,arguments); setTimeout(renderReefIntelligence,80); return out;}; window.renderDosingPage.__aqxReefIntelWrapped=true;}
  window.aqxRenderReefIntelligence=renderReefIntelligence;
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderReefIntelligence,1200);});
})();


/* AquoraX ICP import click recovery — keeps existing ICP parser/review logic intact */
(function(){
  function aqxById(id){ return document.getElementById(id); }

  window.aqxSetIcpImportStatus = window.aqxSetIcpImportStatus || function(msg){
    var ids = ["icpImportStatus","icpStatus","icpUploadStatus","icpOcrStatus"];
    ids.forEach(function(id){
      var el = aqxById(id);
      if(el) el.textContent = msg;
    });
  };

  window.aqxOpenIcpFilePicker = function(){
    var input = aqxById("icpFileInput") || aqxById("icpScreenshotInput") || aqxById("icpUploadInput") || aqxById("icpFile");
    if(!input){
      input = document.createElement("input");
      input.id = "icpFileInput";
      input.type = "file";
      input.accept = "image/*,.pdf";
      input.style.display = "none";
      document.body.appendChild(input);
      aqxBindIcpFileInput(input);
    }
    input.click();
  };

  window.aqxParseIcpTextBridge = function(){
    var txt = aqxById("icpRawText") || aqxById("icpDetectedText") || aqxById("icpTextArea") || aqxById("icpPasteText");
    if(!txt || !String(txt.value || "").trim()){
      aqxSetIcpImportStatus("Paste ICP text first, then tap Parse Pasted Text.");
      return;
    }

    if(typeof parseIcpText === "function") return parseIcpText(txt.value);
    if(typeof aqxParseIcpText === "function") return aqxParseIcpText(txt.value);
    if(typeof parseIcpReportText === "function") return parseIcpReportText(txt.value);
    if(typeof handleIcpParsedText === "function") return handleIcpParsedText(txt.value);

    aqxSetIcpImportStatus("ICP text captured. Review parser is unavailable in this build.");
  };

  function aqxReadFileToText(file, cb){
    var reader = new FileReader();
    reader.onload = function(){ cb(reader.result || ""); };
    reader.onerror = function(){ aqxSetIcpImportStatus("Could not read ICP file. Try another screenshot or paste the text."); };
    reader.readAsText(file);
  }

  window.aqxBindIcpFileInput = function(input){
    if(!input || input.dataset.aqxIcpBound === "yes") return;
    input.dataset.aqxIcpBound = "yes";
    input.addEventListener("change", function(ev){
      var file = ev.target.files && ev.target.files[0];
      if(!file) return;
      aqxSetIcpImportStatus("ICP file selected. Scanning…");

      if(typeof handleIcpFileUpload === "function") return handleIcpFileUpload(file);
      if(typeof aqxHandleIcpFileUpload === "function") return aqxHandleIcpFileUpload(file);
      if(typeof scanIcpScreenshot === "function") return scanIcpScreenshot(file);
      if(typeof aqxScanIcpScreenshot === "function") return aqxScanIcpScreenshot(file);
      if(typeof handleIcpScreenshotFile === "function") return handleIcpScreenshotFile(file);

      // Fallback for text/PDF-like uploads where browser can read embedded text.
      aqxReadFileToText(file, function(text){
        var txt = aqxById("icpRawText") || aqxById("icpDetectedText") || aqxById("icpTextArea") || aqxById("icpPasteText");
        if(txt) txt.value = text;
        aqxSetIcpImportStatus("File loaded. Tap Parse Pasted Text to review.");
      });
    });
  };

  function aqxReconnectIcpImport(){
    var upload = aqxById("icpUploadZone");
    var scan = aqxById("icpScanBtn");
    var parse = aqxById("icpParseTextBtn");
    var input = aqxById("icpFileInput") || aqxById("icpScreenshotInput") || aqxById("icpUploadInput") || aqxById("icpFile");

    if(upload && upload.dataset.aqxIcpClick !== "yes"){
      upload.dataset.aqxIcpClick = "yes";
      upload.style.cursor = "pointer";
      upload.addEventListener("click", window.aqxOpenIcpFilePicker);
    }
    if(scan && scan.dataset.aqxIcpClick !== "yes"){
      scan.dataset.aqxIcpClick = "yes";
      scan.addEventListener("click", window.aqxOpenIcpFilePicker);
    }
    if(parse && parse.dataset.aqxIcpClick !== "yes"){
      parse.dataset.aqxIcpClick = "yes";
      parse.addEventListener("click", window.aqxParseIcpTextBridge);
    }
    if(input) aqxBindIcpFileInput(input);
  }

  document.addEventListener("DOMContentLoaded", aqxReconnectIcpImport);
  window.addEventListener("load", aqxReconnectIcpImport);
  document.addEventListener("click", function(e){
    var t = e.target;
    if(!t) return;
    if(t.closest && (t.closest("#icpUploadZone") || t.closest("#icpScanBtn"))) {
      aqxReconnectIcpImport();
    }
  }, true);
})();


/* AquoraX cloud placeholder removal safety:
   Any old button still calling aqxOpenCloudPanel now opens the real Firebase cloud hub. */
function aqxOpenCloudPanel(){
  if(typeof aqxOpenCloudHub === "function") return aqxOpenCloudHub();
  const real = document.getElementById("aqxCloudPanelOverlay");
  if(real){
    real.classList.add("open");
    real.setAttribute("aria-hidden","false");
  }
}
function aqxCloseCloudPanel(event){
  if(typeof aqxCloseCloudHub === "function") return aqxCloseCloudHub(event);
  const real = document.getElementById("aqxCloudPanelOverlay");
  if(real){
    real.classList.remove("open");
    real.setAttribute("aria-hidden","true");
  }
}


/* AquoraX Cloud login dismiss fix v7
   Firebase login was working, but #aqxLoginScreen stayed visible.
   This only hides the real login gate after a confirmed user session. */
function aqxDismissLoginGateAfterConfirmedCloudUser(){
  try{
    const screen = document.getElementById("aqxLoginScreen");
    if(screen){
      screen.classList.remove("show", "active", "open", "visible");
      screen.classList.add("aqxLoginDismissed");
      screen.style.display = "none";
      screen.style.pointerEvents = "none";
      screen.setAttribute("aria-hidden", "true");
    }

    document.body.classList.add("aqxLoggedIn");
    document.documentElement.classList.add("aqxLoggedIn");

    if(!localStorage.getItem("aquoraxTankType")) localStorage.setItem("aquoraxTankType", "reef");
    localStorage.setItem("aquoraxWelcomeTank", "reef");
    localStorage.setItem("aquoraxWelcomeSeen", "yes");

    const welcome = document.getElementById("welcomeScreen");
    if(welcome){
      welcome.style.display = "none";
      welcome.classList.remove("show", "active", "open");
      welcome.setAttribute("aria-hidden", "true");
    }

    try{ if(typeof aqxRefreshLoginState === "function") aqxRefreshLoginState(); }catch(e){}
    try{ if(typeof aqxUpdateCloudStatus === "function") aqxUpdateCloudStatus("Signed in to AquoraX Cloud."); }catch(e){}
    try{ if(typeof openPage === "function") openPage("home"); }catch(e){}

    setTimeout(function(){
      try{ if(typeof renderParameterPage === "function") renderParameterPage(); }catch(e){}
      try{ if(typeof renderHome === "function") renderHome(); }catch(e){}
      try{ if(typeof renderLatestParams === "function") renderLatestParams(); }catch(e){}
    }, 120);
  }catch(e){
    console.warn("AquoraX login dismiss skipped", e);
  }
}


/* AquoraX Cloud current-user safety v7 */
(function(){
  function check(){
    try{
      if(window.firebase && firebase.auth && firebase.auth().currentUser){
        aqxDismissLoginGateAfterConfirmedCloudUser();
      }
    }catch(e){}
  }
  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(check, 300);
    setTimeout(check, 1200);
    setTimeout(check, 2500);
  });
  window.addEventListener("load", function(){
    setTimeout(check, 300);
    setTimeout(check, 1500);
  });
})();
