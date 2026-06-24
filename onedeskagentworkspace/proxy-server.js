/**
 * AI参谋分析代理服务器
 * 解决前端跨域问题，安全调用豆包大模型API
 * 
 * 使用方法：
 * 1. 安装依赖：npm install
 * 2. 启动服务：node proxy-server.js
 * 3. 代理服务器运行在 http://localhost:3003
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3003;

// 投行业务助手 Python 脚本路径
const IB_ASSISTANT_DIR = path.join(__dirname, 'ib-business-assistant');
const IB_ASSISTANT_SCRIPT = path.join(IB_ASSISTANT_DIR, 'main.py');

// 启用CORS，允许前端访问
app.use(cors({
    origin: '*',  // 允许所有来源（生产环境建议指定具体域名）
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));

// 提供静态文件服务（HTML, CSS, JS, 图片等）
app.use(express.static(__dirname));

// 豆包AI配置
const DOUBAO_CONFIG = {
    apiKey: 'api-key-20260319101617',
    apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-pro-32k'
};

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        service: 'AI参谋分析代理服务器',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// AI分析代理接口
app.post('/api/ai/analyze', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { input, provider = 'doubao' } = req.body;
        
        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                error: '请输入要分析的内容',
                code: 'INVALID_INPUT'
            });
        }
        
        console.log(`[${new Date().toLocaleString()}] 收到分析请求: ${input.substring(0, 50)}...`);
        
        // 构建系统提示词
        const systemPrompt = `你是一位专业的金融分析师AI参谋，拥有丰富的证券投资分析经验。请对用户的分析请求进行专业的财务分析。

【输出格式要求】
请严格按照以下结构输出：

## 分析摘要
用2-3句话概括核心观点

## 核心观点
- 财务风险识别：...
- 估值水平判断：...
- 竞争地位分析：...

## 数据支撑
- 关键财务指标：...
- 行业对比：...
- 历史趋势：...

## 投资建议
- 短期策略：...
- 中期策略：...
- 关注要点：...

## 风险提示
- 风险1：...
- 风险2：...

【要求】
1. 使用Markdown格式，标题用##，列表用-
2. 数据要具体，给出合理区间或参考值
3. 观点要明确，避免模棱两可
4. 专业但不晦涩，让普通投资者也能理解
5. 最后必须声明"本分析仅供参考，不构成投资建议"`;
        
        // 调用豆包API
        const response = await fetch(DOUBAO_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: DOUBAO_CONFIG.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `请对以下投资标的进行全面分析：${input}` }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`豆包API错误: ${response.status} - ${errorText}`);
            
            if (response.status === 401) {
                return res.status(500).json({
                    error: 'API密钥无效，请检查配置',
                    code: 'API_KEY_INVALID'
                });
            } else if (response.status === 429) {
                return res.status(500).json({
                    error: '请求过于频繁，请稍后再试',
                    code: 'RATE_LIMIT'
                });
            } else {
                return res.status(500).json({
                    error: `AI服务暂时不可用 (${response.status})`,
                    code: 'API_ERROR'
                });
            }
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({
                error: 'AI返回数据格式不正确',
                code: 'INVALID_RESPONSE'
            });
        }
        
        const aiResponse = data.choices[0].message.content;
        const duration = Date.now() - startTime;
        
        console.log(`[${new Date().toLocaleString()}] 分析完成，耗时 ${duration}ms`);
        
        // 返回给前端
        res.json({
            success: true,
            content: aiResponse,
            model: DOUBAO_CONFIG.model,
            duration: duration,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('代理服务器错误:', error);
        
        res.status(500).json({
            error: error.message || '服务器内部错误',
            code: 'SERVER_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== 投行业务参与助手 API ====================
// 调用 Python 投行业务助手，支持业务推荐、教学、人员匹配
app.post('/api/ib-assistant', async (req, res) => {
    const startTime = Date.now();

    try {
        const { input, agentId, agentName } = req.body;

        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                error: '请输入要咨询的内容',
                code: 'INVALID_INPUT'
            });
        }

        console.log(`[${new Date().toLocaleString()}] 投行助手请求 [${agentName}]: ${input.substring(0, 80)}...`);

        // 构建 prompt，根据不同的 AI 助手调整上下文
        const agentPrompts = {
            customer: `你是一个专业的客户分析助手，帮助非投行部门员工分析客户信息并推荐适合的投行业务。请用中文回复。`,
            business: `你是一个专业的业务分析助手，帮助非投行部门员工挖掘客户业务机会，提供业务拓展建议。请用中文回复。`,
            plan: `你是一个专业的方案生成助手，帮助非投行部门员工生成投行业务方案和操作指引。请用中文回复。`,
            verify: `你是一个专业的交叉验证助手，帮助非投行部门员工核查投行业务风险点和合规事项。请用中文回复。`,
            service: `你是一个专业的客户服务助手，帮助非投行部门员工提供客户服务建议和信披判断。请用中文回复。`,
        };

        const agentPrompt = agentPrompts[agentId] || agentPrompts.customer;
        const fullInput = `${agentPrompt}\n\n用户问题：${input}`;

        // 调用 Python 投行业务助手
        const result = await callPythonAssistant(fullInput);

        const duration = Date.now() - startTime;

        console.log(`[${new Date().toLocaleString()}] 投行助手响应完成，耗时 ${duration}ms`);

        res.json({
            success: true,
            content: result,
            agentId: agentId,
            agentName: agentName,
            duration: duration,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('投行助手错误:', error);

        res.status(500).json({
            error: error.message || '投行助手服务暂时不可用',
            code: 'IB_ASSISTANT_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 调用 Python 投行业务参与助手
 * 使用 --api 模式，通过临时文件通信（Windows 兼容）
 */
