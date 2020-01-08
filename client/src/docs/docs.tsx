/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaGrinStars } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { Definition, Frame, ImagePointer, PageLink, PageName, PAGES, Picture } from "./doc-parts"
import { Intro } from "./intro"

export function Docs({cancel}: { cancel: () => void }): JSX.Element {
    const [page, setPage] = useState(PageName.Main)
    return (
        <div className="w-100 h-100 p-3" style={{
            backgroundColor: "#494949",
            color: "#d4d4d4",
        }}>
            <div className="text-center my-3">
                <h2>pretenst.com</h2>
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
                            key={PageName[p]}
                            color={p === page ? "success" : "secondary"}
                            onClick={() => setPage(p)}
                        >
                            {PageName[p]}
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

function PageContent({page}: { page: PageName }): JSX.Element {
    switch (page) {
        case PageName.Main:
            return Intro()
        case PageName.Tensegrity:
            return (
                <div>
                    <h3>Tensegrity Page</h3>
                    <Frame>
                        Documentation coming soon....
                    </Frame>
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
                        <PageLink page={PageName.Main}/>
                    </Frame>
                </div>
            )
    }
}
