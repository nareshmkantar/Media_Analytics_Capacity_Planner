/**
 * Resource Tracker Dashboard - JavaScript Application
 * Handles data loading, view rendering, and user interactions
 */

// Global state
let appState = {
    data: null,
    currentView: 'overview',
    filters: {
        platform: 'all',
        skill: 'all',
        trained: 'all',
        manager: 'all',
        role: 'all',
        search: ''
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initSidebarToggle(); // Initialize sidebar toggle
    initNavigation();
    initFilters();
    initSearch();
    initAddProjectModal(); // Initialize Add Project modal
    initAddEmployeeModal(); // Initialize Add Employee modal
    initColumnFilters(); // Initialize column filters for Projects
    initSkillFilters(); // Initialize column filters for Skills
    initUtilizationFilters(); // Initialize column filters for Utilization
    initTimelineFilter(); // Initialize filter for Timeline
    renderCurrentView();
});

// Load JSON data
async function loadData() {
    try {
        // Add timestamp to bust cache
        const response = await fetch('data.json?v=' + Date.now());
        if (!response.ok) throw new Error('Failed to load data');
        appState.data = await response.json();
        console.log('Data loaded:', appState.data.summary);
        console.log('First project models:', appState.data.projects?.[0]?.models);
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data. Please run the Python script first.');
    }
}

// Show error message
function showError(message) {
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 60px; color: var(--accent-red);">
            <h2>⚠️ Error</h2>
            <p>${message}</p>
            <p style="color: var(--text-muted); margin-top: 20px;">
                Run: <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">python read_excel.py</code>
            </p>
        </div>
    `;
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);

            // Close mobile sidebar if active
            document.querySelector('.sidebar').classList.remove('mobile-active');
        });
    });
}

// Sidebar Toggle
function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Check saved state
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentlyCollapsed = sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            localStorage.setItem('sidebar-collapsed', currentlyCollapsed);

            // Trigger resize event for any charts that might need it
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Timeline Tabs - Scoped
    document.querySelectorAll('#view-timeline .cockpit-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            console.log('[Timeline Tab Clicked]', tab.dataset.cockpit);
            const container = document.getElementById('view-timeline');
            container.querySelectorAll('.cockpit-tab').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.cockpit-view').forEach(v => v.classList.remove('active'));

            tab.classList.add('active');
            const viewId = `cockpit-${tab.dataset.cockpit}`;
            const targetView = document.getElementById(viewId);
            if (targetView) targetView.classList.add('active');
            renderTimelineView();
        });
    });
    // Mobile toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-active');
        });
    }

    // Resources View Sub-Tabs
    const resTabs = document.querySelectorAll('[data-res-tab]');
    resTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const activeTab = tab.dataset.resTab;

            // Update active state
            resTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show active content
            document.querySelectorAll('[id^="res-tab-"]').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById(`res-tab-${activeTab}`).classList.add('active');

            // Render content
            if (activeTab === 'utilization') renderUtilizationView();
            else if (activeTab === 'team') renderTeamView();
            else if (activeTab === 'skills') renderSkillsView();
        });
    });
}

function switchView(viewName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`view-${viewName}`).classList.add('active');

    // Update header titles
    const titles = {
        overview: 'Overview',
        overview: 'Overview',
        resources: 'Resources',
        projects: 'Projects',
        timeline: 'Project Deepdive'
    };
    document.getElementById('page-title').textContent = titles[viewName] || 'Overview';

    // Update global search placeholder based on context
    const searchPlaceholders = {
        overview: 'Search dashboard...',
        overview: 'Search dashboard...',
        resources: 'Search resources...',
        projects: 'Search projects or models...',
        timeline: 'Search projects...'
    };
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.placeholder = searchPlaceholders[viewName] || 'Search...';
        globalSearch.value = ''; // Clear search when switching views
        appState.filters.search = ''; // Reset search filter
    }

    // Toggle Header Buttons
    const addProjectBtn = document.getElementById('add-project-btn');
    const addEmployeeBtn = document.getElementById('add-employee-btn');

    if (addProjectBtn) {
        addProjectBtn.style.display = viewName === 'projects' ? 'flex' : 'none';
    }

    if (addEmployeeBtn) {
        // Show button if we are in Resources view and Team tab is active
        const activeResTab = document.querySelector('[data-res-tab].active')?.dataset.resTab;
        addEmployeeBtn.style.display = (viewName === 'resources' && activeResTab === 'team') ? 'flex' : 'none';

        // Also add a listener to update button visibility when switching sub-tabs
        // This is a bit of a hack, ideally state management handles this
        document.querySelectorAll('[data-res-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const isActive = tab.dataset.resTab === 'team';
                const isResourceView = appState.currentView === 'resources';
                addEmployeeBtn.style.display = (isResourceView && isActive) ? 'flex' : 'none';
            });
        });
    }

    appState.currentView = viewName;
    renderCurrentView();
}

function renderCurrentView() {
    if (!appState.data) return;

    switch (appState.currentView) {
        case 'overview':
            renderOverview();
            break;
        case 'resources':
            renderResourcesView();
            break;
        case 'projects':
            renderProjectsView();
            break;
        case 'timeline':
            renderTimelineView();
            break;
    }
}

function renderResourcesView() {
    // Determine active sub-tab
    const activeTab = document.querySelector('[data-res-tab].active')?.dataset.resTab || 'utilization';

    if (activeTab === 'utilization') renderUtilizationView();
    else if (activeTab === 'team') renderTeamView();
    else if (activeTab === 'skills') renderSkillsView();
}

// Filters
function initFilters() {
    // Platform filter
    document.getElementById('platform-filter')?.addEventListener('change', (e) => {
        appState.filters.platform = e.target.value;
        renderCurrentView();
    });

    // Skill filter
    document.getElementById('skill-filter')?.addEventListener('change', (e) => {
        appState.filters.skill = e.target.value;
        renderCurrentView();
    });

    // Trained filter
    document.getElementById('trained-filter')?.addEventListener('change', (e) => {
        appState.filters.trained = e.target.value;
        renderCurrentView();
    });

    // Manager filter
    document.getElementById('manager-filter')?.addEventListener('change', (e) => {
        appState.filters.manager = e.target.value;
        renderCurrentView();
    });

    // Role filter
    document.getElementById('role-filter')?.addEventListener('change', (e) => {
        appState.filters.role = e.target.value;
        renderCurrentView();
    });
}

function initSearch() {
    const searchInput = document.getElementById('global-search');
    searchInput?.addEventListener('input', (e) => {
        appState.filters.search = e.target.value.toLowerCase();
        renderCurrentView();
    });
}

// Filter resources
function getFilteredResources() {
    if (!appState.data) return [];

    return appState.data.resources.filter(r => {
        // Search filter
        if (appState.filters.search) {
            const searchTerm = appState.filters.search;
            const searchable = `${r.name} ${r.manager} ${r.role} ${r.projects.join(' ')}`.toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }

        // Platform filter
        if (appState.filters.platform !== 'all') {
            const platform = appState.filters.platform;
            let hasSkill = false;
            if (platform === 'hai') {
                hasSkill = ['haiSales', 'haiDI', 'haiLT', 'haiPF'].some(k =>
                    r.skillLevels[k] && !r.skillLevels[k].includes('Not Trained')
                );
            } else if (platform === 'athena') {
                hasSkill = r.skillLevels.athena && !r.skillLevels.athena.includes('Not Trained');
            } else if (platform === 'custom') {
                hasSkill = r.skillLevels.custom && !r.skillLevels.custom.includes('Not Trained');
            }
            if (!hasSkill) return false;
        }

        // Trained filter
        if (appState.filters.trained !== 'all') {
            const trained = appState.filters.trained === 'yes';
            if (r.haiTrained !== trained) return false;
        }

        // Manager filter
        if (appState.filters.manager !== 'all') {
            if (r.manager !== appState.filters.manager) return false;
        }

        // Role filter  
        if (appState.filters.role !== 'all') {
            if (r.role !== appState.filters.role) return false;
        }

        return true;
    });
}

// Overview View
function renderOverview() {
    const summary = appState.data.summary;

    // Update stats
    document.getElementById('total-resources').textContent = summary.totalResources;
    document.getElementById('allocated-resources').textContent = summary.allocatedResources;
    document.getElementById('hai-trained').textContent = summary.haiTrained;

    // Calculate utilization rate
    const totalCap = Object.values(summary.totalCapacity).reduce((a, b) => a + b, 0);
    const totalAlloc = Object.values(summary.totalAllocations).reduce((a, b) => a + b, 0);
    const utilRate = totalCap > 0 ? Math.round((totalAlloc / totalCap) * 100) : 0;
    document.getElementById('utilization-rate').textContent = `${utilRate}%`;

    // Role distribution
    renderRoleDistribution(summary.roleDistribution);

    // Skill distribution
    renderSkillDistribution(summary.skillDistribution);

    // Capacity overview
    renderCapacityOverview(summary.totalCapacity, summary.totalAllocations);

    // Health Distribution
    renderHealthDistribution();

    // Capability Forecasting
    renderCapabilityForecasting();
}

function renderCapabilityForecasting() {
    const resources = appState.data.resources;
    const matrix = appState.data.capabilityMatrix || [];

    // 1. Calculate Total Org Capacity by platform
    const platformCap = {
        'HAI Sales': 0,
        'HAI D/I': 0,
        'HAI LT': 0,
        'HAI PF': 0,
        'Athena': 0,
        'Custom': 0
    };

    const keyMap = {
        'haiSales': 'HAI Sales',
        'haiDI': 'HAI D/I',
        'haiLT': 'HAI LT',
        'haiPF': 'HAI PF',
        'athena': 'Athena',
        'custom': 'Custom'
    };

    resources.forEach(r => {
        Object.entries(r.obCapacity).forEach(([key, cap]) => {
            if (keyMap[key]) platformCap[keyMap[key]] += cap;
        });
    });

    // Render Forecasting Chart
    const forecastContainer = document.getElementById('capacity-forecast-chart');
    if (forecastContainer) {
        let html = '';
        Object.entries(platformCap).forEach(([platform, totalCap]) => {
            const matrixEntry = matrix.find(m => m.platform === platform || (platform.includes(m.platform) && m.platform !== ''));
            const duration = matrixEntry ? matrixEntry.durationWeeks : '4-6';
            html += `
                <div class="distribution-bar">
                    <span class="label">${platform}</span>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${Math.min(100, (totalCap / 20) * 100)}%; background: var(--accent-blue)"></div>
                    </div>
                    <span class="value" title="Max Parallel Models">${totalCap.toFixed(1)} <small>(~${duration}w)</small></span>
                </div>
            `;
        });
        forecastContainer.innerHTML = html;
    }

    // 2. Competency Gaps
    const gapContainer = document.getElementById('competency-gap-chart');
    if (gapContainer) {
        const platformSkills = {};
        resources.forEach(r => {
            Object.entries(r.skillLevels).forEach(([key, level]) => {
                const platform = keyMap[key];
                if (!platform) return;
                if (!platformSkills[platform]) platformSkills[platform] = { Beginner: 0, Intermediate: 0, Advanced: 0 };
                if (platformSkills[platform][level] !== undefined) platformSkills[platform][level]++;
            });
        });

        let gapHtml = '';
        Object.entries(platformSkills).forEach(([platform, skills]) => {
            const total = skills.Beginner + skills.Intermediate + skills.Advanced;
            const advPct = total > 0 ? (skills.Advanced / total) * 100 : 0;
            const status = advPct < 20 ? 'Critical Gap' : (advPct < 40 ? 'Moderate' : 'Healthy');
            const color = status === 'Critical Gap' ? 'var(--accent-red)' : (status === 'Moderate' ? 'var(--accent-orange)' : 'var(--accent-green)');

            gapHtml += `
                <div class="gap-item" style="margin-bottom: 12px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>${platform}</span>
                        <span style="color: ${color}; font-weight: 600;">${status}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted)">
                        Advanced: ${skills.Advanced} | Total Trained: ${total}
                    </div>
                </div>
            `;
        });
        gapContainer.innerHTML = gapHtml;
    }
}

function renderHealthDistribution() {
    const resources = appState.data.resources;
    const stats = { green: 0, amber: 0, red: 0 };

    resources.forEach(r => {
        const health = getResourceHealth(r);
        stats[health.status]++;
    });

    // Insert health summary into overview if container exists
    const container = document.getElementById('health-distribution-chart');
    if (!container) return;

    const total = resources.length;
    let html = '';
    ['green', 'amber', 'red'].forEach(status => {
        const count = stats[status];
        const pct = Math.round((count / total) * 100);
        const color = status === 'green' ? 'var(--accent-green)' : (status === 'amber' ? 'var(--accent-orange)' : 'var(--accent-red)');
        html += `
            <div class="distribution-bar">
                <span class="label" style="text-transform: capitalize;">${status}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${pct}%; background: ${color}"></div>
                </div>
                <span class="value">${count}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function getResourceHealth(r) {
    const totalCap = Object.values(r.obCapacity).reduce((a, b) => a + b, 0);
    const totalAlloc = Object.values(r.allocations).reduce((a, b) => a + b, 0);
    const util = totalCap > 0 ? (totalAlloc / totalCap) * 100 : 0;

    if (util < 70) return { status: 'blue', label: 'Under-utilized', util };
    if (util <= 95) return { status: 'green', label: 'Optimal', util };
    if (util <= 110) return { status: 'amber', label: 'Over-allocated', util };
    return { status: 'red', label: 'Burnout', util };
}

