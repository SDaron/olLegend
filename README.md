# Ol Legends

New control for openlayer, building legend from sources.



## Test example

```shell
git clone git@github.com:SDaron/olLegend.git
npm start
```

## Usage

```shell

import {Map, View} from 'ol';
import {Fill, Stroke, Style} from 'ol/style';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import controlLegend from './Legend.js';
import './legend.css';


const layer = new VectorLayer({
  source: new VectorSource({
  }),
});

layer.getSource().getName = function(){
  return "Hydrologie";
};
layer.getSource().getLegends = function(){
    const legends = [
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
    return legends;
};
const map = new Map({
  controls:[olLegend],
  layers: [layer],
  target: 'map'
});
```
