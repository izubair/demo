/// <amd-dependency path="esri/core/tsSupport/declareExtendsHelper" name="__extends" />
/// <amd-dependency path="esri/core/tsSupport/decorateHelper" name="__decorate" />
/// <reference path="../node_modules/@types/jquery/index.d.ts" />


import {subclass, declared, property} from "esri/core/accessorSupport/decorators";
import Widget=require("esri/widgets/Widget");
import { renderable, jsxFactory } from "esri/widgets/support/widget";

import BaseMapGallery=require("esri/widgets/BasemapGallery");
import LayerList=require("esri/widgets/LayerList");
import Search=require("esri/widgets/Search");
import MapView=require("esri/views/MapView");


const CSS={
    base: "esri-hello-world",
    emphasis: "esri-hello-world--emphasis"
};

@subclass("esri.widgets.HelloWorld")
class HelloWorld extends declared(Widget) {
    // widget name
    @property()
    @renderable()
    widgetName: string="BaseMapGallery";   
    //emphasized
    @property()
    @renderable()
    emphasized: boolean=false;

    @property()
    @renderable()
    view: MapView;

    @property()
    @renderable()
    baseMapGallery: BaseMapGallery;

    @property()
    @renderable()
    lyrList: LayerList;

    @property()
    @renderable()
    search: Search;   

    constructor(wName, wView, wContainer) {
        super();
        this.widgetName=wName;
        this.view=wView; 
        this.container=wContainer;       
    }


    postInitialize() {
       //watchUtils.init(this, "view.center, view.interacting, view.scale", () => this._onViewChange());   

        if (this.widgetName=="BaseMapGallery") {
            this.baseMapGallery=new BaseMapGallery({
                view: this.view,
                container: "baseMapDiv"
            });
        }
        else if (this.widgetName=="LayersList") {

            this.lyrList=new LayerList({
                view: this.view,
                container: "baseMapDiv"
            });
        }        
        else {
            this.search=new Search({
                view: this.view,
                container: "baseMapDiv"
            });
        }
        /*
        this.bgExpand_baseMap=new Expand({
            view: this.view,
            content: this.baseMapGallery.domNode,
            expandIconClass: "esri-icon-basemap"
        });*/
        //this.view.ui.add("mainDiv", "top-right");
        //this.view.ui.add({ component: this.bgExpand_baseMap, position: "top-right", index: 1 });
        this.view.ui.empty("top-right");
    }




   // @property()
  //  @renderable()
  //  baseMapGalley: BaseMapGallery;


    // Public methods
    render() {
        //const greeting=this._getGreeting();
        const classes={
            [CSS.emphasis]: this.emphasized
        }; 
        // This line assigns the baseMapGallery widget to the baseMapDiv
        if (this.widgetName=="BaseMapGallery") {
            this.baseMapGallery.container="baseMapDiv";
        }
        else if (this.widgetName=="LayersList") {
            this.lyrList.container="baseMapDiv";
        }              
        else {
            this.search.container="baseMapDiv";
        }
        
        //this.bgExpand_baseMap.content=this.baseMapGallery.domNode;
        return (
            <div id="mainDiv" style="padding: 5px; background-color: lightblue">  
                <label style="color: green; font-size: 18px">{this.widgetName}</label>             
                <img src = "app/close_icon.png" style="width:18px;height:18px;float:right;" id="Off" bind={this} onclick={this._collapseBaseMapGallery}> Base Maps Off </img> 
                <br/>                
                <div bind={this}
                    //  class={CSS.base}
                    //  classes={classes}
                    id="baseMapDiv">                                                                 
                </div>
            </div>
        );
    }

    // Private method  

    private _expandBaseMapGallery() {       
        
        //this.view.ui.empty("top-right");
        //this.view.ui.add({ component: this.baseMapGallery, position: "top-left", index: 1 });
        //this.bgExpand_baseMap.expand();
    }

    private _collapseBaseMapGallery() {
        //var coords={ X: 0, Y: 0 };
        //GetStatePlaneCoord(36.1590525, -115.1742310, coords);
        //alert("X: "+coords.X+" Y: "+coords.Y);
        //this.bgExpand_baseMap.toggle();

        this.view.ui.empty("top-right");

        //this.view.ui.empty("top-right");
        //this.view.ui.add({ component: this.bgExpand_baseMap, position: "top-right", index: 1 });
    }
}

function GetStatePlaneCoord(lat, lon, coords) {
    var dataStr='inSR=4326&outSR=3421&geometries='+lon+'%2C'+lat+'&transformation=&transformForward=false&f=pjson';
    $.ajax({
        type: "GET",
        // The URL for the request
        url: "http://gisgate.co.clark.nv.us/arcgis/rest/services/Utilities/Geometry/GeometryServer/project",
        async: false,
        // The data to send 
        data: dataStr,
        // The type of data we expect back
        dataType: "json",
    })
        // Code to run if the request succeeds (is done);
        // The response is passed to the function
        .done(function (json) {
            //alert( "The request is complete! x: " + json.geometries[0].x + "y: " + json.geometries[0].y);														
            coords.X=json.geometries[0].x;
            coords.Y=json.geometries[0].y;
        })
        // Code to run if the request fails; the raw request and
        // status codes are passed to the function
        .fail(function (xhr, status, errorThrown) {
            alert("Sorry, there was a problem!");
            console.log("Error: "+errorThrown);
            console.log("Status: "+status);
            console.dir(xhr);
        })
        // Code to run regardless of success or failure;
        .always(function (xhr, status) {
            //alert( "The request is complete!" );
        });
};

export = HelloWorld;
