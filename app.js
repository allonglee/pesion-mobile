console.log('★ app.js 已加载');
// 全局变量声明区域
let rawData = []; // 存储从CSV加载的原始数据数组
let managers = []; // 存储所有不重复的管理人名称数组
let dates = []; // 存储所有不重复的日期数组，按降序排列（最新在前）
let selectedManagers = []; // 存储当前选中的管理人数组
let chart = null; // 主图表实例，用于后续更新或销毁
let scatterChart = null; // 散点图实例，用于收益率与最大回撤分析
let detailSortColumn = 0; // 明细表格当前排序列索引，默认为第0列
let detailSortDirection = 'desc'; // 明细表格排序方向，默认为降序
let statsSortColumn = 1; // 统计表格当前排序列索引，默认为第1列
let statsSortDirection = 'desc'; // 统计表格排序方向，默认为降序

// DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', function() {
    loadData(); // 加载CSV数据
    initCustomDropdown(); // 初始化自定义下拉框
});

/**
 * 转换JSON数据结构
 * 将嵌套的JSON对象展平为原始CSV格式等效的对象数组
 * @param {Object} jsonData - 从API获取的嵌套JSON数据
 * @returns {Array} 转换后的扁平化数据数组
 */
function transformJSON(jsonData) {
    const result = [];
    
    // 遍历每个管理人
    for (const manager in jsonData) {
        const managerData = jsonData[manager];
        
        // 遍历每个数据类型（如"组合数_整体_整体"）
        for (const key in managerData) {
            const parts = key.split('_');
            const rawType = parts[0]; // 如："收益率（单季）"
            const dataClass = parts[1]; // "整体"或"单一计划"
            const assetType = parts[2]; // "整体"、"固定收益类"或"含权益类"
            
            // 标准化数据类型名称
            let type;
            if (rawType.includes('收益率')) {
                type = '收益率';
            } else if (rawType.includes('组合数')) {
                type = '组合数';
            } else if (rawType.includes('资产规模')) {
                type = '资产规模';
            } else {
                type = rawType;
            }
            
            // 确定资产类别：收益率数据使用具体类别，其他使用"整体"
            const category = (type === '收益率') ? assetType : '整体';
            
            // 遍历时间序列数据
            const timeSeries = managerData[key];
            for (const date in timeSeries) {
                const value = timeSeries[date];
                
                // 确保数值有效
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    result.push({
                        date: date,           // 日期：如"2025-09-30"
                        manager: manager,     // 管理人：如"海富通"
                        type: type,           // 数据类型：如"收益率"
                        category: category,   // 资产类别：如"固定收益类"
                        value: numValue       // 数值：如1.3326
                    });
                }
            }
        }
    }
    
    return result;
}

/**
 * 加载JSON数据文件
 * 优先从文件加载，失败时使用示例数据
 */
// app.js  ——  全新 loadData 函数
async function loadData() {
  console.log('loadData 被调用');
  const loadingEl = document.getElementById('loading');
  const contentEl = document.getElementById('content');
  const uploadEl  = document.getElementById('uploadSection');

  try {
    const db = new LocalDB();
    await db.init();
    const cached = await db.get();
    if (cached) {
      rawData = transformJSON(cached);
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
      initializeApp();
      return;
    }
  } catch (e) {
    console.warn('IndexedDB 读取失败:', e);
  }

  // 无论 IndexedDB 有无数据，只要走到这里就显示上传界面
  loadingEl.style.display = 'none';
  uploadEl.style.display  = 'block';
}
/**
 * 示例数据生成函数（后备方案）
 * 当JSON文件加载失败时使用
 */
function getSampleData() {
    return [
        { date: '2025-09-30', manager: '海富通', type: '收益率', category: '固定收益类', value: -0.0879 },
        { date: '2025-09-30', manager: '海富通', type: '收益率', category: '含权益类', value: 8.0154 },
        { date: '2025-09-30', manager: '华夏', type: '收益率', category: '固定收益类', value: 0.0567 },
        { date: '2025-09-30', manager: '华夏', type: '收益率', category: '含权益类', value: 5.506 },
        // ... 请补充完整示例数据或留空数组
    ];
}
/**
 * 获取示例数据（当CSV加载失败时使用）
 * @returns {Array} 示例数据数组
 */
function getSampleData() {
    return [
        {date:"2024/12/31",manager:"海富通基金",type:"组合数",category:"整体",value:104},
        {date:"2024/12/31",manager:"华夏基金",type:"组合数",category:"整体",value:139},
        {date:"2024/12/31",manager:"南方基金",type:"组合数",category:"整体",value:313},
        {date:"2024/12/31",manager:"易方达基金",type:"组合数",category:"整体",value:416},
        {date:"2025/09/30",manager:"海富通基金",type:"资产规模",category:"整体",value:7727028.18},
        {date:"2025/09/30",manager:"华夏基金",type:"资产规模",category:"整体",value:11800000},
        {date:"2025/09/30",manager:"南方基金",type:"资产规模",category:"整体",value:27400000},
        {date:"2025/09/30",manager:"易方达基金",type:"资产规模",category:"整体",value:33300000},
        {date:"2024/12/31",manager:"海富通基金",type:"收益率",category:"固定收益类",value:1.3326},
        {date:"2024/12/31",manager:"华夏基金",type:"收益率",category:"固定收益类",value:1.2259},
        {date:"2024/12/31",manager:"南方基金",type:"收益率",category:"固定收益类",value:0.7912},
        {date:"2024/12/31",manager:"易方达基金",type:"收益率",category:"固定收益类",value:2.1848}
    ];
}

/**
 * 初始化应用
 * 设置日期选择器、管理人选择器，并显示内容
 */
function initializeApp() {
    // 获取所有不重复的管理人名称，按字母升序排序
    managers = [...new Set(rawData.map(d => d.manager))].sort();
    // 获取所有不重复的日期，按降序排序（最新在前）
    dates = [...new Set(rawData.map(d => d.date))].sort().reverse();
    // 默认选中所有管理人
    selectedManagers = [...managers];
    
    // 初始化日期选择器
    initDateSelectors();
    // 初始化管理人选择器
    initManagerSelector();
    // 初始化事件监听器
    initEventListeners();
    
    // 隐藏加载提示
    document.getElementById('loading').style.display = 'none';
    // 显示主要内容区域
    document.getElementById('content').style.display = 'block';
    
    // 更新图表
    updateChart();
}

/**
 * 初始化日期选择器
 * 填充可选日期，并设置默认值
 */
