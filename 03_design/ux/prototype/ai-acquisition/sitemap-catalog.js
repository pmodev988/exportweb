(function(root){
'use strict';
// LGA original information architectures, informed by the public categories cited below.
// These are not imported or licensed Huawei/Alibaba template source files.
const sources=[
 {id:'CASES',name:'阿里云建站行业案例页',nameEn:'Alibaba Cloud website industry examples',url:'https://ac.aliyun.com/jianzhan/h5',scope:'公开照明、食品、门窗、化工等案例线索',scopeEn:'Public lighting, food, door and chemical example clues'},
 {id:'HW',name:'华为云行业模板介绍',nameEn:'Huawei Cloud industry template guide',url:'https://www.huaweicloud.com/special/pro-cloudsite.html',scope:'公开行业分类；非逐套模板目录',scopeEn:'Public industry categories, not individual template maps'},
 {id:'ALI',name:'阿里云建站模板入口',nameEn:'Alibaba Cloud template entry',url:'https://market.aliyun.com/promotion/ymsumei',scope:'官方入口链接至云·速成美站模板库',scopeEn:'Official link to the website template library'},
 {id:'LIB',name:'云·速成美站行业模板库',nameEn:'Industry template library',url:'https://moban.wezhan.cn/',scope:'公开分类与样例名称；菜单由 LGA 设计',scopeEn:'Public categories and example names; menus designed by LGA'}
];
const groups=[
 ['manufacturing','工业制造','Industrial manufacturing'],
 ['materials','能源与材料','Energy and materials'],
 ['consumer','消费与家居','Consumer and home'],
 ['services','企业与专业服务','Business and professional services'],
 ['lifestyle','教育、文旅与生活服务','Education, travel and local services']
].map(([id,zh,en])=>({id,zh,en}));
const p=(slug,zh,en,children=[])=>({slug,zh,en,children});
const rows=[
 ['machinery','机械设备与机床','Machinery and machine tools','manufacturing',
  '按工件和工艺找设备，再提交选型需求','Find equipment by workpiece and process, then request selection advice',
  '工业设备 / 五金、设备','Industrial equipment / Hardware and equipment',
  [p('equipment','设备系列','Equipment',[p('forming','成形设备','Forming equipment'),p('cutting','切割设备','Cutting equipment')]),p('applications','加工应用','Applications',[p('materials','按加工材料','By material'),p('processes','按加工工艺','By process')]),p('selection','选型指南','Selection guide',[p('requirements','工件与产能要求','Workpiece and capacity needs')]),p('support','安装与售后','Installation and service'),p('company','制造企业','Manufacturer')]],
 ['precision','精密加工与 OEM','Precision machining and OEM','manufacturing',
  '先看加工能力与检验，再带图纸询价','Review machining and inspection, then submit drawing requirements',
  '工业设备 / 五金、设备（细分设计）','Industrial equipment / Hardware (LGA specialization)',
  [p('capabilities','加工能力','Capabilities',[p('cnc','CNC 加工','CNC machining'),p('sheet-metal','钣金加工','Sheet metal'),p('prototyping','样件试制','Prototyping')]),p('materials','材料与表面处理','Materials and finishes'),p('quality','检验与品质','Inspection and quality',[p('measurement','检测方法','Measurement methods'),p('reports','报告资料','Reports')]),p('process','从图纸到交付','Drawing to delivery'),p('projects','加工项目','Machining projects'),p('company','工厂介绍','Factory')]],
 ['automation','自动化与机器人','Automation and robotics','manufacturing',
  '从现场问题进入方案，预约工程评估','Start with a production problem and request engineering assessment',
  '工业设备 / IT、互联网、科技（细分设计）','Industrial equipment / Technology (LGA specialization)',
  [p('solutions','自动化方案','Automation solutions',[p('assembly','装配自动化','Assembly'),p('inspection','视觉检测','Vision inspection'),p('handling','搬运与码垛','Handling and palletizing')]),p('industries','适用行业','Industries',[p('automotive','汽车制造','Automotive'),p('electronics','电子制造','Electronics')]),p('delivery','项目实施','Project delivery',[p('survey','现场评估','Site assessment'),p('acceptance','调试与验收','Commissioning')]),p('projects','项目案例','Projects'),p('service','运维支持','Maintenance')]],
 ['electronics','电子元件与连接器','Electronic components and connectors','manufacturing',
  '按型号和适配条件查资料，再提交需求清单','Find models and compatibility information, then submit requirements',
  '电子 / 数码、IT、科技','Electronics / Digital and technology',
  [p('components','元件目录','Component catalog',[p('connectors','连接器','Connectors'),p('sensors','传感器','Sensors')]),p('applications','应用选型','Application selection',[p('industrial','工业控制','Industrial control'),p('devices','终端设备','Devices')]),p('documents','规格与资料','Specifications',[p('datasheets','规格书','Datasheets'),p('compatibility','适配说明','Compatibility')]),p('custom','定制与打样','Customization and samples'),p('support','技术支持','Technical support')]],
 ['lighting','照明与电气','Lighting and electrical products','manufacturing',
  '从使用空间和电气条件进入产品与照明方案','Choose products from space and electrical requirements',
  '电子 / 数码、家具、家居；照明案例','Electronics / Home categories; lighting examples',
  [p('lighting','灯具与电气','Products',[p('indoor','室内照明','Indoor lighting'),p('outdoor','户外照明','Outdoor lighting'),p('controls','电气与控制','Electrical and controls')]),p('spaces','空间方案','Spaces',[p('commercial','商业空间','Commercial'),p('industrial','工业空间','Industrial')]),p('design','配光与设计','Lighting design'),p('projects','照明项目','Lighting projects'),p('documents','安装资料','Installation documents')]],
 ['autoparts','汽车零部件','Automotive parts','manufacturing',
  '按车型和零件用途确认适配，再咨询供货','Check vehicle and part fit before discussing supply',
  '五金、设备、汽车服务','Hardware, equipment and automotive services',
  [p('parts','零件分类','Parts',[p('chassis','底盘部件','Chassis'),p('electrical','电气部件','Electrical'),p('maintenance','维护配件','Maintenance parts')]),p('fitment','车型适配','Vehicle fitment',[p('models','车型索引','Model index'),p('reference','零件号核对','Part number check')]),p('quality','检验资料','Inspection documents'),p('supply','供货与包装','Supply and packaging'),p('support','安装与支持','Installation and support')]],
 ['medical','医疗器械与实验设备','Medical and laboratory equipment','manufacturing',
  '明确用途、适用范围和资料，再进行专业产品咨询','Review intended use, scope and documents before a product inquiry',
  '医疗健康 / 食品、医药保健（器械细分）','Health / Medical categories (device specialization)',
  [p('equipment','设备与耗材','Equipment and consumables',[p('laboratory','实验设备','Laboratory equipment'),p('consumables','配套耗材','Consumables')]),p('applications','用途与适用范围','Intended use'),p('documents','产品与合规资料','Product documents',[p('instructions','使用说明','Instructions'),p('qualifications','适用地区资料','Market-specific documents')]),p('service','培训与售后','Training and service'),p('company','企业与质量体系','Company and quality')]],
 ['packaging','包装与印刷','Packaging and printing','manufacturing',
  '按产品、材质与印刷要求选择包装并申请打样','Choose packaging by product, material and artwork, then request samples',
  '工业 / 传媒、广告（包装细分设计）','Industrial / Media and advertising (packaging specialization)',
  [p('packaging','包装形式','Packaging formats',[p('boxes','纸盒与纸箱','Boxes'),p('flexible','软包装','Flexible packaging'),p('labels','标签与说明书','Labels and inserts')]),p('materials','材料与印刷','Materials and print'),p('industries','行业包装','Industry packaging',[p('food','食品包装','Food packaging'),p('consumer','消费品包装','Consumer packaging')]),p('sampling','设计与打样','Design and sampling'),p('production','生产与交付','Production and delivery')]],
 ['energy','新能源与储能','Energy and storage','materials',
  '按使用场景和系统边界沟通配置','Discuss configuration by use case and system scope',
  '工业设备 / 科技（能源细分设计）','Industrial equipment / Technology (energy specialization)',
  [p('systems','产品与系统','Products and systems',[p('storage','储能产品','Storage products'),p('conversion','转换与配套','Conversion and accessories')]),p('scenarios','应用场景','Applications',[p('commercial','工商业场景','Commercial and industrial'),p('remote','离网场景','Off-grid')]),p('engineering','方案与系统边界','Engineering scope'),p('projects','项目参考','Projects'),p('documents','技术与安全资料','Technical and safety documents'),p('service','交付与维护','Delivery and maintenance')]],
 ['chemicals','化工与新材料','Chemicals and advanced materials','materials',
  '按用途和指标找到材料，再索取资料与样品','Find materials by application and specification, then request documents and samples',
  '化工、环保；化工外贸案例','Chemicals and environment; chemical trade examples',
  [p('materials','材料系列','Material families',[p('polymers','高分子材料','Polymers'),p('additives','功能助剂','Functional additives')]),p('applications','用途与配方适配','Application fit'),p('documents','技术资料','Technical documents',[p('tds','技术数据表','Technical data sheets'),p('sds','安全资料','Safety documents')]),p('samples','样品与测试','Samples and testing'),p('delivery','包装与交付条件','Packaging and delivery'),p('company','企业介绍','Company')]],
 ['environment','环保与水处理','Environmental and water treatment','materials',
  '提供工况、处理目标与现场条件，形成工程咨询','Collect operating conditions, treatment goals and site needs',
  '化工、环保、农林牧渔','Chemicals, environment and agriculture',
  [p('solutions','处理方案','Treatment solutions',[p('water','水处理','Water treatment'),p('air','废气处理','Air treatment'),p('reuse','回用方案','Reuse')]),p('industries','行业工况','Industry conditions'),p('equipment','设备与耗材','Equipment and consumables'),p('projects','工程案例','Engineering projects'),p('service','检测与运维','Testing and operation'),p('knowledge','技术问答','Technical FAQ')]],
 ['construction','建材、门窗与五金','Building materials, doors and hardware','materials',
  '从项目空间选择材料与配置，申请样品或项目报价','Select materials for a project and request samples or a quote',
  '建筑房产 / 数码、家具、家居；门窗案例','Construction / Home categories; door examples',
  [p('products','材料与构件','Materials and components',[p('doors','门窗系统','Doors and windows'),p('surfaces','饰面材料','Surface materials'),p('hardware','配套五金','Hardware')]),p('projects','项目空间','Project spaces'),p('performance','规格与性能资料','Specifications and performance'),p('installation','安装节点','Installation details'),p('samples','样品与项目合作','Samples and projects')]],
 ['food','食品与农产品','Food and agricultural products','consumer',
  '查看品类、规格和可追溯资料，再询问样品与供货','Review products, specifications and traceability before supply inquiries',
  '食品、茶酒 / 农林牧渔；食品案例','Food and beverages / Agriculture; food examples',
  [p('products','产品品类','Product categories',[p('ingredients','食品原料','Ingredients'),p('finished','成品食品','Finished products')]),p('origin','产地与生产','Origin and production'),p('quality','品质与追溯','Quality and traceability'),p('formats','规格与包装','Formats and packaging'),p('supply','供货合作','Supply partnership',[p('samples','样品申请','Samples'),p('private-label','品牌定制','Private label')])]],
 ['beverages','茶饮、咖啡与饮品','Tea, coffee and beverages','consumer',
  '按风味和销售场景了解系列，进入试饮与商业合作','Explore flavors and use cases, then sampling and partnerships',
  '食品、茶酒；模板样例咖啡、红酒、白酒','Food and beverages; coffee and wine example titles',
  [p('collections','风味与系列','Flavors and collections',[p('tea','茶与茶饮','Tea'),p('coffee','咖啡','Coffee'),p('drinks','其他饮品','Other beverages')]),p('story','产地与品牌故事','Origin and story'),p('occasions','饮用与销售场景','Use and sales occasions'),p('custom','包装与品牌合作','Packaging and branding'),p('sampling','品鉴与样品','Tasting and samples')]],
 ['apparel','纺织、服装与箱包','Textiles, apparel and bags','consumer',
  '按系列和材料比较，提交设计与打样需求','Compare collections and materials, then submit design and sampling needs',
  '服饰箱包 / 服装、饰品','Apparel and bags / Clothing and accessories',
  [p('collections','产品系列','Collections',[p('apparel','服装','Apparel'),p('bags','箱包','Bags'),p('textiles','面辅料','Fabrics and trims')]),p('materials','面料与工艺','Materials and workmanship'),p('custom','设计与定制','Design and customization',[p('sampling','打样流程','Sampling'),p('sizing','尺寸与版型','Sizing and fit')]),p('quality','品质与交付','Quality and delivery'),p('lookbook','款式展示','Lookbook')]],
 ['beauty','美妆与个人护理','Beauty and personal care','consumer',
  '按护理场景了解产品与已确认资料，再咨询样品和品牌合作','Explore care uses and verified product information before sampling and branding',
  '服装、饰品、美容护肤','Clothing, accessories and beauty',
  [p('products','产品系列','Product ranges',[p('skin','肌肤护理','Skin care'),p('hair','头发护理','Hair care'),p('tools','护理工具','Care tools')]),p('ingredients','成分与产品资料','Ingredients and documents'),p('development','配方与品牌开发','Product and brand development'),p('packaging','包装选择','Packaging options'),p('quality','质量与适用地区','Quality and target markets'),p('samples','样品咨询','Sample inquiry')]],
 ['furniture','家具与家居用品','Furniture and home products','consumer',
  '从空间和系列选择产品，推进项目配置或经销合作','Explore spaces and collections for projects or distribution',
  '家居 / 数码、家具、家居百货','Home / Furniture and household goods',
  [p('spaces','按空间选品','Shop by space',[p('living','客厅与居住','Living'),p('office','办公空间','Office'),p('hospitality','酒店与公共空间','Hospitality')]),p('collections','家具系列','Collections'),p('materials','材料与工艺','Materials and craftsmanship'),p('projects','项目配置','Project furnishing'),p('custom','定制与合作','Customization and partnerships')]],
 ['logistics','物流与国际货运','Logistics and freight forwarding','services',
  '按航线与货物条件了解服务，再提交运输咨询','Explore routes and cargo conditions before requesting a shipping quote',
  '物流、租赁、商业贸易','Logistics, rental and trade',
  [p('services','运输服务','Transport services',[p('ocean','海运','Ocean freight'),p('air','空运','Air freight'),p('warehousing','仓储与配送','Warehousing and delivery')]),p('routes','航线与覆盖','Routes and coverage'),p('cargo','货物与行业方案','Cargo solutions'),p('process','操作与单证','Process and documents'),p('support','运输问答','Shipping FAQ')]],
 ['software','软件与技术服务','Software and technology services','services',
  '从业务问题查看产品能力，申请演示或方案交流','Explore capabilities by business problem and request a demo',
  'IT、互联网、科技','IT, internet and technology',
  [p('product','产品能力','Product capabilities',[p('features','核心功能','Features'),p('integrations','集成能力','Integrations')]),p('solutions','业务场景','Use cases'),p('deployment','部署与服务','Deployment and service'),p('resources','文档与演示','Resources',[p('docs','使用文档','Documentation'),p('demos','演示资料','Demos')]),p('customers','客户实践','Customer stories'),p('company','团队与企业','Company and team')]],
 ['professional','工程设计与企业服务','Engineering design and business services','services',
  '先了解服务边界与交付物，再预约需求沟通','Review scope and deliverables, then arrange a requirements discussion',
  '商业服务 / 建筑、艺术传媒（设计细分）','Business services / Construction and design',
  [p('expertise','专业服务','Expertise',[p('planning','策划与咨询','Planning and consulting'),p('design','设计与工程','Design and engineering')]),p('industries','服务行业','Client industries'),p('deliverables','流程与交付物','Process and deliverables'),p('projects','项目实践','Projects'),p('team','团队与能力','Team and capabilities'),p('insights','专业观点','Insights')]]
];
// Additional LGA specializations: public categories guide coverage, not these exact menus.
rows.push(
 ['instruments','仪器仪表与检测','Instruments and measurement','manufacturing','按测量对象和量程选型，带测试条件咨询','Choose by measurement target and range, then discuss test conditions','工业设备（LGA 细分）','Industrial equipment (LGA specialization)',
 [p('instruments','仪器系列','Instrument ranges',[p('measurement','测量仪器','Measurement'),p('analysis','分析仪器','Analysis')]),p('parameters','量程与精度','Range and accuracy'),p('methods','检测方法','Test methods'),p('calibration','校准与维护','Calibration and maintenance'),p('documents','数据与说明书','Data and manuals')]],
 ['fluid','泵阀与流体设备','Pumps, valves and fluid systems','manufacturing','从介质、流量和压力确定设备适配','Select equipment by medium, flow and pressure','工业设备（LGA 细分）','Industrial equipment (LGA specialization)',
 [p('fluid','泵阀系列','Pump and valve ranges',[p('pumps','泵类','Pumps'),p('valves','阀门','Valves'),p('fittings','管路附件','Fittings')]),p('conditions','介质与工况','Media and operating conditions'),p('selection','选型曲线与资料','Selection curves'),p('systems','流体系统方案','Fluid system solutions'),p('maintenance','备件与维修','Spares and maintenance')]],
 ['hvac','暖通与制冷','HVAC and refrigeration','manufacturing','按空间、温度与负荷提出配置需求','Discuss space, temperature and load requirements','工业设备 / 建筑（LGA 细分）','Equipment / Construction (LGA specialization)',
 [p('systems','暖通制冷系统','HVAC systems',[p('climate','空调与通风','Climate and ventilation'),p('cold-chain','冷库与冷链','Cold storage')]),p('spaces','建筑与使用空间','Buildings and spaces'),p('sizing','负荷与配置','Load and sizing'),p('installation','安装条件','Installation needs'),p('service','运行与维护','Operation and maintenance')]],
 ['agri-equipment','农业机械与园艺设备','Agricultural and garden equipment','manufacturing','按作物、地形与作业方式选择机具','Find equipment by crop, terrain and operation','农林牧渔 / 设备（LGA 细分）','Agriculture / Equipment (LGA specialization)',
 [p('machines','作业机具','Equipment',[p('field','田间机械','Field equipment'),p('garden','园艺工具','Garden tools')]),p('operations','作物与作业','Crops and operations'),p('compatibility','动力与挂接适配','Power and attachment fit'),p('demonstrations','作业演示','Field demonstrations'),p('parts','配件与售后','Parts and service')]],
 ['tools','工具与紧固件','Tools and fasteners','manufacturing','按作业和标准规格选品，询问成套配套','Find standard sizes and tooling for a job','五金、设备（LGA 细分）','Hardware and equipment (LGA specialization)',
 [p('catalog','工具与紧固件目录','Catalog',[p('tools','手动与电动工具','Hand and power tools'),p('fasteners','紧固件','Fasteners')]),p('standards','标准与尺寸','Standards and sizes'),p('tasks','按作业选配','Selection by task'),p('kits','成套与品牌定制','Kits and branding'),p('support','使用与支持','Use and support')]],
 ['metals','金属与型材','Metals and profiles','materials','按牌号、尺寸和加工要求询问供货','Discuss grade, dimensions and processing needs','工业 / 材料（LGA 细分）','Industry / Materials (LGA specialization)',
 [p('grades','金属牌号','Grades',[p('steel','钢材','Steel'),p('nonferrous','有色金属','Non-ferrous metals')]),p('forms','板管棒与型材','Sheets, tubes and profiles'),p('processing','切割与加工','Cutting and processing'),p('documents','材质与检验资料','Material and inspection documents'),p('supply','包装与供货条件','Packaging and supply')]],
 ['rubber','橡塑制品与密封','Rubber, plastics and seals','materials','从介质、温度和尺寸明确材料及成型方式','Specify media, temperature and size for materials and molding','化工 / 工业（LGA 细分）','Chemicals / Industry (LGA specialization)',
 [p('products','制品与密封系列','Products and seals',[p('seals','密封件','Seals'),p('molded','成型制品','Molded products')]),p('materials','材料与适用条件','Materials and conditions'),p('design','图纸与模具开发','Drawings and tooling'),p('testing','试样与测试','Samples and testing'),p('production','量产与交付','Production and delivery')]],
 ['textile-materials','纱线与功能面料','Yarns and technical fabrics','materials','按成分、克重与用途筛选，索取色卡和样布','Select composition, weight and use; request swatches','服装 / 纺织（LGA 细分）','Apparel / Textiles (LGA specialization)',
 [p('fabrics','纱线与面料','Yarns and fabrics',[p('yarn','纱线','Yarns'),p('functional','功能面料','Technical fabrics')]),p('specifications','成分与规格','Composition and specifications'),p('finishes','染整与后处理','Dyeing and finishing'),p('swatches','色卡与样布','Colors and swatches'),p('production','批次与交付条件','Batches and delivery')]],
 ['pet','宠物用品','Pet products','consumer','按宠物与使用场景选品，沟通样品与品牌合作','Choose by pet and use case for samples and branding','家居百货（LGA 细分）','Household goods (LGA specialization)',
 [p('pets','按宠物选品','By pet',[p('dogs','犬用产品','Dog products'),p('cats','猫用产品','Cat products')]),p('uses','喂养、出行与护理','Feeding, travel and care'),p('materials','材质与尺寸','Materials and sizes'),p('branding','品牌与包装定制','Branding and packaging'),p('samples','样品与合作','Samples and partnerships')]],
 ['toys','玩具与益智用品','Toys and educational play','consumer','先按年龄和玩法了解产品，再核对目标市场资料','Explore age and play type, then target-market documents','家居百货 / 教育（LGA 细分）','Consumer goods / Education (LGA specialization)',
 [p('play','玩具与玩法','Play collections',[p('construction','拼搭与模型','Construction and models'),p('learning','益智与学习','Learning play')]),p('ages','适用年龄与场景','Age ranges and settings'),p('documents','材料与测试资料','Materials and test documents'),p('development','设计与打样','Design and sampling'),p('supply','包装与合作','Packaging and partnerships')]],
 ['outdoor','运动与户外用品','Sports and outdoor goods','consumer','从活动、环境和使用规格进入选品','Explore products by activity, environment and specifications','家居百货 / 服饰（LGA 细分）','Consumer goods / Apparel (LGA specialization)',
 [p('activities','按活动选品','By activity',[p('camping','露营与徒步','Camping and hiking'),p('fitness','健身与训练','Fitness and training')]),p('equipment','装备系列','Equipment collections'),p('conditions','环境与使用条件','Conditions of use'),p('custom','队伍与品牌定制','Team and brand customization'),p('care','使用维护','Care guides')]],
 ['appliances','家电与厨房用品','Appliances and kitchenware','consumer','按使用空间和电气条件了解产品系列','Explore products by space and electrical requirements','数码、家具、家居百货（LGA 细分）','Digital and household goods (LGA specialization)',
 [p('products','电器与厨具','Products',[p('small-appliances','小家电','Small appliances'),p('kitchenware','厨房用具','Kitchenware')]),p('spaces','厨房与生活场景','Kitchen and living'),p('markets','电气与地区适配','Electrical and market fit'),p('development','品牌开发与打样','Brand development and samples'),p('support','使用与售后','Use and after-sales')]],
 ['gifts','礼品与文具','Gifts and stationery','consumer','从用途、定制位置与交付日期组织礼赠需求','Plan gifts by occasion, customization and delivery date','家居百货 / 商业服务（LGA 细分）','Consumer goods / Business services (LGA specialization)',
 [p('occasions','礼赠场景','Occasions',[p('corporate','企业礼赠','Corporate gifts'),p('events','活动与展会','Events and exhibitions')]),p('collections','礼品文具系列','Gift and stationery ranges'),p('customization','标识与工艺','Branding methods'),p('sets','组合与包装','Sets and packaging'),p('timeline','打样与交期沟通','Sampling and delivery planning')]],
 ['testing','检测与技术咨询','Testing and technical consulting','services','按产品与目标市场确认检测范围和送样要求','Scope testing by product and target market','商业服务（LGA 细分）','Business services (LGA specialization)',
 [p('scope','服务与检测范围','Testing scope',[p('materials','材料检测','Material testing'),p('products','产品测试','Product testing')]),p('markets','市场与适用项目','Markets and applicable services'),p('submission','送样与资料','Sample submission'),p('reports','报告与解读','Reports and interpretation'),p('qualifications','机构与资质范围','Provider and qualification scope')]],
 ['training','职业培训与企业学习','Professional training','lifestyle','从学习目标选择课程，咨询时间和企业培训方案','Choose courses by goals and discuss scheduling','教育培训（LGA 细分）','Education and training (LGA specialization)',
 [p('courses','课程与学习路径','Courses',[p('skills','职业技能','Professional skills'),p('teams','团队培训','Team training')]),p('outcomes','适合人群与学习目标','Audience and learning objectives'),p('instructors','讲师与教学方式','Instructors and format'),p('schedule','班次与安排','Schedule'),p('enterprise','企业培训方案','Enterprise training')]],
 ['hospitality','酒店与会议空间','Hotels and meeting venues','lifestyle','按入住或活动需求了解空间，提交日期咨询','Explore rooms and venues, then inquire about dates','餐饮、酒店、旅游服务（LGA 细分）','Hospitality and travel (LGA specialization)',
 [p('spaces','客房与场地','Rooms and spaces',[p('rooms','客房类型','Room types'),p('meetings','会议与活动场地','Meeting venues')]),p('facilities','设施与服务','Facilities and services'),p('location','位置与交通','Location and access'),p('events','会议与团体方案','Meetings and groups'),p('policies','入住与预约说明','Stay and booking information')]],
 ['travel','旅行与目的地服务','Travel and destination services','lifestyle','按兴趣和时间讨论行程，再提交定制咨询','Discuss itineraries by interests and dates','餐饮、酒店、旅游服务（LGA 细分）','Hospitality and travel (LGA specialization)',
 [p('destinations','目的地','Destinations',[p('city','城市体验','City experiences'),p('nature','自然探索','Nature trips')]),p('journeys','主题行程','Themed itineraries'),p('custom','定制与团队出行','Custom and group travel'),p('preparation','出行准备','Trip preparation'),p('service','服务包含与边界','Service inclusions and scope')]],
 ['creative','品牌设计与影像','Brand design and visual production','services','先看作品与服务范围，再提交创作需求','Review work and scope before a creative brief','传媒、广告 / 婚庆、摄影（LGA 细分）','Media / Photography (LGA specialization)',
 [p('portfolio','作品与项目','Portfolio',[p('branding','品牌设计','Branding'),p('film','影像制作','Film production')]),p('services','创作服务','Creative services'),p('process','从需求到交付','Brief to delivery'),p('team','创作团队','Creative team'),p('usage','交付格式与使用范围','Formats and usage scope')]],
 ['local-services','维修清洁与本地服务','Maintenance and local services','lifestyle','按地区和问题了解服务，提交上门评估咨询','Find local support by area and issue','生活服务（LGA 细分）','Local services (LGA specialization)',
 [p('services','服务项目','Services',[p('maintenance','维修保养','Maintenance'),p('cleaning','清洁整理','Cleaning')]),p('coverage','服务地区','Coverage'),p('assessment','问题与现场评估','Issue assessment'),p('process','预约与服务流程','Appointment process'),p('pricing','计费方式与服务范围','Pricing basis and scope')]],
 ['exhibitions','展会与活动服务','Exhibitions and event services','services','从活动目标、场地和日期沟通搭建及执行','Scope production by goals, venue and dates','传媒、广告、营销策划（LGA 细分）','Media and marketing services (LGA specialization)',
 [p('formats','活动与展览类型','Event formats',[p('exhibitions','展览与展位','Exhibitions and stands'),p('events','发布与商务活动','Launches and business events')]),p('work','现场作品','Event portfolio'),p('production','设计搭建与执行','Design and production'),p('planning','场地与时间计划','Venue and schedule'),p('scope','合作与交付范围','Service and delivery scope')]]
);
const templates=rows.map(([key,zh,en,group,why,whyEn,category,categoryEn,pages],i)=>({
 id:'industry-'+key,code:'S'+String(i+1).padStart(2,'0'),zh,en,group,why,whyEn,category,categoryEn,pages,
 sourceIds:['HW','ALI','LIB','CASES'],basis:'LGA_ORIGINAL_FROM_PUBLIC_INDUSTRY_CATEGORIES',
 titles:pages.map(p=>p.zh),titlesEn:pages.map(p=>p.en)
}));
function nodes(id){
 const t=templates.find(t=>t.id===id);if(!t)throw Error('请选择行业架构');
 const result=[{id:'hero',parent:'',title:'首页',titleEn:'Home',path:'/',purpose:'说明公司、产品与本次服务范围',purposeEn:'Introduce the company, offering and scope',visible:true}];
 function walk(pages,parent='',prefix=''){
  for(const page of pages){
   const path=prefix+'/'+page.slug,node={id:t.id+path.replaceAll('/','-'),parent,title:page.zh,titleEn:page.en,path:path+'/',purpose:'准备“'+page.zh+'”的自家资料、适用条件和咨询入口',purposeEn:'Prepare your own '+page.en.toLowerCase()+' information, conditions and inquiry route',visible:true};
   result.push(node);walk(page.children,node.id,path);
  }
 }
 walk(t.pages);
 result.push({id:'contact',parent:'',title:'联系与咨询',titleEn:'Contact and inquiry',path:'/contact/',purpose:'保留客户原始需求，交给明确的负责人',purposeEn:'Capture the original request and assign an owner',visible:true});
 return result;
}
function search(query='',group='all'){
 const q=String(query).normalize('NFKC').trim().toLowerCase();
 return templates.filter(t=>(group==='all'||t.group===group)&&(!q||[t.code,t.zh,t.en,t.category,...nodes(t.id).map(n=>n.title+' '+n.titleEn)].join(' ').toLowerCase().includes(q)));
}
const api={sources,groups,templates,nodes,search};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGASitemapCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
