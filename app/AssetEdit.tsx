/// <amd-dependency path="esri/core/tsSupport/declareExtendsHelper" name="__extends" />
/// <amd-dependency path="esri/core/tsSupport/decorateHelper" name="__decorate" />
/// <reference path="../node_modules/@types/jquery/index.d.ts" />

/// <reference path="../node_modules/@types/arcgis-js-api/index.d.ts" />
/// <reference path="../node_modules/dojo-typings/index.d.ts" />

import {subclass, declared, property} from "esri/core/accessorSupport/decorators";
import Widget=require("esri/widgets/Widget");
import watchUtils=require("esri/core/watchUtils");
import { renderable, jsxFactory } from "esri/widgets/support/widget";
import MapView=require("esri/views/MapView");
import Graphic=require("esri/Graphic");
import FeatureLayer=require("esri/layers/FeatureLayer");
import webMercatorUtils=require("esri/geometry/support/webMercatorUtils");
import Polyline=require("esri/geometry/Polyline");

const CSS={
    base: "asset-edit"    
};


interface Style {
    editAttrVisible: string;
}

let featureLayer: any; //, editExpand: any;
// feature edit area domNodes
//let editArea, attributeEditing, inputDescription,
//    inputUserInfo, updateInstructionDiv;
let editFeature: Graphic=undefined;

let PRODFeatureLayers: FeatureLayer[]=[];

let EditFeatureLayers: FeatureLayer[]=[];

@subclass("esri.widgets.AssetEdit")
class AssetEdit extends declared(Widget) {
    // widget name
    @property()
    @renderable()
    widgetName: string="Unknown";
    //emphasized
    @property()
    @renderable()
    emphasized: boolean=false;

    @property()
    @renderable()
    view: MapView;

    @property()
    @renderable()
    vis: boolean;

    @property()
    @renderable()
    addFlag: boolean;

    @property()
    @renderable()
    relocateFlag: boolean;

    constructor(wName, wView, wContainer) {
        super();
        this.widgetName=wName;
        this.view=wView;
        this.container=wContainer;  

        //EditFeatureLayers=featureLyrs.slice();

        this._addBtnClick=this._addBtnClick.bind(this);
        this._relocateBtnClick=this._relocateBtnClick.bind(this);
        this.addFlag=false;
        this.relocateFlag=false;
    }


    postInitialize() {               
        //watchUtils.init(this, "vis", () => this._addBtnClick());  
               
    }