function initDateSelectors() {
    // 获取期初和期末日期选择器DOM元素
    const startSelect = document.getElementById('startDateSelect');
    const endSelect = document.getElementById('endDateSelect');
    
    // 遍历日期数组，为每个日期创建选项
    dates.forEach((date, index) => {
        const option1 = new Option(formatDate(date), index); // 期初选项
        const option2 = new Option(formatDate(date), index); // 期末选项
        startSelect.add(option1); // 添加到期初选择器
        endSelect.add(option2); // 添加到期末选择器
    });
    
    // 设置默认值：期末为最新日期（索引0），期初为3个季度前（最大索引3）
    endSelect.selectedIndex = 0;
    startSelect.selectedIndex = Math.min(3, dates.length - 1);
}

/**
 * 初始化管理人选择器
 * 填充所有管理人选项
 */
function initManagerSelector() {
    // 获取管理人列表容器
    const itemsContainer = document.getElementById('managerItems');
    itemsContainer.innerHTML = ''; // 清空容器
    
    // 遍历管理人数组，创建选项元素
    managers.forEach(manager => {
        const item = document.createElement('div'); // 创建div元素
        item.className = 'dropdown-item'; // 设置类名
        item.textContent = manager; // 设置文本内容
        item.dataset.value = manager; // 设置data-value属性存储值
        
        // 如果当前管理人被选中，添加选中样式
        if (selectedManagers.includes(manager)) {
            item.classList.add('selected'); // 添加选中类名
        }
        
        // 绑定点击事件
        item.onclick = function() {
            toggleManager(manager); // 切换选中状态
        };
        
        itemsContainer.appendChild(item); // 添加到容器
    });
    
    // 更新显示区域
    updateManagerDisplay();
}

/**
 * 初始化自定义下拉框的交互逻辑
 */
function initCustomDropdown() {
    // 获取相关DOM元素
    const display = document.getElementById('managerDisplay');
    const options = document.getElementById('managerOptions');
    const search = document.getElementById('managerSearch');
    
    // 点击显示区域时，切换下拉选项显示状态
    display.onclick = function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        options.classList.toggle('show'); // 切换show类名
    };
    
    // 搜索框输入时，实时过滤选项
    search.oninput = function() {
        const filter = this.value.toLowerCase(); // 获取搜索关键词并转为小写
        const items = document.querySelectorAll('.dropdown-item'); // 获取所有选项
        
        // 遍历选项，显示匹配项，隐藏不匹配项
        items.forEach(item => {
            if (item.textContent.toLowerCase().includes(filter)) {
                item.style.display = 'block'; // 显示
            } else {
                item.style.display = 'none'; // 隐藏
            }
        });
    };
    
    // 点击页面其他地方时，关闭下拉选项
    document.onclick = function() {
        options.classList.remove('show'); // 移除show类名
    };
    
    // 阻止在选项区域内点击时关闭下拉
    options.onclick = function(e) {
        e.stopPropagation(); // 阻止事件冒泡
    };
}

/**
 * 切换管理人的选中状态
 * @param {string} manager - 管理人名称
 */
function toggleManager(manager) {
    // 获取对应管理人的选项元素
    const item = document.querySelector(`[data-value="${manager}"]`);
    
    // 如果当前已选中，则取消选中
    if (selectedManagers.includes(manager)) {
        selectedManagers = selectedManagers.filter(m => m !== manager); // 从数组中移除
        item.classList.remove('selected'); // 移除选中样式
    } else {
        // 如果当前未选中，则添加到选中列表
        selectedManagers.push(manager); // 添加到数组
        item.classList.add('selected'); // 添加选中样式
    }
    
    // 更新显示区域
    updateManagerDisplay();
    // 更新图表
    updateChart();
}

/**
 * 更新管理人显示区域
 */
function updateManagerDisplay() {
    // 获取显示区域DOM元素
    const display = document.getElementById('managerDisplay');
    
    // 如果没有选中的管理人
    if (selectedManagers.length === 0) {
        // 显示提示文本
        display.innerHTML = '<span style="color: #8e8e93;">点击选择管理人...</span>';
    } else if (selectedManagers.length === managers.length) {
        // 如果选中所有管理人，显示"已选择全部管理人"
        display.innerHTML = '<span style="color: #007aff;">已选择全部管理人</span>';
    } else {
        // 显示已选中的管理人标签
        display.innerHTML = selectedManagers.map(m => 
            `<span class="selected-tag">${m}<span class="remove" onclick="removeManager(event, '${m}')">&times;</span></span>`
        ).join(''); // 拼接HTML字符串
    }
}

/**
 * 移除单个管理人
 * @param {Event} event - 事件对象
 * @param {string} manager - 管理人名称
 */
function removeManager(event, manager) {
    event.stopPropagation(); // 阻止事件冒泡
    toggleManager(manager); // 调用切换函数
}

/**
 * 全选所有管理人
 */
function selectAllManagers() {
    // 设置选中数组为所有管理人
    selectedManagers = [...managers];
    // 为所有选项添加选中样式
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.add('selected');
    });
    // 更新显示区域
    updateManagerDisplay();
    // 更新图表
    updateChart();
}

/**
 * 全不选管理人
 */
function clearAllManagers() {
    // 清空选中数组
    selectedManagers = [];
    // 移除所有选项的选中样式
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('selected');
    });
    // 更新显示区域
    updateManagerDisplay();
    // 更新图表
    updateChart();
}

/**
 * 初始化事件监听器
 * 绑定所有控件的change事件
 */
function initEventListeners() {
    // 绑定期初日期变化事件
    document.getElementById('startDateSelect').addEventListener('change', updateChart);
    // 绑定期末日期变化事件
    document.getElementById('endDateSelect').addEventListener('change', updateChart);
    
    // 绑定数据类型变化事件
    document.getElementById('dataTypeSelect').addEventListener('change', function() {
        // 获取资产类别选择组元素
        const categoryGroup = document.getElementById('categoryGroup');
        // 仅在收益率模式下显示资产类别选择
        categoryGroup.style.display = this.value === 'return' ? 'block' : 'none';
        // 更新图表
        updateChart();
    });
    
    // 绑定资产类别变化事件
    document.getElementById('categorySelect').addEventListener('change', updateChart);
    // 绑定分析模式变化事件
    document.getElementById('compareModeSelect').addEventListener('change', updateChart);
    
    // 绑定明细数据显示复选框变化事件
    document.getElementById('showDetailCheckbox').addEventListener('change', function() {
        // 根据复选框状态切换明细表格显示
        document.getElementById('detailTableContainer').classList.toggle('show', this.checked);
    });
}

