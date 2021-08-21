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
      if (!this._bpmn) {
        this._bpmn = new BpmnViewer({
          additionalModules: [RobotModule, ModelingModule, TooltipsModule],
        });
      }
      if (
        model.data[this._mimeType] &&
        model.data[this._mimeType] !== this._xml
      ) {
        this._xml = model.data[this._mimeType] as string;
        await this._bpmn.importXML(this._xml);
        this._bpmn.get('canvas').zoom('fit-viewport');
      }
      if (this._bpmn) {
        this._bpmn.attachTo(this.node);
        const config = JSON.parse(
          (model.data['application/bpmn+json'] as string) || '{}'
        );
        if (config.style) {
          for (const name of Object.keys(config.style)) {
            this.node.style.setProperty(name, config.style[name]);
            if (name === 'height') {
              this._bpmn.get('canvas').zoom('fit-viewport');
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
      }
    } catch (e) {
      this.node.textContent = `${e}`;
    }
    return Promise.resolve();
  }

  private _xml: string;
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
  rank: 100,
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
