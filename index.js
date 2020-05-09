
import 'ol/ol.css';
import '@fortawesome/fontawesome-free/css/all.css'

import GeoJSON from 'ol/format/GeoJSON.js';
import {Map, View} from 'ol';
import {Icon, RegularShape, Fill, Circle, Style, Stroke, Text} from 'ol/style';
import {Raster as RasterSource, OSM, Stamen, Vector as VectorSource} from 'ol/source.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer.js';
import {fromLonLat} from 'ol/proj.js';
import {getVectorContext} from 'ol/render.js';
import {LineString, Point, Polygon} from 'ol/geom';
import {toContext} from 'ol/render';
import controlLegend from './Legend.js';
import './legend.css';
import history from './maelbeek_history.json';
import hydrology from './maelbeek_hydrology.json';


//A distinct className is required to use another canvas for the background
const background = new TileLayer({
  opacity: 0.3,
  className: 'stamen',
  source: new Stamen({
    layer: 'toner-lines',
  }),
});

const base = new TileLayer({
  opacity: 1,
  source: new Stamen({
    layer: 'toner-background',
  }),
});

const clipLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      width:3,
      color: 'red',
    }),
  }),
  source: new VectorSource({
    features: (new GeoJSON()).readFeatures(hydrology,{ featureProjection: 'EPSG:3857'}),
    format: new GeoJSON(),
  }),
});

//Giving the clipped layer an extent is necessary to avoid rendering when the feature is outside the viewport
clipLayer.getSource().on('addfeature', function () {
  base.setExtent(clipLayer.getSource().getExtent());
});

const style = new Style({
  fill: new Fill({
    color: 'black',
  }),
});
background.on('postrender', function (e) {

  const vectorContext = getVectorContext(e);
  let ctx = e.context;  
  let canvas = e.context.canvas;
  let context = canvas.getContext('2d');
  
   
  e.context.globalCompositeOperation = 'destination-out';
  clipLayer.getSource().forEachFeature(function (feature) {
    vectorContext.drawFeature(feature, style);
  });
  e.context.globalCompositeOperation = 'source-over';
  /*
  var imageData = context.getImageData(0,0,canvas.width,  canvas.height);
  var data = imageData.data;
  for (var i = 0; i < data.length; i += 4) {
    data[i + 3] = data[i];
  }
  ctx.putImageData(imageData, 0, 0); 
  */
});

base.on('postrender', function (e) {
  const vectorContext = getVectorContext(e);
  let ctx = e.context;  
  let canvas = e.context.canvas;
  
  
  e.context.globalCompositeOperation = 'destination-in';
  clipLayer.getSource().forEachFeature(function (feature) {
    vectorContext.drawFeature(feature, style);
  });
  e.context.globalCompositeOperation = 'source-over';
});




const getIcon = function(type) {
  switch (type) {
    case 'source':
      return '\u{f773}'; //https://fontawesome.com/icons/water?style=solid
      break;
    case 'moulin':
      return '\u{f085}'; //https://fontawesome.com/icons/water?style=solid
      break;
    case 'etymologie':
      return '\u{f129}'; //https://fontawesome.com/icons/water?style=solid
      break;
    case 'site remarquable':
      return '\u{f02e}'; //https://fontawesome.com/icons/bookmark?style=regular
      break;
    case 'immeuble remarquable':
      return '\u{f66f}'; //https://fontawesome.com/icons/landmark?style=solid
      break;
    case 'auberge':
      return '\u{f0fc}'; //https://fontawesome.com/icons/beer?style=solid
      break;
    case 'manufacture':
      return '\u{f275}'; //https://fontawesome.com/icons/industry?style=solid
      break;
    case 'chateau':
      return '\u{f447}'; //https://fontawesome.com/icons/chess-rook?style=solid
      break;
    case 'centre villageois':
      return '\u{f67f}'; //https://fontawesome.com/icons/fort-awesome?style=brands
      break;
    default:
      return '\u{f129}'; //https://fontawesome.com/icons/info-circle?style=solid
      break;
  }
}

const getColor = function(type) {
  switch (type) {
    case 'source':
      return 'red'; //https://fontawesome.com/icons/water?style=solid
      break;
    case 'moulin':
    case 'immeuble remarquable':
    case 'auberge':
    case 'manufacture':
    case 'centre villageois':
    case 'chateau':
      return '#13505b'; //https://fontawesome.com/icons/water?style=solid
      break;
    case 'site remarquable':
    case 'etymologie':
      return 'darkred'; //https://fontawesome.com/icons/water?style=solid
      break;
    default:
      return 'darkred'; //https://fontawesome.com/icons/info-circle?style=solid
      break;
  }
}

const createTextStyle = function(type) {
    const iconStyle = new Style({
        image: new Circle({
            fill: new Fill({color:  getColor(type)}),
            stroke: new Stroke({color: 'black', width: '2'}),
            points: 4,
            radius: 12
        }),
        text: new Text({        
            textAlign: 'center', //center, end, left, right, start
            textBaseline: 'middle',//alphabetic, bottom, hanging, ideographic, middle, top
            font: 'bold 12px / 1.6 "Font Awesome 5 Free"', //Arial, Courier New ,... //weight + ' ' + size + '/' + height + ' ' + dom.font.value
            text: getIcon(type),
            placement: 'point',
            offsetX: 0,
            offsetY: 0,
            fill: new Fill({color: 'white'}),
            stroke: new Stroke({color: 'black',width:2}),
            rotation:0,
            overflow:false,
        })
    });
    
    return iconStyle;
}



const dataLayer = new VectorLayer({
  style: function(feature){ return createTextStyle(feature.get('type')) },
  source: new VectorSource({
    features: (new GeoJSON()).readFeatures(history,{ featureProjection: 'EPSG:3857'})
  }),
});


/****/
background.getSource().getLegends = function(){};
base.getSource().getLegends = function(){};

clipLayer.getSource().getLegends = function(){
  
  return function(){
    return [
      {
        label:'bassin versant',
        geometry: 'Polygon',
        style:new Style({
          fill: new Fill({color: 'white'}),
          stroke: new Stroke({color: 'red', width: '2'}),
        })        
      },
      {
        label:'rivière',
        geometry: 'LineString',
        style:new Style({
          stroke: new Stroke({color: 'red', width: '2'}),
        })
        
      }
    ];
  };
};


dataLayer.getSource().getLegends = function(){
  return function(){  
    
    const typologie = ['source','etymologie', 'site remarquable','moulin', 'auberge','manufacture','chateau', 'centre villageois', 'immeuble remarquable']; 
    const legends = [];
    typologie.forEach(type => legends.push({label:type,style:createTextStyle(type)}));
    return legends;
  };
  
};

const olLegend = new controlLegend({collapsible:false})

const map = new Map({
  controls:[olLegend],
  //interactions:[],
  layers: [background, base, clipLayer, dataLayer],
  target: 'map1',
  view: new View({
    rotation:1.2,
    center: [0, 0],
    zoom: 0
  }),
});
var extent = clipLayer.getSource().getExtent();
map.getView().fit(extent,{padding: [1, 1, 200, 1]});



