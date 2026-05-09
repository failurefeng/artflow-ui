import { useState, useCallback, useEffect } from 'react';
import { Download, Upload, Folder, AlertCircle, CheckCircle } from 'lucide-react';
import { getDataPath, exportData, importData, DataPathInfo } from '@/commands/ai';

export function DataManagementPanel() {
  const [dataPath, setDataPath] = useState<DataPathInfo | null>(null);
  const [exportStatus, setExportStatus] = useState<'' | 'loading' | 'success' | 'error'>('loading');
  const [importStatus, setImportStatus] = useState<'' | 'loading' | 'success' | 'error'>('loading');
  const [exportedData, setExportedData] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadDataPath = async () => {
      try {
        const path = await getDataPath();
        setDataPath(path);
      } catch (err) {
        console.error('Failed to get data path:', err);
      }
    };
    void loadDataPath();
  }, []);

  const handleExport = useCallback(async () => {
    setExportStatus('loading');
    setMessage(null);
    try {
      const data = await exportData();
      setExportedData(data);
      setExportStatus('success');
      setMessage({ type: 'success', text: '数据已导出，请复制下方 JSON 内容保存' });
    } catch (err) {
      setExportStatus('error');
      setMessage({ type: 'error', text: `导出失败: ${err}` });
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) {
      setMessage({ type: 'error', text: '请先粘贴导出的 JSON 数据' });
      return;
    }
    setImportStatus('loading');
    setMessage(null);
    try {
      await importData(importText);
      setImportStatus('success');
      setMessage({ type: 'success', text: '数据导入成功！请重启应用使更改生效' });
    } catch (err) {
      setImportStatus('error');
      setMessage({ type: 'error', text: `导入失败: ${err}` });
    }
  }, [importText]);

  const handleCopyExport = useCallback(() => {
    navigator.clipboard.writeText(exportedData);
    setMessage({ type: 'success', text: '已复制到剪贴板' });
  }, [exportedData]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Folder className="w-5 h-5 text-text-muted" />
          <h3 className="text-sm font-medium text-text-dark">数据存储位置</h3>
        </div>
        {dataPath ? (
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-start gap-2">
              <span className="text-text-muted shrink-0">目录:</span>
              <span className="text-text-dark break-all">{dataPath.app_data_dir}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-text-muted shrink-0">数据库:</span>
              <span className="text-text-dark break-all">{dataPath.db_path}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-text-muted shrink-0">API配置:</span>
              <span className="text-text-dark break-all">{dataPath.settings_path}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                dataPath.is_external
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {dataPath.is_external ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    外部存储（卸载后保留）
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    内部存储（卸载后丢失）
                  </>
                )}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">加载中...</p>
        )}
      </div>

      <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-text-muted" />
          <h3 className="text-sm font-medium text-text-dark">导出数据</h3>
        </div>
        <p className="text-xs text-text-muted mb-4">
          导出您的 API 配置和设置。导入时会合并到现有数据中。
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { void handleExport(); }}
            disabled={exportStatus === 'loading'}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {exportStatus === 'loading' ? '导出中...' : '导出数据'}
          </button>
          {exportedData && (
            <button
              onClick={() => { void handleCopyExport(); }}
              className="rounded border border-border-dark px-4 py-2 text-sm text-text-dark transition-colors hover:bg-surface-dark"
            >
              复制
            </button>
          )}
        </div>
        {exportedData && (
          <textarea
            value={exportedData}
            readOnly
            className="mt-3 w-full h-40 rounded border border-border-dark bg-surface-dark p-2 text-xs font-mono text-text-dark resize-none"
          />
        )}
      </div>

      <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-text-muted" />
          <h3 className="text-sm font-medium text-text-dark">导入数据</h3>
        </div>
        <p className="text-xs text-text-muted mb-4">
          粘贴之前导出的 JSON 数据。注意：导入会覆盖同名设置。
        </p>
        <textarea
          value={importText}
          onChange={(e) => { setImportText(e.target.value); }}
          placeholder="粘贴导出的 JSON 数据..."
          className="mb-3 w-full h-40 rounded border border-border-dark bg-surface-dark p-2 text-xs font-mono text-text-dark placeholder:text-text-muted/50 resize-none"
        />
        <button
          onClick={() => { void handleImport(); }}
          disabled={importStatus === 'loading' || !importText.trim()}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
        >
          {importStatus === 'loading' ? '导入中...' : '导入数据'}
        </button>
      </div>

      {message && (
        <div className={`rounded-lg border p-4 flex items-center gap-2 ${
          message.type === 'success'
            ? 'border-green-500/50 bg-green-500/10'
            : 'border-red-500/50 bg-red-500/10'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <h4 className="text-sm font-medium text-yellow-400 mb-2">升级前请务必备份</h4>
        <p className="text-xs text-text-muted">
          在安装新版本前，建议先导出您的数据。如果使用外部存储目录，您可以直接访问该目录备份文件。
          不同设备间迁移时，请使用导出/导入功能。
        </p>
      </div>
    </div>
  );
}
