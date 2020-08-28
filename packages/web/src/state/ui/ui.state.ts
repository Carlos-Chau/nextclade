export enum ExportFormat {
  CSV = 'CSV',
  TSV = 'TSV',
  JSON = 'JSON',
  AuspiceJSONv2 = 'AuspiceJSONv2',
}

export interface UiState {
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  exportFormat: ExportFormat
  showInputBox: boolean
}

export const uiDefaultState: UiState = {
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  showInputBox: false,
  exportFormat: ExportFormat.CSV,
}
