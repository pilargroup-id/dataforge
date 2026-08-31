import { useOutletContext } from 'react-router-dom'

import ConvertWorkspace from '../ConvertWorkspace.jsx'

const defaultActivePage = {
  title: 'Excel To PDF',
  eyebrow: 'File Conversion',
}

function ExcelToPdfPage({ activePage }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage

  return <ConvertWorkspace targetFormat="PDF" activePage={resolvedActivePage} />
}

export default ExcelToPdfPage
