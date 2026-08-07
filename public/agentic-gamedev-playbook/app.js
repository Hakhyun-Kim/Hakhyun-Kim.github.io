/* Agentic GameDev Playbook & Dev Blog Web Application */

let siteData = {
  version: '1.37.0',
  chapters: { en: [], ko: [] },
  posts: { en: [], ko: [] }
};

let state = {
  lang: 'en',
  activeTab: 'playbook',
  activeChapterId: '00-intro',
  activePostId: null,
  searchQuery: ''
};

// Elements
const sidebarList = document.getElementById('sidebarList');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarCount = document.getElementById('sidebarCount');
const mainContent = document.getElementById('mainContent');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const versionBadge = document.getElementById('versionBadge');
const logoBtn = document.getElementById('logoBtn');

async function init() {
  try {
    const res = await fetch('data.json');
    if (res.ok) {
      siteData = await res.json();
    }
  } catch (e) {
    console.warn('Failed to load data.json, using runtime state:', e);
  }

  if (siteData.version) {
    versionBadge.textContent = `v${siteData.version}`;
  }

  setupEventListeners();
  updateLanguageUI();
  render();
}

function setupEventListeners() {
  // Nav Tabs
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.dataset.tab;
      state.activePostId = null;
      render();
    });
  });

  // Language Switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.lang = btn.dataset.lang;
      updateLanguageUI();
      render();
    });
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    if (state.searchQuery) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    render();
  });

  // Logo Reset
  logoBtn.addEventListener('click', () => {
    state.activeTab = 'playbook';
    state.activeChapterId = '00-intro';
    state.activePostId = null;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-tab="playbook"]').classList.add('active');
    render();
  });

  // Keyboard shortcut '/' for search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

function updateLanguageUI() {
  document.querySelectorAll('[data-en]').forEach(el => {
    const text = state.lang === 'ko' ? el.dataset.ko : el.dataset.en;
    if (text) el.textContent = text;
  });

  const placeholders = {
    en: "Search chapters & posts... (Press '/' to search)",
    ko: "목차 및 개발 블로그 검색... ('/' 입력시 즉시 검색)"
  };
  searchInput.placeholder = placeholders[state.lang] || placeholders.en;
}

function render() {
  renderSidebar();
  renderMain();
}

function renderSidebar() {
  sidebarList.innerHTML = '';
  const chapters = siteData.chapters[state.lang] || [];
  const posts = siteData.posts[state.lang] || [];

  if (state.activeTab === 'playbook') {
    sidebarTitle.textContent = state.lang === 'ko' ? '플레이북 목차' : 'Chapters';
    sidebarCount.textContent = chapters.length;

    const filtered = chapters.filter(c => 
      !state.searchQuery || c.title.toLowerCase().includes(state.searchQuery) || c.content.toLowerCase().includes(state.searchQuery)
    );

    filtered.forEach(ch => {
      const item = document.createElement('div');
      item.className = `sidebar-item ${ch.id === state.activeChapterId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="num">${ch.id.split('-')[0]}</span>
        <span class="title-text">${ch.title.replace(/^#+\s*/, '')}</span>
      `;
      item.addEventListener('click', () => {
        state.activeChapterId = ch.id;
        render();
      });
      sidebarList.appendChild(item);
    });
  } else if (state.activeTab === 'blog') {
    sidebarTitle.textContent = state.lang === 'ko' ? '블로그 게시글' : 'Dev Posts';
    sidebarCount.textContent = posts.length;

    const filtered = posts.filter(p => 
      !state.searchQuery || p.title.toLowerCase().includes(state.searchQuery) || p.content.toLowerCase().includes(state.searchQuery)
    );

    filtered.forEach(p => {
      const item = document.createElement('div');
      item.className = `sidebar-item ${p.id === state.activePostId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="num">📰</span>
        <span class="title-text">${p.title}</span>
      `;
      item.addEventListener('click', () => {
        state.activePostId = p.id;
        render();
      });
      sidebarList.appendChild(item);
    });
  } else {
    sidebarTitle.textContent = state.lang === 'ko' ? '빠른 메뉴' : 'Quick Menu';
    sidebarCount.textContent = state.activeTab;
    const item = document.createElement('div');
    item.className = 'sidebar-item active';
    item.innerHTML = `<span class="num">⚡</span><span class="title-text">${state.activeTab.toUpperCase()}</span>`;
    sidebarList.appendChild(item);
  }
}

