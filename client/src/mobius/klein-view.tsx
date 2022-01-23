import * as React from "react"

export function KleinView({width, height}: {
    width: number,
    height: number,
}): JSX.Element {
    const klein = generateKlein(width, height)
    return (
        <table style={{margin: "3em", borderStyle: "solid", borderWidth: "2px"}}>
            {klein.map((row, rowIndex) => (
                <tr key={`r${rowIndex}`}>
                    {row.map((col, colIndex) => (
                        <td
                            key={`c${rowIndex}-${colIndex}`}
                            style={{borderStyle: "solid", borderWidth: "1px", textAlign: "center"}}
                        >
                            {col}
                        </td>
                    ))}
                </tr>
            ))}
        </table>
    )
}

function generateKlein(width: number, height: number): string[][] {
    if (height % 2 === 0) {
        throw new Error("Even height not allowed")
    }
    const array: string[][] = []
    for (let y = 0; y < height + 3; y++) {
        const row: string[] = []
        for (let x = 0; x < width + 2; x++) {
            if ((x + y) % 2 === 0) {
                const a = kleinCell(x, y, width, height)
                const b = kleinCell(x - 1, y + 1, width, height)
                const c = kleinCell(x + 1, y + 1, width, height)
                const d = kleinCell(x, y + 2, width, height)
                const e = kleinCell(x - 1, y + 3, width, height)
                const f = kleinCell(x + 1, y + 3, width, height)
                row.push(`${a} (${b}:${c}:${d}) (${e}:${f})`)
            } else {
                row.push("")
            }
        }
        array.push(row)
    }
    return array
}

function kleinCell(xx: number, yy: number, width: number, height: number): string {
    const noflip = Math.floor(yy / height) % 2 === 0
    const x = (noflip ? xx : width * 2 - 1 - xx) % width
    const y = yy % height
    const index = Math.floor((y * width + x) / 2)
    return `${index}`
    // return `(${x},${y}):${index}`
}
