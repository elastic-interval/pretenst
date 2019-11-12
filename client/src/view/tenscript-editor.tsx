/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaRunning, FaSignOutAlt } from "react-icons/all"
import SortableTree, { TreeItem } from "react-sortable-tree"
import { Button } from "reactstrap"

import { codeToTenscriptTree, ITenscript, ITenscriptTree } from "../fabric/tenscript"

export function TenscriptEditor({tenscript, growTenscript, leaveEditMode}: {
    tenscript: ITenscript,
    growTenscript: (tenscript: ITenscript) => void,
    leaveEditMode: () => void,
}): JSX.Element {

    const [treeData, setTreeData] = useState<TreeItem[]>([])
    useEffect(() => setTreeData(codeTreeToTreeData("", tenscript.tree)), [tenscript])
    const [codeString, setCodeString] = useState(tenscript.code)
    useEffect(() => setCodeString(treeDataToCodeString(treeData)), [treeData])

    function onRun(): void {
        const codeTree = codeToTenscriptTree(error => console.error(error), codeString)
        if (!codeTree) {
            return
        }
        growTenscript({code: codeString, tree: codeTree})
    }

    return (
        <div className="w-100 my-4">
            <div style={{
                backgroundColor: "#7d7d7d",
                borderRadius: "1.078em",
                overflowY: "scroll",
                padding: "1em",
                width: "100%",
            }}>
                <SortableTree
                    rowHeight={() => 30}
                    treeData={treeData}
                    onChange={setTreeData}
                    isVirtualized={false}
                />
            </div>
            <div style={{
                position: "fixed",
                bottom: 0,
                height: "5em",
                textAlign: "center",
                width: "40em",
            }}>
                <Button color="success" className="m-3" onClick={onRun}><FaRunning/></Button>
                <Button color="warning" className="m-3" onClick={leaveEditMode}><FaSignOutAlt/></Button>
            </div>
        </div>
    )
}

function codeTreeToTitle(prefix: string, codeTree: ITenscriptTree): JSX.Element {
    const scaleStatement = codeTree.S ? ` scaled ${codeTree.S._}%` : ""
    const steps = codeTree._
    const stepStatement = `${steps} ${steps === 1 ? "step" : "steps"}`
    switch (prefix) {
        case "A":
        case "B":
        case "C":
        case "D":
        case "a":
        case "b":
        case "c":
        case "d":
            return (
                <div>{prefix} {stepStatement} {scaleStatement}</div>
            )
        case "":
            return (
                <div>Ahead {stepStatement} {scaleStatement}</div>
            )
        default:
            return (
                <div>?{prefix}{codeTree._ ? codeTree._.toString() : 0}?</div>
            )
    }
}

function codeTreeToTreeData(prefix: string, codeTree?: ITenscriptTree): TreeItem[] {
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
            ...codeTreeToTreeData("D", codeTree.D),
            ...codeTreeToTreeData("b", codeTree.b),
            ...codeTreeToTreeData("c", codeTree.c),
            ...codeTreeToTreeData("d", codeTree.d),
            ...codeTreeToTreeData("a", codeTree.a),
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
        childrenCode.unshift(`S${scale._}`)
    }
    childrenCode.unshift(node.steps)
    const childrenString = childrenCode.length > 0 ? `(${childrenCode.filter(code => !!code && code.length > 0).join(",")})` : ""
    return `${node.prefix}${childrenString}`
}
