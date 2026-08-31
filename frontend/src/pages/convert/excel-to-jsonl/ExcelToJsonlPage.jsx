import { useOutletContext } from 'react-router-dom'

import ConvertWorkspace from '../ConvertWorkspace.jsx'

const defaultActivePage = {
  title: 'Excel To JSONL',
  eyebrow: 'File Conversion',
}

function ExcelToJsonlPage({ activePage }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage

  return <ConvertWorkspace targetFormat="JSONL" activePage={resolvedActivePage} />
}

export default ExcelToJsonlPage
