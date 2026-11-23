// Language switch: Chinese by default, English on demand.
// Loaded as a plain (blocking) script in <head>, like theme.js, so the saved language
// applies before the first paint. Static HTML carries data-i18n keys; scripts call
// PWI18N.t(key, englishFallback, vars). Dynamic sections listen for the "pw:lang" event.
(function () {
  var KEY = 'pw-lang';
  var root = document.documentElement;

  // Chinese translations. English is the source language: static nodes keep their
  // original text (captured on first apply) and scripts pass their English string as
  // the fallback, so this table only needs the Chinese.
  var ZH = {
    /* meta */
    'meta.title': 'PortWatch VI：GTA VI 现在能在 PC 上跑了吗？',
    'meta.desc': '实时追踪所有试图把泄露的 Xbox Series 版 GTA VI 重编译、模拟或移植到 PC 的社区项目，从基础工作到稳定 30 帧逐级评分。',

    /* nav */
    'skip': '跳到排行榜',
    'nav.sections': '站点导航',
    'nav.home': 'PortWatch VI 首页',
    'nav.race': '赛道',
    'nav.news': '新闻',
    'nav.board': '讨论板',
    'nav.watchlist': '观察名单',
    'nav.toolkit': '工具集',
    'nav.scoring': '评分',
    'nav.fake': '虚假下载',
    'nav.loading': '加载中…',
    'nav.updated': '更新于 {ago}',

    'ago.now': '刚刚',
    'ago.minutes': '{n} 分钟前',
    'ago.hours': '{n} 小时前',
    'ago.days': '{n} 天前',

    /* hero */
    'hero.live': '实时追踪',
    'hero.watchingTitle': '最近 5 分钟活跃',
    'hero.watching': '{n} 人正在看',
    'hero.star': '在 GitHub 上加星',
    'hero.h1': 'GTA VI 现在能在 PC 上跑了吗？',
    'hero.lede': '所有认真尝试把泄露的 Xbox Series 版本重编译、模拟或移植到 PC 的项目，统一用同一把标尺评分——从基础工作到稳定 30 FPS。',
    'answer.groundwork': '还不能。',
    'answer.loads': '还不能。',
    'answer.boots': '还不能。',
    'answer.menu': '还不能。',
    'answer.ingame': '勉强算。',
    'answer.fps30': '基本可以。',
    'answer.stable': '可以。',

    /* countdown */
    'cd.title': '可执行文件发布倒计时',
    'cd.titleBy': '{by} 的可执行文件发布',
    'cd.released': '可执行文件已发布',
    'cd.noDate': '尚未公布发布日期。',
    'cd.outSince': '已于 {d}，{t} 发布',
    'cd.expected': '预计 {w}',
    'cd.exactUnknown': '{d} · 未公布具体时间，按 UTC 00:00 倒计时',
    'cd.source': '来源',
    'cd.statusReleased': '距发布已过去的时间。各项目现在可以尝试启动真正的游戏了。',
    'cd.statusWaiting': '距离缺失的可执行文件到期还有多久。在那之前，没人能启动 GTA VI。',
    'cd.statusDue': '已到期，正在等待它出现（且可读取）。',
    'cd.statusOverdue': '已逾期 {d} 天 {h} 小时，仍未发布。',
    'cd.days': '天',
    'cd.hours': '时',
    'cd.min': '分',
    'cd.sec': '秒',

    /* overall */
    'ov.kicker': '总体进度 · 最接近可玩的项目',
    'ov.furthest': '最远里程碑',
    'ov.top3': '前三名平均',
    'ov.boot': '启动 GTA VI',
    'ov.count': '追踪项目数',
    'ov.leader': '领先：<a href="#effort-{id}">{name}</a>（{owner}）。{state}',
    'ov.leaderGroundwork': '仍处于基础工作阶段，还没有任何项目跑起 GTA VI。',
    'ov.leaderReached': '已达到「{label}」。',
    'ov.none': '暂无追踪项目。',
    'ov.history': '领先者得分（逐日）',
    'ov.historyAria': '领先者得分历史',

    /* changes / race */
    'changes.title': '近期变化',
    'race.kicker': '排行榜',
    'race.title': '赛道',
    'race.sub': '有真实代码支撑的项目，按距离跑起游戏的远近排序。分数来自各项目公开的 README、提交和 issue。自称的进展会标注出来。',
    'race.filterAria': '筛选项目',
    'race.all': '全部',
    'race.gta': 'GTA VI 专用',
    'race.generic': '通用游戏层',
    'race.sort': '排序',
    'race.sortScore': '进度',
    'race.sortStars': '星标',
    'race.sortActive': '最近活跃',
    'race.empty': '没有符合此筛选的项目。',

    /* effort card */
    'e.gwBreakdown': '基础工作明细',
    'e.gwPct': '基础工作 {n}%',
    'e.provenOn': '已验证运行：{x}',
    'e.whatWorks': '已实现',
    'e.whatBlocking': '阻碍',
    'e.stars': '星标',
    'e.forks': 'Fork',
    'e.issues': '未关闭 issue',
    'e.commitsTitle': '最近 7 天的提交',
    'e.commits': '{n} 次提交 / 7 天',
    'e.pushedTitle': '最近推送',
    'e.pushed': '推送于 {ago}',
    'e.assessedTitle': '上次复核评分时间',
    'e.assessedClaude': '由 Claude 评估',
    'e.reviewed': '已复核',
    'e.discuss': '讨论',
    'e.details': '详情',
    'e.hideDetails': '收起',
    'e.reproduced': '已独立复现',
    'e.selfReported': '自述',
    'e.selfTitle': '依据项目自己的 README，尚未被他人复现',
    'e.runs': '可运行：{x}',
    'e.runsTitle': '可运行另一款游戏',
    'e.quiet': '已 {n} 天无动静',
    'e.repoGone': '仓库已消失（404）',
    'e.dmca': 'DMCA 通知 {date}',
    'e.dmcaTitle': '出现在 GitHub 公开日志的 DMCA 通知中',
    'e.claimPre': 'README 中未经证实的声明：',
    'e.claimMid': '，可能意味着「',
    'e.claimEnd': '」。等待复核。',
    'e.progressAria': '{name} 进度 {p}%',
    'e.branch': ' · 分支 {b}',
    'e.30fps': '30 FPS',
    'ui.loadError': '无法加载追踪数据：',

    /* watchlist */
    'watch.kicker': '早期或停滞',
    'watch.title': '观察名单',
    'watch.sub': '真实但尚处早期的项目：脚手架、研究性探索或另辟蹊径。当它们交出可衡量的成果后，会升入赛道。',
    'watch.project': '项目',
    'watch.approach': '路线',
    'watch.progress': '进度',
    'watch.stars': '星标',
    'watch.lastPush': '最近推送',

    /* toolkit */
    'tool.kicker': '资源侧',
    'tool.title': '工具集',
    'tool.sub': '这些项目不能直接让游戏跑起来，但每个移植都离不开它们：归档浏览器、纹理编解码器和格式笔记。',
    'tool.pushed': '推送于 {ago}',

    /* inbox */
    'inbox.kicker': '侦察器发现',
    'inbox.title': '新候选',
    'inbox.sub': '侦察器每 3 小时搜索 GitHub、GitLab、Hacker News、Bluesky、Mastodon、Lemmy 和 4chan（/v/、/vg/）上的新项目。有真实代码的仓库会列在这里，直到被复核。它们故意不提供链接，已追踪项目的副本会被过滤掉。',
    'inbox.empty': '暂无待复核项目。',
    'inbox.emptyScout': '侦察器上次运行于 {ago}。',
    'inbox.unreviewed': '未复核 · 不提供链接',
    'inbox.noDesc': '无描述',
    'inbox.foundVia': '发现于 {x} · {ago} · ★ {stars}',
    'inbox.substance': '实质分',
    'scout.lastRun': '侦察器上次运行 {ago}',
    'scout.summary': '刷新 {a} 个 · README 更新 {b} 个 · 新候选 {c} 个 · 标记 {d} 个',
    'scout.every3h': '侦察器每 3 小时运行一次。',

    /* news */
    'news.kicker': '正在发生',
    'news.title': '新闻',
    'news.sub': '围绕泄露事件的重要动态：下架、确认泄露、法律新闻与骗局。我们用简短摘要概括，并附上原始报道链接。',
    'news.all': '全部新闻',
    'news.cat.leak': '泄露',
    'news.cat.legal': '法律',
    'news.cat.port': '移植',
    'news.cat.safety': '安全',
    'news.cat.security': '防骗',
    'news.cat.takedown': '下架',
    'news.image': '图片：{credit}',
    'news.imagePre': '图片：',
    'news.imageEnd': '。',
    'news.independently': '',
    'news.headlines': '最新头条',
    'news.headlinesSub': '· 每 3 小时自动从新闻源汇总',
    'news.sources': '来源',
    'news.byClaude': '由 Claude 根据所链接的来源自动撰写。',
    'news.bySite': '由 PortWatch 根据所链接的来源撰写。',
    'news.linkArticle': '本文链接',
    'news.close': '关闭文章',
    'news.more': '更多新闻',
    'news.liveTracker': '实时追踪',
    'news.rss': 'RSS 订阅',
    'news.empty': '暂无报道。',
    'news.archiveTitle': 'GTA VI 登陆 PC：新闻汇总',
    'news.archiveSub': '围绕泄露事件的重要动向：下架、确认泄露、法律新闻与骗局。我们用简短摘要概括，并附上原始报道链接。',

    /* safety / method */
    'safety.title': '这里没有下载',
    'safety.body': '本页没有任何项目托管游戏、密钥或可执行文件，本站也从不链接到此类内容。任何声称本周就能在 PC 上玩到 GTA VI 的，都是骗局。',
    'flags.seen': '出现 {n} 次',
    'method.kicker': '方法说明',
    'method.title': '进度条是怎么算的',
    'method.sub': '所有项目共用一把标尺。基础工作占前 25%：这些部分可以在可执行文件存在之前完成。之后，项目只能通过在 GTA VI 中达到真实里程碑来前进。',
    'method.gwTitle': '基础工作的权重',
    'method.fine1': '达到「游戏中」之后，最后 30 分由帧率（平均 FPS ÷ 30）和稳定性（从频繁崩溃到稳定）分摊。部分达成的里程碑（例如菜单能渲染但已损坏）按一半计算。',
    'method.fine2': '你在维护某个项目并认为评分有误？请附上证据链接开一个 issue。',
    'method.pts': '{n} 分',

    /* footer */
    'footer.disclaimer': '粉丝自制的追踪站，与 Rockstar Games、Take-Two 或 Microsoft 无隶属关系，也未获其认可。Grand Theft Auto 及相关商标归其各自所有者所有。本站不托管也不链接任何游戏文件、密钥或可执行文件。',
    'footer.data': '数据：',
    'footer.seeTracker': 'GTA VI 现在能在 PC 上跑了吗？去看实时追踪。',
    'footer.rss': '新闻 RSS 订阅',
    'footer.dataAfter': '，由侦察器每 3 小时刷新一次。',

    /* milestones, groundwork, stability */
    'ms.groundwork': '基础工作',
    'ms.loads': '可执行文件运行',
    'ms.boots': '首帧',
    'ms.menu': '主菜单',
    'ms.ingame': '游戏中',
    'ms.fps30': '30 FPS',
    'ms.stable': '稳定',
    'msd.groundwork': '在可执行文件出现之前搭建的加载器、系统库、着色器转换和图形层。',
    'msd.loads': 'GTA VI 的可执行文件被映射，导入表解析完成，其自身代码开始运行。',
    'msd.boots': '游戏绘制出第一批真实画面：logo、加载界面或片头。',
    'msd.menu': '进入标题界面 / 主菜单，并能响应输入。',
    'msd.ingame': '剧情模式加载完成，可以在世界中移动。',
    'msd.fps30': '在有报告的 PC 上，游戏内性能平均达到 30 FPS。',
    'msd.stable': '可长时间游玩而不崩溃。',
    'gw.loader': '加载器与系统库',
    'gw.shaders': '着色器转换',
    'gw.graphics': '图形层',
    'gw.proven': '已在其他游戏上验证',
    'gwd.loader': 'PE 加载，以及为主机专用 DLL（kernelx、xgameruntime、xmem…）提供的替代实现。',
    'gwd.shaders': 'GTA VI 约 26,500 个预编译 RDNA2 着色器中，已转换为 PC 格式（SPIR-V / DXIL）的比例。',
    'gwd.graphics': 'Xbox D3D12.X → PC D3D12 / Vulkan：设备、命令列表、管线、绘制、呈现。',
    'gwd.proven': '同一层已能运行另一款零售 Xbox Series 游戏（菜单、游戏内…）。',
    'st.unknown': '未知',
    'st.constant': '频繁崩溃',
    'st.often': '经常崩溃',
    'st.sometimes': '偶尔崩溃',
    'st.rarely': '很少崩溃',
    'st.stable': '稳定',

    /* theme */
    'theme.aria': '主题：{label}',
    'theme.system': '跟随系统',
    'theme.light': '浅色',
    'theme.dark': '深色',

    /* language switch */
    'lang.switch': '切换到英文',
    'lang.switchToZh': '切换到中文',
    'lang.label': '语言',

    /* board page */
    'board.kicker': '匿名讨论',
    'board.title': '讨论板',
    'board.pageTitle': '讨论板 · PortWatch VI',
    'board.genName': '综合讨论',
    'board.genDesc': '关于 GTA VI 登陆 PC 的任何话题',
    'board.newsName': '新闻与爆料',
    'board.newsDesc': '下架通知、可执行文件、已确认的消息',
    'board.sub': '聊聊各个项目，分享你的测试结果，或者提问。无需注册。',
    'board.rules': '版规',
    'board.rule1b': '禁止下载链接。',
    'board.rule1': '含链接的帖子需要审核后才会显示。',
    'board.rule2': '严禁发布游戏文件、密钥或「可用的 exe」。这些都是骗局。',
    'board.rule3': '不要分享自己或他人的个人信息。',
    'board.rule4': '欢迎提供关于真实进展的线索。我们更新追踪数据时会查看讨论板。',
    'board.loading': '加载中…',
    'board.allBoards': '全部板块',
    'board.discussion': '讨论',
    'board.projects': '项目',
    'board.threads': '{n} 个主题',
    'board.threadsOne': '{n} 个主题',
    'board.active': '最后活跃 {ago}',
    'board.noThreads': '暂无主题',
    'board.noThreadsStart': '暂无主题。来发第一个吧。',
    'board.latest': '最新动态',
    'board.replies': '{n} 条回复',
    'board.seeInRace': '在赛道中查看',
    'board.loadError': '无法加载主题：{msg}',
    'board.threadGone': '该主题不存在或已被删除。',
    'board.backToBoards': '返回板块列表',
    'board.cantReach': '暂时无法访问讨论板。',
    'board.launching': '讨论板即将上线。',
    'board.startThread': '发起新主题',
    'board.reply': '回复',
    'board.namePlaceholder': '昵称（可选，默认显示为匿名）',
    'board.titlePlaceholder': '主题标题',
    'board.bodyThread': '你想聊些什么？',
    'board.bodyReply': '写下回复',
    'board.plainNote': '纯文本。含链接的帖子需要审核。',
    'board.linkNote': '内容包含链接，将在审核通过后显示。',
    'board.postThread': '发布主题',
    'board.postReply': '发布回复',
    'board.posting': '发布中…',
    'board.titleRequired': '请给主题起个标题（至少 3 个字符）。',
    'board.bodyRequired': '请先写点内容。',
    'board.thanksReview': '谢谢。你的帖子包含链接，审核通过后才会显示。',
    'board.like': '赞',
    'board.likeFailed': '保存点赞失败，请重试。',
    'board.somethingWrong': '出了点问题，请重试。',
    'board.navAria': '板块',
    'board.footer': '粉丝自制的追踪站，与 Rockstar Games、Take-Two 或 Microsoft 无隶属关系，也未获其认可。帖子均为匿名，仅代表作者本人观点。页面浏览量以匿名方式统计，不使用 cookie，也不存储 IP 地址。',
    'board.backToTracker': '返回追踪站',
  };

  // ?lang=en / ?lang=zh overrides the saved choice, so a shared link opens in that language.
  function urlLang() {
    try {
      var m = /[?&]lang=(en|zh)\b/.exec(location.search);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  function savedLang() {
    var forced = urlLang();
    if (forced) return forced;
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'zh'; } catch (e) { return 'zh'; }
  }
  var current = savedLang();

  function interpolate(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] != null ? String(vars[k]) : m;
    });
  }

  // t(key, englishFallback, vars)
  function t(key, fallback, vars) {
    var s = current === 'zh' ? ZH[key] : null;
    if (s == null) s = (fallback != null ? fallback : key);
    return interpolate(s, vars);
  }

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (el.dataset.i18nSrc == null) el.dataset.i18nSrc = el.textContent;
      el.textContent = t(key, el.dataset.i18nSrc);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length !== 2) return;
        var attr = bits[0].trim(), key = bits[1].trim();
        var store = 'i18nSrc' + attr.replace(/[^a-z0-9]/gi, '');
        if (el.dataset[store] == null) el.dataset[store] = el.getAttribute(attr) || '';
        el.setAttribute(attr, t(key, el.dataset[store]));
      });
    });
  }

  // Dates in generated pages are printed in English at build time; re-format them here.
  function localizeDates() {
    var loc = current === 'zh' ? 'zh-CN' : 'en-GB';
    document.querySelectorAll('time[datetime][data-datefmt]').forEach(function (el) {
      var raw = el.getAttribute('datetime') || '';
      var d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + 'T12:00:00Z' : raw);
      if (Number.isNaN(d.getTime())) return;
      var long = el.getAttribute('data-datefmt') === 'long';
      el.textContent = d.toLocaleDateString(loc, long
        ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
        : { day: 'numeric', month: 'short', timeZone: 'UTC' });
    });
  }

  function setLang(lang) {
    current = lang === 'en' ? 'en' : 'zh';
    try { localStorage.setItem(KEY, current); } catch (e) {}
    root.setAttribute('lang', current === 'zh' ? 'zh-CN' : 'en');
    applyStatic();
    localizeDates();
    document.dispatchEvent(new CustomEvent('pw:lang', { detail: { lang: current } }));
  }

  // The button names the language it switches to, the way most site switchers do.
  function label() { return current === 'zh' ? 'EN' : '中文'; }

  function mount() {
    var nav = document.querySelector('.nav-inner');
    if (!nav || nav.querySelector('.lang-pick')) return;
    var wrap = document.createElement('div');
    wrap.className = 'lang-pick';
    wrap.innerHTML = '<button type="button" class="lang-btn" aria-haspopup="false"></button>';
    var btn = wrap.querySelector('.lang-btn');
    function render() {
      btn.textContent = label();
      var title = current === 'zh' ? t('lang.switch', 'Switch to English') : 'Switch to Chinese';
      btn.setAttribute('aria-label', title);
      btn.title = title;
    }
    btn.addEventListener('click', function () { setLang(current === 'zh' ? 'en' : 'zh'); render(); });
    var theme = nav.querySelector('.theme-pick');
    if (theme && theme.parentNode === nav) theme.insertAdjacentElement('afterend', wrap);
    else nav.appendChild(wrap);
    document.addEventListener('pw:lang', render);
    render();
  }

  window.PWI18N = {
    t: t,
    lang: function () { return current; },
    setLang: setLang,
    apply: applyStatic,
    mount: mount,
    milestone: function (key, fallback) { return t('ms.' + key, fallback || key); },
    milestoneDesc: function (key, fallback) { return t('msd.' + key, fallback); },
    groundwork: function (key, fallback) { return t('gw.' + key, fallback || key); },
    groundworkDesc: function (key, fallback) { return t('gwd.' + key, fallback); },
    stability: function (key, fallback) { return t('st.' + key, fallback || key); },
  };

  root.setAttribute('lang', current === 'zh' ? 'zh-CN' : 'en');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyStatic(); localizeDates(); mount(); });
  } else { applyStatic(); localizeDates(); mount(); }
})();
