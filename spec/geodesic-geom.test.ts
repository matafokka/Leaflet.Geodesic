import { GeodesicGeometry } from "../src/geodesic-geom";
import { expect } from "chai";

import L from "leaflet";

import "jest";

// test case with distance 54972.271 m
const FlindersPeak: L.LatLngLiteral = { lat: -37.9510334166667, lng: 144.424867888889 };
const Buninyong: L.LatLngLiteral = { lat: -37.6528211388889, lng: 143.926495527778 };

const Berlin: L.LatLngLiteral = { lat: 52.5, lng: 13.35 };
const Seattle: L.LatLngLiteral = { lat: 47.56, lng: -122.33 };
const Capetown: L.LatLngLiteral = { lat: -33.94, lng: 18.39 };
const Tokyo: L.LatLngLiteral = { lat: 35.47, lng: 139.15 };
const Sydney: L.LatLngLiteral = { lat: -33.91, lng: 151.08 };
const LosAngeles: L.LatLngLiteral = { lat: 33.82, lng: -118.38 };
const Santiago: L.LatLngLiteral = { lat: -33.44, lng: -70.71 };

const SeattleCapetown3: L.LatLngLiteral[] = [
    Seattle,
    { lat: 18.849527, lng: -35.885828 },
    Capetown
];

const SeattleCapetown5: L.LatLngLiteral[] = [
    Seattle,
    { lat: 41.580847, lng: -70.162019 },
    { lat: 18.849527, lng: -35.885828 },
    { lat: -8.461111, lng: -10.677708 },
    Capetown
];

const SeattleCapetown17: L.LatLngLiteral[] = [
    Seattle,
    { lat: 48.427425, lng: -108.576666 },
    { lat: 47.634890, lng: -94.803244 },
    { lat: 45.273503, lng: -81.829902 },
    { lat: 41.580846, lng: -70.162018 },
    { lat: 36.847303, lng: -59.917625 },
    { lat: 31.342769, lng: -50.956530 },
    { lat: 25.287045, lng: -43.032642 },
    { lat: 18.849527, lng: -35.885827 },
    { lat: 12.160105, lng: -29.277999 },
    { lat: 5.321680, lng: -22.998827 },
    { lat: -1.578828, lng: -16.858750 },
    { lat: -8.461110, lng: -10.677707 },
    { lat: -15.242921, lng: -4.272800 },
    { lat: -21.831282, lng: 2.553773 },
    { lat: -28.112432, lng: 10.024650 },
    Capetown
];

const geom = new GeodesicGeometry();
const eps = 0.000001;

function checkFixture(specimen: L.LatLngLiteral[][], fixture: L.LatLngLiteral[][]): void {
    expect(specimen).to.be.an("array");
    expect(specimen).to.be.length(fixture.length);
    specimen.forEach((line, k) => {
        expect(line).to.be.length(fixture[k].length);
        line.forEach((point, l) => {
            expect(point).to.be.an("object");
            expect(point).to.include.all.keys("lat", "lng");
            expect(point.lat).to.be.closeTo(fixture[k][l].lat, eps);
            expect(point.lng).to.be.closeTo(fixture[k][l].lng, eps);
        });
    });
}

describe("recursiveMidpoint method", function () {
    it("Seatle to Capetown, zero iterations (just the midpoint)", function () {
        const n = 0;
        const line = geom.recursiveMidpoint(Seattle, Capetown, n);
        expect(line).to.be.an("array");
        expect(line).to.be.length(1 + 2 ** (n + 1));    // 3
        line.forEach((point, index) => {
            expect(point).to.be.an("object");
            expect(point).to.include.all.keys("lat", "lng");
            expect(point.lat).to.be.closeTo(SeattleCapetown3[index].lat, eps);
            expect(point.lng).to.be.closeTo(SeattleCapetown3[index].lng, eps);
        })
    });

    it("Seatle to Capetown, one iteration", function () {
        const n = 1;
        const line = geom.recursiveMidpoint(Seattle, Capetown, n);
        expect(line).to.be.an("array");
        expect(line).to.be.length(1 + 2 ** (n + 1));    // 5
        line.forEach((point, index) => {
            expect(point).to.be.an("object");
            expect(point).to.include.all.keys("lat", "lng");
            expect(point.lat).to.be.closeTo(SeattleCapetown5[index].lat, eps);
            expect(point.lng).to.be.closeTo(SeattleCapetown5[index].lng, eps);
        })
    });

    it("Seatle to Capetown, 2 iteration", function () {
        const n = 2;
        const line = geom.recursiveMidpoint(Seattle, Capetown, n);
        expect(line).to.be.an("array");
        expect(line).to.be.length(1 + 2 ** (n + 1));    // 9
    });

    it("Seatle to Capetown, 3 iteration", function () {
        const n = 3;
        const line = geom.recursiveMidpoint(Seattle, Capetown, n);
        expect(line).to.be.an("array");
        expect(line).to.be.length(1 + 2 ** (n + 1));    // 17
    });

    it("Seatle to Capetown, 10 iteration", function () {
        const n = 10;
        const line = geom.recursiveMidpoint(Seattle, Capetown, n);
        expect(line).to.be.an("array");
        expect(line).to.be.length(1 + 2 ** (n + 1));    // 2049
    });
});

