import React, { SVGProps, useCallback, useState } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { useRecoilValue } from 'recoil'

import type { FrameShift } from 'src/types'
import { TableRowSpacer, TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { formatRange, formatRangeMaybeEmpty } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { geneMapAtom } from 'src/state/results.state'
import { SeqMarkerFrameShiftState, seqMarkerFrameShiftStateAtom } from 'src/state/seqViewSettings.state'

const frameShiftColor = '#eb0d2a'
const frameShiftBorderColor = '#ffff00'

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  frameShift: FrameShift
  pixelsPerBase: number
}

function SequenceMarkerFrameShiftUnmemoed({ index, seqName, frameShift, pixelsPerBase, ...rest }: MissingViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const geneMap = useRecoilValue(geneMapAtom)

  const seqMarkerFrameShiftState = useRecoilValue(seqMarkerFrameShiftStateAtom)

  if (seqMarkerFrameShiftState === SeqMarkerFrameShiftState.Off) {
    return null
  }

  const { geneName, nucAbs, codon, gapsTrailing, gapsLeading } = frameShift
  const id = getSafeId('frame-shift-nuc-marker', { index, seqName, ...frameShift })

  const gene = geneMap.find((gene) => geneName === gene.geneName)
  if (!gene) {
    return null
  }

  const nucLength = nucAbs.end - nucAbs.begin
  const codonLength = codon.end - codon.begin

  let width = nucLength * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = nucAbs.begin * pixelsPerBase - halfNuc

  const codonRangeStr = formatRange(codon.begin, codon.end)
  const nucRangeStr = formatRange(nucAbs.begin, nucAbs.end)

  return (
    <g id={id}>
      <rect
        fill={frameShiftBorderColor}
        x={x - 1}
        y={1.75}
        width={width + 2}
        stroke={frameShiftBorderColor}
        strokeWidth={0.5}
        height={7}
      />
      <rect
        id={id}
        fill={frameShiftColor}
        x={x}
        y={2.5}
        width={width}
        height="5"
        {...rest}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Tooltip target={id} isOpen={showTooltip} fullWidth>
          <h5>{t('Frame shift')}</h5>

          <TableSlim borderless className="mb-1">
            <thead />
            <tbody>
              <tr>
                <td>{t('Nucleotide range')}</td>
                <td>{nucRangeStr}</td>
              </tr>

              <tr>
                <td>{t('Nucleotide length')}</td>
                <td>{nucLength}</td>
              </tr>

              <tr>
                <td>{t('Gene')}</td>
                <td>{geneName}</td>
              </tr>

              <tr>
                <td>{t('Codon range')}</td>
                <td>{codonRangeStr}</td>
              </tr>

              <tr className="pb-3">
                <td>{t('Codon length')}</td>
                <td>{codonLength}</td>
              </tr>

              <TableRowSpacer />

              <tr>
                <td>{t('Leading deleted codon range')}</td>
                <td>{formatRangeMaybeEmpty(gapsLeading.codon.begin, gapsLeading.codon.end)}</td>
              </tr>

              <tr>
                <td>{t('Trailing deleted codon range')}</td>
                <td>{formatRangeMaybeEmpty(gapsTrailing.codon.begin, gapsTrailing.codon.end)}</td>
              </tr>
            </tbody>
          </TableSlim>
        </Tooltip>
      </rect>
    </g>
  )
}

export const SequenceMarkerFrameShift = React.memo(SequenceMarkerFrameShiftUnmemoed)
