/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { default as React, useEffect, useState } from "react"

export enum Page {
    Main,
    Tensegrity,
}

export const PAGES: Page[] = Object.keys(Page).filter(key => key.length > 2).map(key => Page[key])

export function Frame({children}: {
    children: JSX.Element | JSX.Element[] | string,
}): JSX.Element {
    return (
        <div className="m-3 p-2" style={{
            borderRadius: "1em",
            borderStyle: "solid",
            borderWidth: "0.1em",
            borderColor: "#45782e",
        }}>
            {children}
        </div>
    )
}

export function Loop({name, caption}: { name: string, caption: string }): JSX.Element {
    return (
        <div style={{
            borderRadius: "1em",
            borderColor: "#acacac",
            borderWidth: 3,
            borderStyle: "solid",
        }}>
            <video
                style={{borderTopLeftRadius: "1em", borderTopRightRadius: "1em"}}
                height="300"
                controls={false} loop={true} autoPlay={true}>
                <source src={`/pretenst/movies/${name}.mp4`} type="video/mp4"/>
                Your browser does not support the video tag.
            </video>
            <h5 className="w-100 text-center">{caption}</h5>
        </div>
    )
}

export function PageLink({page}: { page: Page }): JSX.Element {
    return (
        <a href={`#${Page[page]}`}>{Page[page]}</a>
    )
}

export function Picture({name, caption}: { name: string, caption: string }): JSX.Element {
    return (
        <div style={{
            borderRadius: "1em",
            borderColor: "#acacac",
            borderWidth: 3,
            borderStyle: "solid",
        }}>
            <img
                style={{borderTopLeftRadius: "1em", borderTopRightRadius: "1em"}}
                id={name}
                src={`/pretenst/images/${name}.png`}
                alt={name}
            />
            <h5 className="w-100 text-center">{caption}</h5>
        </div>
    )
}

export function ImagePointer(
    {name, x, y, children}:
        { name: string, x: number, y: number, children: (JSX.Element | null)[] | JSX.Element | string },
): JSX.Element {
    const [pointTo, setPointTo] = useState<{ x: number, y: number }>({x: 0, y: 0})
    useEffect(() => {
        const imageElement = document.getElementById(name) as HTMLElement
        const rect = imageElement.getBoundingClientRect()
        setPointTo({x: rect.left + x, y: rect.top + y})
    }, [])
    return (
        <div>
            <strong>line to image called "{name}" at ({pointTo.x}, {pointTo.y})</strong>
            <div>
                {children}
            </div>
        </div>
    )
}

export function Definition(
    {term, children}:
        { term: string, children: (JSX.Element | null)[] | JSX.Element | string },
): JSX.Element {
    return (
        <div>
            <strong>{term}:</strong>
            <div>{children}</div>
        </div>
    )
}
