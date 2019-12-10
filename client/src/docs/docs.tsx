/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaGrinStars } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { Definition, Frame, ImagePointer, Loop, Page, PageLink, PAGES, Picture } from "./doc-parts"


export function Docs({cancel}: { cancel: () => void }): JSX.Element {
    const [page, setPage] = useState(Page.Main)
    return (
        <div className="w-100 h-100 p-3" style={{
            backgroundColor: "#494949",
            color: "#d4d4d4",
        }}>
            <div className="text-center my-3">
                <h2>About Pretenst</h2>
            </div>
            <div style={{
                borderColor: "#c8c8c8",
                borderWidth: "3px",
                height: "calc(100% - 8em)",
                borderStyle: "solid",
                borderRadius: "2em",
            }} className="mx-4 p-4">
                <PageContent page={page}/>
            </div>
            <div className="w-100 fixed-bottom my-3 text-center">
                <ButtonGroup>
                    {PAGES.map(p => (
                        <Button
                            key={Page[p]}
                            color={p === page ? "success" : "secondary"}
                            onClick={() => setPage(p)}
                        >
                            {Page[p]}
                        </Button>
                    ))}
                </ButtonGroup>
                <ButtonGroup className="mx-2">
                    <Button color="warning" onClick={cancel}><FaGrinStars/> Ok go!</Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

function PageContent({page}: { page: Page }): JSX.Element {
    switch (page) {
        case Page.Main:
            return (
                <div style={{
                    display: "flex",
                    width: "100%",
                }}>
                    <Loop name="zero-pretenst" caption="The Zero Shape"/>
                    <Frame>
                        <Definition term="Pretenst">
                            A misspelling of the word "pretensed".
                        </Definition>
                    </Frame>
                    <Picture name="optimize" caption="Something to optimize"/>
                    <Frame>
                        <ImagePointer name="optimize" x={10} y={10}>Picture pointer</ImagePointer>
                    </Frame>
                    <Frame>
                        <PageLink page={Page.Tensegrity}/>
                    </Frame>
                </div>
            )
        case Page.Tensegrity:
            return (
                <div>
                    Tensegrity
                </div>
            )
    }
}

