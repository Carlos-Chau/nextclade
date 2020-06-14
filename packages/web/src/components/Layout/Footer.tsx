import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Container, Row } from 'reactstrap'

import { PROJECT_NAME, COMPANY_NAME } from 'src/constants'
import { getCopyrightYearRange } from 'src/helpers/getCopyrightYearRange'

export default function Footer() {
  const { t } = useTranslation()
  const copyrightYearRange = getCopyrightYearRange()

  return (
    <Container fluid className="py-3">
      <Row noGutters>
        <Col xs={12} md={6} className="text-center text-md-left mb-2 mb-md-0">
          {t('{{PROJECT_NAME}} (c) {{copyrightYearRange}} {{COMPANY_NAME}}', {
            PROJECT_NAME,
            copyrightYearRange,
            COMPANY_NAME,
          })}
        </Col>
      </Row>
    </Container>
  )
}
