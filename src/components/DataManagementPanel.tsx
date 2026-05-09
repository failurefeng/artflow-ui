import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Upload, Folder, AlertCircle, CheckCircle, Star, FileText } from 'lucide-react';
import { getDataPath, exportData, importData, DataPathInfo } from '@/commands/ai';
import { Filesystem, Directory } from '@capacitor/filesystem';

const MILESTONE_INFO = {
  version: '1.2.0',
  name: '首个可用的 AI 生图版本',
  date: '2026-05-09',
  highlights: [
    'GRSAI AI 生图功能完全修复',
    '支持 nano-banana-2 和 nano-banana-pro 模型',
    'Rust 后端正确解析 SSE 流响应',
  ],
};

export function DataManagementPanel() {
  const [dataPath, setDataPath] = useState<DataPathInfo | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportedData, setExportedData] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      const parsed = JSON.parse(data);
      const projectsCountVal = parsed.projects?.length || 0;
      setProjectsCount(projectsCountVal);
      
      setMessage({ 
        type: 'success', 
        text: `已生成导出数据（包含 ${projectsCountVal} 个项目）。可点击下方按钮下载文件。` 
      });
    } catch (err) {
      setExportStatus('error');
      setMessage({ type: 'error', text: `导出失败: ${err}` });
    }
  }, []);

  const handleDownloadFile = useCallback(async () => {
    if (!exportedData) {
      setMessage({ type: 'error', text: '没有可下载的数据，请先点击"生成导出数据"' });
      return;
    }
    
    try {
      const fileName = `storyboard_backup_${new Date().toISOString().slice(0, 10)}.json`;
      
      let savedPath: string;
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: exportedData,
          directory: Directory.Documents,
        });
        savedPath = `Documents/${fileName}`;
      } catch {
        const blob = new Blob([exportedData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        savedPath = '浏览器下载';
      }
      
      setMessage({ type: 'success', text: `文件已保存到: ${savedPath}` });
    } catch (err) {
      setMessage({ type: 'error', text: `下载失败: ${err}` });
    }
  }, [exportedData]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
      setMessage({ type: 'success', text: `已读取文件: ${file.name}，点击下方"导入数据"按钮完成导入` });
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: '读取文件失败' });
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) {
      setMessage({ type: 'error', text: '请先选择文件或粘贴 JSON 数据' });
      return;
    }
    setImportStatus('loading');
    setMessage(null);
    try {
      const result = await importData(importText);
      setImportStatus('success');
      setMessage({ 
        type: 'success', 
        text: `数据导入成功！${result.projects_imported > 0 ? `导入了 ${result.projects_imported} 个项目。` : ''}请重启应用使更改生效。` 
      });
      setImportText('');
    } catch (err) {
      setImportStatus('error');
      setMessage({ type: 'error', text: `导入失败: ${err}` });
    }
  }, [importText]);

  const handleCopyExport = useCallback(() => {
    if (!exportedData) {
      setMessage({ type: 'error', text: '没有可复制的数据，请先点击"生成导出数据"' });
      return;
    }
    navigator.clipboard.writeText(exportedData).then(() => {
      setMessage({ type: 'success', text: '已复制到剪贴板' });
    }).catch(() => {
      setMessage({ type: 'error', text: '复制失败' });
    });
  }, [exportedData]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-medium text-amber-400">{MILESTONE_INFO.name}</h3>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <span>版本:</span>
            <span className="text-amber-400 font-mono">v{MILESTONE_INFO.version}</span>
            <span>•</span>
            <span>{MILESTONE_INFO.date}</span>
          </div>
          <ul className="space-y-1 text-text-muted">
            {MILESTONE_INFO.highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

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
                    内部存储（卸载后丢失，建议导出备份）
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
          导出您的 API 配置、设置和所有项目数据。安装新版本后可通过导入功能恢复。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { void handleExport(); }}
            disabled={exportStatus === 'loading'}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {exportStatus === 'loading' ? '导出中...' : '生成导出数据'}
          </button>
          {exportedData && (
            <>
              <button
                onClick={() => { void handleDownloadFile(); }}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600/80"
              >
                保存到手机
              </button>
              <button
                onClick={() => { void handleCopyExport(); }}
                className="rounded border border-border-dark px-4 py-2 text-sm text-text-dark transition-colors hover:bg-surface-dark"
              >
                复制内容
              </button>
            </>
          )}
        </div>
        {projectsCount !== null && (
          <p className="text-xs text-text-muted mt-2">
            包含 {projectsCount} 个项目{projectsCount > 0 ? '，建议下载文件保存' : ''}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border-dark bg-bg-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-text-muted" />
          <h3 className="text-sm font-medium text-text-dark">导入数据</h3>
        </div>
        <p className="text-xs text-text-muted mb-4">
          从之前导出的备份文件恢复数据。支持 .json 文件。
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { fileInputRef.current?.click(); }}
            className="rounded bg-surface-dark border border-border-dark px-4 py-2 text-sm text-text-dark transition-colors hover:bg-border-dark"
          >
            选择文件
          </button>
          <button
            onClick={() => { void handleImport(); }}
            disabled={importStatus === 'loading' || !importText.trim()}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {importStatus === 'loading' ? '导入中...' : '导入数据'}
          </button>
        </div>
        
        {importText && (
          <div className="mt-3">
            <p className="text-xs text-green-400 mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              已选择数据，点击导入按钮开始
            </p>
          </div>
        )}
      </div>

      {message && (
        <div className={`rounded-lg border p-4 flex items-start gap-3 ${
          message.type === 'success'
            ? 'border-green-500/50 bg-green-500/10'
            : 'border-red-500/50 bg-red-500/10'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <h4 className="text-sm font-medium text-blue-400 mb-2">升级指南</h4>
        <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
          <li>在旧版本中点击「保存到手机」保存备份</li>
          <li>卸载旧版本（或覆盖安装新版本）</li>
          <li>安装新版本 APK</li>
          <li>在新版本中点击「选择文件」导入备份</li>
          <li>重启应用完成恢复</li>
        </ol>
      </div>
    </div>
  );
}
