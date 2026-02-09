/**
 * Twitch 日報 API - Google Apps Script
 * 
 * 此腳本從 Google Sheets 讀取摘要數據並提供 JSON API
 * 
 * 部署方式：
 * 1. Google Sheets每個頻道一個分頁，分頁名稱 = 頻道英文ID
 * 2. 擴充功能 > Apps Script
 * 3. 貼上此代碼
 * 4. 部署 > 新增部署 > 選擇「網頁應用程式」
 *    - 執行身分：我
 *    - 存取權限：所有人
 * 5. 複製部署 URL 並更新前端的 API_BASE_URL
 * 
 * CSV 格式：
 * - 欄位 A: date (YYYY-MM-DD)
 * - 欄位 B: summary_json (完整 JSON 字串)
 */

/**
 * HTTP GET 處理器
 * 
 * 支援參數：
 * - channel: 頻道名稱（必填）
 * - action: 操作類型（目前僅支援 'all'）
 * 
 * 範例：?channel=godjj&action=all
 */
function doGet(e) {
    try {
        const params = e.parameter;
        const channel = params.channel?.toLowerCase();
        const action = params.action || 'all';

        // 驗證頻道參數
        if (!channel) {
            return createJsonResponse({
                success: false,
                detail: '缺少 channel 參數'
            });
        }

        // 路由到對應的處理函數
        if (action === 'all') {
            return getAllSummaries(channel);
        }

        return createJsonResponse({
            success: false,
            detail: `不支援的操作: ${action}`
        });

    } catch (error) {
        Logger.log('doGet 錯誤: ' + error.toString());
        return createJsonResponse({
            success: false,
            detail: '伺服器錯誤: ' + error.message
        });
    }
}

/**
 * 獲取指定頻道的所有摘要
 */
function getAllSummaries(channelName) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(channelName);

        // 如果找不到對應的分頁
        if (!sheet) {
            return createJsonResponse({
                success: true,
                channel: channelName,
                summaries: [],
                total: 0
            });
        }

        // 讀取所有資料（跳過標題行）
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) {
            // 只有標題行或空表格
            return createJsonResponse({
                success: true,
                channel: channelName,
                summaries: [],
                total: 0
            });
        }

        const summaries = [];

        // 從第二行開始處理（第一行是標題：date, summary_json）
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const date = row[0]; // A 欄：日期
            const jsonString = row[1]; // B 欄：JSON 字串

            // 跳過空行
            if (!date || !jsonString) {
                continue;
            }

            try {
                // 解析 JSON 字串
                const summaryData = JSON.parse(jsonString);

                // 組合完整的摘要物件
                summaries.push({
                    date: formatDate(date),
                    hot_topics: summaryData.hot_topics || [],
                    new_memes: summaryData.new_memes || [],
                    important_events: summaryData.important_events || [],
                    highlights: summaryData.highlights || []
                });
            } catch (parseError) {
                Logger.log(`❌ 解析第 ${i + 1} 行 JSON 失敗`);
                Logger.log(`   錯誤訊息: ${parseError.message}`);
                Logger.log(`   日期欄位: ${date}`);
                Logger.log(`   JSON 前 150 字元: ${jsonString.substring(0, 150)}...`);
                continue;
            }
        }

        // 按日期降序排列（最新的在前）
        summaries.sort((a, b) => b.date.localeCompare(a.date));

        return createJsonResponse({
            success: true,
            channel: channelName,
            summaries: summaries,
            total: summaries.length
        });

    } catch (error) {
        Logger.log('getAllSummaries 錯誤: ' + error.toString());
        return createJsonResponse({
            success: false,
            detail: '獲取摘要時發生錯誤: ' + error.message
        });
    }
}

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {string|Date|*} date - 日期物件、日期字串或其他類型
 * @returns {string} YYYY-MM-DD 格式的日期字串
 */
function formatDate(date) {
    if (typeof date === 'string') {
        return date;
    }

    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return String(date);
}

/**
 * 創建 JSON HTTP 響應
 * @param {Object} data - 要轉換為 JSON 的資料物件
 * @returns {ContentService.TextOutput} JSON 格式的 HTTP 響應
 */
function createJsonResponse(data) {
    const output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);

    // 注意：Apps Script 的 ContentService 會自動處理 CORS，允許所有來源訪問

    return output;
}

/**
 * ========== 測試與工具函數 ==========
 */

/**
 * 測試函數：驗證 API 是否正常運作
 * 
 * 使用方式：
 * 1. 在 Apps Script 編輯器中選擇此函數
 * 2. 點擊「執行」按鈕
 * 3. 查看執行記錄
 */