/**
 * 格式化日期字符串为"年Q季度"格式
 * @param {string} dateStr - 日期字符串（如"2024/12/31"）
 * @returns {string} 格式化后的字符串（如"2024Q4"）
 */
function formatDate(dateStr) {
    const date = new Date(dateStr); // 创建日期对象
    const year = date.getFullYear(); // 获取年份
    const quarter = Math.floor(date.getMonth() / 3) + 1; // 计算季度（1-4）
    return `${year}Q${quarter}`; // 返回格式化字符串
}

/**
 * 更新图表和表格
 * 核心更新逻辑，根据当前选择筛选数据并更新视图
 */
function updateChart() {
    // 获取期初和期末日期选择器的当前选中索引
    const startIndex = parseInt(document.getElementById('startDateSelect').value);
    const endIndex = parseInt(document.getElementById('endDateSelect').value);
    
    // 确保期初时间不晚于期末时间（由于dates数组是逆序的）
    if(startIndex < endIndex) {
        // 显示错误提示
        alert('期初时间不能晚于期末时间');
        // 自动调整期初时间
        document.getElementById('startDateSelect').selectedIndex = endIndex;
        return; // 退出函数
    }
    
    // 获取其他筛选条件
    const dataType = document.getElementById('dataTypeSelect').value; // 数据类型
    const category = document.getElementById('categorySelect').value; // 资产类别
    const compareMode = document.getElementById('compareModeSelect').value; // 分析模式
    
    // 处理筛选后的日期范围
    let filteredDates = [];
    let usePreviousDate = false; // 标记是否需要使用前一个日期的数据
    
    // 单日期情况（期初等于期末）
    if (startIndex === endIndex) {
        // 只包含一个日期
        filteredDates = [dates[startIndex]];
        // 对于非收益率数据，需要使用前一个日期的数据作为期初
        usePreviousDate = (dataType !== 'return');
    } else {
        // 多个日期情况（dates是逆序数组）
        // 切片并反转，使日期按时间正序排列
        filteredDates = dates.slice(endIndex, startIndex + 1).reverse();
    }
    
    // 根据筛选条件过滤数据
    let filteredData = rawData.filter(d => 
        filteredDates.includes(d.date) && // 日期在范围内
        selectedManagers.includes(d.manager) // 管理人在选中列表中
    );
    
    // 根据数据类型进一步筛选
    if(dataType === 'scale') {
        // 仅筛选组合数数据
        filteredData = filteredData.filter(d => d.type === '组合数');
    } else if(dataType === 'asset') {
        // 仅筛选资产规模数据
        filteredData = filteredData.filter(d => d.type === '资产规模');
    } else if(dataType === 'return') {
        // 筛选收益率数据，并匹配资产类别
        filteredData = filteredData.filter(d => 
            d.type === '收益率' && d.category === (category === 'fixed' ? '固定收益类' : '含权益类')
        );
    }
    
    // 更新统计表格
    updateStatsTable(filteredData, filteredDates, dataType, usePreviousDate);
    // 更新主图表
    updateMainChart(filteredData, filteredDates, dataType, category, compareMode);
    // 更新明细表格
    updateDetailTable(filteredData, filteredDates, dataType);
}

/**
 * 计算最大回撤
 * @param {Array} returns - 收益率数组（小数形式）
 * @returns {number} 最大回撤百分比
 */