function renderMain() {
  mainContent.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'markdown-body';

  if (state.activeTab === 'playbook') {
    const chapters = siteData.chapters[state.lang] || [];
    const cur = chapters.find(c => c.id === state.activeChapterId) || chapters[0];
    if (cur) {
      const html = window.marked ? window.marked.parse(cur.content) : `<pre>${cur.content}</pre>`;
      container.innerHTML = html;
    } else {
      container.innerHTML = '<h2>Chapter Not Found</h2>';
    }
  } else if (state.activeTab === 'blog') {
    const posts = siteData.posts[state.lang] || [];
    if (state.activePostId) {
      const p = posts.find(post => post.id === state.activePostId);
      if (p) {
        const html = window.marked ? window.marked.parse(p.content) : `<pre>${p.content}</pre>`;
        container.innerHTML = `
          <div style="margin-bottom: 20px;">
            <button id="backToBlogFeed" style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--primary); padding: 6px 14px; border-radius: 6px; cursor: pointer;">
              ← ${state.lang === 'ko' ? '블로그 목록으로 돌아가기' : 'Back to Dev Blog Feed'}
            </button>
          </div>
          ${html}
        `;
        setTimeout(() => {
          const btn = document.getElementById('backToBlogFeed');
          if (btn) btn.addEventListener('click', () => { state.activePostId = null; render(); });
        }, 0);
      }
    } else {
      // Feed Grid View
      container.innerHTML = `
        <h1>${state.lang === 'ko' ? '📰 개발 블로그 & 회고 피드' : '📰 Dev Blog & Retro Feed'}</h1>
        <p style="color: var(--text-muted);">${state.lang === 'ko' ? '게임 개발 과정에서 축적된 일일/주간 레슨과 릴리스 소식을 정기적으로 업데이트합니다.' : 'Regular updates, daily retros, and production lessons captured from active game repositories.'}</p>
        <div class="blog-feed">
          ${posts.map(p => `
            <div class="blog-card" data-id="${p.id}">
              <div class="blog-card-meta">
                <span class="category-badge">${p.category}</span>
                <span class="post-date">${p.date}</span>
              </div>
              <div class="blog-card-title">${p.title}</div>
              <div class="blog-card-summary">${p.summary}</div>
            </div>
          `).join('')}
        </div>
      `;
      setTimeout(() => {
        container.querySelectorAll('.blog-card').forEach(card => {
          card.addEventListener('click', () => {
            state.activePostId = card.dataset.id;
            render();
          });
        });
      }, 0);
    }
  } else if (state.activeTab === 'tools') {
    container.innerHTML = `
      <h1>${state.lang === 'ko' ? '🛠️ MCP 서버 & 백그라운드 도구' : '🛠️ MCP Server & Background Tools'}</h1>
      <p>${state.lang === 'ko' ? '의존성 0개 Node.js stdio JSON-RPC 2.0 서버로 구현된 플레이북 MCP 서버 도구 및 슬래시 프롬프트 안내입니다.' : 'Playbook MCP Server tools and slash prompts implemented via dependency-free Node.js stdio JSON-RPC 2.0.'}</p>
      
      <h2>Tools</h2>
      <table>
        <thead><tr><th>Tool</th><th>${state.lang === 'ko' ? '설명' : 'Description'}</th></tr></thead>
        <tbody>
          <tr><td><code>playbook_toc</code></td><td>${state.lang === 'ko' ? '플레이북 전체 목차 반환' : 'Returns complete table of contents'}</td></tr>
          <tr><td><code>playbook_section {query}</code></td><td>${state.lang === 'ko' ? '주제별 섹션 전문 검색 및 반환' : 'Searches and returns section content by keyword'}</td></tr>
          <tr><td><code>playbook_checklist</code></td><td>${state.lang === 'ko' ? '새 게임 부트스트랩 체크리스트 반환' : 'Returns 20-item bootstrap checklist'}</td></tr>
          <tr><td><code>playbook_full</code></td><td>${state.lang === 'ko' ? '플레이북 전체 마크다운 반환' : 'Returns full playbook markdown'}</td></tr>
        </tbody>
      </table>

      <h2>Prompts</h2>
      <table>
        <thead><tr><th>Prompt</th><th>${state.lang === 'ko' ? '설명' : 'Description'}</th></tr></thead>
        <tbody>
          <tr><td><code>new-game {concept}</code></td><td>${state.lang === 'ko' ? '3-Gate 및 4대 규약으로 새 게임 프로젝트 시작' : 'Starts new game using 3-Gate and 4 architecture rules'}</td></tr>
          <tr><td><code>balance-tuning</code></td><td>${state.lang === 'ko' ? '가상 봇 시뮬레이션 및 회귀 게이트 구축' : 'Constructs virtual balance bot and regression gate'}</td></tr>
          <tr><td><code>quality-pass</code></td><td>${state.lang === 'ko' ? '에셋 0개 그래픽/사운드 퀄리티업 패스 적용' : 'Applies zero-asset graphics/sound polish pass'}</td></tr>
        </tbody>
      </table>
    `;
  } else if (state.activeTab === 'checklist') {
    container.innerHTML = `
      <h1>${state.lang === 'ko' ? '✅ 새 게임 부트스트랩 체크리스트' : '✅ New Game Bootstrap Checklist'}</h1>
      <p style="color: var(--text-muted); margin-bottom: 24px;">${state.lang === 'ko' ? '새 게임 프로젝트 시작 시 체크박스로 진행 상태를 관리하세요.' : 'Track your progress when bootstrapping a new game project.'}</p>
      <div id="checklistItems" style="display: flex; flex-direction: column; gap: 10px;"></div>
    `;
    setTimeout(() => {
      renderChecklistItems();
    }, 0);
  }

  mainContent.appendChild(container);
}

