(() => {
  const ROBLOX_USER = "Puppyiscute352";
  const ROBLOX_PROFILE_URL = `https://www.roblox.com/users/profile?username=${encodeURIComponent(ROBLOX_USER)}`;

  const STORAGE_KEYS = {
    me: "rdg_me_v1",
    users: "rdg_users_v1",
    bans: "rdg_bans_v1",
    tier: "rdg_tier_v1"
  };

  const OWNER_PASSWORD = "password";

  const $ = (sel) => document.querySelector(sel);

  const state = {
    tier: "beginner",
    me: null,
    users: [],
    bans: new Set()
  };

  const TIER_INFO = {
    beginner: {
      title: "Beginner",
      desc: "Start here if you’re new to Roblox Studio and Lua."
    },
    intermediate: {
      title: "Intermediate",
      desc: "You should be comfortable reading/writing basic Lua and using Studio."
    },
    master: {
      title: "Master",
      desc: "Advanced systems, optimization, architecture, and production habits."
    }
  };

  const LESSONS = {
    beginner: [
      {
        title: "Getting set up (Studio + Explorer)",
        meta: "Basics",
        body: [
          "Install Roblox Studio on PC/Mac (mobile Studio isn’t the main workflow).",
          "Learn the panels: Explorer, Properties, Toolbox, Output, Command Bar.",
          "Make a Baseplate, add Parts, group Models, and save your place."
        ],
        codeLabel: "Print to Output",
        code: `print("Hello Roblox!")`
      },
      {
        title: "Your first script (ServerScriptService)",
        meta: "Lua",
        body: [
          "ServerScriptService is for server scripts that run for everyone.",
          "Create Script → type code → press Play to test."
        ],
        codeLabel: "Simple variable + print",
        code: `local coins = 10
coins += 5
print("Coins:", coins)`
      },
      {
        title: "Events (Touched)",
        meta: "Gameplay",
        body: [
          "Use events to react when something happens.",
          "Touched fires when a BasePart touches another BasePart."
        ],
        codeLabel: "Touched example",
        code: `local part = script.Parent

part.Touched:Connect(function(hit)
  local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
  if humanoid then
    humanoid.Health -= 10
  end
end)`
      }
    ],
    intermediate: [
      {
        title: "RemoteEvents (client ↔ server)",
        meta: "Networking",
        body: [
          "Never trust the client with rewards or damage.",
          "Client requests, server validates, server applies."
        ],
        codeLabel: "RemoteEvent pattern",
        code: `-- Server
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local evt = ReplicatedStorage:WaitForChild("BuyItem")

evt.OnServerEvent:Connect(function(player, itemId)
  if typeof(itemId) ~= "string" then return end
  -- validate itemId + player funds here
  print(player.Name, "requested", itemId)
end)

-- Client
-- ReplicatedStorage.BuyItem:FireServer("Sword01")`
      },
      {
        title: "DataStore basics (saving player data)",
        meta: "Saving",
        body: [
          "Use DataStoreService on server.",
          "Handle errors with pcall and don’t spam requests."
        ],
        codeLabel: "DataStore skeleton",
        code: `local DSS = game:GetService("DataStoreService")
local ds = DSS:GetDataStore("PlayerData_v1")

game.Players.PlayerAdded:Connect(function(plr)
  local ok, data = pcall(function()
    return ds:GetAsync(plr.UserId)
  end)
  if ok and data then
    print("Loaded", data)
  end
end)

game.Players.PlayerRemoving:Connect(function(plr)
  local ok, err = pcall(function()
    ds:SetAsync(plr.UserId, {coins = 100})
  end)
  if not ok then warn(err) end
end)`
      }
    ],
    master: [
      {
        title: "Architecture: Modules + services",
        meta: "Structure",
        body: [
          "Use ModuleScripts for reusable logic.",
          "Separate concerns: PlayerDataService, InventoryService, CombatService, UIController.",
          "Keep networking endpoints small and validated."
        ],
        codeLabel: "Module pattern",
        code: `-- ModuleScript: PlayerDataService
local PlayerDataService = {}

function PlayerDataService.Init()
  print("Init PlayerDataService")
end

return PlayerDataService

-- ServerScript
local PlayerDataService = require(script.Parent.PlayerDataService)
PlayerDataService.Init()`
      },
      {
        title: "Performance habits",
        meta: "Optimization",
        body: [
          "Avoid huge loops every frame. Use events and throttling.",
          "Cache instances, avoid excessive Instance.new in hot paths.",
          "Watch Output + MicroProfiler, and test with multiple players."
        ],
        codeLabel: "Throttled loop",
        code: `local last = 0
local interval = 0.25

game:GetService("RunService").Heartbeat:Connect(function(dt)
  last += dt
  if last < interval then return end
  last = 0
  -- do periodic work here
end)`
      }
    ]
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function makeId() {
    return "U" + Date.now().toString(36) + randInt(100, 999).toString(36);
  }

  function makeUsername() {
    return "DevLearner" + randInt(100, 999);
  }

  function ensureMe() {
    const me = loadJSON(STORAGE_KEYS.me, null);
    if (me && me.id && me.username) return me;

    const created = { id: makeId(), username: makeUsername(), createdAt: Date.now() };
    saveJSON(STORAGE_KEYS.me, created);
    return created;
  }

  function ensureUsers(me) {
    const users = loadJSON(STORAGE_KEYS.users, []);
    const existing = users.find(u => u.id === me.id);
    if (!existing) users.push(me);
    saveJSON(STORAGE_KEYS.users, users);
    return users;
  }

  function loadBans() {
    const bansArr = loadJSON(STORAGE_KEYS.bans, []);
    return new Set(Array.isArray(bansArr) ? bansArr : []);
  }

  function saveBans(set) {
    saveJSON(STORAGE_KEYS.bans, Array.from(set));
  }

  function setTier(tier) {
    state.tier = tier;
    localStorage.setItem(STORAGE_KEYS.tier, tier);
    renderTier();
    renderLessons();
    renderTierButtons();
  }

  function renderTierButtons() {
    document.querySelectorAll(".btn.tier").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tier === state.tier);
    });
  }

  function renderTier() {
    const info = TIER_INFO[state.tier];
    $("#tierTitle").textContent = info.title;
    $("#tierDesc").textContent = info.desc;
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&":"&","<":"<",">":">",'"':""","'":"'"
    }[c]));
  }

  function makeCodeBox(label, code, id) {
    const safe = escapeHTML(code);
    return `
      <div class="codebox">
        <div class="code-top">
          <div class="code-label">${escapeHTML(label || "Code")}</div>
          <button class="copy-btn" data-copy-id="${id}">Copy code</button>
        </div>
        <pre id="${id}"><code>${safe}</code></pre>
      </div>
    `;
  }

  function renderLessons() {
    const list = $("#lessonList");
    const lessons = LESSONS[state.tier] || [];
    list.innerHTML = lessons.map((l, idx) => {
      const codeId = `code_${state.tier}_${idx}`;
      const paras = (l.body || []).map(t => `<p class="p">${escapeHTML(t)}</p>`).join("");
      const code = l.code ? makeCodeBox(l.codeLabel || "Code", l.code, codeId) : "";
      return `
        <div class="item">
          <div class="item-header" data-acc-header="1">
            <div>
              <div class="item-title">${escapeHTML(l.title)}</div>
              <div class="small">${escapeHTML(l.meta || "")}</div>
            </div>
            <div class="item-meta">Tap</div>
          </div>
          <div class="item-body">
            ${paras}
            ${code}
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".item-header").forEach(h => {
      h.addEventListener("click", () => {
        const item = h.closest(".item");
        item.classList.toggle("open");
      });
    });

    list.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-copy-id");
        const el = document.getElementById(id);
        const text = el ? el.innerText : "";
        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add("ok");
          btn.textContent = "Copied";
          setTimeout(() => {
            btn.classList.remove("ok");
            btn.textContent = "Copy code";
          }, 900);
        } catch {
          btn.textContent = "Copy failed";
          setTimeout(() => btn.textContent = "Copy code", 900);
        }
      });
    });
  }

  function showModal(title, bodyHTML, actions) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHTML;
    $("#modalActions").innerHTML = "";
    actions.forEach(a => {
      const b = document.createElement("button");
      b.className = `btn ${a.className || ""}`.trim();
      b.textContent = a.label;
      b.addEventListener("click", a.onClick);
      $("#modalActions").appendChild(b);
    });
    $("#modalBackdrop").classList.remove("hidden");
    $("#modal").classList.remove("hidden");
  }

  function hideModal() {
    $("#modalBackdrop").classList.add("hidden");
    $("#modal").classList.add("hidden");
  }

  function warnTierSwitch(nextTier) {
    if (nextTier === "beginner") return true;

    let ok = false;
    showModal(
      "Warning",
      `<div class="p">Before switching to ${escapeHTML(TIER_INFO[nextTier].title)}, make sure you understand coding basics (Lua) and how Roblox Studio works.</div>
       <div class="small">If you’re not comfortable yet, stay on Beginner.</div>`,
      [
        { label: "Cancel", className: "ghost", onClick: () => { hideModal(); } },
        { label: "I understand", className: "btn-warn", onClick: () => { ok = true; hideModal(); setTier(nextTier); } }
      ]
    );
    return ok;
  }

  function ownerLogin() {
    showModal(
      "Owner Login",
      `<div class="p">Enter owner password</div>
       <input id="ownerPass" class="input" type="password" placeholder="password" />`,
      [
        { label: "Close", className: "ghost", onClick: hideModal },
        { label: "Continue", onClick: () => {
            const val = ($("#ownerPass").value || "").trim();
            if (val !== OWNER_PASSWORD) {
              $("#modalBody").insertAdjacentHTML("beforeend", `<div class="small" style="color:#ffd2d2">Wrong password</div>`);
              return;
            }
            hideModal();
            openOwnerPanel();
          }
        }
      ]
    );
    setTimeout(() => $("#ownerPass")?.focus(), 50);
  }

  function openOwnerPanel() {
    const bannedCount = state.users.filter(u => state.bans.has(u.id)).length;

    const rows = state.users.map(u => {
      const isBanned = state.bans.has(u.id);
      return `
        <div class="row">
          <div>
            <div style="font-weight:900">${escapeHTML(u.username)}</div>
            <div class="small">ID: ${escapeHTML(u.id)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="badge ${isBanned ? "banned" : ""}">${isBanned ? "Banned" : "Active"}</span>
            <button class="btn ${isBanned ? "" : "btn-danger"}" data-ban-id="${escapeHTML(u.id)}">
              ${isBanned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>
      `;
    }).join("");

    showModal(
      "Owner Panel",
      `<div class="p">Total users: <span style="font-weight:900">${state.users.length}</span></div>
       <div class="p">Banned: <span style="font-weight:900">${bannedCount}</span></div>
       <div style="height:10px"></div>
       <div>${rows || `<div class="small">No users yet.</div>`}</div>`,
      [
        { label: "Close", className: "ghost", onClick: hideModal }
      ]
    );

    $("#modalBody").querySelectorAll("[data-ban-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-ban-id");
        if (!id) return;
        if (state.bans.has(id)) state.bans.delete(id);
        else state.bans.add(id);
        saveBans(state.bans);
        hideModal();
        openOwnerPanel();
      });
    });
  }

  function checkBan(me) {
    if (!state.bans.has(me.id)) return;
    showModal(
      "Access restricted",
      `<div class="p">This account is banned.</div>
       <div class="small">User: ${escapeHTML(me.username)} (ID: ${escapeHTML(me.id)})</div>`,
      [{ label: "OK", onClick: () => {} }]
    );
  }

  function init() {
    $("#followBanner").addEventListener("click", () => {
      window.open(ROBLOX_PROFILE_URL, "_blank", "noopener,noreferrer");
    });
    $("#followBanner").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") $("#followBanner").click();
    });

    state.me = ensureMe();
    state.users = ensureUsers(state.me);
    state.bans = loadBans();

    const savedTier = localStorage.getItem(STORAGE_KEYS.tier);
    if (savedTier && TIER_INFO[savedTier]) state.tier = savedTier;

    $("#ownerBtn").addEventListener("click", ownerLogin);
    $("#modalBackdrop").addEventListener("click", hideModal);

    document.querySelectorAll(".btn.tier").forEach(btn => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.tier;
        if (!next || next === state.tier) return;
        if (next === "beginner") setTier(next);
        else warnTierSwitch(next);
      });
    });

    renderTierButtons();
    renderTier();
    renderLessons();
    checkBan(state.me);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
