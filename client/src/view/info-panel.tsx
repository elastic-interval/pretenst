import * as React from 'react';
import {Carousel, CarouselControl, CarouselItem} from 'reactstrap';
import * as ReactMarkdown from 'react-markdown';

export interface IInfoPanelProps {
    exit: () => void;
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
            "This is a *Galapagotch* island."
        ]
    },
    {
        lines: [
            'In the local dialect, *galapa* means something like "family" and a *gotch*',
            'is a unique beehive pattern of surface spots where a *gotchi* lives.',
        ]
    },
    {
        lines: [
            'Every *gotch* is a place with a completely unique pattern',
            'and it is forever connected to its neighbors.',
            'Together they form a *Galapagotch* island.'
        ]
    },
    {
        lines: [
            'A *galapagotchi* emerges from its gotch,',
            'evolving first body shape and then muscle coordination.'
        ]
    },
    {
        lines: [
            '## ⚁ ⚂ ⚃ ⚂ ⚀ ⚄ ⚅ ⚂ ⚂ ⚅ ⚂ ⚃ ⚁ ⚁ ⚄ ⚀ ⚅ ⚄ ⚅ ...',
            '',
            'The genes of a galapagotchi are not DNA like ours, but are instead frozen sequences of dice.'
        ]
    },
    {
        lines: [
            'A mutated gene is a near-perfect copy, but with some dice randomly tossed.',
            'The result of tossing a few dice [is anybody\'s guess](https://en.wikipedia.org/wiki/The_Blind_Watchmaker).'
        ]
    },
    {
        lines: [
            'A gotchi evolves in an accelerated kind of "multiverse" where they compete with',
            'mutated versions of themselves in the same space.',
            'While evolving, they look a bit like ghosts.'
        ]
    },
    {
        lines: [
            'To acquire a shape, the galapagotchi are completely dependent on their master, the player.',
            'This is an aesthetic selection phase, so the master can throw the dice until a good enough body appears.'
        ]
    },
    {
        lines: [
            'To acquire running behavior, a *gotchi* continues its multiverse evolution',
            'with a drive to run and a sense of direction',
            '(*intelligent design*: guilty as charged, don\'t want',
            'to wait [billions of years](https://en.wikipedia.org/wiki/Age_of_the_Earth)).'
        ]
    },
    {
        lines: [
            'A *gotchi* competes against mutations of itself, like toy bacteria might,',
            'but *wow* it can evolve to run with conviction!\n'
        ]
    },
    {
        lines: [
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
            'Their genes come from a long line of frozen dice patterns that were',
            'almost exactly as successful at making their bodies run.'
        ]
    },
    {
        lines: [
            '* **gotch**: universally unique beehive pattern of 127 surface spots; home of a *galapagotchi*',
            '* **gotchi**: avatar; an evolving body with the singular purpose of running; representative of a player; short for *galapagotchi*',
        ]
    },
    {
        lines: [
            '* **galapa**: permanently interwov§en; inextricably connected; family',
            '* **galapasi**: one of six possible siblings living in neighbor *gotches*;',
        ]
    },
    {
        lines: [
            '**galapagotch island**: family of permanently linked *gotches*'
        ]
    }
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
