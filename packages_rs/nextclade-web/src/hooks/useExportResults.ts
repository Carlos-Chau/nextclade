/* eslint-disable no-void,unicorn/no-await-expression-member,no-loops/no-loops,sonarjs/no-duplicate-string */
import { Snapshot, useRecoilCallback } from 'recoil'

import type { AnalysisError, AnalysisOutput, ErrorsFromWeb } from 'src/types'
import type { ExportParams } from 'src/components/Results/ExportDialogButton'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { notUndefined } from 'src/helpers/notUndefined'
import { saveFile, saveZip, ZipFileDescription } from 'src/helpers/saveFile'
import { globalErrorAtom } from 'src/state/error.state'
import {
  aaMotifsDescsAtom,
  analysisResultsAtom,
  cladeNodeAttrDescsAtom,
  csvColumnConfigAtom,
  phenotypeAttrDescsAtom,
  treeAtom,
} from 'src/state/results.state'
import { ExportWorker } from 'src/workers/ExportThread'

const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? 'unknown'

export const DEFAULT_EXPORT_PARAMS: ExportParams = {
  filenameZip: 'nextclade.zip',
  filenameCsv: 'nextclade.csv',
  filenameTsv: 'nextclade.tsv',
  filenameJson: 'nextclade.json',
  filenameNdjson: 'nextclade.ndjson',
  filenameTree: 'nextclade.auspice.json',
  filenameFasta: 'nextclade.aligned.fasta',
  filenamePeptidesZip: 'nextclade.peptides.fasta.zip',
  filenameInsertionsCsv: 'nextclade.insertions.csv',
  filenameErrorsCsv: 'nextclade.errors.csv',
  filenamePeptidesTemplate: 'nextclade.peptide.{{GENE}}.fasta',
}

function useResultsExport(exportFn: (filename: string, snapshot: Snapshot, worker: ExportWorker) => Promise<void>) {
  return useRecoilCallback(
    ({ set, snapshot }) => {
      const snapshotRelease = snapshot.retain()
      return (filename: string) => {
        void ExportWorker.get()
          .then((worker) => exportFn(filename, snapshot, worker))
          .catch((error) => {
            set(globalErrorAtom, error)
          })
          .finally(() => {
            snapshotRelease()
          })
      }
    },
    [exportFn],
  )
}

async function mapGoodResults<T>(snapshot: Snapshot, mapFn: (result: AnalysisOutput) => T) {
  const results = await snapshot.getPromise(analysisResultsAtom)

  return results
    .filter((result) => notUndefined(result.result))
    .map((result) => {
      if (!result.result) {
        throw new ErrorInternal('When preparing analysis results for export: expected result to be non-nil')
      }
      return mapFn(result.result)
    })
}

async function mapErrors<T>(snapshot: Snapshot, mapFn: (result: AnalysisError) => T) {
  const results = await snapshot.getPromise(analysisResultsAtom)

  return results
    .filter((result) => notUndefined(result.error))
    .map(({ error, seqName, index }) => {
      if (!error) {
        throw new ErrorInternal('When preparing analysis errors for export: expected error to be non-nil')
      }
      return mapFn({ index, seqName, errors: [error] })
    })
}

async function prepareOutputFasta(snapshot: Snapshot) {
  let fastaStr = (
    await mapGoodResults(snapshot, (result) => `>${result.analysisResult.seqName}\n${result.query}`)
  ).join('\n')
  fastaStr += '\n'
  return fastaStr
}

export function useExportFasta() {
  return useResultsExport(async (filename, snapshot) => {
    const fastaStr = await prepareOutputFasta(snapshot)
    saveFile(fastaStr, filename, 'application/x-fasta;charset=utf-8')
  })
}

async function prepareResultsCsv(snapshot: Snapshot, worker: ExportWorker, delimiter: string) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
  const phenotypeAttrDescs = await snapshot.getPromise(phenotypeAttrDescsAtom)
  const aaMotifsDescs = await snapshot.getPromise(aaMotifsDescsAtom)
  const csvColumnConfig = await snapshot.getPromise(csvColumnConfigAtom)
  if (!csvColumnConfig) {
    throw new ErrorInternal('CSV column config is not initialized, but it should be')
  }

  return worker.serializeResultsCsv(
    results,
    errors,
    cladeNodeAttrDescs,
    phenotypeAttrDescs,
    aaMotifsDescs,
    delimiter,
    csvColumnConfig,
  )
}

export function useExportCsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsCsv(snapshot, worker, ';')
    saveFile(csvStr, filename, 'text/csv;charset=utf-8')
  })
}

