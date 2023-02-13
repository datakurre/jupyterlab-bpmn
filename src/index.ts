import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Widget } from '@lumino/widgets';

import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import ModelingModule from 'bpmn-js/lib/features/modeling';
import TooltipsModule from 'diagram-js/lib/features/tooltips';
import RobotModule from './RobotModule';
import {
  clearSequenceFlow,
  renderActivities,
  renderSequenceFlow,
} from './utils';
//import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';

import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';

/**
 * The default mime type for the extension.
 */
const MIME_TYPE = 'application/bpmn+xml';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-bpmn';

/**
 * A widget for rendering bpmn.
 */
export class OutputWidget extends Widget implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
  }

  /**
   * Render bpmn into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    try {
      let changed = false;
      let resized = false;
      if (!this._bpmn) {
        this._bpmn = new BpmnViewer({
          additionalModules: [RobotModule, ModelingModule, TooltipsModule],
          moddleExtensions: {
            camunda: camundaModdle,
          },
        });
        changed = true;
      }
      if (
        model.data[this._mimeType] &&
        model.data[this._mimeType] !== this._xml
      ) {
        this._xml = model.data[this._mimeType] as string;
        await this._bpmn.importXML(this._xml);
        changed = true;
      }
      if (
        model.data['application/bpmn+json'] &&
        model.data['application/bpmn+json'] !== this._json
      ) {
        this._json = model.data['application/bpmn+json'] as string;
        changed = true;
      }
      if (this._bpmn) {
        this._bpmn.attachTo(this.node);
      }
      if (this._bpmn && changed) {
        const config = JSON.parse(
          (model.data['application/bpmn+json'] as string) || '{}'
        );
        if (config.style) {
          for (const name of Object.keys(config.style)) {
            this.node.style.setProperty(name, config.style[name]);
            if (name === 'height' && config.style[name] !== this._height) {
              this._height = config.style[name];
              resized = true;
            }
          }
        }
        if (this._bpmn && config.zoom) {
          if (config.zoom !== this._zoom) {
            const registry = this._bpmn.get('elementRegistry');
            let focusOnElement = false;
            try {
              focusOnElement = !!registry.get(config.zoom);
            } catch (e) {
              // pass
            }
            if (focusOnElement) {
              this._bpmn.get('canvas').zoom('1.0', registry.get(config.zoom));
            } else {
              this._bpmn.get('canvas').zoom('fit-viewport', 'auto');
              if (config.zoom !== 'fit-viewport') {
                this._bpmn.get('canvas').zoom(config.zoom, 'auto');
              }
            }
            this._zoom = config.zoom;
          }
        } else if (this._bpmn && resized) {
          this._bpmn.get('canvas').zoom('fit-viewport', 'auto');
        }
        if (config.activities && config.path !== false) {
          const flow = this._flow || [];
          this._flow = renderSequenceFlow(this._bpmn, config.activities);
          clearSequenceFlow(flow);
        }
        if (config.colors) {
          const modeling = this._bpmn.get('modeling');
          const registry = this._bpmn.get('elementRegistry');
          for (const name of Object.keys(config.colors)) {
            const colors = config.colors[name];
            const element = registry.get(name);
            if (element) {
              modeling.setColor(element, colors);
            }
          }
        }
        const svg: string = (await this._bpmn.saveSVG())['svg'];
        const viewbox: any = this._bpmn
          ? this._bpmn.get('canvas').viewbox()
          : {};
        const viewBox = new RegExp(/viewBox="(\d+) (\d+) (\d+) (\d+)"/).exec(
          svg
        );
        // Activities must be rendered last to prevent affecting fit-viewport or viewbox
        if (config.activities || config.incidents) {
          renderActivities(
            this._bpmn,
            config?.activities || [],
            config?.incidents || []
          );
        }
        model.setData({
          data: {
            ...model.data,
            'image/svg+xml': svg.replace(
              viewBox?.[0] || '',
              `viewBox="${
                viewbox.x + viewbox.outer.width / viewbox.scale / 4
              } ${viewbox.y} ${viewbox.outer.width / viewbox.scale / 2} ${
                viewbox.outer.height / viewbox.scale
              }"`
            ),
          },
          metadata: model.metadata,
        });
        if (!!config.activities) {
          setTimeout(async () => {
            const overlay =
              !!this.node && this.node.querySelector('.djs-container');
            if (!!overlay) {
              const image = (
                await htmlToImage.toPng(overlay as any, {
                  pixelRatio: 3,
                  skipFonts: true,
                  filter: (node: any) =>
                    !!node &&
                    !!node.tagName &&
                    !['svg', 'ul'].includes(node.tagName.toLowerCase()),
                })
              ).substring(22);
              model.setData({
                data: {
                  ...model.data,
                  'image/svg+xml':
                    svg
                      .substring(0, svg.length - 6)
                      .replace(
                        viewBox?.[0] || '',
                        `viewBox="${
                          viewbox.x + viewbox.outer.width / viewbox.scale / 4
                        } ${viewbox.y} ${
                          viewbox.outer.width / viewbox.scale / 2
                        } ${viewbox.outer.height / viewbox.scale}"`
                      ) +
                    `<image x="${viewbox.x}" width="200%" y="${viewbox.y}" href="data:image/png;base64,${image}" /></svg>`,
                },
                metadata: model.metadata,
              });
            }
          }, 500);
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return Promise.resolve();
  }

  private _xml: string = '';
  private _json: string = '';
  private _bpmn: any = '';
  private _flow: any = '';
  private _height: string = '';
  private _zoom: string = '';
  private _mimeType: string = '';
}

/**
 * A mime renderer factory for bpmn data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: (options) => new OutputWidget(options),
};

/**
 * Extension definition.
 */
const extension: IRenderMime.IExtension = {
  id: 'jupyterlab-bpmn:plugin',
  rendererFactory,
  rank: 70, // svg is 80, png 90
  dataType: 'string',
  fileTypes: [
    {
      name: 'bpmn',
      mimeTypes: [MIME_TYPE],
      extensions: ['.bpmn'],
    },
  ],
  documentWidgetFactoryOptions: {
    name: 'JupyterLab BPMN viewer',
    primaryFileType: 'bpmn',
    fileTypes: ['bpmn'],
    defaultFor: ['bpmn'],
  },
};

export default extension;
