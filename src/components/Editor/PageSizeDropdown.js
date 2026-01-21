import React from 'react'
import { Select, Option } from '@mui/joy'
import { FileText } from 'lucide-react'

export const PAGE_SIZES = {
  a4: {
    label: 'A4',
    width: '210mm',
    height: '297mm',
    paddingY: '25mm', // Standard A4 margins (top/bottom)
    paddingX: '20mm' // Standard A4 margins (left/right)
  },
  letter: {
    label: 'Letter',
    width: '8.5in',
    height: '11in',
    paddingY: '1in', // Standard US Letter margins
    paddingX: '1in'
  },
  legal: {
    label: 'Legal',
    width: '8.5in',
    height: '14in',
    paddingY: '1in', // Standard US Legal margins
    paddingX: '1in'
  },
  a5: {
    label: 'A5',
    width: '148mm',
    height: '210mm',
    paddingY: '15mm', // Smaller margins for A5
    paddingX: '12mm'
  }
}

export default function PageSizeDropdown({ pageSize = 'a4', setPageSize }) {
  return (
    <Select
      value={pageSize}
      onChange={(e, val) => setPageSize && setPageSize(val)}
      startDecorator={<FileText size={16} />}
      size='sm'
      variant='plain'
      component='div'
      sx={{ minWidth: 110 }}
    >
      {Object.entries(PAGE_SIZES).map(([key, size]) => (
        <Option key={key} value={key}>
          {size.label}
        </Option>
      ))}
    </Select>
  )
}
