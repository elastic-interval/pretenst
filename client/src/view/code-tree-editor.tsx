/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import SortableTree, { TreeItem } from "react-sortable-tree"

import { ICodeTree } from "../fabric/tensegrity-brick-types"

import { ICode } from "./code-panel"

function codeTreeToTitle(prefix: string, codeTree: ICodeTree): JSX.Element {
    const scaleStatement = codeTree.S ? ` scaled ${codeTree.S._}%` : ""
    const steps = codeTree._
    const stepStatement = `${steps} ${steps === 1 ? "step" : "steps"}`
    switch (prefix) {
        case "A":
        case "B":
        case "C":
            return (
                <div>{prefix} {stepStatement} {scaleStatement}</div>
            )
        case "":
            return (
                <div>Ahead {stepStatement} {scaleStatement}</div>
            )
        default:
            return (
                <div>?{prefix}{codeTree._.toString()}?</div>
            )
    }
}

function codeTreeToTreeData(prefix: string, codeTree?: ICodeTree): TreeItem[] {
    if (!codeTree) {
        return []
    }
    const node: TreeItem = {
        title: codeTreeToTitle(prefix, codeTree),
        expanded: true,
        children: [
            ...codeTreeToTreeData("A", codeTree.A),
            ...codeTreeToTreeData("B", codeTree.B),
            ...codeTreeToTreeData("C", codeTree.C),
        ],
        prefix,
        steps: codeTree._,
        scale: codeTree.S,
    }
    return [node]
}

function treeDataToCodeString(treeItems: TreeItem[]): string {
    if (treeItems.length === 0) {
        return ""
    }
    const node = treeItems[0]
    const children = node.children as TreeItem[]
    const childrenCode = children.map(treeItem => treeDataToCodeString([treeItem]))
    const scale = node.scale
    if (scale) {
        childrenCode.unshift(`S[${scale._}]`)
    }
    childrenCode.unshift(node.steps)
    const childrenString = childrenCode.length > 0 ? `[${childrenCode.join(",")}]` : ""
    return `${node.prefix}${childrenString}`
}

export function CodeTreeEditor({code, setCode}: {
    code: ICode,
    setCode: (code: ICode) => void,
}): JSX.Element {

    const [treeData, setTreeData] = useState<TreeItem[]>([])
    useEffect(() => setTreeData(codeTreeToTreeData("", code.codeTree)), [code])
    const [codeString, setCodeString] = useState(code.codeString)
    useEffect(() => setCodeString(treeDataToCodeString(treeData)), [treeData])

    return (
        <div>
            <pre style={{color: "white", height: "10%"}}>
{code.codeString}
                <br/>
                {codeString}
            </pre>
            <SortableTree
                style={{height: "90%", backgroundColor: "#7d7d7d"}}
                treeData={treeData}
                onChange={setTreeData}
                isVirtualized={false}
            />
        </div>
    )
}