function calculateMaxDrawdown(returns) {
    let peak = 0; // 峰值，初始为0
    let maxDrawdown = 0; // 最大回撤，初始为0
    
    // 遍历收益率序列
    returns.forEach(r => {
        // 更新峰值
        if (r > peak) peak = r;
        // 计算当前回撤
        const drawdown = (peak - r) / (1 + peak);
        // 更新最大回撤
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    // 转换为百分比并返回
    return maxDrawdown * 100;
}

/**
 * 获取指定日期的前一个日期数据
 * @param {string} manager - 管理人名称
 * @param {string} currentDate - 当前日期
 * @param {string} dataType - 数据类型（scale/asset/return）
 * @param {string} category - 资产类别
 * @returns {Object|null} 前一个日期的数据对象或null
 */
function getPreviousDateData(manager, currentDate, dataType, category) {
    // 查找当前日期在dates数组中的索引
    const currentIndex = dates.indexOf(currentDate);
    // 如果未找到或已是最后一个日期，返回null
    if (currentIndex === -1 || currentIndex >= dates.length - 1) return null;
    
    // 获取前一个日期的字符串（dates数组是逆序的，所以索引+1是更早的日期）
    const prevDate = dates[currentIndex + 1];
    // 在原始数据中查找匹配的记录
    return rawData.find(d => 
        d.manager === manager && // 管理人匹配
        d.date === prevDate && // 日期匹配
        d.type === (dataType === 'scale' ? '组合数' : '资产规模') && // 数据类型匹配
        d.category === (dataType === 'scale' ? '整体' : '整体') // 资产类别匹配
    );
}

/**
 * 更新统计表格
 * 计算并显示区间统计指标
 */
function updateStatsTable(data, filteredDates, dataType, usePreviousDate) {
    // 获取表头和表体DOM元素
    const thead = document.getElementById('statsTableHead');
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = ''; // 清空表体
    
    // 清空表头
    thead.innerHTML = '';
    
    // 动态生成表头
    const headerRow = thead.insertRow();
    let headers = []; // 存储列标题
    
    // 根据数据类型设置不同的表头
    if(dataType === 'return') {
        headers = ['序号', '管理人', '区间收益率(%)', '区间最大回撤(%)']; // 收益率表头
    } else {
        headers = ['序号', '管理人', '期初值', '期末值', '区间变化']; // 其他数据表头
    }
    
    // 创建表头单元格
    headers.forEach((header, index) => {
        const th = document.createElement('th'); // 创建th元素
        th.textContent = header; // 设置文本内容
        th.style.userSelect = 'text'; //可复制
        // 为可排序列添加样式和事件
        if (index > 0) {
            th.className = 'sortable-header'; // 可排序类名
            th.onclick = () => sortStatsTable(index); // 点击排序
        }
        headerRow.appendChild(th); // 添加到表头行
    });
    
    // 获取起止日期和资产类别
    const startDate = filteredDates[0];
    const endDate = filteredDates[filteredDates.length - 1];
    const category = document.getElementById('categorySelect').value;
    const categoryName = category === 'fixed' ? '固定收益类' : '含权益类';
    
    const statsData = []; // 存储统计数据
    
    // 遍历选中的管理人
    selectedManagers.forEach((manager, idx) => {
        // 筛选当前管理人的数据，并按日期升序排序
        const managerData = data.filter(d => d.manager === manager).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 如果数据有效
        if(managerData.length >= 1) {
            let startValue = null; // 期初值
            let endValue = null; // 期末值
            
            // 获取期末值（最后一个日期）
            const endValueData = managerData[managerData.length - 1];
            endValue = endValueData.value;
            
            // 获取期初值
            if (usePreviousDate && filteredDates.length === 1) {
                // 单日期情况：尝试获取前一个日期的数据
                const prevData = getPreviousDateData(manager, startDate, dataType, categoryName);
                if (prevData) {
                    startValue = prevData.value; // 使用前一个日期数据
                } else {
                    // 如果没有前一个日期的数据，使用当前日期的数据作为期初
                    startValue = managerData[0].value;
                }
            } else if (managerData.length >= 2) {
                // 多日期情况：使用第一个日期的数据作为期初
                startValue = managerData[0].value;
            } else {
                // 只有一个日期的数据，期初期末相同
                startValue = managerData[0].value;
            }
            
            // 如果是收益率数据，计算区间收益率和最大回撤
            if(dataType === 'return') {
                // 计算累计收益率
                let cumulativeReturn = 1; // 初始值
                const returns = managerData.map(d => d.value / 100); // 转换为小数
                
                // 连乘计算累计收益
                returns.forEach(r => {
                    cumulativeReturn *= (1 + r);
                });
                cumulativeReturn = (cumulativeReturn - 1) * 100; // 转换为百分比
                
                // 计算最大回撤
                const maxDrawdown = calculateMaxDrawdown(returns);
                
                // 添加到统计数据数组
                statsData.push({
                    manager, // 管理人名称
                    value: cumulativeReturn, // 累计收益率
                    maxDrawdown, // 最大回撤
                    sortValue: cumulativeReturn // 排序值
                });
            } else {
                // 其他数据类型，计算区间变化
                const intervalChange = endValue - startValue; // 变化量
                // 区间收益率用于排序
                const intervalReturn = startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0;
                
                statsData.push({
                    manager, // 管理人名称
                    startValue, // 期初值
                    endValue, // 期末值
                    intervalChange, // 区间变化
                    sortValue: intervalReturn // 排序值
                });
            }
        }
    });
    
    // 按区间收益率从大到小排序
    statsData.sort((a, b) => b.sortValue - a.sortValue);
    
    // 填充表格行
    statsData.forEach((item, index) => {
        const row = tbody.insertRow(); // 创建新行
        if (dataType === 'return') {
            // 收益率数据显示模板
            row.innerHTML = `
                <td>${index + 1}</td> <!-- 序号 -->
                <td>${item.manager}</td> <!-- 管理人 -->
                <td style="font-weight: 600; color: ${item.value >= 0 ? '#34c759' : '#ff3b30'}">${item.value.toFixed(2)}%</td> <!-- 收益率，正数绿色，负数红色 -->
                <td style="color: #ff3b30">${item.maxDrawdown.toFixed(2)}%</td> <!-- 最大回撤，红色 -->
            `;
        } else {
            // 其他数据显示模板
            row.innerHTML = `
                <td>${index + 1}</td> <!-- 序号 -->
                <td>${item.manager}</td> <!-- 管理人 -->
                <td>${formatValue(item.startValue, dataType)}</td> <!-- 期初值 -->
                <td>${formatValue(item.endValue, dataType)}</td> <!-- 期末值 -->
                <td style="font-weight: 600; color: ${item.intervalChange >= 0 ? '#34c759' : '#ff3b30'}">${formatValue(item.intervalChange, dataType)}</td> <!-- 区间变化，正数绿色，负数红色 -->
            `;
        }
    });
    
    // 如果没有数据，显示提示信息
    if(tbody.rows.length === 0) {
        const row = tbody.insertRow(); // 创建新行
        row.innerHTML = `<td colspan="${headers.length}" style="text-align: center; color: #8e8e93; padding: 20px;">暂无数据</td>`; // 跨列显示提示
    }
}

/**
 * 统计表格排序
 * @param {number} column - 列索引
 */
function sortStatsTable(column) {
    // 获取表格和表体
    const table = document.getElementById('statsTable');
    const tbody = table.querySelector('tbody');
    // 获取所有行并转换为数组
    const rows = Array.from(tbody.querySelectorAll('tr'));
    // 获取所有表头
    const headers = table.querySelectorAll('th');
    
    // 清除之前的排序标记
    headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    
    // 更新排序方向和列
    if(statsSortColumn === column) {
        // 如果点击同一列，切换排序方向
        statsSortDirection = statsSortDirection === 'desc' ? 'asc' : 'desc';
    } else {
        // 如果点击新列，重置为降序
        statsSortColumn = column;
        statsSortDirection = 'desc';
    }
    
    // 添加当前排序标记
    headers[column].classList.add(statsSortDirection === 'desc' ? 'sort-desc' : 'sort-asc');
    
    // 排序逻辑
    rows.sort((a, b) => {
        // 获取单元格文本并移除%，和逗号
        const aVal = a.cells[column].textContent.replace(/[%,]/g, '');
        const bVal = b.cells[column].textContent.replace(/[%,]/g, '');
        
        let comparison = 0; // 比较结果
        
        // 管理人列按文本排序
        if(column === 1) {
            comparison = a.cells[column].textContent.localeCompare(b.cells[column].textContent);
        } else {
            // 数值列按数值排序
            comparison = parseFloat(aVal) - parseFloat(bVal);
        }
        
        // 根据排序方向返回结果
        return statsSortDirection === 'desc' ? -comparison : comparison;
    });
    
    // 清空表体并重新填充排序后的行
    tbody.innerHTML = '';
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1; // 更新序号
        tbody.appendChild(row); // 添加行
    });
}

/**
 * 更新主图表
 * @param {Array} data - 筛选后的数据
 * @param {Array} filteredDates - 筛选后的日期范围
 * @param {string} dataType - 数据类型
 * @param {string} category - 资产类别
 * @param {string} compareMode - 分析模式
 */
