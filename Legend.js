/**
 * @module ol/control/Legend
 */
import {equals} from 'ol/array.js';
import Control from 'ol/control/Control.js';
import {CLASS_CONTROL, CLASS_UNSELECTABLE, CLASS_COLLAPSED} from 'ol/css.js';
import {removeChildren, replaceNode} from 'ol/dom.js';
import EventType from 'ol/events/EventType.js';
import {inView} from 'ol/layer/Layer.js';
import {toContext} from 'ol/render';
import {LineString, Point, Polygon} from 'ol/geom';
import {getVectorContext} from 'ol/render.js';


/**
 * @typedef {Object} Options
 * @property {string} [className='ol-legend'] CSS class name.
 * @property {HTMLElement|string} [target] Specify a target if you
 * want the control to be rendered outside of the map's
 * viewport.
 * @property {boolean} [collapsible] Specify if legends can
 * be collapsed. If not specified, sources control this behavior with their
 * `legendsCollapsible` setting.
 * @property {boolean} [collapsed=true] Specify if legends should
 * be collapsed at startup.
 * @property {string} [tipLabel='Legends'] Text label to use for the button tip.
 * @property {string} [label='i'] Text label to use for the
 * collapsed legends button.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property {string|HTMLElement} [collapseLabel='»'] Text label to use
 * for the expanded legends button.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property {function(import("../MapEvent.js").default)} [render] Function called when
 * the control should be re-rendered. This is called in a `requestAnimationFrame`
 * callback.
 */


/**
 * @classdesc
 * Control to show all the legends associated with the layer sources
 * in the map. This control is one of the default controls included in maps.
 * By default it will show in the bottom right portion of the map, but this can
 * be changed by using a css selector for `.ol-legend`.
 *
 * @api
 */
class Legend extends Control {

  /**
   * @param {Options=} opt_options Legend options.
   */
  constructor(opt_options) {

    const options = opt_options ? opt_options : {};

    super({
      element: document.createElement('div'),
      render: options.render || render,
      target: options.target
    });

    /**
     * @private
     * @type {HTMLElement}
     */
    this.divElement_ = document.createElement('div');

    /**
     * @private
     * @type {boolean}
     */
    this.collapsed_ = options.collapsed !== undefined ? options.collapsed : true;

    /**
     * @private
     * @type {boolean}
     */
    this.overrideCollapsible_ = options.collapsible !== undefined;

    /**
     * @private
     * @type {boolean}
     */
    this.collapsible_ = options.collapsible !== undefined ?
      options.collapsible : true;

    if (!this.collapsible_) {
      this.collapsed_ = false;
    }

    const className = options.className !== undefined ? options.className : 'ol-legend';

    const tipLabel = options.tipLabel !== undefined ? options.tipLabel : 'Legends';

    const collapseLabel = options.collapseLabel !== undefined ? options.collapseLabel : '\u00AB';

    if (typeof collapseLabel === 'string') {
      /**
       * @private
       * @type {HTMLElement}
       */
      this.collapseLabel_ = document.createElement('span');
      this.collapseLabel_.textContent = collapseLabel;
    } else {
      this.collapseLabel_ = collapseLabel;
    }

    const label = options.label !== undefined ? options.label : 'L';

    if (typeof label === 'string') {
      /**
       * @private
       * @type {HTMLElement}
       */
      this.label_ = document.createElement('span');
      this.label_.textContent = label;
    } else {
      this.label_ = label;
    }


    const activeLabel = (this.collapsible_ && !this.collapsed_) ?
      this.collapseLabel_ : this.label_;
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.title = tipLabel;
    button.appendChild(activeLabel);

    button.addEventListener(EventType.CLICK, this.handleClick_.bind(this), false);

    const cssClasses = className + ' ' + CLASS_UNSELECTABLE + ' ' + CLASS_CONTROL +
        (this.collapsed_ && this.collapsible_ ? ' ' + CLASS_COLLAPSED : '') +
        (this.collapsible_ ? '' : ' ol-uncollapsible');
    const element = this.element;
    element.className = cssClasses;
    element.appendChild(this.divElement_);
    element.appendChild(button);

    /**
     * A list of currently rendered resolutions.
     * @type {Array<string>}
     * @private
     */
    this.renderedLegends_ = [];

    /**
     * @private
     * @type {boolean}
     */
    this.renderedVisible_ = true;

  }