function callPythonAssistant(input) {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        const os = require('os');
        const crypto = require('crypto');

        // 判断用户意图
        const input_lower = input.toLowerCase();
        let request;

        if (anyKeyword(input_lower, ['发行条件', '准入标准', '发行条件和准入标准', '准入条件', '发行要求', '上市条件', '资质要求'])) {
            const bizName = extractBusinessName(input_lower);
            if (bizName) {
                request = { action: 'admission', business_name: bizName };
            } else {
                request = { action: 'admission', business_name: '定增' };
            }
        } else if (anyKeyword(input_lower, ['怎么做', '如何做', '指导', '步骤', '教学', '操作', '指引', '条件', '标准', '准入', '流程是什么'])) {
            const bizName = extractBusinessName(input_lower);
            if (bizName) {
                request = { action: 'teach', business_name: bizName };
            } else {
                request = {
                    action: 'recommend',
                    customer_info: extractCustomerInfoFromText(input)
                };
            }
        } else if (anyKeyword(input_lower, ['找谁', '联系', '对接人', '谁负责', '支持', '找准支持'])) {
            const bizName = extractBusinessName(input_lower);
            request = { action: 'contact', business_name: bizName || '定增' };
        } else if (anyKeyword(input_lower, ['设计', '方案', '帮我设计'])) {
            // 方案设计类请求：返回方案设计模板
            const bizName = extractBusinessName(input_lower);
            request = { action: 'design', business_name: bizName || '定增' };
        } else if (anyKeyword(input_lower, ['列表', '所有业务', '有哪些业务'])) {
            request = { action: 'list' };
        } else {
            // 默认：尝试先提取业务名走教学，否则推荐
            const bizName = extractBusinessName(input_lower);
            if (bizName) {
                request = { action: 'teach', business_name: bizName };
            } else {
                request = {
                    action: 'recommend',
                    customer_info: extractCustomerInfoFromText(input)
                };
            }
        }

        // admission 动作：直接返回发行条件与准入标准内容，无需调用 Python
        if (request.action === 'admission') {
            const bizName = request.business_name || '定增';
            resolve(generateAdmissionCriteria(bizName));
            return;
        }

        // design 动作：直接返回方案设计模板，无需调用 Python
        if (request.action === 'design') {
            const bizName = request.business_name || '定增';
            resolve(generateDesignTemplate(bizName));
            return;
        }

        // recommend 动作：直接返回本地推荐结果，无需调用 Python
        if (request.action === 'recommend') {
            resolve(generateRecommendResult(request.customer_info || {}, input));
            return;
        }

        // 创建临时输入文件（UTF-8编码）
        const tmpInputFile = path.join(os.tmpdir(), `ib_assistant_input_${crypto.randomBytes(4).toString('hex')}.json`);
        try {
            fs.writeFileSync(tmpInputFile, JSON.stringify(request, null, 2), 'utf-8');
        } catch (writeErr) {
            reject(new Error(`无法写入临时文件: ${writeErr.message}`));
            return;
        }

        // 启动 Python 进程，设置 PYTHONIOENCODING=utf-8 确保中文正常输出
        const python = spawn('python', ['-X', 'utf8', IB_ASSISTANT_SCRIPT, '--api', '-i', tmpInputFile], {
            cwd: IB_ASSISTANT_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            timeout: 30000
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString('utf-8');
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString('utf-8');
        });

        python.on('close', (code) => {
            // 清理临时文件
            try { fs.unlinkSync(tmpInputFile); } catch (e) {}

            if (code !== 0) {
                console.error(`Python 进程退出码: ${code}, stderr: ${stderr}`);
                reject(new Error(`投行助手处理失败 (退出码: ${code})`));
                return;
            }

            try {
                // 尝试解析 JSON 响应
                const result = JSON.parse(stdout.trim());
                if (result.success) {
                    if (result.response) {
                        // teach / recommend 返回文本
                        resolve(result.response);
                    } else if (result.data) {
                        // contact / list 返回结构化数据，格式化为可读文本
                        resolve(formatDataToMarkdown(result.action, result.data));
                    } else {
                        resolve('投行助手已收到您的请求，正在为您分析...');
                    }
                } else {
                    resolve(result.error || '未匹配到相关信息，请尝试更具体的描述。');
                }
            } catch (parseError) {
                // 如果不是 JSON，直接返回文本
                resolve(stdout.trim() || '投行助手已收到您的请求，正在为您分析...');
            }
        });

        python.on('error', (err) => {
            // 清理临时文件
            try { fs.unlinkSync(tmpInputFile); } catch (e) {}
            console.error('启动 Python 进程失败:', err);
            reject(new Error('无法启动投行助手服务，请确认 Python 环境已正确安装'));
        });
    });
}