describe("line function", function () {
    it("Seattle -> Capetown", function () {
        checkFixture([geom.line(Seattle, Capetown)], [SeattleCapetown17]);
    });

    it("Seattle -> Capetown with default steps", function () {
        const customGeom = new GeodesicGeometry({ steps: undefined });
        checkFixture([customGeom.line(Seattle, Capetown)], [SeattleCapetown17]);
    });
});

describe("linestring function", function () {
    it("Berlin, Seattle, Capetown", function () {
        const line = geom.lineString([Berlin, Seattle, Capetown]);
        expect(line).to.be.an("array");
    });
});

describe("multilinestring function", function () {
    it("Berlin, Seattle, Capetown", function () {
        const line = geom.multiLineString([[Berlin, Seattle, Capetown]]);
        expect(line).to.be.an("array");
    });
});

describe("splitLine function", function () {

    it("Berlin -> Seattle (no split)", function () {
        checkFixture(geom.splitLine(Berlin, Seattle), [[Berlin, Seattle]]);
    });

    it("Seattle -> Berlin (no split)", function () {
        checkFixture(geom.splitLine(Seattle, Berlin), [[Seattle, Berlin]]);
    });

    it("Berlin -> Sydney (no split)", function () {
        checkFixture(geom.splitLine(Berlin, Sydney), [[Berlin, Sydney]]);
    });

    it("Seattle -> Tokyo", function () {
        const fixture: L.LatLngLiteral[][] = [  // verified with QGIS
            [Seattle, { lat: 53.130876, lng: -180 }],
            [{ lat: 53.130876, lng: 180 }, Tokyo]
        ];
        const split = geom.splitLine(Seattle, Tokyo);
        checkFixture(split, fixture);
    });

    it("Tokyo -> Seattle", function () {
        const fixture: L.LatLngLiteral[][] = [  // verified with QGIS
            [Tokyo, { lat: 53.095949, lng: 180 }],
            [{ lat: 53.095949, lng: -180 }, Seattle]
        ];
        const split = geom.splitLine(Tokyo, Seattle);
        checkFixture(split, fixture);
    });

    it("Over Southpole (no split)", function () {
        const fixture: L.LatLngLiteral[][] = [
            [{ lat: -76.92061351829682, lng: -24.257812500000004 }, { lat: -90, lng: 155.641042 }],
            [{ lat: -90, lng: 155.641042 }, { lat: -72.28906720017675, lng: 155.7421875 }]
        ];
        const split = geom.splitLine({ lat: -76.92061351829682, lng: -24.257812500000004 }, { lat: -72.28906720017675, lng: 155.7421875 });
        checkFixture(split, fixture);
    });
    it("Clamp values if too close to dateline", function () {
        const fixture: L.LatLngLiteral[][] = [[{ lat: -50.6251, lng: -57.1289 }, { lat: -35.34762564469152, lng: -179.9 }]];
        const split = geom.splitLine({ lat: -50.6251, lng: -57.1289 }, { lat: -35.34762564469152, lng: -179.97352713285602 });
        checkFixture(split, fixture);
    });
});

describe("splitLine - test cases for bugs #1", function () {
    it("Los Angeles -> Tokyo", function () {
        const fixture: L.LatLngLiteral[][] = [
            [
                LosAngeles,
                { lat: 51.644339, lng: -180 }],
            [
                { lat: 51.644339, lng: 180 },
                { lat: 36.597887451521956, lng: 129.52500015633 }]];

        const split = geom.splitLine(LosAngeles, { lat: 36.597887451521956, lng: 129.52500015633 });
        checkFixture(split, fixture);
    });
});