  /**
   * Collect a list of visible legends and set the collapsible state.
   * @param {import("../PluggableMap.js").FrameState} frameState Frame state.
   * @return {Array<string>} Legends.
   * @private
   */
  collectSourceLegends_(frameState) {
    /**
     * Used to determine if an legend already exists.
     * @type {!Object<string, boolean>}
     */
    const lookup = {};

    /**
     * A list of visible legends.
     * @type {Array<string>}
     */
    const visibleLegends = [];

    const layerStatesArray = frameState.layerStatesArray;
    for (let i = 0, ii = layerStatesArray.length; i < ii; ++i) {
      const layerState = layerStatesArray[i];
      if (!inView(layerState, frameState.viewState)) {
        continue;
      }

      const source = /** @type {import("../layer/Layer.js").default} */ (layerState.layer).getSource();
      if (!source) {
        continue;
      }
      
      let legends;
      
      if (typeof source.getLegends === 'function') {
        legends = source.getLegends();
      }
      if (!legends) {
        continue;
      }

      const divElement = document.createElement('div');
      const ulElement = document.createElement('ul'); 

      if (typeof source.getName === 'function') {
        const labelElement = document.createElement('div');
        labelElement.textContent = source.getName();
        labelElement.className = 'ol-legend-label';
        divElement.appendChild(labelElement);
      }      
      
      if (Array.isArray(legends)) {
        for (let j = 0, jj = legends.length; j < jj; ++j) {
          const legendItem = this.createLegendItem_(legends[j].label, legends[j].style, legends[j].geometry);
          ulElement.appendChild(legendItem);
        }
      } else if(legends){
        const legendItem = this.createLegendItem_(legends.label,legends.style,legends.geometry);
        ulElement.appendChild(legendItem);
      }
      divElement.appendChild(ulElement);
      visibleLegends.push(divElement);
    }
    return visibleLegends;
  }

  /**
   * Create a legend item.
   * @param {string} label Label of the legend.
   * @param {import("../../style/Style.js").default|Array<import("../../style/Style.js").default>} styles The style or array of styles.
   * @return {Array<string>} Legends.
   * @private
   */
  createLegendItem_(label,style,geometry) {
    const legendItem = document.createElement('li');
    const legendItemCanvas = document.createElement('canvas');
    const legendItemLabel = document.createElement('span');
    legendItemLabel.textContent = label;
    

    const vectorContext = toContext(legendItemCanvas.getContext('2d'), {size: [30, 30]});
    vectorContext.setStyle(style);
    
    if(geometry == 'Polygon'){
      vectorContext.drawGeometry(new Polygon([[[2, 6], [15, 6], [28, 2], [26, 24], [10, 20], [4, 26], [2, 2]]]));
    }else if(geometry == 'LineString'){
      vectorContext.drawGeometry((new LineString([[0, 15], [6, 10], [12, 20], [18, 18], [24,15], [30,15]])));
    }else{
      vectorContext.drawGeometry(new Point([15, 15]));
    }
    
    
    legendItem.appendChild(legendItemCanvas);
    legendItem.appendChild(legendItemLabel);
    
    return legendItem;
  }
  
  /**
   * @private
   * @param {?import("../PluggableMap.js").FrameState} frameState Frame state.
   */
  updateElement_(frameState) {
    if (!frameState) {
      if (this.renderedVisible_) {
        this.element.style.display = 'none';
        this.renderedVisible_ = false;
      }
      return;
    }

    const legends = this.collectSourceLegends_(frameState);

    const visible = legends.length > 0;
    if (this.renderedVisible_ != visible) {
      this.element.style.display = visible ? '' : 'none';
      this.renderedVisible_ = visible;
    }

    if (equals(legends, this.renderedLegends_)) {
      return;
    }

    removeChildren(this.divElement_);

    // append the legends
    for (let i = 0, ii = legends.length; i < ii; ++i) {
      const element = legends[i];
      this.divElement_.appendChild(element);
    }

    this.renderedLegends_ = legends;
  }

  /**
   * @param {MouseEvent} event The event to handle
   * @private
   */
  handleClick_(event) {
    event.preventDefault();
    this.handleToggle_();
  }

  /**
   * @private
   */
  handleToggle_() {
    this.element.classList.toggle(CLASS_COLLAPSED);
    if (this.collapsed_) {
      replaceNode(this.collapseLabel_, this.label_);
    } else {
      replaceNode(this.label_, this.collapseLabel_);
    }
    this.collapsed_ = !this.collapsed_;
  }

  /**
   * Return `true` if the legend is collapsible, `false` otherwise.
   * @return {boolean} True if the widget is collapsible.
   * @api
   */
  getCollapsible() {
    return this.collapsible_;
  }

  /**
   * Set whether the legend should be collapsible.
   * @param {boolean} collapsible True if the widget is collapsible.
   * @api
   */
  setCollapsible(collapsible) {
    if (this.collapsible_ === collapsible) {
      return;
    }
    this.collapsible_ = collapsible;
    this.element.classList.toggle('ol-uncollapsible');
    if (!collapsible && this.collapsed_) {
      this.handleToggle_();
    }
  }

  /**
   * Collapse or expand the legend according to the passed parameter. Will
   * not do anything if the legend isn't collapsible or if the current
   * collapsed state is already the one requested.
   * @param {boolean} collapsed True if the widget is collapsed.
   * @api
   */
  setCollapsed(collapsed) {
    if (!this.collapsible_ || this.collapsed_ === collapsed) {
      return;
    }
    this.handleToggle_();
  }

  /**
   * Return `true` when the legend is currently collapsed or `false`
   * otherwise.
   * @return {boolean} True if the widget is collapsed.
   * @api
   */
  getCollapsed() {
    return this.collapsed_;
  }
}


/**
 * Update the legend element.
 * @param {import("../MapEvent.js").default} mapEvent Map event.
 * @this {Legend}
 */
export function render(mapEvent) {
  this.updateElement_(mapEvent.frameState);
}


export default Legend;
