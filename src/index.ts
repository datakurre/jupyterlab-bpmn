import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Widget } from '@lumino/widgets';

import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import ModelingModule from 'bpmn-js/lib/features/modeling';
import TooltipsModule from 'diagram-js/lib/features/tooltips';
import RobotModule from './RobotModule';

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
      if (!this._bpmn) {
        this._bpmn = new BpmnViewer({
          additionalModules: [RobotModule, ModelingModule, TooltipsModule],
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
            if (name === 'height') {
              changed = true;
            }
          }
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
        const svg: string = await new Promise((resolve, reject) => {
          this._bpmn.saveSVG((err: any, svg: string) => {
            if (err) {
              reject(err);
            } else {
              resolve(svg);
            }
          });
        });
        model.setData({
          data: {
            ...model.data,
            'image/svg+xml': svg,
          },
          metadata: model.metadata,
        });
      }
    } catch (e) {
      console.warn(e);
    }
    return Promise.resolve();
  }

  private _xml: string;
  private _json: string;
  private _bpmn: any;
  private _mimeType: string;
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
