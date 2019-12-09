/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaGrinStars } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

enum Page {
    Main,
    Tensegrity,
}

const PAGES: Page[] = Object.keys(Page).filter(key => key.length > 2).map(key => Page[key])

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
            }} className="text-center mx-4 p-4">
                <div>
                    <PageContent page={page}/>
                </div>
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
                    <Button onClick={cancel}><FaGrinStars/> Ok go!</Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

function Loop({name}: { name: string }): JSX.Element {
    return (
        <video style={{borderRadius: "2em"}} width="30%" controls={false} loop={true} autoPlay={true}>
            <source src={`/pretenst/movies/${name}.mp4`} type="video/mp4"/>
            Your browser does not support the video tag.
        </video>
    )
}

function PageContent({page}: { page: Page }): JSX.Element {
    switch (page) {
        case Page.Main:
            return (
                <div>
                    Here's a movie:
                    <Loop name="zero-pretenst"/>
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