describe("splitMultiLineString function", function () {
    it("Berlin -> Seattle (no split)", function () {
        const geodesic: L.LatLngLiteral[][] = [geom.recursiveMidpoint(Berlin, Seattle, 1)];
        const split = geom.splitMultiLineString(geodesic);
        checkFixture(split, geodesic);
    });

    it("Seattle -> Tokyo", function () {
        const fixture: L.LatLngLiteral[][] = [
            [
                { lat: 47.56, lng: -122.33 },
                { lat: 53.86920734446313, lng: -148.18981326309986 },
                { lat: 53.438428643246105, lng: -177.80102713286155 },
                { lat: 53.105220539910135, lng: -179.99999999998232 }],
            [
                { lat: 53.105220539910135, lng: 180.00000000001768 },
                { lat: 46.47098438753966, lng: 157.17353392461567 },
                { lat: 35.47, lng: 139.15 }]];

        const geodesic: L.LatLngLiteral[][] = [geom.recursiveMidpoint(Seattle, Tokyo, 1)];
        const split = geom.splitMultiLineString(geodesic);
        checkFixture(split, fixture);
    });

    it("Tokyo -> Seattle", function () {
        const fixture: L.LatLngLiteral[][] = [
            [
                { lat: 35.47, lng: 139.15 },
                { lat: 46.470984387539666, lng: 157.17353392461575 },
                { lat: 53.08741200357901, lng: 179.99999999999866 }],
            [
                { lat: 53.08741200357901, lng: -180.00000000000134 },
                { lat: 53.438428643246105, lng: -177.80102713286158 },
                { lat: 53.86920734446313, lng: -148.18981326309986 },
                { lat: 47.56, lng: -122.33 }]];

        const geodesic: L.LatLngLiteral[][] = [geom.recursiveMidpoint(Tokyo, Seattle, 1)];
        const split = geom.splitMultiLineString(geodesic);
        checkFixture(split, fixture);
    });
});

describe("splitMultiLineString - test cases for bugs", function () {
    it("Berlin -> Los Angeles (higher resolution, no split)", function () {
        const geodesic: L.LatLngLiteral[][] = [geom.recursiveMidpoint(Berlin, { lat: 32.54681317351517, lng: -118.82812500000001 }, 2)];
        const split = geom.splitMultiLineString(geodesic);
        checkFixture(split, geodesic);
    });

    it("Los Angeles -> Tokyo", function () {
        const fixture: L.LatLngLiteral[][] = [
            [
                { lat: 33.82, lng: -118.38 },
                { lat: 48.618678, lng: -166.584707 },
                { lat: 48.525174, lng: -180 }],
            [
                { lat: 48.525174, lng: 180 },
                { lat: 38.2727, lng: 141.3281 }]];

        const geodesic: L.LatLngLiteral[][] = [geom.recursiveMidpoint(LosAngeles, { lat: 38.2727, lng: 141.3281 }, 0)];
        const split = geom.splitMultiLineString(geodesic);
        checkFixture(split, fixture);
    });

    it("Falkland -> Tokyo (geodesic vertex close to dateline)", function () {
        const fixture: L.LatLngLiteral[][] = [
            [
                { lat: -50.6251, lng: -57.1289 },
                { lat: -35.34762564469152, lng: -179.9 },
                { lat: -35.221365421334895, lng: -180.00000000010883 }],
            [
                { lat: -35.221365421334895, lng: 179.99999999989117 },
                { lat: 35.47, lng: 139.15 }]];

        const geodesic: L.LatLngLiteral[][] = [geom.recursiveMidpoint({ lat: -50.6251, lng: -57.1289 }, Tokyo, 0)];
        const split = geom.splitMultiLineString(geodesic);
        checkFixture(split, fixture);
    });
});

describe("distance function (wrapper for vincenty inverse)", function () {
    it("FlindersPeak to Buninyong", function () {
        const res = geom.distance(FlindersPeak, Buninyong);
        expect(res).to.be.a("number");
        expect(res).to.be.closeTo(54972.271, 0.001);   // epsilon is larger, because precision of reference value is  only 3 digits
    });
});