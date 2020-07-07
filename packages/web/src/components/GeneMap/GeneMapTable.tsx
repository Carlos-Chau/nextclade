import React from 'react'

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { rgba } from 'polished'

import { Table, TableCell, TableCellName, TableCellText, TableRow } from 'src/components/Results/ResultsTable'
import { GeneMap, GENE_MAP_HEIGHT_PX } from 'src/components/GeneMap/GeneMap'
import { GeneMapAxis } from 'src/components/GeneMap/GeneMapAxis'
import { GENOME_SIZE } from 'src/components/SequenceView/SequenceView'

export const GeneMapTableContent = styled(Table)`
  overflow-y: scroll;
  box-shadow: 1px -2px 2px 2px ${rgba('#212529', 0.25)};
`

export const GeneMapTableRow = styled(TableRow)`
  height: ${GENE_MAP_HEIGHT_PX}px;
  background-color: #dadfe5;
`

export const GeneMapAxisTableRow = styled(TableRow)`
  height: 30px;
  background-color: #dadfe5;
`

export function GeneMapTable() {
  const { t } = useTranslation()

  return (
    <GeneMapTableContent>
      <GeneMapTableRow>
        <TableCellName basis="550px" shrink={0}>
          <TableCellText>{t('Genome annotation')}</TableCellText>
        </TableCellName>
        <TableCell grow={1} shrink={1} className="w-100">
          <GeneMap />
        </TableCell>
      </GeneMapTableRow>
      <GeneMapAxisTableRow>
        <TableCellName basis="550px" shrink={0} />
        <TableCell grow={1} shrink={1} className="w-100">
          <GeneMapAxis genomeSize={GENOME_SIZE} />
        </TableCell>
      </GeneMapAxisTableRow>
    </GeneMapTableContent>
  )
}