    // Public methods
    render() {
        //const greeting=this._getGreeting();
        //const classes={
        //    [CSS.emphasis]: this.emphasized
        //};
        

        //this.bgExpand_baseMap.content=this.baseMapGallery.domNode;
        const styles: Style={
            editAttrVisible: this.vis? 'style="display:none; margin-top: 0.5em;':'style="display:bold; margin-top: 0.5em;'
        };

        this.vis=true;

        return ( 
                      
            <div style= "padding: 5px; background-color: lightblue">
                <div id="mainDiv" style="padding: 5px; background-color: lightblue">
                    <label style="color: green; font-size: 18px">{this.widgetName}</label>
                    <img src = "app/close_icon.png" style="width:18px;height:18px;float:right;" id="Off" bind={this} onclick={this._removeWidget}> Base Maps Off </img>
                    <br/>
                </div>
                <div bind={this} id="editArea" class="editArea-container">
                    <div id="addFeatureDiv">
                        <select bind={this} style="height: 32px; width: 100%;" id="mapLyrsSelect" afterCreate={this._addSelectOptions}>                            
                        </select>
                        <ul style="font-size: 13px; padding-left: 1.5em;">
                            <li>Click Add asset button</li>
                            <li>Click on the map to create the asset</li>
                        </ul>
                        <input type="button" class="edit-button" value="Add asset" id="btnAddFeature" onclick={this._addBtnClick}/>
                        <ul style="font-size: 13px; padding-left: 1.5em;">
                            <li>Click Relocate asset button</li>
                            <li>Drag an asset on the map to relocate</li>
                        </ul>
                        <input type="button" class="edit-button" value="Relocate asset" id="btnRelocateFeature" onclick={this._relocateBtnClick}/>
                    </div>

                    <div id="updateInstructionDiv" style="text-align:center">
                        <p class="or-wrap"><span class="or-text">Or</span></p>
                        <p>Select an asset to edit or delete.</p>
                    </div>

                    <div id="featureUpdateDiv" style="display:none; margin-top: 0em;">
                        <h3 class="list-heading">Enter the asset information</h3>

                        <div id="attributeArea">
                            <label for="inputASID">Asset ID: </label>
                            <input class="inputInfo" type="text" id="inputASID" placeHolder="" disabled /><br/>
                            <label for="inputDescription">Description: </label>
                            <input class="inputInfo" type="text" id="inputDescription" placeHolder="Enter description"/><br/>
                            <label for="inputLat">Latitude: </label>
                            <input class="inputInfo" type="text" id="inputLat" placeHolder="" disabled /><br/>
                            <label for="inputLon">Longitude: </label>
                            <input class="inputInfo" type="text" id="inputLon" placeHolder="" disabled /><br/>                       
                            <input type="button" class="edit-button" value="Update asset info" id="btnUpdate" onclick={this._updateBtnClick}/>
                        </div>
                        <div id="deleteArea">
                            <input type="button" class="edit-button" value="Delete asset" id="btnDelete" onclick={this._deleteBtnClick}/>
                        </div>
                        <div id="prodArea">
                            <input bind={this} type="button" class="edit-button" value="Move asset to PRODUCTION" id="btnMoveToProd" onclick={this._moveToProdBtnClick}/>
                        </div>
                    </div>
                </div>
            </div>

         );
    } // render

    // Private method 

    private _addSelectOptions() {
       
    }

    private _removeWidget() {       
        this.view.ui.empty("top-right");  
        this.vis=false;      
    }

    private _addBtnClick() {
        if (this.addFlag) {
            this.addFlag=false;
            $("#btnAddFeature")[0].style.borderColor='#0079c1';
            $("#btnAddFeature")[0].blur();

            let elm=$("#featureUpdateDiv")[0];
            elm.style.display='none';

            // change the view's mouse cursor once user selects
            // a new incident type to create
            $("#viewDiv")[0].style.cursor="auto";
            $("#editArea")[0].style.cursor="auto";
        }
        else {
            this.addFlag=true; 
            $("#btnAddFeature")[0].style.borderColor='green';        
            // change the view's mouse cursor once user selects
            // a new incident type to create
            $("#viewDiv")[0].style.cursor="crosshair";
            $("#editArea")[0].style.cursor="auto";
        }      
        
    }

    private _relocateBtnClick() {
        if (this.relocateFlag) {
            this.relocateFlag=false;
            $("#btnRelocateFeature")[0].style.borderColor='#0079c1';
            // blur() to make focus go away from button so it does not look like selected
            $("#btnRelocateFeature")[0].blur();

            let elm=$("#featureUpdateDiv")[0];
            elm.style.display='none';

            // change the view's mouse cursor once user selects
            // a new incident type to create
            $("#viewDiv")[0].style.cursor="auto";
            $("#editArea")[0].style.cursor="auto";
        }
        else {
            this.relocateFlag=true;
            $("#btnRelocateFeature")[0].style.borderColor='green';
            // change the view's mouse cursor once user selects
            // a new incident type to create
            $("#viewDiv")[0].style.cursor="crosshair";
            $("#editArea")[0].style.cursor="auto";
        }

        
    }


