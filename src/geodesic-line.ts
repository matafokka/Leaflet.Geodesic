import L from "leaflet";
import { GeodesicOptions } from "./geodesic-core"
import { GeodesicGeometry } from "./geodesic-geom";
import { latlngExpressionArraytoLiteralArray } from "../src/types-helper";

interface Statistics {
    distanceArray: number[],
    totalDistance: number,
    points: number,
    vertices: number
}

export class GeodesicLine extends L.Layer {
    polyline: L.Polyline;
    options: GeodesicOptions = { wrap: true, steps: 3 };
    private geom: GeodesicGeometry;
    statistics: Statistics = {} as any;

    constructor(latlngs?: L.LatLngExpression[] | L.LatLngExpression[][], options?: GeodesicOptions) {
        super();
        this.options = { ...this.options, ...options };

        this.geom = new GeodesicGeometry(this.options);

        if (latlngs) {
            const latLngLiteral = latlngExpressionArraytoLiteralArray(latlngs);
            const geodesic = this.geom.multiLineString(latLngLiteral);
            this.updateStatistics(latLngLiteral, geodesic);            

            if (this.options.wrap) {
                const split = this.geom.splitMultiLineString(geodesic);
                this.polyline = new L.Polyline(split, this.options);
            }
            else {
                this.polyline = new L.Polyline(geodesic, this.options);
            }
        }
        else {
            this.polyline = new L.Polyline([], this.options);
        }
    }

    onAdd(map: L.Map): this {
        this.polyline.addTo(map);
        return this;
    }

    onRemove(): this {
        this.polyline.remove();
        return this;
    }

    private updateLatLngs(latlngs: L.LatLngExpression[] | L.LatLngExpression[][]): void {
        const latLngLiteral = latlngExpressionArraytoLiteralArray(latlngs);
        const geodesic = this.geom.multiLineString(latLngLiteral);
        this.updateStatistics(latLngLiteral, geodesic);
        if (this.options.wrap) {
            const split = this.geom.splitMultiLineString(geodesic);
            this.polyline.setLatLngs(split);
        }
        else {
            this.polyline.setLatLngs(geodesic);
        }
    }

    private updateStatistics(points: L.LatLngLiteral[][], vertices: L.LatLngLiteral[][]): void {
        this.statistics.distanceArray = this.geom.multilineDistance(points);
        this.statistics.totalDistance = this.statistics.distanceArray.reduce((x, y) => x + y, 0);
        this.statistics.points = 0; 
        points.forEach( (item) => {
            this.statistics.points += item.reduce((x) => x + 1, 0);
        });
        this.statistics.vertices = 0; 
        vertices.forEach( (item) => {
            this.statistics.vertices += item.reduce((x) => x + 1, 0);
        });
    }

    setLatLngs(latlngs: L.LatLngExpression[] | L.LatLngExpression[][]): this {
        this.updateLatLngs(latlngs);
        return this;
    }

    fromGeoJson(input: GeoJSON.GeoJSON): this {
        let latlngs: L.LatLngExpression[][] = [];
        let features: GeoJSON.Feature[] = [];

        if (input.type === "FeatureCollection") {
            features = input.features;
        }
        else if (input.type === "Feature") {
            features = [input];
        }
        else if (["MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"].includes(input.type)) {
            features = [{
                type: "Feature",
                geometry: input,
                properties: {}
            }]
        }
        else {
            console.log(`[Leaflet.Geodesic] fromGeoJson() - Type "${input.type}" not supported.`);
        }

        features.forEach((feature: GeoJSON.Feature) => {
            switch (feature.geometry.type) {
                case "MultiPoint":
                case "LineString":
                    latlngs = [...latlngs, ...[L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates, 0)]];
                    break;
                case "MultiLineString":
                case "Polygon":
                    latlngs = [...latlngs, ...L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates, 1)];
                    break;
                case "MultiPolygon":
                    feature.geometry.coordinates.forEach((item) => {
                        latlngs = [...latlngs, ...L.GeoJSON.coordsToLatLngs(item, 1)]
                    })
                    break;
                default:
                    console.log(`[Leaflet.Geodesic] fromGeoJson() - Type "${feature.geometry.type}" not supported.`);
            }
        });

        if(latlngs.length) {
            this.setLatLngs(latlngs);
        }
        return this;
    }

    getLatLngs(): L.LatLng[] | L.LatLng[][] | L.LatLng[][][] {
        return this.polyline.getLatLngs();
    }

}