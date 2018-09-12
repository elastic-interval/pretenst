import {IFabricExports} from './fabric-exports';

export enum PhysicsFeature {
    GravityAbove = 'Gravity Above',
    GravityBelow = 'Gravity Below',
    DragAbove = 'Drag Above',
    DragBelow = 'Drag Below',
    ElasticFactor = 'Elastic Factor',
    MaxSpanVariation = 'Maximum Span Variation'
}

export interface IPhysicsFeature {
    feature: PhysicsFeature;
    getFactor: () => number,
    setFactor: (factor: number) => void;
}

export class Physics {

    private featuresArray: IPhysicsFeature[];

    constructor() {
        this.featuresArray = Object.keys(PhysicsFeature).map(f => this.createFeature(PhysicsFeature[f]));
    }

    public get features() {
        return this.featuresArray;
    }

    public applyToFabric(fabricExports: IFabricExports): object {
        const featureValues = {};
        this.featuresArray.forEach(physicsFeature => {
            const factor = physicsFeature.getFactor();
            let currentValue = 0;
            switch (physicsFeature.feature) {
                case PhysicsFeature.GravityAbove:
                     currentValue = fabricExports.setGravityAbove(factor);
                     break;
                case PhysicsFeature.GravityBelow:
                    currentValue= fabricExports.setGravityBelow(factor);
                    break;
                case PhysicsFeature.DragAbove:
                    currentValue= fabricExports.setDragAbove(factor);
                    break;
                case PhysicsFeature.DragBelow:
                    currentValue= fabricExports.setDragBelow(factor);
                    break;
                case PhysicsFeature.ElasticFactor:
                    currentValue= fabricExports.setElasticFactor(factor);
                    break;
                case PhysicsFeature.MaxSpanVariation:
                    currentValue= fabricExports.setMaxSpanVariation(factor);
                    break;
                default:
                    throw new Error();
            }
            featureValues[physicsFeature.feature] = currentValue;
        });
        return featureValues;
    }

    private createFeature(feature: PhysicsFeature): IPhysicsFeature {
        return {
            feature,
            getFactor: () => {
                const storedValue = localStorage.getItem(feature);
                if (!storedValue) {
                    localStorage.setItem(feature, '1');
                    return 1;
                } else {
                    return parseFloat(storedValue);
                }
            },
            setFactor: (factor: number) => {
                localStorage.setItem(feature, factor.toFixed(3));
            }
        }
    }
}