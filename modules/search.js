/* search.js — header search box + live category match counts. */

function executeSearch(q){
  const query = (q !== undefined) ? q : currentSearchQuery;
  if(countCategoryMatches(query) === 0){ openCategoryComingSoon(query, false); return; }
  currentSearchQuery = query;
  navigateTo('products');
  renderProducts();
}

/* Counts products matching a category (exact) or free-text search (substring, name/category/brand)
   using the exact same logic as renderProducts(), so "0 matches" here always means the products
   page would truly render empty — this is what decides Coming-Soon vs real results. */
function countCategoryMatches(term){
  if(!term) return products.length;
  const t = term.toLowerCase();
  return products.filter(p =>
    p.category === term ||
    (p.name||'').toLowerCase().includes(t) ||
    (p.category||'').toLowerCase().includes(t) ||
    (p.brand||'').toLowerCase().includes(t)
  ).length;
}

/* ================= Category "Coming Soon" page (dead-link fix) =================
   Every mega-menu item / search / category filter that currently resolves to zero
   products lands here instead of an empty grid. Never a dead end: quote request,
   notify-me (saved to Supabase), related categories and search are always offered.
   CATEGORY_META gives curated copy for known categories; anything not in the map
   still gets a full, honest page via a generated fallback — so NO click can ever
   be truly dead, including future menu items nobody added metadata for yet. */