function updateMainChart(data, filteredDates, dataType, category, compareMode) {
    // 获取canvas上下文
    const ctx = document.getElementById('mainChart').getContext('2d');
    // 获取散点图容器
    const scatterContainer = document.getElementById('scatterChartContainer');
    
    // 销毁现有图表实例
    if(chart) {
        chart.destroy();
    }
    if(scatterChart) {
        scatterChart.destroy();
    }
    
    // 定义颜色数组，用于区分不同管理人
    const colors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#00c7be', '#ffcc00', '#5ac8fa', '#ff6b6b', '#4cd964'];
    
    // 判断分析模式和数据类型
    if(compareMode === 'compare' && dataType === 'return') {
        // 收益率趋势分析：展示累计收益率
        const datasets = []; // 存储数据集
        const startDate = filteredDates[0]; // 获取起始日期
        
        // 遍历选中的管理人
        selectedManagers.forEach((manager, index) => {
            // 筛选当前管理人的数据，按日期升序排序
            const managerData = data
                .filter(d => d.manager === manager)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // 如果数据有效
            if(managerData.length > 0) {
                // 构建累计收益率序列
                const cumulativeReturns = [0]; // 期初从0开始
                let cumulativeReturn = 1; // 初始值
                
                // 计算累计收益
                managerData.forEach(d => {
                    cumulativeReturn *= (1 + d.value / 100);
                    cumulativeReturns.push((cumulativeReturn - 1) * 100);
                });
                
                // 生成标签：从期初开始
                const labels = [formatDate(startDate), ...filteredDates.map(d => formatDate(d))];
                
                // 添加到数据集
                datasets.push({
                    label: manager, // 管理人名称
                    data: cumulativeReturns, // 累计收益率数据
                    borderColor: colors[index % colors.length], // 边框颜色
                    backgroundColor: colors[index % colors.length] + '20', // 背景颜色（带透明度）
                    borderWidth: 2.5, // 边框宽度
                    pointRadius: 5, // 数据点半径
                    pointHoverRadius: 7, // 悬停时半径
                    tension: 0.2, // 曲线平滑度
                    fill: false // 不填充
                });
            }
        });
        
        // 创建折线图
        chart = new Chart(ctx, {
            type: 'line', // 图表类型：折线图
            data: {
                labels: [formatDate(startDate), ...filteredDates.map(d => formatDate(d))], // X轴标签
                datasets: datasets // 数据集
            },
            options: getLineChartOptions(dataType) // 获取图表选项
        });
    } else if(compareMode === 'compare') {
        // 其他数据的趋势分析
        const datasets = []; // 存储数据集
        
        // 遍历选中的管理人
        selectedManagers.forEach((manager, index) => {
            // 筛选数据并排序
            const managerData = data
                .filter(d => d.manager === manager)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // 如果数据有效
            if(managerData.length > 0) {
                // 添加到数据集
                datasets.push({
                    label: manager, // 管理人名称
                    data: managerData.map(d => d.value), // 数据值
                    borderColor: colors[index % colors.length], // 边框颜色
                    backgroundColor: colors[index % colors.length] + '20', // 背景颜色
                    borderWidth: 2.5, // 边框宽度
                    pointRadius: 5, // 数据点半径
                    pointHoverRadius: 7, // 悬停时半径
                    tension: 0.2, // 曲线平滑度
                    fill: false // 不填充
                });
            }
        });
        
        // 创建折线图
        chart = new Chart(ctx, {
            type: 'line', // 图表类型：折线图
            data: {
                labels: filteredDates.map(d => formatDate(d)), // X轴标签
                datasets: datasets // 数据集
            },
            options: getLineChartOptions(dataType) // 获取图表选项
        });
    } else {
        // 截面分析：条形图
        // 获取期末日期
        const endDate = filteredDates[filteredDates.length - 1];
        const chartData = []; // 存储图表数据
        const colorList = []; // 存储颜色
        
        // 遍历选中的管理人
        selectedManagers.forEach((manager, index) => {
            // 获取期末数据
            const managerData = data.filter(d => d.manager === manager && d.date === endDate);
            if (managerData.length > 0) {
                // 如果有数据，添加到图表数组
                chartData.push({
                    manager: manager, // 管理人
                    value: managerData[0].value // 数值
                });
            } else {
                // 如果没有数据，值为0
                chartData.push({
                    manager: manager,
                    value: 0
                });
            }
            colorList.push(colors[index % colors.length]); // 添加颜色
        });
        
        // 所有数据类型都按数值从大到小排序
        chartData.sort((a, b) => b.value - a.value);
        
        // 创建条形图
        chart = new Chart(ctx, {
            type: 'bar', // 图表类型：条形图
            data: {
                labels: chartData.map(d => d.manager), // X轴标签
                datasets: [{
                    label: getDataTypeLabel(), // 数据类型标签
                    data: chartData.map(d => d.value), // 数值
                    backgroundColor: chartData.map((_, i) => colors[i % colors.length] + '60'), // 背景颜色带透明度
                    borderColor: chartData.map((_, i) => colors[i % colors.length]), // 边框颜色
                    borderWidth: 1.5, // 边框宽度
                    borderRadius: 6, // 圆角
                    borderSkipped: false, // 四个角都圆角
                }]
            },
            options: {
                responsive: true, // 响应式
                maintainAspectRatio: false, // 不保持宽高比
                plugins: {
                    legend: { display: false }, // 不显示图例
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)', // 背景颜色
                        padding: 12, // 内边距
                        cornerRadius: 8, // 圆角
                        callbacks: {
                            label: function(context) {
                                // 格式化数值显示
                                return formatValue(context.parsed.y, dataType);
                            }
                        }
                    }
                },s
                scales: {
                    y: {
                        beginAtZero: true, // 从0开始
                        grid: { color: 'rgba(0,0,0,0.05)' }, // 网格线颜色
                        ticks: {
                            callback: function(value) {
                                // 格式化Y轴标签
                                return formatValue(value, dataType);
                            }
                        }
                    },
                    x: {
                        grid: { display: false } // 不显示X轴网格线
                    }
                }
            }
        });
        
        // 收益率截面分析时显示散点图
        if (dataType === 'return') {
            scatterContainer.classList.add('show'); // 显示散点图容器
            updateScatterChart(data, filteredDates); // 更新散点图
        } else {
            scatterContainer.classList.remove('show'); // 隐藏散点图容器
        }
    }
}

/**
 * 更新散点图
 * 显示收益率与最大回撤的散点分布
 */
