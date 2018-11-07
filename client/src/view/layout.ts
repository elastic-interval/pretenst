import {CSSProperties} from 'react';

const MARGIN = '20px';
const CORNER_RADIUS = '20px';
const SMALL = '200px';
const QUARTER = '25%';
const HALF = '50%';

export enum InsetStyle {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_RIGHT,
    BOTTOM_LEFT,
    TOP_MIDDLE,
    BOTTOM_MIDDLE
}

export function insetStyle(style: InsetStyle): CSSProperties {
    const css: CSSProperties = {
        position: 'absolute',
        color: 'white',
        backgroundColor: 'black',
        borderColor: 'white',
        borderStyle: 'solid',
        padding: '5px 5px 5px 5px'
    };
    switch (style) {
        case InsetStyle.TOP_LEFT:
            css.top = MARGIN;
            css.left = MARGIN;
            css.width = SMALL;
            css.height = SMALL;
            css.borderBottomRightRadius = CORNER_RADIUS;
            break;
        case InsetStyle.TOP_RIGHT:
            css.top = MARGIN;
            css.right = MARGIN;
            css.width = SMALL;
            css.height = SMALL;
            css.borderBottomLeftRadius = CORNER_RADIUS;
            break;
        case InsetStyle.TOP_MIDDLE:
            css.top = MARGIN;
            css.width = HALF;
            css.left = QUARTER;
            css.right = QUARTER;
            css.height = SMALL;
            css.borderBottomLeftRadius = CORNER_RADIUS;
            css.borderBottomRightRadius = CORNER_RADIUS;
            css.borderTopLeftRadius = CORNER_RADIUS;
            css.borderTopRightRadius = CORNER_RADIUS;
            break;
        case InsetStyle.BOTTOM_LEFT:
            css.bottom = MARGIN;
            css.left = MARGIN;
            css.width = SMALL;
            css.height = SMALL;
            css.borderTopRightRadius = CORNER_RADIUS;
            break;
        case InsetStyle.BOTTOM_RIGHT:
            css.bottom = MARGIN;
            css.right = MARGIN;
            css.width = SMALL;
            css.height = SMALL;
            css.borderTopLeftRadius = CORNER_RADIUS;
            break;
        case InsetStyle.BOTTOM_MIDDLE:
            css.bottom = MARGIN;
            css.width = HALF;
            css.left = QUARTER;
            css.right = QUARTER;
            css.height = SMALL;
            css.borderBottomLeftRadius = CORNER_RADIUS;
            css.borderBottomRightRadius = CORNER_RADIUS;
            css.borderTopLeftRadius = CORNER_RADIUS;
            css.borderTopRightRadius = CORNER_RADIUS;
            break;
    }
    return css;
}
