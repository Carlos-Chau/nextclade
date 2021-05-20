import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { NucleotideSubstitution } from 'src/algorithms/types'

import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { formatMutation } from 'src/helpers/formatMutation'

import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { ListOfPcrPrimersChanged } from 'src/components/SequenceView/ListOfPcrPrimersChanged'

export interface SequenceMarkerMutationProps extends SVGProps<SVGRectElement> {
  seqName: string
  substitution: NucleotideSubstitution
  pixelsPerBase: number
}

function SequenceMarkerMutationUnmemoed({
  seqName,
  substitution,
  pixelsPerBase,
  onClick,
  ...rest
}: SequenceMarkerMutationProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { pos, queryNuc, pcrPrimersChanged } = substitution
  const id = getSafeId('mutation-marker', { seqName, ...substitution })

  const mut = formatMutation(substitution)

  const fill = getNucleotideColor(queryNuc)
  const x = pos * pixelsPerBase
  const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)

  return (
    <rect
      id={id}
      fill={fill}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        <div>{t('Nucleotide mutation: {{mutation}}', { mutation: mut })}</div>
        <ListOfPcrPrimersChanged pcrPrimersChanged={pcrPrimersChanged} />
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMutation = React.memo(SequenceMarkerMutationUnmemoed)
