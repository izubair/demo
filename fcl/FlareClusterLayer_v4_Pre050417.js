/// <reference path="../typings/index.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/layers/GraphicsLayer", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/TextSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color", "esri/core/watchUtils", "esri/geometry/support/webMercatorUtils", "esri/Graphic", "esri/geometry/Point", "esri/geometry/Multipoint", "esri/geometry/Polygon", "esri/geometry/geometryEngine", "esri/geometry/SpatialReference", "esri/views/2d/engine/graphics/GFXObject", "esri/views/2d/engine/graphics/Projector", "esri/core/accessorSupport/decorators", "dojo/on", "dojox/gfx", "dojo/dom-construct", "dojo/query", "dojo/dom-attr", "dojo/dom-style", "dojo/sniff"], function (require, exports, QueryTask, Query, GraphicsLayer, SimpleMarkerSymbol, TextSymbol, SimpleLineSymbol, Color, watchUtils, webMercatorUtils, Graphic, Point, Multipoint, Polygon, geometryEngine, SpatialReference, GFXObject, Projector, asd, on, gfx, domConstruct, query, domAttr, domStyle, sniff) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //extend GraphicsLayer using 'accessorSupport/decorators'
    var FlareClusterLayer = (function (_super) {
        __extends(FlareClusterLayer, _super);
        function FlareClusterLayer(options) {
            var _this = _super.call(this, options) || this;
            _this._viewLoadCount = 0;
            _this._clusters = {};
            //set the defaults
            if (!options) {
                //missing required parameters
                console.error("Missing required parameters to flare cluster layer constructor.");
                return _this;
            }
            _this.singlePopupTemplate = options.singlePopupTemplate;
            //set up the clustering properties
            _this.clusterRatio = options.clusterRatio || 75;
            _this.clusterToScale = options.clusterToScale || 2000000;
            _this.clusterMinCount = options.clusterMinCount || 2;
            _this.singleFlareTooltipProperty = options.singleFlareTooltipProperty || "name";
            if (options.clusterAreaDisplay) {
                _this.clusterAreaDisplay = options.clusterAreaDisplay === "none" ? undefined : options.clusterAreaDisplay;
            }
            _this.maxFlareCount = options.maxFlareCount || 8;
            _this.maxSingleFlareCount = options.maxSingleFlareCount || 8;
            _this.displayFlares = options.displayFlares === false ? false : true; //default to true
            _this.displaySubTypeFlares = options.displaySubTypeFlares === true;
            _this.subTypeFlareProperty = options.subTypeFlareProperty || undefined;
            _this.flareBufferPixels = options.flareBufferPixels || 6;
            //data set property names
            _this.xPropertyName = options.xPropertyName || "x";
            _this.yPropertyName = options.yPropertyName || "y";
            _this.zPropertyName = options.zPropertyName || "z";
            //set up the symbology/renderer properties
            _this.clusterRenderer = options.clusterRenderer;
            _this.areaRenderer = options.areaRenderer;
            _this.singleRenderer = options.singleRenderer;
            _this.singleSymbol = options.singleSymbol;
            _this.flareRenderer = options.flareRenderer;
            _this.refreshOnStationary = options.refreshOnStationary === false ? false : true; //default to true
            //add some default symbols or use the options values.
            _this.flareSymbol = options.flareSymbol || new SimpleMarkerSymbol({
                size: 14,
                color: new Color([0, 0, 0, 0.5]),
                outline: new SimpleLineSymbol({ color: new Color([255, 255, 255, 0.5]), width: 1 })
            });
            _this.textSymbol = options.textSymbol || new TextSymbol({
                color: new Color([255, 255, 255]),
                font: {
                    size: 10,
                    family: "arial"
                },
                yoffset: -3
            });
            _this.flareTextSymbol = options.flareTextSymbol || new TextSymbol({
                color: new Color([255, 255, 255]),
                font: {
                    size: 6,
                    family: "arial"
                },
                yoffset: -2
            });
            //initial data
            _this._data = options.data || undefined;
            _this.on("layerview-create", function (evt) { return _this._layerViewCreated(evt); });
            if (_this._data) {
                _this.draw();
            }
            return _this;
        }
        FlareClusterLayer.prototype._layerViewCreated = function (evt) {
            var _this = this;
            if (evt.layerView.view.type === "2d") {
                this._layerView2d = evt.layerView;
            }
            else {
                this._layerView3d = evt.layerView;
            }
            //add a stationary watch on the view to refresh if specified in options.
            if (this.refreshOnStationary) {
                watchUtils.pausable(evt.layerView.view, "stationary", function (isStationary, b, c, view) { return _this._viewStationary(isStationary, b, c, view); });
            }
            if (this._viewLoadCount === 0) {
                this._activeView = evt.layerView.view;
                this._readyToDraw = true;
                if (this._queuedInitialDraw) {
                    //we've been waiting for this to happen to draw
                    this.draw();
                    this._queuedInitialDraw = false;
                }
            }
            this._viewLoadCount++;
            if (evt.layerView.view.type === "2d") {
                //for map views, wait for the layerview ot be attached, before adding events
                watchUtils.whenTrueOnce(evt.layerView, "attached", function () { return _this._addViewEvents(evt.layerView); });
            }
            else {
                //for scene views just add the events straight away
                this._addViewEvents(evt.layerView);
            }
        };
        FlareClusterLayer.prototype._addViewEvents = function (layerView) {
            var _this = this;
            var v = layerView.view;
            if (!v.fclPointerMove) {
                var container = undefined;
                if (v.type === "2d") {
                    //for a map view get the container element of the layer view to add mousemove event to.
                    container = layerView.container.element;
                }
                else {
                    //for scene view get the canvas element under the view container to add mousemove to.
                    container = query("canvas", v.container)[0];
                }
                //Add pointer move and pointer down. Pointer down to handle touch devices.
                v.fclPointerMove = v.on("pointer-move", function (evt) { return _this._viewPointerMove(evt); });
                v.fclPointerDown = v.on("pointer-down", function (evt) { return _this._viewPointerMove(evt); });
                // IZ
                v.fclPointerDown = v.on("click", function (evt) { return _this._viewClicked(evt); });
            }
        };
        // IZ
        FlareClusterLayer.prototype._viewClicked = function (evt) {
            var _this = this;
            var mousePos = this._getMousePos(evt);
            //if there's an active cluster and the current screen pos is within the bounds of that cluster's group container, don't do anything more. 
            //TODO: would probably be better to check if the point is in the actual circle of the cluster group and it's flares instead of using the rectangle bounding box.
            if (this._activeCluster) {
                var bbox = this._activeCluster.clusterGroup.rawNode.getBoundingClientRect();
                if (bbox) {
                    if (mousePos.x >= bbox.left && mousePos.x <= bbox.right && mousePos.y >= bbox.top && mousePos.y <= bbox.bottom) {
                        if (this._activeCluster.gridCluster.clusterCount) {
                            console.log("Cluster count: " + this._activeCluster.gridCluster.clusterCount);
                        }
                        return;
                    }
                }
            }
            var v = this._activeView;
            this._activeView.hitTest(mousePos).then(function (response) {
                var graphics = response.results;
                if (graphics.length === 0) {
                    _this._deactivateCluster();
                    return;
                }
                for (var i = 0, len = graphics.length; i < len; i++) {
                    var g = graphics[i].graphic;
                    if (g && (g.attributes.clusterId != null && !g.attributes.isClusterArea)) {
                        var cluster = _this._clusters[g.attributes.clusterId];
                        _this._activateCluster(cluster);
                        return;
                    }
                    else {
                        _this._deactivateCluster();
                    }
                }
            });
            if (this._gridClusters) {
                console.log("Cluster count: " + this._gridClusters.length);
            }
        };
        FlareClusterLayer.prototype._viewStationary = function (isStationary, b, c, view) {
            if (isStationary) {
                if (this._data) {
                    this.draw();
                }
            }
            if (!isStationary && this._activeCluster) {
                //if moving deactivate cluster;
                this._deactivateCluster();
            }
        };
        FlareClusterLayer.prototype.clear = function () {
            this.removeAll();
            this._clusters = {};
        };
        FlareClusterLayer.prototype.setData = function (data, drawData) {
            if (drawData === void 0) { drawData = true; }
            this._data = data;
            if (drawData) {
                this.draw();
            }
        };
        FlareClusterLayer.prototype.draw = function (activeView) {
            var _this = this;
            if (activeView) {
                this._activeView = activeView;
            }
            //Not ready to draw yet so queue one up
            if (!this._readyToDraw) {
                this._queuedInitialDraw = true;
                return;
            }
            if (!this._activeView || !this._data)
                return;
            this._is2d = this._activeView.type === "2d";
            //check to make sure we have an area renderer set if one needs to be
            if (this.clusterAreaDisplay && !this.areaRenderer) {
                console.error("FlareClusterLayer: areaRenderer must be set if clusterAreaDisplay is set.");
                return;
            }
            this.clear();
            console.time("draw-data-" + this._activeView.type);
            this._isClustered = this.clusterToScale < this._scale();
            var graphics = [];
            //get an extent that is in web mercator to make sure it's flat for extent checking
            //The webextent will need to be normalized since panning over the international dateline will cause
            //cause the extent to shift outside the -180 to 180 degree window.  If we don't normalize then the
            //clusters will not be drawn if the map pans over the international dateline.
            var webExtent = !this._extent().spatialReference.isWebMercator ? webMercatorUtils.project(this._extent(), new SpatialReference({ "wkid": 102100 })) : this._extent();
            var extentIsUnioned = false;
            var normalizedWebExtent = webExtent.normalize();
            webExtent = normalizedWebExtent[0];
            if (normalizedWebExtent.length > 1) {
                webExtent = webExtent.union(normalizedWebExtent[1]);
                extentIsUnioned = true;
            }
            if (this._isClustered) {
                this._createClusterGrid(webExtent, extentIsUnioned);
            }
            var web, obj, dataLength = this._data.length, xVal, yVal;
            for (var i = 0; i < dataLength; i++) {
                obj = this._data[i];
                //check if filters are specified and continue if this object doesn't pass
                if (!this._passesFilter(obj)) {
                    continue;
                }
                xVal = obj[this.xPropertyName];
                yVal = obj[this.yPropertyName];
                //get a web merc lng/lat for extent checking. Use web merc as it's flat to cater for longitude pole
                if (this.spatialReference.isWebMercator) {
                    web = [xVal, yVal];
                }
                else {
                    web = webMercatorUtils.lngLatToXY(xVal, yVal);
                }
                //check if the obj is visible in the extent before proceeding
                if ((web[0] <= webExtent.xmin || web[0] > webExtent.xmax) || (web[1] <= webExtent.ymin || web[1] > webExtent.ymax)) {
                    continue;
                }
                if (this._isClustered) {
                    //loop cluster grid to see if it should be added to one
                    for (var j = 0, jLen = this._gridClusters.length; j < jLen; j++) {
                        var cl = this._gridClusters[j];
                        if (web[0] <= cl.extent.xmin || web[0] > cl.extent.xmax || web[1] <= cl.extent.ymin || web[1] > cl.extent.ymax) {
                            continue; //not here so carry on
                        }
                        //recalc the x and y of the cluster by averaging the points again
                        cl.x = cl.clusterCount > 0 ? (xVal + (cl.x * cl.clusterCount)) / (cl.clusterCount + 1) : xVal;
                        cl.y = cl.clusterCount > 0 ? (yVal + (cl.y * cl.clusterCount)) / (cl.clusterCount + 1) : yVal;
                        //push every point into the cluster so we have it for area display if required. This could be omitted if never checking areas, or on demand at least
                        if (this.clusterAreaDisplay) {
                            cl.points.push([xVal, yVal]);
                        }
                        cl.clusterCount++;
                        var subTypeExists = false;
                        for (var s = 0, sLen = cl.subTypeCounts.length; s < sLen; s++) {
                            if (cl.subTypeCounts[s].name === obj[this.subTypeFlareProperty]) {
                                cl.subTypeCounts[s].count++;
                                subTypeExists = true;
                                break;
                            }
                        }
                        if (!subTypeExists) {
                            cl.subTypeCounts.push({ name: obj[this.subTypeFlareProperty], count: 1 });
                        }
                        //add the single fix record if still under the maxSingleFlareCount
                        if (cl.clusterCount <= this.maxSingleFlareCount) {
                            cl.singles.push(obj);
                        }
                        else {
                            cl.singles = [];
                        }
                        break;
                    }
                }
                else {
                    //not clustered so just add every obj
                    this._createSingle(obj);
                }
            }
            if (this._isClustered) {
                for (var i = 0, len = this._gridClusters.length; i < len; i++) {
                    if (this._gridClusters[i].clusterCount < this.clusterMinCount) {
                        for (var j = 0, jlen = this._gridClusters[i].singles.length; j < jlen; j++) {
                            this._createSingle(this._gridClusters[i].singles[j]);
                        }
                    }
                    else if (this._gridClusters[i].clusterCount > 1) {
                        this._createCluster(this._gridClusters[i]);
                    }
                }
            }
            //emit an event to signal drawing is complete.
            this.emit("draw-complete", {});
            console.timeEnd("draw-data-" + this._activeView.type);
            setTimeout(function () {
                _this._createSurface();
            }, 10);
        };
        FlareClusterLayer.prototype._passesFilter = function (obj) {
            if (!this.filters || this.filters.length === 0)
                return true;
            var passes = true;
            for (var i = 0, len = this.filters.length; i < len; i++) {
                var filter = this.filters[i];
                if (obj[filter.propertyName] == null)
                    continue;
                var valExists = filter.propertyValues.indexOf(obj[filter.propertyName]) !== -1;
                if (valExists) {
                    passes = filter.keepOnlyIfValueExists; //the value exists so return whether we should be keeping it or not.
                }
                else if (!valExists && filter.keepOnlyIfValueExists) {
                    passes = false; //return false as the value doesn't exist, and we should only be keeping point objects where it does exist.
                }
                if (!passes)
                    return false; //if it hasn't passed any of the filters return false;
            }
            return passes;
        };
        FlareClusterLayer.prototype._createSingle = function (obj) {
            var point = new Point({
                x: obj[this.xPropertyName], y: obj[this.yPropertyName], z: obj[this.zPropertyName]
            });
            if (!point.spatialReference.isWebMercator) {
                point = webMercatorUtils.geographicToWebMercator(point);
            }
            var graphic = new Graphic({
                geometry: point,
                attributes: obj
            });
            graphic.popupTemplate = this.singlePopupTemplate;
            if (this.singleRenderer) {
                var symbol = this.singleRenderer.getSymbol(graphic, this._activeView);
                graphic.symbol = symbol;
            }
            else if (this.singleSymbol) {
                graphic.symbol = this.singleSymbol;
            }
            else {
                //no symbology for singles defined, use the default symbol from the cluster renderer
                graphic.symbol = this.clusterRenderer.defaultSymbol;
            }
            this.add(graphic);
        };
        FlareClusterLayer.prototype._createCluster = function (gridCluster) {
            var cluster = new Cluster();
            cluster.gridCluster = gridCluster;
            //make sure all geometries added to Graphic objects are in web mercator otherwise wrap around doesn't work.
            var point = new Point({ x: gridCluster.x, y: gridCluster.y });
            if (!point.spatialReference.isWebMercator) {
                point = webMercatorUtils.geographicToWebMercator(point);
            }
            var attributes = {
                x: gridCluster.x,
                y: gridCluster.y,
                clusterCount: gridCluster.clusterCount,
                isCluster: true,
                clusterObject: gridCluster
            };
            cluster.clusterGraphic = new Graphic({
                attributes: attributes,
                geometry: point
            });
            cluster.clusterGraphic.symbol = this.clusterRenderer.getClassBreakInfo(cluster.clusterGraphic).symbol;
            if (this._is2d && this._activeView.rotation) {
                cluster.clusterGraphic.symbol["angle"] = 360 - this._activeView.rotation;
            }
            else {
                cluster.clusterGraphic.symbol["angle"] = 0;
            }
            cluster.clusterId = cluster.clusterGraphic["uid"];
            cluster.clusterGraphic.attributes.clusterId = cluster.clusterId;
            //also create a text symbol to display the cluster count
            var textSymbol = this.textSymbol.clone();
            textSymbol.text = gridCluster.clusterCount.toString();
            if (this._is2d && this._activeView.rotation) {
                textSymbol.angle = 360 - this._activeView.rotation;
            }
            cluster.textGraphic = new Graphic({
                geometry: point,
                attributes: {
                    isClusterText: true,
                    isText: true,
                    clusterId: cluster.clusterId
                },
                symbol: textSymbol
            });
            //add an area graphic to display the bounds of the cluster if configured to
            if (this.clusterAreaDisplay && gridCluster.points && gridCluster.points.length > 0) {
                var mp = new Multipoint();
                mp.points = gridCluster.points;
                var area = geometryEngine.convexHull(mp, true); //use convex hull on the points to get the boundary
                var areaAttr = {
                    x: gridCluster.x,
                    y: gridCluster.y,
                    clusterCount: gridCluster.clusterCount,
                    clusterId: cluster.clusterId,
                    isClusterArea: true
                };
                if (area.rings && area.rings.length > 0) {
                    var areaPoly = new Polygon(); //had to create a new polygon and fill it with the ring of the calculated area for SceneView to work.
                    areaPoly = areaPoly.addRing(area.rings[0]);
                    if (!areaPoly.spatialReference.isWebMercator) {
                        areaPoly = webMercatorUtils.geographicToWebMercator(areaPoly);
                    }
                    cluster.areaGraphic = new Graphic({ geometry: areaPoly, attributes: areaAttr });
                    cluster.areaGraphic.symbol = this.areaRenderer.getClassBreakInfo(cluster.areaGraphic).symbol;
                }
            }
            //add the graphics in order        
            if (cluster.areaGraphic && this.clusterAreaDisplay === "always") {
                this.add(cluster.areaGraphic);
            }
            this.add(cluster.clusterGraphic);
            this.add(cluster.textGraphic);
            this._clusters[cluster.clusterId] = cluster;
        };
        FlareClusterLayer.prototype._createClusterGrid = function (webExtent, extentIsUnioned) {
            //get the total amount of grid spaces based on the height and width of the map (divide it by clusterRatio) - then get the degrees for x and y 
            var xCount = Math.round(this._activeView.width / this.clusterRatio);
            var yCount = Math.round(this._activeView.height / this.clusterRatio);
            //if the extent has been unioned due to normalization, double the count of x in the cluster grid as the unioning will halve it.
            if (extentIsUnioned) {
                xCount *= 2;
            }
            var xw = (webExtent.xmax - webExtent.xmin) / xCount;
            var yh = (webExtent.ymax - webExtent.ymin) / yCount;
            var gsxmin, gsxmax, gsymin, gsymax;
            //create an array of clusters that is a grid over the visible extent. Each cluster contains the extent (in web merc) that bounds the grid space for it.
            this._gridClusters = [];
            for (var i = 0; i < xCount; i++) {
                gsxmin = webExtent.xmin + (xw * i);
                gsxmax = gsxmin + xw;
                for (var j = 0; j < yCount; j++) {
                    gsymin = webExtent.ymin + (yh * j);
                    gsymax = gsymin + yh;
                    var ext = { xmin: gsxmin, xmax: gsxmax, ymin: gsymin, ymax: gsymax };
                    this._gridClusters.push({
                        extent: ext,
                        clusterCount: 0,
                        subTypeCounts: [],
                        singles: [],
                        points: [],
                        x: 0,
                        y: 0
                    });
                }
            }
        };
        /**
         * Create an svg surface on the view if it doesn't already exist
         * @param view
         */
        FlareClusterLayer.prototype._createSurface = function () {
            if (this._activeView.fclSurface)
                return;
            var surfaceParentElement = undefined;
            if (this._is2d) {
                surfaceParentElement = this._layerView2d.container.element.parentElement || this._layerView2d.container.element.parentNode;
            }
            else {
                surfaceParentElement = this._activeView.canvas.parentElement || this._activeView.canvas.parentNode;
            }
            var surface = gfx.createSurface(surfaceParentElement, "0", "0");
            surface.containerGroup = surface.createGroup();
            domStyle.set(surface.rawNode, { position: "absolute", top: "0", zIndex: -1 });
            domAttr.set(surface.rawNode, "overflow", "visible");
            domAttr.set(surface.rawNode, "class", "fcl-surface");
            this._activeView.fclSurface = surface;
            //This is a hack for IE & Edge. hitTest on the view doesn't pick up any results unless the z-index of the layerView container is at least 1. So set it to 1, but also have to set the .esri-ui
            //container to 2 otherwise it can't be clicked on as it's covered by the layer view container. meh!
            //using dojo/sniff to target IE browsers.
            if (this._is2d && (sniff("trident") || sniff("ie") || sniff("edge"))) {
                domStyle.set(this._layerView2d.container.element, "z-index", "1");
                query(".esri-ui").forEach(function (node, index) {
                    domStyle.set(node, "z-index", "2");
                });
            }
        };
        FlareClusterLayer.prototype._viewPointerMove = function (evt) {
            var _this = this;
            var mousePos = this._getMousePos(evt);
            //if there's an active cluster and the current screen pos is within the bounds of that cluster's group container, don't do anything more. 
            //TODO: would probably be better to check if the point is in the actual circle of the cluster group and it's flares instead of using the rectangle bounding box.
            if (this._activeCluster) {
                var bbox = this._activeCluster.clusterGroup.rawNode.getBoundingClientRect();
                if (bbox) {
                    if (mousePos.x >= bbox.left && mousePos.x <= bbox.right && mousePos.y >= bbox.top && mousePos.y <= bbox.bottom)
                        return;
                }
            }
            var v = this._activeView;
            this._activeView.hitTest(mousePos).then(function (response) {
                var graphics = response.results;
                if (graphics.length === 0) {
                    _this._deactivateCluster();
                    return;
                }
                for (var i = 0, len = graphics.length; i < len; i++) {
                    var g = graphics[i].graphic;
                    if (g && (g.attributes.clusterId != null && !g.attributes.isClusterArea)) {
                        var cluster = _this._clusters[g.attributes.clusterId];
                        _this._activateCluster(cluster);
                        return;
                    }
                    else {
                        _this._deactivateCluster();
                    }
                }
            });
        };
        FlareClusterLayer.prototype._activateCluster = function (cluster) {
            if (this._activeCluster === cluster) {
                return; //already active
            }
            this._deactivateCluster();
            this._activeCluster = cluster;
            this._initSurface();
            this._initCluster();
            this._initFlares();
            this._hideGraphic([this._activeCluster.clusterGraphic, this._activeCluster.textGraphic]);
            if (this.clusterAreaDisplay === "activated") {
                this._showGraphic(this._activeCluster.areaGraphic);
            }
            //console.log("activate cluster");
        };
        FlareClusterLayer.prototype._deactivateCluster = function () {
            if (!this._activeCluster)
                return;
            this._showGraphic([this._activeCluster.clusterGraphic, this._activeCluster.textGraphic]);
            this._removeClassFromElement(this._activeCluster.clusterGroup.rawNode, "activated");
            if (this.clusterAreaDisplay === "activated") {
                this._hideGraphic(this._activeCluster.areaGraphic);
            }
            this._clearSurface();
            this._activeCluster = undefined;
            //console.log("DE-activate cluster");
        };
        FlareClusterLayer.prototype._initSurface = function () {
            if (!this._activeCluster)
                return;
            var surface = this._activeView.fclSurface;
            if (!surface)
                return;
            var spp;
            var sp = this._activeView.toScreen(this._activeCluster.clusterGraphic.geometry, spp);
            //toScreen() returns the wrong value for x if a 2d map has been wrapped around the globe. Need to check and cater for this. I think this a bug in the api.
            if (this._is2d) {
                var wsw = this._activeView.state.worldScreenWidth;
                var ratio = parseInt((sp.x / wsw).toFixed(0)); //get a ratio to determine how many times the map has been wrapped around.
                if (sp.x < 0) {
                    //x is less than 0, WTF. Need to adjust by the world screen width.
                    sp.x += wsw * (ratio * -1);
                }
                else if (sp.x > wsw) {
                    //x is too big, WTF as well, cater for it.
                    sp.x -= wsw * ratio;
                }
            }
            domStyle.set(surface.rawNode, { zIndex: 11, overflow: "visible", width: "1px", height: "1px", left: sp.x + "px", top: sp.y + "px" });
            domAttr.set(surface.rawNode, "overflow", "visible");
        };
        FlareClusterLayer.prototype._clearSurface = function () {
            var surface = this._activeView.fclSurface;
            query(">", surface.containerGroup.rawNode).forEach(domConstruct.destroy);
            domStyle.set(surface.rawNode, { zIndex: -1, overflow: "hidden", top: "0px", left: "0px" });
            domAttr.set(surface.rawNode, "overflow", "hidden");
        };
        FlareClusterLayer.prototype._initCluster = function () {
            if (!this._activeCluster)
                return;
            var surface = this._activeView.fclSurface;
            if (!surface)
                return;
            //we're going to replicate a cluster graphic in the svg element we added to the layer view. Just so it can be styled easily. Native WebGL for Scene Views would probably be better, but at least this way css can still be used to style/animate things.
            this._activeCluster.clusterGroup = surface.containerGroup.createGroup();
            this._addClassToElement(this._activeCluster.clusterGroup.rawNode, "cluster-group");
            //create the cluster shape
            var clonedClusterElement = this._createClonedElementFromGraphic(this._activeCluster.clusterGraphic, this._activeCluster.clusterGroup);
            this._addClassToElement(clonedClusterElement, "cluster");
            //create the cluster text shape
            var clonedTextElement = this._createClonedElementFromGraphic(this._activeCluster.textGraphic, this._activeCluster.clusterGroup);
            this._addClassToElement(clonedTextElement, "cluster-text");
            clonedTextElement.setAttribute("pointer-events", "none");
            this._activeCluster.clusterGroup.rawNode.appendChild(clonedClusterElement);
            this._activeCluster.clusterGroup.rawNode.appendChild(clonedTextElement);
            //set the group class     
            this._addClassToElement(this._activeCluster.clusterGroup.rawNode, "activated", 10);
        };
        FlareClusterLayer.prototype._initFlares = function () {
            var _this = this;
            if (!this._activeCluster || !this.displayFlares)
                return;
            var gridCluster = this._activeCluster.gridCluster;
            //check if we need to create flares for the cluster
            var singleFlares = (gridCluster.singles && gridCluster.singles.length > 0) && (gridCluster.clusterCount <= this.maxSingleFlareCount);
            var subTypeFlares = !singleFlares && (gridCluster.subTypeCounts && gridCluster.subTypeCounts.length > 0);
            if (!singleFlares && !subTypeFlares) {
                return; //no flares required
            }
            var flares = [];
            if (singleFlares) {
                for (var i = 0, len = gridCluster.singles.length; i < len; i++) {
                    var f = new Flare();
                    f.tooltipText = gridCluster.singles[i][this.singleFlareTooltipProperty];
                    f.singleData = gridCluster.singles[i];
                    f.flareText = "";
                    flares.push(f);
                }
            }
            else if (subTypeFlares) {
                //sort sub types by highest count first
                var subTypes = gridCluster.subTypeCounts.sort(function (a, b) {
                    return b.count - a.count;
                });
                for (var i = 0, len = subTypes.length; i < len; i++) {
                    var f = new Flare();
                    f.tooltipText = subTypes[i].name + " (" + subTypes[i].count + ")";
                    f.flareText = subTypes[i].count;
                    flares.push(f);
                }
            }
            //if there are more flare objects to create than the maxFlareCount and this is a one of those - create a summary flare that contains '...' as the text and make this one part of it 
            var willContainSummaryFlare = flares.length > this.maxFlareCount;
            var flareCount = willContainSummaryFlare ? this.maxFlareCount : flares.length;
            //if there's an even amount of flares, position the first flare to the left, minus 180 from degree to do this.
            //for an add amount position the first flare on top, -90 to do this. Looks more symmetrical this way.
            var degreeVariance = (flareCount % 2 === 0) ? -180 : -90;
            var viewRotation = this._is2d ? this._activeView.rotation : 0;
            var clusterScreenPoint = this._activeView.toScreen(this._activeCluster.clusterGraphic.geometry);
            var clusterSymbolSize = this._activeCluster.clusterGraphic.symbol.get("size");
            for (var i_1 = 0; i_1 < flareCount; i_1++) {
                var flare = flares[i_1];
                //set some attribute data
                var flareAttributes = {
                    isFlare: true,
                    isSummaryFlare: false,
                    tooltipText: "",
                    flareTextGraphic: undefined,
                    clusterGraphicId: this._activeCluster.clusterId,
                    clusterCount: gridCluster.clusterCount
                };
                var flareTextAttributes = {};
                //Do a couple of things differently if this is a summary flare or not
                var isSummaryFlare = willContainSummaryFlare && i_1 >= this.maxFlareCount - 1;
                if (isSummaryFlare) {
                    flare.isSummary = true;
                    flareAttributes.isSummaryFlare = true;
                    var tooltipText = "";
                    //multiline tooltip for summary flares, ie: greater than this.maxFlareCount flares per cluster
                    for (var j = this.maxFlareCount - 1, jlen = flares.length; j < jlen; j++) {
                        tooltipText += j > (this.maxFlareCount - 1) ? "\n" : "";
                        tooltipText += flares[j].tooltipText;
                    }
                    flare.tooltipText = tooltipText;
                }
                flareAttributes.tooltipText = flare.tooltipText;
                //create a graphic for the flare and for the flare text
                flare.graphic = new Graphic({
                    attributes: flareAttributes,
                    geometry: this._activeCluster.clusterGraphic.geometry,
                    popupTemplate: null
                });
                flare.graphic.symbol = this._getFlareSymbol(flare.graphic);
                if (this._is2d && this._activeView.rotation) {
                    flare.graphic.symbol["angle"] = 360 - this._activeView.rotation;
                }
                else {
                    flare.graphic.symbol["angle"] = 0;
                }
                if (flare.flareText) {
                    var textSymbol = this.flareTextSymbol.clone();
                    textSymbol.text = !isSummaryFlare ? flare.flareText.toString() : "...";
                    if (this._is2d && this._activeView.rotation) {
                        textSymbol.angle = 360 - this._activeView.rotation;
                    }
                    flare.textGraphic = new Graphic({
                        attributes: {
                            isText: true,
                            clusterGraphicId: this._activeCluster.clusterId
                        },
                        symbol: textSymbol,
                        geometry: this._activeCluster.clusterGraphic.geometry
                    });
                }
            }
            var _loop_1 = function (i_2, len_1) {
                var f = flares[i_2];
                if (!f.graphic)
                    return "continue";
                //create a group to hold flare object and text if needed. 
                f.flareGroup = this_1._activeCluster.clusterGroup.createGroup();
                var position = this_1._setFlarePosition(f.flareGroup, clusterSymbolSize, flareCount, i_2, degreeVariance, viewRotation);
                this_1._addClassToElement(f.flareGroup.rawNode, "flare-group");
                var flareElement = this_1._createClonedElementFromGraphic(f.graphic, f.flareGroup);
                f.flareGroup.rawNode.appendChild(flareElement);
                if (f.textGraphic) {
                    var flareTextElement = this_1._createClonedElementFromGraphic(f.textGraphic, f.flareGroup);
                    flareTextElement.setAttribute("pointer-events", "none");
                    f.flareGroup.rawNode.appendChild(flareTextElement);
                }
                this_1._addClassToElement(f.flareGroup.rawNode, "activated", 10);
                //assign some event handlers for the tooltips
                f.flareGroup.mouseEnter = on.pausable(f.flareGroup.rawNode, "mouseenter", function () { return _this._createTooltip(f); });
                f.flareGroup.mouseLeave = on.pausable(f.flareGroup.rawNode, "mouseleave", function () { return _this._destroyTooltip(); });
                // IZ
                f.flareGroup.Click = on.pausable(f.flareGroup.rawNode, "click", function () { return _this._selectObj(f); });
            };
            var this_1 = this;
            //flares have been created so add them to the dom
            for (var i_2 = 0, len_1 = flares.length; i_2 < len_1; i_2++) {
                _loop_1(i_2, len_1);
            }
        };
        // IZ
        FlareClusterLayer.prototype._selectObj = function (flare) {
            console.log(flare.tooltipText);
            if (flare.singleData == null || flare.singleData == undefined) {
                return;
            }
            console.log(flare.singleData.AssetID + ": " + flare.singleData.WorkTicketID);
            this.assetID = flare.singleData.AssetID;
            this.wtID = flare.singleData.WorkTicketID;
            //queryAndShowPopup(this._activeView, flare.singleData.AssetID, flare.singleData.WorkTicketID, flare.graphic.geometry);
            return;
            var flareGroup = flare.flareGroup;
            this._destroyTooltip();
            var tooltipLength = query(".tooltip-text", flareGroup.rawNode).length;
            if (tooltipLength > 0) {
                return;
            }
            //get the text from the data-tooltip attribute of the shape object
            var text = flare.tooltipText;
            if (!text) {
                console.log("no tooltip text for flare.");
                return;
            }
            //split on \n character that should be in tooltip to signify multiple lines
            var lines = text.split("\n");
            //create a group to hold the tooltip elements
            var tooltipGroup = flareGroup.createGroup();
            //get the flare symbol, we'll use this to style the tooltip box
            var flareSymbol = this._getFlareSymbol(flare.graphic);
            //align on top for normal flare, align on bottom for summary flares.
            var height = flareSymbol.size;
            var xPos = 1;
            var yPos = !flare.isSummary ? ((height) * -1) : height + 5;
            tooltipGroup.rawNode.setAttribute("class", "tooltip-text");
            var textShapes = [];
            for (var i = 0, len = lines.length; i < len; i++) {
                var textShape = tooltipGroup.createText({ x: xPos, y: yPos + (i * 10), text: lines[i], align: 'middle' })
                    .setFill(this.flareTextSymbol.color)
                    .setFont({ size: 10, family: this.flareTextSymbol.font.get("family"), weight: this.flareTextSymbol.font.get("weight") });
                textShapes.push(textShape);
                textShape.rawNode.setAttribute("pointer-events", "none");
            }
            var rectPadding = 2;
            var textBox = tooltipGroup.getBoundingBox();
            var rectShape = tooltipGroup.createRect({ x: textBox.x - rectPadding, y: textBox.y - rectPadding, width: textBox.width + (rectPadding * 2), height: textBox.height + (rectPadding * 2), r: 0 })
                .setFill(flareSymbol.color);
            if (flareSymbol.outline) {
                rectShape.setStroke({ color: flareSymbol.outline.color, width: 0.5 });
            }
            rectShape.rawNode.setAttribute("pointer-events", "none");
            flareGroup.moveToFront();
            for (var i = 0, len = textShapes.length; i < len; i++) {
                textShapes[i].moveToFront();
            }
        };
        FlareClusterLayer.prototype._setFlarePosition = function (flareGroup, clusterSymbolSize, flareCount, flareIndex, degreeVariance, viewRotation) {
            //get the position of the flare to be placed around the container circle.
            var degree = parseInt(((360 / flareCount) * flareIndex).toFixed());
            degree = degree + degreeVariance;
            //take into account any rotation on the view
            if (viewRotation !== 0) {
                degree -= viewRotation;
            }
            var radian = degree * (Math.PI / 180);
            var buffer = this.flareBufferPixels;
            //position the flare group around the cluster
            var position = {
                x: (buffer + clusterSymbolSize) * Math.cos(radian),
                y: (buffer + clusterSymbolSize) * Math.sin(radian)
            };
            flareGroup.setTransform({ dx: position.x, dy: position.y });
            return position;
        };
        FlareClusterLayer.prototype._getFlareSymbol = function (flareGraphic) {
            return !this.flareRenderer ? this.flareSymbol : this.flareRenderer.getClassBreakInfo(flareGraphic).symbol;
        };
        FlareClusterLayer.prototype._createTooltip = function (flare) {
            var flareGroup = flare.flareGroup;
            this._destroyTooltip();
            var tooltipLength = query(".tooltip-text", flareGroup.rawNode).length;
            if (tooltipLength > 0) {
                return;
            }
            //get the text from the data-tooltip attribute of the shape object
            var text = flare.tooltipText;
            if (!text) {
                console.log("no tooltip text for flare.");
                return;
            }
            //split on \n character that should be in tooltip to signify multiple lines
            var lines = text.split("\n");
            //create a group to hold the tooltip elements
            var tooltipGroup = flareGroup.createGroup();
            //get the flare symbol, we'll use this to style the tooltip box
            var flareSymbol = this._getFlareSymbol(flare.graphic);
            //align on top for normal flare, align on bottom for summary flares.
            var height = flareSymbol.size;
            var xPos = 1;
            var yPos = !flare.isSummary ? ((height) * -1) : height + 5;
            tooltipGroup.rawNode.setAttribute("class", "tooltip-text");
            var textShapes = [];
            for (var i = 0, len = lines.length; i < len; i++) {
                var textShape = tooltipGroup.createText({ x: xPos, y: yPos + (i * 10), text: lines[i], align: 'middle' })
                    .setFill(this.flareTextSymbol.color)
                    .setFont({ size: 10, family: this.flareTextSymbol.font.get("family"), weight: this.flareTextSymbol.font.get("weight") });
                textShapes.push(textShape);
                textShape.rawNode.setAttribute("pointer-events", "none");
            }
            var rectPadding = 2;
            var textBox = tooltipGroup.getBoundingBox();
            var rectShape = tooltipGroup.createRect({ x: textBox.x - rectPadding, y: textBox.y - rectPadding, width: textBox.width + (rectPadding * 2), height: textBox.height + (rectPadding * 2), r: 0 })
                .setFill(flareSymbol.color);
            if (flareSymbol.outline) {
                rectShape.setStroke({ color: flareSymbol.outline.color, width: 0.5 });
            }
            rectShape.rawNode.setAttribute("pointer-events", "none");
            flareGroup.moveToFront();
            for (var i = 0, len = textShapes.length; i < len; i++) {
                textShapes[i].moveToFront();
            }
        };
        FlareClusterLayer.prototype._destroyTooltip = function () {
            query(".tooltip-text", this._activeView.fclSurface.rawNode).forEach(domConstruct.destroy);
        };
        //#region helper functions
        FlareClusterLayer.prototype._createClonedElementFromGraphic = function (graphic, surface) {
            //fake out a GFXObject so we can generate an svg shape that the passed in graphics shape
            var g = new GFXObject();
            g.graphic = graphic;
            g.renderingInfo = { symbol: graphic.symbol };
            //set up parameters for the call to render
            //set the transform of the projector to 0's as we're just placing the generated cluster shape at exactly 0,0.
            var projector = new Projector();
            projector._transform = [0, 0, 0, 0, 0, 0];
            projector._resolution = 0;
            var state = undefined;
            if (this._is2d) {
                state = this._activeView.state;
            }
            else {
                //fake out a state object for 3d views.
                state = {
                    clippedExtent: this._activeView.extent,
                    rotation: 0,
                    spatialReference: this._activeView.spatialReference,
                    worldScreenWidth: 1
                };
            }
            var par = {
                surface: surface,
                state: state,
                projector: projector
            };
            g.render(par);
            return g._shape.rawNode;
        };
        FlareClusterLayer.prototype._extent = function () {
            return this._activeView ? this._activeView.extent : undefined;
        };
        FlareClusterLayer.prototype._scale = function () {
            return this._activeView ? this._activeView.scale : undefined;
        };
        //IE / Edge don't have the classList property on svg elements, so we can't use that add / remove classes - probably why dojo domClass doesn't work either.
        //so the following two functions are dodgy string hacks to add / remove classes. Uses a timeout so you can make css transitions work if desired.
        FlareClusterLayer.prototype._addClassToElement = function (element, className, timeoutMs, callback) {
            var addClass = function (_element, _className) {
                var currentClass = _element.getAttribute("class");
                if (!currentClass)
                    currentClass = "";
                if (currentClass.indexOf(" " + _className) !== -1)
                    return;
                var newClass = (currentClass + " " + _className).trim();
                _element.setAttribute("class", newClass);
            };
            if (timeoutMs) {
                setTimeout(function () {
                    addClass(element, className);
                    if (callback) {
                        callback();
                    }
                }, timeoutMs);
            }
            else {
                addClass(element, className);
            }
        };
        FlareClusterLayer.prototype._removeClassFromElement = function (element, className, timeoutMs, callback) {
            var removeClass = function (_element, _className) {
                var currentClass = _element.getAttribute("class");
                if (!currentClass)
                    return;
                if (currentClass.indexOf(" " + _className) === -1)
                    return;
                _element.setAttribute("class", currentClass.replace(" " + _className, ""));
            };
            if (timeoutMs) {
                setTimeout(function () {
                    removeClass(element, className);
                    if (callback) {
                        callback();
                    }
                }, timeoutMs);
            }
            else {
                removeClass(element, className);
            }
        };
        FlareClusterLayer.prototype._getMousePos = function (evt) {
            //container on the view is actually a html element at this point, not a string as the typings suggest.
            var container = this._activeView.container;
            var rect = container.getBoundingClientRect();
            return {
                x: evt.x - rect.left,
                y: evt.y - rect.top
            };
        };
        /**
         * Setting visible to false on a graphic doesn't work in 4.2 for some reason. Removing the graphic to hide it instead. I think visible property should probably work though.
         * @param graphic
         */
        FlareClusterLayer.prototype._hideGraphic = function (graphic) {
            if (!graphic)
                return;
            if (graphic.hasOwnProperty("length")) {
                this.removeMany(graphic);
            }
            else {
                this.remove(graphic);
            }
        };
        FlareClusterLayer.prototype._showGraphic = function (graphic) {
            if (!graphic)
                return;
            if (graphic.hasOwnProperty("length")) {
                this.addMany(graphic);
            }
            else {
                this.add(graphic);
            }
        };
        return FlareClusterLayer;
    }(asd.declared(GraphicsLayer)));
    FlareClusterLayer = __decorate([
        asd.subclass("FlareClusterLayer")
    ], FlareClusterLayer);
    exports.FlareClusterLayer = FlareClusterLayer;
    var GridCluster = (function () {
        function GridCluster() {
            this.subTypeCounts = [];
            this.singles = [];
            this.points = [];
        }
        return GridCluster;
    }());
    var Cluster = (function () {
        function Cluster() {
        }
        return Cluster;
    }());
    var Flare = (function () {
        function Flare() {
        }
        return Flare;
    }());
    var PointFilter = (function () {
        function PointFilter(filterName, propertyName, values, keepOnlyIfValueExists) {
            if (keepOnlyIfValueExists === void 0) { keepOnlyIfValueExists = false; }
            this.filterName = filterName;
            this.propertyName = propertyName;
            this.propertyValues = values;
            this.keepOnlyIfValueExists = keepOnlyIfValueExists;
        }
        return PointFilter;
    }());
    exports.PointFilter = PointFilter;
    function queryAndShowPopup(view, asID, wtID, mapPnt) {
        console.log("Inside queryAndShowPopup()!");
        //initialize query task         
        var queryTask = new QueryTask("https://services2.arcgis.com/80HBwlYoN0Ix3abu/arcgis/rest/services/TestWorkTicketLyr/FeatureServer/0");
        var query = new Query();
        query.returnGeometry = true;
        query.outFields = [
            "*"
        ];
        query.where = "AssetID = " + asID + " AND WorkTicketID = " + wtID;
        // NOTE: Use this format to call promises i.e function call with then and the callback function as param to then
        queryTask.execute(query).then(showResults);
        function showResults(featureSet) {
            // Shows the results in a popup once the promise is resolved              
            var resultFeatures = featureSet.features;
            resultFeatures.forEach(function (feature, i) {
                feature.popupTemplate = {
                    title: "{Map Unit Name}",
                    content: "<b>AssetID:</b> {AssetID}" +
                        "<br><b>WorkTicketID:</b> {WorkTicketID} " +
                        "<br><b>Employee ID:</b> {EmpID} " +
                        "<br><b>Employee Email:</b> {EmpEmail}"
                };
            });
            if (resultFeatures.length > 0) {
                view.popup.open({
                    features: resultFeatures,
                    location: mapPnt
                });
            }
        }
    }
});
//# sourceMappingURL=FlareClusterLayer_v4.js.map