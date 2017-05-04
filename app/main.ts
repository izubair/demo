
import EsriMap = require("esri/Map");
import WebMap = require("esri/WebMap");
import MapView=require("esri/views/MapView");
import FeatureLayer=require("esri/layers/FeatureLayer");
import OAuthInfo= require("esri/identity/OAuthInfo");
import esriId=require("esri/identity/IdentityManager");
import SimpleMarkerSymbol=require("esri/symbols/SimpleMarkerSymbol");
import QueryTask=require("esri/tasks/QueryTask");
import Query=require("esri/tasks/support/Query");
import Color=require("esri/Color");
import SimpleLineSymbol=require("esri/symbols/SimpleLineSymbol");

import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/Graphic");
import Polygon=require("esri/geometry/Polygon");
import Polyline=require("esri/geometry/Polyline");
import Point = require("esri/geometry/Point");

import SimpleFillSymbol = require("esri/symbols/SimpleFillSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
//import TextSymbol3DLayer = require("esri/symbols/TextSymbol3DLayer");
import Font = require("esri/symbols/Font");
import geometryEngine = require("esri/geometry/geometryEngine");
import Extent = require("esri/geometry/Extent");
import SpatialReference = require("esri/geometry/SpatialReference");
//import Color=require("dojo/_base/Color");

import BasemapGallery=require("esri/widgets/BasemapGallery");
import LayerList=require("esri/widgets/LayerList");
import Expand=require("esri/widgets/Expand");
import Search=require("esri/widgets/Search");
import Home=require("esri/widgets/Home");
import ScaleBar=require("esri/widgets/ScaleBar");
import config=require("app/config");
import eventHandlers=require("app/EventHandlers");
import HelloWorld=require("app/HelloWorld");
import AssetEdit=require("app/AssetEdit");
import AssetsList=require("app/AssetsList");
import arrayUtils=require("dojo/_base/array");
import ClassBreaksRenderer=require("esri/renderers/ClassBreaksRenderer");
import PopupTemplate=require("esri/PopupTemplate");
import watchUtils=require("esri/core/watchUtils");
import fcl=require("fcl/FlareClusterLayer_v4");


var myConfig=config.getConfig();

var featureLayer, editFeature;
var myWidget;
var initX, initY;
var finalPnt;
let editFeatureLyrs: FeatureLayer[]=[];

let editWidget;

let myPolyLinePnts=[];

var wtFeatures;
var signFeatures;
var startup;

var PW_Signs_Created=false;

var webmap,
    mapView,
    sceneView,
    activeView,
    graphics,
    clusterLayer,
    clusterLayer_Signs;

//set some defaults
var maxSingleFlareCount=8;
var areaDisplayMode="activated";

// appid: dca0173c41e0452e9a528eec963c09f3
// "wXI6P8IG9iZSW4RC"
/*
var oAuthInfo = new OAuthInfo({
        appId: "52d69db1858d4ad59cd63bbb18c33f70", //required parameter
        //specify optional parameters if needed
				});
				
    esriId.registerOAuthInfos([oAuthInfo]);*/

//alert(myConfig.mapInitLat);

//const map = new EsriMap({
//  basemap: "streets"
//});

startup=true;
webmap = new WebMap({
  portalItem: { // autocasts as new PortalItem()
//    id: "52d69db1858d4ad59cd63bbb18c33f70"
      id: "d1446a70b90a4c3e87cd1dfcb9cf2337"
  }
});

mapView = new MapView({
  map: webmap,
  container: "viewDiv",
  center: [-115.144, 36.152],
  zoom: 8
});

var bufferLayer=new GraphicsLayer();
var pointLayer=new GraphicsLayer();
bufferLayer.title="GraphicsBufferLayer";
pointLayer.title="GraphicsPointLayer";
webmap.addMany([bufferLayer, pointLayer]);


mapView.then(function () {     
   
    createWidgetPanel();
    mapView.ui.add({ component: scaleBar, position: "bottom-left", index: 0 });

    activeView=mapView; 

    editWidget=new AssetEdit("Manage Assets", mapView, document.createElement("div")); 

    mapView.on("layerview-create", function (event) {
        // The event contains the layer and its layer view that has just been
        // created. Here we check for the creation of a layer view for a layer with
        // a specific id, and log the layer view           
        console.log(event.layer.title);

        if (event.layer.type==="feature") {
            editFeatureLyrs.push(event.layer);
            //editWidget.addLayer(event.layer);
        }

        if (event.layer.title==="TestWorkTicketLyr") {
            // The LayerView for the desired layer
            for (let ind=0; ind<event.layer.fields.length; ind++) {
                console.log("Field Name: " + event.layer.fields[ind].name + " Field Type: " + event.layer.fields[ind].type);
            }

//            queryWTLayerFeatures();
        }

        if (event.layer.title==="PW_Signs") {
            // The LayerView for the desired layer
            for (let ind=0; ind<event.layer.fields.length; ind++) {
                console.log("Field Name: "+event.layer.fields[ind].name+" Field Type: "+event.layer.fields[ind].type);
            }

            PW_Signs_Created=true;
            //querySignsLayerFeatures();
            
        }
    });

    mapView.on("double-click", function (evt) {
        clearGraphics();
        //myPolyLinePnts.push(Pnt);
        let selLyr=getEditLayer();
        if (selLyr==null||selLyr==undefined)
            return;

        if (selLyr.geometryType==="polygon") {
            let geometry=drawPolygon(myPolyLinePnts);
            editWidget.addAsset(selLyr, geometry);
            $("#viewDiv")[0].style.cursor="auto";
            // Also clear the points array
            myPolyLinePnts=[];
        }
        else if (selLyr.geometryType==="polyline") {
            let geometry=drawPolyline(myPolyLinePnts);
            editWidget.addAsset(selLyr, geometry);
            $("#viewDiv")[0].style.cursor="auto";
            // Also clear the points array
            myPolyLinePnts=[];
        }
    });

    mapView.on("click", function (evt) {
        //console.log("Click: "+evt.x+":"+evt.y);      
        var lat=Math.round(evt.mapPoint.latitude*1000)/1000;
        var lon=Math.round(evt.mapPoint.longitude*1000)/1000;
        console.log("click event for map view. Lat: "+lat+" Lon: "+lon);

        let Pnt=[lon, lat];

        clearGraphics();

        let selLyr=getEditLayer();
        if (selLyr!=null||selLyr!=undefined) {
            if ((selLyr.title==="PolyLayer"||
                selLyr.title==="RoadsLayer")&&editWidget.addFlag==true) {
                myPolyLinePnts.push(Pnt);
                drawPolyline(myPolyLinePnts);
            }
        }
        

        // the hitTest() checks to see if any graphics in the mapView
        // intersect the given screen x, y coordinates        
        unselectFeature();

        mapView.hitTest(evt.screenPoint)
            .then(getGraphics);

        if (myWidget!=null&&myWidget!=undefined&&myWidget.widgetName==="Manage Assets"&&myWidget.addFlag&&evt.screenPoint) {

            let selLyr=getEditLayer();

            if (selLyr!=null&&selLyr!=undefined&&selLyr.title==="TestAssetsLayer") {
                var point=evt.mapPoint.clone();
                point.z=undefined;
                point.hasZ=false;


                featureLayer=webmap.allLayers.find(function (layer) {
                    return layer.title==="TestAssetsLayer";
                });

                myWidget.addAsset(featureLayer, point);
                $("#viewDiv")[0].style.cursor="auto";
                // Also clear the points array
                myPolyLinePnts=[];
            }


        }
        else {
            //console.error("evt.mapPoint is not defined");
        }
    });
    function getGraphics(response) {
        var graphic=response.results[0].graphic;        

        var attributes=graphic.attributes;
        var asid=attributes.ASID;        
        var lyrID=graphic.layer.id;

        featureLayer=webmap.allLayers.find(function (layer) {
            return layer.id===lyrID;
        });

        selectFeature(lyrID, graphic.attributes[featureLayer.objectIdField]);
        if (myWidget!=null && myWidget!=undefined && myWidget.widgetName==="Manage Assets") {
            myWidget.updateAttr(featureLayer, graphic);
        }
        //console.log("Asset: "+asid+"on layer: "+lyrID+" clicked!");
    }

    /****************************************
          * Clear the graphics from GraphicsLayers
          ****************************************/
    function clearGraphics() {
        pointLayer.removeAll();
        bufferLayer.removeAll();
    }

    var area;
    function bufferPoint(point, initPoint) {
        clearGraphics();

        //var startExtent = new Extent(-95.271, 38.933, -95.228, 38.976, new SpatialReference({ wkid: 4326 }));
        var startExtent=new Extent({ xmin: initPoint.longitude, ymin: initPoint.latitude, xmax: point.longitude, ymax: point.latitude, spatialReference: new SpatialReference({ wkid: 4326 }) });

        //var area = Polygon.fromExtent(mapView.extent);
        area=Polygon.fromExtent(startExtent);

        var polySym= new SimpleFillSymbol({
            color: new Color([140, 140, 222, 0.2]),
            outline: {
                color: new Color([0, 0, 240, 0.5]),
                width: 2
            }
        });

        var graphic=new Graphic({
            geometry: area,
            symbol: polySym
        });

        bufferLayer.add(graphic);
    }

    function drawPolyline(polyLinePnts) {
        clearGraphics();

        if (polyLinePnts.length<2)
            return;

        console.log("polyLinePnts.length: "+polyLinePnts.length);

        // First create a line geometry (this is the Keystone pipeline)
        var polyline=new Polyline({
            paths: polyLinePnts
        });

        // Create a symbol for drawing the line
        var lineSymbol=new SimpleLineSymbol({
            color: new Color([226, 119, 40]),
            width: 4
        });




        var polyLineGraphic=new Graphic({
            geometry: polyline,
            symbol: lineSymbol
        });

        bufferLayer.add(polyLineGraphic);

        return polyline;
    }

    function drawPolygon(polyLinePnts) {
        clearGraphics();

        if (polyLinePnts.length<2)
            return;

        // Create a polygon geometry
        var polygon=new Polygon({
            rings: polyLinePnts
        });

        // Create a symbol for rendering the graphic
        var fillSymbol=new SimpleFillSymbol({
            color: new Color([227, 139, 79, 0.8]),
            outline: { // autocasts as new SimpleLineSymbol()
                color: new Color([255, 255, 255]),
                width: 1
            }
        });

        // Add the geometry and symbol to a new graphic
        var polygonGraphic=new Graphic({
            geometry: polygon,
            symbol: fillSymbol
        });

        bufferLayer.add(polygonGraphic);

        return polygon;
    }

    let newArray=[];
    mapView.on('pointer-move', function (evt) {
        if (editWidget.addFlag==true) {

            let Pnt=mapView.toMap({ x: evt.x, y: evt.y });

            console.log("Pnt.Lat: "+Pnt.latitude+" Pnt.Lon: "+Pnt.longitude)
            let myMapPnt=[Pnt.longitude, Pnt.latitude];
            //myPolyLinePnts.push(myMapPnt);
            newArray=myPolyLinePnts.slice();
            newArray.push(myMapPnt);
            let selLyr=getEditLayer();
            if (selLyr!=null&&selLyr!=undefined) {
                if (selLyr.title==="PolyLayer") {
                    drawPolyline(newArray);
                }
                else if (selLyr.title==="RoadsLayer") {
                    drawPolyline(newArray);
                }
            }


        }

    }); // on pointer-move

    mapView.on('pointer-down', function (evt) {
        //console.log("pointer-down: "+evt.x+":"+evt.y);
        // prevent further propagation of the current event bubbling up the event chain.
        evt.stopPropagation();

//        clearGraphics();

        initX=evt.x;
        initY=evt.y;
        console.log("X: "+evt.x+" Y: "+evt.y);
        var screenPnt=new Point();
        screenPnt.x=evt.x;
        screenPnt.y=evt.y;

        mapView.hitTest(screenPnt).then(function (response) {
            if (response.results.length>0&&response.results[0].graphic) {

                editFeature=response.results[0].graphic;
                var lyrID=editFeature.layer.id;

                featureLayer=webmap.allLayers.find(function (layer) {
                    return layer.id===lyrID;
                });
                //selectFeature(feature.attributes[featureLayer.objectIdField]);

                //mapmapView.popup.show();

                //widget.updateAttr(featureLayer, editFeature);
            }

        });
    });
    //let elemDiv = document.createElement("div");
    //let elemOL = document.createElement("ol");

    mapView.on('pointer-up', function (evt) {
        //console.log("pointer-up: "+evt.x+":"+evt.y);

        if (myWidget!=null&&myWidget!=undefined&&myWidget.widgetName==="Manage Assets"&&myWidget.relocateFlag&&
            editFeature!=undefined&&finalPnt!=undefined&&featureLayer!=undefined) {
            // if graphics layer
            if (featureLayer.title=="GraphicsBufferLayer"||
                featureLayer.title=="GraphicsPointLayer"||
                featureLayer.title=="flare-cluster-layer") {
                return; // don't call editWidget.moveAsset() which updates the feature layers on the map
            }
            myWidget.moveAsset(featureLayer, editFeature, finalPnt);
            return;
        }

        if (area==null) {
            return;
        }
        featureLayer=webmap.allLayers.find(function (layer) {
            return layer.title==="TestAssetsLayer";
        });
        // Get a query object for the layer's current configuration
        var queryParams=featureLayer.createQuery();
        // set a geometry for filtering features by a region of interest
        queryParams.geometry=area;
        // Add to the layer's current definitionExpression
        //queryParams.where = queryParams.where + " AND TYPE = 'Extreme'";

        // query the layer with the modified params object

        //elemOL.id = "myOL";
        //$("#myOL").empty();
        featureLayer.queryFeatures(queryParams).then(function (results) {
            // prints the array of result graphics to the console
            console.log(results.features);

            //elemDiv.appendChild(elemOL);
            /*
            results.features.forEach(function (item, i) {
                // Do something here to each feature
                var li = document.createElement("li");
                //li.value = item.attributes.ASID;
                li.innerHTML = item.attributes.ASID + ": " + item.attributes.Name;
                elemOL.appendChild(li);                    
                
            });*/
            if (myWidget!=null&&myWidget!=undefined&&myWidget.widgetName==="Assets List") {
                myWidget.fillList(results.features);   
                mapView.ui.add(myWidget, "top-right");                           
            }
            
        });
        area=null;
    })

    // Listen to drag event on MapmapView
    mapView.on('drag', function (evt) {
        //>>>>>>> for testing
        //console.log("drag"+evt.x); 
        if (myWidget==null||myWidget==undefined||(myWidget.widgetName!="Manage Assets"&&myWidget.widgetName!="Assets List"))
            return;

        if (myWidget.widgetName==="Manage Assets" &&myWidget.relocateFlag==false)
            return;
        // prevent further propagation of the current event bubbling up the event chain.
        evt.stopPropagation();
        //console.log("X: " + evt.x + " Y: " + evt.y);          
        //mapView.graphics.removeAll(); 
        clearGraphics();

        // convert screen coordinates to map coordinates
        finalPnt=mapView.toMap({ x: evt.x, y: evt.y });
        //var screenPnt=new Point();
        //screenPnt.x=evt.x;
        //screenPnt.y=evt.y;

        var initPoint=mapView.toMap({ x: initX, y: initY });
        //var point = mapView.toMap(evt.screenPoint);
        if (finalPnt&&initPoint) {
            //mapView.graphics.add(point);
            if (myWidget.widgetName==="Manage Assets") {
                let mySym;
                var pointSym= new SimpleMarkerSymbol({
                    color: new Color([255, 0, 0]),
                    outline: {
                        color: new Color([255, 255, 255]),
                        width: 1
                    },
                    size: 7
                });
                if (featureLayer==null||featureLayer==undefined||
                    featureLayer.renderer==null||featureLayer.renderer==undefined) {
                    mySym=pointSym;
                }
                else {
                    mySym=featureLayer.renderer.symbol;
                }

                if (mySym!=null&&mySym!=undefined&&finalPnt!=undefined) {
                    pointLayer.add(new Graphic({
                        geometry: finalPnt,
                        symbol: mySym
                    }));
                }
            }
            else if (myWidget.widgetName==="Assets List") {
                bufferPoint(finalPnt, initPoint);
            }
        }
    });// on drag  

    // Watch view's stationary property for becoming true. 
    watchUtils.whenTrue(mapView, "stationary", function () {
        // Get the new center of the view only when view is stationary. 
        if (mapView.center) {
            var info="<br> <span> the view center changed. </span> x: "+
                mapView.center.x.toFixed(2)+" y: "+mapView.center.y.toFixed(2);
            console.log(info);
        }

        // Get the new extent of the view only when view is stationary. 
        if (mapView.extent) {
            var info="<br> <span> the view extent changed: </span>"+
                "<br> xmin:"+mapView.extent.xmin.toFixed(2)+" xmax: "+
                mapView.extent.xmax.toFixed(
                    2)+
                "<br> ymin:"+mapView.extent.ymin.toFixed(2)+" ymax: "+
                mapView.extent.ymax.toFixed(
                    2);
            console.log(info);

            //clearLayer_Signs();
            // Get PW_Signs features using current view extent
            //querySignsLayerFeatures();
            if (PW_Signs_Created) {
                let signsLayer=webmap.allLayers.find(function (layer) {
                    return layer.title==="PW_Signs";
                });

                var area=Polygon.fromExtent(mapView.extent);
                var queryParams=signsLayer.createQuery();
                queryParams.geometry=area;

                signsLayer.queryFeatureCount(queryParams).then(function (numFeatures) {
                    // prints the total count to the console
                    console.log("FeatureCount: "+numFeatures);
                    if (numFeatures<2000) {
                        querySignsLayerFeatures();
                    }
                    else {
                        signsInfo.data=[];                       
                        clusterLayer_Signs.setData(signsInfo.data, true);
                    }

                });
            }
        }
    });

    // *****************************************************
    // select Feature function
    // 1. Select the newly created feature on the view
    // 2. or select an existing feature when user click on it
    // 3. Symbolize the feature with cyan rectangle
    // *****************************************************
    function selectFeature(layerID, objectId) {        
        console.log("Inside selectFeature()!");
        featureLayer=webmap.allLayers.find(function (layer) {
            return layer.id===layerID;
        });
        console.log("featureLayer.title: "+featureLayer.title);
        //initialize query task         
        var queryTask=new QueryTask("https://services2.arcgis.com/80HBwlYoN0Ix3abu/arcgis/rest/services/" + featureLayer.title +"/FeatureServer/0");
        var query=new Query();
        query.returnGeometry=true;
        query.outFields=[
            "*"
        ];
        //create symbol for selected features
        // symbol for the selected feature on the view
        var selectionSymbol= new SimpleMarkerSymbol({            
            style: "square",
            color: new Color([0, 0, 0, 0]),
            size: 40,
            outline: {
                color: new Color([0, 255, 255, 1]),
                width: 3
            }
        });

        // Create a symbol for rendering the graphic
        var fillSymbol=new SimpleFillSymbol({
            color: new Color([0, 139, 79, 0.3]),
            outline: { // autocasts as new SimpleLineSymbol()
                color: new Color([0, 255, 255, 1]),
                width: 1
            }
        });

        // Create a symbol for drawing the line
        var lineSymbol=new SimpleLineSymbol({
            color: new Color([0, 255, 255, 1]),
            width: 2
        });

        query.where=featureLayer.objectIdField+" = "+objectId;
        //queryTask.execute(query).then(function (results) {
            // Results.graphics contains the graphics returned from query
        //    console.log("1. Never gets into this!");
        //});
        // NOTE: Use this format to call promises i.e function call with then and the callback function as param to then
        queryTask.execute(query).then(showResults);

        function showResults(featureSet) {
            //console.log("Never gets into this!");
            //remove all graphics on the maps graphics layer
            mapView.graphics.removeAll();

            //Performance enhancer - assign featureSet array to a single variable.
            var resultFeatures=featureSet.features;

            //Loop through each feature returned
            for (var i=0, il=resultFeatures.length; i<il; i++) {
                //Get the current feature from the featureSet.
                //Feature is a graphic              
                var graphic=resultFeatures[i];
                let mySym;
                if (graphic.geometry.type==="polygon")
                    mySym=fillSymbol;
                else if (graphic.geometry.type==="polyline")
                    mySym=lineSymbol;
                else
                    mySym=selectionSymbol;

                graphic.symbol=mySym;
                //graphic.setSymbol(selectionSymbol);

                //Set the infoTemplate.
                //graphic.setInfoTemplate(infoTemplate);

                //Add graphic to the map graphics layer.
                mapView.graphics.add(graphic);
            }
        }        
    }

    // *****************************************************
    // hide attributes update and delete part when necessary
    // *****************************************************
    function unselectFeature() {
//        attributeEditing.style.display="none";
//        updateInstructionDiv.style.display="block";

//        inputDescription.value=null;
//        inputUserInfo.value=null;
        mapView.graphics.removeAll();
    }



}) // mapView.then

////////////////////////////////////////
function getEditLayer() {
    if (myWidget!=null&&myWidget!=undefined&&myWidget.widgetName==="Manage Assets"&&editWidget.vis) {
        let editLyr=editWidget.getEditLayer();
        return editLyr;
    }
    return null;
}

function initLayer(clust_lyr, dataParam, clustToScaleParam, flyr) {

    //init the layer, more options are available and explained in the cluster layer constructor

    //set up a class breaks renderer to render different symbols based on the cluster count. Use the required clusterCount property to break on.
    var defaultSym=new SimpleMarkerSymbol({
        size: 6,
        color: new Color("#FF0000"),
        outline: null
    });

    var renderer=new ClassBreaksRenderer({
        defaultSymbol: defaultSym
    });
    renderer.field="clusterCount";

    var smSymbol=new SimpleMarkerSymbol({ size: 22, outline: new SimpleLineSymbol({ color: new Color([221, 159, 34, 0.8]) }), color: new Color([255, 204, 102, 0.8]) });
    var mdSymbol=new SimpleMarkerSymbol({ size: 24, outline: new SimpleLineSymbol({ color: new Color([82, 163, 204, 0.8]) }), color: new Color([102, 204, 255, 0.8]) });
    var lgSymbol=new SimpleMarkerSymbol({ size: 28, outline: new SimpleLineSymbol({ color: new Color([41, 163, 41, 0.8]) }), color: new Color([51, 204, 51, 0.8]) });
    var xlSymbol=new SimpleMarkerSymbol({ size: 32, outline: new SimpleLineSymbol({ color: new Color([200, 52, 59, 0.8]) }), color: new Color([250, 65, 74, 0.8]) });

    renderer.addClassBreakInfo(0, 2, smSymbol);
    renderer.addClassBreakInfo(3, 5, mdSymbol);
    renderer.addClassBreakInfo(6, 9, lgSymbol);
    renderer.addClassBreakInfo(10, Infinity, xlSymbol);

    var areaRenderer;

    //if area display mode is set. Create a renderer to display cluster areas. Use SimpleFillSymbols as the areas are polygons
    var defaultAreaSym=new SimpleFillSymbol({
        style: "solid",
        color: new Color([0, 0, 0, 0.2]),
        outline: new SimpleLineSymbol({ color: new Color([0, 0, 0, 0.3]) })
    });

    areaRenderer=new ClassBreaksRenderer({
        defaultSymbol: defaultAreaSym
    });
    areaRenderer.field="clusterCount";

    var smAreaSymbol=new SimpleFillSymbol({ color: new Color([255, 204, 102, 0.4]), outline: new SimpleLineSymbol({ color: new Color([221, 159, 34, 0.8]), style: "dash" }) });
    var mdAreaSymbol=new SimpleFillSymbol({ color: new Color([102, 204, 255, 0.4]), outline: new SimpleLineSymbol({ color: new Color([82, 163, 204, 0.8]), style: "dash" }) });
    var lgAreaSymbol=new SimpleFillSymbol({ color: new Color([51, 204, 51, 0.4]), outline: new SimpleLineSymbol({ color: new Color([41, 163, 41, 0.8]), style: "dash" }) });
    var xlAreaSymbol=new SimpleFillSymbol({ color: new Color([250, 65, 74, 0.4]), outline: new SimpleLineSymbol({ color: new Color([200, 52, 59, 0.8]), style: "dash" }) });

    areaRenderer.addClassBreakInfo(0, 2, smAreaSymbol);
    areaRenderer.addClassBreakInfo(3, 5, mdAreaSymbol);
    areaRenderer.addClassBreakInfo(6, 9, lgAreaSymbol);
    areaRenderer.addClassBreakInfo(10, Infinity, xlAreaSymbol);

    //Set up another class breaks renderer to style the flares individually
    var flareRenderer=new ClassBreaksRenderer({
        defaultSymbol: renderer.defaultSymbol
    });
    flareRenderer.field="clusterCount";

    var smFlareSymbol=new SimpleMarkerSymbol({ size: 14, color: new Color([255, 204, 102, 0.8]), outline: new SimpleLineSymbol({ color: new Color([221, 159, 34, 0.8]) }) });
    var mdFlareSymbol=new SimpleMarkerSymbol({ size: 14, color: new Color([102, 204, 255, 0.8]), outline: new SimpleLineSymbol({ color: new Color([82, 163, 204, 0.8]) }) });
    var lgFlareSymbol=new SimpleMarkerSymbol({ size: 14, color: new Color([51, 204, 51, 0.8]), outline: new SimpleLineSymbol({ color: new Color([41, 163, 41, 0.8]) }) });
    var xlFlareSymbol=new SimpleMarkerSymbol({ size: 14, color: new Color([250, 65, 74, 0.8]), outline: new SimpleLineSymbol({ color: new Color([200, 52, 59, 0.8]) }) });

    //flareRenderer.addClassBreakInfo(0, 19, smFlareSymbol);
    //flareRenderer.addClassBreakInfo(20, 150, mdFlareSymbol);
    //flareRenderer.addClassBreakInfo(151, 1000, lgFlareSymbol);
    //flareRenderer.addClassBreakInfo(1001, Infinity, xlFlareSymbol);

    flareRenderer.addClassBreakInfo(0, 2, smFlareSymbol);
    flareRenderer.addClassBreakInfo(3, 5, mdFlareSymbol);
    flareRenderer.addClassBreakInfo(6, 9, lgFlareSymbol);
    flareRenderer.addClassBreakInfo(10, Infinity, xlFlareSymbol);

    //set up a popup template
    var popupTemplate;
    if (flyr.title=== "TestWorkTicketLyr") {
        popupTemplate=new PopupTemplate({
            title: "{TEST}",
            content: [{
                type: "fields",
                fieldInfos: [
                    { fieldName: "AssetID", label: "Asset ID", visible: true },
                    { fieldName: "EmpID", label: "Employee ID", visible: true },
                    { fieldName: "EmpEmail", label: "Employee Email", visible: true }
                ]
            }]
        });
    }
    else if (flyr.title==="PW_Signs") {
        popupTemplate=new PopupTemplate({
            title: "{SIGNS}",
            content: [{
                type: "fields",
                fieldInfos: [
                    { fieldName: "FID", label: "ID", visible: true },
                    { fieldName: "CODE", label: "CODE", visible: true },
                    { fieldName: "SIZE", label: "SIZE", visible: true }
                ]
            }]
        });
    }
   

    var options={
        id: "flare-cluster-layer",
        title: "flare-cluster-layer",
        clusterToScale: clustToScaleParam,
        clusterRenderer: renderer,
        areaRenderer: areaRenderer,
        flareRenderer: flareRenderer,
        singlePopupTemplate: popupTemplate,
        spatialReference: new SpatialReference({ "wkid": 4326 }),
        subTypeFlareProperty: "name",
        singleFlareTooltipProperty: "name",
        displaySubTypeFlares: true,
        maxSingleFlareCount: maxSingleFlareCount,
        clusterRatio: 75,
        clusterAreaDisplay: areaDisplayMode,
        data: dataParam
    }

    //clust_lyr=new fcl.FlareClusterLayer(options);
    //webmap.add(clust_lyr);

    clusterLayer_Signs=new fcl.FlareClusterLayer(options);
    webmap.add(clusterLayer_Signs);

}

function clearLayer() {
    webmap.remove(clusterLayer);
    clusterLayer=null;   
    wtInfo.data=[];
}

function clearLayer_Signs() {  
    webmap.remove(clusterLayer_Signs);
    clusterLayer_Signs=null;
    signsInfo.data=[];
    signFeatures=[];    
}

//var wtQuery = new Query();
function queryWTLayerFeatures() {
    // Query Work Ticket Layer for matching records
    let wtLayer=webmap.allLayers.find(function (layer) {
        return layer.title==="TestWorkTicketLyr";
    });
    /*
    wtQuery.returnGeometry = true;
    wtQuery.outFields = [
        "*"
    ];
    wtQuery.where = "1=1";
    wtLayer.queryFeatures(wtQuery, function (featuresSet) {
        //startup = false;
        addClusters(featuresSet.features);
        addClusterLayer();
    });*/
    var area=Polygon.fromExtent(mapView.extent);

    var queryParams=wtLayer.createQuery();
    queryParams.geometry=area;
    wtLayer.queryFeatures(queryParams).then(function (results) {
        // prints the array of result graphics to the console
        //console.log(results.features);


        wtFeatures=results.features;
        if (startup) {
            startup=false;
            addClusters(wtFeatures);

            
            initLayer(clusterLayer, wtInfo.data, 500000, wtLayer);

            clusterLayer.setActiveView(mapView);
            clusterLayer.draw(mapView);
        }
    });
    wtLayer.visible=false;
}
////////////////////////////
var wtInfo={
     data: {}
};
function addClusters(resp) {


    wtInfo.data=arrayUtils.map(resp, function (p: any) {
        //var latlng = new  Point(parseFloat(p.Lon), parseFloat(p.Lat), wgs);
        //var webMercator = webMercatorUtils.geographicToWebMercator(latlng);
        var attributes={
            "WorkTicketID": p.WorkTicketID,
            "EmpID": p.EmpID,
            "EmpEmail": p.EmpEmail,
            "AssetID": p.AssetID
        };

        if (p.geometry==null) {
            return {
                "x": 0,
                "y": 0,
                "WorkTicketID": undefined,
                "EmpID": undefined,
                "EmpEmail": undefined,
                "AssetID": undefined,
                "name": undefined
            };
        }

        return {
            "x": p.geometry.longitude,
            "y": p.geometry.latitude,
            "WorkTicketID": p.attributes.WorkTicketID,
            "EmpID": p.attributes.EmpID,
            "EmpEmail": p.attributes.EmpEmail,
            "AssetID": p.attributes.AssetID,
            "name": p.attributes.AssetID+"_"+p.attributes.WorkTicketID
        };
    });
}
///////////////////////////////////////////////////////////////////////////
function querySignsLayerFeatures() {
    // don't do anything untill the PW_Signs layer gets created
    if (PW_Signs_Created==false) {
        return;
    }
    // Query Work Ticket Layer for matching records
    let signsLayer=webmap.allLayers.find(function (layer) {
        return layer.title==="PW_Signs";
    });
    /*
    wtQuery.returnGeometry = true;
    wtQuery.outFields = [
        "*"
    ];
    wtQuery.where = "1=1";
    wtLayer.queryFeatures(wtQuery, function (featuresSet) {
        //startup = false;
        addClusters(featuresSet.features);
        addClusterLayer();
    });*/
    
    var area=Polygon.fromExtent(mapView.extent);
    var queryParams=signsLayer.createQuery();   
    queryParams.geometry=area;
    signsLayer.queryFeatures(queryParams).then(function (results) {
        // prints the array of result graphics to the console
        //console.log(results.features);

        signFeatures=results.features;
        if (startup) {
            startup=false;
            addClusters_Signs(signFeatures);


            initLayer(clusterLayer_Signs, signsInfo.data, 3000, signsLayer);

            clusterLayer_Signs.setActiveView(mapView);
            clusterLayer_Signs.draw(mapView);
        }
        else {
            addClusters_Signs(signFeatures);
            clusterLayer_Signs.setData(signsInfo.data, true);
        }

        signsLayer.visible=false;
    });
}

////////////////////////////
var signsInfo={
    data: {}
};
function addClusters_Signs(resp) {


    signsInfo.data=arrayUtils.map(resp, function (p: any) {
        //var latlng = new  Point(parseFloat(p.Lon), parseFloat(p.Lat), wgs);
        //var webMercator = webMercatorUtils.geographicToWebMercator(latlng);
        var attributes={
            "FID": p.FID,
            "CODE": p.CODE,
            "FACING": p.FACING,
            "SIZE": p.SIZE
        };

        if (p.geometry==null) {
            return {
                "x": 0,
                "y": 0,
                "FID": undefined,
                "CODE": undefined,
                "FACING": undefined,
                "SIZE": undefined,
                "name": undefined
            };
        }

        return {
            "x": p.geometry.longitude,
            "y": p.geometry.latitude,
            "FID": p.attributes.FID,
            "CODE": p.attributes.CODE,
            "FACING": p.attributes.FACING,
            "SIZE": p.attributes.SIZE,
            "name": p.attributes.FID+"_"+p.attributes.CODE
        };
    });
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function addCustomWidget(widgetName) {
    if (myWidget!=null) {
        myWidget.destroy();
    }

    if (widgetName==="Manage Assets") {
        myWidget=editWidget;          
    }
    else if (widgetName==="Assets List") {
        myWidget=new AssetsList(widgetName, mapView, document.createElement("div"));
    }
    else {

        myWidget=new HelloWorld(widgetName, mapView, document.createElement("div"));        
    }
   
    mapView.ui.add(myWidget, "top-right");

    if (widgetName==="Manage Assets") {
        // can only call the addLayer function after editWidget has been added to the mapView.ui
        // as this function accesses the DOM element (select) usnig JQuery
        for (var i=0; i<editFeatureLyrs.length; ++i) {
            editWidget.addLayer(editFeatureLyrs[i]);
        }
        // after adding layers to the edit widget, empty the layers array so it does not add them agian
        editFeatureLyrs=[];

        editWidget.vis=true;
    }
    
}

let selectedElm=null;
function addElementToTopPanel(elem, widgetPnl) {    
    elem.style.width="25px";
    elem.style.height="25px";
    elem.style.paddingRight="5px";
    elem.style.paddingLeft="5px";


    elem.style.opacity=".90";
    //    .borderStyle="solid";
    //myImg.style.borderColor="gray";
    elem.onmouseover=function () {
        elem.style.opacity=".50";
    };
    elem.onmouseout=function () {
        if (selectedElm!=elem) {
            elem.style.opacity=".90";
        }
    }; 



    elem.onclick=function () {
        mapView.ui.remove("top-right");       
        addCustomWidget(this.id);
        if (selectedElm != null && selectedElm != this)
            selectedElm.style.opacity=".90";
        selectedElm=this;
              
    };

    widgetPnl.appendChild(elem);   
}


var scaleBar=new ScaleBar({
    view: mapView
});

var homeWidget=new Home({
    view: mapView
});

function createWidgetPanel() {
    var widgetPanel=document.createElement("div");
    widgetPanel.style.padding="5px";
    widgetPanel.style.borderStyle="solid";
    widgetPanel.style.borderColor="AliceBlue";
    widgetPanel.style.backgroundColor="lightblue";

    var myImg=document.createElement("img");
    myImg.src="app/basemap_icon.png";
    myImg.id="BaseMapGallery";

    var editImg=document.createElement("img");
    editImg.src="app/edit_icon.png";
    editImg.id="Manage Assets";

    var listImg=document.createElement("img");
    listImg.src="app/query_icon.png";
    listImg.id="Assets List";
    

    var lyrImg=document.createElement("img");
    lyrImg.src="app/layers_icon.png";
    lyrImg.id="LayersList";

    var searchImg=document.createElement("img");
    searchImg.src="app/search_icon.png";
    searchImg.id="Search";    
   
    //mapView.ui.remove("zoom");
    addElementToTopPanel(myImg, widgetPanel);
    addElementToTopPanel(lyrImg, widgetPanel);
    addElementToTopPanel(searchImg, widgetPanel);
    addElementToTopPanel(editImg, widgetPanel);
    addElementToTopPanel(listImg, widgetPanel);
    //widgetPanel.appendChild(lyrImg);     
   
    mapView.ui.add(widgetPanel, "top-left");
    mapView.ui.move({ component: "zoom", position: "top-left", index: 1 });
    // adds the home widget to the top left corner of the MapmapView
    mapView.ui.add({ component: homeWidget, position: "top-left", index: 2 });
}


