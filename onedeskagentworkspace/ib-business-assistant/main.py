#!/usr/bin/env python3
"""
投行业务参与助手 - 交互入口
支持命令行和API两种模式
"""

import sys
import json
import argparse
from typing import Dict, Any
from skill import (
    recommend_business,
    teach_business,
    get_support_person,
    list_all_businesses,
    CustomerInfo,
    get_assistant
)
from business_data import BUSINESS_KEYWORDS

def print_help():
    """打印帮助信息"""
    help_text = """
投行业务参与助手 - 帮助指南

【使用场景】
本助手面向非投行部门员工，帮助识别客户投行业务机会，获得展业指导，匹配投行支持资源。

【使用方法】

1. 业务推荐模式
   输入客户信息，获取业务推荐：
   
   示例对话：
   > 我手头有个制造业上市公司客户，营收20亿，想融资扩产，有什么业务可以推荐？
   
   助手会分析：
   - 客户性质：上市公司
   - 资金需求：扩产（项目建设）
   - 推荐业务：定增、可转债、公司债

2. 业务教学模式
   询问具体业务的操作指引：
   
   示例对话：
   > 定增业务怎么做？
   > IPO业务如何开展？
   
   助手会输出：
   - 业务概述
   - 适用情形判定标准
   - 关键操作步骤
   - 客户需准备的材料
   - 常见关注点
   - 投行支持人员信息

3. 支持人员查询模式
   查询业务的投行支持人员：
   
   示例对话：
   > IPO业务找谁支持？
   > 定增业务的对接人是谁？
   
   助手会输出：
   - 支持人员姓名、工号
   - 支持范围
   - 联系方式

【业务分类】

股权类：
- 定增：定向增发股票融资
- IPO：首次公开发行并上市
- 可转债：发行可转换公司债券

债权类：
- 公司债：公司发行债券融资
- 银行间债务工具：短融、中票、PPN等
- ABS：资产支持证券

并购类：
- 上市公司收购资产：上市公司发行股份或现金购买资产
- 收购上市公司：取得上市公司控制权
- 破产重整：困境企业重整挽救

客户服务类：
- 买方分析：识别潜在投资者
- 信披判断：判断信息披露合规性
- 临时公告生成：辅助生成公告文本

【关键词】

触发业务推荐：
- "推荐业务"
- "客户能做什么业务"
- "适合什么产品"

触发业务教学：
- "怎么做"
- "如何开展"
- "业务指导"
- "操作步骤"

触发人员查询：
- "找谁支持"
- "联系哪位"
- "对接人"

【注意事项】
1. 推荐结果基于客户提供的信息，实际可行性需投行部门尽调后确定
2. 业务操作指引仅供参考，具体项目需遵循监管规定及公司内部制度
3. 涉及客户信息的讨论请遵守公司保密制度
"""
    print(help_text)


def print_capabilities():
    """打印能力介绍"""
    capabilities = """
我是您的AI业务助手，当前已加载以下能力模块：

【投行业务】12项业务类型
• 股权类：定增、IPO、可转债 — 根据客户资质推荐融资方案
• 债权类：公司债、银行间债务工具、ABS — 匹配债务融资需求  
• 并购类：收购资产、收购上市公司、破产重整 — 识别并购重组机会
• 客户服务：买方分析、信披判断、公告生成 — 辅助日常客户服务

【我能帮您】
1. 识别业务机会 — 描述客户情况，我推荐适合的业务类型
2. 获取操作指引 — 询问"怎么做"，我提供步骤和材料清单
3. 对接支持人员 — 查询各业务的投行专业人员

请直接描述您的客户情况或需求，我开始协助您。"""
    print(capabilities)


def is_greeting(text: str) -> bool:
    """检测是否为问候语"""
    greetings = ['你好', '您好', '嗨', 'hello', 'hi', '在吗', '在', '有人吗', '开始', '启动']
    return any(g in text.lower() for g in greetings)


def is_irrelevant(text: str) -> bool:
    """检测是否为业务无关内容"""
    # 如果既不包含业务关键词，也不包含客户信息相关词，视为无关
    business_keywords = list(BUSINESS_KEYWORDS.keys()) + [
        '客户', '公司', '企业', '融资', '资金', '上市', '并购', '收购', '债务', '资产',
        '推荐', '适合', '匹配', '分析', '指导', '教学', '步骤', '材料', '怎么做',
        '找谁', '联系', '支持', '对接', '帮助', '咨询'
    ]
    return not any(kw in text for kw in business_keywords)