function getProjectHealth(project, resources, weeklyData) {
    const members = resources.filter(r => r.projects.includes(project.Project_Name));

    if (members.length === 0) return { status: 'red', label: 'Unstaffed', reason: 'No resources allocated to this project.' };

    // 1. Over-allocation Contagion
    const overworkedMember = members.find(m => {
        const h = getResourceHealth(m);
        return h.util > 110;
    });
    if (overworkedMember) {
        return { status: 'red', label: 'Burnout Risk', reason: `Resource Overload: ${overworkedMember.name} is over-allocated across all projects (${getResourceHealth(overworkedMember).util.toFixed(0)}%).` };
    }

    // 2. Skill-Complexity Mismatch
    const maxSkill = members.reduce((max, m) => {
        const levels = Object.values(m.skillLevels);
        if (levels.some(s => s.includes('Advanced'))) return Math.max(max, 3);
        if (levels.some(s => s.includes('Intermediate'))) return Math.max(max, 2);
        if (levels.some(s => s.includes('Beginner'))) return Math.max(max, 1);
        return max;
    }, 0);

    const complexity = project.Complexity_Type || 'Simple';
    if (complexity === 'Complex' && maxSkill < 3) {
        return { status: 'red', label: 'Skill Gap', reason: 'Critical: Complex projects require at least 1 "Advanced" resource.' };
    }
    if (complexity === 'Medium' && maxSkill < 2) {
        return { status: 'amber', label: 'Skill Gap', reason: 'Warning: Medium projects require at least 1 "Intermediate" resource.' };
    }

    // 3. Temporal Staffing Gaps
    const projectWeeksData = (weeklyData || []).filter(w => w.Project_Name === project.Project_Name);
    const weeksWithStaff = new Set(projectWeeksData.filter(w => w.Allocation > 0).map(w => w.Week_Index));

    const startDate = new Date(project.Start_Date);
    const refDate = new Date('2025-01-01');
    const startW = Math.max(0, Math.floor((startDate - refDate) / (7 * 24 * 60 * 60 * 1000)));
    const endDate = new Date(project.End_Date);
    const endW = Math.min(12, Math.floor((endDate - refDate) / (7 * 24 * 60 * 60 * 1000)));

    for (let i = startW; i <= endW; i++) {
        if (!weeksWithStaff.has(i)) {
            return { status: 'red', label: 'Staffing Gap', reason: `Resource Gap: No active allocation for Week ${i + 1}.` };
        }
    }

    // 4. Balanced Workload
    const avgUtil = members.reduce((acc, m) => {
        const h = getResourceHealth(m);
        return acc + (h.util || 0);
    }, 0) / members.length;

    if (members.length >= 2 && avgUtil >= 60 && avgUtil <= 100) {
        return { status: 'green', label: 'On Track', reason: 'Staffing matches requirements and workload is balanced.' };
    }

    if (members.length < 2) return { status: 'amber', label: 'At Risk', reason: 'Resource Risk: Project is solo-staffed.' };

    return { status: 'green', label: 'On Track', reason: 'Project meets basic staffing requirements.' };
}

// Global state for diagnostic highlighting
let diagnosticHighlight = null;

function handleRiskClick(projectName) {
    console.log('[handleRiskClick] Started for Project:', projectName);

    // 1. Set global filter
    timelineFilter = projectName;

    // 2. Clear diagnostic highlight if any
    diagnosticHighlight = null;

    // 3. Navigate to Timeline View
    switchView('timeline');

    // 4. Force Allocation Tab Active
    setTimeout(() => {
        const timelineView = document.getElementById('view-timeline');
        if (!timelineView) {
            console.error('[handleRiskClick] view-timeline not found');
            return;
        }

        // Update Tab Buttons
        const tabs = timelineView.querySelectorAll('.cockpit-tab');
        tabs.forEach(t => t.classList.toggle('active', t.dataset.cockpit === 'allocation'));

        // Update Display Views
        const views = timelineView.querySelectorAll('.cockpit-view');
        views.forEach(v => v.classList.toggle('active', v.id === 'cockpit-allocation'));

        console.log('[handleRiskClick] Forced allocation tab state');

        // 5. Final Render
        renderTimelineView();
    }, 10);
}