function renderChecklistItems() {
  const itemsContainer = document.getElementById('checklistItems');
  if (!itemsContainer) return;
  
  const defaultItems = [
    "data.(js|ts) — Centralized balance config",
    "engine.(js|ts) — Pure tick(state, dt) => events[] with injected RNG",
    "Seeded RNG (mulberry32) — Game uses Math.random / Bot uses seeded RNG",
    "render.(js|ts) — Render state + emit events to visual effects (blob shadows)",
    "sfx — tone() + noise() primitives, rate-limited impact hits (45-70ms)",
    "music — 16-step sequencer with state-based BGM tracks",
    "scripts/balance-bot — 3 virtual player profiles x N runs => death distributions",
    "scripts/baseline.json + check regression gate",
    "Closed-form expectation test for Push-Your-Luck mechanics",
    "Cross-language value verification parsers for multi-runtime projects",
    "Zero-external-asset verification tests",
    "window.__game debug hooks + ?rafshim + fixed timestep",
    "Game feel: Ghost health bar, hit flash, combo pops, floating damage text",
    "Full keyboard controls (Enter/Space/Esc/Tab/hotkeys)",
    "Predictive UI: Auto-advance single choices, one-button loop execution",
    "Dominant stat card badges & derived stat hover tooltips",
    "Action-Changing Evolution Jackpot traits",
    "Meta-progression currency retained upon player death",
    "Adaptive graphics quality scaling based on real-time FPS benchmarks",
    "First 5 minutes: Instant Play + coach chips + target goal hints + PNG share",
    "CI smoke gate (clean onboarding + 0 console errors)",
    "Nightly automated balance regression Cron",
    "Daily bot run automation => Commit telemetry JSON as daily leaderboards",
    "Morning trend scout agent (repo review => 3-Gate filter => top recommendations)"
  ];

  const saved = JSON.parse(localStorage.getItem('gamedev_checklist') || '{}');

  itemsContainer.innerHTML = defaultItems.map((itemText, idx) => {
    const isChecked = saved[idx] ? 'checked' : '';
    return `
      <label style="display: flex; align-items: center; gap: 12px; background: var(--bg-card); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;">
        <input type="checkbox" data-idx="${idx}" ${isChecked} style="width: 18px; height: 18px; accent-color: var(--primary);">
        <span style="font-size: 14px; color: ${isChecked ? 'var(--text-muted)' : '#fff'}; text-decoration: ${isChecked ? 'line-through' : 'none'};">${itemText}</span>
      </label>
    `;
  }).join('');

  itemsContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const idx = e.target.dataset.idx;
      saved[idx] = e.target.checked;
      localStorage.setItem('gamedev_checklist', JSON.stringify(saved));
      renderChecklistItems();
    });
  });
}

init();
