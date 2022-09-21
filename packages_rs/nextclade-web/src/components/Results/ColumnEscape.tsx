import React, { useCallback, useMemo, useState } from 'react'
import { Col, Row } from 'reactstrap'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'

export interface ColumnEscapeProps {
  analysisResult: AnalysisResult
}

export function ColumnEscape({ analysisResult }: ColumnEscapeProps) {
  const { index, seqName, escape } = analysisResult
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const id = getSafeId('col-escape', { index, seqName })

  const escapePercentage = useMemo(() => {
    const entries = Object.entries(escape)
    if (entries.length > 0) {
      return formatEscapeValue(entries[0][1])
    }
    return undefined
  }, [escape])

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {escapePercentage}
      <Tooltip id={id} isOpen={showTooltip} target={id} wide fullWidth>
        <Row noGutters>
          <Col>
            <ListOfEscapes escapes={escape} />
          </Col>
        </Row>
      </Tooltip>
    </div>
  )
}

function formatEscapeValue(escape: number) {
  return `${escape.toFixed(4)}`
}

export interface ListOfEscapesProps {
  escapes: Record<string, number>
}

export function ListOfEscapes({ escapes }: ListOfEscapesProps) {
  const { t } = useTranslationSafe()

  const { thead, tbody } = useMemo(() => {
    const thead = (
      <tr>
        <th className="text-center">{t('Name')}</th>
        <th className="text-center">{t('Escape')}</th>
      </tr>
    )

    const tbody = Object.entries(escapes).map(([name, escape]) => (
      <tr key={name}>
        <td className="text-center">{name}</td>
        <td className="text-center">{formatEscapeValue(escape)}</td>
      </tr>
    ))

    return { thead, tbody }
  }, [escapes, t])

  if (Object.entries(escapes).length === 0) {
    return null
  }

  return (
    <TableSlimWithBorders>
      <thead>{thead}</thead>
      <tbody>{tbody}</tbody>
    </TableSlimWithBorders>
  )
}
