import { useOutletContext } from 'react-router-dom'

import ConvertWorkspace from '../ConvertWorkspace.jsx'

const defaultActivePage = {
  title: 'Excel To XML',
  eyebrow: 'File Conversion',
}

function ExcelToXmlPage({ activePage }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage

  return <ConvertWorkspace targetFormat="XML" activePage={resolvedActivePage} />
}

export default ExcelToXmlPage
