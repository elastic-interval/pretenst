import * as React from 'react';
import {Carousel, CarouselControl, CarouselItem} from 'reactstrap';
import * as ReactMarkdown from 'react-markdown';

export interface IInfoPanelProps {
    master?: string;
}

export interface IInfoPanelState {
    activeIndex: number;
}

interface IPage {
    lines: string[];
}

const PAGES: IPage[] = [
    {
        lines: [
            'This is the first **Galapagotch Island**.',
            '',
            'What you see is a toy world, but it\'s also a place',
            'where you can get a sense of how natural selection works.',
            '',
            'It\'s developing into a game, so',
            'welcome because both players and developers can help make it more fun!'
        ]
    },
    {
        lines: [
            'You can zoom and move around with your mouse,',
            'and you can click on something to focus on it',
            '',
            'When you focus on something it stays in the center,',
            'and you can zoom and twirl around it.',
            '',
            'If you are not already a resident of the island,',
            'you will see green spots where you can decide to live.'
        ]
    },
    {
        lines: [
            'As the story goes, *galapa* means something like "family" in the local dialect and a *gotch*',
            'is a unique beehive pattern of surface spots where a *gotchi* lives.',
            '',
            'Every *gotch* is a place with a completely unique pattern',
            'and it is forever connected to its neighbors.',
        ]
    },
    {
        lines: [
            'A *galapagotchi* emerges from its gotch,',
            'evolving first body shape and then muscle coordination.',
            '',
            'The genes of a galapagotchi are not DNA like ours, but are instead frozen sequences of dice.',
            '',
            '**⚁ ⚂ ⚃ ⚂ ⚀ ⚄ ⚅ ⚂ ⚂ ⚅ ⚂ ⚃ ⚁ ⚁ ⚄ ⚀ ⚅ ⚄ ⚅ ...**',
        ]
    },
    {
        lines: [
            'A mutated gene is a near-perfect copy, but with some dice randomly tossed.',
            'The result of tossing a few dice [is anybody\'s guess](https://en.wikipedia.org/wiki/The_Blind_Watchmaker).',
            '',
            'A gotchi evolves in an accelerated kind of "multiverse" where they compete with',
            'mutated versions of themselves in the same space.',
            'While evolving, they look a bit like ghosts.'
        ]
    },
    {
        lines: [
            'To acquire a shape, the galapagotchi are completely dependent on their master, the player.',
            '',
            'This is an aesthetic selection phase, so the master can throw the dice until a good enough body appears.',
        ]
    },
    {
        lines: [
            'To acquire running behavior, a *gotchi* continues its multiverse evolution',
            'with a drive to run and a sense of direction',
            '',
            '(*intelligent design*: guilty as charged, don\'t want',
            'to wait [billions of years](https://en.wikipedia.org/wiki/Age_of_the_Earth)).'
        ]
    },
    {
        lines: [
            'A *gotchi* competes against mutations of itself, like toy bacteria might,',
            'but *wow* it can evolve to run with conviction!',
            '',
            'As the [Dawkins](https://en.wikipedia.org/wiki/Richard_Dawkins)-inspired evolution proceeds,',
            'the slowest are forgotten while the fastest become pregnant',
            'and give birth to mutations of themselves, tossing a few dice.'
        ]
    },
    {
        lines: [
            'Surviving galapagotchi are the ones who froze the right dice, according to',
            'the natural rules discovered by [Charles Darwin](https://en.wikipedia.org/wiki/Charles_Darwin)',
            'and elaborated by Dawkins and others since.',
            '',
            'Their genes come from a long line of frozen dice patterns that were',
            'almost exactly as successful at making their bodies run.'
        ]
    },
    {
        lines: [
            '**gotch**: universally unique beehive pattern of 127 surface spots; home of a *galapagotchi*',
            '',
            '**gotchi**: avatar; an evolving body with the singular purpose of running; representative of a player; short for *galapagotchi*',
            '',
            '**galapa**: permanently interwoven; inextricably connected; family',
        ]
    },
    {
        lines: [
            '**galapasi**: one of six possible siblings living in neighbor *gotches*;',
            '',
            '**galapagotch island**: family of permanently linked *gotches*'
        ]
    },
    {
        lines: [
            '[Look here](https://github.com/geralddejong/galapagotchi)',
            'or [find me](https://twitter.com/fluxe) if you are interested in ',
            '[WebAssembly](https://webassembly.org/),',
            '[WebGL](https://en.wikipedia.org/wiki/WebGL)/[ThreeJS](https://threejs.org/) or',
            'Darwin\'s [Evolution](https://en.wikipedia.org/wiki/Darwin%27s_Dangerous_Idea).',
            '',
            '![WASM WebGL](wa.png)',
            '![Charles Darwin](cd.jpg)',
        ]
    }
    /*
     */
];

const PAGE_STRINGS = PAGES.map(page => page.lines.join('\n'));

export class InfoPanel extends React.Component<IInfoPanelProps, IInfoPanelState> {

    private animating = false;

    constructor(props: IInfoPanelProps) {
        super(props);
        this.state = {
            activeIndex: 0
        };
    }

    public render() {
        const {activeIndex} = this.state;
        return (
            <Carousel interval={10000} activeIndex={activeIndex} next={() => this.next()} previous={() => this.previous()}>
                {PAGE_STRINGS.map((markdown: string, index: number) => {
                    return (
                        <CarouselItem key={`page-${index}`}
                                      onExiting={() => this.animating = true}
                                      onExited={() => this.animating = false}>
                            <ReactMarkdown key={`markdown-${index}`} source={markdown}/>
                        </CarouselItem>
                    );
                })}
                <CarouselControl direction="prev" directionText="Previous" onClickHandler={() => this.previous()}/>
                <CarouselControl direction="next" directionText="Next" onClickHandler={() => this.next()}/>
            </Carousel>
        );
    }

    private next() {
        if (!this.animating) {
            const nextIndex = this.state.activeIndex === PAGES.length - 1 ? 0 : this.state.activeIndex + 1;
            this.setState({activeIndex: nextIndex});
        }
    }

    private previous() {
        if (!this.animating) {
            const nextIndex = this.state.activeIndex === 0 ? PAGES.length - 1 : this.state.activeIndex - 1;
            this.setState({activeIndex: nextIndex});
        }
    }
}
