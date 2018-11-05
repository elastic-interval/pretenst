import {CSSProperties} from 'react';

const margin = '20px';
const cornerRadius = '60px';

export function insetStyle(top: boolean, right: boolean): CSSProperties {
    const css: CSSProperties = {
        position: 'absolute',
        color: 'white',
        backgroundColor: 'black',
        borderColor: 'white',
        borderStyle: 'solid',
        padding: '20px 20px 20px 20px',
        width: '200px',
        height: '200px'
    };
    if (top) {
        css.top = margin;
    } else {
        css.bottom = margin;
    }
    if (right) {
        css.right = margin;
        if (top) {
            css.borderBottomLeftRadius = cornerRadius;
        } else {
            css.borderTopLeftRadius = cornerRadius;
        }
    } else {
        css.left = margin;
        if (top) {
            css.borderBottomRightRadius = cornerRadius;
        } else {
            css.borderTopRightRadius = cornerRadius;
        }
    }
    return css;
}
