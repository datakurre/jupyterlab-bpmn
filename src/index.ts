import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Widget } from '@lumino/widgets';

import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import tooltips from 'diagram-js/lib/features/tooltips';
import robotExtensionModule from './RobotModule';

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
    this._bpmn = new BpmnViewer({
      additionalModules: [robotExtensionModule, tooltips],
    });
    try {
      const config = JSON.parse(
        (model.data['application/bpmn+json'] as string) || '{}'
      );
      await this._bpmn.importXML(model.data[this._mimeType]);
      if (config.style) {
        for (const name of Object.keys(config.style)) {
          this.node.style.setProperty(name, config.style[name]);
        }
      }
      this._bpmn.attachTo(this.node);
      const canvas = this._bpmn.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (e) {
      this.node.textContent = `${e}`;
    }
    return Promise.resolve();
  }

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
