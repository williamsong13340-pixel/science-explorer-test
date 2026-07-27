// api/verify.js
// Vercel Serverless Function - 科学特质图谱测试（最新调整版）
// 专属 Redis 命名空间隔离 + HMAC-SHA256 签名 + 30天/3次额度 + Fail-Safe 容错

import crypto from 'crypto';

const options5 = [
    { text: "几乎从不这样", score: 1 },
    { text: "很少这样", score: 2 },
    { text: "有时这样", score: 3 },
    { text: "经常这样", score: 4 },
    { text: "几乎总是这样", score: 5 }
];

// 40道完整题库 (包含最新调整的12、14、22、28、30、38、39题)
const rawQuestions = [
    { id: 1, dim: 'CQ', isReverse: false, q: "看到家里某样东西突然不能正常使用时，我常会想知道它到底哪里出了问题。", options: options5 },
    { id: 2, dim: 'EV', isReverse: false, q: "网上看到一个让人惊讶的消息时，我通常会先看看消息是从哪里来的。", options: options5 },
    { id: 3, dim: 'AN', isReverse: false, q: "同时有很多事情要做时，我会先理清顺序，再一件件处理。", options: options5 },
    { id: 4, dim: 'EX', isReverse: false, q: "不确定一个新办法适不适合自己时，我通常会先试一小段时间。", options: options5 },
    { id: 5, dim: 'SY', isReverse: false, q: "临时改变原来的安排时，我会想到这会不会影响后面的事情。", options: options5 },
    { id: 6, dim: 'PR', isReverse: false, q: "发送重要消息、付款或提交资料前，我通常会再检查一次。", options: options5 },
    { id: 7, dim: 'IM', isReverse: false, q: "遇到难懂的事情时，我会拿自己熟悉的东西来作比较。", options: options5 },
    { id: 8, dim: 'CO', isReverse: false, q: "别人没有听懂我的意思时，我会换一种更简单的说法。", options: options5 },
    { id: 9, dim: 'CQ', isReverse: true,  q: "别人告诉我“大家一直都是这样做的”时，我通常就不会再问原因。", options: options5 },
    { id: 10, dim: 'EV', isReverse: false, q: "即使一个消息正好符合我的看法，我也会看看有没有人提出不同的依据。", options: options5 },
    { id: 11, dim: 'AN', isReverse: false, q: "房间、桌面或手机里的东西很乱时，我会把它们分成几类整理。", options: options5 },
    { id: 12, dim: 'EX', isReverse: false, q: "想比较两个办法哪个更省时间时，我会在其他条件差不多的情况下分别试一试。", options: options5 },
    { id: 13, dim: 'SY', isReverse: true,  q: "几个人一起做的事情出了问题时，我通常很快就会认定是其中某一个人的责任。", options: options5 },
    { id: 14, dim: 'PR', isReverse: false, q: "收拾行李时，即使已经装好了，我也会按清单再核对一遍有没有遗漏。", options: options5 },
    { id: 15, dim: 'IM', isReverse: false, q: "看到一件普通物品时，我有时会想到它还可以有别的用途。", options: options5 },
    { id: 16, dim: 'CO', isReverse: false, q: "别人指出我的想法可能有问题时，我愿意听听对方为什么这样说。", options: options5 },
    { id: 17, dim: 'CQ', isReverse: false, q: "看到以前没见过的东西时，我常会在之后查一查它是什么。", options: options5 },
    { id: 18, dim: 'EV', isReverse: true,  q: "一个说法只要听起来很顺，我通常就不会再追问它有什么依据。", options: options5 },
    { id: 19, dim: 'AN', isReverse: true,  q: "遇到一件麻烦事时，我通常先凭感觉处理，不太会把它分成几步。", options: options5 },
    { id: 20, dim: 'EX', isReverse: true,  q: "在没有把每个细节都想清楚之前，我通常不会开始尝试新的做法。", options: options5 },
    { id: 21, dim: 'SY', isReverse: false, q: "改变一个生活习惯时，我会想到它可能还会影响睡眠、心情或其他安排。", options: options5 },
    { id: 22, dim: 'PR', isReverse: true,  q: "付款金额看起来差不多时，我通常不会再核对商品数量或优惠有没有算对。", options: options5 },
    { id: 23, dim: 'IM', isReverse: true,  q: "即使原来的办法经常不太顺利，我也不太愿意换一种做法。", options: options5 },
    { id: 24, dim: 'CO', isReverse: true,  q: "和别人讨论问题时，我常觉得他们只会把事情弄得更乱。", options: options5 },
    { id: 25, dim: 'CQ', isReverse: false, q: "跟着教程做一件事却没有成功时，我会回头找自己是从哪一步开始没弄明白的。", options: options5 },
    { id: 26, dim: 'EV', isReverse: false, q: "后来发现自己记错或理解错时，我愿意直接改口。", options: options5 },
    { id: 27, dim: 'AN', isReverse: false, q: "事情没有按计划进行时，我会想想究竟是时间、方法、信息还是沟通出了问题。", options: options5 },
    { id: 28, dim: 'EX', isReverse: false, q: "想改善一个生活习惯时，我通常会先只改变一个地方，看看有没有效果。", options: options5 },
    { id: 29, dim: 'SY', isReverse: false, q: "为了省下一笔钱时，我会考虑这样做会不会在别的地方增加花费。", options: options5 },
    { id: 30, dim: 'PR', isReverse: false, q: "同一个生活小麻烦反复出现时，即使前几个办法没有用，我也会继续尝试其他办法。", options: options5 },
    { id: 31, dim: 'IM', isReverse: false, q: "一件东西突然找不到时，我通常会先想到几种可能，而不是马上认定它丢了。", options: options5 },
    { id: 32, dim: 'CO', isReverse: false, q: "和别人一起完成一件事时，我会说明哪些想法或工作是对方完成的。", options: options5 },
    { id: 33, dim: 'CQ', isReverse: true,  q: "只要一件事眼下和我没有关系，我通常就不想再了解。", options: options5 },
    { id: 34, dim: 'EV', isReverse: false, q: "向别人讲述一件事情时，我会分清哪些是自己亲眼看到的，哪些只是自己的猜测。", options: options5 },
    { id: 35, dim: 'AN', isReverse: false, q: "听别人说明一件比较复杂的事情时，我常能注意到其中前后对不上的地方。", options: options5 },
    { id: 36, dim: 'EX', isReverse: false, q: "做菜、修东西或处理家务没有做好时，我下一次通常会先改动最可能出问题的那一步。", options: options5 },
    { id: 37, dim: 'SY', isReverse: false, q: "做一个决定时，我会想它过几天和过几个月后可能带来什么不同。", options: options5 },
    { id: 38, dim: 'PR', isReverse: false, q: "偶然找到一个很好用的做法时，我会把关键步骤记下来，方便以后照着做。", options: options5 },
    { id: 39, dim: 'IM', isReverse: false, q: "遇到一个新问题时，我常会想想，别的事情里有没有可以借用的办法。", options: options5 },
    { id: 40, dim: 'CO', isReverse: false, q: "我解释一件事后，如果对方理解错了，我会根据对方的反应调整自己的说法。", options: options5 }
];

