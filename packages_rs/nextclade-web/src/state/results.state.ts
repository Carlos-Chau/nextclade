import type { AuspiceJsonV2, CladeNodeAttrDesc } from 'auspice'
import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'

import type { Gene, NextcladeResult } from 'src/algorithms/types'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { analysisStatusGlobalAtom } from 'src/state/analysisStatusGlobal.state'

export function isDefaultValue(candidate: unknown): candidate is DefaultValue {
  return candidate instanceof DefaultValue
}

// Stores analysis result for a single sequence (defined by sequence name)
// Do not use setState on this atom directly, use `analysisResultsAtom` instead!
const analysisResultSingleAtom = atomFamily<NextcladeResult, string>({
  key: 'result',
})

// Stores sequence names as they come from fasta
// Do not use setState on this atom directly, use `analysisResultsAtom` instead!
export const seqNamesAtom = atom<string[]>({
  key: 'seqName',
  default: [],
})

// Synchronizes states of `analysisResultAtom` and `seqNamesAtom`
// Use it to set `analysisResultSingleAtom` and `seqNamesAtom`
export const analysisResultsAtom = selectorFamily<NextcladeResult, string>({
  key: 'results',

  get:
    (seqName: string) =>
    ({ get }): NextcladeResult => {
      return get(analysisResultSingleAtom(seqName))
    },

  set:
    (seqName) =>
    ({ set, reset }, result: NextcladeResult | DefaultValue) => {
      if (isDefaultValue(result)) {
        reset(analysisResultSingleAtom(seqName))
        reset(seqNamesAtom)
      } else {
        set(analysisResultSingleAtom(seqName), result)
        set(seqNamesAtom, (prev) => {
          if (result && !prev.includes(result.seqName)) {
            return [...prev, result.seqName]
          }
          return prev
        })
      }
    },
})

// Selects an array of statues of all results
export const analysisResultStatusesAtom = selector<AlgorithmSequenceStatus[]>({
  key: 'analysisResultStatuses',
  get: ({ get }) => {
    const seqNames = get(seqNamesAtom)
    return seqNames.map((seqName) => {
      const result = get(analysisResultSingleAtom(seqName))
      if (result.error) {
        return AlgorithmSequenceStatus.failed
      }
      if (result.result) {
        return AlgorithmSequenceStatus.done
      }
      return AlgorithmSequenceStatus.started
    })
  },
})

export const genomeSizeAtom = atom<number>({
  key: 'genomeSize',
})

export const geneMapAtom = atom<Gene[]>({
  key: 'geneMap',
  default: [],
})

export const geneNamesAtom = selector<string[]>({
  key: 'geneNames',
  get: ({ get }) => get(geneMapAtom).map((gene) => gene.geneName),
})

export const treeAtom = atom<AuspiceJsonV2 | undefined>({
  key: 'tree',
  default: undefined,
})

export const hasTreeAtom = selector<boolean>({
  key: 'hasTree',
  get({ get }) {
    return !isNil(get(treeAtom))
  },
})

export const cladeNodeAttrDescsAtom = atom<CladeNodeAttrDesc[]>({
  key: 'cladeNodeAttrDescs',
  default: [],
})

export const cladeNodeAttrKeysAtom = selector<string[]>({
  key: 'cladeNodeAttrKeys',
  get: ({ get }) => get(cladeNodeAttrDescsAtom).map((desc) => desc.name),
})

export const canDownloadAtom = selector<boolean>({
  key: 'canDownload',
  get({ get }) {
    const globalStatus = get(analysisStatusGlobalAtom)
    const resultStatuses = get(analysisResultStatusesAtom)
    const tree = get(treeAtom)
    return (
      globalStatus === AlgorithmGlobalStatus.done &&
      resultStatuses.includes(AlgorithmSequenceStatus.done) &&
      !isNil(tree)
    )
  },
})
