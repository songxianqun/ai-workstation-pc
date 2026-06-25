#!/usr/bin/env python3
"""
投行业务参与助手
基于30个业务模型，帮助非投行员工识别客户业务机会、获得展业指导、匹配投行支持资源
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from business_data import BUSINESS_DATA, RECOMMENDATION_RULES, BUSINESS_KEYWORDS

@dataclass
class Business:
    """业务模型"""
    name: str
    code: str
    description: str
    category: str
    support_person: Dict[str, str]
    analysis_model: Optional[Dict[str, Any]] = None
    design_model: Optional[Dict[str, Any]] = None
    validation_model: Optional[Dict[str, Any]] = None
    model: Optional[Dict[str, Any]] = None
    teaching: Optional[Dict[str, Any]] = None

@dataclass
class CustomerInfo:
    """客户信息"""
    nature: str = ""  # 企业性质：上市公司/非上市公司/国企/民企
    industry: str = ""  # 行业属性
    stage: str = ""  # 发展阶段
    revenue: str = ""  # 营收规模
    funding_need: str = ""  # 资金需求
    funding_purpose: str = ""  # 资金用途
    equity_structure: str = ""  # 股权结构
    debt_status: str = ""  # 债务状况
    special_needs: str = ""  # 特殊需求

class InvestmentBankingAssistant:
    """投行业务参与助手核心类"""
    
    def __init__(self):
        """初始化助手"""
        self.businesses: List[Business] = []
        self._load_data()
    
    def _load_data(self):
        """加载业务数据"""
        for category_data in BUSINESS_DATA.get('businesses', []):
            category = category_data['category']
            for biz_data in category_data['businesses']:
                business = Business(
                    name=biz_data['name'],
                    code=biz_data['code'],
                    description=biz_data['description'],
                    category=category,
                    support_person=biz_data['support_person'],
                    analysis_model=biz_data.get('analysis_model'),
                    design_model=biz_data.get('design_model'),
                    validation_model=biz_data.get('validation_model'),
                    model=biz_data.get('model'),
                    teaching=biz_data.get('teaching')
                )
                self.businesses.append(business)
    
    def get_all_businesses(self) -> List[Business]:
        """获取所有业务列表"""
        return self.businesses
    
    def get_business_by_name(self, name: str) -> Optional[Business]:
        """根据名称获取业务"""
        for biz in self.businesses:
            if biz.name == name or name in biz.name:
                return biz
        return None
    
    def get_businesses_by_category(self, category: str) -> List[Business]:
        """根据分类获取业务列表"""
        return [biz for biz in self.businesses if biz.category == category]
    
    def recommend_businesses(self, customer_info: CustomerInfo) -> List[Dict]:
        """
        根据客户信息推荐业务
        """
        recommendations = []
        
        # 股权类推荐
        if customer_info.nature == "上市公司":
            if customer_info.funding_need:
                # 定增推荐
                biz = self.get_business_by_name("定增")
                if biz:
                    recommendations.append({
                        "business": biz,
                        "score": 95,
                        "reason": "上市公司股权融资首选，募集资金用于项目建设",
                        "key_points": ["实控人持股比例", "融资用途合规性", "发行时机"]
                    })
                
                # 可转债推荐
                biz = self.get_business_by_name("可转债")
                if biz:
                    recommendations.append({
                        "business": biz,
                        "score": 85,
                        "reason": "兼具债权和股权特性，票面利率较低",
                        "key_points": ["主体评级", "转股溢价率", "票面利率"]
                    })
            
            # 公司债推荐
            biz = self.get_business_by_name("公司债")
            if biz:
                recommendations.append({
                    "business": biz,
                    "score": 80,
                    "reason": "债务融资，期限灵活，发行周期短",
                    "key_points": ["主体评级", "偿债保障", "发行窗口"]
                })
        
        elif customer_info.nature == "非上市公司":
            # IPO推荐
            if customer_info.stage in ["成长", "成熟"] and customer_info.revenue:
                try:
                    revenue_val = self._parse_revenue(customer_info.revenue)
                    if revenue_val >= 1:  # 营收过亿可考虑IPO
                        biz = self.get_business_by_name("IPO")
                        if biz:
                            recommendations.append({
                                "business": biz,
                                "score": 90,
                                "reason": "具备上市基础条件，可选择合适板块申报",
                                "key_points": ["盈利能力", "独立性", "募集资金用途"]
                            })
                except:
                    pass
        
        # 债权类推荐
        if customer_info.funding_need:
            if customer_info.nature == "国有企业":
                biz = self.get_business_by_name("银行间债务工具")
                if biz:
                    recommendations.append({
                        "business": biz,
                        "score": 88,
                        "reason": "国企融资渠道，产品丰富，注册便利",
                        "key_points": ["产品选择", "注册额度", "投资者结构"]
                    })
            
            # ABS推荐
            if "资产" in customer_info.funding_purpose or "盘活" in customer_info.funding_purpose:
                biz = self.get_business_by_name("ABS")
                if biz:
                    recommendations.append({
                        "business": biz,
                        "score": 82,
                        "reason": "盘活存量资产，获得融资资金",
                        "key_points": ["基础资产质量", "现金流稳定性", "交易结构"]
                    })
        
        # 并购类推荐
        if "并购" in customer_info.special_needs or "收购" in customer_info.special_needs:
            if customer_info.nature == "上市公司":
                biz = self.get_business_by_name("上市公司收购资产")
                if biz:
                    recommendations.append({
                        "business": biz,
                        "score": 92,
                        "reason": "上市公司扩张的有效途径",
                        "key_points": ["标的质量", "估值合理性", "协同效应"]
                    })
            else:
                biz = self.get_business_by_name("收购上市公司")
                if biz:
                    recommendations.append({
                        "business": biz,
                        "score": 85,
                        "reason": "产业整合或资本运作",
                        "key_points": ["收购资金来源", "控制权安排", "融资结构"]
                    })
        
        # 破产重整推荐
        if "重整" in customer_info.special_needs or "困境" in customer_info.stage:
            biz = self.get_business_by_name("破产重整")
            if biz:
                recommendations.append({
                    "business": biz,
                    "score": 70,
                    "reason": "挽救具有持续经营价值的困境企业",
                    "key_points": ["重整可行性", "投资人引入", "债权清偿方案"]
                })
        
        # 按分数排序
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations
    
    def _parse_revenue(self, revenue_str: str) -> float:
        """解析营收字符串"""
        revenue_str = revenue_str.replace("亿", "").replace("万", "").replace("元", "").strip()
        try:
            return float(revenue_str)
        except:
            return 0
    
    def generate_teaching(self, business_name: str) -> str:
        """生成业务教学指导"""
        biz = self.get_business_by_name(business_name)
        if not biz or not biz.teaching:
            return f"未找到业务 '{business_name}' 的教学资料"
        
        teaching = biz.teaching
        lines = []
        
        # 业务概述
        lines.append(f"## {biz.name} 业务操作指引")
        lines.append("")
        if 'overview' in teaching:
            lines.append("### 一、业务概述")
            lines.append(teaching['overview'])
            lines.append("")
        
        # 适用情形判定
        lines.append("### 二、适用情形判定标准")
        model = biz.analysis_model or biz.model
        if model:
            for section in model.get('sections', []):
                lines.append(f"**{section['title']}**")
                if 'items' in section:
                    for item in section['items']:
                        lines.append(f"- {item}")
                if 'sub_sections' in section:
                    for sub in section['sub_sections']:
                        lines.append(f"  - {sub['title']}:")
                        for item in sub.get('items', []):
                            lines.append(f"    - {item}")
                lines.append("")
        
        # 关键操作步骤
        if 'operation_steps' in teaching:
            lines.append("### 三、关键操作步骤")
            for i, step in enumerate(teaching['operation_steps'], 1):
                lines.append(f"{i}. **{step['title']}**")
                lines.append(f"   {step['description']}")
            lines.append("")
        
        # 客户需准备的材料
        if 'materials' in teaching:
            lines.append("### 四、客户需准备的材料")
            for item in teaching['materials']:
                lines.append(f"- {item}")
            lines.append("")
        
        # 常见关注点
        if 'key_points' in teaching:
            lines.append("### 五、常见关注点")
            for point in teaching['key_points']:
                lines.append(f"- {point}")
            lines.append("")
        
        # 支持人员信息
        lines.append("### 六、投行支持人员")
        person = biz.support_person
        lines.append(f"- **支持人员**：{person['name']}（工号{person['employee_id']}）")
        lines.append(f"- **支持范围**：{person['scope']}")
        if 'email' in person:
            lines.append(f"- **联系方式**：{person['email']}")
        
        # 推荐提示词（可点击继续对话）
        lines.append("")
        lines.append(f">>> {biz.name}的发行条件和准入标准是什么？")
        lines.append(f">>> {biz.name}找谁支持？")
        lines.append(f">>> 帮我设计一个{biz.name}方案")
        
        return "\n".join(lines)
    
    def get_support_contact(self, business_name: str) -> Dict:
        """获取业务支持人员信息"""
        biz = self.get_business_by_name(business_name)
        if not biz:
            return {"error": f"未找到业务 '{business_name}'"}
        
        return {
            "business": biz.name,
            "category": biz.category,
            "support_person": biz.support_person,
            "description": biz.description
        }
    
    def generate_recommendation_response(self, customer_info: CustomerInfo) -> str:
        """生成业务推荐响应"""
        recommendations = self.recommend_businesses(customer_info)
        
        if not recommendations:
            return """根据您提供的信息，暂未匹配到明确的投行业务机会。