const SECRET_KEY = process.env.SECRET_KEY || 'LoveTest_Default_HMAC_Secret_2026#Key!';
const MAX_USAGE = 3; // 每个验证码最多测试 3 次
const VALID_DURATION_DAYS = 30; // 首次激活后有效天数
const VALID_DURATION_MS = VALID_DURATION_DAYS * 24 * 60 * 60 * 1000;

export function calculateChecksum(baseStr, secretKey = SECRET_KEY) {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(baseStr);
    const hexHash = hmac.digest('hex');
    
    const num = parseInt(hexHash.substring(0, 8), 16);
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const mod = num % (36 * 36 * 36);
    
    const c1 = chars[Math.floor(mod / (36 * 36))];
    const c2 = chars[Math.floor((mod % (36 * 36)) / 36)];
    const c3 = chars[mod % 36];
    
    return c1 + c2 + c3;
}

// 首次激活 + 次数核销逻辑（专属 Redis 命名空间隔离：code:activation:science:${cleanCode}）
async function checkActivationAndUsage(cleanCode) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    // 未配置 Redis 时启动 Fail-Safe 容错保护（自动放行）
    if (!redisUrl || !redisToken) {
        return { status: 'OK', currentUsage: 1, isFallback: true };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
        const key = `code:activation:science:${cleanCode}`;
        
        const getRes = await fetch(`${redisUrl}/get/${key}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
            signal: controller.signal
        });
        const getData = await getRes.json();
        
        const now = Date.now();
        let record = null;

        if (getData && getData.result) {
            try { record = JSON.parse(getData.result); } catch (e) {}
        }

        if (!record) {
            record = {
                usageCount: 1,
                firstActivatedAt: now
            };
            
            await fetch(`${redisUrl}/set/${key}/${encodeURIComponent(JSON.stringify(record))}/EX/2592000`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return { status: 'OK', currentUsage: 1, isFirstActivation: true, isFallback: false };
        } else {
            const elapsedMs = now - record.firstActivatedAt;
            if (elapsedMs > VALID_DURATION_MS) {
                clearTimeout(timeoutId);
                return { status: 'EXPIRED', isFallback: false };
            }

            if (record.usageCount >= MAX_USAGE) {
                clearTimeout(timeoutId);
                return { status: 'LIMIT_EXCEEDED', isFallback: false };
            }

            record.usageCount += 1;
            const remainingTtlSeconds = Math.max(1, Math.floor((VALID_DURATION_MS - elapsedMs) / 1000));
            
            await fetch(`${redisUrl}/set/${key}/${encodeURIComponent(JSON.stringify(record))}/EX/${remainingTtlSeconds}`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return { status: 'OK', currentUsage: record.usageCount, isFirstActivation: false, isFallback: false };
        }
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn("⚠️ Upstash Redis 触发容错保护 (Fail-Safe 降级放行):", err.message);
        return { status: 'OK', currentUsage: 1, isFallback: true };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '不允许的请求方法' });
    }

    if (!req.body || typeof req.body.code === 'undefined') {
        return res.status(400).json({ success: false, message: '请求参数缺失！' });
    }

    const { code } = req.body;
    
    if (!code) {
        return res.status(401).json({ success: false, message: '请输入测试码！' });
    }

    const cleanCode = String(code).trim().toUpperCase();

    if (!cleanCode.startsWith('CCK-') || cleanCode.length !== 16) {
        return res.status(401).json({ success: false, message: '❌ 测试码格式不正确，请输入形如 CCK-XXXX-XXXXXXX 的 16 位专属码。' });
    }

    const bodyStr = cleanCode.replace('CCK-', '').replace(/-/g, ''); 
    const timeStr = bodyStr.substring(0, 4);
    const randStr = bodyStr.substring(4, 8);
    const providedChecksum = bodyStr.substring(8, 11);

    const baseStr = timeStr + randStr;
    const expectedChecksum = calculateChecksum(baseStr, SECRET_KEY);

    if (providedChecksum !== expectedChecksum) {
        return res.status(401).json({ success: false, message: '❌ 无效的测试码（防伪签名校验失败，请核对是否输错）。' });
    }

    // Debug 专属测试码豁免 3 次额度限制
    if (cleanCode === 'CCK-2026-1234BRV' || cleanCode.startsWith('CCK-DEBUG')) {
        return res.status(200).json({
            success: true,
            message: '⚡ Debug 专属测试码验证成功 (无限次测试)',
            questions: rawQuestions
        });
    }

    const activationResult = await checkActivationAndUsage(cleanCode);

    if (activationResult.status === 'EXPIRED') {
        return res.status(401).json({
            success: false,
            message: `⚠️ 该测试码自首次激活之日起已超过 30 天，已自然失效。`
        });
    }

    if (activationResult.status === 'LIMIT_EXCEEDED') {
        return res.status(401).json({
            success: false,
            message: `❌ 该测试码的 3 次测试额度已全部用尽，无法再次开启测试。`
        });
    }

    const remaining = MAX_USAGE - activationResult.currentUsage;
    let usageMsg = `验证成功！`;
    if (activationResult.isFallback) {
        usageMsg += ` 测试码已成功激活（自今日起 30 天内有效），还可测试 2 次。`;
    } else {
        if (activationResult.isFirstActivation) {
            usageMsg += ` 测试码已成功激活（自今日起 30 天内有效），还可测试 ${remaining} 次。`;
        } else {
            usageMsg += remaining > 0 ? ` 该测试码还可使用 ${remaining} 次。` : ` 这是该测试码最后 1 次测试额度。`;
        }
    }

    res.status(200).json({ 
        success: true, 
        message: usageMsg, 
        questions: rawQuestions 
    });
}
