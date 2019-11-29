import L from "leaflet";
import { GeodesicCore, GeoDistance, GeodesicOptions, WGS84Vector } from "./geodesic-core"

/** detailled information of the current geometry */
export interface Statistics {
    /** Stores the distance for each individual geodesic line */
    distanceArray: number[],
    /** overall distance of all lines */
    totalDistance: number,
    /** number of positions that the geodesic lines are created from */
    points: number,
    /** number vertices that were created during geometry calculation */
    vertices: number
}

export class GeodesicGeometry {
    readonly geodesic = new GeodesicCore();
    readonly options: GeodesicOptions = { wrap: true, steps: 3 };
    steps: number;

    constructor(options?: GeodesicOptions) {
        this.options = { ...this.options, ...options };
        this.steps = (this.options.steps === undefined) ? 3 : this.options.steps;
    }

    recursiveMidpoint(start: L.LatLng, dest: L.LatLng, iterations: number): L.LatLng[] {
        const geom: L.LatLng[] = [start, dest];
        const midpoint = this.geodesic.midpoint(start, dest)
        if (this.options.wrap) {
            midpoint.lng = this.geodesic.wrap180(midpoint.lng);
        }

        if (iterations > 0) {
            geom.splice(0, 1, ...this.recursiveMidpoint(start, midpoint, iterations - 1));
            geom.splice(geom.length - 2, 2, ...this.recursiveMidpoint(midpoint, dest, iterations - 1));
        } else {
            geom.splice(1, 0, midpoint);
        }

        return geom;
    }

    line(start: L.LatLng, dest: L.LatLng): L.LatLng[] {
        return this.recursiveMidpoint(start, dest, Math.min(8, this.steps));
    }

    circle(center: L.LatLng, radius: number): L.LatLng[] {
        const points: L.LatLng[] = [];
        for (let i = 0; i < this.steps + 1; i++) {
            const point: WGS84Vector = this.geodesic.direct(center, 360 / this.steps * i, radius);
            points.push(new L.LatLng(point.lat, point.lng));
        }
        return points;
    }

    multiLineString(latlngs: L.LatLng[][]): L.LatLng[][] {
        const multiLineString: L.LatLng[][] = [];

        latlngs.forEach((linestring) => {
            const segment: L.LatLng[] = [];
            for (let j = 1; j < linestring.length; j++) {
                segment.splice(segment.length - 1, 1, ...this.line(linestring[j - 1], linestring[j]));
            }
            multiLineString.push(segment);
        })
        return multiLineString;
    }

    lineString(latlngs: L.LatLng[]): L.LatLng[] {
        return this.multiLineString([latlngs])[0];
    }

    splitLine(start: L.LatLng, dest: L.LatLng): L.LatLng[][] {
        const antimeridianWest = {
            point: new L.LatLng(89, -180),
            bearing: 180
        };
        const antimeridianEast = {
            point: new L.LatLng(89, 180),
            bearing: 180
        };

        // we need a significant difference between the points and the antimeridian. So we clamp for +-179.9 for now...
        start.lng = Math.max(-179.9, start.lng);
        start.lng = Math.min(179.9, start.lng);
        dest.lng = Math.max(-179.9, dest.lng);
        dest.lng = Math.min(179.9, dest.lng);

        const line: GeoDistance = this.geodesic.inverse(start, dest);
        let intersection: L.LatLng | null;

        // depending on initial direction, we check for crossing the antimeridian in western or eastern direction
        if (line.initialBearing > 180) {
            intersection = this.geodesic.intersection(start, line.initialBearing, antimeridianWest.point, antimeridianWest.bearing);
        } else {
            intersection = this.geodesic.intersection(start, line.initialBearing, antimeridianEast.point, antimeridianEast.bearing);
        }

        if (intersection) {
            const intersectionDistance = this.geodesic.inverse(start, intersection);
            if (intersectionDistance.distance < line.distance) {
                if (intersection.lng < -179.9999) {
                    return [[start, intersection], [new L.LatLng(intersection.lat, intersection.lng + 360), dest]];
                } else if (intersection.lng > 179.9999) {
                    return [[start, intersection], [new L.LatLng(intersection.lat, intersection.lng - 360), dest]];
                }
                return [[start, intersection], [intersection, dest]];
            }
        }
        return [[start, dest]];
    }

    /**
     * Linestrings of a given multilinestring that cross the antimeridian will be split in two separate linestrings. 
     * This function is used to wrap lines around when they cross the antimeridian
     * It iterates over all linestrings and reconstructs the step-by-step if no split is needed. 
     * In case the line was split, the linestring ends at the antimeridian and a new linestring is created for the 
     * remaining points of the original linestring.
     * 
     * @param multilinestring
     * @return another multilinestring where segments crossing the antimeridian are split
     */
    splitMultiLineString(multilinestring: L.LatLng[][]): L.LatLng[][] {
        const result: L.LatLng[][] = [];
        multilinestring.forEach((linestring) => {
            if (linestring.length === 1) {
                result.push(linestring);   // just a single point in linestring, no need to split
            }
            else {
                let segment: L.LatLng[] = [];
                for (let j = 1; j < linestring.length; j++) {
                    const split = this.splitLine(linestring[j - 1], linestring[j]);
                    segment.pop();
                    segment = segment.concat(split[0]);
                    if (split.length > 1) {
                        result.push(segment);   // the line was split, so we end the linestring right here
                        segment = split[1];     // begin the new linestring with the second part of the split line
                    }
                }
                result.push(segment);
            }
        });
        return result;
    }

    distance(start: L.LatLng, dest: L.LatLng): number {
        return this.geodesic.inverse(start, dest).distance;
    }

    multilineDistance(multilinestring: L.LatLng[][]): number[] {
        const dist: number[] = [];
        multilinestring.forEach((linestring) => {
            let segmentDistance = 0;
            for (let j = 1; j < linestring.length; j++) {
                segmentDistance += this.distance(linestring[j - 1], linestring[j]);
            }
            dist.push(segmentDistance);
        });
        return dist;
    }

    updateStatistics(points: L.LatLng[][], vertices: L.LatLng[][]): Statistics {
        const stats: Statistics = {} as any;

        stats.distanceArray = this.multilineDistance(points);
        stats.totalDistance = stats.distanceArray.reduce((x, y) => x + y, 0);
        stats.points = 0;
        points.forEach((item) => {
            stats.points += item.reduce((x) => x + 1, 0);
        });
        stats.vertices = 0;
        vertices.forEach((item) => {
            stats.vertices += item.reduce((x) => x + 1, 0);
        });
        return stats;
    }
}
