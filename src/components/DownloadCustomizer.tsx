import React, { useState } from 'react';
import { X, Move } from 'lucide-react';

interface DownloadCustomizerProps {
  designNumber: string;
  matchingNumber: number;
  colorChanges: Array<{ name: string; newColor: string }>;
  imageUrl: string;
  onDownload: (config: DownloadConfig) => void;
  onClose: () => void;
}

export interface DownloadConfig {
  showDesignNumber: boolean;
  showMatchingNumber: boolean;
  showColorChanges: boolean;
  position: 'top' | 'bottom';
  padding: number;
}

export const DownloadCustomizer: React.FC<DownloadCustomizerProps> = ({
  designNumber,
  matchingNumber,
  colorChanges,
  imageUrl,
  onDownload,
  onClose,
}) => {
  const [config, setConfig] = useState<DownloadConfig>({
    showDesignNumber: true,
    showMatchingNumber: true,
    showColorChanges: true,
    position: 'top',
    padding: 20,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Download Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex gap-8">
            {/* Preview */}
            <div className="flex-1 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Preview</h3>
              <div className="relative border border-gray-200 rounded-lg">
                {config.position === 'top' && config.showDesignNumber && (
                  <div className="absolute top-0 left-0 right-0 bg-white bg-opacity-90 p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      {config.showDesignNumber && <span>Design #{designNumber}</span>}
                      {config.showMatchingNumber && <span>• Match #{matchingNumber}</span>}
                    </div>
                    {config.showColorChanges && colorChanges.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {colorChanges.map((change, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span>{change.name}</span>
                            <span>→</span>
                            <span>{change.newColor}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-auto"
                />
                {config.position === 'bottom' && config.showDesignNumber && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      {config.showDesignNumber && <span>Design #{designNumber}</span>}
                      {config.showMatchingNumber && <span>• Match #{matchingNumber}</span>}
                    </div>
                    {config.showColorChanges && colorChanges.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {colorChanges.map((change, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span>{change.name}</span>
                            <span>→</span>
                            <span>{change.newColor}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="w-72">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Settings</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showDesignNumber}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        showDesignNumber: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Show Design Number</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showMatchingNumber}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        showMatchingNumber: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Show Matching Number</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showColorChanges}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        showColorChanges: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Show Color Changes</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, position: 'top' }))}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                        config.position === 'top'
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Top
                    </button>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, position: 'bottom' }))}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                        config.position === 'bottom'
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Bottom
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Padding</label>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={config.padding}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      padding: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500">{config.padding}px</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onDownload(config)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