// 辅助函数：将结构化数据格式化为 Markdown 文本（而非原始 JSON）
function formatDataToMarkdown(action, data) {
    if (action === 'contact') {
        // 支持人员查询结果 - 渲染为深色卡片风格
        const lines = [];
        lines.push(`## ${data.business} 支持人员信息`);
        lines.push('');
        lines.push(`**业务分类**：${data.category}`);
        lines.push('');
        lines.push(`**业务描述**：${data.description}`);
        lines.push('');
        lines.push('### 支持人员');
        if (data.support_person) {
            const p = data.support_person;
            lines.push(`- **姓名**：${p.name}`);
            if (p.employee_id) lines.push(`- **工号**：${p.employee_id}`);
            if (p.scope) lines.push(`- **职责范围**：${p.scope}`);
            if (p.email) lines.push(`- **邮箱**：${p.email}`);
        }
        lines.push('');
        lines.push(`>>> ${data.business}业务怎么做？`);
        lines.push(`>>> ${data.business}的发行条件和准入标准是什么？`);
        lines.push(`>>> 帮我设计一个${data.business}方案`);
        return lines.join('\n');
    }

    if (action === 'list') {
        // 业务列表
        const lines = [];
        lines.push('## 投行业务列表');
        lines.push('');
        let currentCategory = '';
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.category !== currentCategory) {
                    currentCategory = item.category;
                    lines.push(`### ${currentCategory}`);
                }
                lines.push(`- **${item.name}**：${item.description}（支持人员：${item.support_person}）`);
            });
        }
        return lines.join('\n');
    }

    // 其他未知 action，降级为格式化文本
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

/**
 * 生成发行条件与准入标准内容
 * 采用富文本风格，不使用 markdown 语法，符合方案生成助手内容展现规范
 */
