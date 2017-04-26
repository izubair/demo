/// <amd-dependency path="esri/core/tsSupport/declareExtendsHelper" name="__extends" />
/// <amd-dependency path="esri/core/tsSupport/decorateHelper" name="__decorate" />
/// <reference path="../node_modules/@types/jquery/index.d.ts" />

import {subclass, declared, property} from "esri/core/accessorSupport/decorators";
import Widget=require("esri/widgets/Widget");
import watchUtils=require("esri/core/watchUtils");
import { renderable, jsxFactory } from "esri/widgets/support/widget";
import MapView=require("esri/views/MapView");
import Graphic=require("esri/Graphic");

const CSS={
    base: "assets-list"
};

@subclass("esri.widgets.AssetsList")
class AssetsList extends declared(Widget) {
    // widget name 
    @property()
    @renderable()
    widgetName: string="Assets List";
    

    @property()
    @renderable()
    view: MapView;   

    constructor(wName, wView, wContainer) {
        super();
        this.widgetName=wName;
        this.view=wView;
        this.container=wContainer;   
        // any construction initialization here          
    }
    /////////////////////////
    postInitialize() {

        //watchUtils.init(this, "vis", () => this._addBtnClick());        

    }

    // Public methods
    render() {       
        return (
            <div style= "padding: 5px; background-color: lightblue">
                <div id="mainDiv" style="padding: 5px; background-color: lightblue">
                    <label style="color: green; font-size: 18px">{this.widgetName}</label>
                    <img src = "app/close_icon.png" style="width:18px;height:18px;float:right;" id="Off" bind={this} onclick={this._removeWidget}> Base Maps Off </img>
                    <br/>
                </div>
                <div id="listArea" class="listArea-container">
                    <div id="searchDiv">
                        <label for="inputSearch">Filter: </label>
                        <input class="inputInfo" type="text" id="inputSearch" placeHolder="Enter filter text" onkeyup={this._searchKeyUp}/><br/>
                    </div>
                    <div id="listDiv">
                        <h3 class="list-heading">Select an asset</h3>
                        <nav class="nav-list">
                        <ul id="ulAssets" class="assetUL" style="font-size: 13px; padding-left: 1.5em;">  
                            <li> No item selected from map </li>                      
                        </ul>  
                        </nav>                  
                    </div>                
                </div>
           </div>

        );
    } // render

    // Private method   
    private _removeWidget() {
        this.view.ui.empty("top-right");
    }

    private _searchKeyUp() {
        //alert("clicked");
        myFunction();
       
    }   

    public fillList(features: any) {
        $("#ulAssets").empty();
        features.forEach(function (item, i) {
            // Do something here to each feature
            let myLI=document.createElement("li");            
            //li.value = item.attributes.ASID;
            myLI.innerHTML=item.attributes.ASID+": "+item.attributes.Name;
            $("#ulAssets").append(myLI);
            myLI.outerHTML.concat(" bind={this} ");  
            (myLI as HTMLLIElement).onclick=liClick;       
        });
              
    }
}

function liClick() {
    alert($(this)[0].innerText);
    //alert($("#ulAssets").);

    //
}

function myFunction() {
    // Declare variables
    var input, filter, ul, li, a, i;
    input=document.getElementById('inputSearch');
    filter=input.value.toUpperCase();
    ul=document.getElementById("ulAssets");
    li=ul.getElementsByTagName('li');

    // Loop through all list items, and hide those who don't match the search query
    for (i=0; i<li.length; i++) {
        a=li[i];

        //a=li[i].getElementsByTagName("a")[0];
        if (a.innerHTML.toUpperCase().indexOf(filter)>-1) {
            li[i].style.display="";
        } else {
            li[i].style.display="none";
        }
    }
}


export = AssetsList;