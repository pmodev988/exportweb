(function (root) {
  'use strict';
  const data = {
    // Scenario values only: not production OPS settings, prices or entitlements.
    policy: { id: 'DEMO-POLICY-1', maxLoops: 3, maxRejectedRounds: 2, maxImportBytes: 524288, maxLogoBytes: 1048576,
      costs: { analyse: 5, produce: 8, social: 3, research: 10, contact: 2, reply: 1 },
      caps: { site: 30, content: 24, social: 12, leads: 24, inbox: 10 }, planCap: 100 },
    company: { name: '青禾精密 · 演示工厂', product: '精密金属零件', strength: '按图定制、小批量试制', constraint: '材料、精度、交期需逐单核实', market: '内贸与外贸均可，先研究再决定', facts: '可按客户图纸评估加工；支持小批量试制。价格、认证和具体交期尚未确认。' },
    directions: [
      { id: 'D1', title: '设备集成商', audience: '需要配套零件的设备团队', reason: '按图评估和试制能力，可以用于探索配套开发合作。', need: '适用材料、精度与样品验收方式', first: '用合作介绍页验证是否有人愿意提交图纸', source: '客户自述', evidence: '产品资料 / 强项字段', state: 'AI 推断', fit: '合作开发型' },
      { id: 'D2', title: '有改型需求的产品企业', audience: '需要调整零部件的研发或采购团队', reason: '小批量能力可支持改型前的样品讨论，是否匹配仍需验证。', need: '设计责任、最低数量及试制范围', first: '准备一份试制流程说明，再研究具体企业', source: '客户自述', evidence: '产品资料 / 强项字段', state: 'AI 推断', fit: '试制验证型' },
      { id: 'D3', title: '行业服务与合作伙伴', audience: '有客户服务资源的渠道或技术合作商', reason: '合作商可能帮助解释本地需求；当前没有渠道能力证据。', need: '服务地区、语言、责任划分', first: '先补合作边界，不立即购买名单', source: '无直接来源', evidence: '无外部市场资料', state: '待验证假设', fit: '伙伴服务型' }
    ],
    candidates: [
      { id: 'CO1', name: 'Northstar Assembly（合成样例）', region: '欧洲 · 演示', role: '项目采购（角色推断）', contact: 'buyer@northstar.example', evidence: '样例企业页 §2：提供设备集成服务。', hypothesis: '设备集成过程可能需要按图试制配套件；当前是否采购未知。', unknown: '当前项目、材料要求、联系人任职及联系许可', source: 'DEMO-SOURCE-01', purpose: 'MARKET_RESEARCH', license: 'ALLOW', permission: true },
      { id: 'CO2', name: '海桥装备（合成样例）', region: '中国 · 演示', role: '技术负责人（角色推断）', contact: 'team@haiqiao.example', evidence: '样例介绍 §1：开展设备改型项目。', hypothesis: '可能需要试制零件，需确认加工范围和交付要求。', unknown: '真实需求、任职及联系方式有效性', source: 'DEMO-SOURCE-02', purpose: 'MARKET_RESEARCH', license: 'ALLOW', permission: true },
      { id: 'CO3', name: '来源待确认企业（合成样例）', region: '未核实', role: '未知', contact: '', evidence: '', hypothesis: '', unknown: '来源许可与需求依据均缺失', source: 'DEMO-SOURCE-03', purpose: 'UNKNOWN', license: 'UNKNOWN', permission: false }
    ],
    incoming: { original: 'Hello, can you review our drawing for a small trial order? We need to confirm material compatibility before discussing price.', translation: '你好，能否评估我们的小批量试制图纸？希望先确认材料是否适用，再讨论价格。', topic: '技术适配', owner: '业务负责人' }
  };
  if (typeof module !== 'undefined') module.exports = data;
  else root.LGADemo = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