    private _updateBtnClick() {            
        if (editFeature) {
            if (editFeature.attributes["ASID"]==undefined) {
                editFeature.attributes["AssetID"]=($("#inputASID")[0] as HTMLInputElement).value;
            }
            else {
                editFeature.attributes["ASID"]=($("#inputASID")[0] as HTMLInputElement).value;
            }
            editFeature.attributes["Name"]=($("#inputDescription")[0] as HTMLInputElement).value;
            editFeature.attributes["Latitude"]=($("#inputLat")[0] as HTMLInputElement).value;
            editFeature.attributes["Longitude"]=($("#inputLon")[0] as HTMLInputElement).value;

            var edits={
                updateFeatures: [editFeature]
            };

            applyEdits(edits);
        }     
    }

    private _deleteBtnClick() {

        if (editFeature) {
            var edits={
                deleteFeatures: [editFeature]
            };
            applyEdits(edits);
            ($("#inputASID")[0] as HTMLInputElement).value="";
            ($("#inputDescription")[0] as HTMLInputElement).value="";
            ($("#inputLat")[0] as HTMLInputElement).value="";
            ($("#inputLon")[0] as HTMLInputElement).value="";
        }
    }

    private _moveToProdBtnClick() {
        if (editFeature) {
            this.addAssetToPROD(featureLayer, editFeature);
        }
    }

    public updateAttr(selFeatureLyr: any, selFeature: any) {
        let lat=null;
        let lon=null;
        if (selFeature.geometry.type=="polygon") {
            lat=selFeature.geometry.centroid.latitude;
            lon=selFeature.geometry.centroid.longitude;
        }
        if (selFeature.geometry.type=="polyline") {
            
            let geom=webMercatorUtils.webMercatorToGeographic(selFeature.geometry);
            let myPnt=(geom as Polyline).getPoint(0, 1);            
            lat=myPnt.latitude;
            lon=myPnt.longitude;
        }
        else {
            lat=selFeature.geometry.latitude;
            lon=selFeature.geometry.longitude;
        }
        editFeature=selFeature;
        featureLayer=selFeatureLyr;
        let asid=selFeature.attributes["ASID"]; 
        if (asid==undefined)
            asid=selFeature.attributes["AssetID"]; 
        
        ($("#inputASID")[0] as HTMLInputElement).value=asid;
        ($("#inputDescription")[0] as HTMLInputElement).value=selFeature.attributes["Name"]; 
        ($("#inputLat")[0] as HTMLInputElement).value=lat.toFixed(6);
        ($("#inputLon")[0] as HTMLInputElement).value=lon.toFixed(6);
        let elm=$("#featureUpdateDiv")[0];
        elm.style.display='block';
    }

    public addAsset(featureLyr: any, pnt: any) {
        if (this.addFlag==false) {
            return;
        }
        featureLayer=featureLyr;
        let asid=Math.floor((Math.random()*100000)+1);
        let name=($("#inputDescription")[0] as HTMLInputElement).value;        

        var newAsset=new Graphic({
            geometry: pnt,
            attributes: {
                ASID: asid,
                Name: name              
            }
        });


        var edits={
            addFeatures: [newAsset]
        };

        applyEdits(edits);

        this.addFlag=false;

        $("#btnAddFeature")[0].style.borderColor='#0079c1';
        // blur() to make focus go away from button so it does not look like selected
        $("#btnAddFeature")[0].blur();
        $("#viewDiv")[0].style.cursor="auto";
        $("#editArea")[0].style.cursor="auto";

        

        // ui changes in response to creating a new feature
        // display feature update and delete portion of the edit area
        $("#featureUpdateDiv")[0].style.display="block";
        $("#updateInstructionDiv")[0].style.display="none";
    }
    ///////////////////////////////////////////
    public moveAsset(featureLyr: any, selFeature: any, pnt: any) {
        if (this.relocateFlag==false) {
            return;
        }
        featureLayer=featureLyr;
        selFeature.geometry=pnt;      

        var edits={
            updateFeatures: [selFeature]
        };

        applyEdits(edits);  

        this.relocateFlag=false;
        $("#btnRelocateFeature")[0].style.borderColor='#0079c1';
        // blur() to make focus go away from button so it does not look like selected
        $("#btnRelocateFeature")[0].blur();
        $("#viewDiv")[0].style.cursor="auto";
        $("#editArea")[0].style.cursor="auto";        
       
    }