const CATEGORY_META = {
  'راوترات (Routers)':{icon:'📡', label:'راوترات (Routers)', desc:'أجهزة توجيه شبكات للمنازل والشركات بمعدلات نقل وتغطية مختلفة.', expected:['Router منزلي','Router شركات Multi-WAN','Router صناعي'], related:['سويتش','فايبر','اكسس بوينت']},
  'سويتش':{icon:'🔀', label:'السويتشات (Switches)', desc:'سويتشات شبكات Managed / Unmanaged بعدد منافذ مختلف لربط الأجهزة داخل الشبكة.', expected:['Switch 8 Port','Switch 24 Port','Switch 48 Port Managed'], related:['سويتش مدار','poe','باتش بانل']},
  'سويتش مدار':{icon:'⚙️', label:'Managed Switches', desc:'سويتشات بإدارة كاملة (VLAN, QoS, SNMP) للشبكات المؤسسية.', expected:['Managed Switch 24 Port','Managed Switch 48 Port L3'], related:['سويتش','poe','فايبر']},
  'poe':{icon:'🔌', label:'PoE Switches', desc:'سويتشات بتغذية كهرباء عبر الكابل نفسه لتشغيل الكاميرات ونقاط الواي فاي مباشرة.', expected:['PoE Switch 8 Port','PoE Switch 16 Port','PoE Switch 24 Port'], related:['سويتش','كاميرات المراقبة','اكسس بوينت']},
  'اكسس بوينت':{icon:'📶', label:'Wireless Access Points', desc:'نقاط وصول واي فاي لتغطية مساحات واسعة بشبكة لاسلكية قوية وموحّدة.', expected:['AP داخلي','AP خارجي','AP سقف Ceiling Mount'], related:['واي فاي خارجي','سويتش','فايبر']},
  'واي فاي خارجي':{icon:'🛰️', label:'Outdoor Wireless', desc:'حلول واي فاي بعيدة المدى ومقاومة للعوامل الجوية للربط بين المباني.', expected:['Outdoor AP','Point to Point Link','Point to Multipoint'], related:['اكسس بوينت','فايبر']},
  'فايبر':{icon:'💠', label:'Fiber Optics', desc:'كابلات ومعدات الألياف الضوئية لربط المباني بسرعات عالية ومسافات طويلة.', expected:['Fiber Cable Single Mode','Fiber Cable Multi Mode','Fiber Splicer'], related:['sfp','باتش بانل','واي فاي خارجي']},
  'sfp':{icon:'🧿', label:'SFP Modules', desc:'وحدات تحويل بصرية لتوصيل السويتشات عبر الفايبر.', expected:['SFP 1G','SFP+ 10G','SFP Multi Mode/Single Mode'], related:['فايبر','سويتش مدار']},
  'باتش بانل':{icon:'🧷', label:'Patch Panels', desc:'لوحات توزيع كابلات الشبكة داخل الراك بشكل منظم واحترافي.', expected:['Patch Panel 24 Port Cat6','Patch Panel 48 Port'], related:['كابل شبكة','كابينة شبكة']},
  'كابينة شبكة':{icon:'🗄️', label:'Network Cabinets', desc:'كابينات وراكات لتركيب أجهزة الشبكات والسيرفرات بشكل آمن ومنظم.', expected:['Cabinet 6U','Cabinet 12U','Cabinet 42U Floor Standing'], related:['باتش بانل','pdu']},
  'كابل شبكة':{icon:'🧵', label:'Network Cables', desc:'كابلات شبكة Cat5e/Cat6/Cat6A بأطوال ولفات مختلفة.', expected:['كابل Cat6 لفة 305م','كابل Cat6A','باتش كورد جاهز'], related:['باتش بانل','عدة شبكات']},
  'عدة شبكات':{icon:'🧰', label:'أدوات فني الشبكات', desc:'عدد وأدوات تركيب وفحص كابلات الشبكة.', expected:['Crimping Tool','Cable Tester','Punch Down Tool'], related:['كابل شبكة']},
  'dvr':{icon:'📼', label:'أجهزة DVR', desc:'أجهزة تسجيل للكاميرات التناظرية (Analog/AHD) بعدد قنوات مختلف.', expected:['DVR 4 Channel','DVR 8 Channel','DVR 16 Channel'], related:['nvr','كاميرات المراقبة']},
  'nvr':{icon:'💽', label:'أجهزة NVR', desc:'أجهزة تسجيل شبكية للكاميرات IP بدقة وسعة تخزين عالية.', expected:['NVR 8 Channel','NVR 16 Channel','NVR 32 Channel'], related:['dvr','كاميرات المراقبة']},
  'ptz':{icon:'🔄', label:'كاميرات PTZ', desc:'كاميرات بتحكم في الحركة والتكبير (Pan/Tilt/Zoom) للمساحات الواسعة.', expected:['PTZ 4MP','PTZ Speed Dome','PTZ Auto Tracking'], related:['كاميرات المراقبة','كاميرا ip']},
  'كاميرا ip':{icon:'🌐', label:'كاميرات IP', desc:'كاميرات مراقبة شبكية بدقة عالية وربط عن بعد عبر التطبيق.', expected:['IP Camera 4MP','IP Camera 8MP 4K','IP Camera Full Color'], related:['nvr','poe']},
  'انتركم':{icon:'☎️', label:'Video Door Phone', desc:'أنظمة انتركم بالفيديو للتحكم في الدخول من الموبايل أو شاشة داخلية.', expected:['انتركم شقة واحدة','انتركم مبنى متعدد الوحدات'], related:['بصمة','تيرنستايل']},
  'بصمة':{icon:'🫆', label:'أجهزة البصمة والحضور', desc:'أجهزة بصمة وتحكم دخول لتسجيل حضور الموظفين وتأمين الأبواب.', expected:['جهاز بصمة وجه','جهاز بصمة إصبع','بصمة + كارت'], related:['تيرنستايل','انتركم']},
  'تيرنستايل':{icon:'🚧', label:'Turnstiles', desc:'بوابات تحكم دخول أوتوماتيكية للمصانع والمنشآت الكبيرة.', expected:['Turnstile Tripod','Turnstile Flap Barrier'], related:['بصمة']},
  'انذار':{icon:'🚨', label:'أنظمة الإنذار', desc:'أنظمة إنذار ضد السرقة والحريق بحساسات حركة ودخان.', expected:['Alarm Kit منزلي','حساس حركة','حساس دخان'], related:['كاميرات المراقبة']},
  'بطارية':{icon:'🔋', label:'بطاريات UPS', desc:'بطاريات بديلة واحتياطية لأجهزة الـ UPS.', expected:['بطارية 12V 7Ah','بطارية 12V 9Ah','بطارية Gel'], related:['UPS وحلول الطاقة']},
  'مزود طاقة':{icon:'⚡', label:'Power Supplies', desc:'مزودات طاقة لتغذية الكاميرات والأجهزة الشبكية.', expected:['Power Supply 12V 5A','Power Supply Box 9 Channel'], related:['UPS وحلول الطاقة']},
  'rack pdu':{icon:'🔌', label:'Rack PDU', desc:'وحدات توزيع كهرباء داخل الراك لتغذية كل الأجهزة بأمان.', expected:['PDU 8 Outlet','PDU 12 Outlet Metered'], related:['كابينة شبكة','UPS وحلول الطاقة']},
  'ويندوز':{icon:'🪟', label:'أنظمة تشغيل Windows', desc:'تراخيص Windows الأصلية للأجهزة المكتبية والسيرفرات.', expected:['Windows 11 Home','Windows 11 Pro','Windows Server'], related:['مايكروسوفت 365','انتي فيرس']},
  'مايكروسوفت 365':{icon:'📧', label:'Microsoft 365', desc:'اشتراكات مايكروسوفت 365 بالبريد الرسمي وتطبيقات أوفيس.', expected:['M365 Business Basic','M365 Business Standard'], related:['ويندوز','باك اب']},
  'انتي فيرس':{icon:'🛡️', label:'برامج الحماية Antivirus', desc:'حلول حماية للأجهزة والشبكات من الفيروسات والاختراق.', expected:['Antivirus منزلي','Antivirus Business','Endpoint Protection'], related:['ويندوز','باك اب']},
  'باك اب':{icon:'💾', label:'حلول النسخ الاحتياطي', desc:'أنظمة Backup لحماية بيانات الشركة من الفقد.', expected:['Cloud Backup','Local Backup Appliance'], related:['vmware','انتي فيرس']},
  'vmware':{icon:'🖥️', label:'VMware / Virtualization', desc:'حلول الأتمتة الافتراضية لتشغيل عدة سيرفرات على جهاز واحد.', expected:['VMware vSphere','Hyper-V Setup'], related:['باك اب','ويندوز']},
  'كمبيوتر':{icon:'🖥️', label:'كمبيوتر مكتبي وشخصي', desc:'أجهزة كمبيوتر مكتبية جاهزة لكل الاستخدامات.', expected:['Desktop PC مكتبي','Desktop PC Business'], related:['لابتوب','شاشة','ميني بي سي']},
  'لابتوب':{icon:'💻', label:'لاب توب', desc:'أجهزة لابتوب لكل الاستخدامات المكتبية والتجارية.', expected:['Laptop مكتبي','Laptop Business','Laptop تصميم/جيمنج'], related:['كمبيوتر','شاشة']},
  'شاشة':{icon:'🖵', label:'شاشات كمبيوتر', desc:'شاشات مكتبية بمقاسات ودقة مختلفة.', expected:['شاشة 22 بوصة','شاشة 27 بوصة 2K','شاشة Curved'], related:['كمبيوتر','لابتوب']},
  'اكسسوار':{icon:'🧰', label:'اكسسوارات الكمبيوتر', desc:'ملحقات ومحولات لأجهزة الكمبيوتر.', expected:['ماوس ولوحة مفاتيح','هب USB-C','حامل شاشة'], related:['كمبيوتر']},
  'ميني بي سي':{icon:'📦', label:'Mini PCs', desc:'أجهزة كمبيوتر مصغّرة موفرة للمساحة بأداء مكتبي كامل.', expected:['Mini PC i5','Mini PC i7'], related:['كمبيوتر']},
  'ورك ستيشن':{icon:'🛠️', label:'Workstations', desc:'محطات عمل بمواصفات عالية للتصميم والمعالجة الثقيلة.', expected:['Workstation Tower','Workstation Rack Mount'], related:['كمبيوتر','سيرفرات']},
  'جيمنج':{icon:'🎮', label:'Gaming PCs', desc:'أجهزة كمبيوتر مخصصة للألعاب بكروت شاشة قوية.', expected:['Gaming PC Mid Range','Gaming PC High End'], related:['كمبيوتر','شاشة']},
  'طابعات':{icon:'🖨️', label:'طابعات وماسحات ضوئية', desc:'طابعات مكتبية وليزر وسكانرز للاستخدام المكتبي والتجاري.', expected:['طابعة ليزر مكتبية','طابعة Multifunction','سكانر مستندات'], related:['كمبيوتر']},
  'سوفت وير':{icon:'💿', label:'برمجيات وتراخيص', desc:'كل تراخيص السوفت وير للشركات والأفراد.', expected:['Windows','Office 365','Antivirus'], related:['ويندوز','مايكروسوفت 365','انتي فيرس']},
};
const DEFAULT_RELATED = ['شبكات','كاميرات المراقبة','UPS وحلول الطاقة','كمبيوتر ولابتوبات'];
let soonCurrentTerm = '';