function generateAdmissionCriteria(bizName) {
    const lines = [];

    lines.push(`## ${bizName}发行条件与准入标准`);
    lines.push('');
    lines.push('### 一、监管基本标准');
    lines.push('- 符合《上市公司证券发行注册管理办法》');
    lines.push('- 最近一年财报无保留/否定意见');
    lines.push('- 近三年无重大违法行为');
    lines.push('- 募集资金用途合规');
    lines.push('');
    lines.push('### 二、公司资质要求');
    lines.push('- 实控人持股30%-60%，质押≤50%');
    lines.push('- 近三年扣非净利润为正');
    lines.push('- 资产负债率行业合理水平');
    lines.push('- 细分领域有市场地位');
    lines.push('');
    lines.push('### 三、募集资金用途要求');
    lines.push('- 项目建设：符合产业政策');
    lines.push('- 补充流动资金：≤30%');
    lines.push('- 偿还债务：说明必要性');
    lines.push('- 禁止：财务性投资、限制类行业');
    lines.push('');
    lines.push('### 四、合规性要求');
    lines.push('- 近三年无重大违法违规');
    lines.push('- 无损害投资者权益情形');
    lines.push('- 无立案调查情形');
    lines.push('- 舆情风险可控');
    lines.push('');
    lines.push('> 💡 提示：以上标准为通用准入参考，具体项目需经投行部门尽职调查后确定可行性。');
    lines.push('');
    lines.push('---');
    lines.push(`📌 联系支持：张明（工号8012）`);
    lines.push('');
    lines.push(`>>> 帮我设计一个${bizName}方案`);
    lines.push(`>>> ${bizName}找谁支持？`);
    lines.push(`>>> ${bizName}业务怎么做？`);

    return lines.join('\n');
}

/**
 * 生成方案设计模板内容
 * 包含表格、文档下载卡片（Markdown链接格式）、可点击提示词
 */
function generateDesignTemplate(bizName) {
    const lines = [];

    lines.push(`# ${bizName}方案设计模板`);
    lines.push('');
    lines.push('## 一、发行基本要素');
    lines.push('| 要素 | 标准方案 | 说明 |');
    lines.push('|------|---------|------|');
    lines.push('| 发行方式 | 向特定对象非公开发行 | 对象≤35名 |');
    lines.push('| 发行价格 | 不低于前20日均价80% | 定价基准日为发行期首日 |');
    lines.push('| 发行规模 | 不超过总股本30% | 按需确定 |');
    lines.push('| 锁定期 | 6个月 | 自发行结束日起 |');
    lines.push('| 募集资金 | 按需确定 | 需明确用途 |');
    lines.push('');
    lines.push('## 二、发行时间安排（标准周期4-6个月）');
    lines.push('| 阶段 | 时间 | 主要工作 |');
    lines.push('|------|------|---------|');
    lines.push('| 方案论证 | 1-2周 | 定规模、用途、定价策略 |');
    lines.push('| 尽职调查 | 2-4周 | 财务、法律、业务尽调 |');
    lines.push('| 董事会审议 | T日 | 审议通过方案 |');
    lines.push('| 股东大会 | T+1月 | 股东大会批准 |');
    lines.push('| 申报审核 | 2-3月 | 交易所审核、证监会注册 |');
    lines.push('| 发行阶段 | 1月 | 路演、簿记建档、定价 |');
    lines.push('| **合计** | **4-6个月** | 自董事会决议至资金到账 |');
    lines.push('');
    lines.push('## 三、募集资金用途（典型结构）');
    lines.push('- 项目建设：70%，符合产业政策方向');
    lines.push('- 补充流动资金：≤30%，提升运营能力');
    lines.push('- 偶尔可包含偿还展期内带息债务（需说明必要性）');
    lines.push('');
    lines.push('## 四、认购对象类型');
    lines.push('| 类型 | 特点 | 适用情形 |');
    lines.push('|------|------|---------|');
    lines.push('| 控股股东/实控人 | 体现信心，锁定控制权 | 建议优先参与 |');
    lines.push('| 战略投资者 | 带来产业资源 | 有战略合作需求时 |');
    lines.push('| 机构投资者 | 公募、券商、保险等 | 主要资金来源 |');
    lines.push('| 员工持股计划 | 绑定核心团队 | 规模一般较小 |');
    lines.push('');
    lines.push('## 五、关键条款设计');
    lines.push('**1. 定价机制**：前20日均价×80%（底价），簿记建档市场化确定');
    lines.push('**2. 配售原则**：同股同价，优先满足控股股东，机构按报价排序');
    lines.push('**3. 调整机制**：派息送转需调整发行价，异常波动时价格稳定');
    lines.push('');
    lines.push('## 📄 可下载文档');
    lines.push('- **[定增方案设计手册（完整版）](/docs/定向增发方案设计手册.pdf)** - PDF，25页');
    lines.push('- **[定增方案Word模板](/templates/定增方案设计模板.docx)** - 可编辑');
    lines.push('- **[募集资金可研报告模板](/templates/募集资金可行性研究报告.docx)** - 框架示例');
    lines.push('');
    lines.push('> 💡 点击文档名称即可下载，或联系张明（工号8012）获取定制化方案支持');
    lines.push('');
    lines.push('> 👤 方案支持：张明（工号8012）| 邮箱：zhangm@company.com');
    lines.push('');
    lines.push('---');
    lines.push(`>>> ${bizName}的发行条件和准入标准是什么？`);
    lines.push(`>>> ${bizName}找谁支持？`);
    lines.push(`>>> 帮我核验这个${bizName}方案，看看有没有合规问题`);

    return lines.join('\n');
}