function testApi() {
    // ⚠️ 請修改為您的頻道名稱（對應 Google Sheets 的分頁名稱）
    const testChannel = 'godjj';

    Logger.log('========== 測試開始 ==========');
    Logger.log(`測試頻道: ${testChannel}`);
    Logger.log(`提示: 請確保 Google Sheets 有名為 "${testChannel}" 的分頁\n`);

    // 測試獲取摘要
    const response = getAllSummaries(testChannel);
    const content = response.getContent();
    const data = JSON.parse(content);

    Logger.log('\nAPI 響應:');
    Logger.log(`- 成功: ${data.success}`);
    Logger.log(`- 頻道: ${data.channel}`);
    Logger.log(`- 總筆數: ${data.total}`);

    if (data.summaries && data.summaries.length > 0) {
        Logger.log(`\n第一筆摘要範例:`);
        Logger.log(`- 日期: ${data.summaries[0].date}`);
        Logger.log(`- 熱門話題數: ${data.summaries[0].hot_topics?.length || 0}`);
        Logger.log(`- 新梗數: ${data.summaries[0].new_memes?.length || 0}`);
        Logger.log(`- 重要事件數: ${data.summaries[0].important_events?.length || 0}`);
        Logger.log(`- 精華片段數: ${data.summaries[0].highlights?.length || 0}`);
    }

    if (data.success && data.total > 0) {
        Logger.log(`\n✅ 測試成功！共獲取 ${data.total} 筆摘要`);
    } else if (data.success && data.total === 0) {
        Logger.log('\n⚠️ 測試成功但沒有資料，請檢查：');
        Logger.log('  1. Google Sheets 是否有名為 "' + testChannel + '" 的分頁');
        Logger.log('  2. 該分頁是否有資料（至少要有標題行 + 一筆資料）');
    } else {
        Logger.log('\n❌ 測試失敗: ' + data.detail);
    }

    Logger.log('\n========== 測試結束 ==========');
}

/**
 * 列出所有可用的頻道（分頁）
 */
function listAvailableChannels() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    Logger.log('========== 可用頻道列表 ==========');
    Logger.log(`共 ${sheets.length} 個分頁:\n`);

    sheets.forEach((sheet, index) => {
        const name = sheet.getName();
        const rowCount = sheet.getLastRow();
        const dataCount = rowCount > 1 ? rowCount - 1 : 0; // 扣除標題行

        Logger.log(`${index + 1}. ${name}`);
        Logger.log(`   - 資料筆數: ${dataCount}`);
        Logger.log(`   - API 網址: ?channel=${name}&action=all\n`);
    });

    Logger.log('===================================');
}

/**
 * 驗證 Sheet 資料格式
 */
function validateSheetFormat() {
    // ⚠️ 請修改為您要驗證的頻道名稱
    const testChannel = 'godjj';

    Logger.log('========== 驗證資料格式 ==========');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(testChannel);

    if (!sheet) {
        Logger.log(`❌ 找不到名為 "${testChannel}" 的分頁`);
        return;
    }

    const data = sheet.getDataRange().getValues();

    Logger.log(`分頁名稱: ${testChannel}`);
    Logger.log(`總行數: ${data.length}`);

    if (data.length < 1) {
        Logger.log('❌ 分頁是空的');
        return;
    }

    // 檢查標題行
    const headers = data[0];
    Logger.log(`\n標題行: [${headers.join(', ')}]`);

    if (headers[0] !== 'date' || headers[1] !== 'summary_json') {
        Logger.log('⚠️ 標題格式不正確！應該是: [date, summary_json]');
    }

    if (data.length < 2) {
        Logger.log('\n⚠️ 只有標題行，沒有資料');
        return;
    }

    // 檢查第一筆資料
    Logger.log(`\n檢查第一筆資料（第 2 行）:`);
    const firstRow = data[1];
    Logger.log(`- 日期 (A2): ${firstRow[0]}`);
    Logger.log(`- JSON 字串長度: ${firstRow[1]?.length || 0} 字元`);

    try {
        const parsed = JSON.parse(firstRow[1]);
        Logger.log(`- JSON 解析: ✅ 成功`);
        Logger.log(`- 包含欄位: ${Object.keys(parsed).join(', ')}`);
    } catch (e) {
        Logger.log(`- JSON 解析: ❌ 失敗`);
        Logger.log(`- 錯誤: ${e.toString()}`);
        Logger.log(`- 前 100 字元: ${firstRow[1]?.substring(0, 100)}...`);
    }

    Logger.log('\n===================================');
}