    public addAssetToPROD(featureLyr: any, newAsset: any) {
        // First check if feature layer already created
        featureLayer=null;
        let FLTitle=featureLyr.title+"_PROD";

        for (var i=0; i<PRODFeatureLayers.length; ++i) {
            if (PRODFeatureLayers[i].title===FLTitle) {
                featureLayer=PRODFeatureLayers[i];
                break;
            }
        }      

        if (featureLayer==null) {
            // create feature layer to add asset to it
            featureLayer=new FeatureLayer({
                url: "http://services2.arcgis.com/80HBwlYoN0Ix3abu/arcgis/rest/services/"+FLTitle+"/FeatureServer"                
            });
            PRODFeatureLayers.push(featureLayer);
        }

        var edits={
            addFeatures: [newAsset]
        };

        applyEdits(edits);
    }

    public addLayer(Lyr: FeatureLayer) {              
        EditFeatureLayers.push(Lyr);
        let x: HTMLSelectElement=$("#mapLyrsSelect")[0] as HTMLSelectElement;
        var option=document.createElement("option");
        option.text=Lyr.title;      
        x.add(option);        
    }

    public getSelLayer() {
        let x: HTMLSelectElement=$("#mapLyrsSelect")[0] as HTMLSelectElement;
        let lyrTitle=(x.options[x.selectedIndex] as HTMLOptionElement).text;        
        return lyrTitle;                
    }

    public getEditLayer() {
        let x: HTMLSelectElement=$("#mapLyrsSelect")[0] as HTMLSelectElement;
        let lyrTitle=(x.options[x.selectedIndex] as HTMLOptionElement).text;
        
        for (var i=0; i<EditFeatureLayers.length; ++i) {
            if (EditFeatureLayers[i].title===lyrTitle)
                return EditFeatureLayers[i];
        }
    }       
}

function applyEdits(params: any) {
    //unselectFeature();
    var promise=featureLayer.applyEdits(params);
    editResultsHandler(promise);
}

// *****************************************************
// applyEdits promise resolved successfully
// query the newly created feature from the featurelayer
// set the editFeature object so that it can be used
// to update its features.
// *****************************************************
function editResultsHandler(promise: any) {
    promise
        .then(function (editsResult: any) {
            var extractObjectId=function (result: any) {                
                return result.objectId;
            };

            // get the objectId of the newly added feature
            if (editsResult.addFeatureResults.length>0) {
                var adds=editsResult.addFeatureResults.map(
                    extractObjectId);

                let addedFeature = editsResult.addFeatureResults[0].graphic;

                
                let newObjId=adds[0];
                var query=featureLayer.createQuery();
                query.where=featureLayer.objectIdField+" = "+newObjId;

                featureLayer.queryFeatures(query).then(function (results:any) {
                    if (results.features.length>0) {
                        let newFeature=results.features[0];
                        ($("#inputASID")[0] as HTMLInputElement).value=newFeature.attributes["ASID"];

                        let lat=newFeature.geometry.latitude;
                        let lon=newFeature.geometry.longitude;

                        ($("#inputLat")[0] as HTMLInputElement).value=lat.toFixed(6);
                        ($("#inputLon")[0] as HTMLInputElement).value=lon.toFixed(6);
                        //editFeature.symbol=selectionSymbol;
                        //this.view.graphics.add(editFeature);
                    }
                });

                //selectFeature(newIncidentId);
            }
        })
        .otherwise(function (error: any) {
            console.log("===============================================");
            console.error("[ applyEdits ] FAILURE: ", error.code, error.name,
                error.message);
            console.log("error = ", error);
        });
}

export = AssetEdit;