def interactive_mode():
    """交互模式"""
    print("=" * 60)
    print("AI业务助手已就绪")
    print("=" * 60)
    print_capabilities()
    
    # 存储会话中的客户信息
    session_customer_info: Dict[str, str] = {}
    
    while True:
        try:
            user_input = input("\n> ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in ['exit', 'quit', '退出']:
                print("感谢使用，再见！")
                break
            
            if user_input.lower() in ['help', '帮助', '?']:
                print_help()
                continue
            
            if user_input.lower() in ['list', '列表']:
                businesses = list_all_businesses()
                print("\n【业务列表】")
                current_category = ""
                for biz in businesses:
                    if biz['category'] != current_category:
                        current_category = biz['category']
                        print(f"\n【{current_category}】")
                    print(f"  - {biz['name']}：{biz['description']}")
                continue
            
            # 检测问候语
            if is_greeting(user_input) or is_irrelevant(user_input):
                print_capabilities()
                print("\n💡 您可以直接描述客户情况，例如：")
                print('   "我手头有个制造业上市公司客户，营收20亿，想融资扩产"')
                continue
            
            # 处理业务推荐请求
            if any(kw in user_input for kw in ['推荐', '适合', '能做什么', '有什么业务', '匹配']):
                # 尝试从输入中提取客户信息
                customer_info = extract_customer_info(user_input, session_customer_info)
                
                # 如果信息不完整，询问补充
                if not is_info_complete(customer_info):
                    ask_for_missing_info(customer_info, session_customer_info)
                    continue
                
                # 生成推荐
                response = recommend_business(customer_info)
                print(f"\n{response}")
                continue
            
            # 处理业务教学请求
            if any(kw in user_input for kw in ['怎么做', '如何做', '指导', '步骤', '教学', '操作']):
                business_name = extract_business_name(user_input)
                if business_name:
                    response = teach_business(business_name)
                    print(f"\n{response}")
                else:
                    print("\n请指定具体业务名称，例如：'定增业务怎么做？'")
                continue
            
            # 处理支持人员查询
            if any(kw in user_input for kw in ['找谁', '联系', '对接人', '谁负责', '支持']):
                business_name = extract_business_name(user_input)
                if business_name:
                    contact = get_support_person(business_name)
                    if 'error' not in contact:
                        print(f"\n【{contact['business']}】支持人员")
                        person = contact['support_person']
                        print(f"支持人员：{person['name']}（工号{person['employee_id']}）")
                        print(f"支持范围：{person['scope']}")
                        if 'email' in person:
                            print(f"联系方式：{person['email']}")
                    else:
                        print(f"\n{contact['error']}")
                else:
                    print("\n请指定具体业务名称，例如：'IPO业务找谁支持？'")
                continue
            
            # 处理具体业务名称直接查询
            business_name = extract_business_name(user_input)
            if business_name:
                print(f"\n您是希望了解 '{business_name}' 的业务详情吗？")
                print("输入：'怎么做' 查看操作指引，'找谁' 查看支持人员")
                continue
            
            # 无法识别的输入
            print("\n抱歉，我未能理解您的需求。")
            print("您可以尝试：")
            print("- '推荐业务'：根据客户信息推荐业务")
            print("- '定增怎么做'：获取业务操作指引")
            print("- 'IPO找谁'：查询业务支持人员")
            print("- 'help'：查看详细帮助")
            
        except KeyboardInterrupt:
            print("\n\n感谢使用，再见！")
            break
        except Exception as e:
            print(f"\n处理出错：{e}")


def extract_customer_info(user_input: str, session_info: Dict[str, str]) -> Dict[str, str]:
    """从用户输入中提取客户信息"""
    info = session_info.copy()
    
    # 提取企业性质
    if '上市公司' in user_input:
        info['nature'] = '上市公司'
    elif '非上市' in user_input or '未上市' in user_input:
        info['nature'] = '非上市公司'
    elif '国企' in user_input or '国有' in user_input:
        info['nature'] = '国有企业'
    elif '民营' in user_input or '民企' in user_input:
        info['nature'] = '民营企业'
    
    # 提取行业
    industries = ['制造业', '科技', '金融', '房地产', '医药', '能源', '消费']
    for ind in industries:
        if ind in user_input:
            info['industry'] = ind
            break
    
    # 提取发展阶段
    stages = ['初创', '成长', '成熟', '转型', '困境']
    for stage in stages:
        if stage in user_input:
            info['stage'] = stage
            break
    
    # 提取营收规模
    import re
    revenue_match = re.search(r'(\d+(?:\.\d+)?)\s*(亿|万)?', user_input)
    if revenue_match:
        info['revenue'] = revenue_match.group(0)
    
    # 提取资金需求
    if any(kw in user_input for kw in ['融资', '资金', '借钱', '贷款']):
        info['funding_need'] = '有'
    
    # 提取资金用途
    purposes = ['扩产', '建设', '并购', '收购', '偿还债务', '补充流动', '研发']
    for purpose in purposes:
        if purpose in user_input:
            info['funding_purpose'] = purpose
            break
    
    # 提取特殊需求
    if any(kw in user_input for kw in ['并购', '收购', '整合']):
        info['special_needs'] = '并购意向'
    elif any(kw in user_input for kw in ['重整', '困境', '亏损']):
        info['special_needs'] = '重整需求'
    
    return info


def is_info_complete(info: Dict[str, str]) -> bool:
    """判断客户信息是否完整到可以推荐"""
    # 最低要求：知道企业性质
    return 'nature' in info and info['nature']


def ask_for_missing_info(info: Dict[str, str], session_info: Dict[str, str]):
    """询问缺失的关键信息"""
    questions = []
    
    if 'nature' not in info or not info['nature']:
        questions.append("请问客户是上市公司还是非上市公司？（或国企/民企）")
    
    if 'funding_need' not in info or not info['funding_need']:
        questions.append("客户是否有融资需求？（有/无）")
    
    if not questions:
        # 信息足够，存储到会话
        session_info.update(info)
        print("\n正在根据您提供的信息进行业务推荐...")
        response = recommend_business(info)
        print(response)
    else:
        print(f"\n为了更精准地推荐业务，请补充以下信息：")
        for i, q in enumerate(questions, 1):
            print(f"{i}. {q}")
        # 临时存储已收集的信息
        session_info.update(info)


def extract_business_name(user_input: str) -> str:
    """从用户输入中提取业务名称"""
    for keyword, business in BUSINESS_KEYWORDS.items():
        if keyword in user_input:
            return business
    return None


def api_mode(args):
    """API模式 - 接收JSON输入，输出JSON结果"""
    try:
        if args.input:
            # 从文件读取
            with open(args.input, 'r', encoding='utf-8') as f:
                request = json.load(f)
        else:
            # 从标准输入读取
            request = json.load(sys.stdin)
        
        action = request.get('action')
        
        if action == 'recommend':
            customer_info = request.get('customer_info', {})
            response_text = recommend_business(customer_info)
            result = {
                'success': True,
                'action': 'recommend',
                'response': response_text
            }
        
        elif action == 'teach':
            business_name = request.get('business_name', '')
            response_text = teach_business(business_name)
            result = {
                'success': True,
                'action': 'teach',
                'response': response_text
            }
        
        elif action == 'contact':
            business_name = request.get('business_name', '')
            contact = get_support_person(business_name)
            result = {
                'success': True,
                'action': 'contact',
                'data': contact
            }
        
        elif action == 'list':
            businesses = list_all_businesses()
            result = {
                'success': True,
                'action': 'list',
                'data': businesses
            }
        
        else:
            result = {
                'success': False,
                'error': f'未知操作: {action}'
            }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))


def main():
    """主入口"""
    parser = argparse.ArgumentParser(description='投行业务参与助手')
    parser.add_argument('--api', action='store_true', help='API模式')
    parser.add_argument('-i', '--input', help='输入JSON文件（API模式）')
    parser.add_argument('-o', '--output', help='输出JSON文件（API模式）')
    
    args = parser.parse_args()
    
    if args.api:
        api_mode(args)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