/**
 * 生成客户业务机会推荐结果
 * @param {object} info 提取的客户信息
 * @param {string} rawInput 原始输入文本
 */
function generateRecommendResult(info, rawInput) {
    const lines = [];
    const input_lower = (rawInput || '').toLowerCase();

    // 提取营收规模文字
    const revenueMatch = (rawInput || '').match(/(\d+(?:\.\d+)?)\s*(亿|万)/);
    const revenueStr = revenueMatch ? revenueMatch[0] : '';

    // 提取经营目的
    let purpose = '';
    if (input_lower.includes('扩产')) purpose = '扩产';
    else if (input_lower.includes('并购') || input_lower.includes('收购')) purpose = '并购';
    else if (input_lower.includes('补充流动')) purpose = '补充流动资金';
    else if (input_lower.includes('建设')) purpose = '项目建设';
    else purpose = '融资';

    const isListed = (info.nature === '上市公司') || input_lower.includes('上市公司');
    const industry = info.industry || '';

    lines.push('根据您提供的客户信息，我为您分析了以下投行业务机会：');
    lines.push('');
    lines.push('📊 业务推荐结果');
    lines.push('');
    lines.push('1. 定增（推荐度：95%）');
    lines.push('最匹配您客户的需求');
    lines.push('');
    lines.push(`适用情形：上市公司股权融资首选，募集资金可直接用于${purpose}项目建设`);
    lines.push('关键要素：');
    lines.push('实控人持股比例（建议30%-60%）');
    lines.push('融资用途需符合国家产业政策');
    lines.push('发行时机选择（市场平稳期）');
    lines.push('支持人员：张明（工号8012）— 方案设计、发行定价');
    lines.push('');
    lines.push('2. 可转债（推荐度：85%）');
    lines.push('兼顾股债优势');
    lines.push('');
    lines.push('适用情形：票面利率低于普通公司债，转股后可优化资本结构');
    lines.push('关键要素：');
    lines.push('主体信用评级（建议AA及以上）');
    lines.push('转股溢价率设定');
    lines.push('赎回/回售条款设计');
    lines.push('支持人员：王强（工号8034）— 条款设计、转股测算');
    lines.push('');
    lines.push('3. 公司债（推荐度：80%）');
    lines.push('快速融资通道');
    lines.push('');
    lines.push(`适用情形：发行周期短，资金用途灵活，可补充${purpose}配套流动资金`);
    lines.push('关键要素：');
    lines.push('主体评级（一般需AA及以上）');
    lines.push('偿债保障能力');
    lines.push('发行窗口选择');
    lines.push('支持人员：赵敏（工号8045）— 评级沟通、发行窗口');
    lines.push('');
    lines.push('💡 下一步建议');
    lines.push('推荐优先级：定增 > 可转债 > 公司债');
    lines.push('');
    lines.push('理由：');
    lines.push('');
    if (isListed) lines.push('客户为上市公司，定增是股权融资最直接的方式');
    if (purpose === '扩产') lines.push('扩产属于资本性支出，定增的募集资金用途匹配度最高');
    if (revenueStr) lines.push(`${revenueStr}营收规模表明公司具备较好的市场地位`);
    if (industry) lines.push(`${industry}行业内定增案例多，审核路径相对成熟`);
    lines.push('');
    lines.push('您可以继续问我：');
    lines.push('');
    lines.push('>>> 定增业务怎么做？— 获取详细的操作指引');
    lines.push('>>> 定增找谁支持？— 直接对接投行支持人员');
    lines.push('>>> 定增需要准备什么材料？— 查看客户材料清单');

    return lines.join('\n');
}