function updateScatterChart(data, filteredDates) {
    // 获取canvas上下文
    const ctx = document.getElementById('scatterChart').getContext('2d');
    const scatterData = []; // 存储散点数据
    // 颜色数组
    const colors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#00c7be', '#ffcc00', '#5ac8fa', '#ff6b6b', '#4cd964'];
    
    // 遍历选中的管理人
    selectedManagers.forEach((manager, index) => {
        // 筛选数据并排序
        const managerData = data.filter(d => d.manager === manager).sort((a, b) => new Date(a.date) - new Date(b.date));
        // 如果数据有效
        if (managerData.length >= 1) {
            // 计算累计收益率和最大回撤
            let cumulativeReturn = 1; // 初始值
            const returns = managerData.map(d => d.value / 100); // 转换为小数
            
            // 计算累计收益
            returns.forEach(r => {
                cumulativeReturn *= (1 + r);
            });
            cumulativeReturn = (cumulativeReturn - 1) * 100; // 转换为百分比
            
            // 计算最大回撤
            const maxDrawdown = calculateMaxDrawdown(returns);
            
            // 添加到散点数据数组
            scatterData.push({
                x: maxDrawdown, // X轴：最大回撤
                y: cumulativeReturn, // Y轴：累计收益率
                manager: manager, // 管理人名称
                backgroundColor: colors[index % colors.length] + '80', // 背景颜色带透明度
                borderColor: colors[index % colors.length] // 边框颜色
            });
        }
    });
    
    // 创建散点图
    scatterChart = new Chart(ctx, {
        type: 'scatter', // 图表类型：散点图
        data: {
            datasets: [{
                label: '收益率 vs 最大回撤', // 数据集标签
                data: scatterData, // 散点数据
                backgroundColor: scatterData.map(d => d.backgroundColor), // 背景颜色
                borderColor: scatterData.map(d => d.borderColor), // 边框颜色
                borderWidth: 2, // 边框宽度
                pointRadius: 8, // 点半径
                pointHoverRadius: 10 // 悬停时半径
            }]
        },
        options: {
            responsive: true, // 响应式
            maintainAspectRatio: false, // 不保持宽高比
            plugins: {
                legend: { display: false }, // 不显示图例
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)', // 背景颜色
                    padding: 12, // 内边距
                    cornerRadius: 8, // 圆角
                    callbacks: {
                        title: function(context) {
                            return context[0].raw.manager; // 标题显示管理人
                        },
                        label: function(context) {
                            // 显示详细数据
                            return [
                                `区间收益率: ${context.parsed.y.toFixed(2)}%`,
                                `最大回撤: ${context.parsed.x.toFixed(2)}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true, // 显示标题
                        text: '最大回撤(%)', // 标题文本
                        font: { size: 14 } // 字体大小
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' } // 网格线颜色
                },
                y: {
                    title: {
                        display: true, // 显示标题
                        text: '区间收益率(%)', // 标题文本
                        font: { size: 14 } // 字体大小
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' } // 网格线颜色
                }
            }
        }
    });
}

/**
 * Chart.js 折线图配置生成器
 * @param {string} dataType - 数据类型: 'return' | 'scale' | 'asset' | 其他
 * @returns {object} Chart.js 配置对象
 */
function getLineChartOptions(dataType) {
    // 数值格式化辅助函数 - 统一保留2位小数
    function formatValue(value, dataType) {
        if (value == null || isNaN(value)) return '-';
        
        const numValue = Number(value);
        if (isNaN(numValue)) return value.toString();
        
        switch (dataType) {
            case 'return':
                return `${(numValue ).toFixed(2)}%`;
            case 'asset':
                const valInYi = numValue / 10000;
                return `¥${valInYi.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}亿元`;
            case 'scale':
            default:
                return numValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    // 插件ID（用于唯一标识）
    const PLUGIN_ID = 'customTooltipLifecycle';
    
    // 全局状态管理
    const tooltipState = {
        isPinned: false,
        pinnedData: null, // 固定时的数据快照
        currentChart: null,
        lastHoverPoint: null
    };

    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        // 图表点击事件：点击数据点区域固定/取消固定
        onClick: function(event, activeElements) {
            if (activeElements && activeElements.length > 0) {
                // 点击数据点区域：切换固定状态
                tooltipState.isPinned = !tooltipState.isPinned;
                
                if (tooltipState.isPinned) {
                    // 固定时保存当前数据
                    tooltipState.pinnedData = {
                        dataPoints: [...(chart.tooltip.dataPoints || [])],
                        title: chart.tooltip.title?.[0] || '',
                        position: { x: event.native.clientX, y: event.native.clientY }
                    };
                } else {
                    // 取消固定时清除数据
                    tooltipState.pinnedData = null;
                }
            } else {
                // 点击非数据区域：取消固定
                tooltipState.isPinned = false;
                tooltipState.pinnedData = null;
            }
        },
        // 鼠标悬停事件：悬停时保存最后悬停点
        onHover: function(event, activeElements) {
            if (activeElements && activeElements.length > 0) {
                tooltipState.lastHoverPoint = {
                    dataPoints: [...(chart.tooltip.dataPoints || [])],
                    title: chart.tooltip.title?.[0] || '',
                    caretX: chart.tooltip.caretX,
                    caretY: chart.tooltip.caretY
                };
            } else {
                tooltipState.lastHoverPoint = null;
            }
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { size: 13, family: '-apple-system' },
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                enabled: false,
                external: (function() {
                    let tooltipEl = null;
                    let contentEl = null;
                    
                    // 点击外部区域关闭固定
                    function handleClickOutside(e) {
                        if (!tooltipEl || !tooltipState.currentChart) return;
                        
                        const clickedOnCanvas = tooltipState.currentChart.canvas.contains(e.target);
                        const clickedOnTooltip = tooltipEl.contains(e.target);
                        
                        if (!clickedOnCanvas && !clickedOnTooltip) {
                            tooltipState.isPinned = false;
                            tooltipState.pinnedData = null;
                            tooltipEl.style.opacity = 0;
                        }
                    }
                    
                    // ESC键关闭
                    function handleEscKey(e) {
                        if (e.key === 'Escape') {
                            tooltipState.isPinned = false;
                            tooltipState.pinnedData = null;
                            if (tooltipEl) {
                                tooltipEl.style.opacity = 0;
                            }
                        }
                    }
                    
                    return function(context) {
                        const tooltip = context.tooltip;
                        const chart = context.chart;
                        
                        if (!chart) return;
                        
                        // 首次创建 tooltip 元素
                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.className = 'chartjs-tooltip';
                            tooltipEl.style.cssText = `
                                background: rgba(0,0,0,0.85);
                                color: white;
                                border-radius: 8px;
                                padding: 12px;
                                font-size: 13px;
                                max-width: 400px;
                                position: fixed;
                                pointer-events: auto;
                                z-index: 1000;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                backdrop-filter: blur(4px);
                                opacity: 0;
                                transition: opacity 0.2s;
                                cursor: default;
                            `;
                            
                            // 创建可滚动内容区域
                            contentEl = document.createElement('div');
                            contentEl.className = 'tooltip-content';
                            contentEl.style.cssText = `
                                max-height: 250px;
                                overflow-y: auto;
                                overflow-x: hidden;
                                margin-top: 8px;
                                padding-right: 4px;
                            `;
                            tooltipEl.appendChild(contentEl);
                            
                            document.body.appendChild(tooltipEl);
                            chart.canvas._tooltipEl = tooltipEl;
                            chart.canvas._tooltipContentEl = contentEl;
                            
                            // 添加全局事件监听（只添加一次）
                            document.addEventListener('click', handleClickOutside);
                            document.addEventListener('keydown', handleEscKey);
                            
                            // 阻止内容区域的滚轮事件冒泡
                            contentEl.addEventListener('wheel', (e) => {
                                e.stopPropagation();
                            }, { passive: true });
                        }

                        // 记录当前图表实例
                        tooltipState.currentChart = chart;
                        
                        // 固定状态：直接显示保存的内容，不更新
                        if (tooltipState.isPinned && tooltipState.pinnedData) {
                            tooltipEl.style.opacity = '1';
                            // 不再更新位置和内容，保持固定时的状态
                            return;
                        }
                        
                        // 非固定状态：正常显示悬停内容
                        if (tooltip.opacity === 0) {
                            tooltipEl.style.opacity = 0;
                            return;
                        }

                        // 处理数据点
                        const dataPoints = Array.from(tooltip.dataPoints || [])
                            .sort((a, b) => b.parsed.y - a.parsed.y);

                        if (dataPoints.length === 0) return;

                        // 构建内容
                        const title = tooltip.title[0] || '';
                        let content = `
                            <div style="font-size: 15px; margin-bottom: 8px; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                ${title}
                                ${tooltipState.isPinned ? '<span style="float: right; color: #ffd700;">🔒 已固定</span>' : ''}
                            </div>
                        `;

                        dataPoints.forEach(point => {
                            const value = formatValue(point.parsed.y, dataType);
                            const datasetLabel = point.dataset.label || '';
                            content += `
                                <div style="margin: 4px 0; padding: 4px 0; display: flex; justify-content: space-between;">
                                    <span>${datasetLabel}:</span>
                                    <span style="font-weight: 500; margin-left: 10px;">${value}</span>
                                </div>
                            `;
                        });

                        contentEl.innerHTML = content;
                        tooltipEl.style.opacity = '1';

                        // 更新位置
                        const canvasRect = chart.canvas.getBoundingClientRect();
                        const tooltipRect = tooltipEl.getBoundingClientRect();
                        
                        let left = canvasRect.left + tooltip.caretX + 10;
                        let top = canvasRect.top + tooltip.caretY - tooltipRect.height / 2;

                        // 边界检查
                        const padding = 10;
                        if (left + tooltipRect.width > window.innerWidth - padding) {
                            left = canvasRect.left + tooltip.caretX - tooltipRect.width - 10;
                        }
                        if (top < padding) {
                            top = padding;
                        } else if (top + tooltipRect.height > window.innerHeight - padding) {
                            top = window.innerHeight - tooltipRect.height - padding;
                        }

                        tooltipEl.style.left = `${left}px`;
                        tooltipEl.style.top = `${top}px`;
                    };
                })()
            },
            
            // 清理插件
            [PLUGIN_ID]: {
                id: PLUGIN_ID,
                beforeDestroy(chart) {
                    const tooltipEl = chart.canvas._tooltipEl;
                    if (tooltipEl) {
                        tooltipEl.remove();
                        delete chart.canvas._tooltipEl;
                        delete chart.canvas._tooltipContentEl;
                    }
                    
                    // 清理全局事件
                    document.removeEventListener('click', handleClickOutside);
                    document.removeEventListener('keydown', handleEscKey);
                    
                    // 重置状态
                    tooltipState.isPinned = false;
                    tooltipState.pinnedData = null;
                    tooltipState.currentChart = null;
                    tooltipState.lastHoverPoint = null;
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                    callback: (value) => formatValue(value, dataType)
                }
            },
            x: {
                grid: { display: false }
            }
        }
    };
}





/**
 * 更新明细表格
 * 显示原始数据明细
 */
function updateDetailTable(data, filteredDates, dataType) {
    // 获取表头和表体DOM元素
    const thead = document.getElementById('detailTableHead');
    const tbody = document.getElementById('detailTableBody');
    tbody.innerHTML = ''; // 清空表体
    
    // 动态生成表头
    thead.innerHTML = '';
    const headerRow = thead.insertRow(); // 创建表头行
    
    // 表头列
    const headers = ['日期', '管理人', getDataTypeLabel()];
    headers.forEach((header, index) => {
        const th = document.createElement('th'); // 创建th元素
        th.textContent = header; // 设置文本
        th.onclick = () => sortDetailTable(index); // 绑定点击排序事件
        headerRow.appendChild(th); // 添加到表头
    });
    
    // 按日期降序排序数据
    const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 填充表格行
    sortedData.forEach(d => {
        const row = tbody.insertRow(); // 创建新行
        row.innerHTML = `
            <td>${formatDate(d.date)}</td> <!-- 格式化日期 -->
            <td>${d.manager}</td> <!-- 管理人 -->
            <td>${formatValue(d.value, dataType)}</td> <!-- 格式化数值 -->
        `;
    });
}

/**
 * 明细表格排序
 * @param {number} column - 列索引
 */
function sortDetailTable(column) {
    // 获取表格和表体
    const table = document.getElementById('detailTable');
    const tbody = table.querySelector('tbody');
    // 获取所有行并转换为数组
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 更新排序列和方向
    if(detailSortColumn === column) {
        detailSortDirection = detailSortDirection === 'desc' ? 'asc' : 'desc'; // 切换方向
    } else {
        detailSortColumn = column; // 更新列
        detailSortDirection = 'desc'; // 重置为降序
    }
    
    // 排序逻辑
    rows.sort((a, b) => {
        // 获取单元格文本并移除%，和逗号
        const aVal = a.cells[column].textContent.replace(/[%,]/g, '');
        const bVal = b.cells[column].textContent.replace(/[%,]/g, '');
        
        let comparison = 0; // 比较结果
        
        // 数值列按数值排序
        if(column === 2) {
            comparison = parseFloat(aVal) - parseFloat(bVal);
        } else {
            // 文本列按文本排序
            comparison = a.cells[column].textContent.localeCompare(b.cells[column].textContent);
        }
        
        // 根据排序方向返回结果
        return detailSortDirection === 'desc' ? -comparison : comparison;
    });
    
    // 清空表体并重新填充
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * 获取当前数据类型标签
 * @returns {string} 数据类型描述文本
 */
function getDataTypeLabel() {
    const dataType = document.getElementById('dataTypeSelect').value; // 获取数据类型
    const category = document.getElementById('categorySelect').value; // 获取资产类别
    
    // 返回对应的标签文本
    if(dataType === 'scale') return '组合数';
    if(dataType === 'asset') return '资产规模(亿元)';
    if(dataType === 'return') return `收益率(${category === 'fixed' ? '固定收益类' : '含权益类'}%)`;
    return ''; // 默认返回空字符串
}

/**
 * 格式化数值显示
 * @param {number} value - 原始数值
 * @param {string} dataType - 数据类型
 * @returns {string} 格式化后的字符串
 */
function formatValue(value, dataType) {
    if(dataType === 'return') {
        // 收益率保留4位小数并添加%
        return value.toFixed(4) + '%';
    } else if(dataType === 'asset') {
        // 资产规模：原始数据是万元，转换为亿元（除以10000）
        return (value / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '亿';
    }
    // 其他数据使用千分位格式化
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

/**
 * 导出图表为PNG图片
 */
function exportChart() {
    // 如果图表存在
    if(chart) {
        const canvas = document.getElementById('mainChart'); // 获取canvas
        const url = canvas.toDataURL('image/png'); // 转换为DataURL
        const link = document.createElement('a'); // 创建下载链接
        link.download = `企业年金分析_${new Date().toLocaleDateString()}.png`; // 设置文件名
        link.href = url; // 设置链接地址
        link.click(); // 触发下载
    }
}

/**
 * 导出数据为Excel文件
 */
function exportExcel() {
    // 获取筛选条件
    const dataType = document.getElementById('dataTypeSelect').value;
    const category = document.getElementById('categorySelect').value;
    
    // 获取日期范围
    const startIndex = parseInt(document.getElementById('startDateSelect').value);
    const endIndex = parseInt(document.getElementById('endDateSelect').value);
    // 处理单日期和多日期情况
    const filteredDates = startIndex === endIndex ? 
        [dates[startIndex]] : 
        dates.slice(endIndex, startIndex + 1).reverse();
    
    // 筛选数据
    let filteredData = rawData.filter(d => 
        filteredDates.includes(d.date) && // 日期匹配
        selectedManagers.includes(d.manager) // 管理人匹配
    );
    
    // 根据数据类型进一步筛选
    if(dataType === 'scale') {
        filteredData = filteredData.filter(d => d.type === '组合数');
    } else if(dataType === 'asset') {
        filteredData = filteredData.filter(d => d.type === '资产规模');
    } else if(dataType === 'return') {
        filteredData = filteredData.filter(d => 
            d.type === '收益率' && d.category === (category === 'fixed' ? '固定收益类' : '含权益类')
        );
    }
    
    // 转换数据格式为导出格式
    const exportData = filteredData.map(d => ({
        '日期': formatDate(d.date), // 格式化日期
        '管理人': d.manager, // 管理人
        '数值': d.value.toFixed(4), // 数值保留4位小数
        '数据类型': getDataTypeLabel() // 数据类型标签
    }));
    
    // 使用SheetJS创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '数据'); // 添加工作表
    
    // 生成文件名并下载
    const fileName = `企业年金分析_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
// ==================== PWA功能增强 ====================

/**
 * 注册Service Worker（PWA核心）
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker 注册成功:', registration);
                    
                    // 监听Service Worker更新
                    registration.addEventListener('updatefound', () => {
                        console.log('🔄 发现新版本的Service Worker');
                    });
                })
                .catch(error => {
                    console.error('❌ Service Worker 注册失败:', error);
                });
        });
    } else {
        console.warn('⚠️ 浏览器不支持Service Worker');
    }
}

/**
 * 显示离线提示（非阻塞）
 */
function showOfflineMessage() {
    // 避免重复显示
    if (document.getElementById('offline-msg')) return;
    
    const offlineDiv = document.createElement('div');
    offlineDiv.id = 'offline-msg';
    offlineDiv.innerHTML = `
        <span>📶 离线模式 - 显示缓存数据</span>
        <button onclick="this.parentElement.remove()" style="margin-left: 10px; background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer;">关闭</button>
    `;
    offlineDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #ffa500;
        color: white;
        padding: 12px;
        border-radius: 4px;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease-out;
    `;
    
    // 添加动画样式
    if (!document.getElementById('offline-msg-style')) {
        const style = document.createElement('style');
        style.id = 'offline-msg-style';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(offlineDiv);
    
    // 5秒后自动隐藏
    setTimeout(() => {
        if (offlineDiv.parentElement) {
            offlineDiv.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => offlineDiv.remove(), 300);
        }
    }, 5000);
}

/**
 * 手动刷新数据（供按钮调用）
 */
async function refreshData() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.textContent = '刷新中...';
        refreshBtn.disabled = true;
    }
    
    // 清除旧缓存并重新加载
    if ('caches' in window) {
        const cache = await caches.open('pension-app-v1');
        await cache.delete('/data/pension_data.json');
    }
    
    await loadData();
    
    if (refreshBtn) {
        refreshBtn.textContent = '🔄 刷新';
        refreshBtn.disabled = false;
    }
}

// ==================== 启动应用 ====================

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 1. 注册Service Worker
    registerServiceWorker();
    
    // 2. 加载数据
    loadData();
    
    // 3. 设置自动刷新（可选）
    setupAutoRefresh();
    
    // 4. 添加刷新按钮事件
    setupRefreshButton();
});

/**
 * 设置自动刷新（可选功能）
 */
function setupAutoRefresh() {
    // 每10分钟自动检查更新
    setInterval(() => {
        console.log('⏰ 定时检查数据更新...');
        loadData();
    }, 10 * 60 * 1000);
    
    // 页面重新可见时刷新
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👀 页面重新可见，刷新数据...');
            loadData();
        }
    });
}

/**
 * 设置刷新按钮（如果页面有这个按钮）
 */
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
}

async function reuploadData() {
  if (confirm('重新上传会覆盖本地数据，继续？')) {
    indexedDB.deleteDatabase('PensionDB'); // 清 IndexedDB
    location.reload();                     // 刷新 → 回到上传界面
  }
}

async function handleFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) { alert('请先选择文件'); return; }

  const text = await file.text();
  try {
    const jsonData = JSON.parse(text);
    rawData = transformJSON(jsonData);

    // 存 IndexedDB，下次自动用
    const db = new LocalDB();
    await db.init();
    await db.save(jsonData);

    // 切换界面
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    initializeApp();
  } catch (e) {
    alert('JSON 解析失败：' + e.message);
  }
}