export function useExportTsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const tsvStr = await prepareResultsCsv(snapshot, worker, '\t')
    saveFile(tsvStr, filename, 'text/tab-separated-values;charset=utf-8')
  })
}

async function prepareResultsJson(snapshot: Snapshot, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
  const phenotypeAttrDescs = await snapshot.getPromise(phenotypeAttrDescsAtom)
  return worker.serializeResultsJson(results, errors, cladeNodeAttrDescs, phenotypeAttrDescs, PACKAGE_VERSION)
}

export function useExportJson() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const jsonStr = await prepareResultsJson(snapshot, worker)
    saveFile(jsonStr, filename, 'application/json;charset=utf-8')
  })
}

async function prepareResultsNdjson(snapshot: Snapshot, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  return worker.serializeResultsNdjson(results, errors)
}

export function useExportNdjson() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const ndjsonStr = await prepareResultsNdjson(snapshot, worker)
    saveFile(ndjsonStr, filename, 'application/x-ndjson')
  })
}

async function prepareOutputTree(snapshot: Snapshot) {
  const tree = await snapshot.getPromise(treeAtom)
  if (!tree) {
    throw new ErrorInternal('When exporting tree: the tree data is not ready')
  }
  return JSON.stringify(tree, null, 2)
}

export function useExportTree() {
  return useResultsExport(async (filename, snapshot) => {
    const jsonStr = await prepareOutputTree(snapshot)
    saveFile(jsonStr, filename, 'application/json;charset=utf-8')
  })
}

async function prepareInsertionsCsv(snapshot: Snapshot, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  return worker.serializeInsertionsCsv(results, errors)
}

export function useExportInsertionsCsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareInsertionsCsv(snapshot, worker)
    saveFile(csvStr, filename, 'text/csv;charset=utf-8')
  })
}

async function prepareErrorsCsv(snapshot: Snapshot, worker: ExportWorker) {
  const results = await snapshot.getPromise(analysisResultsAtom)

  const errors: ErrorsFromWeb[] = results.map(({ seqName, result, error }) => {
    if (result) {
      return {
        seqName,
        errors: '',
        failedGenes: result.analysisResult.missingGenes,
        warnings: result.analysisResult.warnings,
      }
    }

    if (error) {
      return {
        seqName,
        errors: error,
        failedGenes: [],
        warnings: [],
      }
    }

    throw new ErrorInternal('When preparing errors for export: Expected either result or error to be non-nil')
  })

  return worker.serializeErrorsCsv(errors)
}

export function useExportErrorsCsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareErrorsCsv(snapshot, worker)
    saveFile(csvStr, filename, 'text/csv;charset=utf-8')
  })
}

async function preparePeptideFiles(snapshot: Snapshot) {
  const peptides = await mapGoodResults(snapshot, ({ queryPeptides, analysisResult: { seqName } }) => ({
    seqName,
    queryPeptides,
  }))

  const filesMap = new Map<string, ZipFileDescription>()

  for (const { seqName, queryPeptides } of peptides) {
    for (const { geneName, seq } of queryPeptides) {
      const file = filesMap.get(geneName)
      const fastaEntry = `>${seqName}\n${seq}\n`
      if (file) {
        file.data = `${file.data}${fastaEntry}`
      } else {
        let filename = DEFAULT_EXPORT_PARAMS.filenamePeptidesTemplate
        filename = filename.replace('{{GENE}}', geneName)
        filesMap.set(geneName, { filename, data: fastaEntry })
      }
    }
  }

  return Array.from(filesMap.values())
}

export function useExportPeptides() {
  return useResultsExport(async (filename, snapshot) => {
    const files = await preparePeptideFiles(snapshot)
    await saveZip({ files, filename })
  })
}

export function useExportZip() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsCsv(snapshot, worker, ';')
    const tsvStr = await prepareResultsCsv(snapshot, worker, '\t')
    const jsonStr = await prepareResultsJson(snapshot, worker)
    const treeJsonStr = await prepareOutputTree(snapshot)
    const fastaStr = await prepareOutputFasta(snapshot)
    const insertionsCsvStr = await prepareInsertionsCsv(snapshot, worker)
    const errorsCsvStr = await prepareErrorsCsv(snapshot, worker)
    const peptideFiles = await preparePeptideFiles(snapshot)

    const files: ZipFileDescription[] = [
      ...peptideFiles,
      { filename: DEFAULT_EXPORT_PARAMS.filenameCsv, data: csvStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameTsv, data: tsvStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameJson, data: jsonStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameTree, data: treeJsonStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameFasta, data: fastaStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameInsertionsCsv, data: insertionsCsvStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameErrorsCsv, data: errorsCsvStr },
    ]

    await saveZip({ filename, files })
  })
}