// 辅助函数：检查文本是否包含任意关键词
function anyKeyword(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}

// 辅助函数：从文本中提取业务名称
function extractBusinessName(text) {
    const keywordMap = {
        '定增': '定增', '定向增发': '定增',
        'ipo': 'IPO', '上市': 'IPO',
        '可转债': '可转债', '转债': '可转债',
        '公司债': '公司债',
        '银行间': '银行间债务工具', '债务融资': '银行间债务工具',
        '中票': '银行间债务工具', '短融': '银行间债务工具',
        'abs': 'ABS', '资产支持': 'ABS',
        '收购资产': '上市公司收购资产', '并购资产': '上市公司收购资产',
        '重大资产重组': '上市公司收购资产',
        '收购上市公司': '收购上市公司', '借壳': '收购上市公司', '买壳': '收购上市公司',
        '重整': '破产重整', '破产': '破产重整', '债务重组': '破产重整',
        '买方分析': '买方分析', '投资者分析': '买方分析',
        '信披': '信披判断', '信息披露': '信披判断',
        '公告': '临时公告生成', '临时公告': '临时公告生成',
    };
    for (const [kw, biz] of Object.entries(keywordMap)) {
        if (text.includes(kw)) return biz;
    }
    return null;
}

// 辅助函数：从文本中提取客户信息
function extractCustomerInfoFromText(text) {
    const info = {};
    if (text.includes('上市公司')) info.nature = '上市公司';
    else if (text.includes('非上市') || text.includes('未上市')) info.nature = '非上市公司';
    else if (text.includes('国企') || text.includes('国有')) info.nature = '国有企业';
    else if (text.includes('民营') || text.includes('民企')) info.nature = '民营企业';

    const industries = ['制造业', '科技', '金融', '房地产', '医药', '能源', '消费'];
    for (const ind of industries) {
        if (text.includes(ind)) { info.industry = ind; break; }
    }

    const stages = ['初创', '成长', '成熟', '转型', '困境'];
    for (const stage of stages) {
        if (text.includes(stage)) { info.stage = stage; break; }
    }

    const revenueMatch = text.match(/(\d+(?:\.\d+)?)\s*(亿|万)/);
    if (revenueMatch) info.revenue = revenueMatch[0];

    if (anyKeyword(text, ['融资', '资金', '借钱', '贷款'])) info.funding_need = '有';

    const purposes = ['扩产', '建设', '并购', '收购', '偿还债务', '补充流动', '研发'];
    for (const p of purposes) {
        if (text.includes(p)) { info.funding_purpose = p; break; }
    }

    if (anyKeyword(text, ['并购', '收购', '整合'])) info.special_needs = '并购意向';
    else if (anyKeyword(text, ['重整', '困境', '亏损'])) info.special_needs = '重整需求';

    return info;
}

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('未处理的错误:', err);
    res.status(500).json({
        error: '服务器内部错误',
        code: 'INTERNAL_ERROR'
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🤖 AI参谋分析代理服务器已启动');
    console.log('='.repeat(60));
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🌐 工作台页面: http://localhost:${PORT}/index.html`);
    console.log(`🔗 代理接口: http://localhost:${PORT}/api/ai/analyze`);
    console.log(`💻 健康检查: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));
    console.log('📋 使用方法:');
    console.log('   1. 保持此窗口运行');
    console.log('   2. 刷新前端页面');
    console.log('   3. 点击参谋卡片即可使用真实AI分析');
    console.log('='.repeat(60));
});