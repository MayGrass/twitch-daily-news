// ========== 配置區 ==========
// 將此 URL 替換 Google Apps Script 部署 URL
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbx-I8VPfV-gKJl4-h4ESocqEMkWadR1xkym0tr8Mv3shBtL2fIt8o5XYoFnQfT6G9fqyw/exec';

// SVG 圖示
const ICONS = {
    play: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>',
};

// 按鈕樣式
const BTN_STYLES = {
    primary: 'inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#9146ff] to-[#bf94ff] hover:shadow-lg rounded-lg text-white text-sm font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9146ff] focus:ring-offset-2 focus:ring-offset-dark-950',
    link: 'text-[#9146ff] hover:text-[#bf94ff] ml-2 inline-flex items-center gap-1.5 cursor-pointer font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#9146ff] rounded',
};

const state = {
    channel: null,
    summaryMap: {},
    availableDates: [],
    currentDate: null,
    currentIndex: 0,
};

const elements = {
    channelDisplay: document.getElementById('channel-display'),
    datePicker: document.getElementById('date-picker'),
    prevDateBtn: document.getElementById('prev-date'),
    nextDateBtn: document.getElementById('next-date'),
    todayBtn: document.getElementById('today-btn'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    summaryContent: document.getElementById('summary-content'),
    summaryDate: document.getElementById('summary-date'),
    summaryWeekday: document.getElementById('summary-weekday'),
    hotTopicsContainer: document.getElementById('hot-topics-container'),
    newMemesContainer: document.getElementById('new-memes-container'),
    noMemes: document.getElementById('no-memes'),
    eventsContainer: document.getElementById('events-container'),
    noEvents: document.getElementById('no-events'),
    dateNav: document.getElementById('date-nav'),
    footerPrev: document.getElementById('footer-prev'),
    footerNext: document.getElementById('footer-next'),
    footerPrevDate: document.getElementById('footer-prev-date'),
    footerNextDate: document.getElementById('footer-next-date'),
    totalDays: document.getElementById('total-days'),
    playerModal: document.getElementById('player-modal'),
    playerContainer: document.getElementById('player-container'),
    closePlayerBtn: document.getElementById('close-player'),
};

const playerManager = {

    extractVideoId(vodUrl) {
        const match = vodUrl?.match(/\/videos\/(\d+)/);
        return match ? `v${match[1]}` : null;
    },

    extractTimestamp(vodUrl) {
        const match = vodUrl?.match(/[?&]t=([\dhms]+)/);
        return match ? match[1] : null;
    },

    extractClipSlug(clipUrl) {
        const match = clipUrl?.match(/(?:clips\.twitch\.tv\/|clip\/)([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    },

    showVodPlayer(vodUrl) {
        const videoId = this.extractVideoId(vodUrl);
        if (!videoId) return;

        const timestamp = this.extractTimestamp(vodUrl);
        const parentDomain = window.location.hostname;
        const timeParam = timestamp ? `&time=${timestamp}` : '';

        this.openPlayer(`https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}&autoplay=true${timeParam}`);
    },

    showClipPlayer(clipUrl) {
        const slug = this.extractClipSlug(clipUrl);
        if (!slug) return;

        const parentDomain = window.location.hostname;
        this.openPlayer(`https://clips.twitch.tv/embed?clip=${slug}&parent=${parentDomain}&autoplay=true`);
    },

    openPlayer(iframeSrc) {
        elements.playerContainer.innerHTML = `
            <iframe
                src="${iframeSrc}"
                title="Twitch 影片播放器"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                allowfullscreen
                frameborder="0"
                scrolling="no">
            </iframe>
        `;
        elements.playerModal.classList.remove('hidden');
        elements.playerModal.focus();
        document.body.style.overflow = 'hidden';
    },

    closePlayer() {
        elements.playerContainer.innerHTML = '';
        elements.playerModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

/**
 * 從 URL 取得頻道名稱，若未指定則預設為 'godjj'
 * @returns {string} 頻道名稱（小寫）
 */
function getChannelFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('channel')?.toLowerCase() || 'godjj';
}

function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year} 年 ${month} 月 ${day} 日`;
}

/**
 * 取得星期幾
 */
function getWeekday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return weekdays[date.getDay()];
}

/**
 * HTML 跳脫
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 顯示指定狀態，隱藏其他
 */
function showState(stateName) {
    const stateElements = {
        loading: elements.loadingState,
        error: elements.errorState,
        empty: elements.emptyState,
        content: elements.summaryContent,
    };
    const flexStates = new Set(['loading', 'error', 'empty']);
    const showDateNav = new Set(['empty', 'content']);

    Object.values(stateElements).forEach(el => el.classList.add('hidden'));
    elements.dateNav.classList.add('hidden');

    const targetElement = stateElements[stateName];
    if (targetElement) {
        targetElement.classList.remove('hidden');
        if (flexStates.has(stateName)) {
            targetElement.classList.add('flex');
        }
    }

    if (showDateNav.has(stateName)) {
        elements.dateNav.classList.remove('hidden');
    }
}


async function loadAllSummaries() {
    try {
        showState('loading');

        const response = await fetch(`${API_BASE_URL}?channel=${state.channel}&action=all`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.detail || '載入失敗');
        }

        state.availableDates = data.summaries.map(s => s.date);

        state.summaryMap = Object.fromEntries(
            data.summaries.map(s => [s.date, s])
        );

        elements.totalDays.textContent = data.total;

        if (data.total === 0) {
            showState('empty');
            return;
        }


        const oldestDate = state.availableDates[state.availableDates.length - 1];
        const newestDate = state.availableDates[0];
        elements.datePicker.min = oldestDate;
        elements.datePicker.max = newestDate;


        navigateToDate(newestDate);

    } catch (error) {
        console.error('載入摘要失敗:', error);
        elements.errorMessage.textContent = error.message;
        showState('error');
    }
}

function renderHotTopics(topics) {
    const emptyMessage = `
        <div class="card-elevated rounded-2xl p-6 sm:p-8 border border-dark-600 text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>今日沒有熱門話題</p>
        </div>
    `;

    if (!topics?.length) {
        elements.hotTopicsContainer.innerHTML = emptyMessage;
        return;
    }

    elements.hotTopicsContainer.innerHTML = topics.map((topic, index) => `
        <div class="card-elevated rounded-2xl p-6 sm:p-8 border-left-primary">
            <div class="flex gap-5 sm:gap-6">
                <div class="badge-number flex-shrink-0 flex items-center justify-center text-white font-bold text-xl">
                    ${index + 1}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="heading-md text-white mb-2">${escapeHtml(topic.topic)}</h4>
                    <p class="text-content text-gray-300">${escapeHtml(topic.description)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderNewMemes(memes) {
    const hasMemes = memes?.length > 0;
    elements.noMemes.classList.toggle('hidden', hasMemes);

    if (!hasMemes) {
        elements.newMemesContainer.innerHTML = '';
        return;
    }

    elements.newMemesContainer.innerHTML = memes.map(meme => `
        <div class="card-elevated rounded-2xl p-6 sm:p-8 border-left-primary h-full">
            <div class="flex flex-col h-full">
                <div class="mb-4 sm:mb-5">
                    <span class="badge-gradient font-bold text-xl sm:text-2xl">${escapeHtml(meme.meme)}</span>
                </div>
                <p class="text-content text-gray-300 flex-1">${escapeHtml(meme.context)}</p>
            </div>
        </div>
    `).join('');
}

function renderHighlights(highlights) {
    const highlightsSection = document.getElementById('highlights-section');
    const highlightsContainer = document.getElementById('highlights-container');
    const noHighlights = document.getElementById('no-highlights');

    if (!highlightsSection) return;

    const hasHighlights = highlights?.length > 0;
    highlightsSection.classList.toggle('hidden', !hasHighlights);

    if (!hasHighlights) {
        if (highlightsContainer) highlightsContainer.innerHTML = '';
        if (noHighlights) noHighlights.classList.remove('hidden');
        return;
    }

    if (noHighlights) noHighlights.classList.add('hidden');

    if (highlightsContainer) {
        highlightsContainer.innerHTML = highlights.map((highlight, index) => `
            <div class="card-elevated rounded-2xl p-6 sm:p-8 border-left-primary">
                <div class="flex gap-5 sm:gap-6">
                    <div class="badge-number flex-shrink-0 flex items-center justify-center text-white font-bold text-xl">
                        ${index + 1}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="heading-md text-white mb-2">${escapeHtml(highlight.title)}</h4>
                        <p class="text-content text-gray-300 mb-4">${escapeHtml(highlight.description)}</p>
                        <div class="flex flex-wrap gap-3">
                            ${highlight.vod_url ? `<button onclick="playerManager.showVodPlayer('${highlight.vod_url}')" aria-label="觀看 ${escapeHtml(highlight.title)} 的 VOD" class="${BTN_STYLES.primary}">${ICONS.play} 觀看 VOD</button>` : ''}
                            ${highlight.clip_url ? `<button onclick="playerManager.showClipPlayer('${highlight.clip_url}')" aria-label="觀看 ${escapeHtml(highlight.title)} 的剪輯" class="${BTN_STYLES.primary}">${ICONS.play} 觀看剪輯</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function renderEvents(events) {
    const hasEvents = events?.length > 0;
    elements.noEvents.classList.toggle('hidden', hasEvents);

    if (!hasEvents) {
        elements.eventsContainer.innerHTML = '';
        return;
    }

    elements.eventsContainer.innerHTML = events.map(event => {
        const eventText = typeof event === 'string' ? event : (event?.event || '');
        const vodUrl = typeof event === 'object' ? event?.vod_url : null;

        let html = `<div class="flex items-start gap-3 py-3 border-l-2 border-[#9146ff] pl-4">
            <span class="text-[#9146ff] font-bold text-lg flex-shrink-0 mt-0.5">•</span>
            <p class="text-content text-gray-300">${escapeHtml(eventText)}`;

        if (vodUrl) {
            html += ` <button onclick="playerManager.showVodPlayer('${vodUrl}')" aria-label="觀看此事件的 VOD" class="${BTN_STYLES.link}">${ICONS.play} 觀看</button>`;
        }

        html += `</p></div>`;
        return html;
    }).join('');
}

/**
 * 渲染指定日期的摘要
 */
function renderSummary(dateStr) {
    const summary = state.summaryMap[dateStr];

    if (!summary) {
        showState('empty');
        return;
    }

    elements.summaryDate.textContent = formatDateDisplay(dateStr);
    elements.summaryWeekday.textContent = getWeekday(dateStr);

    renderHotTopics(summary.hot_topics);
    renderNewMemes(summary.new_memes);
    renderEvents(summary.important_events);
    renderHighlights(summary.highlights);

    showState('content');
}


function navigateToDate(dateStr) {
    state.currentDate = dateStr;
    state.currentIndex = state.availableDates.indexOf(dateStr);
    elements.datePicker.value = dateStr;
    updateNavigationButtons();
    renderSummary(dateStr);
}

/**
 * 更新導航按鈕狀態
 */
function updateNavigationButtons() {
    const isFirst = state.currentIndex === 0;
    const isLast = state.currentIndex === state.availableDates.length - 1;

    elements.nextDateBtn.disabled = isFirst;
    elements.footerNext.disabled = isFirst;
    elements.prevDateBtn.disabled = isLast;
    elements.footerPrev.disabled = isLast;

    const prevDate = !isLast ? state.availableDates[state.currentIndex + 1] : null;
    const nextDate = !isFirst ? state.availableDates[state.currentIndex - 1] : null;

    elements.footerPrevDate.textContent = prevDate ? formatDateDisplay(prevDate) : '沒有更早的了';
    elements.footerNextDate.textContent = nextDate ? formatDateDisplay(nextDate) : '已是最新';
}

/**
 * 前一天（更舊）
 */
function goToPrevDate() {
    if (state.currentIndex < state.availableDates.length - 1) {
        navigateToDate(state.availableDates[state.currentIndex + 1]);
    }
}

/**
 * 後一天（更新）
 */
function goToNextDate() {
    if (state.currentIndex > 0) {
        navigateToDate(state.availableDates[state.currentIndex - 1]);
    }
}

/**
 * 跳到最新日期
 */
function goToLatest() {
    if (state.availableDates.length > 0) {
        navigateToDate(state.availableDates[0]);
    }
}

function bindEvents() {
    elements.closePlayerBtn?.addEventListener('click', () => playerManager.closePlayer());

    elements.playerModal?.addEventListener('click', (e) => {
        if (e.target === elements.playerModal) {
            playerManager.closePlayer();
        }
    });

    document.addEventListener('keydown', (e) => {
        const isPlayerOpen = !elements.playerModal.classList.contains('hidden');

        if (e.key === 'Escape' && isPlayerOpen) {
            playerManager.closePlayer();
            return;
        }

        if (isPlayerOpen) return;

        if (e.key === 'ArrowLeft') {
            goToPrevDate();
        } else if (e.key === 'ArrowRight') {
            goToNextDate();
        }
    });

    // 日期選擇器變更
    elements.datePicker.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        if (state.summaryMap[selectedDate]) {
            navigateToDate(selectedDate);
        } else {
            // 找最近的可用日期
            const nearestDate = findNearestDate(selectedDate);
            if (nearestDate) {
                navigateToDate(nearestDate);
            }
        }
    });

    // 頂部導航按鈕
    elements.prevDateBtn.addEventListener('click', goToPrevDate);
    elements.nextDateBtn.addEventListener('click', goToNextDate);
    elements.todayBtn.addEventListener('click', goToLatest);

    // 底部導航按鈕
    elements.footerPrev.addEventListener('click', goToPrevDate);
    elements.footerNext.addEventListener('click', goToNextDate);
}

/**
 * 找最近的可用日期
 */
function findNearestDate(targetDate) {
    if (state.availableDates.length === 0) return null;

    // 找第一個小於等於目標日期的可用日期
    for (const date of state.availableDates) {
        if (date <= targetDate) {
            return date;
        }
    }

    // 如果目標日期比所有可用日期都早，返回最早的
    return state.availableDates[state.availableDates.length - 1];
}

async function init() {
    state.channel = getChannelFromURL();

    elements.channelDisplay.textContent = state.channel;
    document.title = `${state.channel} 的實況日報`;
    bindEvents();

    await loadAllSummaries();
}

init();
