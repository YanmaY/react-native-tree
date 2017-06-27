import React, { PropTypes } from 'react';
import {ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

class Tree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: {},       // 所有节点 key:value 键值对 value为true时展开，否则收起
            selected: {},       // 所有节点 key:value 键值对 value为true时选中，否则不选
            expandedKeys: [],   // 所有展开节点 key 数组
            selectedKeys: [],   // 所有选中节点 key 数组
            selectedNodes: [],  // 所有选中节点数组
        }
    }

    /**
     * 数组转key:true 格式对象
     * @param {*} array 
     * @param {*} obj 
     */
    arrayToObj(array) {
        let obj = {};
        if (array && array.length > 0) {
            array.map(item => obj[item] = true);
        }
        return obj;
    }

    componentWillMount() {
        let {expandedKeys, selectedKeys, defaultSelectedKeys, defaultExpandedKeys, defaultExpandAll, defaultExpandRoot, treeData} = this.props;
        let tempExpandedKeys = [];
        let expanded = {};
        let selected = {};
        
        // 默认展开根节点
        if (defaultExpandRoot) {
            if(treeData && treeData.length === 1) {
                tempExpandedKeys = [treeData[0].key];
                expanded[treeData[0].key] = true;
            }
        }

        // 默认展开所有节点
        if (defaultExpandAll) {
            tempExpandedKeys = [];
            this.traverseTree(treeData, (node) => {
                tempExpandedKeys.push(node.key);
                expanded[node.key] = true;
            });
        }

        // 受控或默认展开和选择的节点
        if (expandedKeys || defaultExpandedKeys) {
            expanded = this.arrayToObj(expandedKeys || defaultExpandedKeys);
        }

        if (selectedKeys || defaultSelectedKeys) {
            selected = this.arrayToObj(selectedKeys || defaultSelectedKeys);
        }
        
        this.setState({
            expanded: expanded,
            selected: selected,
            expandedKeys: defaultExpandedKeys || tempExpandedKeys,
            selectedKeys: defaultSelectedKeys || [],
        })
    }
    /**
     * @param  {Array} treeData
     * @param  {function (treeNode)} operation
     */
    traverseTree(treeData, operation) {
        if (!(treeData instanceof Array)) {
            console.error("treeData必须为数组");
            return;
        }
        if (!(operation instanceof Function)) {
            console.error("operation必须为函数");
            return;
        }
        treeData.map(node => {
            operation(node);
            node && node.children && node.children.length > 0 && this.traverseTree(node.children, operation);
        })
    }
    /**
     * expandedKeys （受控）展开指定的树节点
     * selectedKeys （受控）选中指定的树节点
     * @param {{expandedKeys, selectedKeys}} nextProps 
     */
    componentWillReceiveProps(nextProps) {
        const {expandedKeys, selectedKeys} = nextProps;
        if (this.props.selectedKeys !== selectedKeys) {
            let selected = this.arrayToObj(selectedKeys);
            this.setState({
                expandedKeys: expandedKeys,
                selectedKeys: selectedKeys,
            })
        }
        if (this.props.expandedKey !== expandedKeys) {
            let expanded = this.arrayToObj(expandedKeys);    
            this.setState({
                expanded: expanded,
                selected: selected,
            })
        }
    }
    
    /**
     * 选择节点事件触发
     * @param {TreeNode} node 
     */
    onSelect(node) {
        let {selectedKeys, selected, expanded, selectedNodes} = this.state;
        const {onSelect, multiple, checkable, checkStrictly} = this.props;
        let isSelected = selected[node.key];
        selected[node.key] = !isSelected;
        // 父子节点关联关系
        let selectNode = (node) => {
            if (!!!node || !!!node.children || node.children.length === 0) {
                return;
            }

            let childNum = 0;
            let childSelectAllNum = 0;
            // 计算子节点选中数量
            let childrenKeys = node.children.map(item => {
                if (selected[item.key] === true) {
                    childNum++;
                    childSelectAllNum++;
                }
                if (selected[item.key] === null) {
                    childNum++;
                } 
            });
            node.children.map(item => {
                selected[item.key] = !isSelected;
                // 如果子节点有子节点并处于展开状态，则递归选中
                if (expanded[item.key]) {
                    selectNode(item);
                } 
            });
            if (childSelectAllNum === node.children.length) {  // 当全部选中时
                selectedKeys = selectedKeys.filter(key => -1 === childrenKeys.indexOf(key));
                selectedNodes = selectedNodes.filter(item => -1 === childrenKeys.indexOf(item.key));
            } else if (childNum === 0) {  // 当全没选中时
                selectedKeys = selectedKeys.concat(childrenKeys);
                selectedNodes = selectedNodes.concat(node.children);
            } else {  // 当部分选中时
                childrenKeys.map(item => {
                    if (selectedKeys.indexOf(item) === -1) {
                        selectedKeys.push(item);
                    }
                });
                node.children.map(item => {
                    if (selectedKeys.indexOf(item) === -1) {
                        selectedNodes.push(item);
                    }
                });
            }
        }
        // 建立子父关系
        let parentSelect = (parentNode) => {
            if (parentNode) {
                let siblingNum = 0;
                let siblingAllSelectedNum = 0;
                parentNode.children.map(item => {
                    if (selected[item.key] === true) { 
                        siblingNum++;
                        siblingAllSelectedNum++;
                    }
                    if (selected[item.key] === null) { 
                        siblingNum++;
                    }   
                });
                //console.log(parentNode.label, siblingNum, 'parentNode');
                if (siblingNum === 0) {
                    selected[parentNode.key] = false;
                    selectedKeys = selectedKeys.filter(key => key !== parentNode.key);
                    selectedNodes = selectedNodes.filter(item => item.key !== parentNode.key);
                } else if (siblingAllSelectedNum === parentNode.children.length) {
                    selected[parentNode.key] = true;
                    selectedKeys.push(parentNode.key);
                    selectedNodes.push(parentNode);
                } else {
                    selected[parentNode.key] = null;
                    selectedKeys = selectedKeys.filter(key => key !== parentNode.key);
                    selectedNodes = selectedNodes.filter(item => item.key !== parentNode.key);
                }
                parentSelect(parentNode.parentNode);
            } 
        }
        // 多选父子节点不建立关联关系
        let multipleSelect = () => {
            if (isSelected) {
                selectedKeys = selectedKeys.filter(key => key !== node.key);
                selectedNodes = selectedNodes.filter(item => item.key !== node.key);
            } else {
                selectedKeys.push(node.key);
                selectedNodes.push(node);
            }
        }
        // 单选
        let singleSelect = () => {
            selectedKeys = [node.key];
            selected = {};
            selected[node.key] = true;
            selectedNodes = [node];
        }
        /**
         * 1. 如果定义checkable则建立父子节点关联关系
         * 2. 如果定义checkStrictly则取消父子节点关联关系
         * 3. 如果定义multiple则多选
         */ 

        if (checkable) {
            if (checkStrictly) {
                if (multiple) {
                    multipleSelect();
                } else {
                    singleSelect();
                }
            } else {
                selectNode(node);
                parentSelect(node.parentNode);
            }
        } else {
            if (multiple) {
                multipleSelect();
            } else {
                singleSelect();
            }
        }
        
        this.setState({
            selectedKeys: selectedKeys,
            selected: selected,
            selectedNodes: selectedNodes
        })
        
        onSelect && onSelect(selectedKeys, {
            selected: !isSelected, 
            selectedNodes: selectedNodes, 
            node: node
        }); 
    }
    
    /**
     * 点击展开或收起图标时触发
     * @param {TreeNode} node 
     */
    onExpand(node) {
        const {checkable, checkStrictly} = this.props;
        let {expandedKeys, expanded, selected, selectedKeys, selectedNodes} = this.state;
        const {key, children} = node;
        const {onExpand} = this.props;
        let isExpanded = expanded[key];
        expanded[key] = !isExpanded;
        
        if (isExpanded) {
            expandedKeys = expandedKeys.filter(expandedKey => expandedKey !== key);
        } else {
            expandedKeys.push(key);
        }

        if (selected[key] === true && checkable && !checkStrictly) {
            children && children.map(item => {
                if (isExpanded) {
                    selected[item.key] = false;
                    selectedKeys = selectedKeys.filter(selectedKey => selectedKey !== item.key);
                    selectedNodes = selectedNodes.filter(selectedNode => selectedNode.key !== item.key);
                } else {
                    selected[item.key] = true;
                    selectedKeys.push(item.key);
                    selectedNodes.push(item);
                }
            });
        }
        
        this.setState({
            expandedKeys: expandedKeys,
            expanded: expanded,
            selectedKeys: selectedKeys,
            selected: selected,
            selectedNodes: selectedNodes
        })
        onExpand && onExpand(expandedKeys, {
            expanded: !isExpanded, 
            node: node
        }); 
        this.setState({expanded: expanded, expandedKeys: expandedKeys});
    }
    
    /**
     * 渲染树节点图标和文字
     * @param {TreeNode} node 
     */
    renderItem(node) {
        const {checkable, checkStrictly} = this.props;
        let {expanded, selected} = this.state;
        let {expandedKeys, selectedKeys, showLine, iconSize, expandIconSize} = this.props;
        const {key, children, icon, label, disabled} = node;
        // 受控展开和选择的节点
        if (expandedKeys) {
            expanded = this.arrayToObj(expandedKeys);
        }

        if (selectedKeys) {
            selected = this.arrayToObj(selectedKeys);
        }
        
        iconSize = iconSize || 15;
        expandIconSize = expandIconSize || 11;
        let expandIconColor = '#333'
        const hasChildren = children && children.length > 0;
        let expandIcon = expanded[key] ? 'caret-down' : 'caret-right';
        
        if (showLine) {
            expandIconColor = '#888'
            expandIcon = expanded[key] ? 'minus-square-o' : 'plus-square-o';
        }

        let selectIcon = selected[key] ? 'check-square' : 'square-o';
        
        // 父子节点有关联，如果传入父节点key，则子节点自动选中, 反之亦然
        if (checkable && !checkStrictly) {
            if (selected[key] === false || selected[key] === undefined) {
                selectIcon = 'square-o';     // 子节点全不选
            } else if (selected[key] === true) {
                selectIcon = 'check-square'  // 子节点全选
            } else {
                selectIcon = 'minus-square'  // 子节点部分选中
            }
        }
        let selectColor = '#108EE9';
        let textStyle = {};
        if (disabled) {
            selectColor = '#D0D0D0';
            textStyle.color = '#D0D0D0';
        }
        
        textStyle.marginLeft = 2;
        if (selected[key]) {
            textStyle.backgroundColor = '#D2EAFB'
        }

        let textNode;
        if (typeof label === 'string') {
            textNode = <Text style={textStyle}>{label} </Text>
        } else {
            textNode = <View>{label}</View>
        }

        return (
            <View style={styles.item}>
                {hasChildren && 
                <Icon 
                    onPress={this.onExpand.bind(this, node)} 
                    style={[styles.icon, {color: expandIconColor}]} 
                    size={expandIconSize} 
                    name={expandIcon} 
                />}
                {checkable && 
                <Icon 
                    onPress={disabled ? ()=>{} : this.onSelect.bind(this, node)} 
                    style={[styles.icon, {color: selectColor}]} 
                    size={iconSize} 
                    name={selectIcon} 
                />}
                {icon && 
                <Icon 
                    style={styles.icon} 
                    size={iconSize} 
                    name={icon} 
                />}
                <TouchableOpacity
                    onPress={this.onSelect.bind(this, node)}
                >
                    {textNode}
                </TouchableOpacity>
            </View>
        )
    }

    /**
     * 渲染树节点
     * 单个根节点使用此入口
     * 和renderTree递归
     * @param {TreeNode} node 
     * @param {TreeNode} parentNode 父节点
     */
    renderNode(node, parentNode) {
        const {expanded} = this.state
        const {renderItem, showLine} = this.props
        const hasChildren = node.children && node.children.length > 0
        let childrenStyle = styles.children;
        if (showLine) {
            childrenStyle = styles.leftLine;
        }
        node.parentNode = parentNode;
        return (
            <View key={node.key} style={styles.node} >
                {this.renderItem(node)}
                {hasChildren && 
                <View style={childrenStyle}>
                    {expanded[node.key] && this.renderTree(node.children, node)}
                </View>
                }
            </View>
        )
    }

    /**
     * 渲染树节点
     * 多个根节点使用此入口
     * 和renderNode递归
     * @param {Array<TreeNode>} data 
     * @param {TreeNode} parentNode 父节点
     */
    renderTree(data, parentNode) {
        const nodes = [];
        for (const i = 0; i < data.length; i++) {
            nodes.push(this.renderNode(data[i], parentNode))
        }
        return nodes
    }

    render() {
        return <ScrollView style={this.props.treeStyle || styles.tree}>
            {this.renderTree(this.props.treeData || [], null)}
        </ScrollView>
    }
}
const iconWidth = 20;
const lineMarginLeft = 4;
const styles = {
    tree: {
        padding: 10,
        height: ScreenHeight - 90,
    },
    node: {
        paddingTop: 10
    },
    item: {
        flexDirection: 'row',
    },
    children: {
        paddingLeft: iconWidth,
        
    },
    icon: {
        width: iconWidth,
        alignSelf: 'center'
    },
    leftLine: {
        marginLeft: lineMarginLeft,
        paddingLeft: iconWidth - lineMarginLeft - 1,
        borderLeftWidth: 1,
        borderLeftColor: '#d9d9d9',
        borderStyle: 'solid',
    }
}
Tree.propTypes = {
	treeData: PropTypes.array.isRequired,
};
export default Tree