建议补充以下信息以便更精准推荐：
1. 企业性质（上市公司/非上市公司/国企/民企）
2. 营收规模
3. 资金需求金额及用途
4. 是否有特殊需求（如并购意向、重整需求等）"""
        
        lines = ["根据您提供的客户信息，以下投行业务具有较高匹配度：", ""]
        
        for i, rec in enumerate(recommendations[:5], 1):
            biz = rec['business']
            lines.append(f"**{i}. {biz.name}（推荐度：{rec['score']}%）**")
            lines.append(f"- 适用情形：{rec['reason']}")
            lines.append(f"- 关键要素：{', '.join(rec['key_points'])}")
            lines.append(f"- 支持人员：{biz.support_person['name']}（工号{biz.support_person['employee_id']}）")
            lines.append("")
        
        lines.append("---")
        lines.append("您可以询问具体业务的详细操作指引，例如：'定增业务怎么做？'")
        
        # 推荐提示词（可点击继续对话）
        lines.append("")
        if recommendations:
            top_biz = recommendations[0]['business']
            lines.append(f">>> {top_biz.name}业务怎么做？")
            lines.append(f">>> {top_biz.name}找谁支持？")
            if len(recommendations) > 1:
                second_biz = recommendations[1]['business']
                lines.append(f">>> {second_biz.name}适合什么类型的客户？")
            else:
                lines.append(f">>> 客户的现金流和偿债能力如何？")
        
        return "\n".join(lines)


# 全局助手实例
_assistant = None

def get_assistant() -> InvestmentBankingAssistant:
    """获取助手实例（单例模式）"""
    global _assistant
    if _assistant is None:
        _assistant = InvestmentBankingAssistant()
    return _assistant


# Skill API接口

def recommend_business(customer_info_dict: Dict[str, str]) -> str:
    """
    根据客户信息推荐业务
    
    Args:
        customer_info_dict: 客户信息字典
            - nature: 企业性质
            - industry: 行业属性
            - stage: 发展阶段
            - revenue: 营收规模
            - funding_need: 资金需求
            - funding_purpose: 资金用途
            - special_needs: 特殊需求
    
    Returns:
        业务推荐文本
    """
    assistant = get_assistant()
    customer_info = CustomerInfo(**customer_info_dict)
    return assistant.generate_recommendation_response(customer_info)


def teach_business(business_name: str) -> str:
    """
    获取业务教学指导
    
    Args:
        business_name: 业务名称
    
    Returns:
        教学指导文本
    """
    assistant = get_assistant()
    return assistant.generate_teaching(business_name)


def get_support_person(business_name: str) -> Dict:
    """
    获取业务支持人员信息
    
    Args:
        business_name: 业务名称
    
    Returns:
        支持人员信息字典
    """
    assistant = get_assistant()
    return assistant.get_support_contact(business_name)


def list_all_businesses() -> List[Dict]:
    """
    列出所有业务
    
    Returns:
        业务列表
    """
    assistant = get_assistant()
    businesses = assistant.get_all_businesses()
    return [
        {
            "name": b.name,
            "category": b.category,
            "description": b.description,
            "support_person": b.support_person['name']
        }
        for b in businesses
    ]


if __name__ == "__main__":
    # 测试代码
    assistant = get_assistant()
    
    # 测试业务推荐
    print("=" * 50)
    print("业务推荐测试")
    print("=" * 50)
    customer = CustomerInfo(
        nature="上市公司",
        industry="制造业",
        revenue="20亿",
        funding_need="有",
        funding_purpose="扩产"
    )
    print(assistant.generate_recommendation_response(customer))
    
    # 测试教学指导
    print("\n" + "=" * 50)
    print("业务教学测试")
    print("=" * 50)
    print(assistant.generate_teaching("定增"))
    
    # 测试支持人员查询
    print("\n" + "=" * 50)
    print("支持人员查询测试")
    print("=" * 50)
    contact = assistant.get_support_contact("IPO")
    print(f"业务：{contact['business']}")
    print(f"支持人员：{contact['support_person']['name']}")