function renderRoleDistribution(roleData) {
    const container = document.getElementById('role-chart');
    const total = Object.values(roleData).reduce((a, b) => a + b, 0);

    const colors = {
        'Modeler': 'var(--accent-purple)',
        'DMM': 'var(--accent-blue)',
        'Lead': 'var(--accent-green)',
        'PL': 'var(--accent-orange)',
        'DMM/PL': 'var(--accent-pink)',
        'Data Analyst': '#64748b',
        'Non MMM': 'var(--text-muted)'
    };

    let html = '';
    Object.entries(roleData).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
        const pct = Math.round((count / total) * 100);
        const color = colors[role] || 'var(--text-muted)';
        html += `
            <div class="distribution-bar">
                <span class="label">${role}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${pct}%; background: ${color}"></div>
                </div>
                <span class="value">${count}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderSkillDistribution(skillData) {
    const container = document.getElementById('skill-chart');
    const total = Object.values(skillData).reduce((a, b) => a + b, 0);

    const colors = {
        'Advanced': 'var(--accent-green)',
        'Intermediate': 'var(--accent-blue)',
        'Beginner': 'var(--accent-orange)',
        'Not Trained': 'var(--text-muted)'
    };

    let html = '';
    ['Advanced', 'Intermediate', 'Beginner', 'Not Trained'].forEach(level => {
        const count = skillData[level] || 0;
        const pct = Math.round((count / total) * 100);
        html += `
            <div class="distribution-bar">
                <span class="label">${level}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${pct}%; background: ${colors[level]}"></div>
                </div>
                <span class="value">${count}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderCapacityOverview(capacity, allocations) {
    const container = document.getElementById('capacity-overview');

    const platforms = [
        { key: 'haiSales', label: 'HAI Sales', allocKey: 'salesOB' },
        { key: 'haiDI', label: 'HAI D/I', allocKey: 'diOB' },
        { key: 'haiLT', label: 'HAI LT', allocKey: 'ltOB' },
        { key: 'haiPF', label: 'HAI PF', allocKey: 'pfOB' },
        { key: 'athena', label: 'Athena', allocKey: 'athenaOB' },
        { key: 'custom', label: 'Custom', allocKey: 'custom' }
    ];

    const colors = [
        'var(--accent-purple)',
        'var(--accent-blue)',
        'var(--accent-green)',
        'var(--accent-orange)',
        'var(--accent-pink)',
        '#64748b'
    ];

    let html = '';
    platforms.forEach((p, i) => {
        const cap = capacity[p.key] || 0;
        const alloc = allocations[p.allocKey] || 0;
        const pct = cap > 0 ? Math.min(100, Math.round((alloc / cap) * 100)) : 0;

        html += `
            <div class="capacity-item">
                <div class="cap-header">
                    <span class="cap-title">${p.label}</span>
                    <span class="cap-value">${alloc.toFixed(1)} / ${cap.toFixed(1)}</span>
                </div>
                <div class="cap-bar">
                    <div class="cap-fill" style="width: ${pct}%; background: ${colors[i]}"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Skills View
let skillFilters = {
    name: '',
    role: '',
    trained: '',
    sales: '',
    di: '',
    lt: '',
    pf: '',
    athena: '',
    custom: ''
};

function renderSkillsView() {
    // Populate filters if needed (or ensure they are populated)
    populateSkillFilters();

    let resources = getFilteredResources();

    // Apply column filters
    resources = resources.filter(r => {
        if (skillFilters.name && !r.name.includes(skillFilters.name)) return false;
        if (skillFilters.role && r.role !== skillFilters.role) return false;
        if (skillFilters.trained) {
            const isTrained = r.haiTrained ? 'Yes' : 'No';
            if (isTrained !== skillFilters.trained) return false;
        }
        if (skillFilters.sales && getSkillBadge(r.skillLevels.haiSales, true) !== skillFilters.sales) return false;
        if (skillFilters.di && getSkillBadge(r.skillLevels.haiDI, true) !== skillFilters.di) return false;
        if (skillFilters.lt && getSkillBadge(r.skillLevels.haiLT, true) !== skillFilters.lt) return false;
        if (skillFilters.pf && getSkillBadge(r.skillLevels.haiPF, true) !== skillFilters.pf) return false;
        if (skillFilters.athena && getSkillBadge(r.skillLevels.athena, true) !== skillFilters.athena) return false;
        if (skillFilters.custom && getSkillBadge(r.skillLevels.custom, true) !== skillFilters.custom) return false;
        return true;
    });

    // Populate skills table
    const tbody = document.getElementById('skills-tbody');
    let html = '';

    resources.forEach(r => {
        const isHighlighted = diagnosticHighlight &&
            diagnosticHighlight.resources &&
            diagnosticHighlight.resources.includes(r.name);
        const rowClass = isHighlighted ? 'risk-highlight-red' : '';

        html += `
            <tr class="${rowClass}">
                <td><strong>${r.name}</strong></td>
                <td>${r.role || 'N/A'}</td>
                <td>${r.haiTrained
                ? '<span class="status-badge trained">✓ Trained</span>'
                : '<span class="status-badge not-trained">✗ Not Trained</span>'}</td>
                <td>${getSkillBadge(r.skillLevels.haiSales)}</td>
                <td>${getSkillBadge(r.skillLevels.haiDI)}</td>
                <td>${getSkillBadge(r.skillLevels.haiLT)}</td>
                <td>${getSkillBadge(r.skillLevels.haiPF)}</td>
                <td>${getSkillBadge(r.skillLevels.athena)}</td>
                <td>${getSkillBadge(r.skillLevels.custom)}</td>
            </tr>
        `;
    });

    if (tbody) tbody.innerHTML = html;

    // Training chart
    renderTrainingChart();

    // Platform skill chart
    renderPlatformSkillChart();
}

// Updated getSkillBadge to return raw text for filtering if requested
function getSkillBadge(level, raw = false) {
    if (!level || level === 'Not Trained' || level.includes('Not Trained')) {
        return raw ? 'Not Trained' : '<span class="skill-badge not-trained">Not Trained</span>';
    }

    if (raw) return level;

    let cls = 'beginner';
    if (level.includes('Advance') || level.includes('Advanced')) cls = 'advanced';
    else if (level.includes('Intermediate')) cls = 'intermediate';

    return `<span class="skill-badge ${cls}">${level}</span>`;
}

function renderTrainingChart() {
    const container = document.getElementById('training-chart');
    const summary = appState.data.summary;
    const trained = summary.haiTrained;
    const notTrained = summary.totalResources - trained;
    const total = summary.totalResources;
    const pct = Math.round((trained / total) * 100);

    container.innerHTML = `
        <div class="donut-visual" style="background: conic-gradient(var(--accent-green) 0% ${pct}%, var(--accent-red) ${pct}% 100%);">
            <div class="donut-center" style="background: var(--bg-card); width: 100px; height: 100px; border-radius: 50%;">
                <div class="donut-value">${pct}%</div>
                <div class="donut-label">Trained</div>
            </div>
        </div>
        <div class="donut-legend">
            <div class="legend-item">
                <span class="legend-color" style="background: var(--accent-green);"></span>
                <span class="legend-text">HAI Trained</span>
                <span class="legend-value">${trained}</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: var(--accent-red);"></span>
                <span class="legend-text">Not Trained</span>
                <span class="legend-value">${notTrained}</span>
            </div>
        </div>
    `;
}

function renderPlatformSkillChart() {
    const container = document.getElementById('platform-skill-chart');
    const resources = appState.data.resources;

    const platforms = ['haiSales', 'haiDI', 'haiLT', 'haiPF', 'athena', 'custom'];
    const labels = ['HAI Sales', 'HAI D/I', 'HAI LT', 'HAI PF', 'Athena', 'Custom'];

    let html = '';
    platforms.forEach((p, i) => {
        const skilled = resources.filter(r =>
            r.skillLevels[p] && !r.skillLevels[p].includes('Not Trained')
        ).length;
        const pct = Math.round((skilled / resources.length) * 100);

        html += `
            <div class="distribution-bar">
                <span class="label">${labels[i]}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${pct}%; background: var(--accent-purple);"></div>
                </div>
                <span class="value">${skilled}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Utilization Filters logic
let utilizationFilters = {
    name: '',
    manager: ''
};

function initUtilizationFilters() {
    document.getElementById('util-filter-name')?.addEventListener('change', handleUtilizationFilterChange);
    document.getElementById('util-filter-manager')?.addEventListener('change', handleUtilizationFilterChange);
}

function handleUtilizationFilterChange() {
    utilizationFilters.name = document.getElementById('util-filter-name')?.value || '';
    utilizationFilters.manager = document.getElementById('util-filter-manager')?.value || '';
    renderUtilizationView();
}

function populateUtilizationFilters() {
    if (!appState.data) return;
    const resources = appState.data.resources || [];

    const names = new Set(resources.map(r => r.name).sort());
    const managers = new Set(resources.map(r => r.manager).filter(m => m).sort());

    updateSelect('util-filter-name', names, utilizationFilters.name);
    updateSelect('util-filter-manager', managers, utilizationFilters.manager);
}

function updateSelect(id, values, currentValue) {
    const select = document.getElementById(id);
    if (!select) return;

    // Preserve focus checks if needed, but for now simple re-render
    if (select.children.length <= 1) { // Only populate if empty (or just "All") to avoid losing state if user is interacting? 
        // Actually, simplest is to clear and rebuild, setting value back.
        // But if we rebuild every render, we might lose focus. 
        // However, render is called on change.
        select.innerHTML = '<option value="">All</option>';
        values.forEach(v => {
            select.innerHTML += `<option value="${v}">${v}</option>`;
        });
        select.value = currentValue;
    }
}

// Utilization View
function renderUtilizationView() {
    // Populate filters (only if needed/first time or data update)
    // We can call it every time but check inside function to avoid resetting user selection if logic allows.
    // The simple updateSelect logic above checks if it should set value.
    // Better to just ensure options exist.
    const nameSelect = document.getElementById('util-filter-name');
    if (nameSelect && nameSelect.options.length <= 1) populateUtilizationFilters();

    const allResources = appState.data.resources || [];
    let resources = allResources;

    // Apply filters
    if (utilizationFilters.name) {
        resources = resources.filter(r => r.name === utilizationFilters.name);
    }
    if (utilizationFilters.manager) {
        resources = resources.filter(r => r.manager === utilizationFilters.manager);
    }

    const container = document.getElementById('utilization-summary-container');
    const tbody = document.getElementById('allocation-tbody');

    if (!container || !tbody) return;

    // 1. Calculate Health Segments
    const segments = {
        under: { label: 'Under-utilized', range: '< 70%', class: 'under-utilized', count: 0 },
        optimal: { label: 'Optimal', range: '70% - 95%', class: 'optimal', count: 0 },
        over: { label: 'Over-allocated', range: '95% - 110%', class: 'over-allocated', count: 0 },
        burnout: { label: 'Burnout', range: '> 110%', class: 'burnout', count: 0 }
    };

    let tableHtml = '';
    resources.forEach(r => {
        const health = getResourceHealth(r);
        const util = health.util;

        if (util < 70) segments.under.count++;
        else if (util <= 95) segments.optimal.count++;
        else if (util <= 110) segments.over.count++;
        else segments.burnout.count++;

        // Render project tags
        const projects = r.projects.length > 0
            ? r.projects.map(p => `<span class="project-tag">${p}</span>`).join('')
            : '<span class="text-muted">No projects</span>';

        // Add to Table
        const utilClass = util < 70 ? 'low' : (util <= 95 ? 'med' : (util <= 110 ? 'high' : 'over'));

        // Calculate total OB capacity and total allocations
        const totalOBCap = Object.values(r.obCapacity).reduce((a, b) => a + b, 0);
        const totalAlloc = Object.values(r.allocations).reduce((a, b) => a + b, 0);

        tableHtml += `
            <tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.manager || 'N/A'}</td>
                <td>${r.role || 'N/A'}</td>
                <td><span class="heatmap-cell ${utilClass}" style="width: 50px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">${util.toFixed(0)}%</span></td>
                <td>${totalOBCap.toFixed(1)}</td>
                <td>${totalAlloc.toFixed(1)}</td>
                <td>${projects}</td>
            </tr>
        `;
    });

    // 2. Render Summary Cards
    container.innerHTML = Object.values(segments).map(s => `
        <div class="util-summary-card ${s.class}">
            <div class="util-summary-header">
                <span class="util-summary-label">${s.label}</span>
                <span class="util-summary-count">${s.count}</span>
            </div>
            <span class="util-summary-range">Range: ${s.range}</span>
        </div>
    `).join('');

    tbody.innerHTML = tableHtml || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No allocated resources found</td></tr>';
}

function renderAllocationTable() {
    const resources = getFilteredResources().filter(r => r.allocated);
    const tbody = document.getElementById('allocation-tbody');

    let html = '';
    resources.forEach(r => {
        const totalCap = Object.values(r.obCapacity).reduce((a, b) => a + b, 0);
        const totalAlloc = Object.values(r.allocations).reduce((a, b) => a + b, 0);

        html += `
            <tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.manager || 'N/A'}</td>
                <td>${r.role || 'N/A'}</td>
                <td>${totalCap.toFixed(1)}</td>
                <td>${totalAlloc.toFixed(1)}</td>
                <td>${r.projects.length > 0
                ? r.projects.map(p => `<span class="project-tag">${p}</span>`).join('')
                : '<span class="text-muted">No projects</span>'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No allocated resources found</td></tr>';
}

// Team View
function renderTeamView() {
    populateManagerFilter();
    populateRoleFilter();

    const resources = getFilteredResources();
    const container = document.getElementById('team-grid');

    let html = '';
    resources.forEach(r => {
        const skills = [];
        if (r.skillLevels.haiSales && !r.skillLevels.haiSales.includes('Not Trained')) {
            skills.push({ label: 'HAI Sales', level: r.skillLevels.haiSales });
        }
        if (r.skillLevels.athena && !r.skillLevels.athena.includes('Not Trained')) {
            skills.push({ label: 'Athena', level: r.skillLevels.athena });
        }
        if (r.skillLevels.custom && !r.skillLevels.custom.includes('Not Trained')) {
            skills.push({ label: 'Custom', level: r.skillLevels.custom });
        }

        html += `
            <div class="resource-card">
                <div class="resource-header">
                    <div>
                        <div class="resource-name">${r.name}</div>
                        <div class="resource-role">${r.role || 'N/A'}</div>
                    </div>
                    <div style="text-align: right">
                        <div class="resource-exp">${r.experience.toFixed(1)} yrs</div>
                        ${(() => {
                const h = getResourceHealth(r);
                return `<div class="health-indicator ${h.status}" title="${h.label}">${h.label}</div>`;
            })()}
                    </div>
                </div>
                <div class="resource-meta">
                    <span class="resource-manager">👤 ${r.manager || 'N/A'}</span>
                    ${r.plannedTill ? `<span class="resource-availability" style="color: var(--accent-green); font-weight: 600; font-size: 11px;">⌛ Avail: ${r.plannedTill}</span>` : ''}
                </div>
                <div style="margin-bottom: 12px;">
                    ${r.haiTrained
                ? '<span class="status-badge trained">✓ HAI Trained</span>'
                : '<span class="status-badge not-trained">✗ Not Trained</span>'}
                </div>
                <div class="resource-skills">
                    ${skills.slice(0, 3).map(s => getSkillBadge(s.level)).join('')}
                </div>
                ${r.projects.length > 0 ? `
                    <div class="resource-projects">
                        <div class="resource-projects-label">Current Projects</div>
                        ${r.projects.map(p => `<span class="project-tag">${p}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html || '<div style="text-align: center; color: var(--text-muted); padding: 40px;">No resources found</div>';
}

function populateManagerFilter() {
    const select = document.getElementById('manager-filter');
    if (!select || select.options.length > 1) return;

    const managers = [...new Set(appState.data.resources.map(r => r.manager).filter(m => m))].sort();
    managers.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m;
        select.appendChild(option);
    });
}

function populateRoleFilter() {
    const select = document.getElementById('role-filter');
    if (!select || select.options.length > 1) return;

    const roles = [...new Set(appState.data.resources.map(r => r.role).filter(r => r))].sort();
    roles.forEach(r => {
        const option = document.createElement('option');
        option.value = r;
        option.textContent = r;
        select.appendChild(option);
    });
}
// Projects View
function renderProjectsView() {
    const resources = appState.data.resources || [];

    // Populate column filters
    populateColumnFilters();

    // Get filtered projects
    const filteredProjects = getFilteredProjects();

    let html = '';
    filteredProjects.forEach(p => {
        // Get models array - if no models array, create a default entry
        const models = p.models && p.models.length > 0 ? p.models : [{ Model_ID: 'N/A', Model_Type: 'N/A', Model_Stage: '' }];

        // Apply model-specific filters when rendering rows
        const filteredModels = models.filter(model => {
            if (columnFilters.modelId && model.Model_ID !== columnFilters.modelId) return false;
            if (columnFilters.modelType && model.Model_Type !== columnFilters.modelType) return false;
            return true;
        });

        // If no models match the filter, skip this project row display for those models
        const modelsToRender = (columnFilters.modelId || columnFilters.modelType) ? filteredModels : models;
        if (modelsToRender.length === 0) return;

        // Calculate health
        const health = p.manualHealth ? { status: getHealthStatusFromLabel(p.manualHealth), label: p.manualHealth } : getProjectHealth(p, resources, appState.data.weeklyStaffing);
        const rowColorClass = health.status === 'red' ? 'risk-highlight-red' : (health.status === 'amber' ? 'risk-highlight-amber' : '');

        // Render each model as a separate row - all columns in every row
        modelsToRender.forEach((model, idx) => {
            html += `
                <tr class="${rowColorClass}">
                    <td><strong>${p.Project_Name}</strong></td>
                    <td><code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${p.Project_No || 'N/A'}</code></td>
                    <td><code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${model.Model_ID || 'N/A'}</code></td>
                    <td><span style="font-size: 11px;">${model.Model_Type || 'N/A'}${model.Model_Stage ? ' (' + model.Model_Stage + ')' : ''}</span></td>
                    <td><span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${p.Complexity_Type || 'Simple'}</span></td>
                    <td>${p.Start_Date || 'N/A'}</td>
                    <td>${p.End_Date || 'N/A'}</td>
                    <td><span class="health-indicator ${health.status}" 
                              title="Click to diagnose: ${health.reason || ''}" 
                              style="cursor: pointer;"
                              onclick="handleRiskClick('${p.Project_Name.replace(/'/g, "\\'")}')">${health.label}</span></td>
                </tr>
            `;
        });
    });

    const tbody = document.getElementById('projects-list-tbody');
    if (tbody) {
        tbody.innerHTML = html || '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">No projects found</td></tr>';
    }
}

// Helper function to convert health label to status
function getHealthStatusFromLabel(label) {
    const statusMap = {
        'On Track': 'green',
        'At Risk': 'amber',
        'Burnout Risk': 'red',
        'Skill Gap': 'red',
        'Staffing Gap': 'red',
        'Unstaffed': 'red'
    };
    return statusMap[label] || 'green';
}


// Timeline View (Project Deepdive)
let timelineFilter = '';

function renderTimelineView() {
    const activeTab = document.querySelector('#view-timeline .cockpit-tab.active')?.dataset.cockpit || 'gantt';

    // Ensure filter is populated
    populateTimelineFilter();

    if (activeTab === 'gantt') {
        renderProjectGantt();
    } else if (activeTab === 'allocation') {
        renderAllocationView();
    }
}

function renderProjectGantt() {
    const projects = appState.data.projects || [];
    const weeklyData = appState.data.weeklyStaffing || [];
    const resources = appState.data.resources || [];
    const container = document.getElementById('gantt-grid');
    if (!container) return;

    const searchQuery = appState.filters.search || '';

    // Apply Timeline Filter if Selected
    // Note: timelineFilter variable is updated by handleTimelineFilterChange

    // Generate 52 weeks with dates starting from Jan 2026
    const baseDate = new Date('2026-01-05');
    const weeks = Array.from({ length: 52 }, (_, i) => {
        const weekStart = new Date(baseDate);
        weekStart.setDate(baseDate.getDate() + (i * 7));
        const month = weekStart.toLocaleDateString('en-US', { month: 'short' });
        const day = weekStart.getDate();
        return { num: i + 1, label: `W${i + 1}`, date: `${month} ${day}` };
    });

    // Header row
    let html = `<div class="alloc-header-row">
        <div class="alloc-header-cell employee-col" style="min-width: 280px;">Project / Model</div>
        ${weeks.map(w => `<div class="alloc-header-cell" title="Week ${w.num}: ${w.date}">${w.label}<br><small>${w.date}</small></div>`).join('')}
    </div>`;

    // Build a map of which resources are assigned to which projects/models per week
    const assignmentMap = {};
    weeklyData.forEach(wa => {
        const weekIdx = wa.Week_Index;
        const projName = wa.Project_Name;
        const wdId = String(wa.WD_ID);
        const key = `${projName}-W${weekIdx}`;

        if (!assignmentMap[key]) assignmentMap[key] = [];

        // Find resource name
        const resource = resources.find(r => String(r.wdId) === wdId);
        const empName = wa.Name || (resource ? resource.name : 'Unknown');
        const hours = wa.Hours_Allocated !== undefined ? wa.Hours_Allocated : (wa.Allocation * 40);

        assignmentMap[key].push({ name: empName, hours: hours, wdId: wdId });
    });

    // Model rows - grouped by project
    projects.forEach(p => {
        if (searchQuery && !p.Project_Name.toLowerCase().includes(searchQuery)) return;

        // Filter by timeline Project filter
        if (timelineFilter && p.Project_Name !== timelineFilter) return;

        const models = p.models && p.models.length > 0 ? p.models : [{ Model_ID: 'N/A', Model_Type: p.Project_Name }];

        models.forEach(model => {
            const modelLabel = model.Model_Type ? `${model.Model_Type}${model.Model_Stage ? ' (' + model.Model_Stage + ')' : ''}` : 'General';

            html += `<div class="alloc-row">
                <div class="alloc-employee" style="min-width: 280px;">
                    <div class="alloc-employee-name">${p.Project_Name}</div>
                    <div class="alloc-employee-role">${modelLabel} <code style="font-size: 9px; opacity: 0.6;">${model.Model_ID || ''}</code></div>
                </div>`;

            // Each week cell - show assigned employees
            weeks.forEach((week, i) => {
                const key = `${p.Project_Name}-W${i}`;
                const assignments = assignmentMap[key] || [];

                // Calculate total hours for this project in this week
                const totalHours = assignments.reduce((sum, a) => sum + a.hours, 0);

                // Bar percentage - if any assignment, show bar
                const barPct = assignments.length > 0 ? Math.min((totalHours / 40) * 100, 100) : 0;

                // Color based on staffing
                let colorClass = 'green';
                if (assignments.length === 0) colorClass = '';
                else if (totalHours > 60) colorClass = 'red';
                else if (totalHours < 15) colorClass = 'yellow';

                // Employee names (max 2 shown)
                const empTags = assignments.slice(0, 2).map(a =>
                    `<div class="alloc-project-tag" title="${a.name} (${a.hours.toFixed(0)}h)">${a.name.split(' ')[0]} (${a.hours.toFixed(0)}h)</div>`
                ).join('');

                const overflowTag = assignments.length > 2 ?
                    `<div class="alloc-project-tag overflow">+${assignments.length - 2} more</div>` : '';

                // Build detailed tooltip
                const tooltipLines = [
                    `📁 ${p.Project_Name}`,
                    `📋 ${modelLabel} (${model.Model_ID || 'N/A'})`,
                    `📅 Week ${week.num}: ${week.date}`,
                    `⏱️ Total: ${totalHours.toFixed(0)} hours`,
                    '',
                    '👥 Assigned:'
                ];
                assignments.forEach(a => {
                    tooltipLines.push(`  • ${a.name}: ${a.hours.toFixed(0)}h`);
                });
                const tooltip = assignments.length > 0 ? tooltipLines.join('\n') : `Week ${week.num}: No assignments`;

                html += `<div class="alloc-cell" title="${tooltip.replace(/"/g, '&quot;')}">
                    ${assignments.length > 0 ? `
                    <div class="alloc-bar-container">
                        <div class="alloc-bar-fill ${colorClass}" style="width: ${barPct}%"></div>
                    </div>
                    <div class="alloc-projects">
                        ${empTags}
                        ${overflowTag}
                    </div>` : ''}
                </div>`;
            });

            html += `</div>`;
        });
    });

    container.innerHTML = html;

}

// Employee View - Float.com Style 52-week grid
function renderAllocationView() {
    const resources = appState.data.resources || [];
    const weeklyData = appState.data.weeklyStaffing || [];
    const container = document.getElementById('allocation-grid');
    if (!container) return;

    const searchQuery = appState.filters.search || '';

    // Generate 52 weeks with dates starting from Jan 2026
    const baseDate = new Date('2026-01-05'); // First Monday of Jan 2026
    const weeks = Array.from({ length: 52 }, (_, i) => {
        const weekStart = new Date(baseDate);
        weekStart.setDate(baseDate.getDate() + (i * 7));
        const month = weekStart.toLocaleDateString('en-US', { month: 'short' });
        const day = weekStart.getDate();
        return { num: i + 1, label: `W${i + 1}`, date: `${month} ${day}` };
    });

    // Header row
    let html = `<div class="alloc-header-row">
        <div class="alloc-header-cell employee-col">Employee</div>
        ${weeks.map(w => `<div class="alloc-header-cell" title="Week ${w.num}: ${w.date}">${w.label}<br><small>${w.date}</small></div>`).join('')}
    </div>`;

    // Employee rows
    resources.forEach(r => {
        if (searchQuery && !r.name.toLowerCase().includes(searchQuery)) return;

        // Filter by timeline Employee filter
        // Filter by timeline Project/Employee filter
        if (timelineFilter) {
            const matchName = r.name === timelineFilter;
            const projects = Array.isArray(r.projects) ? r.projects : [];
            const matchProject = projects.includes(timelineFilter);

            if (!matchName && !matchProject) return;

            console.log(`[renderAllocationView] Match found for ${r.name} with filter ${timelineFilter}`);
        }

        html += `<div class="alloc-row">
            <div class="alloc-employee">
                <div class="alloc-employee-name">${r.name}</div>
                <div class="alloc-employee-role">${r.role || 'Resource'}</div>
            </div>`;

        // Each week cell
        weeks.forEach((week, i) => {
            // Get allocations for this resource in this week
            const weekAllocs = weeklyData.filter(w =>
                String(w.WD_ID) === String(r.wdId) && w.Week_Index === i
            );

            // Calculate total hours (using Hours_Allocated if available, otherwise convert from Allocation)
            let totalHours = 0;
            const projects = [];

            weekAllocs.forEach(wa => {
                const hours = wa.Hours_Allocated !== undefined ? wa.Hours_Allocated : (wa.Allocation * 40);
                totalHours += hours;
                if (wa.Project_Name) {
                    projects.push({ name: wa.Project_Name, hours: hours });
                }
            });

            // Calculate bar percentage (40 hours = 100%)
            const barPct = Math.min((totalHours / 40) * 100, 100);

            // Determine color based on utilization
            let colorClass = 'green';
            if (totalHours > 40) colorClass = 'red';
            else if (totalHours < 20 && totalHours > 0) colorClass = 'yellow';

            // Project tags (max 2 shown)
            const projectTags = projects.slice(0, 2).map(p =>
                `<div class="alloc-project-tag" title="${p.name} (${p.hours.toFixed(0)}h)">${p.name} (${p.hours.toFixed(0)}h)</div>`
            ).join('');

            const overflowTag = projects.length > 2 ?
                `<div class="alloc-project-tag overflow">+${projects.length - 2} more</div>` : '';

            // Build detailed tooltip for Employee View
            const availableHours = Math.max(0, 40 - totalHours);
            const utilizationPct = Math.round((totalHours / 40) * 100);
            const status = totalHours > 40 ? '🔴 Over-allocated' : (totalHours < 20 ? '🟡 Under-utilized' : '🟢 Optimal');

            const tooltipLines = [
                `👤 ${r.name}`,
                `💼 ${r.role || 'Resource'}`,
                `📅 Week ${week.num}: ${week.date}`,
                '',
                `⏱️ Allocated: ${totalHours.toFixed(0)}h / 40h (${utilizationPct}%)`,
                `✅ Available: ${availableHours.toFixed(0)}h`,
                `📊 Status: ${status}`,
            ];
            if (projects.length > 0) {
                tooltipLines.push('', '📁 Projects:');
                projects.forEach(p => {
                    tooltipLines.push(`  • ${p.name}: ${p.hours.toFixed(0)}h`);
                });
            }
            const tooltip = tooltipLines.join('\n');

            html += `<div class="alloc-cell" title="${tooltip.replace(/"/g, '&quot;')}">
                <div class="alloc-bar-container">
                    <div class="alloc-bar-fill ${colorClass}" style="width: ${barPct}%"></div>
                </div>
                ${totalHours > 0 ? `<div class="alloc-hours">${totalHours.toFixed(0)}h</div>` : ''}
                <div class="alloc-projects">
                    ${projectTags}
                    ${overflowTag}
                </div>
            </div>`;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
}

// ====================================
// Add Project Modal Functions
// ====================================
let allocatedResources = [];

function initAddProjectModal() {
    const addProjectBtn = document.getElementById('add-project-btn');
    const modal = document.getElementById('add-project-modal');
    const closeBtn = document.getElementById('modal-project-close-btn'); // ID updated in HTML
    const cancelBtn = document.getElementById('cancel-project-btn');
    const form = document.getElementById('add-project-form');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const resourceSelect = document.getElementById('resource-select');
    const addResourceBtn = document.getElementById('add-resource-btn');

    if (!addProjectBtn || !modal) return;

    // Open modal
    addProjectBtn.addEventListener('click', () => {
        openAddProjectModal();
    });

    // Close modal
    closeBtn?.addEventListener('click', closeAddProjectModal);
    cancelBtn?.addEventListener('click', closeAddProjectModal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAddProjectModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeAddProjectModal();
        }
    });

    // Date validation
    startDateInput?.addEventListener('change', () => {
        const startDate = startDateInput.value;
        if (startDate) {
            endDateInput.min = startDate;
            if (endDateInput.value && endDateInput.value < startDate) {
                endDateInput.value = '';
            }
        }
    });

    endDateInput?.addEventListener('change', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate && endDate) {
            alert('Please select the Start Date first.');
            endDateInput.value = '';
            startDateInput.focus();
            return;
        }

        if (startDate && endDate && endDate < startDate) {
            alert('End Date cannot be earlier than Start Date.');
            endDateInput.value = '';
        }
    });

    // Add resource functionality
    const addResource = () => {
        const value = resourceSelect.value;
        if (!value) return;

        // Value is the name directly from the dropdown
        const exactName = value;

        if (!allocatedResources.includes(exactName)) {
            allocatedResources.push(exactName);
            renderAllocatedResources();
            resourceSelect.value = ''; // Reset dropdown
        } else {
            alert('Resource already added.');
        }
    };

    addResourceBtn?.addEventListener('click', addResource);



    // Form submission
    form?.addEventListener('submit', handleAddProjectSubmit);
}

function openAddProjectModal() {
    const modal = document.getElementById('add-project-modal');
    modal?.classList.add('active');
    populateModalDropdowns();
    document.getElementById('add-project-form')?.reset();
    allocatedResources = [];
    renderAllocatedResources();
    document.getElementById('project-name')?.focus();
}

function closeAddProjectModal() {
    const modal = document.getElementById('add-project-modal');
    modal?.classList.remove('active');
    document.getElementById('add-project-form')?.reset();
    allocatedResources = [];
    renderAllocatedResources();
}

function populateModalDropdowns() {
    if (!appState.data) return;
    const projects = appState.data.projects || [];

    // Unique Model Types & Complexities
    const modelTypes = new Set();
    const complexities = new Set();

    projects.forEach(p => {
        if (p.Complexity_Type) complexities.add(p.Complexity_Type);
        if (p.models) {
            p.models.forEach(m => {
                if (m.Model_Type) modelTypes.add(m.Model_Type);
            });
        }
    });

    const modelTypeSelect = document.getElementById('model-type');
    if (modelTypeSelect) {
        modelTypeSelect.innerHTML = '<option value="">Select Model Type</option>';
        [...modelTypes].sort().forEach(type => {
            modelTypeSelect.innerHTML += `<option value="${type}">${type}</option>`;
        });
    }

    const complexitySelect = document.getElementById('complexity');
    if (complexitySelect) {
        complexitySelect.innerHTML = '<option value="">Select Complexity</option>';
        [...complexities].sort().forEach(c => {
            complexitySelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }

    // Populate Resource Dropdown
    const resourceSelect = document.getElementById('resource-select');
    if (resourceSelect) {
        resourceSelect.innerHTML = '<option value="">Select Resource</option>';
        const resources = appState.data.resources || [];
        // Sort resources by name
        resources.sort((a, b) => a.name.localeCompare(b.name)).forEach(r => {
            resourceSelect.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        });
    }
}

function renderAllocatedResources() {
    const container = document.getElementById('allocated-resources-list');
    if (!container) return;

    if (allocatedResources.length === 0) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">No resources allocated yet</span>';
        return;
    }

    container.innerHTML = allocatedResources.map((resource, index) => `
        <span class="resource-tag">
            ${resource}
            <button type="button" class="remove-resource" onclick="removeAllocatedResource(${index})">&times;</button>
        </span>
    `).join('');
}

function removeAllocatedResource(index) {
    allocatedResources.splice(index, 1);
    renderAllocatedResources();
}

function handleAddProjectSubmit(e) {
    e.preventDefault();

    const formData = {
        projectName: document.getElementById('project-name').value.trim(),
        maconomyId: document.getElementById('maconomy-id').value.trim(),
        modelId: document.getElementById('model-id').value.trim(),
        modelType: document.getElementById('model-type').value,
        complexity: document.getElementById('complexity').value,
        startDate: document.getElementById('start-date').value,
        endDate: document.getElementById('end-date').value,
        resources: [...allocatedResources]
    };

    // Check for unique project name
    const existingProject = appState.data.projects?.find(p => p.Project_Name.toLowerCase() === formData.projectName.toLowerCase());
    if (existingProject) {
        alert('Project Name already exists. Please choose a unique name.');
        return;
    }

    // Create new project object
    const newProject = {
        Project_No: formData.maconomyId,
        Project_Name: formData.projectName,
        Complexity_Type: formData.complexity,
        Start_Date: formData.startDate,
        End_Date: formData.endDate,
        manualHealth: null, // Default to null as requested
        allocatedResources: formData.resources,
        models: [{
            Model_ID: formData.modelId,
            Model_Type: formData.modelType,
            Model_Stage: 'OB',
            Platform: 'HAI'
        }]
    };

    // Update Global State
    if (!appState.data.projects) appState.data.projects = [];
    appState.data.projects.push(newProject);

    // Link resources to this project
    formData.resources.forEach(resName => {
        const resource = appState.data.resources.find(r => r.name === resName);
        if (resource) {
            if (!resource.projects.includes(formData.projectName)) {
                resource.projects.push(formData.projectName);
                // Mark as allocated if not already
                resource.allocated = true;
            }
        }
    });

    closeAddProjectModal();
    showToast('Project created successfully!');

    // Re-render relevant views
    if (appState.currentView === 'projects') renderProjectsView();
    // Re-populate filters as data changed
    populateColumnFilters();
    populateTimelineFilter();
}

function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = `
            position: fixed; bottom: 30px; right: 30px; background: var(--gradient-green);
            color: white; padding: 16px 24px; border-radius: 8px; font-weight: 500;
            z-index: 2000; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
            opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}

// ====================================
// Add Employee Modal Functions
// ====================================
function initAddEmployeeModal() {
    const addBtn = document.getElementById('add-employee-btn');
    const modal = document.getElementById('add-employee-modal');
    const closeBtn = document.getElementById('modal-employee-close-btn');
    const cancelBtn = document.getElementById('cancel-employee-btn');
    const form = document.getElementById('add-employee-form');

    if (!addBtn || !modal) return;

    addBtn.addEventListener('click', openAddEmployeeModal);
    closeBtn?.addEventListener('click', closeAddEmployeeModal);
    cancelBtn?.addEventListener('click', closeAddEmployeeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAddEmployeeModal();
    });

    form?.addEventListener('submit', handleAddEmployeeSubmit);
}

function openAddEmployeeModal() {
    const modal = document.getElementById('add-employee-modal');
    modal?.classList.add('active');
    populateEmpDropdowns();
    document.getElementById('add-employee-form')?.reset();
    document.getElementById('emp-name')?.focus();
}

function closeAddEmployeeModal() {
    const modal = document.getElementById('add-employee-modal');
    modal?.classList.remove('active');
    document.getElementById('add-employee-form')?.reset();
}

function populateEmpDropdowns() {
    const resources = appState.data.resources || [];

    // Populate Roles
    const roles = new Set(resources.map(r => r.role).filter(r => r));
    const roleSelect = document.getElementById('emp-role');
    if (roleSelect) {
        roleSelect.innerHTML = '<option value="">Select Role</option>';
        [...roles].sort().forEach(r => {
            roleSelect.innerHTML += `<option value="${r}">${r}</option>`;
        });
    }

    // Populate Skills
    // We get all skill keys from existing resources
    const skillKeys = new Set();
    resources.forEach(r => {
        if (r.skillLevels) {
            Object.keys(r.skillLevels).forEach(k => skillKeys.add(k));
        }
    });

    // Get unique levels for dropdowns (Beginner, Intermediate, etc)
    const skillLevels = new Set(['Not Trained', 'Beginner', 'Intermediate', 'Advanced']);

    const container = document.getElementById('emp-skills-container');
    if (container) {
        let html = '';
        // Map keys to readable labels (reuse existing mapping if possible or just capitalize)
        const labels = {
            haiSales: 'HAI Sales', haiDI: 'HAI D/I', haiLT: 'HAI LT', haiPF: 'HAI PF',
            athena: 'Athena', custom: 'Custom'
        };

        [...skillKeys].forEach(key => {
            const label = labels[key] || key;
            html += `
                <div class="form-group">
                    <label>${label}</label>
                    <select name="skill-${key}" class="emp-skill-select" data-skill="${key}">
                        ${[...skillLevels].map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                </div>
            `;
        });
        container.innerHTML = html;
    }
}

function handleAddEmployeeSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('emp-name').value.trim();
    const manager = document.getElementById('emp-manager').value.trim();
    const role = document.getElementById('emp-role').value;
    const joinDate = document.getElementById('emp-join-date').value;
    const projectStr = document.getElementById('emp-projects').value.trim();

    // Calculate experience
    const start = new Date(joinDate);
    const now = new Date(); // Use current date as per request
    const yearsDiff = (now - start) / (1000 * 60 * 60 * 24 * 365.25); // Approximate years

    // Collect Skills
    const skillLevels = {};
    document.querySelectorAll('.emp-skill-select').forEach(sel => {
        skillLevels[sel.dataset.skill] = sel.value;
    });

    // Parse projects
    const projects = projectStr ? projectStr.split(',').map(s => s.trim()) : [];

    const newResource = {
        name,
        manager,
        role,
        experience: Math.max(0, yearsDiff),
        haiTrained: Object.values(skillLevels).some(v => v !== 'Not Trained'), // Simple logic
        skillLevels,
        projects,
        // Mock default objects to prevent errors
        obCapacity: { haiSales: 0, haiDI: 0, haiLT: 0, haiPF: 0, athena: 0, custom: 0 },
        allocations: { salesOB: 0, diOB: 0, ltOB: 0, pfOB: 0, athenaOB: 0, custom: 0 },
        allocated: projects.length > 0,
        wdId: 'NEW' + Date.now() // Dummy ID
    };

    if (!appState.data.resources) appState.data.resources = [];
    appState.data.resources.push(newResource);

    closeAddEmployeeModal();
    showToast('Employee added successfully!');

    // If user added projects, optionally update those projects? 
    // For now, the system creates the link on resource side.

    renderCurrentView();
}

// ====================================
// Skill Filters Functions
// ====================================
function initSkillFilters() {
    const ids = [
        'skill-filter-name', 'skill-filter-role', 'skill-filter-trained',
        'skill-filter-sales', 'skill-filter-di', 'skill-filter-lt',
        'skill-filter-pf', 'skill-filter-athena', 'skill-filter-custom'
    ];

    ids.forEach(id => {
        document.getElementById(id)?.addEventListener('change', handleSkillFilterChange);
    });
}

function populateSkillFilters() {
    if (!appState.data) return;
    const resources = appState.data.resources || [];

    const sets = {
        name: new Set(), role: new Set(), trained: new Set(),
        sales: new Set(), di: new Set(), lt: new Set(), pf: new Set(), athena: new Set(), custom: new Set()
    };

    resources.forEach(r => {
        sets.name.add(r.name);
        if (r.role) sets.role.add(r.role);
        sets.trained.add(r.haiTrained ? 'Yes' : 'No');

        sets.sales.add(getSkillBadge(r.skillLevels.haiSales, true));
        sets.di.add(getSkillBadge(r.skillLevels.haiDI, true));
        sets.lt.add(getSkillBadge(r.skillLevels.haiLT, true));
        sets.pf.add(getSkillBadge(r.skillLevels.haiPF, true));
        sets.athena.add(getSkillBadge(r.skillLevels.athena, true));
        sets.custom.add(getSkillBadge(r.skillLevels.custom, true));
    });

    // Helper to populate select
    const pop = (id, set) => {
        const el = document.getElementById(id);
        if (!el) return;
        const current = el.value;
        el.innerHTML = '<option value="">All</option>';
        [...set].sort().forEach(v => {
            el.innerHTML += `<option value="${v}">${v}</option>`;
        });
        if (current) el.value = current;
    };

    pop('skill-filter-name', sets.name);
    pop('skill-filter-role', sets.role);
    pop('skill-filter-trained', sets.trained);
    pop('skill-filter-sales', sets.sales);
    pop('skill-filter-di', sets.di);
    pop('skill-filter-lt', sets.lt);
    pop('skill-filter-pf', sets.pf);
    pop('skill-filter-athena', sets.athena);
    pop('skill-filter-custom', sets.custom);
}

function handleSkillFilterChange() {
    skillFilters = {
        name: document.getElementById('skill-filter-name')?.value || '',
        role: document.getElementById('skill-filter-role')?.value || '',
        trained: document.getElementById('skill-filter-trained')?.value || '',
        sales: document.getElementById('skill-filter-sales')?.value || '',
        di: document.getElementById('skill-filter-di')?.value || '',
        lt: document.getElementById('skill-filter-lt')?.value || '',
        pf: document.getElementById('skill-filter-pf')?.value || '',
        athena: document.getElementById('skill-filter-athena')?.value || '',
        custom: document.getElementById('skill-filter-custom')?.value || ''
    };
    renderSkillsView();
}

// ====================================
// Timeline Filter Functions
// ====================================
function initTimelineFilter() {
    document.getElementById('timeline-project-filter')?.addEventListener('change', handleTimelineFilterChange);

    // Also listen to tab changes to update filter options
    document.querySelectorAll('.cockpit-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            setTimeout(populateTimelineFilter, 50); // Small delay to let tab switch
        });
    });
}

function populateTimelineFilter() {
    const select = document.getElementById('timeline-project-filter');
    if (!select) return;

    const activeTab = document.querySelector('#view-timeline .cockpit-tab.active')?.dataset.cockpit || 'gantt';
    const currentVal = timelineFilter;

    select.innerHTML = '';
    select.innerHTML += `<option value="">All ${activeTab === 'gantt' ? 'Projects' : 'Employees'}</option>`;

    const items = new Set();

    if (activeTab === 'gantt' || activeTab === 'allocation') {
        // Show BOTH projects and resources in the list for Allocation view
        // to allow filtering by Project there too
        (appState.data.projects || []).forEach(p => items.add(p.Project_Name));
        if (activeTab === 'allocation') {
            (appState.data.resources || []).forEach(r => items.add(r.name));
        }
    } else {
        (appState.data.resources || []).forEach(r => items.add(r.name));
    }

    [...items].sort().forEach(item => {
        select.innerHTML += `<option value="${item}">${item}</option>`;
    });

    // Retain value if valid, else reset
    if (currentVal === '' || items.has(currentVal)) {
        select.value = currentVal;
    } else {
        // Only reset if the current value is NOT valid and NOT empty
        // AND checks if we actually have items populated (avoid reset if empty set)
        if (items.size > 0) {
            console.warn(`[populateTimelineFilter] Filter '${timelineFilter}' invalid for ${activeTab}, resetting.`);
            select.value = '';
            timelineFilter = '';
            renderTimelineView(); // Re-render
        }
    }

    // Update label
    const label = document.querySelector('label[for="timeline-project-filter"]');
    if (label) label.textContent = (activeTab === 'gantt' || activeTab === 'allocation') ? 'Filter Project/Person:' : 'Filter Employee:';
}

function handleTimelineFilterChange(e) {
    timelineFilter = e.target.value;
    renderTimelineView();
}

// ====================================
// Column Filters Functions
// ====================================
let columnFilters = {
    projectName: '',
    maconomyId: '',
    modelId: '',
    modelType: '',
    complexity: '',
    startDate: '',
    endDate: '',
    health: ''
};

function initColumnFilters() {
    // Add event listeners for each filter
    const filterIds = [
        'filter-project-name',
        'filter-maconomy-id',
        'filter-model-id',
        'filter-model-type',
        'filter-complexity',
        'filter-start-date',
        'filter-end-date',
        'filter-health'
    ];

    filterIds.forEach(id => {
        const filter = document.getElementById(id);
        if (filter) {
            filter.addEventListener('change', handleColumnFilterChange);
        }
    });
}

function populateColumnFilters() {
    if (!appState.data) return;

    const projects = appState.data.projects || [];
    const resources = appState.data.resources || [];

    // Collect unique values for each column
    const uniqueValues = {
        projectNames: new Set(),
        maconomyIds: new Set(),
        modelIds: new Set(),
        modelTypes: new Set(),
        complexities: new Set(),
        startDates: new Set(),
        endDates: new Set(),
        healthStatuses: new Set()
    };

    projects.forEach(p => {
        if (p.Project_Name) uniqueValues.projectNames.add(p.Project_Name);
        if (p.Project_No) uniqueValues.maconomyIds.add(p.Project_No);
        if (p.Complexity_Type) uniqueValues.complexities.add(p.Complexity_Type);
        if (p.Start_Date) uniqueValues.startDates.add(p.Start_Date);
        if (p.End_Date) uniqueValues.endDates.add(p.End_Date);

        // Get health status
        const health = getProjectHealth(p, resources, appState.data.weeklyStaffing);
        if (health.label) uniqueValues.healthStatuses.add(health.label);

        // Get model info
        if (p.models) {
            p.models.forEach(m => {
                if (m.Model_ID) uniqueValues.modelIds.add(m.Model_ID);
                if (m.Model_Type) uniqueValues.modelTypes.add(m.Model_Type);
            });
        }
    });

    // Populate each filter dropdown
    populateFilterDropdown('filter-project-name', uniqueValues.projectNames);
    populateFilterDropdown('filter-maconomy-id', uniqueValues.maconomyIds);
    populateFilterDropdown('filter-model-id', uniqueValues.modelIds);
    populateFilterDropdown('filter-model-type', uniqueValues.modelTypes);
    populateFilterDropdown('filter-complexity', uniqueValues.complexities);
    populateFilterDropdown('filter-start-date', uniqueValues.startDates);
    populateFilterDropdown('filter-end-date', uniqueValues.endDates);
    populateFilterDropdown('filter-health', uniqueValues.healthStatuses);
}

function populateFilterDropdown(elementId, values) {
    const select = document.getElementById(elementId);
    if (!select) return;

    // Get current value to preserve selection
    const currentValue = select.value;

    // Clear and add "All" option
    select.innerHTML = '<option value="">All</option>';

    // Add sorted unique values
    [...values].sort().forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    // Restore selection if it still exists
    if (currentValue && [...values].includes(currentValue)) {
        select.value = currentValue;
    }
}

function handleColumnFilterChange() {
    // Update filter state
    columnFilters = {
        projectName: document.getElementById('filter-project-name')?.value || '',
        maconomyId: document.getElementById('filter-maconomy-id')?.value || '',
        modelId: document.getElementById('filter-model-id')?.value || '',
        modelType: document.getElementById('filter-model-type')?.value || '',
        complexity: document.getElementById('filter-complexity')?.value || '',
        startDate: document.getElementById('filter-start-date')?.value || '',
        endDate: document.getElementById('filter-end-date')?.value || '',
        health: document.getElementById('filter-health')?.value || ''
    };

    // Re-render projects view with filters applied
    renderProjectsView();
}

function getFilteredProjects() {
    if (!appState.data) return [];

    const projects = appState.data.projects || [];
    const resources = appState.data.resources || [];
    const searchQuery = appState.filters.search || '';

    return projects.filter(p => {
        // Global search filter
        if (searchQuery) {
            const models = p.models || [];
            const searchable = `${p.Project_Name} ${p.Project_No} ${models.map(m => m.Model_ID).join(' ')}`.toLowerCase();
            if (!searchable.includes(searchQuery)) return false;
        }

        // Column filters
        if (columnFilters.projectName && p.Project_Name !== columnFilters.projectName) return false;
        if (columnFilters.maconomyId && p.Project_No !== columnFilters.maconomyId) return false;
        if (columnFilters.complexity && p.Complexity_Type !== columnFilters.complexity) return false;
        if (columnFilters.startDate && p.Start_Date !== columnFilters.startDate) return false;
        if (columnFilters.endDate && p.End_Date !== columnFilters.endDate) return false;

        // Model-specific filters
        if (columnFilters.modelId || columnFilters.modelType) {
            const models = p.models || [];
            const hasMatchingModel = models.some(m => {
                if (columnFilters.modelId && m.Model_ID !== columnFilters.modelId) return false;
                if (columnFilters.modelType && m.Model_Type !== columnFilters.modelType) return false;
                return true;
            });
            if (!hasMatchingModel) return false;
        }

        // Health filter
        if (columnFilters.health) {
            const health = getProjectHealth(p, resources, appState.data.weeklyStaffing);
            if (health.label !== columnFilters.health) return false;
        }

        return true;
    });
}
